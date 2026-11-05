import { addDays, isoWeekday, utcToZonedMinutes, utcToZonedDate, zonedToUtc } from '@carely/shared';

type Interval = [number, number]; // minutes within the local day, half-open

function subtract(windows: Interval[], cut: Interval): Interval[] {
  const out: Interval[] = [];
  for (const [s, e] of windows) {
    if (cut[1] <= s || cut[0] >= e) out.push([s, e]);
    else {
      if (cut[0] > s) out.push([s, cut[0]]);
      if (cut[1] < e) out.push([cut[1], e]);
    }
  }
  return out;
}

export interface DayInputs {
  rules: { weekday: number; startMinute: number; endMinute: number }[];
  exceptions: { date: Date | string; available: boolean; startMinute: number | null; endMinute: number | null }[];
  bookings: { startAt: Date; endAt: Date }[];
}

const dateKey = (d: Date | string) => (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10));

/**
 * Free windows on a local date = weekly rules + "available" exceptions − "unavailable" exceptions − confirmed bookings.
 * Weekly rules alone never imply availability "now"; this is only used for dated browsing filters.
 */
export function freeWindowsOnDate(date: string, input: DayInputs): Interval[] {
  const wd = isoWeekday(date);
  let windows: Interval[] = input.rules.filter((r) => r.weekday === wd).map((r) => [r.startMinute, r.endMinute]);
  const exc = input.exceptions.filter((e) => dateKey(e.date) === date);
  for (const e of exc.filter((x) => x.available)) windows.push([e.startMinute ?? 0, e.endMinute ?? 1440]);
  for (const e of exc.filter((x) => !x.available)) windows = subtract(windows, [e.startMinute ?? 0, e.endMinute ?? 1440]);
  const dayStart = zonedToUtc(date, 0);
  const dayEnd = zonedToUtc(addDays(date, 1), 0);
  for (const b of input.bookings) {
    if (b.endAt <= dayStart || b.startAt >= dayEnd) continue;
    const s = b.startAt <= dayStart ? 0 : utcToZonedMinutes(b.startAt);
    const e = b.endAt >= dayEnd ? 1440 : utcToZonedDate(b.endAt) !== date ? 1440 : utcToZonedMinutes(b.endAt);
    windows = subtract(windows, [s, e]);
  }
  return mergeIntervals(windows);
}

export function freeMinutesOnDate(date: string, input: DayInputs): number {
  return freeWindowsOnDate(date, input).reduce((sum, [s, e]) => sum + Math.max(0, e - s), 0);
}

/** True when [fromMinute, toMinute) on the local date is entirely free (adjacent windows count as continuous). */
export function isFreeDuring(date: string, fromMinute: number, toMinute: number, input: DayInputs): boolean {
  return freeWindowsOnDate(date, input).some(([s, e]) => s <= fromMinute && e >= toMinute);
}

function mergeIntervals(windows: Interval[]): Interval[] {
  const sorted = windows.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

/** True when a requested interval collides with an unavailable exception on any local day it touches. */
export function blockedByException(startAt: Date, endAt: Date, exceptions: DayInputs['exceptions']): boolean {
  for (const e of exceptions) {
    if (e.available) continue;
    const d = dateKey(e.date);
    const s = zonedToUtc(d, e.startMinute ?? 0);
    const en = e.endMinute == null || e.endMinute >= 1440 ? zonedToUtc(addDays(d, 1), 0) : zonedToUtc(d, e.endMinute);
    if (startAt < en && s < endAt) return true;
  }
  return false;
}
