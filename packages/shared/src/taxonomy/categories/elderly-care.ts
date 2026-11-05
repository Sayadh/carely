import type { CategoryDefinition } from '../types.js';

export const ELDERLY_CARE = {
  slug: 'elderly-care',
  name: { hy: 'Տարեցների խնամք', ru: 'Уход за пожилыми', en: 'Elderly care' },
  description: {
    hy: 'Առօրյա օգնություն, հիգիենա, կերակրում, ընկերակցություն և շուրջօրյա խնամք տանը։',
    ru: 'Повседневная помощь, гигиена, кормление, общение и круглосуточный уход на дому.',
    en: 'Everyday help, hygiene, feeding, companionship and round-the-clock care at home.',
  },
  relevantQualifications: ['IDENTITY', 'FIRST_AID', 'MEDICAL_EDUCATION'],
  services: [
    { slug: 'elderly-daily-care', name: { hy: 'Առօրյա խնամք', ru: 'Повседневный уход', en: 'Daily care' } },
    { slug: 'elderly-bedridden-care', name: { hy: 'Անկողնային հիվանդների խնամք', ru: 'Уход за лежачими', en: 'Care for bedridden people' } },
    { slug: 'elderly-limited-mobility', name: { hy: 'Շարժունակության սահմանափակում ունեցող անձանց խնամք', ru: 'Уход за людьми с ограниченной подвижностью', en: 'Care for people with limited mobility' } },
    { slug: 'elderly-escort', name: { hy: 'Տարեցների ուղեկցում', ru: 'Сопровождение пожилых', en: 'Escorting older adults' } },
    { slug: 'elderly-meals-feeding', name: { hy: 'Սննդի պատրաստում և կերակրում', ru: 'Приготовление пищи и кормление', en: 'Meal preparation and feeding' } },
    { slug: 'elderly-hygiene-bathing', name: { hy: 'Հիգիենայի և լոգանքի օգնություն', ru: 'Помощь с гигиеной и купанием', en: 'Hygiene and bathing assistance' } },
    { slug: 'elderly-medication-reminders', name: { hy: 'Դեղերի ընդունման հիշեցում', ru: 'Напоминание о приёме лекарств', en: 'Medication reminders' } },
    { slug: 'elderly-night-care', name: { hy: 'Գիշերային խնամք', ru: 'Ночной уход', en: 'Overnight care' } },
    { slug: 'elderly-round-the-clock', name: { hy: 'Շուրջօրյա խնամք', ru: 'Круглосуточный уход', en: '24-hour care' } },
    { slug: 'elderly-live-in', name: { hy: 'Տանը բնակվող խնամակալ', ru: 'Сиделка с проживанием', en: 'Live-in caregiver' } },
    { slug: 'elderly-companionship', name: { hy: 'Ընկերակցություն և զբոսանք', ru: 'Общение и прогулки', en: 'Companionship and walks' } },
    { slug: 'elderly-dementia-care', name: { hy: 'Դեմենցիա ունեցող անձանց խնամք', ru: 'Уход за людьми с деменцией', en: 'Dementia care' } },
  ],
} as const satisfies CategoryDefinition;
