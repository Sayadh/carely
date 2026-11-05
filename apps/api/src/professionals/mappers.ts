import { Prisma } from '@prisma/client';
import type { Locale, PriceDto, ProfessionalCardDto, PriceUnit, SpokenLanguage, QualificationKind } from '@carely/shared';
import { i18n } from '../taxonomy/taxonomy.module';
import type { StorageService } from '../media/storage.service';
import { roundRating } from '../reviews/rating';

export const cardInclude = {
  translations: true,
  category: { include: { translations: true } },
  homeLocation: { include: { translations: true } },
  serviceAreas: { include: { location: { include: { translations: true } } } },
  languages: true,
  qualifications: { where: { status: 'VERIFIED' }, select: { kind: true, title: true, verifiedAt: true } },
  offerings: { include: { service: { select: { id: true, slug: true } } } },
  rules: { select: { weekday: true } },
  portrait: { select: { storageKey: true } },
} satisfies Prisma.ProfessionalProfileInclude;

export type CardProfile = Prisma.ProfessionalProfileGetPayload<{ include: typeof cardInclude }>;

/** Prefer an author-supplied translation for the reader's locale; otherwise the original text. */
export function pickText(p: { translations: { locale: Locale; headline: string; bio: string }[]; originalLocale: Locale }, locale: Locale) {
  const exact = p.translations.find((t) => t.locale === locale && (t.headline || t.bio));
  const original = p.translations.find((t) => t.locale === p.originalLocale) ?? p.translations[0];
  const t = exact ?? original;
  return { headline: t?.headline ?? '', bio: t?.bio ?? '', locale: (t?.locale ?? p.originalLocale) as Locale, isOriginal: !exact || exact.locale === p.originalLocale };
}

export function representativePrice(p: CardProfile, opts: { serviceSlug?: string; unit?: PriceUnit }): PriceDto | null {
  let offers = p.offerings;
  if (opts.serviceSlug) offers = offers.filter((o) => o.service.slug === opts.serviceSlug);
  if (opts.unit) {
    const sameUnit = offers.filter((o) => o.priceUnit === opts.unit);
    if (sameUnit.length) offers = sameUnit;
  }
  const fixed = offers.filter((o) => o.priceKind === 'FIXED' && o.priceAmount != null).sort((a, b) => a.priceAmount! - b.priceAmount!);
  const pick = fixed[0] ?? offers[0];
  return pick ? { kind: pick.priceKind, amount: pick.priceAmount, unit: pick.priceUnit } : null;
}

export function toCard(p: CardProfile, locale: Locale, storage: StorageService, opts: { serviceSlug?: string; unit?: PriceUnit } = {}): ProfessionalCardDto {
  const text = pickText(p, locale);
  return {
    id: p.id,
    slug: p.slug,
    displayName: p.displayName,
    headline: text.headline,
    headlineLocale: text.locale,
    portraitUrl: p.portrait ? storage.publicUrl(p.portrait.storageKey) : null,
    categorySlug: p.category?.slug ?? '',
    category: i18n(p.category?.translations),
    homeLocation: i18n(p.homeLocation?.translations),
    serviceAreas: p.serviceAreas.map((a) => ({ slug: a.location.slug, name: i18n(a.location.translations) })),
    experienceYears: p.experienceYears,
    languages: p.languages.map((l) => l.code as SpokenLanguage),
    verifications: p.qualifications.map((q) => ({ kind: q.kind as QualificationKind, title: q.title, verifiedAt: q.verifiedAt!.toISOString() })),
    price: representativePrice(p, opts),
    weeklyDays: [...new Set(p.rules.map((r) => r.weekday))].sort(),
    // Stored by reviews/rating.ts (weighted last-50); only the final value is rounded to 2 decimals.
    rating: p.ratingCount > 0 ? roundRating(p.ratingValue) : null,
    ratingCount: p.ratingCount,
    totalReviewCount: p.totalReviewCount,
    isDemo: p.isDemo,
  };
}
