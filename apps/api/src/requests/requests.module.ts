import { Controller, Get, HttpCode, Injectable, Module, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma, RequestStatus } from '@prisma/client';
import { z } from 'zod';
import {
  LIMITS,
  addDays,
  canTransition,
  createRequestSchema,
  cancelSchema,
  expandSchedule,
  rangesOverlap,
  requestListQuerySchema,
  requestNoteSchema,
  timeToMinutes,
  transitionSchema,
  type Occurrence,
  type RequestActor,
  type RequestDetailDto,
  type RequestSummaryDto,
} from '@carely/shared';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/app-error';
import { ApiZodBody, ApiZodQuery, Auth, AuthUser, CurrentUser, paginate, RateLimit, ZBody, ZQuery } from '../common/http';
import { NotificationsService } from '../notifications/notifications.module';
import { i18n } from '../taxonomy/taxonomy.module';
import { MediaModule } from '../media/media.module';
import { StorageService } from '../media/storage.service';
import { env } from '../config/env';
import { PUBLIC_PROFILE } from '../professionals/professionals.module';
import { blockedByException } from '../professionals/availability';
import { lockingOverlaps, lockProfessional, lockRequest, withDeadlockRetry } from './locking';

const maskFromDays = (days: number[]) => days.reduce((m, d) => m | (1 << (d - 1)), 0);
const daysFromMask = (mask: number) => [1, 2, 3, 4, 5, 6, 7].filter((d) => mask & (1 << (d - 1)));

const detailInclude = {
  service: { include: { translations: true } },
  location: { include: { translations: true } },
  customer: { select: { id: true, name: true, email: true, phone: true } },
  professional: { select: { id: true, slug: true, userId: true, displayName: true, status: true, portrait: { select: { storageKey: true } }, user: { select: { email: true, phone: true, name: true } } } },
  events: { orderBy: { createdAt: 'asc' } },
  notes: { orderBy: { createdAt: 'asc' } },
  occurrences: { where: { status: 'ACTIVE' }, orderBy: { startAt: 'asc' } },
  review: { select: { id: true } },
} satisfies Prisma.CareRequestInclude;
type DetailRequest = Prisma.CareRequestGetPayload<{ include: typeof detailInclude }>;

export function occurrencesFor(r: { scheduleType: string; startDate: string | null; endDate: string | null; weekdayMask: number | null; startMinute: number; endMinute: number }): Occurrence[] {
  if (r.scheduleType === 'ONE_TIME') return expandSchedule({ startDate: r.startDate!, endDate: r.startDate!, startMinute: r.startMinute, endMinute: r.endMinute });
  return expandSchedule({ startDate: r.startDate!, endDate: r.endDate!, startMinute: r.startMinute, endMinute: r.endMinute, weekdays: daysFromMask(r.weekdayMask ?? 0) });
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  // ───────── Create ─────────
  async create(user: AuthUser, input: z.output<typeof createRequestSchema>) {
    // Clients now send requests to the Carely team (leads module); professionals never receive them directly.
    if (!env.DIRECT_REQUESTS_ENABLED) throw new AppError('NOT_FOUND');
    const pro = await this.prisma.professionalProfile.findFirst({
      where: { slug: input.professionalSlug, ...PUBLIC_PROFILE },
      include: {
        offerings: { include: { service: true } },
        serviceAreas: true,
        qualifications: { where: { status: 'VERIFIED' }, select: { kind: true } },
        exceptions: true,
      },
    });
    if (!pro) throw new AppError('NOT_FOUND');
    if (pro.userId === user.id) throw new AppError('SELF_REQUEST');

    const offering = pro.offerings.find((o) => o.serviceId === input.serviceId && o.service.active);
    if (!offering) throw new AppError('SERVICE_NOT_OFFERED');
    const req = offering.service.requiredQualification;
    if (req && !pro.qualifications.some((q) => q.kind === req)) throw new AppError('SERVICE_NOT_OFFERED');

    // Location must be a declared service area or lie inside one.
    const loc = await this.prisma.location.findFirst({ where: { id: input.locationId, active: true } });
    if (!loc) throw new AppError('VALIDATION_FAILED', undefined, { locationId: ['invalid'] });
    const chain = [loc.id];
    let parentId = loc.parentId;
    while (parentId) {
      chain.push(parentId);
      parentId = (await this.prisma.location.findUnique({ where: { id: parentId }, select: { parentId: true } }))?.parentId ?? null;
    }
    if (!pro.serviceAreas.some((a) => chain.includes(a.locationId))) throw new AppError('LOCATION_NOT_SERVED');

    const startMinute = timeToMinutes(input.startTime);
    const endMinute = timeToMinutes(input.endTime);
    let def: { startDate: string; endDate: string | null; weekdayMask: number | null };
    if (input.scheduleType === 'ONE_TIME') {
      def = { startDate: input.date!, endDate: null, weekdayMask: null };
    } else {
      if (input.endDate! < input.startDate!) throw new AppError('END_BEFORE_START', undefined, { endDate: ['end_before_start'] });
      if (addDays(input.startDate!, LIMITS.recurringMaxWeeks * 7) < input.endDate!) throw new AppError('RECURRENCE_TOO_LONG', { weeks: LIMITS.recurringMaxWeeks });
      def = { startDate: input.startDate!, endDate: input.endDate!, weekdayMask: maskFromDays([...new Set(input.weekdays!)]) };
    }
    const occ = occurrencesFor({ scheduleType: input.scheduleType, ...def, startMinute, endMinute });
    if (!occ.length) throw new AppError('RECURRENCE_EMPTY');
    if (occ[0].startAt.getTime() <= Date.now() + 15 * 60_000) throw new AppError('START_IN_PAST');
    for (const o of occ) {
      if (o.endAt <= o.startAt) throw new AppError('END_BEFORE_START');
      if (o.endAt.getTime() - o.startAt.getTime() > LIMITS.requestMaxDurationMinutes * 60_000) throw new AppError('DURATION_TOO_LONG');
    }
    const first = occ[0];
    const last = occ[occ.length - 1];

    // Friendly pre-check (non-binding). The binding check happens under lock at confirmation.
    if (occ.some((o) => blockedByException(o.startAt, o.endAt, pro.exceptions))) throw new AppError('PROFESSIONAL_UNAVAILABLE');
    const existing = await this.prisma.bookingOccurrence.findMany({
      where: { professionalId: pro.id, status: 'ACTIVE', startAt: { lt: last.endAt }, endAt: { gt: first.startAt } },
      select: { startAt: true, endAt: true },
    });
    if (occ.some((o) => existing.some((e) => rangesOverlap(o.startAt, o.endAt, e.startAt, e.endAt)))) throw new AppError('SCHEDULE_CONFLICT');

    const created = await this.prisma.$transaction(async (tx) => {
      const r = await tx.careRequest.create({
        data: {
          customerId: user.id,
          professionalId: pro.id,
          serviceId: offering.serviceId,
          locationId: loc.id,
          scheduleType: input.scheduleType,
          startAt: first.startAt,
          endAt: last.endAt,
          startDate: def.startDate,
          endDate: def.endDate,
          weekdayMask: def.weekdayMask,
          startMinute,
          endMinute,
          addressNote: input.addressNote,
          requirements: input.requirements,
          priceKind: offering.priceKind,
          priceAmount: offering.priceAmount,
          priceUnit: offering.priceUnit,
        },
      });
      await tx.requestEvent.create({ data: { requestId: r.id, actorId: user.id, actorRole: 'CUSTOMER', type: 'CREATED', toStatus: 'SUBMITTED' } });
      await this.notifications.notify(pro.userId, 'REQUEST_SUBMITTED', { requestId: r.id, name: user.name }, tx);
      return r;
    });
    return { id: created.id };
  }

  // ───────── Read ─────────
  private roleOf(r: { customerId: string; professional: { userId: string } }, userId: string): 'CUSTOMER' | 'PROFESSIONAL' | null {
    if (r.customerId === userId) return 'CUSTOMER';
    if (r.professional.userId === userId) return 'PROFESSIONAL';
    return null;
  }

  private allowedActions(r: DetailRequest, role: RequestActor): string[] {
    const acts: string[] = [];
    const now = Date.now();
    if (canTransition('accept', r.status, role) && r.professional.status === 'APPROVED') acts.push('accept');
    if (canTransition('decline', r.status, role)) acts.push('decline');
    if (canTransition('confirm', r.status, role) && (!r.expiresAt || r.expiresAt.getTime() > now)) acts.push('confirm');
    if (canTransition('complete', r.status, role) && r.endAt.getTime() <= now) acts.push('complete');
    if (canTransition('cancel', r.status, role)) acts.push('cancel');
    if (role === 'CUSTOMER' && r.status === 'COMPLETED' && !r.review) acts.push('review');
    if ((role === 'CUSTOMER' || role === 'PROFESSIONAL') && !['DECLINED', 'CANCELLED', 'EXPIRED'].includes(r.status)) acts.push('note');
    return acts;
  }

  private summary(r: DetailRequest, role: 'CUSTOMER' | 'PROFESSIONAL'): RequestSummaryDto {
    const counterpart =
      role === 'CUSTOMER'
        ? { name: r.professional.displayName, portraitUrl: r.professional.portrait ? this.storage.publicUrl(r.professional.portrait.storageKey) : null, slug: r.professional.slug }
        : { name: r.customer.name, portraitUrl: null, slug: null };
    return {
      id: r.id,
      status: r.status,
      scheduleType: r.scheduleType,
      service: i18n(r.service.translations),
      location: i18n(r.location.translations),
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      recurrence:
        r.scheduleType === 'RECURRING'
          ? { weekdays: daysFromMask(r.weekdayMask ?? 0), startDate: r.startDate!, endDate: r.endDate!, startMinute: r.startMinute, endMinute: r.endMinute }
          : null,
      occurrenceCount: r.status === 'CONFIRMED' || r.status === 'COMPLETED' ? r.occurrences.length : occurrencesFor(r).length,
      price: r.priceUnit ? { kind: r.priceKind!, amount: r.priceAmount, unit: r.priceUnit } : null,
      counterpart,
      role,
      expiresAt: r.status === 'ACCEPTED' ? (r.expiresAt?.toISOString() ?? null) : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      hasReview: !!r.review,
    };
  }

  toDetail(r: DetailRequest, role: 'CUSTOMER' | 'PROFESSIONAL', actor: RequestActor = role): RequestDetailDto {
    const revealed = r.status === 'CONFIRMED' || r.status === 'COMPLETED';
    const roleOfUser = (id: string | null): 'CUSTOMER' | 'PROFESSIONAL' => (id === r.customerId ? 'CUSTOMER' : 'PROFESSIONAL');
    return {
      ...this.summary(r, role),
      requirements: r.requirements,
      addressNote: r.addressNote || null,
      events: r.events.map((e) => ({ id: e.id, type: e.type, fromStatus: e.fromStatus, toStatus: e.toStatus, actorRole: e.actorRole, note: e.note, createdAt: e.createdAt.toISOString() })),
      notes: r.notes.map((n) => ({ id: n.id, authorRole: roleOfUser(n.authorId), body: n.body, createdAt: n.createdAt.toISOString() })),
      contacts: revealed
        ? {
            customer: { name: r.customer.name, phone: r.customer.phone, email: r.customer.email },
            professional: { name: r.professional.displayName, phone: r.professional.user.phone, email: r.professional.user.email },
          }
        : null,
      occurrences: (revealed ? r.occurrences : occurrencesFor(r)).map((o) => ({ startAt: o.startAt.toISOString(), endAt: o.endAt.toISOString() })),
      allowedActions: actor === 'ADMIN' ? (canTransition('cancel', r.status, 'ADMIN') ? ['cancel'] : []) : this.allowedActions(r, actor),
      cancelReason: r.cancelReason,
      declineReason: r.declineReason,
    };
  }

  async load(id: string) {
    return this.prisma.careRequest.findUnique({ where: { id }, include: detailInclude });
  }

  async detail(user: AuthUser, id: string) {
    await this.expireDue({ requestId: id });
    const r = await this.load(id);
    if (!r) throw new AppError('NOT_FOUND');
    const role = this.roleOf(r, user.id);
    if (!role) throw new AppError('NOT_FOUND'); // do not reveal existence
    return this.toDetail(r, role);
  }

  async list(user: AuthUser, q: z.output<typeof requestListQuerySchema>) {
    await this.expireDue({ userId: user.id });
    const pageSize = 20;
    const where: Prisma.CareRequestWhereInput = q.as === 'professional' ? { professional: { userId: user.id } } : { customerId: user.id };
    if (q.status) where.status = q.status;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.careRequest.findMany({ where, include: detailInclude, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (q.page - 1) * pageSize, take: pageSize }),
      this.prisma.careRequest.count({ where }),
    ]);
    const role = q.as === 'professional' ? 'PROFESSIONAL' : 'CUSTOMER';
    return paginate(
      rows.map((r) => this.summary(r, role)),
      total,
      q.page,
      pageSize,
    );
  }

  /** Confirmed upcoming occurrences for the professional's calendar. */
  async schedule(user: AuthUser) {
    const rows = await this.prisma.bookingOccurrence.findMany({
      where: { professional: { userId: user.id }, status: 'ACTIVE', endAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
      orderBy: { startAt: 'asc' },
      take: 300,
      include: { request: { select: { id: true, status: true, service: { include: { translations: true } }, location: { include: { translations: true } }, customer: { select: { name: true } } } } },
    });
    return rows.map((o) => ({
      startAt: o.startAt.toISOString(),
      endAt: o.endAt.toISOString(),
      requestId: o.request.id,
      status: o.request.status,
      service: i18n(o.request.service.translations),
      location: i18n(o.request.location.translations),
      customerName: o.request.customer.name,
    }));
  }

  // ───────── Transitions ─────────
  private async event(tx: Prisma.TransactionClient, requestId: string, actorId: string | null, actorRole: RequestActor, type: string, from: RequestStatus, to: RequestStatus, note?: string) {
    await tx.requestEvent.create({ data: { requestId, actorId, actorRole, type, fromStatus: from, toStatus: to, note: note || null } });
  }

  private async participantRequest(user: AuthUser, id: string) {
    const r = await this.prisma.careRequest.findUnique({ where: { id }, include: { professional: { select: { userId: true, status: true, id: true } } } });
    if (!r) throw new AppError('NOT_FOUND');
    const role = this.roleOf(r, user.id);
    if (!role) throw new AppError('NOT_FOUND');
    return { r, role };
  }

  async accept(user: AuthUser, id: string) {
    await this.expireDue({ requestId: id });
    const { r, role } = await this.participantRequest(user, id);
    if (!canTransition('accept', r.status, role)) throw new AppError('INVALID_TRANSITION', { from: r.status, action: 'accept' });
    if (r.professional.status !== 'APPROVED') throw new AppError('FORBIDDEN');
    const ttl = env.ACCEPTED_REQUEST_TTL_HOURS * 3600_000;
    const expiresAt = new Date(Math.min(Date.now() + ttl, r.startAt.getTime()));
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.careRequest.updateMany({ where: { id, status: 'SUBMITTED' }, data: { status: 'ACCEPTED', acceptedAt: new Date(), expiresAt } });
      if (res.count !== 1) throw new AppError('INVALID_TRANSITION', { action: 'accept' });
      await this.event(tx, id, user.id, 'PROFESSIONAL', 'ACCEPTED', 'SUBMITTED', 'ACCEPTED');
      await this.notifications.notify(r.customerId, 'REQUEST_ACCEPTED', { requestId: id, expiresAt: expiresAt.toISOString() }, tx);
    });
    return this.detail(user, id);
  }

  async decline(user: AuthUser, id: string, reason: string) {
    const { r, role } = await this.participantRequest(user, id);
    if (!canTransition('decline', r.status, role)) throw new AppError('INVALID_TRANSITION', { from: r.status, action: 'decline' });
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.careRequest.updateMany({ where: { id, status: 'SUBMITTED' }, data: { status: 'DECLINED', declineReason: reason || null } });
      if (res.count !== 1) throw new AppError('INVALID_TRANSITION', { action: 'decline' });
      await this.event(tx, id, user.id, 'PROFESSIONAL', 'DECLINED', 'SUBMITTED', 'DECLINED', reason);
      await this.notifications.notify(r.customerId, 'REQUEST_DECLINED', { requestId: id }, tx);
    });
    return this.detail(user, id);
  }

  /**
   * Customer confirmation. Serialized per professional (row lock), then a locking overlap read and insert in the same
   * READ COMMITTED transaction. Retries on deadlock. This is the only path that creates booking occurrences.
   */
  async confirm(user: AuthUser, id: string) {
    await this.expireDue({ requestId: id });
    const { r: pre, role } = await this.participantRequest(user, id);
    if (role !== 'CUSTOMER') throw new AppError('INVALID_TRANSITION', { action: 'confirm' });

    await withDeadlockRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          await lockProfessional(tx, pre.professionalId);
          await lockRequest(tx, id);
          const r = await tx.careRequest.findUniqueOrThrow({
            where: { id },
            include: { professional: { select: { userId: true, status: true, user: { select: { status: true } }, exceptions: true } } },
          });
          if (!canTransition('confirm', r.status, 'CUSTOMER') || r.customerId !== user.id) throw new AppError('INVALID_TRANSITION', { from: r.status, action: 'confirm' });
          if (r.expiresAt && r.expiresAt.getTime() <= Date.now()) throw new AppError('REQUEST_EXPIRED');
          if (r.professional.status !== 'APPROVED' || r.professional.user.status !== 'ACTIVE') throw new AppError('PROFESSIONAL_UNAVAILABLE');

          const occ = occurrencesFor(r);
          if (!occ.length || occ[0].startAt.getTime() <= Date.now()) throw new AppError('START_IN_PAST');
          if (occ.some((o) => blockedByException(o.startAt, o.endAt, r.professional.exceptions))) throw new AppError('PROFESSIONAL_UNAVAILABLE');

          const existing = await lockingOverlaps(tx, r.professionalId, occ[0].startAt, occ[occ.length - 1].endAt);
          const clash = occ.find((o) => existing.some((e) => rangesOverlap(o.startAt, o.endAt, new Date(e.startAt), new Date(e.endAt))));
          if (clash) throw new AppError('SCHEDULE_CONFLICT', { startAt: clash.startAt.toISOString() });

          await tx.bookingOccurrence.createMany({ data: occ.map((o) => ({ requestId: id, professionalId: r.professionalId, startAt: o.startAt, endAt: o.endAt })) });
          const res = await tx.careRequest.updateMany({ where: { id, status: 'ACCEPTED' }, data: { status: 'CONFIRMED', confirmedAt: new Date(), expiresAt: null } });
          if (res.count !== 1) throw new AppError('INVALID_TRANSITION', { action: 'confirm' });
          await this.event(tx, id, user.id, 'CUSTOMER', 'CONFIRMED', 'ACCEPTED', 'CONFIRMED');
          await this.notifications.notify(r.professional.userId, 'REQUEST_CONFIRMED', { requestId: id, name: user.name }, tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000, maxWait: 10_000 },
      ),
    );
    return this.detail(user, id);
  }

  async complete(user: AuthUser, id: string) {
    const { r: pre, role } = await this.participantRequest(user, id);
    if (role !== 'PROFESSIONAL') throw new AppError('INVALID_TRANSITION', { action: 'complete' });
    await withDeadlockRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          await lockProfessional(tx, pre.professionalId);
          await lockRequest(tx, id);
          const r = await tx.careRequest.findUniqueOrThrow({ where: { id } });
          if (!canTransition('complete', r.status, 'PROFESSIONAL')) throw new AppError('INVALID_TRANSITION', { from: r.status, action: 'complete' });
          if (r.endAt.getTime() > Date.now()) throw new AppError('TOO_EARLY_TO_COMPLETE');
          await tx.careRequest.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } });
          await this.event(tx, id, user.id, 'PROFESSIONAL', 'COMPLETED', 'CONFIRMED', 'COMPLETED');
          await this.notifications.notify(r.customerId, 'REQUEST_COMPLETED', { requestId: id }, tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 },
      ),
    );
    return this.detail(user, id);
  }

  async cancel(actor: { id: string; role: RequestActor }, id: string, reason: string) {
    const pre = await this.prisma.careRequest.findUnique({ where: { id }, include: { professional: { select: { userId: true } } } });
    if (!pre) throw new AppError('NOT_FOUND');
    if (actor.role !== 'ADMIN') {
      const role = pre.customerId === actor.id ? 'CUSTOMER' : pre.professional.userId === actor.id ? 'PROFESSIONAL' : null;
      if (!role) throw new AppError('NOT_FOUND');
      actor = { ...actor, role };
    }
    await withDeadlockRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          await lockProfessional(tx, pre.professionalId);
          await lockRequest(tx, id);
          const r = await tx.careRequest.findUniqueOrThrow({ where: { id } });
          if (!canTransition('cancel', r.status, actor.role)) throw new AppError('INVALID_TRANSITION', { from: r.status, action: 'cancel' });
          await tx.bookingOccurrence.updateMany({ where: { requestId: id, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
          await tx.careRequest.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason, expiresAt: null } });
          await this.event(tx, id, actor.id, actor.role, 'CANCELLED', r.status, 'CANCELLED', reason);
          const params = { requestId: id, by: actor.role };
          if (actor.role !== 'CUSTOMER') await this.notifications.notify(r.customerId, 'REQUEST_CANCELLED', params, tx);
          if (actor.role !== 'PROFESSIONAL') await this.notifications.notify(pre.professional.userId, 'REQUEST_CANCELLED', params, tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 },
      ),
    );
  }

  async addNote(user: AuthUser, id: string, body: string) {
    const { r, role } = await this.participantRequest(user, id);
    if (['DECLINED', 'CANCELLED', 'EXPIRED'].includes(r.status)) throw new AppError('INVALID_TRANSITION', { action: 'note' });
    const count = await this.prisma.requestNote.count({ where: { requestId: id } });
    if (count >= 100) throw new AppError('RATE_LIMITED');
    await this.prisma.requestNote.create({ data: { requestId: id, authorId: user.id, body } });
    const other = role === 'CUSTOMER' ? r.professional.userId : r.customerId;
    await this.notifications.notify(other, 'REQUEST_NOTE', { requestId: id });
    return this.detail(user, id);
  }

  /**
   * Expire ACCEPTED requests past their confirmation window, and SUBMITTED requests whose start has passed.
   * Idempotent; used by the scheduled job runner and lazily before reads/transitions.
   */
  async expireDue(scope: { requestId?: string; userId?: string; limit?: number } = {}) {
    const now = new Date();
    const scopeWhere: Prisma.CareRequestWhereInput = scope.requestId
      ? { id: scope.requestId }
      : scope.userId
        ? { OR: [{ customerId: scope.userId }, { professional: { userId: scope.userId } }] }
        : {};
    const due = await this.prisma.careRequest.findMany({
      where: { AND: [scopeWhere, { OR: [{ status: 'ACCEPTED', expiresAt: { lte: now } }, { status: { in: ['SUBMITTED', 'ACCEPTED'] }, startAt: { lte: now } }] }] },
      select: { id: true, status: true, customerId: true, professional: { select: { userId: true } } },
      take: scope.limit ?? 200,
    });
    let expired = 0;
    for (const r of due) {
      await this.prisma.$transaction(async (tx) => {
        const res = await tx.careRequest.updateMany({ where: { id: r.id, status: r.status }, data: { status: 'EXPIRED', expiresAt: null } });
        if (res.count !== 1) return;
        expired++;
        await this.event(tx, r.id, null, 'SYSTEM', 'EXPIRED', r.status, 'EXPIRED');
        await this.notifications.notify(r.customerId, 'REQUEST_EXPIRED', { requestId: r.id }, tx);
        await this.notifications.notify(r.professional.userId, 'REQUEST_EXPIRED', { requestId: r.id }, tx);
      });
    }
    return expired;
  }
}

@ApiTags('requests')
@Controller('requests')
@Auth()
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @Post()
  @RateLimit('create-request', 20, 3600)
  @ApiZodBody(createRequestSchema)
  create(@CurrentUser() u: AuthUser, @ZBody(createRequestSchema) b: z.output<typeof createRequestSchema>) {
    return this.service.create(u, b);
  }

  @Get()
  @ApiZodQuery(requestListQuerySchema)
  list(@CurrentUser() u: AuthUser, @ZQuery(requestListQuerySchema) q: z.output<typeof requestListQuerySchema>) {
    return this.service.list(u, q);
  }

  @Get('schedule')
  schedule(@CurrentUser() u: AuthUser) {
    return this.service.schedule(u);
  }

  @Get(':id')
  detail(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.detail(u, id);
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.accept(u, id);
  }

  @Post(':id/decline')
  @HttpCode(200)
  @ApiZodBody(transitionSchema)
  decline(@CurrentUser() u: AuthUser, @Param('id') id: string, @ZBody(transitionSchema) b: z.output<typeof transitionSchema>) {
    return this.service.decline(u, id, b.reason);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  confirm(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.confirm(u, id);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.service.complete(u, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiZodBody(cancelSchema)
  async cancel(@CurrentUser() u: AuthUser, @Param('id') id: string, @ZBody(cancelSchema) b: z.output<typeof cancelSchema>) {
    await this.service.cancel({ id: u.id, role: 'CUSTOMER' }, id, b.reason);
    return this.service.detail(u, id);
  }

  @Post(':id/notes')
  @HttpCode(200)
  @RateLimit('note', 60, 3600)
  @ApiZodBody(requestNoteSchema)
  note(@CurrentUser() u: AuthUser, @Param('id') id: string, @ZBody(requestNoteSchema) b: z.output<typeof requestNoteSchema>) {
    return this.service.addNote(u, id, b.body);
  }
}

@Module({ imports: [MediaModule], controllers: [RequestsController], providers: [RequestsService], exports: [RequestsService] })
export class RequestsModule {}
