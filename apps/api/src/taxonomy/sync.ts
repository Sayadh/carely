import type { Locale, PrismaClient } from '@prisma/client';
import { CATEGORIES, FACETS, requiredQualificationFor, type AttributeGroup, type LocalizedText } from '@carely/shared';

const LOCALES: Locale[] = ['hy', 'ru', 'en'];

export interface TaxonomySyncResult {
  categories: number;
  services: number;
  attributes: number;
  deactivated: { categories: number; services: number; attributes: number };
}

/**
 * Mirrors the code-managed taxonomy (packages/shared/src/taxonomy) into the database. Idempotent.
 *
 * - Rows are matched by slug; names, descriptions, order, category and credential requirements are overwritten.
 * - Slugs that are no longer defined are deactivated, never deleted: offerings, requests and reviews keep their history.
 * - Database IDs stay stable, so foreign keys and existing API contracts (ids in DTOs) are unaffected.
 */
export async function syncTaxonomy(prisma: PrismaClient): Promise<TaxonomySyncResult> {
  const serviceSlugs: string[] = [];

  for (const [catOrder, c] of CATEGORIES.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, sortOrder: catOrder, active: true },
      update: { sortOrder: catOrder, active: true },
    });
    await upsertTranslations(prisma, 'category', cat.id, c.name, c.description);

    for (const [order, s] of c.services.entries()) {
      serviceSlugs.push(s.slug);
      const data = { categoryId: cat.id, sortOrder: order, active: true, requiredQualification: requiredQualificationFor(s, c) };
      const svc = await prisma.service.upsert({ where: { slug: s.slug }, create: { slug: s.slug, ...data }, update: data });
      await upsertTranslations(prisma, 'service', svc.id, s.name);
    }
  }

  const attributeSlugs: string[] = [];
  for (const [group, options] of Object.entries(FACETS) as [AttributeGroup, (typeof FACETS)[AttributeGroup]][]) {
    for (const [order, o] of options.entries()) {
      attributeSlugs.push(o.slug);
      const data = { group, sortOrder: order, active: true };
      const attr = await prisma.careAttribute.upsert({ where: { slug: o.slug }, create: { slug: o.slug, ...data }, update: data });
      await upsertTranslations(prisma, 'attribute', attr.id, o.name);
    }
  }

  const categorySlugs = CATEGORIES.map((c) => c.slug);
  const [dc, ds, da] = await prisma.$transaction([
    prisma.category.updateMany({ where: { slug: { notIn: categorySlugs }, active: true }, data: { active: false } }),
    prisma.service.updateMany({ where: { slug: { notIn: serviceSlugs }, active: true }, data: { active: false } }),
    prisma.careAttribute.updateMany({ where: { slug: { notIn: attributeSlugs }, active: true }, data: { active: false } }),
  ]);

  return {
    categories: categorySlugs.length,
    services: serviceSlugs.length,
    attributes: attributeSlugs.length,
    deactivated: { categories: dc.count, services: ds.count, attributes: da.count },
  };
}

async function upsertTranslations(prisma: PrismaClient, kind: 'category' | 'service' | 'attribute', id: string, name: LocalizedText, description?: LocalizedText) {
  for (const locale of LOCALES) {
    const fields = { name: name[locale], description: description?.[locale] ?? '' };
    if (kind === 'category') {
      await prisma.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: id, locale } }, create: { categoryId: id, locale, ...fields }, update: fields });
    } else if (kind === 'service') {
      await prisma.serviceTranslation.upsert({ where: { serviceId_locale: { serviceId: id, locale } }, create: { serviceId: id, locale, ...fields }, update: fields });
    } else {
      await prisma.attributeTranslation.upsert({ where: { attributeId_locale: { attributeId: id, locale } }, create: { attributeId: id, locale, ...fields }, update: fields });
    }
  }
}
