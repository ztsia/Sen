import { addDays, klDay } from './cycles';

/**
 * The scheduler's clock (D99, B06), shared by the API and the Worker. Kuala Lumpur has no daylight
 * saving: it is always UTC+8.
 */
const KL_OFFSET_MS = 8 * 3_600_000;
const MINUTE = 60_000;

/** The job frames: each runs once per person and Kuala Lumpur date, inside its window (spec §16). */
export const FRAMES = {
  /** The morning job, 07:00–08:00. */
  morning: { from: 7, to: 8 },
  /** The evening job, from 21:00 (the check-in). */
  evening: { from: 21, to: 22 },
} as const;
export type Frame = keyof typeof FRAMES;

/** A frame left unfinished (a failure with attempts left) is tried again this soon, inside its window. */
export const RETRY_MS = 5 * MINUTE;

/** The Kuala Lumpur date and hour of an instant. */
export function klClock(now: Date): { day: string; hour: number } {
  return { day: klDay(now), hour: new Date(now.getTime() + KL_OFFSET_MS).getUTCHours() };
}

/** The instant of `hour`:00 on a Kuala Lumpur date. */
export function klAt(day: string, hour: number): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) + hour * 3_600_000 - KL_OFFSET_MS);
}

/** The frame whose window holds `now`, if any. */
export function frameAt(now: Date): Frame | null {
  const { hour } = klClock(now);
  for (const [name, w] of Object.entries(FRAMES)) if (hour >= w.from && hour < w.to) return name as Frame;
  return null;
}

/**
 * When the Worker should next call `/jobs/tick` (D99). Every call wakes Neon, whose free compute is
 * spent by the minute, so the API answers each tick with the next moment anything can be due: the
 * next frame's window, a retry inside this one, or the earliest one-off job. Never sooner than a
 * minute ahead, the cron's own step.
 */
export function nextTick(now: Date, opts: { unfinished: Frame | null; nextOnce: Date | null }): Date {
  const { day, hour } = klClock(now);
  let frame: Date;
  if (opts.unfinished) frame = new Date(now.getTime() + RETRY_MS);
  else if (hour < FRAMES.morning.from) frame = klAt(day, FRAMES.morning.from);
  else if (hour < FRAMES.evening.from) frame = klAt(day, FRAMES.evening.from);
  else frame = klAt(addDays(day, 1), FRAMES.morning.from);
  const next = opts.nextOnce && opts.nextOnce < frame ? opts.nextOnce : frame;
  return new Date(Math.max(next.getTime(), now.getTime() + MINUTE));
}
