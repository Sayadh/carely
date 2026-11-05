import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma.service';
import { agent, createApp, createProfessional, createUser, futureDate, locationId, login, PASSWORD } from './helpers';
import { RequestsService } from '../src/requests/requests.module';
import { createReviewSchema } from '@carely/shared';

let app: INestApplication;
let prisma: PrismaService;

beforeAll(async () => {
  ({ app, prisma } = await createApp());
});
afterAll(async () => {
  await app.close();
});

async function submitRequest(customer: ReturnType<typeof agent>, slug: string, serviceId: string, date: string, start = '10:00', end = '12:00') {
  const res = await customer.post('/api/requests', {
    professionalSlug: slug,
    serviceId,
    scheduleType: 'ONE_TIME',
    date,
    startTime: start,
    endTime: end,
    locationId: await locationId(prisma),
    requirements: 'Two children',
  });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe('permissions and CSRF', () => {
  it('rejects cookie mutations without the CSRF header', async () => {
    const u = await createUser(prisma);
    const res = await agent(app).raw.post('/api/auth/login').send({ email: u.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_FAILED');
  });

  it('rejects foreign origins', async () => {
    const res = await agent(app).raw.post('/api/auth/logout').set('x-carely-csrf', '1').set('Origin', 'https://evil.example');
    expect(res.body.error.code).toBe('CSRF_FAILED');
  });

  it('protects admin endpoints', async () => {
    expect((await agent(app).get('/api/admin/stats')).status).toBe(401);
    const u = await createUser(prisma);
    const a = await login(app, u.email);
    expect((await a.get('/api/admin/stats')).status).toBe(403);
    const admin = await createUser(prisma, { isAdmin: true });
    const b = await login(app, admin.email);
    expect((await b.get('/api/admin/stats')).status).toBe(200);
  });

  it('ignores mass-assigned privileged fields on registration', async () => {
    const a = agent(app);
    const res = await a.post('/api/auth/register', { name: 'Mass Assign', email: `mass-${Date.now()}@test.local`, password: 'LongPassword1!', acceptTerms: true, isAdmin: true, status: 'ACTIVE' });
    expect(res.status).toBe(201);
    expect(res.body.isAdmin).toBe(false);
  });

  it('hides other users\' requests and blocks role-inappropriate transitions', async () => {
    const { profile, serviceId, user: proUser } = await createProfessional(prisma);
    const c = await createUser(prisma);
    const customer = await login(app, c.email);
    const id = await submitRequest(customer, profile.slug, serviceId, futureDate(3));

    const stranger = await login(app, (await createUser(prisma)).email);
    expect((await stranger.get(`/api/requests/${id}`)).status).toBe(404);
    expect((await stranger.post(`/api/requests/${id}/accept`)).status).toBe(404);

    // Customer cannot accept their own request; professional cannot confirm.
    expect((await customer.post(`/api/requests/${id}/accept`)).body.error.code).toBe('INVALID_TRANSITION');
    const pro = await login(app, proUser.email);
    expect((await pro.post(`/api/requests/${id}/accept`)).status).toBe(200);
    expect((await pro.post(`/api/requests/${id}/confirm`)).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('suspended professionals disappear from search and cannot accept', async () => {
    const { profile, serviceId, user: proUser } = await createProfessional(prisma);
    const customer = await login(app, (await createUser(prisma)).email);
    const id = await submitRequest(customer, profile.slug, serviceId, futureDate(4));
    await prisma.professionalProfile.update({ where: { id: profile.id }, data: { status: 'SUSPENDED' } });
    const search = await agent(app).get('/api/professionals?category=childcare&pageSize=30');
    expect(search.body.items.find((p: any) => p.id === profile.id)).toBeUndefined();
    expect((await agent(app).get(`/api/professionals/${profile.slug}`)).status).toBe(404);
    const pro = await login(app, proUser.email);
    expect((await pro.post(`/api/requests/${id}/accept`)).status).toBe(403);
    // History preserved
    expect((await customer.get(`/api/requests/${id}`)).status).toBe(200);
  });
});

describe('public / private field separation', () => {
  it('never exposes contact details, documents or addresses publicly', async () => {
    const { profile, serviceId } = await createProfessional(prisma);
    await prisma.qualification.create({ data: { profileId: profile.id, kind: 'IDENTITY', title: 'ID', status: 'VERIFIED', verifiedAt: new Date(), internalNote: 'SECRET-NOTE' } });
    await prisma.qualification.create({ data: { profileId: profile.id, kind: 'FIRST_AID', title: 'Pending cert', status: 'PENDING' } });
    const res = await agent(app).get(`/api/professionals/${profile.slug}`);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/@test\.local/);
    expect(body).not.toMatch(/\+374/);
    expect(body).not.toMatch(/SECRET-NOTE|passwordHash|storageKey|userId/);
    expect(res.body.verifications.map((v: any) => v.kind)).toEqual(['IDENTITY']); // pending credential not shown
    expect(res.body.rating).toBeNull();

    // Contacts appear only after confirmation, and only to participants.
    const c = await createUser(prisma);
    const customer = await login(app, c.email);
    const id = await submitRequest(customer, profile.slug, serviceId, futureDate(6));
    const before = await customer.get(`/api/requests/${id}`);
    expect(before.body.contacts).toBeNull();
  });

  it('does not list pending profiles', async () => {
    const { profile } = await createProfessional(prisma, { status: 'PENDING' });
    expect((await agent(app).get(`/api/professionals/${profile.slug}`)).status).toBe(404);
  });
});

describe('request lifecycle', () => {
  it('rejects invalid transitions and early completion', async () => {
    const { profile, serviceId, user: proUser } = await createProfessional(prisma);
    const customer = await login(app, (await createUser(prisma)).email);
    const pro = await login(app, proUser.email);
    const id = await submitRequest(customer, profile.slug, serviceId, futureDate(2));

    expect((await customer.post(`/api/requests/${id}/confirm`)).body.error.code).toBe('INVALID_TRANSITION'); // not accepted yet
    expect((await pro.post(`/api/requests/${id}/accept`)).status).toBe(200);
    expect((await pro.post(`/api/requests/${id}/decline`, {})).body.error.code).toBe('INVALID_TRANSITION'); // already accepted
    expect((await customer.post(`/api/requests/${id}/confirm`)).status).toBe(200);
    expect((await pro.post(`/api/requests/${id}/complete`)).body.error.code).toBe('TOO_EARLY_TO_COMPLETE');

    const detail = await customer.get(`/api/requests/${id}`);
    expect(detail.body.status).toBe('CONFIRMED');
    expect(detail.body.contacts.professional.phone).toBe('+37499111222');
    expect(detail.body.events.map((e: any) => e.type)).toEqual(['CREATED', 'ACCEPTED', 'CONFIRMED']);

    expect((await customer.post(`/api/requests/${id}/cancel`, { reason: 'Plans changed' })).status).toBe(200);
    expect((await pro.post(`/api/requests/${id}/complete`)).body.error.code).toBe('INVALID_TRANSITION'); // cancelled is terminal
    const occ = await prisma.bookingOccurrence.findMany({ where: { requestId: id } });
    expect(occ.every((o) => o.status === 'CANCELLED')).toBe(true);
  });

  it('rejects retrospective bookings and end-before-start', async () => {
    const { profile, serviceId } = await createProfessional(prisma);
    const customer = await login(app, (await createUser(prisma)).email);
    const base = { professionalSlug: profile.slug, serviceId, scheduleType: 'ONE_TIME', startTime: '10:00', endTime: '12:00', locationId: await locationId(prisma) };
    expect((await customer.post('/api/requests', { ...base, date: futureDate(-2) })).body.error.code).toBe('START_IN_PAST');
    expect((await customer.post('/api/requests', { ...base, date: futureDate(2), endTime: '10:00' })).body.error.code).toBe('VALIDATION_FAILED');
    const tooLong = await customer.post('/api/requests', { ...base, scheduleType: 'RECURRING', startDate: futureDate(1), endDate: futureDate(80), weekdays: [1] });
    expect(tooLong.body.error.code).toBe('RECURRENCE_TOO_LONG');
  });

  it('expires accepted requests that are not confirmed in time', async () => {
    const { profile, serviceId, user: proUser } = await createProfessional(prisma);
    const customer = await login(app, (await createUser(prisma)).email);
    const pro = await login(app, proUser.email);
    const id = await submitRequest(customer, profile.slug, serviceId, futureDate(5));
    await pro.post(`/api/requests/${id}/accept`);
    await prisma.careRequest.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const jobs = await agent(app).raw.post('/api/internal/jobs/run').set('x-jobs-token', process.env.JOBS_TOKEN!);
    expect(jobs.status).toBe(200);
    const r = await customer.get(`/api/requests/${id}`);
    expect(r.body.status).toBe('EXPIRED');
    expect(r.body.events.at(-1).type).toBe('EXPIRED');
    expect((await customer.post(`/api/requests/${id}/confirm`)).body.error.code).toBe('INVALID_TRANSITION');
    expect((await agent(app).raw.post('/api/internal/jobs/run').set('x-jobs-token', 'wrong')).status).toBe(403);
  });
});

describe('concurrent confirmation', () => {
  it('allows exactly one of two overlapping confirmations for the same professional', async () => {
    const { profile, serviceId, user: proUser } = await createProfessional(prisma);
    const pro = await login(app, proUser.email);
    const c1 = await login(app, (await createUser(prisma)).email);
    const c2 = await login(app, (await createUser(prisma)).email);
    const date = futureDate(7);
    const r1 = await submitRequest(c1, profile.slug, serviceId, date, '10:00', '13:00');
    const r2 = await submitRequest(c2, profile.slug, serviceId, date, '12:00', '15:00'); // overlaps 12:00–13:00
    // Acceptance alone does not reserve time: both may be accepted.
    expect((await pro.post(`/api/requests/${r1}/accept`)).status).toBe(200);
    expect((await pro.post(`/api/requests/${r2}/accept`)).status).toBe(200);

    const [a, b] = await Promise.all([c1.post(`/api/requests/${r1}/confirm`), c2.post(`/api/requests/${r2}/confirm`)]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.error.code).toBe('SCHEDULE_CONFLICT');
    const active = await prisma.bookingOccurrence.count({ where: { professionalId: profile.id, status: 'ACTIVE' } });
    expect(active).toBe(1);
  });

  it('stays consistent under many parallel confirmations (service level)', async () => {
    const { profile, serviceId, user: proUser } = await createProfessional(prisma);
    const service = app.get(RequestsService);
    const date = futureDate(9);
    const customers = await Promise.all(Array.from({ length: 6 }, () => createUser(prisma)));
    const ids: string[] = [];
    for (const c of customers) {
      const a = await login(app, c.email);
      ids.push(await submitRequest(a, profile.slug, serviceId, date, '09:00', '11:00'));
    }
    const proAuth = { id: proUser.id, email: proUser.email, name: proUser.name, isAdmin: false, locale: 'hy' as const, sessionId: 'x' };
    for (const id of ids) await service.accept(proAuth, id);
    const results = await Promise.allSettled(
      ids.map((id, i) => service.confirm({ id: customers[i].id, email: customers[i].email, name: 'c', isAdmin: false, locale: 'hy', sessionId: 'x' }, id)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    for (const r of results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]) expect(r.reason.code).toBe('SCHEDULE_CONFLICT');
    expect(await prisma.bookingOccurrence.count({ where: { professionalId: profile.id, status: 'ACTIVE' } })).toBe(1);
  });

  it('a double-submitted confirmation of the same request succeeds once', async () => {
    const { profile, serviceId, user: proUser } = await createProfessional(prisma);
    const pro = await login(app, proUser.email);
    const c = await login(app, (await createUser(prisma)).email);
    const id = await submitRequest(c, profile.slug, serviceId, futureDate(10));
    await pro.post(`/api/requests/${id}/accept`);
    const [a, b] = await Promise.all([c.post(`/api/requests/${id}/confirm`), c.post(`/api/requests/${id}/confirm`)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await prisma.bookingOccurrence.count({ where: { requestId: id } })).toBe(1);
  });
});

describe('password reset tokens', () => {
  it('are single-use and expire', async () => {
    const u = await createUser(prisma);
    const a = agent(app);
    expect((await a.post('/api/auth/forgot-password', { email: u.email })).status).toBe(202);
    // Unknown emails get the same response.
    expect((await a.post('/api/auth/forgot-password', { email: 'nobody@test.local' })).status).toBe(202);
    const mail = await prisma.devMail.findFirstOrThrow({ where: { to: u.email }, orderBy: { createdAt: 'desc' } });
    const token = decodeURIComponent(/token=([^\s]+)/.exec(mail.text)![1]);
    const stored = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: u.id } });
    expect(stored.tokenHash).not.toBe(token); // stored hashed

    expect((await a.post('/api/auth/reset-password', { token, password: 'BrandNewPass123' })).status).toBe(200);
    const reuse = await a.post('/api/auth/reset-password', { token, password: 'AnotherPass1234' });
    expect(reuse.body.error.code).toBe('RESET_TOKEN_INVALID');
    expect((await a.post('/api/auth/login', { email: u.email, password: 'BrandNewPass123' })).status).toBe(200);

    await a.post('/api/auth/forgot-password', { email: u.email });
    const mail2 = await prisma.devMail.findFirstOrThrow({ where: { to: u.email }, orderBy: { createdAt: 'desc' } });
    const token2 = decodeURIComponent(/token=([^\s]+)/.exec(mail2.text)![1]);
    await prisma.passwordResetToken.updateMany({ where: { userId: u.id, usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await a.post('/api/auth/reset-password', { token: token2, password: 'ExpiredPass1234' })).body.error.code).toBe('RESET_TOKEN_INVALID');
  });
});

describe('review eligibility and moderation', () => {
  it('allows one review per completed request by its customer, with consistent aggregates', async () => {
    const { profile, serviceId, user: proUser } = await createProfessional(prisma);
    const c = await createUser(prisma);
    const customer = await login(app, c.email);
    const pro = await login(app, proUser.email);
    const id = await submitRequest(customer, profile.slug, serviceId, futureDate(3));
    const review = { requestId: id, rating: 5, body: 'Very attentive and kind.', contactPhone: '091 23 45 67', locale: 'en' };
    expect(createReviewSchema.safeParse(review).success).toBe(true);
    // Phone is required; a reason is required below 5 stars; 5 stars may have no text.
    expect(createReviewSchema.safeParse({ ...review, contactPhone: '' }).success).toBe(false);
    const low = createReviewSchema.safeParse({ ...review, rating: 3, body: 'bad' });
    expect(low.success ? null : low.error.issues[0]?.message).toBe('reason_required');
    expect(createReviewSchema.safeParse({ ...review, body: '' }).success).toBe(true);

    expect((await customer.post('/api/reviews', review)).body.error.code).toBe('REVIEW_NOT_ELIGIBLE'); // not completed
    await pro.post(`/api/requests/${id}/accept`);
    await customer.post(`/api/requests/${id}/confirm`);
    // Simulate the service having ended.
    await prisma.careRequest.update({ where: { id }, data: { endAt: new Date(Date.now() - 60_000) } });
    expect((await pro.post(`/api/requests/${id}/complete`)).status).toBe(200);

    expect((await pro.post('/api/reviews', review)).body.error.code).toBe('REVIEW_NOT_ELIGIBLE'); // professional cannot review
    const created = await customer.post('/api/reviews', review);
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('PENDING');
    expect((await customer.post('/api/reviews', review)).body.error.code).toBe('REVIEW_EXISTS');

    // Pending reviews are not public and do not count.
    const pending = (await agent(app).get(`/api/professionals/${profile.slug}`)).body;
    expect([pending.rating, pending.ratingCount, pending.totalReviewCount]).toEqual([null, 0, 0]);

    const admin = await login(app, (await createUser(prisma, { isAdmin: true })).email);
    expect((await admin.post(`/api/admin/reviews/${created.body.id}/moderate`, { status: 'PUBLISHED' })).status).toBe(200);
    expect((await admin.post(`/api/admin/reviews/${created.body.id}/moderate`, { status: 'PUBLISHED' })).status).toBe(200); // idempotent
    let p = await prisma.professionalProfile.findUniqueOrThrow({ where: { id: profile.id } });
    expect([p.ratingCount, p.totalReviewCount, p.ratingValue]).toEqual([1, 1, 5]);
    const pub = await agent(app).get(`/api/professionals/${profile.slug}`);
    expect([pub.body.rating, pub.body.ratingCount, pub.body.totalReviewCount]).toEqual([5, 1, 1]);
    expect(pub.body.reviews).toHaveLength(1);
    // The follow-up phone is admin-only: never in the public profile, present in the admin list.
    expect(JSON.stringify(pub.body)).not.toContain('91234567');
    const adminList = await admin.get('/api/admin/reviews?status=PUBLISHED');
    expect(adminList.body.items.find((x: any) => x.id === created.body.id)?.contactPhone).toBe('+37491234567');
    const lowList = await admin.get('/api/admin/reviews?status=PUBLISHED&low=1');
    expect(lowList.body.items.some((x: any) => x.id === created.body.id)).toBe(false);

    await admin.post(`/api/admin/reviews/${created.body.id}/moderate`, { status: 'REJECTED' });
    p = await prisma.professionalProfile.findUniqueOrThrow({ where: { id: profile.id } });
    expect([p.ratingCount, p.totalReviewCount, p.ratingValue]).toEqual([0, 0, null]);
    // Moderation is audited.
    expect(await prisma.auditLog.count({ where: { entityId: created.body.id } })).toBeGreaterThanOrEqual(2);
  });

  it('cannot review cancelled or declined work', async () => {
    const { profile, serviceId, user: proUser } = await createProfessional(prisma);
    const customer = await login(app, (await createUser(prisma)).email);
    const pro = await login(app, proUser.email);
    const id = await submitRequest(customer, profile.slug, serviceId, futureDate(3));
    await pro.post(`/api/requests/${id}/decline`, { reason: 'Busy' });
    expect((await customer.post('/api/reviews', { requestId: id, rating: 4, body: 'Should not be allowed', contactPhone: '+37491234567', locale: 'hy' })).body.error.code).toBe('REVIEW_NOT_ELIGIBLE');
  });
});

describe('onboarding and admin approval', () => {
  it('requires a verified nursing license before approving nursing services; changed evidence drops the badge', async () => {
    const u = await createUser(prisma);
    const a = await login(app, u.email);
    expect((await a.post('/api/me/professional')).status).toBe(201);
    const cats = (await a.get('/api/taxonomy/categories')).body;
    const nursingCat = cats.find((c: any) => c.slug === 'nursing');
    const nursing = nursingCat.services.find((s: any) => s.slug === 'nursing-injections');
    expect(nursing.requiredQualification).toBe('NURSING_LICENSE');
    const kentron = await locationId(prisma);
    expect((await a.post('/api/me/professional/submit')).body.error.code).toBe('PROFILE_INCOMPLETE');
    expect((await a.put('/api/me/professional/intro', { displayName: 'Nurse Test', headline: 'Registered nurse', bio: 'A'.repeat(50), originalLocale: 'en', phone: '091 23 45 67' })).status).toBe(200);
    expect((await a.put('/api/me/professional/services', { categoryId: nursingCat.id, serviceIds: [nursing.id], attributeIds: [] })).status).toBe(200);
    // Birth year and education are required for the age/education filters.
    expect((await a.put('/api/me/professional/experience', { experienceYears: 10 })).status).toBe(400);
    expect((await a.put('/api/me/professional/experience', { experienceYears: 10, birthYear: 1985, educationLevel: 'BACHELOR' })).status).toBe(200);
    expect((await a.put('/api/me/professional/area', { homeLocationId: kentron, serviceAreaIds: [kentron] })).status).toBe(200);
    expect((await a.put('/api/me/professional/languages', { languages: ['en', 'hy'] })).status).toBe(200);
    expect((await a.put('/api/me/professional/prices', { offerings: [{ serviceId: nursing.id, priceKind: 'FIXED', priceAmount: 4000, priceUnit: 'VISIT' }] })).status).toBe(200);
    expect((await a.put('/api/me/professional/schedule', { rules: [{ weekday: 1, startMinute: 540, endMinute: 1080 }] })).status).toBe(200);
    const q = await a.post('/api/me/professional/qualifications', { kind: 'NURSING_LICENSE', title: 'Nursing license', issuer: 'Ministry' });
    const qualId = q.body.qualifications[0].id;
    const submitted = await a.post('/api/me/professional/submit');
    expect(submitted.body.status).toBe('PENDING');
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).phone).toBe('+37491234567');

    const admin = await login(app, (await createUser(prisma, { isAdmin: true })).email);
    const profileId = submitted.body.id;
    expect((await admin.post(`/api/admin/professionals/${profileId}/approve`)).body.error.code).toBe('PROFILE_INCOMPLETE');
    expect((await admin.post(`/api/admin/qualifications/${qualId}/review`, { status: 'VERIFIED' })).status).toBe(200);
    expect((await admin.post(`/api/admin/professionals/${profileId}/approve`)).status).toBe(200);
    const pub = await agent(app).get(`/api/professionals/${submitted.body.slug}?lang=en`);
    expect(pub.status).toBe(200);
    expect(pub.body.verifications[0].kind).toBe('NURSING_LICENSE');

    // Changing the credential's claim resets verification → badge disappears.
    await a.put(`/api/me/professional/qualifications/${qualId}`, { kind: 'NURSING_LICENSE', title: 'Different license', issuer: 'Ministry' });
    const after = await agent(app).get(`/api/professionals/${submitted.body.slug}`);
    expect(after.body.verifications).toHaveLength(0);
    // Ordinary users cannot set verification or publication fields.
    expect((await a.post(`/api/admin/qualifications/${qualId}/review`, { status: 'VERIFIED' })).status).toBe(403);
  });
});

describe('support inquiries', () => {
  it('persists inquiries and lists them for admins', async () => {
    const res = await agent(app).post('/api/support/inquiries', { name: 'Visitor', email: 'v@test.local', topic: 'GENERAL', message: 'How does verification work?' });
    expect(res.status).toBe(201);
    expect(res.body.stored).toBe(true);
    const admin = await login(app, (await createUser(prisma, { isAdmin: true })).email);
    const list = await admin.get('/api/admin/inquiries?status=OPEN');
    expect(list.body.items.some((i: any) => i.id === res.body.id)).toBe(true);
  });
});
