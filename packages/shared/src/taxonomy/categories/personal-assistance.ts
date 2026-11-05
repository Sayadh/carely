import type { CategoryDefinition } from '../types.js';

export const PERSONAL_ASSISTANCE = {
  slug: 'personal-assistance',
  name: { hy: 'Անձնական օգնական և առօրյա աջակցություն', ru: 'Личный помощник и бытовая поддержка', en: 'Personal assistant and everyday support' },
  description: {
    hy: 'Գնումներ, ուղեկցում բժշկի մոտ, փաստաթղթերի և առօրյա գործերի կազմակերպում։',
    ru: 'Покупки, сопровождение к врачу, организация документов и повседневных дел.',
    en: 'Shopping, doctor visit escort, paperwork and everyday errands.',
  },
  relevantQualifications: ['IDENTITY', 'FIRST_AID'],
  services: [
    { slug: 'assistant-daily-tasks', name: { hy: 'Առօրյա գործերում օգնություն', ru: 'Помощь в повседневных делах', en: 'Help with everyday tasks' } },
    { slug: 'assistant-shopping', name: { hy: 'Գնումների կատարում', ru: 'Покупки', en: 'Shopping' } },
    { slug: 'assistant-doctor-escort', name: { hy: 'Բժշկի մոտ ուղեկցում', ru: 'Сопровождение к врачу', en: 'Doctor visit escort' } },
    { slug: 'assistant-paperwork', name: { hy: 'Փաստաթղթերի և գործերի կազմակերպում', ru: 'Организация документов и дел', en: 'Paperwork and errands' } },
    { slug: 'assistant-home-help', name: { hy: 'Տանը օգնություն', ru: 'Помощь дома', en: 'Help at home' } },
    { slug: 'assistant-special-needs', name: { hy: 'Հատուկ կարիքներ ունեցող անձանց անձնական օգնական', ru: 'Личный помощник для людей с особыми потребностями', en: 'Personal assistant for people with special needs' } },
    { slug: 'assistant-companion', name: { hy: 'Ուղեկցող օգնական', ru: 'Помощник-сопровождающий', en: 'Accompanying assistant' } },
  ],
} as const satisfies CategoryDefinition;
