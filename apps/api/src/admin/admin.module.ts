import { Body, Controller, Delete, Get, HttpCode, Injectable, Module, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  adminRejectSchema,
  adminNoteSchema,
  adminQualificationReviewSchema,
  adminReviewModerationSchema,
  adminSupportUpdateSchema,
  adminSuspendSchema,
  adminLocationSchema,
  cancelSchema,
  PROFILE_STATUSES,
  REQUEST_STATUSES,
  REVIEW_STATUSES,
  SUPPORT_STATUSES,
  type ReviewAdminDto,
} from '@carely/shared';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/app-error';
import { ApiZodBody, Auth, AuthUser, ClientIp, CurrentUser, paginate, ZBody } from '../common/http';
import { AuditService, NotificationsService } from '../notifications/notifications.module';
import { MediaModule } from '../media/media.module';
import { StorageService } from '../media/storage.service';
import { RequestsModule, RequestsService } from '../requests/requests.module';
import { ReviewsModule, ReviewsService } from '../reviews/reviews.module';
import { ratingTransaction } from '../reviews/rating';
import { TaxonomyModule, TaxonomyService, i18n, toAttributeDto } from '../taxonomy/taxonomy.module';
import { shortName } from '../professionals/professionals.module';

const PAGE = 25;
const pageOf = (p?: string) => Math.max(1, Math.min(1000, Number(p) || 1));
const oneOf = <T extends readonly string[]>(list: T, v?: string): T[number] | undefined => (list.includes(v as any) ? (v as T[number]) : undefined);

type Translations = z.output<typeof adminLocationSchema>['translations'];
const translationRows = (t: Translations) =>
  (['hy', 'ru', 'en'] as const).filter((l) => t[l].name).map((locale) => ({ locale, name: t[locale].name, description: t[locale].description ?? '' }));

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly taxonomy: TaxonomyService,
  ) {}

  async stats() {
    const [pending, approved, suspended, users, openInquiries, pendingReviews, pendingQualifications, activeRequests, newLeads, openLeads] = await Promise.all([
      this.prisma.professionalProfile.count({ where: { status: 'PENDING' } }),
      this.prisma.professionalProfile.count({ where: { status: 'APPROVED' } }),
      this.prisma.professionalProfile.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.user.count(),
      this.prisma.supportInquiry.count({ where: { status: 'OPEN' } }),
      this.prisma.review.count({ where: { status: 'PENDING' } }),
      this.prisma.qualification.count({ where: { status: 'PENDING', documents: { some: {} } } }),
      this.prisma.careRequest.count({ where: { status: { in: ['SUBMITTED', 'ACCEPTED', 'CONFIRMED'] } } }),
      this.prisma.careLead.count({ where: { status: 'NEW' } }),
      this.prisma.careLead.count({ where: { status: { in: ['NEW', 'IN_PROGRESS'] } } }),
    ]);
    return { pending, approved, suspended, users, openInquiries, pendingReviews, pendingQualifications, activeRequests, newLeads, openLeads };
  }

  async approve(adminId: string, id: string, ip: string | null) {
    const p = await this.prisma.professionalProfile.findUnique({
      where: { id },
      include: { offerings: { include: { service: true } }, qualifications: { where: { status: 'VERIFIED' } } },
    });
    if (!p) throw new AppError('NOT_FOUND');
    if (p.status !== 'PENDING') throw new AppError('INVALID_TRANSITION', { from: p.status, action: 'approve' });
    const missing = p.offerings.map((o) => o.service.requiredQualification).filter((k) => k && !p.qualifications.some((q) => q.kind === k));
    if (missing.length) throw new AppError('PROFILE_INCOMPLETE', { missing: [...new Set(missing)].join(',') });
    await this.prisma.$transaction(async (tx) => {
      await tx.professionalProfile.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date(), rejectionReason: null, suspendedAt: null } });
      await this.audit.record(adminId, 'PROFILE_APPROVED', 'ProfessionalProfile', id, undefined, ip, tx);
      await this.notifications.notify(p.userId, 'PROFILE_APPROVED', { slug: p.slug }, tx);
    });
  }

  async setProfileStatus(adminId: string, id: string, action: 'reject' | 'suspend' | 'reinstate', reason: string, ip: string | null) {
    const p = await this.prisma.professionalProfile.findUnique({ where: { id } });
    if (!p) throw new AppError('NOT_FOUND');
    const rules = {
      reject: { from: ['PENDING'], to: 'REJECTED', notify: 'PROFILE_REJECTED' },
      suspend: { from: ['APPROVED', 'PENDING'], to: 'SUSPENDED', notify: 'PROFILE_SUSPENDED' },
      reinstate: { from: ['SUSPENDED'], to: 'APPROVED', notify: 'PROFILE_APPROVED' },
    } as const;
    const rule = rules[action];
    if (!(rule.from as readonly string[]).includes(p.status)) throw new AppError('INVALID_TRANSITION', { from: p.status, action });
    await this.prisma.$transaction(async (tx) => {
      await tx.professionalProfile.update({
        where: { id },
        data: {
          status: rule.to,
          rejectionReason: action === 'reject' ? reason : action === 'reinstate' ? null : p.rejectionReason,
          suspendedAt: action === 'suspend' ? new Date() : null,
          approvedAt: action === 'reinstate' ? new Date() : p.approvedAt,
        },
      });
      await this.audit.record(adminId, `PROFILE_${rule.to}`, 'ProfessionalProfile', id, { reason }, ip, tx);
      await this.notifications.notify(p.userId, rule.notify, { reason, slug: p.slug }, tx);
    });
  }
}

@ApiTags('admin')
@Controller('admin')
@Auth('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly service: AdminService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly requests: RequestsService,
    private readonly reviews: ReviewsService,
    private readonly taxonomy: TaxonomyService,
  ) {}

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  // ───────── Professionals ─────────
  @Get('professionals')
  async professionals(@Query('status') status?: string, @Query('page') page?: string, @Query('q') q?: string) {
    const p = pageOf(page);
    const where: Prisma.ProfessionalProfileWhereInput = {};
    const st = oneOf(PROFILE_STATUSES, status);
    if (st) where.status = st;
    if (q) where.OR = [{ displayName: { contains: q } }, { user: { email: { contains: q } } }, { slug: { contains: q } }];
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.professionalProfile.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
        skip: (p - 1) * PAGE,
        take: PAGE,
        include: {
          user: { select: { email: true, status: true } },
          category: { include: { translations: true } },
          _count: { select: { qualifications: true } },
        },
      }),
      this.prisma.professionalProfile.count({ where }),
    ]);
    return paginate(
      rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        displayName: r.displayName,
        email: r.user.email,
        userStatus: r.user.status,
        status: r.status,
        category: i18n(r.category?.translations),
        submittedAt: r.submittedAt?.toISOString() ?? null,
        qualificationCount: r._count.qualifications,
        isDemo: r.isDemo,
      })),
      total,
      p,
      PAGE,
    );
  }

  @Get('professionals/:id')
  async professional(@Param('id') id: string) {
    const p = await this.prisma.professionalProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, phone: true, name: true, status: true, createdAt: true } },
        translations: true,
        category: { include: { translations: true } },
        homeLocation: { include: { translations: true } },
        serviceAreas: { include: { location: { include: { translations: true } } } },
        offerings: { include: { service: { include: { translations: true } } } },
        attributes: { include: { attribute: { include: { translations: true } } } },
        languages: true,
        rules: { orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] },
        qualifications: { include: { documents: true }, orderBy: { createdAt: 'asc' } },
        portrait: true,
      },
    });
    if (!p) throw new AppError('NOT_FOUND');
    return {
      id: p.id,
      slug: p.slug,
      status: p.status,
      displayName: p.displayName,
      originalLocale: p.originalLocale,
      rejectionReason: p.rejectionReason,
      adminNote: p.adminNote,
      submittedAt: p.submittedAt?.toISOString() ?? null,
      approvedAt: p.approvedAt?.toISOString() ?? null,
      isDemo: p.isDemo,
      user: { ...p.user, createdAt: p.user.createdAt.toISOString() },
      portraitUrl: p.portrait ? this.storage.publicUrl(p.portrait.storageKey) : null,
      translations: p.translations,
      category: i18n(p.category?.translations),
      homeLocation: i18n(p.homeLocation?.translations),
      serviceAreas: p.serviceAreas.map((a) => i18n(a.location.translations)),
      offerings: p.offerings.map((o) => ({
        service: i18n(o.service.translations),
        requiredQualification: o.service.requiredQualification,
        priceKind: o.priceKind,
        priceAmount: o.priceAmount,
        priceUnit: o.priceUnit,
      })),
      attributes: p.attributes.map((a) => i18n(a.attribute.translations)),
      languages: p.languages.map((l) => l.code),
      experienceYears: p.experienceYears,
      experienceSummary: p.experienceSummary,
      birthYear: p.birthYear,
      educationLevel: p.educationLevel,
      availableFrom: p.availableFrom?.toISOString().slice(0, 10) ?? null,
      rules: p.rules,
      qualifications: p.qualifications.map((q) => ({
        id: q.id,
        kind: q.kind,
        title: q.title,
        issuer: q.issuer,
        issuedYear: q.issuedYear,
        status: q.status,
        internalNote: q.internalNote,
        rejectionReason: q.rejectionReason,
        verifiedAt: q.verifiedAt?.toISOString() ?? null,
        reviewedAt: q.reviewedAt?.toISOString() ?? null,
        documents: q.documents.map((d) => ({ id: d.id, originalName: d.originalName, mimeType: d.mimeType, size: d.size, createdAt: d.createdAt.toISOString() })),
      })),
    };
  }

  @Post('professionals/:id/approve')
  @HttpCode(200)
  async approve(@CurrentUser() a: AuthUser, @Param('id') id: string, @ClientIp() ip: string | null) {
    await this.service.approve(a.id, id, ip);
    return { ok: true };
  }

  @Post('professionals/:id/reject')
  @HttpCode(200)
  @ApiZodBody(adminRejectSchema)
  async reject(@CurrentUser() a: AuthUser, @Param('id') id: string, @ZBody(adminRejectSchema) b: z.output<typeof adminRejectSchema>, @ClientIp() ip: string | null) {
    await this.service.setProfileStatus(a.id, id, 'reject', b.reason, ip);
    return { ok: true };
  }

  @Post('professionals/:id/suspend')
  @HttpCode(200)
  @ApiZodBody(adminRejectSchema)
  async suspend(@CurrentUser() a: AuthUser, @Param('id') id: string, @ZBody(adminRejectSchema) b: z.output<typeof adminRejectSchema>, @ClientIp() ip: string | null) {
    await this.service.setProfileStatus(a.id, id, 'suspend', b.reason, ip);
    return { ok: true };
  }

  @Post('professionals/:id/reinstate')
  @HttpCode(200)
  async reinstate(@CurrentUser() a: AuthUser, @Param('id') id: string, @ClientIp() ip: string | null) {
    await this.service.setProfileStatus(a.id, id, 'reinstate', '', ip);
    return { ok: true };
  }

  @Put('professionals/:id/note')
  @ApiZodBody(adminNoteSchema)
  async note(@CurrentUser() a: AuthUser, @Param('id') id: string, @ZBody(adminNoteSchema) b: z.output<typeof adminNoteSchema>, @ClientIp() ip: string | null) {
    await this.prisma.professionalProfile.update({ where: { id }, data: { adminNote: b.note || null } });
    await this.audit.record(a.id, 'PROFILE_NOTE_UPDATED', 'ProfessionalProfile', id, undefined, ip);
    return { ok: true };
  }

  @Post('qualifications/:id/review')
  @HttpCode(200)
  @ApiZodBody(adminQualificationReviewSchema)
  async reviewQualification(@CurrentUser() a: AuthUser, @Param('id') id: string, @ZBody(adminQualificationReviewSchema) b: z.output<typeof adminQualificationReviewSchema>, @ClientIp() ip: string | null) {
    const q = await this.prisma.qualification.findUnique({ where: { id }, include: { profile: { select: { userId: true } } } });
    if (!q) throw new AppError('NOT_FOUND');
    if (b.status === 'REJECTED' && !b.rejectionReason) throw new AppError('VALIDATION_FAILED', undefined, { rejectionReason: ['required'] });
    await this.prisma.$transaction(async (tx) => {
      await tx.qualification.update({
        where: { id },
        data: {
          status: b.status,
          internalNote: b.internalNote || q.internalNote,
          rejectionReason: b.status === 'REJECTED' ? b.rejectionReason : null,
          verifiedAt: b.status === 'VERIFIED' ? new Date() : null,
          verifiedById: b.status === 'VERIFIED' ? a.id : null,
          reviewedAt: new Date(),
        },
      });
      await this.audit.record(a.id, `QUALIFICATION_${b.status}`, 'Qualification', id, { kind: q.kind }, ip, tx);
      if (b.status !== 'PENDING') {
        await this.notifications.notify(q.profile.userId, b.status === 'VERIFIED' ? 'QUALIFICATION_VERIFIED' : 'QUALIFICATION_REJECTED', { title: q.title, reason: b.rejectionReason }, tx);
      }
    });
    return { ok: true };
  }

  /** Private document access: admin only, every view audited, never cached. */
  @Get('documents/:id')
  async document(@CurrentUser() a: AuthUser, @Param('id') id: string, @Res() res: Response, @ClientIp() ip: string | null) {
    const doc = await this.prisma.privateDocument.findUnique({ where: { id } });
    if (!doc) throw new AppError('NOT_FOUND');
    await this.audit.record(a.id, 'DOCUMENT_VIEWED', 'PrivateDocument', id, { qualificationId: doc.qualificationId }, ip);
    const stream = await this.storage.get('private', doc.storageKey);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="document.${doc.mimeType === 'application/pdf' ? 'pdf' : doc.mimeType.split('/')[1]}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
    stream.pipe(res);
  }

  // ───────── Users ─────────
  @Get('users')
  async users(@Query('q') q?: string, @Query('page') page?: string) {
    const p = pageOf(page);
    const where: Prisma.UserWhereInput = q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }, { phone: { contains: q } }] } : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (p - 1) * PAGE,
        take: PAGE,
        select: { id: true, email: true, name: true, phone: true, status: true, isAdmin: true, createdAt: true, isDemo: true, professional: { select: { id: true, status: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(
      rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
      total,
      p,
      PAGE,
    );
  }

  @Post('users/:id/suspend')
  @HttpCode(200)
  @ApiZodBody(adminSuspendSchema)
  async suspendUser(@CurrentUser() a: AuthUser, @Param('id') id: string, @ZBody(adminSuspendSchema) b: z.output<typeof adminSuspendSchema>, @ClientIp() ip: string | null) {
    if (id === a.id) throw new AppError('FORBIDDEN');
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new AppError('NOT_FOUND');
    if (u.isAdmin) throw new AppError('FORBIDDEN');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status: b.suspended ? 'SUSPENDED' : 'ACTIVE', suspendedAt: b.suspended ? new Date() : null } });
      if (b.suspended) await tx.session.deleteMany({ where: { userId: id } });
      await this.audit.record(a.id, b.suspended ? 'USER_SUSPENDED' : 'USER_REINSTATED', 'User', id, { reason: b.reason }, ip, tx);
    });
    return { ok: true };
  }

  // ───────── Requests ─────────
  @Get('requests')
  async requestList(@Query('status') status?: string, @Query('q') q?: string, @Query('page') page?: string) {
    const p = pageOf(page);
    const where: Prisma.CareRequestWhereInput = {};
    const st = oneOf(REQUEST_STATUSES, status);
    if (st) where.status = st;
    if (q) where.OR = [{ id: q }, { customer: { email: { contains: q } } }, { professional: { slug: { contains: q } } }, { professional: { displayName: { contains: q } } }];
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.careRequest.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (p - 1) * PAGE,
        take: PAGE,
        select: {
          id: true,
          status: true,
          startAt: true,
          createdAt: true,
          isDemo: true,
          customer: { select: { name: true, email: true } },
          professional: { select: { displayName: true, slug: true } },
          service: { include: { translations: true } },
        },
      }),
      this.prisma.careRequest.count({ where }),
    ]);
    return paginate(
      rows.map((r) => ({ ...r, startAt: r.startAt.toISOString(), createdAt: r.createdAt.toISOString(), service: i18n(r.service.translations) })),
      total,
      p,
      PAGE,
    );
  }

  @Get('requests/:id')
  async requestDetail(@CurrentUser() a: AuthUser, @Param('id') id: string, @ClientIp() ip: string | null) {
    const r = await this.requests.load(id);
    if (!r) throw new AppError('NOT_FOUND');
    await this.audit.record(a.id, 'REQUEST_VIEWED', 'CareRequest', id, undefined, ip);
    return { ...this.requests.toDetail(r, 'CUSTOMER', 'ADMIN'), customer: { name: r.customer.name, email: r.customer.email }, professional: { displayName: r.professional.displayName, slug: r.professional.slug } };
  }

  @Post('requests/:id/cancel')
  @HttpCode(200)
  @ApiZodBody(cancelSchema)
  async cancelRequest(@CurrentUser() a: AuthUser, @Param('id') id: string, @ZBody(cancelSchema) b: z.output<typeof cancelSchema>, @ClientIp() ip: string | null) {
    await this.requests.cancel({ id: a.id, role: 'ADMIN' }, id, b.reason);
    await this.audit.record(a.id, 'REQUEST_CANCELLED', 'CareRequest', id, { reason: b.reason }, ip);
    return { ok: true };
  }

  // ───────── Reviews ─────────
  @Get('reviews')
  async reviewList(@Query('status') status?: string, @Query('page') page?: string, @Query('low') low?: string) {
    const p = pageOf(page);
    const st = oneOf(REVIEW_STATUSES, status) ?? 'PENDING';
    // low=1 → only ratings below 5, so admins can follow up with those customers first.
    const where: Prisma.ReviewWhereInput = { status: st, ...(low === '1' ? { rating: { lt: 5 } } : {}) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (p - 1) * PAGE,
        take: PAGE,
        include: {
          customer: { select: { id: true, name: true } },
          profile: { select: { slug: true, displayName: true } },
          request: { select: { service: { include: { translations: true } } } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return paginate(
      rows.map(
        (r): ReviewAdminDto => ({
          id: r.id,
          rating: r.rating,
          body: r.body,
          locale: r.locale,
          authorName: shortName(r.customer.name),
          serviceName: i18n(r.request.service.translations),
          createdAt: r.createdAt.toISOString(),
          isDemo: r.isDemo,
          status: r.status,
          contactPhone: r.contactPhone,
          professional: r.profile,
          customer: r.customer,
        }),
      ),
      total,
      p,
      PAGE,
    );
  }

  @Post('reviews/:id/moderate')
  @HttpCode(200)
  @ApiZodBody(adminReviewModerationSchema)
  async moderate(@CurrentUser() a: AuthUser, @Param('id') id: string, @ZBody(adminReviewModerationSchema) b: z.output<typeof adminReviewModerationSchema>, @ClientIp() ip: string | null) {
    await ratingTransaction(this.prisma, async (tx) => {
      await this.reviews.moderate(id, b.status, a.id, b.note, tx);
      await this.audit.record(a.id, `REVIEW_${b.status}`, 'Review', id, { note: b.note }, ip, tx);
    });
    return { ok: true };
  }

  // ───────── Support ─────────
  @Get('inquiries')
  async inquiries(@Query('status') status?: string, @Query('page') page?: string) {
    const p = pageOf(page);
    const st = oneOf(SUPPORT_STATUSES, status);
    const where = st ? { status: st } : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supportInquiry.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (p - 1) * PAGE, take: PAGE }),
      this.prisma.supportInquiry.count({ where }),
    ]);
    return paginate(
      rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })),
      total,
      p,
      PAGE,
    );
  }

  @Patch('inquiries/:id')
  @ApiZodBody(adminSupportUpdateSchema)
  async updateInquiry(@CurrentUser() a: AuthUser, @Param('id') id: string, @ZBody(adminSupportUpdateSchema) b: z.output<typeof adminSupportUpdateSchema>, @ClientIp() ip: string | null) {
    await this.prisma.supportInquiry.update({ where: { id }, data: { status: b.status, adminNote: b.adminNote || null } });
    await this.audit.record(a.id, `INQUIRY_${b.status}`, 'SupportInquiry', id, undefined, ip);
    return { ok: true };
  }

  // ───────── Taxonomy (read-only) ─────────
  /**
   * Categories, services and facets are code-managed (packages/shared/src/taxonomy) and synced by `npm run db:seed`.
   * Admins see them with usage counts; inactive rows are slugs removed from the code that still have history.
   */
  @Get('taxonomy')
  async taxonomyAll() {
    const [categories, attributes] = await Promise.all([
      this.prisma.category.findMany({
        orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { slug: 'asc' }],
        include: {
          translations: true,
          _count: { select: { profiles: true } },
          services: { orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }], include: { translations: true, _count: { select: { offerings: true, requests: true } } } },
        },
      }),
      this.prisma.careAttribute.findMany({
        orderBy: [{ active: 'desc' }, { group: 'asc' }, { sortOrder: 'asc' }],
        include: { translations: true, _count: { select: { profiles: true } } },
      }),
    ]);
    return {
      categories,
      attributes: attributes.map((a) => ({ ...toAttributeDto(a), active: a.active, translations: a.translations, _count: a._count })),
    };
  }

  private async upsertTranslations(id: string, t: Translations, tx: Prisma.TransactionClient) {
    await tx.locationTranslation.deleteMany({ where: { locationId: id } });
    await tx.locationTranslation.createMany({ data: translationRows(t).map((r) => ({ ...r, locationId: id })) });
  }

  /** Deletion is allowed only for unreferenced locations; otherwise deactivate. */
  @Delete('locations/:id')
  async removeLocation(@CurrentUser() a: AuthUser, @Param('id') id: string, @ClientIp() ip: string | null) {
    try {
      const l = await this.prisma.location.findUnique({ where: { id }, include: { _count: { select: { children: true, serviceAreas: true, homeOfProfiles: true, requests: true } } } });
      if (!l) throw new AppError('NOT_FOUND');
      if (l._count.children || l._count.serviceAreas || l._count.homeOfProfiles || l._count.requests) throw new AppError('IN_USE');
      await this.prisma.location.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2003' || e.code === 'P2014')) throw new AppError('IN_USE');
      throw e;
    }
    await this.audit.record(a.id, 'LOCATIONS_DELETED', 'locations', id, undefined, ip);
    this.taxonomy.invalidate();
    return { ok: true };
  }

  // ───────── Locations ─────────
  @Get('locations')
  async locations() {
    return this.prisma.location.findMany({
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
      include: { translations: true, _count: { select: { children: true, serviceAreas: true, requests: true } } },
    });
  }

  @Post('locations')
  @ApiZodBody(adminLocationSchema)
  async createLocation(@CurrentUser() a: AuthUser, @ZBody(adminLocationSchema) b: z.output<typeof adminLocationSchema>, @ClientIp() ip: string | null) {
    if (b.type !== 'REGION' && !b.parentId) throw new AppError('VALIDATION_FAILED', undefined, { parentId: ['required'] });
    const row = await this.prisma.$transaction(async (tx) => {
      const l = await tx.location.create({ data: { slug: b.slug, type: b.type, parentId: b.parentId ?? null, sortOrder: b.sortOrder, active: b.active } });
      await this.upsertTranslations(l.id, b.translations, tx);
      await this.audit.record(a.id, 'LOCATION_CREATED', 'Location', l.id, { slug: b.slug }, ip, tx);
      return l;
    });
    this.taxonomy.invalidate();
    return row;
  }

  @Put('locations/:id')
  @ApiZodBody(adminLocationSchema)
  async updateLocation(@CurrentUser() a: AuthUser, @Param('id') id: string, @ZBody(adminLocationSchema) b: z.output<typeof adminLocationSchema>, @ClientIp() ip: string | null) {
    if (b.parentId === id) throw new AppError('VALIDATION_FAILED', undefined, { parentId: ['invalid'] });
    await this.prisma.$transaction(async (tx) => {
      await tx.location.update({ where: { id }, data: { slug: b.slug, type: b.type, parentId: b.parentId ?? null, sortOrder: b.sortOrder, active: b.active } });
      await this.upsertTranslations(id, b.translations, tx);
      await this.audit.record(a.id, 'LOCATION_UPDATED', 'Location', id, { slug: b.slug }, ip, tx);
    });
    this.taxonomy.invalidate();
    return { ok: true };
  }

  // ───────── Audit ─────────
  @Get('audit')
  async auditLog(@Query('page') page?: string) {
    const p = pageOf(page);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (p - 1) * PAGE, take: PAGE, include: { actor: { select: { email: true } } } }),
      this.prisma.auditLog.count(),
    ]);
    return paginate(
      rows.map((r) => ({ id: r.id, action: r.action, entityType: r.entityType, entityId: r.entityId, actor: r.actor?.email ?? null, meta: r.meta, createdAt: r.createdAt.toISOString() })),
      total,
      p,
      PAGE,
    );
  }
}

@Module({ imports: [MediaModule, RequestsModule, ReviewsModule, TaxonomyModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
