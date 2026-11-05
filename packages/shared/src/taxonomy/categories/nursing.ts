import type { CategoryDefinition } from '../types.js';

/**
 * Medical procedures. Restricted to professionals with a VERIFIED nursing licence:
 * enforced at admin approval and at request creation through `requiredQualification`.
 */
export const NURSING = {
  slug: 'nursing',
  name: { hy: 'Բուժքույրական ծառայություններ', ru: 'Услуги медсестры', en: 'Nursing services' },
  description: {
    hy: 'Ներարկումներ, կաթիլայիններ, վիրակապումներ և բուժական խնամք։ Միայն ստուգված բուժքույրական որակավորմամբ մասնագետներ։',
    ru: 'Инъекции, капельницы, перевязки и лечебный уход. Только специалисты с проверенной квалификацией медсестры.',
    en: 'Injections, IV drips, wound dressing and therapeutic care. Only professionals with a verified nursing qualification.',
  },
  requiredQualification: 'NURSING_LICENSE',
  relevantQualifications: ['IDENTITY', 'NURSING_LICENSE', 'MEDICAL_EDUCATION'],
  services: [
    { slug: 'nursing-injections', name: { hy: 'Ներարկումներ', ru: 'Инъекции', en: 'Injections' } },
    { slug: 'nursing-iv-drips', name: { hy: 'Կաթիլային ներարկումներ', ru: 'Капельницы', en: 'IV drips' } },
    { slug: 'nursing-wound-dressing', name: { hy: 'Վիրակապումներ', ru: 'Перевязки', en: 'Wound dressing' } },
    { slug: 'nursing-vitals-monitoring', name: { hy: 'Ճնշման և շաքարի չափում', ru: 'Измерение давления и сахара', en: 'Blood pressure and glucose checks' } },
    { slug: 'nursing-medical-care', name: { hy: 'Բուժական խնամք', ru: 'Лечебный уход', en: 'Therapeutic nursing care' } },
    { slug: 'nursing-post-surgery', name: { hy: 'Հետվիրահատական բժշկական խնամք', ru: 'Послеоперационный медицинский уход', en: 'Post-operative medical care' } },
    { slug: 'nursing-catheter-stoma', name: { hy: 'Կաթետերի և ստոմայի խնամք', ru: 'Уход за катетером и стомой', en: 'Catheter and stoma care' } },
    { slug: 'nursing-home-visits', name: { hy: 'Տնային բուժքույրական այցեր', ru: 'Визиты медсестры на дом', en: 'Home nursing visits' } },
  ],
} as const satisfies CategoryDefinition;
