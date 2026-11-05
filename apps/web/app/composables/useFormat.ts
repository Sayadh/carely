import type { I18nText, Locale, PriceDto } from '@carely/shared';
import { APP_TIMEZONE, minutesToTime } from '@carely/shared';

/**
 * Locale-aware formatting. All instants are displayed in Asia/Yerevan.
 * Month/weekday names and number grouping come from our dictionaries instead of Intl locale data,
 * because Armenian (hy) locale data is missing in several browsers and would differ between SSR and the client.
 * Intl is used only with 'en-US' to extract the Yerevan wall-clock parts (supported everywhere).
 */
function parts(instant: Date) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).formatToParts(instant);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(g('weekday')) + 1;
  return { y: Number(g('year')), m: Number(g('month')), d: Number(g('day')), hh: g('hour').padStart(2, '0'), mm: g('minute'), wd };
}

export function useFormat() {
  const { locale, t, tm, rt } = useI18n();
  const list = (key: string) => (tm(key) as unknown[]).map((x) => rt(x as any));

  const tx = (text: I18nText | null | undefined) => (text ? (text[locale.value as Locale] ?? text.hy ?? text.en ?? text.ru ?? '') : '');

  const amd = (amount: number) => {
    const sep = locale.value === 'en' ? ',' : ' ';
    return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, sep) + ' ֏';
  };

  const price = (p: PriceDto | null | undefined) => {
    if (!p) return t('price.onRequest');
    if (p.kind === 'NEGOTIABLE' || p.amount == null) return t('price.negotiable');
    return t('price.perUnit', { amount: amd(p.amount), unit: t(`priceUnit.${p.unit}`) });
  };

  const weekday = (d: number, style: 'short' | 'long' = 'short') => list(style === 'short' ? 'dt.weekdaysShort' : 'dt.weekdays')[d - 1] ?? '';
  const month = (m: number, style: 'long' | 'short' = 'long') => list(style === 'long' ? 'dt.months' : 'dt.monthsShort')[m - 1] ?? '';

  const time = (iso: string | Date) => {
    const p = parts(new Date(iso));
    return `${p.hh}:${p.mm}`;
  };
  const date = (iso: string | Date) => {
    const p = parts(new Date(iso));
    return t('dt.dateLong', { d: p.d, month: month(p.m), y: p.y });
  };
  const dateTime = (iso: string | Date) => {
    const p = parts(new Date(iso));
    return t('dt.dateTime', { d: p.d, month: month(p.m, 'short'), y: p.y, time: `${p.hh}:${p.mm}` });
  };
  const range = (startIso: string, endIso: string) => `${dateTime(startIso)} – ${time(endIso)}`;

  /** Calendar date (YYYY-MM-DD, not an instant). Options mirror Intl: weekday short|long, month short|long. */
  const ymd = (s: string, opts: { weekday?: 'short' | 'long'; month?: 'short' | 'long'; day?: string } = { weekday: 'short', month: 'short' }) => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    const wd = ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
    const dm = t('dt.dayMonth', { d, month: month(m, opts.month === 'long' ? 'long' : 'short') });
    return opts.weekday ? `${weekday(wd, opts.weekday)}, ${dm}` : dm;
  };

  const minutes = (m: number) => (m >= 1440 ? '24:00' : minutesToTime(m));

  const relative = (iso: string) => {
    const diff = (new Date(iso).getTime() - Date.now()) / 60000;
    const abs = Math.abs(diff);
    const [n, unit] = abs < 60 ? [Math.max(1, Math.round(abs)), 'minutes'] : abs < 1440 ? [Math.round(abs / 60), 'hours'] : [Math.round(abs / 1440), 'days'];
    return t(diff >= 0 ? `dt.in.${unit}` : `dt.ago.${unit}`, n);
  };

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');

  return { tx, amd, price, date, dateTime, time, range, ymd, minutes, weekday, relative, initials };
}
