import type { AttributeGroup, PriceKind, PriceUnit } from '../enums.js';
import type { FacetOption } from './types.js';

/**
 * Global facets shared by every category. They are profile attributes (not services):
 * stored as `CareAttribute` rows (synced from here) and filtered with OR inside a group, AND across groups.
 */
export const WORK_SCHEDULES = [
  { slug: 'schedule-hourly', name: { hy: 'Ժամային', ru: 'Почасово', en: 'Hourly' } },
  { slug: 'schedule-part-time', name: { hy: 'Կես դրույքով', ru: 'Неполный день', en: 'Part-time' } },
  { slug: 'schedule-full-time', name: { hy: 'Ամբողջ դրույքով', ru: 'Полный день', en: 'Full-time' } },
  { slug: 'schedule-daily', name: { hy: 'Օրական', ru: 'Посуточно', en: 'By the day' } },
  { slug: 'schedule-night', name: { hy: 'Գիշերային', ru: 'Ночью', en: 'Overnight' } },
  { slug: 'schedule-weekly', name: { hy: 'Շաբաթական', ru: 'Понедельно', en: 'Weekly' } },
  { slug: 'schedule-monthly', name: { hy: 'Ամսական', ru: 'Помесячно', en: 'Monthly' } },
  { slug: 'schedule-round-the-clock', name: { hy: 'Շուրջօրյա', ru: 'Круглосуточно', en: 'Around the clock' } },
  { slug: 'schedule-temporary', name: { hy: 'Ժամանակավոր', ru: 'Временно', en: 'Temporary' } },
  { slug: 'schedule-permanent', name: { hy: 'Մշտական', ru: 'Постоянно', en: 'Permanent' } },
] as const satisfies readonly FacetOption[];

export const WORK_PLACES = [
  { slug: 'place-client-home', name: { hy: 'Պատվիրատուի տանը', ru: 'У клиента дома', en: "At the client's home" } },
  { slug: 'place-caregiver-home', name: { hy: 'Խնամակալի տանը', ru: 'У специалиста дома', en: "At the caregiver's home" } },
  { slug: 'place-hospital', name: { hy: 'Հիվանդանոցում', ru: 'В больнице', en: 'In hospital' } },
  { slug: 'place-live-in', name: { hy: 'Տանը բնակվելու պայմանով', ru: 'С проживанием', en: 'Live-in' } },
  {
    slug: 'place-online',
    name: { hy: 'Առցանց խորհրդատվություն', ru: 'Онлайн-консультация', en: 'Online consultation' },
    categories: ['nursing', 'patient-care', 'pet-care', 'personal-assistance'],
  },
] as const satisfies readonly FacetOption[];

export const FACETS: Record<AttributeGroup, readonly FacetOption[]> = {
  WORK_SCHEDULE: WORK_SCHEDULES,
  WORK_PLACE: WORK_PLACES,
};

const facetIndex = new Map<string, { group: AttributeGroup; option: FacetOption }>(
  (Object.entries(FACETS) as [AttributeGroup, readonly FacetOption[]][]).flatMap(([group, options]) => options.map((option) => [option.slug, { group, option }] as const)),
);

export function findFacet(slug: string) {
  return facetIndex.get(slug);
}

/** Whether a facet option may be selected for a professional of the given category. */
export function facetAllowedFor(option: FacetOption, categorySlug: string | null | undefined): boolean {
  return !option.categories || (!!categorySlug && option.categories.includes(categorySlug));
}

/** "Վարձատրություն" filter: a fixed price per unit, or a price agreed with the professional. */
export type PayType = PriceUnit | Extract<PriceKind, 'NEGOTIABLE'>;
export const PAY_TYPES = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'VISIT', 'NEGOTIABLE'] as const satisfies readonly PayType[];

/** Preset options for the UI; the API accepts any value within its validated range. */
export const RATING_FILTER_OPTIONS = [3, 3.5, 4, 4.5] as const;
export const AGE_LIMITS = { min: 18, max: 80 } as const;
