import { Controller, Get, Injectable, Module, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { adminLeadListQuerySchema, adminLeadUpdateSchema, createLeadSchema, findCategory, type LeadAdminDto, type LeadStatus } from '@carely/shared';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/app-error';
import { ApiZodBody, ApiZodQuery, Auth, AuthUser, ClientIp, CurrentUser, paginate, RateLimit, ZBody, ZQuery } from '../common/http';
import { AuditService } from '../notifications/notifications.module';
import { PUBLIC_PROFILE } from '../professionals/professionals.module';
import { i18n } from '../taxonomy/taxonomy.module';
import { env } from '../config/env';
import { TelegramService } from './telegram.service';

const PAGE = 30;
const CLOSED: LeadStatus[] = ['CLOSED', 'CANCELLED'];

const leadInclude = {
  user: { select: { id: true, email: true } },
  requestedProfessional: { select: { id: true, slug: true, displayName: true } },
  professional: { select: { id: true, slug: true, displayName: true, user: { select: { phone: true } } } },
  category: { include: { translations: true } },
  service: { include: { translations: true } },
  location: { include: { translations: true } },
  handledBy: { select: { name: true } },
} satisfies Prisma.CareLeadInclude;
type LeadRow = Prisma.CareLeadGetPayload<{ include: typeof leadInclude }>;

/** DATE columns come back as UTC midnight. */
const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const period = (a: Date | null, b: Date | null) => (a || b ? `${ymd(a) ?? '…'} – ${ymd(b) ?? '…'}` : null);

/** Armenian label for Telegram alerts (the team works in Armenian). */
const hy = (rows: { locale: string; name: string }[] | undefined) => rows?.find((r) => r.locale === 'hy')?.name ?? rows?.[0]?.name ?? null;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly telegram: TelegramService,
  ) {}

  /**
   * Stores a request for the Carely team. The professional (if any) is only recorded — never notified and never shown
   * the lead. Name and phone are required; everything else helps the team prepare the call.
   */
  async create(user: AuthUser | undefined, input: z.output<typeof createLeadSchema>): Promise<{ stored: true; id: string | null }> {
    // Bots fill every field; pretend success without storing anything.
    if (input.website) return { stored: true, id: null };

    let pro: { id: string; userId: string; categoryId: string | null; displayName: string; offerings: { serviceId: string }[] } | null = null;
    if (input.professionalSlug) {
      pro = await this.prisma.professionalProfile.findFirst({
        where: { slug: input.professionalSlug, ...PUBLIC_PROFILE },
        select: { id: true, userId: true, categoryId: true, displayName: true, offerings: { select: { serviceId: true } } },
      });
      if (!pro) throw new AppError('NOT_FOUND');
      if (user && pro.userId === user.id) throw new AppError('SELF_REQUEST');
    }

    let categoryId: string | null = pro?.categoryId ?? null;
    if (!pro && input.categorySlug) {
      if (!findCategory(input.categorySlug)) throw new AppError('VALIDATION_FAILED', undefined, { categorySlug: ['invalid'] });
      categoryId = (await this.prisma.category.findFirst({ where: { slug: input.categorySlug, active: true }, select: { id: true } }))?.id ?? null;
    }

    let serviceId: string | null = null;
    if (input.serviceId) {
      const svc = await this.prisma.service.findFirst({ where: { id: input.serviceId, active: true }, select: { id: true, categoryId: true } });
      const offered = !pro || pro.offerings.some((o) => o.serviceId === input.serviceId);
      if (!svc || !offered || (categoryId && svc.categoryId !== categoryId)) throw new AppError('VALIDATION_FAILED', undefined, { serviceId: ['invalid'] });
      serviceId = svc.id;
      categoryId = svc.categoryId;
    }

    let locationId: string | null = null;
    if (input.locationId) {
      const loc = await this.prisma.location.findFirst({ where: { id: input.locationId, active: true }, select: { id: true } });
      if (!loc) throw new AppError('VALIDATION_FAILED', undefined, { locationId: ['invalid'] });
      locationId = loc.id;
    }

    const lead = await this.prisma.careLead.create({
      data: {
        source: pro ? 'PROFILE' : 'GENERAL',
        name: input.name,
        phone: input.phone,
        userId: user?.id ?? null,
        requestedProfessionalId: pro?.id ?? null,
        professionalId: pro?.id ?? null,
        categoryId,
        serviceId,
        locationId,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        schedule: input.schedule,
        message: input.message,
        locale: input.locale,
      },
      include: leadInclude,
    });
    void this.alert(lead);
    return { stored: true, id: lead.id };
  }

  /** Fire-and-forget team alert; exposed for tests. */
  alert(l: LeadRow) {
    return this.telegram.send(
      `Նոր հայտ · ${l.id.slice(-6).toUpperCase()}`,
      [
        ['Անուն', l.name],
        ['Հեռախոս', l.phone],
        ['Մասնագետ', l.requestedProfessional ? `${l.requestedProfessional.displayName} (${l.requestedProfessional.slug})` : 'Ընդհանուր հայտ'],
        ['Կատեգորիա', hy(l.category?.translations)],
        ['Ծառայություն', hy(l.service?.translations)],
        ['Վայր', hy(l.location?.translations)],
        ['Ժամկետ', period(l.startDate, l.endDate)],
        ['Օրեր և ժամեր', l.schedule],
        ['Մեկնաբանություն', l.message],
      ],
      `${env.APP_ORIGIN}/hy/admin/leads/${l.id}`,
    );
  }

  toDto(l: LeadRow): LeadAdminDto {
    return {
      id: l.id,
      status: l.status,
      source: l.source,
      name: l.name,
      phone: l.phone,
      user: l.user,
      requestedProfessional: l.requestedProfessional,
      professional: l.professional ? { id: l.professional.id, slug: l.professional.slug, displayName: l.professional.displayName, phone: l.professional.user.phone } : null,
      category: l.category ? i18n(l.category.translations) : null,
      service: l.service ? i18n(l.service.translations) : null,
      location: l.location ? i18n(l.location.translations) : null,
      startDate: ymd(l.startDate),
      endDate: ymd(l.endDate),
      schedule: l.schedule,
      message: l.message,
      locale: l.locale,
      adminNote: l.adminNote,
      handledBy: l.handledBy?.name ?? null,
      closedAt: l.closedAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    };
  }

  async list(q: z.output<typeof adminLeadListQuerySchema>) {
    const where: Prisma.CareLeadWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.q) {
      const digits = q.q.replace(/\D/g, '');
      where.OR = [
        { id: q.q },
        { name: { contains: q.q } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits.slice(-8) } }] : []),
        { requestedProfessional: { displayName: { contains: q.q } } },
        { professional: { displayName: { contains: q.q } } },
      ];
    }
    const [rows, total, open] = await this.prisma.$transaction([
      this.prisma.careLead.findMany({ where, include: leadInclude, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (q.page - 1) * PAGE, take: PAGE }),
      this.prisma.careLead.count({ where }),
      this.prisma.careLead.count({ where: { status: 'NEW' } }),
    ]);
    return { ...paginate(rows.map((r) => this.toDto(r)), total, q.page, PAGE), newCount: open };
  }

  async detail(id: string) {
    const l = await this.prisma.careLead.findUnique({ where: { id }, include: leadInclude });
    if (!l) throw new AppError('NOT_FOUND');
    return this.toDto(l);
  }

  async update(admin: AuthUser, id: string, b: z.output<typeof adminLeadUpdateSchema>, ip: string | null) {
    const cur = await this.prisma.careLead.findUnique({ where: { id }, select: { status: true, professionalId: true } });
    if (!cur) throw new AppError('NOT_FOUND');
    if (b.professionalId) {
      // Any approved, active profile may be introduced — the team may pick someone other than the requested one.
      const ok = await this.prisma.professionalProfile.count({ where: { id: b.professionalId, ...PUBLIC_PROFILE } });
      if (!ok) throw new AppError('VALIDATION_FAILED', undefined, { professionalId: ['invalid'] });
    }
    const data: Prisma.CareLeadUncheckedUpdateInput = { handledById: admin.id };
    if (b.status) {
      data.status = b.status;
      data.closedAt = CLOSED.includes(b.status) ? new Date() : null;
    }
    if (b.professionalId !== undefined) data.professionalId = b.professionalId;
    if (b.adminNote !== undefined) data.adminNote = b.adminNote || null;
    await this.prisma.$transaction(async (tx) => {
      await tx.careLead.update({ where: { id }, data });
      await this.audit.record(
        admin.id,
        b.status && b.status !== cur.status ? `LEAD_${b.status}` : 'LEAD_UPDATED',
        'CareLead',
        id,
        { from: cur.status, to: b.status ?? cur.status, ...(b.professionalId !== undefined ? { professionalId: b.professionalId } : {}) },
        ip,
        tx,
      );
    });
    return this.detail(id);
  }
}

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  /** Public: no account needed. Signed-in clients are linked to the lead. */
  @Post()
  @RateLimit('lead', 8, 3600)
  @ApiZodBody(createLeadSchema)
  create(@CurrentUser() user: AuthUser | undefined, @ZBody(createLeadSchema) b: z.output<typeof createLeadSchema>) {
    return this.service.create(user, b);
  }
}

@ApiTags('admin')
@Controller('admin/leads')
@Auth('admin')
export class AdminLeadsController {
  constructor(private readonly service: LeadsService) {}

  @Get()
  @ApiZodQuery(adminLeadListQuerySchema)
  list(@ZQuery(adminLeadListQuerySchema) q: z.output<typeof adminLeadListQuerySchema>) {
    return this.service.list(q);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Patch(':id')
  @ApiZodBody(adminLeadUpdateSchema)
  update(@CurrentUser() a: AuthUser, @Param('id') id: string, @ZBody(adminLeadUpdateSchema) b: z.output<typeof adminLeadUpdateSchema>, @ClientIp() ip: string | null) {
    return this.service.update(a, id, b, ip);
  }
}

@Module({ controllers: [LeadsController, AdminLeadsController], providers: [LeadsService, TelegramService], exports: [LeadsService, TelegramService] })
export class LeadsModule {}
