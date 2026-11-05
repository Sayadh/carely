import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/common/prisma.service';
import { hashPassword } from '../src/auth/crypto';
import { resetRateLimits } from '../src/common/http';
import { addDays, utcToZonedDate } from '@carely/shared';

export const PASSWORD = 'TestPassword123!';
let pwHash: string | null = null;

export async function createApp() {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export type Agent = ReturnType<typeof request.agent>;

/** Supertest agent that keeps the session cookie and sends the CSRF header on mutations. */
export function agent(app: INestApplication) {
  const a = request.agent(app.getHttpServer());
  return {
    raw: a,
    get: (url: string) => a.get(url),
    post: (url: string, body?: object) => a.post(url).set('x-carely-csrf', '1').send(body ?? {}),
    put: (url: string, body?: object) => a.put(url).set('x-carely-csrf', '1').send(body ?? {}),
    patch: (url: string, body?: object) => a.patch(url).set('x-carely-csrf', '1').send(body ?? {}),
    delete: (url: string) => a.delete(url).set('x-carely-csrf', '1'),
  };
}

let seq = 0;
export const uniq = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export async function createUser(prisma: PrismaService, opts: { isAdmin?: boolean; name?: string } = {}) {
  resetRateLimits();
  pwHash ??= await hashPassword(PASSWORD);
  return prisma.user.create({
    data: { email: `${uniq('u')}@test.local`, name: opts.name ?? 'Test User', passwordHash: pwHash, isAdmin: !!opts.isAdmin, phone: '+37499111222' },
  });
}

export async function login(app: INestApplication, email: string) {
  const a = agent(app);
  const res = await a.post('/api/auth/login', { email, password: PASSWORD });
  if (res.status !== 200) throw new Error('login failed ' + res.status + JSON.stringify(res.body));
  return a;
}

/** Approved professional serving Yerevan (whole region) with an hourly toddler-care offer and a full weekly schedule. */
export async function createProfessional(prisma: PrismaService, opts: { status?: 'APPROVED' | 'PENDING' | 'SUSPENDED' } = {}) {
  const user = await createUser(prisma, { name: 'Pro Person' });
  const cat = await prisma.category.findUniqueOrThrow({ where: { slug: 'childcare' } });
  const svc = await prisma.service.findUniqueOrThrow({ where: { slug: 'child-toddler-care' } });
  const yerevan = await prisma.location.findUniqueOrThrow({ where: { slug: 'yerevan' } });
  const profile = await prisma.professionalProfile.create({
    data: {
      userId: user.id,
      slug: uniq('pro'),
      status: opts.status ?? 'APPROVED',
      displayName: 'Pro Person',
      categoryId: cat.id,
      homeLocationId: yerevan.id,
      experienceYears: 3,
      approvedAt: new Date(),
      translations: { create: [{ locale: 'hy', headline: 'Դայակ', bio: 'Փորձառու դայակ' }] },
      languages: { create: [{ code: 'hy' }] },
      offerings: { create: [{ serviceId: svc.id, priceKind: 'FIXED', priceAmount: 2500, priceUnit: 'HOUR' }] },
      serviceAreas: { create: [{ locationId: yerevan.id }] },
      rules: { create: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMinute: 0, endMinute: 1440 })) },
    },
  });
  return { user, profile, serviceId: svc.id };
}

export async function locationId(prisma: PrismaService, slug = 'yerevan-kentron') {
  return (await prisma.location.findUniqueOrThrow({ where: { slug } })).id;
}

export const futureDate = (days = 5) => addDays(utcToZonedDate(new Date()), days);
