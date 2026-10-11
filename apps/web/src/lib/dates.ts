import { now as clockNow } from './clock';

// Dates and month boundaries are always in Kuala Lumpur (CLAUDE.md, conventions).
export const KL = 'Asia/Kuala_Lumpur';

const dayFmt = new Intl.DateTimeFormat('en-MY', { timeZone: KL, weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('en-MY', { timeZone: KL, hour: '2-digit', minute: '2-digit', hour12: false });

const dayYearFmt = new Intl.DateTimeFormat('en-MY', {
  timeZone: KL,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const yearIn = new Intl.DateTimeFormat('en-CA', { timeZone: KL, year: 'numeric' });

/** `Thu, 8 Oct` for a day header; `Fri, 31 Oct 2025` in another year, so last year never reads as this (QA B03, F14). */
export const dayLabel = (d: Date, now: Date = clockNow()) =>
  (yearIn.format(d) === yearIn.format(now) ? dayFmt : dayYearFmt).format(d);
/** `21:02`. */
export const timeLabel = (d: Date) => timeFmt.format(d);

/** `Updated just now`, `Updated 2 min ago`, `Updated 3 h ago`: how stale a screen is while live updates are down. */
export function updatedAgo(then: Date, now: Date = clockNow()): string {
  const min = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (min < 1) return 'Updated just now';
  if (min < 60) return `Updated ${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Updated ${h} h ago`;
  return `Updated ${dayLabel(then)}`;
}

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: KL, year: 'numeric', month: '2-digit', day: '2-digit' });

/** `Today, 21:02`, `Yesterday, 09:15`, else `Thu, 8 Oct, 21:02`: a moment, relative when recent, in Kuala Lumpur. */
export function momentLabel(then: Date, now: Date = clockNow()): string {
  const t = dayKey.format(then);
  if (t === dayKey.format(now)) return `Today, ${timeLabel(then)}`;
  if (t === dayKey.format(new Date(now.getTime() - 86_400_000))) return `Yesterday, ${timeLabel(then)}`;
  return `${dayLabel(then)}, ${timeLabel(then)}`;
}

const noonKL = (day: string) => new Date(`${day}T12:00:00+08:00`);
const shortFmt = new Intl.DateTimeFormat('en-MY', { timeZone: KL, day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('en-MY', { timeZone: KL, weekday: 'short', day: 'numeric', month: 'short' });

/** A calendar day (`2026-09-30`) as `30 Sep`: never ambiguous, never `30/09`. */
export const shortDay = (day: string) => shortFmt.format(noonKL(day));
/** A calendar day as `Wed, 30 Sep`. */
export const longDay = (day: string) => longFmt.format(noonKL(day));
/** An instant's day, as a day header shows it. */
export const dayOfInstant = (at: string) => dayKey.format(new Date(at));
