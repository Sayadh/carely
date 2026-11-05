/* Armenian administrative geography (localized). Categories/services are code-managed in packages/shared/src/taxonomy. */

export type T3 = { hy: string; ru: string; en: string };

export interface RegionSeed {
  slug: string;
  name: T3;
  children: { slug: string; type: 'CITY' | 'DISTRICT'; name: T3 }[];
}

/** Yerevan (with its 12 administrative districts) and the 10 marzes with major towns. */
export const REGIONS: RegionSeed[] = [
  {
    slug: 'yerevan',
    name: { hy: 'Երևան', ru: 'Ереван', en: 'Yerevan' },
    children: [
      { slug: 'yerevan-ajapnyak', type: 'DISTRICT', name: { hy: 'Աջափնյակ', ru: 'Аджапняк', en: 'Ajapnyak' } },
      { slug: 'yerevan-arabkir', type: 'DISTRICT', name: { hy: 'Արաբկիր', ru: 'Арабкир', en: 'Arabkir' } },
      { slug: 'yerevan-avan', type: 'DISTRICT', name: { hy: 'Ավան', ru: 'Аван', en: 'Avan' } },
      { slug: 'yerevan-davtashen', type: 'DISTRICT', name: { hy: 'Դավթաշեն', ru: 'Давташен', en: 'Davtashen' } },
      { slug: 'yerevan-erebuni', type: 'DISTRICT', name: { hy: 'Էրեբունի', ru: 'Эребуни', en: 'Erebuni' } },
      { slug: 'yerevan-kanaker-zeytun', type: 'DISTRICT', name: { hy: 'Քանաքեռ-Զեյթուն', ru: 'Канакер-Зейтун', en: 'Kanaker-Zeytun' } },
      { slug: 'yerevan-kentron', type: 'DISTRICT', name: { hy: 'Կենտրոն', ru: 'Кентрон', en: 'Kentron' } },
      { slug: 'yerevan-malatia-sebastia', type: 'DISTRICT', name: { hy: 'Մալաթիա-Սեբաստիա', ru: 'Малатия-Себастия', en: 'Malatia-Sebastia' } },
      { slug: 'yerevan-nork-marash', type: 'DISTRICT', name: { hy: 'Նորք-Մարաշ', ru: 'Норк-Мараш', en: 'Nork-Marash' } },
      { slug: 'yerevan-nor-nork', type: 'DISTRICT', name: { hy: 'Նոր Նորք', ru: 'Нор-Норк', en: 'Nor Nork' } },
      { slug: 'yerevan-nubarashen', type: 'DISTRICT', name: { hy: 'Նուբարաշեն', ru: 'Нубарашен', en: 'Nubarashen' } },
      { slug: 'yerevan-shengavit', type: 'DISTRICT', name: { hy: 'Շենգավիթ', ru: 'Шенгавит', en: 'Shengavit' } },
    ],
  },
  {
    slug: 'aragatsotn',
    name: { hy: 'Արագածոտնի մարզ', ru: 'Арагацотнская область', en: 'Aragatsotn Province' },
    children: [
      { slug: 'ashtarak', type: 'CITY', name: { hy: 'Աշտարակ', ru: 'Аштарак', en: 'Ashtarak' } },
      { slug: 'aparan', type: 'CITY', name: { hy: 'Ապարան', ru: 'Апаран', en: 'Aparan' } },
      { slug: 'talin', type: 'CITY', name: { hy: 'Թալին', ru: 'Талин', en: 'Talin' } },
    ],
  },
  {
    slug: 'ararat',
    name: { hy: 'Արարատի մարզ', ru: 'Араратская область', en: 'Ararat Province' },
    children: [
      { slug: 'artashat', type: 'CITY', name: { hy: 'Արտաշատ', ru: 'Арташат', en: 'Artashat' } },
      { slug: 'ararat-city', type: 'CITY', name: { hy: 'Արարատ', ru: 'Арарат', en: 'Ararat' } },
      { slug: 'masis', type: 'CITY', name: { hy: 'Մասիս', ru: 'Масис', en: 'Masis' } },
      { slug: 'vedi', type: 'CITY', name: { hy: 'Վեդի', ru: 'Веди', en: 'Vedi' } },
    ],
  },
  {
    slug: 'armavir',
    name: { hy: 'Արմավիրի մարզ', ru: 'Армавирская область', en: 'Armavir Province' },
    children: [
      { slug: 'armavir-city', type: 'CITY', name: { hy: 'Արմավիր', ru: 'Армавир', en: 'Armavir' } },
      { slug: 'vagharshapat', type: 'CITY', name: { hy: 'Վաղարշապատ', ru: 'Вагаршапат', en: 'Vagharshapat' } },
      { slug: 'metsamor', type: 'CITY', name: { hy: 'Մեծամոր', ru: 'Мецамор', en: 'Metsamor' } },
    ],
  },
  {
    slug: 'gegharkunik',
    name: { hy: 'Գեղարքունիքի մարզ', ru: 'Гегаркуникская область', en: 'Gegharkunik Province' },
    children: [
      { slug: 'gavar', type: 'CITY', name: { hy: 'Գավառ', ru: 'Гавар', en: 'Gavar' } },
      { slug: 'sevan', type: 'CITY', name: { hy: 'Սևան', ru: 'Севан', en: 'Sevan' } },
      { slug: 'martuni', type: 'CITY', name: { hy: 'Մարտունի', ru: 'Мартуни', en: 'Martuni' } },
      { slug: 'vardenis', type: 'CITY', name: { hy: 'Վարդենիս', ru: 'Варденис', en: 'Vardenis' } },
      { slug: 'chambarak', type: 'CITY', name: { hy: 'Ճամբարակ', ru: 'Чамбарак', en: 'Chambarak' } },
    ],
  },
  {
    slug: 'kotayk',
    name: { hy: 'Կոտայքի մարզ', ru: 'Котайкская область', en: 'Kotayk Province' },
    children: [
      { slug: 'hrazdan', type: 'CITY', name: { hy: 'Հրազդան', ru: 'Раздан', en: 'Hrazdan' } },
      { slug: 'abovyan', type: 'CITY', name: { hy: 'Աբովյան', ru: 'Абовян', en: 'Abovyan' } },
      { slug: 'charentsavan', type: 'CITY', name: { hy: 'Չարենցավան', ru: 'Чаренцаван', en: 'Charentsavan' } },
      { slug: 'yeghvard', type: 'CITY', name: { hy: 'Եղվարդ', ru: 'Егвард', en: 'Yeghvard' } },
      { slug: 'nor-hachn', type: 'CITY', name: { hy: 'Նոր Հաճն', ru: 'Нор Ачин', en: 'Nor Hachn' } },
      { slug: 'tsaghkadzor', type: 'CITY', name: { hy: 'Ծաղկաձոր', ru: 'Цахкадзор', en: 'Tsaghkadzor' } },
    ],
  },
  {
    slug: 'lori',
    name: { hy: 'Լոռու մարզ', ru: 'Лорийская область', en: 'Lori Province' },
    children: [
      { slug: 'vanadzor', type: 'CITY', name: { hy: 'Վանաձոր', ru: 'Ванадзор', en: 'Vanadzor' } },
      { slug: 'alaverdi', type: 'CITY', name: { hy: 'Ալավերդի', ru: 'Алаверди', en: 'Alaverdi' } },
      { slug: 'stepanavan', type: 'CITY', name: { hy: 'Ստեփանավան', ru: 'Степанаван', en: 'Stepanavan' } },
      { slug: 'spitak', type: 'CITY', name: { hy: 'Սպիտակ', ru: 'Спитак', en: 'Spitak' } },
    ],
  },
  {
    slug: 'shirak',
    name: { hy: 'Շիրակի մարզ', ru: 'Ширакская область', en: 'Shirak Province' },
    children: [
      { slug: 'gyumri', type: 'CITY', name: { hy: 'Գյումրի', ru: 'Гюмри', en: 'Gyumri' } },
      { slug: 'artik', type: 'CITY', name: { hy: 'Արթիկ', ru: 'Артик', en: 'Artik' } },
      { slug: 'maralik', type: 'CITY', name: { hy: 'Մարալիկ', ru: 'Маралик', en: 'Maralik' } },
    ],
  },
  {
    slug: 'syunik',
    name: { hy: 'Սյունիքի մարզ', ru: 'Сюникская область', en: 'Syunik Province' },
    children: [
      { slug: 'kapan', type: 'CITY', name: { hy: 'Կապան', ru: 'Капан', en: 'Kapan' } },
      { slug: 'goris', type: 'CITY', name: { hy: 'Գորիս', ru: 'Горис', en: 'Goris' } },
      { slug: 'sisian', type: 'CITY', name: { hy: 'Սիսիան', ru: 'Сисиан', en: 'Sisian' } },
      { slug: 'kajaran', type: 'CITY', name: { hy: 'Քաջարան', ru: 'Каджаран', en: 'Kajaran' } },
      { slug: 'meghri', type: 'CITY', name: { hy: 'Մեղրի', ru: 'Мегри', en: 'Meghri' } },
    ],
  },
  {
    slug: 'vayots-dzor',
    name: { hy: 'Վայոց ձորի մարզ', ru: 'Вайоцдзорская область', en: 'Vayots Dzor Province' },
    children: [
      { slug: 'yeghegnadzor', type: 'CITY', name: { hy: 'Եղեգնաձոր', ru: 'Ехегнадзор', en: 'Yeghegnadzor' } },
      { slug: 'vayk', type: 'CITY', name: { hy: 'Վայք', ru: 'Вайк', en: 'Vayk' } },
      { slug: 'jermuk', type: 'CITY', name: { hy: 'Ջերմուկ', ru: 'Джермук', en: 'Jermuk' } },
    ],
  },
  {
    slug: 'tavush',
    name: { hy: 'Տավուշի մարզ', ru: 'Тавушская область', en: 'Tavush Province' },
    children: [
      { slug: 'ijevan', type: 'CITY', name: { hy: 'Իջևան', ru: 'Иджеван', en: 'Ijevan' } },
      { slug: 'dilijan', type: 'CITY', name: { hy: 'Դիլիջան', ru: 'Дилижан', en: 'Dilijan' } },
      { slug: 'berd', type: 'CITY', name: { hy: 'Բերդ', ru: 'Берд', en: 'Berd' } },
      { slug: 'noyemberyan', type: 'CITY', name: { hy: 'Նոյեմբերյան', ru: 'Ноемберян', en: 'Noyemberyan' } },
    ],
  },
];
