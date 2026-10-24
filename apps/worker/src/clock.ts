/**
 * The scheduler's decisions, pure, so they're tested without a Worker (clock.test.ts). The Durable
 * Object (scheduler.ts) keeps this state and calls these.
 */
export interface ClockState {
  /** When the API said to tick next (ms); 0 when unknown, which ticks at once. */
  next: number;
  /** The last cron run (ms): the Worker's own heartbeat. */
  lastCron: number;
  /** Since when ticks have been failing (ms), or null. */
  failingSince: number | null;
}

const MINUTE = 60_000;
/** After a failed tick, the next try. */
export const RETRY_MS = 5 * MINUTE;
/** The API's answer is trusted only this far ahead: a bug can't put the scheduler to sleep for days. */
export const MAX_SLEEP_MS = 16 * 60 * MINUTE;
/** The cron runs each minute; missing five means it has stopped. */
export const CRON_LATE_MS = 5 * MINUTE;
/** Ticks failing this long mean the API can't run jobs (a wrong secret, a broken deploy). */
export const FAILING_LATE_MS = 15 * MINUTE;

export const due = (s: ClockState, now: number) => now >= s.next;

/** The state after a tick the API answered with its `next`. */
export function afterTick(s: ClockState, now: number, next: string | undefined): ClockState {
  const at = next ? Date.parse(next) : Number.NaN;
  const sane = Number.isFinite(at) ? Math.min(Math.max(at, now + MINUTE), now + MAX_SLEEP_MS) : now + RETRY_MS;
  return { ...s, next: sane, failingSince: null };
}

/** The state after a tick that failed (unreachable, an error, a refused secret). */
export function afterFailure(s: ClockState, now: number): ClockState {
  return { ...s, next: now + RETRY_MS, failingSince: s.failingSince ?? now };
}

/** A one-off job was scheduled sooner than the next tick: tick by then. */
export function wake(s: ClockState, at: number): ClockState {
  return Number.isFinite(at) && at < s.next ? { ...s, next: at } : s;
}

/** The Worker's own health, for the outside monitor: no data, only whether it keeps time. */
export function health(s: ClockState, now: number): { ok: true } | { ok: false; late: string[] } {
  const late: string[] = [];
  if (!s.lastCron || now - s.lastCron > CRON_LATE_MS) late.push('cron');
  if (s.failingSince !== null && now - s.failingSince > FAILING_LATE_MS) late.push('tick');
  return late.length ? { ok: false, late } : { ok: true };
}
