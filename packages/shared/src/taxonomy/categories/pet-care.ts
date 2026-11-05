import type { CategoryDefinition } from '../types.js';

export const PET_CARE = {
  slug: 'pet-care',
  name: { hy: 'Կենդանիների խնամք', ru: 'Уход за животными', en: 'Pet care' },
  description: {
    hy: 'Զբոսանք, կերակրում, ժամանակավոր պահում և ուղեկցում անասնաբույժի մոտ։',
    ru: 'Выгул, кормление, передержка и сопровождение к ветеринару.',
    en: 'Walks, feeding, boarding and vet visit escort.',
  },
  relevantQualifications: ['IDENTITY', 'VETERINARY'],
  services: [
    { slug: 'pet-dog-care', name: { hy: 'Շների խնամք', ru: 'Уход за собаками', en: 'Dog care' } },
    { slug: 'pet-cat-care', name: { hy: 'Կատուների խնամք', ru: 'Уход за кошками', en: 'Cat care' } },
    { slug: 'pet-other-care', name: { hy: 'Այլ ընտանի կենդանիների խնամք', ru: 'Уход за другими домашними животными', en: 'Care for other pets' } },
    { slug: 'dog-walking', name: { hy: 'Շների զբոսանք', ru: 'Выгул собак', en: 'Dog walking' } },
    { slug: 'pet-feeding', name: { hy: 'Կենդանիների կերակրում', ru: 'Кормление животных', en: 'Pet feeding' } },
    { slug: 'pet-sitting', name: { hy: 'Կենդանիների խնամք տիրոջ բացակայության ժամանակ', ru: 'Уход за животными в отсутствие хозяев', en: 'Pet sitting while owners are away' } },
    { slug: 'pet-boarding', name: { hy: 'Կենդանիների ժամանակավոր պահում', ru: 'Временная передержка', en: 'Temporary boarding' } },
    { slug: 'pet-hotel', name: { hy: 'Կենդանիների հյուրանոց', ru: 'Гостиница для животных', en: 'Pet hotel' } },
    { slug: 'pet-transport', name: { hy: 'Կենդանիների տեղափոխում', ru: 'Перевозка животных', en: 'Pet transport' } },
    { slug: 'pet-vet-escort', name: { hy: 'Անասնաբույժի ուղեկցում', ru: 'Сопровождение к ветеринару', en: 'Vet visit escort' } },
    { slug: 'pet-special-needs', name: { hy: 'Հատուկ խնամքի կարիք ունեցող կենդանիների խնամք', ru: 'Уход за животными с особыми потребностями', en: 'Care for pets with special needs' } },
  ],
} as const satisfies CategoryDefinition;
