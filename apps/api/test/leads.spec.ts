import { INestApplication } from '@nestjs/common';
import { env } from '../src/config/env';
import { resetRateLimits } from '../src/common/http';
import { PrismaService } from '../src/common/prisma.service';
import { LeadsService } from '../src/leads/leads.module';
import { agent, createApp, createProfessional, createUser, futureDate, locationId, login } from './helpers';

let app: INestApplication;
let prisma: PrismaService;

beforeAll(async () => {
  ({ app, prisma } = await createApp());
});
afterAll(async () => {
  await app.close();
});
beforeEach(() => resetRateLimits());

const guestLead = (extra: object = {}) => agent(app).post('/api/leads', { name: 'Անի Մարտիրոսյան', phone: '091 23-45-67', schedule: 'Երկուշաբթիից ուրբաթ, 10–14', message: 'Երկու տարեկան երեխա', ...extra });

describe('requests go to the Carely team, never to the professional', () => {
  it('stores a guest request from a profile without notifying the professional', async () => {
    const { user: proUser, profile, serviceId } = await createProfessional(prisma);
    const before = await prisma.notification.count({ where: { userId: proUser.id } });
    const res = await guestLead({ professionalSlug: profile.slug, serviceId, locationId: await locationId(prisma) });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ stored: true, id: expect.any(String) });

    const lead = await prisma.careLead.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(lead).toMatchObject({ status: 'NEW', source: 'PROFILE', phone: '+37491234567', requestedProfessionalId: profile.id, professionalId: profile.id, serviceId, userId: null });
    expect(lead.categoryId).toBe(profile.categoryId);
    expect(await prisma.notification.count({ where: { userId: proUser.id } })).toBe(before);
    expect(await prisma.careRequest.count({ where: { professionalId: profile.id } })).toBe(0);

    // The professional has no way to see it.
    const pro = await login(app, proUser.email);
    expect((await pro.get(`/api/admin/leads/${lead.id}`)).status).toBe(403);
    expect((await pro.get('/api/requests?as=professional')).body.items).toHaveLength(0);
  });

  it('accepts a general request by category and links signed-in clients', async () => {
    const u = await createUser(prisma);
    const a = await login(app, u.email);
    const res = await a.post('/api/leads', { name: 'Test Client', phone: '+374 99 111 222', categorySlug: 'elderly-care', locale: 'ru' });
    expect(res.status).toBe(201);
    const lead = await prisma.careLead.findUniqueOrThrow({ where: { id: res.body.id }, include: { category: true } });
    expect(lead).toMatchObject({ source: 'GENERAL', userId: u.id, locale: 'ru', requestedProfessionalId: null });
    expect(lead.category?.slug).toBe('elderly-care');
  });

  it('validates input and rejects services the professional does not offer', async () => {
    const bad = await guestLead({ phone: '12345' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields.phone).toEqual(['phone_invalid']);
    expect((await agent(app).post('/api/leads', { phone: '091234567' })).body.error.fields.name).toEqual(['required']);

    const { profile } = await createProfessional(prisma);
    const other = await prisma.service.findUniqueOrThrow({ where: { slug: 'elderly-daily-care' } });
    const res = await guestLead({ professionalSlug: profile.slug, serviceId: other.id });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.serviceId).toEqual(['invalid']);
    expect((await guestLead({ professionalSlug: 'no-such-profile' })).status).toBe(404);
    expect((await guestLead({ categorySlug: 'no-such-category' })).status).toBe(400);
  });

  it('stores an optional period and rejects past or reversed dates', async () => {
    const res = await guestLead({ startDate: futureDate(3), endDate: futureDate(10) });
    expect(res.status).toBe(201);
    const lead = await prisma.careLead.findUniqueOrThrow({ where: { id: res.body.id } });
    expect([lead.startDate?.toISOString().slice(0, 10), lead.endDate]).toEqual([futureDate(3), new Date(futureDate(10))]);
    expect((await guestLead({ startDate: futureDate(3) })).status).toBe(201); // open-ended
    expect((await guestLead({ startDate: '', endDate: '' })).status).toBe(201);

    const reversed = await guestLead({ startDate: futureDate(10), endDate: futureDate(3) });
    expect(reversed.status).toBe(400);
    expect(reversed.body.error.fields.endDate).toEqual(['end_before_start']);
    const past = await guestLead({ startDate: '2020-01-01' });
    expect(past.body.error.fields.startDate).toEqual(['date_in_past']);
    expect((await guestLead({ endDate: '2026-13-45x' })).status).toBe(400);
  });

  it('does not accept requests for unpublished profiles', async () => {
    const { profile } = await createProfessional(prisma, { status: 'PENDING' });
    expect((await guestLead({ professionalSlug: profile.slug })).status).toBe(404);
  });

  it('silently drops honeypot submissions', async () => {
    const before = await prisma.careLead.count();
    const res = await guestLead({ website: 'http://spam.example' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ stored: true, id: null });
    expect(await prisma.careLead.count()).toBe(before);
  });

  it('rate limits anonymous submissions', async () => {
    for (let i = 0; i < 8; i++) expect((await guestLead()).status).toBe(201);
    expect((await guestLead()).status).toBe(429);
  });

  it('turns off the legacy direct booking unless explicitly enabled', async () => {
    const { profile, serviceId } = await createProfessional(prisma);
    const u = await createUser(prisma);
    const a = await login(app, u.email);
    env.DIRECT_REQUESTS_ENABLED = false;
    try {
      const res = await a.post('/api/requests', { professionalSlug: profile.slug, serviceId, scheduleType: 'ONE_TIME', date: futureDate(3), startTime: '10:00', endTime: '12:00', locationId: await locationId(prisma) });
      expect(res.status).toBe(404);
      expect(await prisma.careRequest.count({ where: { professionalId: profile.id } })).toBe(0);
    } finally {
      env.DIRECT_REQUESTS_ENABLED = true;
    }
  });
});

describe('admin lead workflow', () => {
  it('lists, assigns another professional, updates status and audits every change', async () => {
    const { profile } = await createProfessional(prisma);
    const { profile: other, user: otherUser } = await createProfessional(prisma);
    const id = (await guestLead({ professionalSlug: profile.slug })).body.id;
    const admin = await createUser(prisma, { isAdmin: true, name: 'Team Member' });
    const a = await login(app, admin.email);

    const list = await a.get('/api/admin/leads?status=NEW&q=Մարտիրոսյան');
    expect(list.status).toBe(200);
    expect(list.body.items.some((l: { id: string }) => l.id === id)).toBe(true);
    expect(list.body.newCount).toBeGreaterThan(0);
    expect((await a.get('/api/admin/leads?q=91234567')).body.items.some((l: { id: string }) => l.id === id)).toBe(true);

    const upd = await a.patch(`/api/admin/leads/${id}`, { status: 'MATCHED', professionalId: other.id, adminNote: 'Զանգահարել է, համաձայն է' });
    expect(upd.status).toBe(200);
    expect(upd.body).toMatchObject({
      status: 'MATCHED',
      requestedProfessional: { id: profile.id },
      professional: { id: other.id, phone: otherUser.phone },
      adminNote: 'Զանգահարել է, համաձայն է',
      handledBy: 'Team Member',
      closedAt: null,
    });
    const closed = await a.patch(`/api/admin/leads/${id}`, { status: 'CLOSED' });
    expect(closed.body.closedAt).toEqual(expect.any(String));
    expect(await prisma.auditLog.count({ where: { entityType: 'CareLead', entityId: id } })).toBe(2);

    expect((await a.patch(`/api/admin/leads/${id}`, {})).status).toBe(400);
    const { profile: hidden } = await createProfessional(prisma, { status: 'SUSPENDED' });
    expect((await a.patch(`/api/admin/leads/${id}`, { professionalId: hidden.id })).status).toBe(400);
    expect((await a.get('/api/admin/stats')).body).toEqual(expect.objectContaining({ newLeads: expect.any(Number), openLeads: expect.any(Number) }));
  });

  it('requires an admin', async () => {
    expect((await agent(app).get('/api/admin/leads')).status).toBe(401);
    const u = await createUser(prisma);
    expect((await (await login(app, u.email)).get('/api/admin/leads')).status).toBe(403);
  });
});

describe('Telegram alert', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    env.TELEGRAM_BOT_TOKEN = '';
    env.TELEGRAM_CHAT_ID = '';
  });

  it('is skipped when not configured', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const lead = await prisma.careLead.findFirstOrThrow({ include: { user: true, requestedProfessional: true, professional: { include: { user: true } }, category: { include: { translations: true } }, service: { include: { translations: true } }, location: { include: { translations: true } }, handledBy: true } });
    expect(await app.get(LeadsService).alert(lead as never)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends an escaped summary with an admin link, and never fails the request', async () => {
    env.TELEGRAM_BOT_TOKEN = 'TOKEN';
    env.TELEGRAM_CHAT_ID = '-100';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    const { profile } = await createProfessional(prisma);
    const res = await guestLead({ professionalSlug: profile.slug, message: 'Ալերգիա <ընկույզ> & կաթ', startDate: futureDate(2) });
    expect(res.status).toBe(201);
    await new Promise((r) => setImmediate(r));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/botTOKEN/sendMessage');
    const body = JSON.parse(init.body);
    expect(body.chat_id).toBe('-100');
    expect(body.parse_mode).toBe('HTML');
    expect(body.text).toContain('+37491234567');
    expect(body.text).toContain('Ալերգիա &lt;ընկույզ&gt; &amp; կաթ');
    expect(body.text).toContain(`/hy/admin/leads/${res.body.id}`);
    expect(body.text).toContain(`Ժամկետ:</b> ${futureDate(2)} – …`);

    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    expect((await guestLead()).status).toBe(201);
  });

  it('sends to every comma-separated chat and succeeds if any chat accepts it', async () => {
    env.TELEGRAM_BOT_TOKEN = 'TOKEN';
    env.TELEGRAM_CHAT_ID = '529901132, -100777 ,';
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: false, status: 403 }).mockResolvedValueOnce({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    const lead = await prisma.careLead.findFirstOrThrow({ include: { user: true, requestedProfessional: true, professional: { include: { user: true } }, category: { include: { translations: true } }, service: { include: { translations: true } }, location: { include: { translations: true } }, handledBy: true } });
    expect(await app.get(LeadsService).alert(lead as never)).toBe(true);
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).chat_id)).toEqual(['529901132', '-100777']);
  });
});
