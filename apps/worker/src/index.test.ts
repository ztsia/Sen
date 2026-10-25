import { beforeAll, describe, expect, it } from 'vitest';
import { PASS_TTL_MS, signPass } from '@sen/core/realtime';
import type { Env } from './env';
import worker from './index';

// The relay is the realtime privacy boundary (D100): only the API, holding the relay secret, may send
// hints, and a screen opens only the channel its signed pass names (QA B06 run 2, finding 1).

const RELAY = 'r'.repeat(40);
const SCHED = 's'.repeat(40);
const PERSON = 'user:0b7c1a52-6f0e-4d7e-9a43-1f2e3d4c5b6a';
const OTHER = 'user:9d8c7b6a-5f4e-4d3c-8b2a-1a0f9e8d7c6b';

beforeAll(() => {
  // Cloudflare's own addition to SubtleCrypto, which Node lacks
  if (!('timingSafeEqual' in crypto.subtle))
    Object.defineProperty(crypto.subtle, 'timingSafeEqual', {
      configurable: true,
      value: (a: ArrayBuffer, b: ArrayBuffer) => {
        const x = new Uint8Array(a);
        const y = new Uint8Array(b);
        return x.length === y.length && x.every((v, i) => v === y[i]);
      },
    });
});

/** The Worker with stand-in Durable Objects that record what reached them. */
function setup() {
  const seen = { channels: [] as string[], hints: [] as unknown[], opened: 0, woke: [] as number[] };
  const channel = {
    hint: async (topics: unknown) => (seen.hints.push(topics), 1),
    fetch: async () => (seen.opened++, new Response('opened')),
  };
  const scheduler = { wake: async (at: number) => void seen.woke.push(at) };
  const env = {
    RELAY_SECRET: RELAY,
    SCHEDULER_SECRET: SCHED,
    API_ORIGIN: 'https://sen.example',
    CHANNEL: { idFromName: (n: string) => (seen.channels.push(n), n), get: () => channel },
    SCHEDULER: { idFromName: (n: string) => n, get: () => scheduler },
  } as unknown as Env;
  const call = (path: string, init?: RequestInit) =>
    worker.fetch(new Request(`https://w.example${path}`, init) as Parameters<typeof worker.fetch>[0], env);
  return { seen, call };
}

const post = (body: unknown, secret?: string): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
  headers: secret ? { authorization: `Bearer ${secret}` } : {},
});
const ws = { headers: { upgrade: 'websocket' } };

describe('a hint', () => {
  const hint = { channel: PERSON, topics: ['settings'] };

  it('is refused without the relay secret, and reaches no channel', async () => {
    const { seen, call } = setup();
    for (const init of [post(hint), post(hint, 'wrong'.repeat(8)), post(hint, SCHED)]) {
      const res = await call('/hint', init);
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ code: 'signed_out' });
    }
    expect(seen.hints).toEqual([]);
  });

  it('with the secret, reaches the one channel it names, as topics only', async () => {
    const { seen, call } = setup();
    const res = await call('/hint', post(hint, RELAY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 1 });
    expect(seen.channels).toEqual([PERSON]);
    expect(seen.hints).toEqual([['settings']]);
  });

  it('names a known topic and a person’s channel, or nothing is sent', async () => {
    const { seen, call } = setup();
    for (const b of [
      { channel: PERSON, topics: ['settings: RM12'] },
      { channel: PERSON, topics: [] },
      { channel: 'user:*', topics: ['settings'] },
    ])
      expect((await call('/hint', post(b, RELAY))).status).toBe(400);
    expect(seen.hints).toEqual([]);
  });
});

describe('a screen connecting', () => {
  it('opens only the channel its signed pass names', async () => {
    const { seen, call } = setup();
    const pass = await signPass(RELAY, PERSON);
    expect((await call(`/connect?pass=${encodeURIComponent(pass)}`, ws)).status).toBe(200);
    expect(seen.channels).toEqual([PERSON]);
    expect(seen.opened).toBe(1);
  });

  it('is refused with no pass, a channel named outright, a forged or an expired pass', async () => {
    const { seen, call } = setup();
    const passes = [
      '',
      PERSON,
      await signPass('x'.repeat(40), OTHER),
      await signPass(RELAY, OTHER, Date.now() - PASS_TTL_MS - 1000),
    ];
    for (const p of passes) {
      const res = await call(`/connect?pass=${encodeURIComponent(p)}`, ws);
      expect(res.status).toBe(401);
    }
    expect(seen.opened).toBe(0);
  });

  it('must be a WebSocket', async () => {
    const { call } = setup();
    const pass = await signPass(RELAY, PERSON);
    expect((await call(`/connect?pass=${encodeURIComponent(pass)}`)).status).toBe(426);
  });
});

describe('a wake for the scheduler', () => {
  it('needs the scheduler’s own secret, not the relay’s', async () => {
    const { seen, call } = setup();
    const at = { at: '2026-10-25T13:00:00Z' };
    expect((await call('/schedule', post(at))).status).toBe(401);
    expect((await call('/schedule', post(at, RELAY))).status).toBe(401);
    expect((await call('/schedule', post({ at: 'soon' }, SCHED))).status).toBe(400);
    expect((await call('/schedule', post(at, SCHED))).status).toBe(200);
    expect(seen.woke).toEqual([Date.parse(at.at)]);
  });
});
