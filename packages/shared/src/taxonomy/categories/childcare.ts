import type { CategoryDefinition } from '../types.js';

export const CHILDCARE = {
  slug: 'childcare',
  name: { hy: 'Երեխաների խնամք', ru: 'Уход за детьми', en: 'Childcare' },
  description: {
    hy: 'Դայակներ նորածինների, փոքրիկների, դպրոցականների և դեռահասների համար՝ ժամային, գիշերային կամ շուրջօրյա։',
    ru: 'Няни для новорождённых, малышей, школьников и подростков — почасово, ночью или круглосуточно.',
    en: 'Nannies for newborns, toddlers, school-age children and teens — hourly, overnight or around the clock.',
  },
  relevantQualifications: ['IDENTITY', 'PEDAGOGY', 'FIRST_AID'],
  services: [
    { slug: 'child-newborn-care', name: { hy: 'Նորածինների խնամք (0–1 տարեկան)', ru: 'Уход за новорождёнными (0–1 год)', en: 'Newborn care (0–1 years)' } },
    { slug: 'child-toddler-care', name: { hy: 'Մանկահասակ երեխաների խնամք (1–3)', ru: 'Уход за малышами (1–3 года)', en: 'Toddler care (1–3 years)' } },
    { slug: 'child-preschool-care', name: { hy: 'Նախադպրոցական տարիքի երեխաների խնամք (3–6)', ru: 'Уход за дошкольниками (3–6 лет)', en: 'Preschooler care (3–6 years)' } },
    { slug: 'child-school-age-care', name: { hy: 'Դպրոցական երեխաների խնամք (6–12)', ru: 'Уход за школьниками (6–12 лет)', en: 'School-age childcare (6–12 years)' } },
    { slug: 'child-teen-care', name: { hy: 'Դեռահասների խնամք (12+)', ru: 'Присмотр за подростками (12+)', en: 'Teen care (12+)' } },
    { slug: 'night-nanny', name: { hy: 'Գիշերային դայակ', ru: 'Ночная няня', en: 'Night nanny' } },
    { slug: 'round-the-clock-nanny', name: { hy: 'Շուրջօրյա դայակ', ru: 'Круглосуточная няня', en: '24-hour nanny' } },
    { slug: 'travel-nanny', name: { hy: 'Դայակ՝ երեխայի հետ ճանապարհորդելու համար', ru: 'Няня для поездок с ребёнком', en: 'Travel nanny' } },
    { slug: 'live-in-nanny', name: { hy: 'Դայակ՝ տանը բնակվելու պայմանով', ru: 'Няня с проживанием', en: 'Live-in nanny' } },
    { slug: 'temporary-nanny', name: { hy: 'Ժամանակավոր դայակ', ru: 'Временная няня', en: 'Temporary nanny' } },
  ],
} as const satisfies CategoryDefinition;
