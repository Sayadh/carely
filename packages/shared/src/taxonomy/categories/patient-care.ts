import type { CategoryDefinition } from '../types.js';

/** Non-medical patient care. Medical procedures live in the separate `nursing` category. */
export const PATIENT_CARE = {
  slug: 'patient-care',
  name: { hy: 'Հիվանդների խնամք', ru: 'Уход за больными', en: 'Patient care' },
  description: {
    hy: 'Ոչ բժշկական խնամք վիրահատությունից հետո, քրոնիկ հիվանդությունների և վերականգնման ընթացքում։',
    ru: 'Немедицинский уход после операций, при хронических заболеваниях и в период восстановления.',
    en: 'Non-medical care after surgery, with chronic conditions and during recovery.',
  },
  relevantQualifications: ['IDENTITY', 'NURSING_LICENSE', 'MEDICAL_EDUCATION', 'FIRST_AID'],
  services: [
    { slug: 'patient-post-surgery', name: { hy: 'Հետվիրահատական խնամք', ru: 'Послеоперационный уход', en: 'Post-operative care' } },
    { slug: 'patient-bedridden', name: { hy: 'Անկողնային հիվանդների խնամք', ru: 'Уход за лежачими больными', en: 'Bedridden patient care' } },
    { slug: 'patient-chronic', name: { hy: 'Քրոնիկ հիվանդություններ ունեցող անձանց խնամք', ru: 'Уход за людьми с хроническими заболеваниями', en: 'Care for people with chronic conditions' } },
    { slug: 'patient-limited-mobility', name: { hy: 'Շարժունակության սահմանափակում ունեցող հիվանդների խնամք', ru: 'Уход за больными с ограниченной подвижностью', en: 'Care for patients with limited mobility' } },
    { slug: 'patient-rehabilitation', name: { hy: 'Վերականգնողական շրջանի ուղեկցում', ru: 'Сопровождение в период реабилитации', en: 'Rehabilitation support' } },
    { slug: 'patient-treatment-support', name: { hy: 'Քիմիաթերապիայի կամ ծանր բուժման ընթացքում առօրյա օգնություն', ru: 'Бытовая помощь во время химиотерапии или тяжёлого лечения', en: 'Daily help during chemotherapy or intensive treatment' } },
    { slug: 'patient-night-care', name: { hy: 'Հիվանդի գիշերային խնամք', ru: 'Ночной уход за больным', en: 'Overnight patient care' } },
    { slug: 'patient-round-the-clock', name: { hy: 'Շուրջօրյա խնամք', ru: 'Круглосуточный уход', en: '24-hour care' } },
    { slug: 'patient-hospital-escort', name: { hy: 'Հիվանդի ուղեկցում հիվանդանոց', ru: 'Сопровождение больного в больницу', en: 'Hospital escort' } },
    { slug: 'patient-live-in', name: { hy: 'Տանը բնակվող խնամակալ', ru: 'Сиделка с проживанием', en: 'Live-in caregiver' } },
  ],
} as const satisfies CategoryDefinition;
