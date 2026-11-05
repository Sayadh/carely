import type { CategoryDefinition } from '../types.js';

export const HOME_HELP = {
  slug: 'home-help',
  name: { hy: 'Տնային օգնություն', ru: 'Помощь по дому', en: 'Home help' },
  description: {
    hy: 'Մաքրություն, սննդի պատրաստում, լվացք և տնային տնտեսության վարում։',
    ru: 'Уборка, приготовление еды, стирка и ведение домашнего хозяйства.',
    en: 'Cleaning, cooking, laundry and housekeeping.',
  },
  relevantQualifications: ['IDENTITY'],
  services: [
    { slug: 'home-cleaning', name: { hy: 'Տան մաքրություն', ru: 'Уборка дома', en: 'House cleaning' } },
    { slug: 'home-cooking', name: { hy: 'Սննդի պատրաստում', ru: 'Приготовление еды', en: 'Cooking' } },
    { slug: 'home-laundry-ironing', name: { hy: 'Լվացք և արդուկ', ru: 'Стирка и глажка', en: 'Laundry and ironing' } },
    { slug: 'home-housekeeping', name: { hy: 'Տնային տնտեսության վարում', ru: 'Ведение домашнего хозяйства', en: 'Housekeeping' } },
    { slug: 'home-nursery-organizing', name: { hy: 'Մանկական սենյակի կազմակերպում', ru: 'Организация детской комнаты', en: 'Nursery organising' } },
    { slug: 'home-elderly-cooking', name: { hy: 'Տարեցների համար սննդի պատրաստում', ru: 'Приготовление еды для пожилых', en: 'Cooking for older adults' } },
    { slug: 'home-live-in-helper', name: { hy: 'Տանը բնակվող տնային աշխատող', ru: 'Домработница с проживанием', en: 'Live-in housekeeper' } },
  ],
} as const satisfies CategoryDefinition;
