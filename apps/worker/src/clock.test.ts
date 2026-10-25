import { describe, expect, it } from 'vitest';
import { afterFailure, afterTick, due, health, MAX_SLEEP_MS, RETRY_MS, wake, type ClockState } from './clock';

const t0 = Date.parse('2026-10-25T02:00:00Z');
const fresh: ClockState = { next: 0, lastCron: t0, failingSince: null };

describe('the scheduler', () => {
  it('ticks at once when it knows nothing, then sleeps until the API says', () => {
    expect(due(fresh, t0)).toBe(true);
    const s = afterTick(fresh, t0, '2026-10-25T13:00:00.000Z');
    expect(s.next).toBe(Date.parse('2026-10-25T13:00:00Z'));
    expect(due(s, t0 + 60_000)).toBe(false);
    expect(due(s, s.next)).toBe(true);
  });
  it('never trusts an answer too near or too far, or none at all', () => {
    expect(afterTick(fresh, t0, '2026-10-25T01:00:00Z').next).toBe(t0 + 60_000);
    expect(afterTick(fresh, t0, '2030-01-01T00:00:00Z').next).toBe(t0 + MAX_SLEEP_MS);
    expect(afterTick(fresh, t0, 'soon').next).toBe(t0 + RETRY_MS);
    expect(afterTick(fresh, t0, undefined).next).toBe(t0 + RETRY_MS);
  });
  it('retries a failed tick in five minutes, remembering since when it fails', () => {
    const a = afterFailure(fresh, t0);
    expect(a).toMatchObject({ next: t0 + RETRY_MS, failingSince: t0 });
    expect(afterFailure(a, t0 + RETRY_MS).failingSince).toBe(t0);
    expect(afterTick(a, t0 + RETRY_MS, '2026-10-25T13:00:00Z').failingSince).toBeNull();
  });
  it('wakes sooner for a one-off job, never later', () => {
    const s = { ...fresh, next: t0 + 3_600_000 };
    expect(wake(s, t0 + 60_000).next).toBe(t0 + 60_000);
    expect(wake(s, t0 + 7_200_000).next).toBe(t0 + 3_600_000);
    expect(wake(s, Number.NaN).next).toBe(t0 + 3_600_000);
  });
});

describe('the Worker’s health', () => {
  it('fails when the cron stops, or ticks keep failing', () => {
    expect(health(fresh, t0 + 60_000)).toEqual({ ok: true });
    expect(health(fresh, t0 + 6 * 60_000)).toEqual({ ok: false, late: ['cron'] });
    expect(health({ ...fresh, lastCron: 0 }, t0)).toEqual({ ok: false, late: ['cron'] });
    const failing = { ...fresh, lastCron: t0 + 16 * 60_000, failingSince: t0 };
    expect(health(failing, t0 + 10 * 60_000)).toEqual({ ok: true });
    expect(health(failing, t0 + 16 * 60_000)).toEqual({ ok: false, late: ['tick'] });
  });
});
