import { afterEach, describe, expect, it, vi } from 'vitest';
import { RETRY_MS, type ClockState } from './clock';
import type { Env } from './env';
import { Scheduler } from './scheduler';

// The Durable Object the cron wakes each minute (D99, D141): it calls the API's tick only when
// something is due, since every tick wakes Neon (QA B06 run 3, finding 2), and it keeps what happens
// while a tick runs (run 3, note 11).

const t0 = Date.parse('2026-10-25T02:00:00Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** A scheduler with a stand-in storage, and the API's tick answering what `answer` says. */
function setup(answer: () => Promise<Response> = async () => Response.json({ next: new Date(t0 + 3 * HOUR) })) {
  const store = new Map<string, unknown>();
  const storage = {
    get: async (k: string) => structuredClone(store.get(k)),
    put: async (k: string, v: unknown) => void store.set(k, structuredClone(v)),
  };
  const env = { API_ORIGIN: 'https://sen.example', SCHEDULER_SECRET: 's'.repeat(40) } as unknown as Env;
  const sched = new Scheduler({ storage } as unknown as DurableObjectState, env);
  const ticks = vi.fn(answer);
  vi.stubGlobal('fetch', ticks);
  return { sched, ticks, clock: () => store.get('clock') as ClockState };
}

afterEach(() => void vi.unstubAllGlobals());

describe('the scheduler', () => {
  it('ticks the API only when something is due, not each minute', async () => {
    const { sched, ticks, clock } = setup();
    await sched.cron(t0);
    expect(ticks).toHaveBeenCalledTimes(1);
    expect(ticks).toHaveBeenCalledWith('https://sen.example/api/jobs/tick', expect.anything());
    for (let m = 1; m < 180; m++) await sched.cron(t0 + m * MINUTE);
    expect(ticks).toHaveBeenCalledTimes(1);
    await sched.cron(t0 + 3 * HOUR);
    expect(ticks).toHaveBeenCalledTimes(2);
    expect(clock().lastCron).toBe(t0 + 3 * HOUR);
  });

  it('after a failed tick, tries again in five minutes, not each minute', async () => {
    const { sched, ticks } = setup(async () => new Response('', { status: 500 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await sched.cron(t0);
    for (let m = 1; m < 5; m++) await sched.cron(t0 + m * MINUTE);
    expect(ticks).toHaveBeenCalledTimes(1);
    await sched.cron(t0 + RETRY_MS);
    expect(ticks).toHaveBeenCalledTimes(2);
  });

  // a refused tick (a secret rotated on one side, a broken deploy) shows on the Worker's own /health
  // after 15 minutes, one of the monitor's two signals (D141; QA B06 run 3, scoped, finding 15)
  it('says ticks are failing once they have failed for 15 minutes', async () => {
    const { sched } = setup(async () => new Response('', { status: 401 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (let m = 0; m <= 14; m++) await sched.cron(t0 + m * MINUTE);
    expect(await sched.health(t0 + 14 * MINUTE)).toEqual({ ok: true });
    for (let m = 15; m <= 16; m++) await sched.cron(t0 + m * MINUTE);
    expect(await sched.health(t0 + 16 * MINUTE)).toEqual({ ok: false, late: ['tick'] });
  });

  it('wakes sooner when the API asks, and keeps a wake that comes while a tick runs', async () => {
    const s = setup(async () => {
      // during the tick: a one-off job is scheduled, and the next minute's cron comes
      await s.sched.wake(t0 + 10 * MINUTE);
      await s.sched.cron(t0 + MINUTE);
      return Response.json({ next: new Date(t0 + 3 * HOUR) });
    });
    const { sched } = s;
    await sched.cron(t0);
    expect(s.ticks).toHaveBeenCalledTimes(1);
    expect(s.clock()).toMatchObject({ next: t0 + 10 * MINUTE, lastCron: t0 + MINUTE });
    await sched.wake(t0 + 5 * MINUTE);
    expect(s.clock().next).toBe(t0 + 5 * MINUTE);
  });

  // two one-off jobs scheduled during one tick: the sooner sets the wake (run 3, scoped, finding 16)
  it('keeps the sooner of two wakes that come while a tick runs', async () => {
    const s = setup(async () => {
      await s.sched.wake(t0 + 10 * MINUTE);
      await s.sched.wake(t0 + 20 * MINUTE);
      return Response.json({ next: new Date(t0 + 3 * HOUR) });
    });
    await s.sched.cron(t0);
    expect(s.clock().next).toBe(t0 + 10 * MINUTE);
  });
});
