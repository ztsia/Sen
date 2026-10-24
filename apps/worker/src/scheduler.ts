import { DurableObject } from 'cloudflare:workers';
import { afterFailure, afterTick, due, health, wake, type ClockState } from './clock';
import type { Env } from './env';

const INITIAL: ClockState = { next: 0, lastCron: 0, failingSince: null };

/**
 * The one scheduler (D99): the cron wakes it each minute, and it calls the API's `/jobs/tick` only
 * when the API said something would be due. Every tick wakes Neon, whose free compute is spent by the
 * minute; a tick each minute would keep it awake all month. Its state is a few numbers in storage.
 */
export class Scheduler extends DurableObject<Env> {
  private ticking = false;

  private async state(): Promise<ClockState> {
    return (await this.ctx.storage.get<ClockState>('clock')) ?? INITIAL;
  }

  private save(s: ClockState) {
    return this.ctx.storage.put('clock', s);
  }

  /** Each minute, from the cron. */
  async cron(now = Date.now()): Promise<void> {
    const s = { ...(await this.state()), lastCron: now };
    await this.save(s);
    if (!due(s, now) || this.ticking) return;
    this.ticking = true;
    try {
      await this.save(await this.tick(s, now));
    } finally {
      this.ticking = false;
    }
  }

  private async tick(s: ClockState, now: number): Promise<ClockState> {
    try {
      const res = await fetch(`${this.env.API_ORIGIN}/api/jobs/tick`, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.env.SCHEDULER_SECRET}` },
        signal: AbortSignal.timeout(5 * 60_000),
      });
      if (!res.ok) {
        console.error(`tick: ${res.status}`);
        return afterFailure(s, now);
      }
      const body = await res.json<{ next?: string }>();
      return afterTick(s, now, body.next);
    } catch (e) {
      console.error('tick unreachable', e instanceof Error ? e.name : e);
      return afterFailure(s, now);
    }
  }

  /** The API scheduled a one-off job sooner than the next tick. */
  async wake(at: number): Promise<void> {
    await this.save(wake(await this.state(), at));
  }

  async health(now = Date.now()) {
    return health(await this.state(), now);
  }
}
