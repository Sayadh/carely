import type { CategoryDefinition } from '../types.js';

export const DISABILITY_CARE = {
  slug: 'disability-care',
  name: { hy: 'Հաշմանդամություն ունեցող անձանց խնամք', ru: 'Уход за людьми с инвалидностью', en: 'Disability care' },
  description: {
    hy: 'Օգնություն առօրյա գործողություններում, անձնական հիգիենայում և տեղաշարժվելիս։',
    ru: 'Помощь в повседневных делах, личной гигиене и передвижении.',
    en: 'Help with daily activities, personal hygiene and getting around.',
  },
  relevantQualifications: ['IDENTITY', 'FIRST_AID', 'MEDICAL_EDUCATION'],
  services: [
    { slug: 'disability-physical', name: { hy: 'Ֆիզիկական սահմանափակումներ ունեցող անձանց խնամք', ru: 'Уход за людьми с физическими ограничениями', en: 'Care for people with physical disabilities' } },
    { slug: 'disability-wheelchair', name: { hy: 'Սայլակ օգտագործող անձանց օգնություն', ru: 'Помощь людям на инвалидной коляске', en: 'Wheelchair user assistance' } },
    { slug: 'disability-daily-activities', name: { hy: 'Առօրյա գործողությունների օգնություն', ru: 'Помощь в повседневных действиях', en: 'Help with daily activities' } },
    { slug: 'disability-personal-hygiene', name: { hy: 'Անձնական հիգիենայի օգնություն', ru: 'Помощь с личной гигиеной', en: 'Personal hygiene assistance' } },
    { slug: 'disability-escort-mobility', name: { hy: 'Ուղեկցում և տեղաշարժ', ru: 'Сопровождение и передвижение', en: 'Escort and getting around' } },
    { slug: 'disability-live-in', name: { hy: 'Տանը բնակվող խնամակալ', ru: 'Сиделка с проживанием', en: 'Live-in caregiver' } },
    { slug: 'disability-temporary', name: { hy: 'Ժամանակավոր խնամք', ru: 'Временный уход', en: 'Temporary care' } },
    { slug: 'disability-specialized', name: { hy: 'Մասնագիտացված խնամք', ru: 'Специализированный уход', en: 'Specialised care' } },
  ],
} as const satisfies CategoryDefinition;
