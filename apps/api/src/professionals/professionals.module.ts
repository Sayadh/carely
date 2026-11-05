import { Controller, Delete, Get, Injectable, Module, Param, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import {
  EDUCATION_LEVELS,
  LOCALES,
  addDays,
  findFacet,
  searchQuerySchema,
  timeToMinutes,
  utcToZonedDate,
  zonedToUtc,
  type AttributeGroup,
  type Locale,
  type ProfessionalProfileDto,
  type SearchQuery,
  type ReviewDto,
} from '@carely/shared';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/app-error';
import { ApiZodQuery, Auth, AuthUser, CurrentUser, paginate, ZQuery } from '../common/http';
import { TaxonomyModule, TaxonomyService, i18n, toAttributeDto } from '../taxonomy/taxonomy.module';
import { MediaModule } from '../media/media.module';
import { StorageService } from '../media/storage.service';
import { cardInclude, pickText, toCard } from './mappers';
import { freeMinutesOnDate, isFreeDuring } from './availability';

const CANDIDATE_CAP = 1000;
const asLocale = (v?: string): Locale => (LOCALES.includes(v as Locale) ? (v as Locale) : 'hy');

/** Only approved profiles of active accounts are ever public. */
export const PUBLIC_PROFILE: Prisma.ProfessionalProfileWhereInput = { status: 'APPROVED', user: { status: 'ACTIVE' } };

/** Current year in Armenia (ages are approximate: birth year only). */
const currentYear = () => Number(utcToZonedDate(new Date()).slice(0, 4));

/** Ratings are displayed with 2 decimals; filter on the displayed value so "4+" includes 3.996 → 4.00. */
const RATING_DISPLAY_TOLERANCE = 0.005;

export function shortName(name: string) {
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
}

@Injectable()
export class ProfessionalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxonomy: TaxonomyService,
    private readonly storage: StorageService,
  ) {}

  private async buildWhere(q: SearchQuery): Promise<Prisma.ProfessionalProfileWhereInput | null> {
    const and: Prisma.ProfessionalProfileWhereInput[] = [PUBLIC_PROFILE];
    const cats = await this.taxonomy.categories();
    if (q.category) {
      const cat = cats.find((c) => c.slug === q.category);
      if (!cat) return null;
      and.push({ categoryId: cat.id });
    }
    if (q.location) {
      const fam = await this.taxonomy.locationFamily(q.location);
      if (!fam) return null;
      and.push({ serviceAreas: { some: { locationId: { in: fam.ids } } } });
    }
    const unit = q.priceUnit ?? (q.priceMin != null || q.priceMax != null ? 'HOUR' : undefined);
    const hasPriceRange = q.priceKind !== 'NEGOTIABLE' && (q.priceMin != null || q.priceMax != null);
    if (q.service || unit || q.priceKind || hasPriceRange) {
      const offering: Prisma.ProfessionalServiceWhereInput = {};
      if (q.service) offering.service = { slug: q.service };
      if (unit && q.priceKind !== 'NEGOTIABLE') offering.priceUnit = unit;
      if (q.priceKind) offering.priceKind = q.priceKind;
      if (hasPriceRange) {
        offering.priceKind = 'FIXED';
        offering.priceAmount = { gte: q.priceMin ?? undefined, lte: q.priceMax ?? undefined };
      }
      and.push({ offerings: { some: offering } });
    }
    if (q.experienceMin) and.push({ experienceYears: { gte: q.experienceMin } });
    if (q.ageMin != null || q.ageMax != null) {
      const year = currentYear();
      and.push({ birthYear: { gte: q.ageMax != null ? year - q.ageMax : undefined, lte: q.ageMin != null ? year - q.ageMin : undefined } });
    }
    if (q.educationMin) and.push({ educationLevel: { in: EDUCATION_LEVELS.slice(EDUCATION_LEVELS.indexOf(q.educationMin)) } });
    if (q.ratingMin != null) and.push({ ratingCount: { gt: 0 }, ratingValue: { gte: q.ratingMin - RATING_DISPLAY_TOLERANCE } });
    if (q.startBy) and.push({ OR: [{ availableFrom: null }, { availableFrom: { lte: new Date(q.startBy) } }] });
    for (const code of q.languages) and.push({ languages: { some: { code } } });
    // Facets: OR inside a group ("hourly or part-time"), AND across groups (schedule AND place).
    const byGroup = new Map<AttributeGroup | 'unknown', string[]>();
    for (const slug of q.attributes) {
      const group = findFacet(slug)?.group ?? 'unknown';
      byGroup.set(group, [...(byGroup.get(group) ?? []), slug]);
    }
    for (const slugs of byGroup.values()) and.push({ attributes: { some: { attribute: { slug: { in: slugs }, active: true } } } });
    for (const kind of q.verified) and.push({ qualifications: { some: { kind, status: 'VERIFIED' } } });
    if (q.date) {
      const wd = ((new Date(q.date + 'T00:00:00Z').getUTCDay() + 6) % 7) + 1;
      and.push({ OR: [{ rules: { some: { weekday: wd } } }, { exceptions: { some: { date: new Date(q.date), available: true } } }] });
    }
    return { AND: and };
  }

  /** Bounded candidate list with the data needed for filtering by date and like-for-like price sorting. */
  private async candidates(q: SearchQuery) {
    const where = await this.buildWhere(q);
    if (!where) return [];
    const unit = q.priceUnit ?? 'HOUR';
    const rows = await this.prisma.professionalProfile.findMany({
      where,
      select: {
        id: true,
        experienceYears: true,
        totalReviewCount: true,
        approvedAt: true,
        offerings: { where: { priceUnit: unit, priceKind: 'FIXED', ...(q.service ? { service: { slug: q.service } } : {}) }, select: { priceAmount: true } },
      },
      orderBy: { id: 'asc' },
      take: CANDIDATE_CAP,
    });
    let list = rows.map((r) => ({
      id: r.id,
      experienceYears: r.experienceYears,
      totalReviewCount: r.totalReviewCount,
      price: r.offerings.length ? Math.min(...r.offerings.map((o) => o.priceAmount ?? Infinity)) : null,
    }));

    if (q.date && list.length) {
      const ids = list.map((r) => r.id);
      const dayStart = zonedToUtc(q.date, 0);
      const dayEnd = zonedToUtc(addDays(q.date, 1), 0);
      const [rules, exceptions, bookings] = await Promise.all([
        this.prisma.availabilityRule.findMany({ where: { profileId: { in: ids } } }),
        this.prisma.availabilityException.findMany({ where: { profileId: { in: ids }, date: new Date(q.date) } }),
        this.prisma.bookingOccurrence.findMany({ where: { professionalId: { in: ids }, status: 'ACTIVE', startAt: { lt: dayEnd }, endAt: { gt: dayStart } } }),
      ]);
      const window = q.timeFrom && q.timeTo ? [timeToMinutes(q.timeFrom), timeToMinutes(q.timeTo)] : null;
      list = list.filter((c) => {
        const day = {
          rules: rules.filter((r) => r.profileId === c.id),
          exceptions: exceptions.filter((e) => e.profileId === c.id),
          bookings: bookings.filter((b) => b.professionalId === c.id),
        };
        return window ? isFreeDuring(q.date!, window[0], window[1], day) : freeMinutesOnDate(q.date!, day) >= 60;
      });
    }

    // Stable, documented ordering. No sponsored placement exists.
    const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const priceCmp = (dir: 1 | -1) => (a: (typeof list)[0], b: (typeof list)[0]) => {
      if (a.price == null && b.price == null) return byId(a, b);
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return (a.price - b.price) * dir || byId(a, b);
    };
    switch (q.sort) {
      case 'price_asc':
        list.sort(priceCmp(1));
        break;
      case 'price_desc':
        list.sort(priceCmp(-1));
        break;
      case 'experience':
        list.sort((a, b) => b.experienceYears - a.experienceYears || byId(a, b));
        break;
      default:
        // "relevance": published review volume, then experience, then id (deterministic)
        list.sort((a, b) => b.totalReviewCount - a.totalReviewCount || b.experienceYears - a.experienceYears || byId(a, b));
    }
    return list;
  }

  async search(q: SearchQuery, locale: Locale) {
    const list = await this.candidates(q);
    const total = list.length;
    const pageIds = list.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map((c) => c.id);
    const rows = pageIds.length ? await this.prisma.professionalProfile.findMany({ where: { id: { in: pageIds } }, include: cardInclude }) : [];
    const ordered = pageIds.map((id) => rows.find((r) => r.id === id)!).filter(Boolean);
    const items = ordered.map((p) => toCard(p, locale, this.storage, { serviceSlug: q.service, unit: q.priceUnit }));
    const result = { ...paginate(items, total, q.page, q.pageSize), capped: total >= CANDIDATE_CAP, suggestions: null as null | Awaited<ReturnType<ProfessionalsService['suggest']>> };
    if (total === 0) result.suggestions = await this.suggest(q);
    return result;
  }

  /** Explicitly labelled alternatives when nothing matches. Never merged into results. */
  private async suggest(q: SearchQuery) {
    const nearby: { slug: string; name: ReturnType<typeof i18n>; count: number }[] = [];
    if (q.location) {
      const all = await this.taxonomy.locations();
      const target = all.find((l) => l.slug === q.location);
      if (target) {
        const siblings = all.filter((l) => l.parentId && l.parentId === target.parentId && l.id !== target.id);
        const parent = all.find((l) => l.id === target.parentId);
        const options = [...(parent ? [parent] : []), ...siblings].slice(0, 8);
        for (const loc of options) {
          const count = (await this.candidates({ ...q, location: loc.slug, page: 1 })).length;
          if (count > 0) nearby.push({ slug: loc.slug, name: loc.name, count });
        }
      }
    }
    const relaxed: { drop: string; count: number }[] = [];
    const tries: [string, boolean, Partial<SearchQuery>][] = [
      ['date', !!q.date, { date: undefined, timeFrom: undefined, timeTo: undefined }],
      ['price', q.priceMin != null || q.priceMax != null || !!q.priceKind, { priceMin: undefined, priceMax: undefined, priceKind: undefined }],
      ['experience', !!q.experienceMin, { experienceMin: undefined }],
      ['age', q.ageMin != null || q.ageMax != null, { ageMin: undefined, ageMax: undefined }],
      ['education', !!q.educationMin, { educationMin: undefined }],
      ['rating', q.ratingMin != null, { ratingMin: undefined }],
      ['startBy', !!q.startBy, { startBy: undefined }],
      ['languages', q.languages.length > 0, { languages: [] }],
      ['attributes', q.attributes.length > 0, { attributes: [] }],
      ['verified', q.verified.length > 0, { verified: [] }],
      ['service', !!q.service, { service: undefined }],
    ];
    for (const [drop, active, patch] of tries) {
      if (!active) continue;
      const count = (await this.candidates({ ...q, ...patch, page: 1 })).length;
      if (count > 0) relaxed.push({ drop, count });
    }
    return { nearby, relaxed };
  }

  async profile(slug: string, locale: Locale): Promise<ProfessionalProfileDto> {
    const p = await this.prisma.professionalProfile.findFirst({
      where: { slug, ...PUBLIC_PROFILE },
      include: {
        ...cardInclude,
        offerings: { include: { service: { include: { translations: true } } } },
        attributes: { include: { attribute: { include: { translations: true } } }, orderBy: [{ attribute: { group: 'asc' } }, { attribute: { sortOrder: 'asc' } }] },
        rules: { orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] },
        exceptions: { where: { date: { gte: new Date(new Date().toISOString().slice(0, 10)) } }, orderBy: { date: 'asc' }, take: 30 },
      },
    });
    if (!p) throw new AppError('NOT_FOUND');
    const reviews = await this.prisma.review.findMany({
      where: { profileId: p.id, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { customer: { select: { name: true } }, request: { select: { service: { include: { translations: true } } } } },
    });
    const card = toCard(p as any, locale, this.storage);
    const text = pickText(p, locale);
    return {
      ...card,
      bio: text.bio,
      bioLocale: text.locale,
      bioIsOriginal: text.isOriginal,
      services: p.offerings.map((o) => ({
        service: { id: o.service.id, slug: o.service.slug, categoryId: o.service.categoryId, name: i18n(o.service.translations), requiredQualification: o.service.requiredQualification },
        price: { kind: o.priceKind, amount: o.priceAmount, unit: o.priceUnit },
      })),
      attributes: p.attributes.filter((a) => a.attribute.active).map((a) => toAttributeDto(a.attribute)),
      schedule: p.rules.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute })),
      exceptions: p.exceptions.map((e) => ({ date: e.date.toISOString().slice(0, 10), available: e.available, startMinute: e.startMinute, endMinute: e.endMinute })),
      reviews: reviews.map(
        (r): ReviewDto => ({
          id: r.id,
          rating: r.rating,
          body: r.body,
          locale: r.locale,
          authorName: shortName(r.customer.name),
          serviceName: i18n(r.request.service.translations),
          createdAt: r.createdAt.toISOString(),
          isDemo: r.isDemo,
        }),
      ),
      memberSince: (p.approvedAt ?? p.createdAt).toISOString(),
      age: p.birthYear ? currentYear() - p.birthYear : null,
      educationLevel: p.educationLevel,
      availableFrom: p.availableFrom && p.availableFrom.toISOString().slice(0, 10) > utcToZonedDate(new Date()) ? p.availableFrom.toISOString().slice(0, 10) : null,
    };
  }

  async sitemap() {
    const rows = await this.prisma.professionalProfile.findMany({ where: PUBLIC_PROFILE, select: { slug: true, updatedAt: true }, orderBy: { slug: 'asc' }, take: 5000 });
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
  }

  /** Featured selection for the homepage: real approved profiles only. */
  async featured(locale: Locale) {
    const rows = await this.prisma.professionalProfile.findMany({
      where: { ...PUBLIC_PROFILE },
      include: cardInclude,
      orderBy: [{ totalReviewCount: 'desc' }, { experienceYears: 'desc' }, { id: 'asc' }],
      take: 6,
    });
    return rows.map((p) => toCard(p, locale, this.storage));
  }

  async favorites(userId: string, locale: Locale) {
    const favs = await this.prisma.favorite.findMany({
      where: { userId, profile: PUBLIC_PROFILE },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { profile: { include: cardInclude } },
    });
    return favs.map((f) => toCard(f.profile, locale, this.storage));
  }
}

@ApiTags('professionals')
@Controller()
export class ProfessionalsController {
  constructor(
    private readonly service: ProfessionalsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('professionals')
  @ApiZodQuery(searchQuerySchema)
  search(@ZQuery(searchQuerySchema) q: SearchQuery, @Query('lang') lang?: string) {
    return this.service.search(q, asLocale(lang));
  }

  @Get('professionals/featured')
  featured(@Query('lang') lang?: string) {
    return this.service.featured(asLocale(lang));
  }

  @Get('professionals/sitemap')
  sitemap() {
    return this.service.sitemap();
  }

  @Get('professionals/:slug')
  profile(@Param('slug') slug: string, @Query('lang') lang?: string) {
    return this.service.profile(slug, asLocale(lang));
  }

  @Get('me/favorites')
  @Auth()
  favorites(@CurrentUser() user: AuthUser, @Query('lang') lang?: string) {
    return this.service.favorites(user.id, asLocale(lang));
  }

  @Get('me/favorites/ids')
  @Auth()
  async favoriteIds(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.favorite.findMany({ where: { userId: user.id }, select: { profileId: true }, take: 500 });
    return rows.map((r) => r.profileId);
  }

  @Put('me/favorites/:profileId')
  @Auth()
  async addFavorite(@CurrentUser() user: AuthUser, @Param('profileId') profileId: string) {
    const exists = await this.prisma.professionalProfile.findFirst({ where: { id: profileId, ...PUBLIC_PROFILE }, select: { id: true } });
    if (!exists) throw new AppError('NOT_FOUND');
    await this.prisma.favorite.upsert({ where: { userId_profileId: { userId: user.id, profileId } }, create: { userId: user.id, profileId }, update: {} });
    return { ok: true };
  }

  @Delete('me/favorites/:profileId')
  @Auth()
  async removeFavorite(@CurrentUser() user: AuthUser, @Param('profileId') profileId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId: user.id, profileId } });
    return { ok: true };
  }
}

@Module({ imports: [TaxonomyModule, MediaModule], controllers: [ProfessionalsController], providers: [ProfessionalsService], exports: [ProfessionalsService] })
export class ProfessionalsModule {}
