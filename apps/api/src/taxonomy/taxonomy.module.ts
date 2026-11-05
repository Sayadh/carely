import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CATEGORIES, findFacet, type AttributeDto, type CategoryDto, type I18nText, type LocationDto, type QualificationKind } from '@carely/shared';
import { log } from '../common/logger';
import { PrismaService } from '../common/prisma.service';

export function i18n(rows: { locale: string; name: string }[] | undefined): I18nText {
  const out: I18nText = {};
  for (const r of rows ?? []) if (r.name) out[r.locale as keyof I18nText] = r.name;
  return out;
}
/** Facet row → DTO; the category restriction comes from the code-managed definition. */
export function toAttributeDto(a: { id: string; slug: string; group: AttributeDto['group']; translations: { locale: string; name: string }[] }): AttributeDto {
  const def = findFacet(a.slug)?.option;
  return { id: a.id, slug: a.slug, group: a.group, name: i18n(a.translations), categories: def?.categories ? [...def.categories] : null };
}
export function i18nDesc(rows: { locale: string; description: string }[] | undefined): I18nText {
  const out: I18nText = {};
  for (const r of rows ?? []) if (r.description) out[r.locale as keyof I18nText] = r.description;
  return out;
}

@Injectable()
export class TaxonomyService {
  private cache: { at: number; categories: CategoryDto[]; attributes: AttributeDto[]; locations: LocationDto[] } | null = null;
  private warnedOutOfSync = false;
  constructor(private readonly prisma: PrismaService) {}

  invalidate() {
    this.cache = null;
  }

  private async load() {
    if (this.cache && Date.now() - this.cache.at < 60_000) return this.cache;
    const [cats, attrs, locs] = await Promise.all([
      this.prisma.category.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
        include: {
          translations: true,
          services: { where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }], include: { translations: true } },
        },
      }),
      this.prisma.careAttribute.findMany({ where: { active: true }, orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }], include: { translations: true } }),
      this.prisma.location.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }], include: { translations: true } }),
    ]);
    const categories: CategoryDto[] = cats.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: i18n(c.translations),
      description: i18nDesc(c.translations),
      services: c.services.map((s) => ({ id: s.id, slug: s.slug, categoryId: c.id, name: i18n(s.translations), requiredQualification: s.requiredQualification as QualificationKind | null })),
    }));
    const attributes: AttributeDto[] = attrs.map(toAttributeDto);
    this.checkSync(categories);
    const locations: LocationDto[] = locs.map((l) => ({ id: l.id, slug: l.slug, type: l.type, parentId: l.parentId, name: i18n(l.translations) }));
    this.cache = { at: Date.now(), categories, attributes, locations };
    return this.cache;
  }

  async categories() {
    return (await this.load()).categories;
  }
  async attributes() {
    return (await this.load()).attributes;
  }
  async locations() {
    return (await this.load()).locations;
  }

  /** The database mirrors code-managed constants; a mismatch means `npm run db:seed` was not run after a deploy. */
  private checkSync(categories: CategoryDto[]) {
    if (this.warnedOutOfSync) return;
    const inDb = new Set(categories.flatMap((c) => c.services.map((s) => s.slug)));
    const missing = CATEGORIES.flatMap((c) => c.services.map((s) => s.slug)).filter((slug) => !inDb.has(slug));
    if (missing.length) {
      this.warnedOutOfSync = true;
      log('warn', 'taxonomy_out_of_sync', { missingServices: missing.length, hint: 'run npm run db:seed' });
    }
  }

  /** Location with all ancestors and descendants (for service-area matching). */
  async locationFamily(slugOrId: string): Promise<{ target: LocationDto; ids: string[]; ancestors: string[]; descendants: string[] } | null> {
    const all = await this.locations();
    const target = all.find((l) => l.slug === slugOrId || l.id === slugOrId);
    if (!target) return null;
    const ancestors: string[] = [];
    let p = target.parentId;
    while (p) {
      ancestors.push(p);
      p = all.find((l) => l.id === p)?.parentId ?? null;
    }
    const descendants: string[] = [];
    const walk = (id: string) => {
      for (const c of all.filter((l) => l.parentId === id)) {
        descendants.push(c.id);
        walk(c.id);
      }
    };
    walk(target.id);
    return { target, ids: [target.id, ...ancestors, ...descendants], ancestors, descendants };
  }
}

@ApiTags('taxonomy')
@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly service: TaxonomyService) {}

  @Get('categories')
  categories() {
    return this.service.categories();
  }

  /** Global facets (work schedule, work place). */
  @Get('attributes')
  attributes() {
    return this.service.attributes();
  }

  @Get('locations')
  locations() {
    return this.service.locations();
  }
}

@Module({ controllers: [TaxonomyController], providers: [TaxonomyService], exports: [TaxonomyService] })
export class TaxonomyModule {}
