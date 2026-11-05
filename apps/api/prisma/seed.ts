/**
 * Seed command.
 *   npm run db:seed        → reference data only: syncs categories/services/facets from packages/shared/src/taxonomy, upserts locations.
 *                            Idempotent; safe for production. Run after every deploy that changes the taxonomy.
 *   npm run db:seed:demo   → reference data + clearly fictitious demo accounts/profiles/requests. Development only.
 */
import { PrismaClient, Locale, Prisma } from '@prisma/client';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { addDays, expandSchedule, utcToZonedDate, type EducationLevel, type PriceUnit, type ServiceSlug } from '@carely/shared';
import { REGIONS, T3 } from './seed-data';
import { syncTaxonomy } from '../src/taxonomy/sync';
import { hashPassword } from '../src/auth/crypto';
import { ratingTransaction, recomputeProfessionalRating } from '../src/reviews/rating';

if (existsSync(resolve(process.cwd(), '.env'))) process.loadEnvFile(resolve(process.cwd(), '.env'));

const prisma = new PrismaClient();
const LOCALES: Locale[] = ['hy', 'ru', 'en'];
const rows = (t: T3) => LOCALES.map((locale) => ({ locale, name: t[locale] }));

async function seedReference() {
  const tx = await syncTaxonomy(prisma);
  console.log(`Taxonomy synced: ${tx.categories} categories, ${tx.services} services, ${tx.attributes} facets (deactivated: ${JSON.stringify(tx.deactivated)}).`);

  let ro = 0;
  for (const region of REGIONS) {
    const reg = await prisma.location.upsert({ where: { slug: region.slug }, create: { slug: region.slug, type: 'REGION', sortOrder: ro++ }, update: {} });
    for (const r of rows(region.name)) {
      await prisma.locationTranslation.upsert({
        where: { locationId_locale: { locationId: reg.id, locale: r.locale } },
        create: { locationId: reg.id, locale: r.locale, name: r.name },
        update: { name: r.name },
      });
    }
    let co = 0;
    for (const child of region.children) {
      const loc = await prisma.location.upsert({
        where: { slug: child.slug },
        create: { slug: child.slug, type: child.type, parentId: reg.id, sortOrder: co++ },
        update: { parentId: reg.id, type: child.type },
      });
      for (const r of rows(child.name)) {
        await prisma.locationTranslation.upsert({
          where: { locationId_locale: { locationId: loc.id, locale: r.locale } },
          create: { locationId: loc.id, locale: r.locale, name: r.name },
          update: { name: r.name },
        });
      }
    }
  }
  console.log(`Locations: ${REGIONS.length} regions (Yerevan + 10 marzes).`);
}

// ───────────────────────── Demo data (fictitious) ─────────────────────────

interface DemoPro {
  key: string;
  name: string;
  category: string;
  services: { slug: ServiceSlug; amount: number | null; unit: PriceUnit }[];
  /** Global facet slugs (work schedule / work place). */
  attributes: string[];
  birthYear: number;
  education: EducationLevel;
  /** Days from today until the professional can start; omitted = available now. */
  startsInDays?: number;
  home: string;
  areas: string[];
  years: number;
  languages: string[];
  originalLocale?: Locale;
  headline: string;
  bio: string;
  translations?: Partial<Record<Locale, { headline: string; bio: string }>>;
  verified: { kind: 'IDENTITY' | 'NURSING_LICENSE' | 'FIRST_AID' | 'PEDAGOGY' | 'VETERINARY' | 'MEDICAL_EDUCATION'; title: string }[];
  schedule: [number[], string, string][]; // weekdays, start, end
  status?: 'APPROVED' | 'PENDING';
}

const PROS: DemoPro[] = [
  {
    key: 'ani',
    name: 'Անի Մարտիրոսյան',
    category: 'childcare',
    services: [
      { slug: 'child-toddler-care', amount: 2500, unit: 'HOUR' },
      { slug: 'child-preschool-care', amount: 3000, unit: 'HOUR' },
    ],
    attributes: ['schedule-hourly', 'schedule-full-time', 'schedule-permanent', 'place-client-home'],
    birthYear: 1990,
    education: 'BACHELOR',
    home: 'yerevan-arabkir',
    areas: ['yerevan-arabkir', 'yerevan-kentron', 'yerevan-davtashen'],
    years: 8,
    languages: ['hy', 'ru', 'en'],
    headline: 'Դայակ՝ մանկավարժական կրթությամբ',
    bio: 'Աշխատել եմ մանկապարտեզում և ընտանիքներում։ Սիրում եմ երեխաների հետ կարդալ, նկարել և զբոսնել։ Կազմակերպում եմ օրվա ռեժիմը՝ ծնողների հետ համաձայնեցված։',
    translations: {
      ru: { headline: 'Няня с педагогическим образованием', bio: 'Работала в детском саду и в семьях. Люблю читать, рисовать и гулять с детьми. Выстраиваю режим дня по договорённости с родителями.' },
      en: { headline: 'Nanny with a teaching background', bio: 'I have worked in a kindergarten and with families. I enjoy reading, drawing and walking with children, and keep a daily routine agreed with parents.' },
    },
    verified: [
      { kind: 'IDENTITY', title: 'Անձը հաստատող փաստաթուղթ' },
      { kind: 'PEDAGOGY', title: 'Նախադպրոցական մանկավարժի դիպլոմ' },
    ],
    schedule: [[[1, 2, 3, 4, 5], '09:00', '19:00']],
  },
  {
    key: 'lilit',
    name: 'Լիլիթ Հովհաննիսյան',
    category: 'childcare',
    services: [
      { slug: 'night-nanny', amount: 15000, unit: 'DAY' },
      { slug: 'child-newborn-care', amount: 2500, unit: 'HOUR' },
    ],
    attributes: ['schedule-night', 'schedule-hourly', 'place-client-home'],
    birthYear: 1994,
    education: 'VOCATIONAL',
    home: 'yerevan-shengavit',
    areas: ['yerevan-shengavit', 'yerevan-malatia-sebastia', 'yerevan-erebuni'],
    years: 5,
    languages: ['hy', 'ru'],
    headline: 'Գիշերային դայակ նորածինների համար',
    bio: 'Օգնում եմ նորածինների խնամքում, հատկապես գիշերային ժամերին, որպեսզի ծնողները կարողանան հանգստանալ։ Հանգիստ և ուշադիր եմ։',
    verified: [{ kind: 'IDENTITY', title: 'Անձը հաստատող փաստաթուղթ' }],
    schedule: [
      [[1, 2, 3, 4, 5, 6, 7], '20:00', '24:00'],
      [[6, 7], '10:00', '16:00'],
    ],
  },
  {
    key: 'nare',
    name: 'Նարե Գրիգորյան',
    category: 'childcare',
    services: [
      { slug: 'child-school-age-care', amount: 2000, unit: 'HOUR' },
      { slug: 'temporary-nanny', amount: 1500, unit: 'VISIT' },
    ],
    attributes: ['schedule-hourly', 'schedule-part-time', 'schedule-temporary', 'place-client-home'],
    birthYear: 2003,
    education: 'SECONDARY',
    startsInDays: 10,
    home: 'yerevan-ajapnyak',
    areas: ['yerevan-ajapnyak', 'yerevan-davtashen'],
    years: 3,
    languages: ['hy', 'en'],
    headline: 'Բեյբիսիթեր և օգնական դասերին',
    bio: 'Ուսանող եմ, օգնում եմ դպրոցականներին դասերի պատրաստման հարցում և ուղեկցում խմբակներ։ Անցել եմ առաջին օգնության դասընթաց։',
    verified: [{ kind: 'FIRST_AID', title: 'Առաջին օգնության դասընթացի վկայական' }],
    schedule: [[[1, 2, 3, 4, 5], '13:00', '20:00']],
  },
  {
    key: 'marine',
    name: 'Մարինե Սարգսյան',
    category: 'childcare',
    services: [
      { slug: 'live-in-nanny', amount: 250000, unit: 'MONTH' },
    ],
    attributes: ['schedule-full-time', 'schedule-monthly', 'schedule-permanent', 'place-client-home', 'place-live-in'],
    birthYear: 1978,
    education: 'VOCATIONAL',
    home: 'gyumri',
    areas: ['gyumri', 'artik'],
    years: 12,
    languages: ['hy', 'ru'],
    headline: 'Փորձառու դայակ Գյումրիում',
    bio: 'Տասներկու տարի խնամում եմ փոքրիկների։ Պատրաստում եմ առողջ սնունդ, պահպանում քնի ռեժիմը և ամեն օր տեղեկացնում ծնողներին։',
    verified: [{ kind: 'IDENTITY', title: 'Անձը հաստատող փաստաթուղթ' }],
    schedule: [[[1, 2, 3, 4, 5], '08:00', '18:00']],
  },
  {
    key: 'gayane',
    name: 'Գայանե Պետրոսյան',
    category: 'elderly-care',
    services: [
      { slug: 'elderly-daily-care', amount: 2500, unit: 'HOUR' },
      { slug: 'elderly-companionship', amount: 2000, unit: 'HOUR' },
    ],
    attributes: ['schedule-hourly', 'schedule-part-time', 'place-client-home'],
    birthYear: 1972,
    education: 'BACHELOR',
    home: 'yerevan-kentron',
    areas: ['yerevan'],
    years: 10,
    languages: ['hy', 'ru'],
    headline: 'Ամենօրյա օգնություն տարեցներին',
    bio: 'Օգնում եմ տարեցներին կենցաղում՝ սնունդ, գնումներ, զբոսանք և ընկերակցություն։ Աշխատում եմ համբերատար և հարգանքով։',
    translations: { ru: { headline: 'Ежедневная помощь пожилым', bio: 'Помогаю пожилым людям в быту: еда, покупки, прогулки и общение. Работаю терпеливо и с уважением.' } },
    verified: [
      { kind: 'IDENTITY', title: 'Անձը հաստատող փաստաթուղթ' },
      { kind: 'FIRST_AID', title: 'Առաջին օգնության դասընթացի վկայական' },
    ],
    schedule: [[[1, 2, 3, 4, 5, 6], '09:00', '18:00']],
  },
  {
    key: 'armen',
    name: 'Արմեն Ավետիսյան',
    category: 'elderly-care',
    services: [
      { slug: 'elderly-night-care', amount: 14000, unit: 'DAY' },
      { slug: 'elderly-limited-mobility', amount: 2200, unit: 'HOUR' },
    ],
    attributes: ['schedule-night', 'schedule-round-the-clock', 'place-client-home', 'place-hospital'],
    birthYear: 1980,
    education: 'VOCATIONAL',
    home: 'yerevan-nor-nork',
    areas: ['yerevan-nor-nork', 'yerevan-avan', 'yerevan-kanaker-zeytun'],
    years: 6,
    languages: ['hy', 'ru'],
    headline: 'Գիշերային խնամք և օգնություն տեղաշարժվելիս',
    bio: 'Աջակցում եմ տարեցներին, որոնց տեղաշարժվելու համար օգնություն է պետք։ Կարող եմ մնալ գիշերը՝ տանը կամ հիվանդանոցում։',
    verified: [],
    schedule: [
      [[1, 2, 3, 4, 5, 6, 7], '20:00', '24:00'],
      [[1, 3, 5], '09:00', '15:00'],
    ],
  },
  {
    key: 'susanna',
    name: 'Սուսաննա Կարապետյան',
    category: 'elderly-care',
    services: [
      { slug: 'elderly-meals-feeding', amount: 60000, unit: 'WEEK' },
    ],
    attributes: ['schedule-weekly', 'schedule-daily', 'place-client-home'],
    birthYear: 1965,
    education: 'SECONDARY',
    home: 'vanadzor',
    areas: ['vanadzor', 'spitak'],
    years: 15,
    languages: ['hy', 'ru'],
    headline: 'Ցերեկային խնամք Վանաձորում',
    bio: 'Երկար տարիներ խնամել եմ ընտանիքիս տարեց անդամներին, այժմ օգնում եմ այլ ընտանիքների։ Պատրաստում եմ սնունդ, ուղեկցում զբոսանքի։',
    verified: [{ kind: 'IDENTITY', title: 'Անձը հաստատող փաստաթուղթ' }],
    schedule: [[[1, 2, 3, 4, 5], '10:00', '17:00']],
  },
  {
    key: 'hasmik',
    name: 'Հասմիկ Մկրտչյան',
    category: 'nursing',
    services: [
      { slug: 'nursing-injections', amount: 3000, unit: 'VISIT' },
      { slug: 'nursing-iv-drips', amount: 6000, unit: 'VISIT' },
      { slug: 'nursing-home-visits', amount: 4000, unit: 'HOUR' },
    ],
    attributes: ['schedule-hourly', 'place-client-home', 'place-hospital', 'place-online'],
    birthYear: 1983,
    education: 'MASTER',
    home: 'yerevan-arabkir',
    areas: ['yerevan-arabkir', 'yerevan-kentron', 'yerevan-ajapnyak'],
    years: 18,
    languages: ['hy', 'ru', 'en'],
    headline: 'Բուժքույր՝ տնային և հիվանդանոցային խնամք',
    bio: 'Բուժքույր եմ՝ տասնութ տարվա փորձով։ Բուժքույրական ծառայությունները մատուցում եմ բժշկի նշանակումների համաձայն, իսկ ոչ բժշկական խնամքը՝ ընտանիքի հետ համաձայնեցված։',
    verified: [
      { kind: 'IDENTITY', title: 'Անձը հաստատող փաստաթուղթ' },
      { kind: 'NURSING_LICENSE', title: 'Բուժքրոջ մասնագիտական որակավորում' },
    ],
    schedule: [[[1, 2, 3, 4, 5], '08:00', '20:00']],
  },
  {
    key: 'tatevik',
    name: 'Տաթևիկ Վարդանյան',
    category: 'patient-care',
    services: [
      { slug: 'patient-post-surgery', amount: 2000, unit: 'HOUR' },
      { slug: 'patient-hospital-escort', amount: null, unit: 'DAY' },
    ],
    attributes: ['schedule-hourly', 'schedule-temporary', 'place-hospital', 'place-client-home'],
    birthYear: 1988,
    education: 'VOCATIONAL',
    home: 'yerevan-erebuni',
    areas: ['yerevan-erebuni', 'yerevan-shengavit', 'yerevan-nubarashen'],
    years: 4,
    languages: ['hy'],
    headline: 'Ոչ բժշկական խնամք և ուղեկցում հիվանդանոցում',
    bio: 'Մնում եմ հիվանդի կողքին հիվանդանոցում, օգնում սնվելիս և կապ պահում ընտանիքի հետ։ Բժշկական միջամտություններ չեմ կատարում։',
    verified: [],
    schedule: [[[1, 2, 3, 4, 5, 6, 7], '08:00', '22:00']],
  },
  {
    key: 'karen',
    name: 'Կարեն Խաչատրյան',
    category: 'patient-care',
    services: [
      { slug: 'patient-rehabilitation', amount: 2500, unit: 'HOUR' },
    ],
    attributes: ['schedule-part-time', 'place-client-home'],
    birthYear: 1985,
    education: 'BACHELOR',
    startsInDays: 21,
    home: 'abovyan',
    areas: ['abovyan', 'charentsavan', 'nor-hachn'],
    years: 7,
    languages: ['hy', 'ru'],
    headline: 'Աջակցություն վերականգնման շրջանում',
    bio: 'Օգնում եմ վիրահատությունից կամ հիվանդությունից հետո վերականգնվողներին՝ տեղաշարժ, զբոսանք, կենցաղային հարցեր։',
    verified: [{ kind: 'IDENTITY', title: 'Անձը հաստատող փաստաթուղթ' }],
    schedule: [[[1, 2, 3, 4, 5, 6], '09:00', '19:00']],
  },
  {
    key: 'mane',
    name: 'Մանե Ղազարյան',
    category: 'pet-care',
    services: [
      { slug: 'dog-walking', amount: 2000, unit: 'VISIT' },
      { slug: 'pet-sitting', amount: 2500, unit: 'VISIT' },
    ],
    attributes: ['schedule-hourly', 'schedule-daily', 'place-client-home'],
    birthYear: 2000,
    education: 'BACHELOR',
    home: 'yerevan-arabkir',
    areas: ['yerevan-arabkir', 'yerevan-kentron', 'yerevan-kanaker-zeytun'],
    years: 2,
    languages: ['hy', 'en'],
    headline: 'Շների զբոսանք և այցեր տուն',
    bio: 'Զբոսնում եմ շների հետ ցանկացած եղանակին և այցելում եմ կատուներին, երբ տերերը բացակայում են։ Ամեն այցից հետո ուղարկում եմ լուսանկար։',
    verified: [],
    schedule: [[[1, 2, 3, 4, 5, 6, 7], '07:00', '21:00']],
  },
  {
    key: 'davit',
    name: 'Դավիթ Մելքոնյան',
    category: 'pet-care',
    services: [
      { slug: 'pet-boarding', amount: 6000, unit: 'DAY' },
      { slug: 'pet-cat-care', amount: 3000, unit: 'VISIT' },
    ],
    attributes: ['schedule-daily', 'schedule-weekly', 'place-caregiver-home'],
    birthYear: 1992,
    education: 'BACHELOR',
    home: 'vagharshapat',
    areas: ['vagharshapat', 'armavir-city', 'metsamor'],
    years: 5,
    languages: ['hy', 'ru'],
    headline: 'Կենդանիների ժամանակավոր խնամք բակով տանը',
    bio: 'Անասնաբույժի օգնական եմ եղել։ Ընդունում եմ փոքր և միջին չափսի կենդանիներ իմ տանը՝ ապահով բակով։',
    verified: [{ kind: 'VETERINARY', title: 'Անասնաբուժական օգնականի վկայական' }],
    schedule: [[[1, 2, 3, 4, 5, 6, 7], '00:00', '24:00']],
  },
  {
    key: 'sona',
    name: 'Սոնա Աբրահամյան',
    category: 'pet-care',
    services: [
      { slug: 'pet-other-care', amount: 2000, unit: 'VISIT' },
    ],
    attributes: ['schedule-hourly', 'place-client-home', 'place-online'],
    birthYear: 1997,
    education: 'MASTER',
    home: 'yerevan-nork-marash',
    areas: ['yerevan-nork-marash', 'yerevan-kentron'],
    years: 3,
    languages: ['hy', 'ru', 'en'],
    headline: 'Այցեր կատուներին և թռչուններին',
    bio: 'Կերակրում եմ, մաքրում և ժամանակ անցկացնում ձեր ընտանի կենդանիների հետ, մինչ դուք ճամփորդում եք։',
    verified: [{ kind: 'IDENTITY', title: 'Անձը հաստատող փաստաթուղթ' }],
    schedule: [[[1, 2, 3, 4, 5, 6, 7], '08:00', '20:00']],
  },
  {
    key: 'elen',
    name: 'Էլեն Հարությունյան',
    category: 'childcare',
    services: [
      { slug: 'child-preschool-care', amount: 2000, unit: 'HOUR' },
    ],
    attributes: ['schedule-hourly', 'schedule-part-time', 'place-client-home'],
    birthYear: 2001,
    education: 'SECONDARY',
    home: 'dilijan',
    areas: ['dilijan', 'ijevan'],
    years: 4,
    languages: ['en', 'hy', 'ru'],
    originalLocale: 'en',
    headline: 'Babysitter in Dilijan, outdoor play',
    bio: 'I grew up in Dilijan and love outdoor activities with kids: forest walks, crafts and simple science games. I speak Armenian, English and Russian.',
    verified: [],
    schedule: [[[5, 6, 7], '10:00', '20:00']],
  },
  {
    key: 'anush',
    name: 'Անուշ Ավետիսյան',
    category: 'disability-care',
    services: [
      { slug: 'disability-wheelchair', amount: 2500, unit: 'HOUR' },
      { slug: 'disability-personal-hygiene', amount: 2500, unit: 'HOUR' },
    ],
    attributes: ['schedule-hourly', 'schedule-full-time', 'place-client-home'],
    birthYear: 1986,
    education: 'VOCATIONAL',
    home: 'yerevan-nor-nork',
    areas: ['yerevan-nor-nork', 'yerevan-avan', 'yerevan-kanaker-zeytun'],
    years: 7,
    languages: ['hy', 'ru'],
    headline: 'Օգնական սայլակ օգտագործող անձանց համար',
    bio: 'Յոթ տարի աշխատում եմ ֆիզիկական սահմանափակումներ ունեցող մարդկանց հետ։ Օգնում եմ հիգիենայում, տեղաշարժվելիս և առօրյա գործերում՝ հարգելով անձի ինքնուրույնությունը։',
    verified: [
      { kind: 'IDENTITY', title: 'Անձը հաստատող փաստաթուղթ' },
      { kind: 'FIRST_AID', title: 'Առաջին օգնության դասընթացի վկայական' },
    ],
    schedule: [[[1, 2, 3, 4, 5, 6], '09:00', '18:00']],
  },
  {
    key: 'gor',
    name: 'Գոռ Բաբայան',
    category: 'personal-assistance',
    services: [
      { slug: 'assistant-doctor-escort', amount: 3000, unit: 'HOUR' },
      { slug: 'assistant-paperwork', amount: null, unit: 'HOUR' },
      { slug: 'assistant-shopping', amount: 2000, unit: 'VISIT' },
    ],
    attributes: ['schedule-hourly', 'schedule-part-time', 'place-client-home', 'place-online'],
    birthYear: 1995,
    education: 'BACHELOR',
    home: 'yerevan-kentron',
    areas: ['yerevan'],
    years: 4,
    languages: ['hy', 'ru', 'en'],
    headline: 'Անձնական օգնական՝ գործեր, գնումներ, ուղեկցում',
    bio: 'Օգնում եմ տարեցներին և զբաղված ընտանիքներին առօրյա գործերում՝ գնումներ, բժշկի մոտ ուղեկցում, փաստաթղթերի կազմակերպում։ Ունեմ մեքենա։',
    verified: [{ kind: 'IDENTITY', title: 'Անձը հաստատող փաստաթուղթ' }],
    schedule: [[[1, 2, 3, 4, 5], '10:00', '19:00']],
  },
  {
    key: 'zara',
    name: 'Զարա Մելքոնյան',
    category: 'home-help',
    services: [
      { slug: 'home-cleaning', amount: 2500, unit: 'HOUR' },
      { slug: 'home-cooking', amount: 2500, unit: 'HOUR' },
      { slug: 'home-housekeeping', amount: 220000, unit: 'MONTH' },
    ],
    attributes: ['schedule-hourly', 'schedule-weekly', 'schedule-permanent', 'place-client-home'],
    birthYear: 1979,
    education: 'SECONDARY',
    home: 'yerevan-arabkir',
    areas: ['yerevan-arabkir', 'yerevan-kentron', 'yerevan-ajapnyak', 'yerevan-davtashen'],
    years: 15,
    languages: ['hy', 'ru'],
    headline: 'Տնային օգնական՝ մաքրություն և ճաշ',
    bio: 'Տասնհինգ տարի օգնում եմ ընտանիքներին տան գործերում՝ մաքրություն, ճաշի պատրաստում, լվացք։ Աշխատում եմ ճշտապահ և կոկիկ։',
    verified: [{ kind: 'IDENTITY', title: 'Անձը հաստատող փաստաթուղթ' }],
    schedule: [[[1, 3, 5], '09:00', '17:00']],
  },
  {
    key: 'ruzanna',
    name: 'Ռուզաննա Դանիելյան',
    category: 'elderly-care',
    services: [
      { slug: 'elderly-companionship', amount: 1800, unit: 'HOUR' },
    ],
    attributes: ['schedule-part-time', 'place-client-home'],
    birthYear: 1968,
    education: 'SECONDARY',
    home: 'ashtarak',
    areas: ['ashtarak'],
    years: 2,
    languages: ['hy'],
    headline: 'Ընկերակցություն տարեցներին Աշտարակում',
    bio: 'Կցանկանայի օգնել տարեցներին իմ քաղաքում՝ զրույց, զբոսանք, կարդալ միասին։ Սա իմ դիմումն է՝ սպասում է ստուգման։',
    verified: [],
    schedule: [[[2, 4, 6], '11:00', '17:00']],
    status: 'PENDING',
  },
];

const DEMO_PASSWORD = 'CarelyDemo2026!';

async function seedDemo() {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true') {
    throw new Error('Demo seed refused: requires DEMO_MODE=true and NODE_ENV != production.');
  }
  if (await prisma.user.findUnique({ where: { email: 'admin@carely.local' } })) {
    console.log('Demo data already present — skipping. Reset the local database to re-seed.');
    return;
  }
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const loc = async (slug: string) => (await prisma.location.findUniqueOrThrow({ where: { slug } })).id;

  const admin = await prisma.user.create({ data: { email: 'admin@carely.local', name: 'Carely Admin (demo)', passwordHash, isAdmin: true, isDemo: true } });
  const customer = await prisma.user.create({ data: { email: 'customer@carely.local', name: 'Արփինե Հակոբյան', phone: '+37491000001', passwordHash, isDemo: true } });
  const customer2 = await prisma.user.create({ data: { email: 'customer2@carely.local', name: 'Тигран Арутюнов', phone: '+37491000002', passwordHash, locale: 'ru', isDemo: true } });

  const profiles: Record<string, { id: string; userId: string; services: Record<string, { id: string; amount: number | null; unit: any }> }> = {};
  let i = 0;
  for (const p of PROS) {
    i++;
    const user = await prisma.user.create({
      data: { email: `${p.key}@carely.local`, name: p.name, phone: `+3749310${String(i).padStart(4, '0')}`, passwordHash, isDemo: true, locale: p.originalLocale ?? 'hy' },
    });
    const cat = await prisma.category.findUniqueOrThrow({ where: { slug: p.category } });
    const original = p.originalLocale ?? 'hy';
    const status = p.status ?? 'APPROVED';
    const prof = await prisma.professionalProfile.create({
      data: {
        userId: user.id,
        slug: `demo-${p.key}`,
        status,
        displayName: p.name,
        originalLocale: original,
        categoryId: cat.id,
        homeLocationId: await loc(p.home),
        experienceYears: p.years,
        birthYear: p.birthYear,
        educationLevel: p.education,
        availableFrom: p.startsInDays ? new Date(addDays(utcToZonedDate(new Date()), p.startsInDays)) : null,
        onboardingStep: 9,
        submittedAt: new Date(Date.now() - 20 * 86400_000),
        approvedAt: status === 'APPROVED' ? new Date(Date.now() - 15 * 86400_000) : null,
        isDemo: true,
        translations: {
          create: [{ locale: original, headline: p.headline, bio: p.bio }, ...Object.entries(p.translations ?? {}).map(([locale, t]) => ({ locale: locale as Locale, ...t! }))],
        },
        languages: { create: p.languages.map((code) => ({ code })) },
      },
    });
    const services: Record<string, { id: string; amount: number | null; unit: any }> = {};
    for (const s of p.services) {
      const svc = await prisma.service.findUniqueOrThrow({ where: { slug: s.slug } });
      await prisma.professionalService.create({
        data: { profileId: prof.id, serviceId: svc.id, priceKind: s.amount == null ? 'NEGOTIABLE' : 'FIXED', priceAmount: s.amount, priceUnit: s.unit },
      });
      services[s.slug] = { id: svc.id, amount: s.amount, unit: s.unit };
    }
    for (const slug of p.attributes) {
      const a = await prisma.careAttribute.findUniqueOrThrow({ where: { slug } });
      await prisma.professionalAttribute.create({ data: { profileId: prof.id, attributeId: a.id } });
    }
    for (const slug of p.areas) await prisma.serviceArea.create({ data: { profileId: prof.id, locationId: await loc(slug) } });
    for (const v of p.verified) {
      await prisma.qualification.create({
        data: { profileId: prof.id, kind: v.kind, title: v.title, status: 'VERIFIED', verifiedAt: new Date(Date.now() - 14 * 86400_000), verifiedById: admin.id, reviewedAt: new Date(), internalNote: 'Demo: no document attached' },
      });
    }
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    for (const [days, s, e] of p.schedule) {
      for (const d of days) await prisma.availabilityRule.create({ data: { profileId: prof.id, weekday: d, startMinute: toMin(s), endMinute: toMin(e) } });
    }
    const hourly = p.services.filter((s) => s.unit === 'HOUR' && s.amount).map((s) => s.amount!);
    if (hourly.length) await prisma.professionalProfile.update({ where: { id: prof.id }, data: { minHourlyPrice: Math.min(...hourly) } });
    profiles[p.key] = { id: prof.id, userId: user.id, services };
  }

  // Requests across the lifecycle with coherent timestamps.
  const today = utcToZonedDate(new Date());
  const yerevanCity = await loc('yerevan-arabkir');
  const mk = async (opts: {
    customerId: string;
    pro: string;
    service: string;
    date: string;
    start: number;
    end: number;
    status: 'SUBMITTED' | 'ACCEPTED' | 'CONFIRMED' | 'COMPLETED' | 'DECLINED' | 'CANCELLED';
    location?: string;
    requirements?: string;
  }) => {
    const pr = profiles[opts.pro];
    const svc = pr.services[opts.service];
    const [occ] = expandSchedule({ startDate: opts.date, endDate: opts.date, startMinute: opts.start, endMinute: opts.end });
    const createdAt = new Date(Math.min(Date.now(), occ.startAt.getTime()) - 5 * 86400_000);
    const r = await prisma.careRequest.create({
      data: {
        customerId: opts.customerId,
        professionalId: pr.id,
        serviceId: svc.id,
        locationId: opts.location ? await loc(opts.location) : yerevanCity,
        status: opts.status,
        scheduleType: 'ONE_TIME',
        startAt: occ.startAt,
        endAt: occ.endAt,
        startDate: opts.date,
        startMinute: opts.start,
        endMinute: opts.end,
        requirements: opts.requirements ?? '',
        priceKind: svc.amount == null ? 'NEGOTIABLE' : 'FIXED',
        priceAmount: svc.amount,
        priceUnit: svc.unit,
        isDemo: true,
        createdAt,
        acceptedAt: ['ACCEPTED', 'CONFIRMED', 'COMPLETED'].includes(opts.status) ? new Date(createdAt.getTime() + 3600_000) : null,
        expiresAt: opts.status === 'ACCEPTED' ? new Date(Date.now() + 40 * 3600_000) : null,
        confirmedAt: ['CONFIRMED', 'COMPLETED'].includes(opts.status) ? new Date(createdAt.getTime() + 7200_000) : null,
        completedAt: opts.status === 'COMPLETED' ? occ.endAt : null,
        cancelledAt: opts.status === 'CANCELLED' ? new Date(createdAt.getTime() + 86400_000) : null,
        cancelReason: opts.status === 'CANCELLED' ? 'Ծրագրերը փոխվել են (դեմո)' : null,
        declineReason: opts.status === 'DECLINED' ? 'Այդ օրը զբաղված եմ (դեմո)' : null,
      },
    });
    const ev: Prisma.RequestEventCreateManyInput[] = [{ requestId: r.id, actorId: opts.customerId, actorRole: 'CUSTOMER', type: 'CREATED', toStatus: 'SUBMITTED', createdAt }];
    const t = (h: number) => new Date(createdAt.getTime() + h * 3600_000);
    if (['ACCEPTED', 'CONFIRMED', 'COMPLETED'].includes(opts.status)) ev.push({ requestId: r.id, actorId: pr.userId, actorRole: 'PROFESSIONAL', type: 'ACCEPTED', fromStatus: 'SUBMITTED', toStatus: 'ACCEPTED', createdAt: t(1) });
    if (['CONFIRMED', 'COMPLETED'].includes(opts.status)) ev.push({ requestId: r.id, actorId: opts.customerId, actorRole: 'CUSTOMER', type: 'CONFIRMED', fromStatus: 'ACCEPTED', toStatus: 'CONFIRMED', createdAt: t(2) });
    if (opts.status === 'COMPLETED') ev.push({ requestId: r.id, actorId: pr.userId, actorRole: 'PROFESSIONAL', type: 'COMPLETED', fromStatus: 'CONFIRMED', toStatus: 'COMPLETED', createdAt: occ.endAt });
    if (opts.status === 'DECLINED') ev.push({ requestId: r.id, actorId: pr.userId, actorRole: 'PROFESSIONAL', type: 'DECLINED', fromStatus: 'SUBMITTED', toStatus: 'DECLINED', note: r.declineReason, createdAt: t(3) });
    if (opts.status === 'CANCELLED') ev.push({ requestId: r.id, actorId: opts.customerId, actorRole: 'CUSTOMER', type: 'CANCELLED', fromStatus: 'SUBMITTED', toStatus: 'CANCELLED', note: r.cancelReason, createdAt: t(24) });
    await prisma.requestEvent.createMany({ data: ev });
    if (['CONFIRMED', 'COMPLETED'].includes(opts.status)) {
      await prisma.bookingOccurrence.create({ data: { requestId: r.id, professionalId: pr.id, startAt: occ.startAt, endAt: occ.endAt } });
    }
    return r;
  };

  await mk({ customerId: customer.id, pro: 'ani', service: 'child-toddler-care', date: addDays(today, 6), start: 10 * 60, end: 14 * 60, status: 'CONFIRMED', requirements: 'Երեխան 3 տարեկան է, սիրում է զբոսնել այգում։' });
  const submitted = await mk({ customerId: customer.id, pro: 'gayane', service: 'elderly-companionship', date: addDays(today, 4), start: 11 * 60, end: 14 * 60, status: 'SUBMITTED', location: 'yerevan-kentron' });
  const accepted = await mk({ customerId: customer.id, pro: 'hasmik', service: 'nursing-home-visits', date: addDays(today, 3), start: 9 * 60, end: 13 * 60, status: 'ACCEPTED', location: 'yerevan-kentron' });
  const done1 = await mk({ customerId: customer.id, pro: 'mane', service: 'dog-walking', date: addDays(today, -10), start: 8 * 60, end: 9 * 60, status: 'COMPLETED' });
  const done2 = await mk({ customerId: customer2.id, pro: 'ani', service: 'child-preschool-care', date: addDays(today, -6), start: 18 * 60, end: 22 * 60, status: 'COMPLETED' });
  await mk({ customerId: customer2.id, pro: 'gayane', service: 'elderly-daily-care', date: addDays(today, -3), start: 10 * 60, end: 13 * 60, status: 'COMPLETED', location: 'yerevan-kentron' });
  await mk({ customerId: customer2.id, pro: 'davit', service: 'pet-boarding', date: addDays(today, 9), start: 9 * 60, end: 18 * 60, status: 'DECLINED', location: 'vagharshapat' });
  await mk({ customerId: customer2.id, pro: 'lilit', service: 'child-newborn-care', date: addDays(today, 8), start: 11 * 60, end: 15 * 60, status: 'CANCELLED', location: 'yerevan-shengavit' });

  // Reviews: one published (counts toward rating), one pending moderation. Both visibly demo content.
  await prisma.review.create({
    data: { requestId: done1.id, customerId: customer.id, profileId: profiles.mane.id, rating: 5, body: 'Մանեն ճշտապահ էր և ուղարկեց լուսանկարներ զբոսանքից։ (Դեմո կարծիք)', contactPhone: '+37491000001', locale: 'hy', status: 'PUBLISHED', moderatedAt: new Date(), moderatedBy: admin.id, isDemo: true },
  });
  await ratingTransaction(prisma, (tx) => recomputeProfessionalRating(tx, profiles.mane.id));
  await prisma.review.create({
    data: { requestId: done2.id, customerId: customer2.id, profileId: profiles.ani.id, rating: 4, body: 'Аня отлично поладила с детьми, но опоздала на 15 минут. (Демо-отзыв)', contactPhone: '+37491000002', locale: 'ru', status: 'PENDING', isDemo: true },
  });

  await prisma.supportInquiry.create({
    data: { name: 'Demo visitor', email: 'visitor@example.com', topic: 'GENERAL', message: 'Ի՞նչ է նշանակում «ինքնությունը ստուգված է»։ (Դեմո հարցում)', locale: 'hy' },
  });

  await prisma.notification.createMany({
    data: [
      { userId: profiles.gayane.userId, type: 'REQUEST_SUBMITTED', params: { requestId: submitted.id, name: customer.name } },
      { userId: customer.id, type: 'REQUEST_ACCEPTED', params: { requestId: accepted.id, expiresAt: accepted.expiresAt!.toISOString() } },
    ],
  });

  console.log('\nDemo data created (fictitious). Local accounts — password for all:', DEMO_PASSWORD);
  console.log('  admin@carely.local      administrator');
  console.log('  customer@carely.local   customer (hy)');
  console.log('  customer2@carely.local  customer (ru)');
  console.log('  ani@carely.local …      professionals (see README)\n');
}

async function main() {
  await seedReference();
  if (process.argv.includes('--demo')) await seedDemo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
