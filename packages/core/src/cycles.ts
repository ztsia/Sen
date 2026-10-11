/**
 * Pay cycles and calendar days in Kuala Lumpur (spec §7 *Pay cycles*, D14, D79). Pure functions on
 * `YYYY-MM-DD` strings, so a day never drifts with the device's time zone. B03's fake uses them;
 * B13 makes them the app's, beside the SQL view that does the same on the server.
 */

export const KL = 'Asia/Kuala_Lumpur';

const klDayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: KL, year: 'numeric', month: '2-digit', day: '2-digit' });

/** The day an instant falls on in Kuala Lumpur: `2026-10-18`. */
export const klDay = (instant: string | Date): string =>
  klDayFmt.format(typeof instant === 'string' ? new Date(instant) : instant);

/** Digits to a whole number, one digit at a time (no parseInt where money flows: eslint.config.js). */
const int = (digits: string): number => [...digits].reduce((n, ch) => n * 10 + (ch.charCodeAt(0) - 48), 0);

const toUtc = (day: string) => {
  const [y, m, d] = day.split('-').map(int) as [number, number, number];
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** A day plus some days, either sign. */
export const addDays = (day: string, n: number): string => fromUtc(toUtc(day) + n * 86_400_000);
/** Whole days from `a` to `b`: `daysBetween('2026-10-18', '2026-10-30')` is 12. */
export const daysBetween = (a: string, b: string): number => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
/** Monday is 1, Sunday 7. */
export const weekday = (day: string): number => ((new Date(toUtc(day)).getUTCDay() + 6) % 7) + 1;
export const monthStart = (day: string): string => `${day.slice(0, 8)}01`;
export const monthEnd = (day: string): string => {
  const [y, m] = day.split('-').map(int) as [number, number];
  return fromUtc(Date.UTC(y, m, 0));
};
/** The first day of the month after `day`'s. */
export const nextMonthStart = (day: string): string => addDays(monthEnd(day), 1);

/** The last working day of `day`'s month, Monday to Friday: the default expected payday (D14). */
export function lastWorkingDay(day: string): string {
  let d = monthEnd(day);
  while (weekday(d) > 5) d = addDays(d, -1);
  return d;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const monthName = (day: string): string => MONTHS[int(day.slice(5, 7)) - 1] ?? '';

/** A cycle is called by the month most of it falls in (§7); on a tie, the later month. */
export function cycleLabel(start: string, end: string): string {
  const counts = new Map<string, number>();
  for (let d = start; d <= end; d = addDays(d, 1)) counts.set(d.slice(0, 7), (counts.get(d.slice(0, 7)) ?? 0) + 1);
  let best = start.slice(0, 7);
  for (const [m, n] of counts) if (n >= (counts.get(best) ?? 0)) best = m;
  return monthName(`${best}-01`);
}

export interface Cycle {
  start: string;
  /** The last day, inclusive. */
  end: string;
  label: string;
  /** The day the next one is expected to start: payday, or the 1st. */
  expectedPayday: string | null;
}

/**
 * Pay cycles from salary credits (§7): a cycle starts on the day a salary lands and ends the day
 * before the next one. A salary within 15 days of the last one (a bonus, a split payment) doesn't
 * start a new cycle. Until the first salary, the cycle starts on the opening date. The current cycle
 * ends the day before the expected payday: the last working day of the month after it starts, or its
 * own month's when it started early (an early payday before a holiday).
 */
export function payCycles(salaryDays: readonly string[], openingDay: string, today: string): Cycle[] {
  const starts: string[] = [];
  for (const d of [...salaryDays].sort()) {
    if (d > today) continue;
    const last = starts[starts.length - 1];
    if (last && daysBetween(last, d) < 15) continue;
    starts.push(d);
  }
  if (!starts.length || starts[0]! > openingDay) starts.unshift(openingDay);
  const cycles: Cycle[] = [];
  starts.forEach((start, i) => {
    const next = starts[i + 1];
    if (next) {
      cycles.push({ start, end: addDays(next, -1), label: '', expectedPayday: next });
      return;
    }
    // after a salary, the next is a month on: the month-end payday after it, or the one after that when
    // this salary came early (before a holiday). Before the first salary, the next month-end payday.
    const salaried = start !== openingDay || salaryDays.includes(start);
    let payday = lastWorkingDay(start);
    if (salaried ? daysBetween(start, payday) < 15 : payday <= start) payday = lastWorkingDay(nextMonthStart(start));
    const end = addDays(payday, -1);
    cycles.push({ start, end: end < today ? today : end, label: '', expectedPayday: payday });
  });
  return cycles.map((c) => ({ ...c, label: cycleLabel(c.start, c.end) }));
}

/** Calendar months, from the opening day's month to today's (D79): a cycle that starts on the 1st. */
export function monthCycles(openingDay: string, today: string): Cycle[] {
  const cycles: Cycle[] = [];
  for (let m = monthStart(openingDay); m <= today; m = nextMonthStart(m))
    cycles.push({ start: m, end: monthEnd(m), label: monthName(m), expectedPayday: nextMonthStart(m) });
  return cycles;
}

/** The cycle a day falls in, or none before the first. */
export const cycleOf = <C extends { start: string; end: string }>(cycles: readonly C[], day: string): C | undefined =>
  cycles.find((c) => c.start <= day && day <= c.end);
