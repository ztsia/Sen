import { personChannel, signPass, type Topic } from '@sen/core/realtime';

/**
 * The API's side of the Cloudflare Worker (D99, D100): hints after a change, passes for a screen to
 * connect, and waking the scheduler when a one-off job is due sooner than it planned. A fake in tests.
 */
export interface Relay {
  readonly on: boolean;
  /** Tells the person's open screens which topics changed. Never fails the change that caused it. */
  hint(userId: string, topics: Topic[]): Promise<void>;
  /** A 5-minute pass to the person's channel, and where to connect. */
  pass(userId: string): Promise<{ url: string; pass: string } | null>;
  /** Asks the Worker to tick by `at`, when a job was scheduled sooner than its next tick. */
  wake(at: Date): Promise<void>;
}

export const noRelay: Relay = {
  on: false,
  hint: async () => undefined,
  pass: async () => null,
  wake: async () => undefined,
};

/** Short: a hint is a nicety, and the screens' fallbacks catch a lost one (D100). */
const TIMEOUT_MS = 1500;

export function workerRelay(
  cfg: { url: string; secret: string },
  scheduler: string | null,
  fetcher: typeof fetch = fetch,
): Relay {
  const post = async (path: string, bearer: string, body: unknown) => {
    try {
      const res = await fetcher(`${cfg.url}${path}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) console.error(`relay ${path}: ${res.status}`);
    } catch (e) {
      console.error(`relay ${path} unreachable`, e instanceof Error ? e.name : e);
    }
  };
  return {
    on: true,
    hint: (userId, topics) => post('/hint', cfg.secret, { channel: personChannel(userId), topics }),
    pass: async (userId) => ({
      url: `${cfg.url.replace(/^http/, 'ws')}/connect`,
      pass: await signPass(cfg.secret, personChannel(userId)),
    }),
    wake: async (at) => (scheduler ? post('/schedule', scheduler, { at: at.toISOString() }) : undefined),
  };
}
