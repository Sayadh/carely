/** Russian needs three plural forms: one (1, 21…), few (2–4, 22–24…), many (0, 5–20…). */
function ruPlural(choice: number, choicesLength: number) {
  if (choicesLength < 3) return choice === 1 ? 0 : 1;
  const n = Math.abs(choice) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return 2;
  if (n1 === 1) return 0;
  if (n1 >= 2 && n1 <= 4) return 1;
  return 2;
}

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'hy',
  missingWarn: false,
  fallbackWarn: false,
  pluralRules: { ru: ruPlural },
}));
