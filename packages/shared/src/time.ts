import { APP_TIMEZONE } from './enums.js';

/** Offset (minutes) of `tz` from UTC at the given instant. */
export function tzOffsetMinutes(instant: Date, tz: string = APP_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** Convert a local wall-clock date (YYYY-MM-DD) + minutes after midnight in `tz` into a UTC instant. */
export function zonedToUtc(date: string, minuteOfDay: number, tz: string = APP_TIMEZONE): Date {
  const [y, m, d] = date.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + minuteOfDay * 60000);
  const offset = tzOffsetMinutes(guess, tz);
  const result = new Date(guess.getTime() - offset * 60000);
  // Re-check once in case the offset differs at the result instant (DST edges).
  const offset2 = tzOffsetMinutes(result, tz);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2 * 60000);
}

/** Local date string (YYYY-MM-DD) for an instant in `tz`. */
export function utcToZonedDate(instant: Date, tz: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

/** Minutes after local midnight for an instant in `tz`. */
export function utcToZonedMinutes(instant: Date, tz: string = APP_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(instant);
  return Number(parts.find((p) => p.type === 'hour')?.value) * 60 + Number(parts.find((p) => p.type === 'minute')?.value);
}

/** ISO weekday for a YYYY-MM-DD date: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Half-open interval overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅ */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface Occurrence {
  startAt: Date;
  endAt: Date;
}

/**
 * Expand a schedule into finite occurrences.
 * Times are local (tz). If endMinute <= startMinute the occurrence ends on the next day (overnight care).
 */
export function expandSchedule(input: {
  startDate: string;
  endDate: string;
  startMinute: number;
  endMinute: number;
  weekdays?: number[] | null; // ISO weekdays; omitted/empty for one-time (single day)
  tz?: string;
}): Occurrence[] {
  const tz = input.tz ?? APP_TIMEZONE;
  const overnight = input.endMinute <= input.startMinute;
  const out: Occurrence[] = [];
  const days = input.weekdays && input.weekdays.length ? new Set(input.weekdays) : null;
  let cur = input.startDate;
  let guard = 0;
  while (cur <= input.endDate && guard < 400) {
    guard++;
    if (!days || days.has(isoWeekday(cur))) {
      const startAt = zonedToUtc(cur, input.startMinute, tz);
      const endAt = zonedToUtc(overnight ? addDays(cur, 1) : cur, input.endMinute, tz);
      out.push({ startAt, endAt });
    }
    if (!days) break;
    cur = addDays(cur, 1);
  }
  return out;
}
