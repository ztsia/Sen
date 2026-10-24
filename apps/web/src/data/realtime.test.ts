import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiFailure } from './api/client';
import {
  BACKOFF_MS,
  PING_MS,
  PONG_WITHIN_MS,
  POLL_MS,
  TOPIC_QUERIES,
  createRealtime,
  useLive,
  type Socket,
} from './realtime';

// The relay's connection (D100): hints become invalidations, and a dropped connection falls back to
// reloading what's open every 30 s, until it comes back.

class FakeSocket implements Socket {
  onopen: Socket['onopen'] = null;
  onmessage: Socket['onmessage'] = null;
  onclose: Socket['onclose'] = null;
  onerror: Socket['onerror'] = null;
  sent: string[] = [];
  closed = false;
  constructor(readonly url: string) {}
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  // the relay's side
  open() {
    this.onopen?.({});
  }
  say(data: unknown) {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }
  drop() {
    this.onclose?.({});
  }
}

function setup(token?: () => Promise<{ url: string; pass: string }>) {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const sockets: FakeSocket[] = [];
  const getToken = vi.fn(token ?? (async () => ({ url: 'wss://relay.test/c', pass: 'a b' })));
  const rt = createRealtime({
    client,
    token: getToken,
    open: (url) => {
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
    now: () => new Date(),
    online: () => true,
  });
  return { rt, invalidate, sockets, getToken };
}

const flush = () => vi.advanceTimersByTimeAsync(0);
const status = () => useLive.getState().status;

async function live(s: ReturnType<typeof setup>) {
  s.rt.start();
  await flush();
  const sock = s.sockets.at(-1)!;
  sock.open();
  await flush();
  s.invalidate.mockClear();
  return sock;
}

beforeEach(() => {
  vi.useFakeTimers();
  useLive.setState({ status: 'off', updatedAt: null, forced: null });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('connecting', () => {
  it('asks for a pass, connects with it in the address, and is live when the socket opens', async () => {
    const s = setup();
    s.rt.start();
    await flush();
    expect(s.sockets).toHaveLength(1);
    expect(s.sockets[0]!.url).toBe('wss://relay.test/c?pass=a%20b');
    expect(status()).toBe('off');
    s.sockets[0]!.open();
    expect(status()).toBe('live');
    s.rt.stop();
    expect(s.sockets[0]!.closed).toBe(true);
    expect(status()).toBe('off');
  });

  it('starts once', async () => {
    const s = setup();
    s.rt.start();
    s.rt.start();
    await flush();
    expect(s.getToken).toHaveBeenCalledTimes(1);
    expect(s.sockets).toHaveLength(1);
  });
});

describe('hints', () => {
  it('invalidate exactly the queries their topics map to', async () => {
    const s = setup();
    const sock = await live(s);
    sock.say({ seq: 1, topics: ['jobs'] });
    await flush();
    expect(s.invalidate.mock.calls.map((c) => c[0])).toEqual(TOPIC_QUERIES.jobs.map((queryKey) => ({ queryKey })));
    s.invalidate.mockClear();
    sock.say({ seq: 2, topics: ['settings', 'jobs'] });
    await flush();
    // each key once, though two topics name ['settings']
    expect(s.invalidate.mock.calls.map((c) => c[0])).toEqual([{ queryKey: ['settings'] }, { queryKey: ['me'] }]);
    expect(useLive.getState().updatedAt).not.toBeNull();
  });

  it('ignore a topic this build does not know, and text that is no hint', async () => {
    const s = setup();
    const sock = await live(s);
    sock.say({ seq: 1, topics: ['tomorrow'] });
    sock.say('not json');
    await flush();
    expect(s.invalidate).not.toHaveBeenCalled();
  });

  it('invalidate everything after a gap in seq', async () => {
    const s = setup();
    const sock = await live(s);
    sock.say({ seq: 7, topics: ['jobs'] });
    await flush();
    s.invalidate.mockClear();
    sock.say({ seq: 9, topics: ['jobs'] });
    await flush();
    expect(s.invalidate.mock.calls).toEqual([[]]);
  });
});

describe('the relay going down', () => {
  it('reloads only the active queries every 30 s, and reconnecting reloads everything and stops that', async () => {
    const s = setup();
    const first = await live(s);
    first.drop();
    expect(status()).toBe('down');
    // the first retry comes after the first wait, with a fresh pass
    await vi.advanceTimersByTimeAsync(BACKOFF_MS[0]!);
    expect(s.getToken).toHaveBeenCalledTimes(2);
    expect(s.sockets).toHaveLength(2);
    s.invalidate.mockClear();
    await vi.advanceTimersByTimeAsync(POLL_MS - BACKOFF_MS[0]!);
    expect(s.invalidate.mock.calls).toEqual([[{ refetchType: 'active' }]]);
    // it comes back
    s.sockets[1]!.open();
    await flush();
    expect(status()).toBe('live');
    expect(s.invalidate.mock.calls.at(-1)).toEqual([]);
    s.invalidate.mockClear();
    // (a silent fake would fail its first ping, so look within the ping interval)
    await vi.advanceTimersByTimeAsync(PING_MS - 1);
    expect(s.invalidate).not.toHaveBeenCalled();
  });

  it('waits longer between tries, then every 30 s', async () => {
    const s = setup();
    const first = await live(s);
    first.drop();
    let tries = 1;
    for (const wait of [...BACKOFF_MS, POLL_MS, POLL_MS]) {
      await vi.advanceTimersByTimeAsync(wait - 1);
      expect(s.getToken).toHaveBeenCalledTimes(tries);
      await vi.advanceTimersByTimeAsync(1);
      tries += 1;
      expect(s.getToken).toHaveBeenCalledTimes(tries);
      s.sockets.at(-1)!.drop();
    }
  });

  it('falls back the same way when the pass cannot be had', async () => {
    let n = 0;
    const s = setup(async () => {
      n += 1;
      if (n === 1) throw new ApiFailure(0, 'offline', 'no connection');
      return { url: 'wss://relay.test/c', pass: 'p' };
    });
    s.rt.start();
    await flush();
    expect(status()).toBe('down');
    await vi.advanceTimersByTimeAsync(BACKOFF_MS[0]!);
    s.sockets[0]!.open();
    expect(status()).toBe('live');
  });

  it('counts a silent socket as dead: a ping every 25 s, and no answer in 10 s means down', async () => {
    const s = setup();
    const sock = await live(s);
    await vi.advanceTimersByTimeAsync(PING_MS);
    expect(sock.sent).toEqual(['ping']);
    expect(status()).toBe('live');
    await vi.advanceTimersByTimeAsync(PONG_WITHIN_MS - 1);
    expect(status()).toBe('live');
    await vi.advanceTimersByTimeAsync(1);
    expect(status()).toBe('down');
    expect(sock.closed).toBe(true);
    // and it reconnects through the usual wait
    await vi.advanceTimersByTimeAsync(BACKOFF_MS[0]!);
    expect(s.sockets).toHaveLength(2);
  });

  it('stays live while the pong comes, and takes it for no hint', async () => {
    const s = setup();
    const sock = await live(s);
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(PING_MS);
      await vi.advanceTimersByTimeAsync(2000);
      sock.say('pong');
    }
    await vi.advanceTimersByTimeAsync(PONG_WITHIN_MS);
    expect(sock.sent).toEqual(['ping', 'ping', 'ping']);
    expect(status()).toBe('live');
    expect(s.invalidate).not.toHaveBeenCalled();
  });

  it('counts any message as the answer to a ping', async () => {
    const s = setup();
    const sock = await live(s);
    await vi.advanceTimersByTimeAsync(PING_MS);
    sock.say({ seq: 1, topics: ['jobs'] });
    await vi.advanceTimersByTimeAsync(PONG_WITHIN_MS * 2);
    expect(status()).toBe('live');
  });
});

describe('no relay', () => {
  it('is off with no polling and no retries when the server says it is not set up', async () => {
    const s = setup(async () => {
      throw new ApiFailure(503, 'not_configured', 'No relay.');
    });
    s.rt.start();
    await flush();
    expect(status()).toBe('off');
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(s.getToken).toHaveBeenCalledTimes(1);
    expect(s.invalidate).not.toHaveBeenCalled();
    expect(s.sockets).toHaveLength(0);
  });
});

describe('coming back to the app', () => {
  const visible = (state: 'visible' | 'hidden') => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  };

  it('reloads everything', async () => {
    const s = setup();
    await live(s);
    visible('hidden');
    expect(s.invalidate).not.toHaveBeenCalled();
    visible('visible');
    await flush();
    expect(s.invalidate.mock.calls).toEqual([[]]);
  });

  it('reconnects at once when the relay is down, without waiting out the backoff', async () => {
    const s = setup();
    const sock = await live(s);
    sock.drop();
    visible('visible');
    await flush();
    expect(s.sockets).toHaveLength(2);
  });

  it('does nothing after stop', async () => {
    const s = setup();
    await live(s);
    s.rt.stop();
    s.invalidate.mockClear();
    visible('visible');
    await flush();
    expect(s.invalidate).not.toHaveBeenCalled();
  });
});
