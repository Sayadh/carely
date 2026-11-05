import { INestApplication } from '@nestjs/common';
import { createReviewSchema } from '@carely/shared';
import { PrismaService } from '../src/common/prisma.service';
import { RATING_WINDOW, ratingTransaction, recomputeProfessionalRating, roundRating, weightedRating } from '../src/reviews/rating';
import { ReviewsService } from '../src/reviews/reviews.module';
import { agent, createApp, createProfessional, createUser, locationId, uniq } from './helpers';

const fill = (n: number, v: number) => Array<number>(n).fill(v);
const shown = (scores: number[]) => roundRating(weightedRating(scores));

describe('weightedRating (pure)', () => {
  // Required examples; scores listed oldest → newest.
  it.each<[string, number[], number | null]>([
    ['1. no ratings', [], null],
    ['2. single 1', [1], 1],
    ['3. single 5', [5], 5],
    ['4. [5, 1]', [5, 1], 2.33],
    ['5. fifty 5s', fill(50, 5), 5],
    ['6. 49×5 then 1', [...fill(49, 5), 1], 4.89],
    ['7. 49×5 then 2', [...fill(49, 5), 2], 4.92],
    ['8. 49×5 then 3', [...fill(49, 5), 3], 4.95],
    ['9. 49×5 then 4', [...fill(49, 5), 4], 4.97],
    ['11. 46×5 then 4×4', [...fill(46, 5), ...fill(4, 4)], 4.89],
    ['12. 4×4 then 46×5', [...fill(4, 4), ...fill(46, 5)], 4.95],
  ])('%s', (_name, scores, expected) => {
    expect(shown(scores)).toBe(expected);
  });

  it('10. 4s at positions 2, 10, 25, 45 → ≈4.9254421769 unrounded, 4.93 shown', () => {
    const scores = fill(50, 5);
    for (const pos of [2, 10, 25, 45]) scores[pos - 1] = 4;
    expect(weightedRating(scores)).toBeCloseTo(4.9254421769, 9);
    expect(roundRating(weightedRating(scores))).toBe(4.93);
  });

  it('uses the real n below 50 (weights 1 → 2 across the actual count)', () => {
    // n = 3: weights 1, 1.5, 2 → (1·1 + 3·1.5 + 5·2) / 4.5
    expect(weightedRating([1, 3, 5])).toBeCloseTo(15.5 / 4.5, 12);
  });

  it('rejects scores that are not whole numbers 1–5', () => {
    for (const bad of [0, 6, 4.5, -1, NaN, '5' as unknown as number]) expect(() => weightedRating([5, bad])).toThrow(RangeError);
  });
});

describe('rating input validation', () => {
  it('accepts only integer ratings 1–5', () => {
    const base = { requestId: 'x', body: 'A reason that is long enough', contactPhone: '+37491234567', locale: 'hy' };
    for (const rating of [1, 2, 3, 4, 5]) expect(createReviewSchema.safeParse({ ...base, rating }).success).toBe(true);
    for (const rating of [0, 6, 4.5, -3, '5', null]) expect(createReviewSchema.safeParse({ ...base, rating }).success).toBe(false);
  });
});

describe('stored rating (last 50, weighted)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let reviews: ReviewsService;

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    reviews = app.get(ReviewsService);
  });
  afterAll(async () => {
    await app.close();
  });

  const BASE = Date.UTC(2026, 0, 1);

  /** Inserts reviews oldest → newest with explicit createdAt (one minute apart unless `at` is given). */
  async function addReviews(profileId: string, scores: number[], opts: { status?: 'PUBLISHED' | 'PENDING'; at?: (i: number) => Date; ids?: string[] } = {}) {
    const customer = await createUser(prisma);
    const [svc, loc] = await Promise.all([prisma.service.findUniqueOrThrow({ where: { slug: 'child-toddler-care' } }), locationId(prisma)]);
    const out: string[] = [];
    for (let i = 0; i < scores.length; i++) {
      const createdAt = opts.at ? opts.at(i) : new Date(BASE + i * 60_000);
      const req = await prisma.careRequest.create({
        data: {
          customerId: customer.id,
          professionalId: profileId,
          serviceId: svc.id,
          locationId: loc,
          scheduleType: 'ONE_TIME',
          startAt: new Date(BASE - 86400_000),
          endAt: new Date(BASE - 86400_000 + 3600_000),
          startMinute: 600,
          endMinute: 660,
          status: 'COMPLETED',
        },
      });
      const r = await prisma.review.create({
        data: {
          ...(opts.ids ? { id: opts.ids[i] } : {}),
          requestId: req.id,
          customerId: customer.id,
          profileId,
          rating: scores[i]!,
          body: '',
          locale: 'hy',
          status: opts.status ?? 'PUBLISHED',
          createdAt,
        },
      });
      out.push(r.id);
    }
    return out;
  }
  const recompute = (profileId: string) => ratingTransaction(prisma, (tx) => recomputeProfessionalRating(tx, profileId));
  const stored = (id: string) => prisma.professionalProfile.findUniqueOrThrow({ where: { id }, select: { ratingValue: true, ratingCount: true, totalReviewCount: true } });

  it('no published reviews → rating null, ratingCount 0', async () => {
    const { profile } = await createProfessional(prisma);
    await addReviews(profile.id, [1, 2], { status: 'PENDING' });
    expect(await recompute(profile.id)).toEqual({ rating: null, ratingCount: 0, totalReviewCount: 0 });
    const pub = (await agent(app).get(`/api/professionals/${profile.slug}`)).body;
    expect([pub.rating, pub.ratingCount, pub.totalReviewCount]).toEqual([null, 0, 0]);
  });

  it('uses only the 50 most recent; older ones stay in the database; same value on list and profile', async () => {
    const { profile } = await createProfessional(prisma);
    // 5 oldest are 1s and must drop out of the window; the newest 50 are 49×5 then a final 1.
    await addReviews(profile.id, [...fill(5, 1), ...fill(49, 5), 1]);
    const snap = await recompute(profile.id);
    expect(snap.ratingCount).toBe(RATING_WINDOW);
    expect(snap.totalReviewCount).toBe(55);
    expect(roundRating(snap.rating)).toBe(4.89);
    expect(await prisma.review.count({ where: { profileId: profile.id } })).toBe(55);

    const pub = (await agent(app).get(`/api/professionals/${profile.slug}`)).body;
    expect([pub.rating, pub.ratingCount, pub.totalReviewCount]).toEqual([4.89, 50, 55]);
    const list = (await agent(app).get('/api/professionals?category=childcare')).body;
    const card = list.items.find((x: any) => x.slug === profile.slug);
    expect(card && [card.rating, card.ratingCount, card.totalReviewCount]).toEqual([4.89, 50, 55]);
  });

  it('orders by createdAt, then id for equal timestamps', async () => {
    const { profile } = await createProfessional(prisma);
    const same = new Date(BASE);
    const p = uniq('tie').replace(/-/g, '');
    // Inserted as 5 (id "…b") then 1 (id "…a") with the same createdAt. The id tiebreak puts "…a" first:
    // oldest → newest [1, 5] → 3.67 (insertion order [5, 1] would give 2.33).
    await addReviews(profile.id, [5, 1], { at: () => same, ids: [`${p}b`, `${p}a`] });
    expect(roundRating((await recompute(profile.id)).rating)).toBe(3.67);
  });

  it('editing a review keeps its original position (updatedAt is ignored)', async () => {
    const { profile } = await createProfessional(prisma);
    const [older] = await addReviews(profile.id, [5, 1]);
    expect(roundRating((await recompute(profile.id)).rating)).toBe(2.33);
    // Edit the older review later in time: still weighted as the oldest → [4, 1] → 2.00 (by updatedAt it would be 3.00).
    await prisma.review.update({ where: { id: older! }, data: { rating: 4, updatedAt: new Date(Date.now() + 86400_000) } });
    expect(roundRating((await recompute(profile.id)).rating)).toBe(2);
  });

  it('unpublishing a review lets the next most recent one back into the window', async () => {
    const { profile } = await createProfessional(prisma);
    const admin = await createUser(prisma, { isAdmin: true });
    // Oldest is a 1 (outside the window at first), then 50×5.
    const ids = await addReviews(profile.id, [1, ...fill(50, 5)]);
    await recompute(profile.id);
    expect(await stored(profile.id)).toEqual({ ratingValue: 5, ratingCount: 50, totalReviewCount: 51 });

    await ratingTransaction(prisma, (tx) => reviews.moderate(ids[50]!, 'REJECTED', admin.id, '', tx));
    const after = await stored(profile.id);
    expect([after.ratingCount, after.totalReviewCount]).toEqual([50, 50]);
    expect(roundRating(after.ratingValue)).toBe(roundRating(weightedRating([1, ...fill(49, 5)])));
    expect(roundRating(after.ratingValue)).toBe(4.95);
  });

  it('concurrent publications never leave a stale stored rating', async () => {
    const { profile } = await createProfessional(prisma);
    const admin = await createUser(prisma, { isAdmin: true });
    const scores = [5, 4, 3, 5, 2, 5, 4, 1];
    const ids = await addReviews(profile.id, scores, { status: 'PENDING' });
    await Promise.all(ids.map((id) => ratingTransaction(prisma, (tx) => reviews.moderate(id, 'PUBLISHED', admin.id, '', tx))));
    const s = await stored(profile.id);
    expect([s.ratingCount, s.totalReviewCount]).toEqual([8, 8]);
    expect(s.ratingValue).toBeCloseTo(weightedRating(scores)!, 12);
  });

  it('database rejects ratings outside 1–5', async () => {
    const { profile } = await createProfessional(prisma);
    await expect(addReviews(profile.id, [6])).rejects.toThrow();
  });
});
