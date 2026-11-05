import { INestApplication } from '@nestjs/common';
import { CATEGORIES, FACETS, NURSING, addDays, utcToZonedDate } from '@carely/shared';
import { PrismaService } from '../src/common/prisma.service';
import { syncTaxonomy } from '../src/taxonomy/sync';
import { TaxonomyService } from '../src/taxonomy/taxonomy.module';
import { agent, createApp, createUser, futureDate, login, uniq } from './helpers';

let app: INestApplication;
let prisma: PrismaService;

beforeAll(async () => {
  ({ app, prisma } = await createApp());
});
afterAll(async () => {
  await app.close();
});

const year = () => Number(utcToZonedDate(new Date()).slice(0, 4));

describe('taxonomy constants → database sync', () => {
  it('mirrors every category, service and facet, inheriting category credential requirements', async () => {
    const services = await prisma.service.findMany({ where: { active: true }, include: { category: true } });
    for (const c of CATEGORIES) {
      for (const s of c.services) {
        const row = services.find((r) => r.slug === s.slug);
        expect(row?.category.slug).toBe(c.slug);
      }
    }
    for (const s of NURSING.services) expect(services.find((r) => r.slug === s.slug)?.requiredQualification).toBe('NURSING_LICENSE');
    const facetSlugs = Object.values(FACETS).flat().map((f) => f.slug);
    expect(await prisma.careAttribute.count({ where: { slug: { in: facetSlugs }, active: true } })).toBe(facetSlugs.length);
  });

  it('is idempotent and deactivates slugs that are no longer defined (history is kept)', async () => {
    const cat = await prisma.category.findUniqueOrThrow({ where: { slug: 'childcare' } });
    const stale = await prisma.service.create({ data: { slug: uniq('stale-service'), categoryId: cat.id } });
    const before = await prisma.service.count();
    const result = await syncTaxonomy(prisma);
    expect(result.services).toBe(CATEGORIES.reduce((n, c) => n + c.services.length, 0));
    expect(await prisma.service.count()).toBe(before); // nothing created or deleted
    expect((await prisma.service.findUniqueOrThrow({ where: { id: stale.id } })).active).toBe(false);
    app.get(TaxonomyService).invalidate();
  });

  it('serves categories in code order and facets with their category restriction', async () => {
    const cats = (await agent(app).get('/api/taxonomy/categories')).body;
    expect(cats.map((c: any) => c.slug)).toEqual(CATEGORIES.map((c) => c.slug));
    const attrs = (await agent(app).get('/api/taxonomy/attributes')).body;
    expect(attrs.find((a: any) => a.slug === 'place-online').categories).toEqual(['nursing', 'patient-care', 'pet-care', 'personal-assistance']);
    expect(attrs.find((a: any) => a.slug === 'schedule-hourly').categories).toBeNull();
  });
});

describe('onboarding facets', () => {
  it('rejects category-restricted facets for other categories', async () => {
    const u = await createUser(prisma);
    const a = await login(app, u.email);
    await a.post('/api/me/professional');
    const cats = (await a.get('/api/taxonomy/categories')).body;
    const attrs = (await a.get('/api/taxonomy/attributes')).body;
    const online = attrs.find((x: any) => x.slug === 'place-online').id;
    const hourly = attrs.find((x: any) => x.slug === 'schedule-hourly').id;
    const child = cats.find((c: any) => c.slug === 'childcare');
    const pet = cats.find((c: any) => c.slug === 'pet-care');
    const bad = await a.put('/api/me/professional/services', { categoryId: child.id, serviceIds: [child.services[0].id], attributeIds: [hourly, online] });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields.attributeIds).toEqual(['invalid']);
    const ok = await a.put('/api/me/professional/services', { categoryId: pet.id, serviceIds: [pet.services[0].id], attributeIds: [hourly, online] });
    expect(ok.status).toBe(200);
    expect(ok.body.services.attributeIds.sort()).toEqual([hourly, online].sort());
  });
});

describe('search filters', () => {
  /** Profiles in a private location so results are isolated from other tests and earlier runs. */
  let loc: string;
  let a: string; // 35 y/o, bachelor, hourly + client home, fixed hourly price, free 09–12 every day, rating 3.996
  let b: string; // 65 y/o, secondary, night + hospital, negotiable daily price, starts in 30 days, rating 3.9

  async function pro(opts: { birthYear: number; education: 'SECONDARY' | 'BACHELOR'; facets: string[]; price: { kind: 'FIXED' | 'NEGOTIABLE'; amount: number | null; unit: 'HOUR' | 'DAY' }; availableFrom?: string; rating: number }) {
    const user = await createUser(prisma);
    const cat = await prisma.category.findUniqueOrThrow({ where: { slug: 'elderly-care' } });
    const svc = await prisma.service.findUniqueOrThrow({ where: { slug: 'elderly-daily-care' } });
    const facets = await prisma.careAttribute.findMany({ where: { slug: { in: opts.facets } } });
    const location = await prisma.location.findUniqueOrThrow({ where: { slug: loc } });
    const p = await prisma.professionalProfile.create({
      data: {
        userId: user.id,
        slug: uniq('filter-pro'),
        status: 'APPROVED',
        displayName: 'Filter Pro',
        categoryId: cat.id,
        homeLocationId: location.id,
        approvedAt: new Date(),
        birthYear: opts.birthYear,
        educationLevel: opts.education,
        availableFrom: opts.availableFrom ? new Date(opts.availableFrom) : null,
        ratingValue: opts.rating,
        ratingCount: 3,
        totalReviewCount: 3,
        translations: { create: [{ locale: 'hy', headline: 'Խնամակալ', bio: 'Փորձառու խնամակալ' }] },
        languages: { create: [{ code: 'hy' }] },
        offerings: { create: [{ serviceId: svc.id, priceKind: opts.price.kind, priceAmount: opts.price.amount, priceUnit: opts.price.unit }] },
        serviceAreas: { create: [{ locationId: location.id }] },
        attributes: { create: facets.map((f) => ({ attributeId: f.id })) },
        rules: { create: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMinute: 9 * 60, endMinute: 12 * 60 })) },
      },
    });
    return p.slug;
  }

  const search = async (query: string) => {
    const res = await agent(app).get(`/api/professionals?location=${loc}&pageSize=30&${query}`);
    expect(res.status).toBe(200);
    return (res.body.items as { slug: string }[]).map((i) => i.slug).sort();
  };

  beforeAll(async () => {
    // A standalone region: search matches ancestors and descendants, so a child of Yerevan would pull in other profiles.
    loc = uniq('test-region');
    await prisma.location.create({ data: { slug: loc, type: 'REGION', translations: { create: [{ locale: 'hy', name: 'Test' }] } } });
    app.get(TaxonomyService).invalidate();
    a = await pro({ birthYear: year() - 35, education: 'BACHELOR', facets: ['schedule-hourly', 'place-client-home'], price: { kind: 'FIXED', amount: 2500, unit: 'HOUR' }, rating: 3.996 });
    b = await pro({
      birthYear: year() - 65,
      education: 'SECONDARY',
      facets: ['schedule-night', 'place-hospital'],
      price: { kind: 'NEGOTIABLE', amount: null, unit: 'DAY' },
      availableFrom: futureDate(30),
      rating: 3.9,
    });
  });

  it('filters by age range and minimum education', async () => {
    expect(await search('ageMin=30&ageMax=40')).toEqual([a]);
    expect(await search('ageMin=60')).toEqual([b]);
    expect(await search('educationMin=VOCATIONAL')).toEqual([a]);
    expect(await search('educationMin=SECONDARY')).toEqual([a, b].sort());
  });

  it('combines facets with OR inside a group and AND across groups', async () => {
    expect(await search('attributes=schedule-hourly,schedule-night')).toEqual([a, b].sort());
    expect(await search('attributes=schedule-hourly,place-hospital')).toEqual([]);
    expect(await search('attributes=schedule-night,place-hospital')).toEqual([b]);
  });

  it('filters by pay type: unit or price agreed with the professional', async () => {
    expect(await search('priceKind=NEGOTIABLE')).toEqual([b]);
    expect(await search('priceUnit=HOUR')).toEqual([a]);
    expect(await search('priceUnit=HOUR&priceMax=3000')).toEqual([a]);
    expect(await search('priceUnit=WEEK')).toEqual([]);
  });

  it('filters by displayed rating and start date', async () => {
    expect(await search('ratingMin=4')).toEqual([a]); // 3.996 is shown as 4.00
    expect(await search(`startBy=${futureDate(5)}`)).toEqual([a]);
    expect(await search(`startBy=${futureDate(40)}`)).toEqual([a, b].sort());
  });

  it('filters by a free time window on a date', async () => {
    const date = addDays(utcToZonedDate(new Date()), 3);
    expect(await search(`date=${date}&timeFrom=10:00&timeTo=11:30`)).toEqual([a, b].sort());
    expect(await search(`date=${date}&timeFrom=11:00&timeTo=13:00`)).toEqual([]);
    const bad = await agent(app).get(`/api/professionals?date=${date}&timeFrom=10:00`);
    expect(bad.status).toBe(400);
  });

  it('exposes age, education and future start date on the public profile — never the birth year', async () => {
    const res = await agent(app).get(`/api/professionals/${b}`);
    expect(res.body.age).toBe(65);
    expect(res.body.educationLevel).toBe('SECONDARY');
    expect(res.body.availableFrom).toBe(futureDate(30));
    expect(res.body).not.toHaveProperty('birthYear');
    expect(res.body.attributes.map((x: any) => x.slug).sort()).toEqual(['place-hospital', 'schedule-night']);
  });
});
