import type { QueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import type { Hint, Topic } from '@sen/core/realtime';
import { ApiFailure, apiCall } from './api/client';
import { queryClient } from './index';

// Open screens update by themselves (D100, B06): the server tells a Worker "something changed" on this
// person's channel, the Worker sends the screen a hint (never data), and the hint invalidates the
// queries that topic changes, so they read through the API again. While the connection is down the
// screens reload every 30 s and say how old they are (frame/live-stamp.tsx).

/**
 * Which queries (by key prefix, data/hooks.ts) each topic changes. A later slice adds a line per topic
 * it names in packages/core/src/realtime.ts.
 */
export const TOPIC_QUERIES: Record<Topic, unknown[][]> = {
  settings: [['settings'], ['me']],
  jobs: [['settings']],
};

/** `off`: no relay here (a preview without one), or not started; `live`: connected; `down`: not connected, polling. */
export type LiveStatus = 'off' | 'live' | 'down';

interface LiveState {
  status: LiveStatus;
  /** When queries were last refreshed successfully: a hint handled, a reconnect, or a fallback reload. */
  updatedAt: Date | null;
  /** The dev panel's override, to show the stamp without breaking a connection. */
  forced: { updatedAt: Date } | null;
}

export const useLive = create<LiveState>(() => ({ status: 'off', updatedAt: null, forced: null }));

/** Waits between tries to reconnect, then every 30 s. */
export const BACKOFF_MS = [1000, 2000, 5000, 10_000];
export const POLL_MS = 30_000;
export const PING_MS = 25_000;
export const PONG_WITHIN_MS = 10_000;

/** The socket, as this file uses it: the browser's WebSocket, or a fake in tests. */
export interface Socket {
  send(data: string): void;
  close(): void;
  onopen: ((e: unknown) => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  onclose: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
}

export interface RealtimeDeps {
  client: QueryClient;
  /** A pass to the relay: `{ url, pass }`; throws an ApiFailure (503 `not_configured` when there is no relay). */
  token: () => Promise<{ url: string; pass: string }>;
  open: (url: string) => Socket;
  now: () => Date;
  online: () => boolean;
}

const isTopic = (t: unknown): t is Topic => typeof t === 'string' && t in TOPIC_QUERIES;

function parseHint(data: unknown): Hint | null {
  if (typeof data !== 'string') return null;
  try {
    const h = JSON.parse(data) as Partial<Hint> | null;
    if (!h || typeof h.seq !== 'number' || !Array.isArray(h.topics)) return null;
    return { seq: h.seq, topics: h.topics.filter(isTopic) };
  } catch {
    return null;
  }
}

/** The relay's connection and its fallbacks, with everything it touches passed in so a test can fake it. */
export function createRealtime(deps: RealtimeDeps) {
  const { client } = deps;
  let running = false;
  let socket: Socket | null = null;
  let lastSeq: number | null = null;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let poll: ReturnType<typeof setInterval> | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;
  let dead: ReturnType<typeof setTimeout> | undefined;
  // a connection attempt in flight, so two triggers (a timer and the app resuming) never open two sockets
  let connecting = false;
  // counts starts and stops, so a pass that arrives after a stop (or a stop and a start) is dropped
  let gen = 0;

  const set = (status: LiveStatus) => useLive.setState({ status });

  /** Marks the refresh done when its refetches have settled and the network answered. */
  async function settle(work: Promise<unknown>) {
    await work;
    const failed = client
      .getQueryCache()
      .findAll({ type: 'active', predicate: (q) => q.state.fetchStatus === 'idle' && q.state.status === 'error' });
    if (deps.online() && failed.length === 0) useLive.setState({ updatedAt: deps.now() });
  }
  const refreshAll = () => settle(client.invalidateQueries());

  function stopTimers() {
    clearInterval(ping);
    clearTimeout(dead);
    ping = dead = undefined;
  }

  function stopPolling() {
    clearInterval(poll);
    poll = undefined;
  }

  function startPolling() {
    // only while the relay is down: the screens that are open reload, and nothing else
    poll ??= setInterval(() => void settle(client.invalidateQueries({ refetchType: 'active' })), POLL_MS);
  }

  function scheduleRetry() {
    clearTimeout(retry);
    const wait = BACKOFF_MS[attempt] ?? POLL_MS;
    attempt += 1;
    retry = setTimeout(() => void connect(), wait);
  }

  /** The connection is gone, or was never there: say so, poll, and try again after a wait. */
  function down() {
    stopTimers();
    if (socket) {
      const s = socket;
      socket = null;
      s.onopen = s.onmessage = s.onclose = s.onerror = null;
      try {
        s.close();
      } catch {
        // already closed
      }
    }
    if (!running) return;
    set('down');
    startPolling();
    scheduleRetry();
  }

  async function connect() {
    if (!running || socket || connecting) return;
    connecting = true;
    clearTimeout(retry);
    const mine = gen;
    let t: { url: string; pass: string };
    try {
      t = await deps.token();
    } catch (e) {
      if (mine !== gen) return;
      connecting = false;
      if (!running) return;
      if (e instanceof ApiFailure && e.code === 'not_configured') {
        // no relay here: no stamp, no polling, no retries until the next sign-in or app start
        stop(false);
        return;
      }
      down();
      return;
    }
    if (mine !== gen) return;
    connecting = false;
    if (!running) return;
    const s = deps.open(`${t.url}?pass=${encodeURIComponent(t.pass)}`);
    socket = s;
    lastSeq = null;
    s.onopen = () => {
      if (socket !== s) return;
      const wasDown = useLive.getState().status === 'down';
      attempt = 0;
      stopPolling();
      set('live');
      // hints may have been missed while it was down
      if (wasDown) void refreshAll();
      else useLive.setState((st) => ({ updatedAt: st.updatedAt ?? deps.now() }));
      ping = setInterval(beat, PING_MS);
    };
    s.onmessage = (e) => {
      if (socket !== s) return;
      // anything from the relay shows it is alive
      clearTimeout(dead);
      dead = undefined;
      if (e.data === 'pong') return;
      const h = parseHint(e.data);
      if (!h) return;
      const gap = lastSeq !== null && h.seq !== lastSeq + 1;
      lastSeq = h.seq;
      if (gap) {
        void refreshAll();
        return;
      }
      const keys = [...new Set(h.topics.flatMap((t) => TOPIC_QUERIES[t].map((k) => JSON.stringify(k))))].map(
        (k) => JSON.parse(k) as unknown[],
      );
      if (keys.length) void settle(Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey }))));
    };
    s.onclose = () => {
      if (socket === s) down();
    };
    s.onerror = () => {
      if (socket === s) down();
    };
  }

  /** A ping now; no pong or any message within 10 s means the socket died without a close. */
  function beat() {
    const s = socket;
    if (!s) return;
    try {
      s.send('ping');
    } catch {
      down();
      return;
    }
    dead ??= setTimeout(() => {
      dead = undefined;
      if (socket === s) down();
    }, PONG_WITHIN_MS);
  }

  function onVisible() {
    if (!running || document.visibilityState !== 'visible') return;
    void refreshAll();
    if (socket) beat();
    else if (useLive.getState().status === 'down') {
      attempt = 0;
      void connect();
    }
  }
  function onOffline() {
    if (running) down();
  }
  function onOnline() {
    if (running && !socket && useLive.getState().status === 'down') {
      attempt = 0;
      void connect();
    }
  }

  function stop(clearStamp = true) {
    running = false;
    gen += 1;
    clearTimeout(retry);
    retry = undefined;
    stopPolling();
    stopTimers();
    if (socket) {
      const s = socket;
      socket = null;
      s.onopen = s.onmessage = s.onclose = s.onerror = null;
      try {
        s.close();
      } catch {
        // already closed
      }
    }
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
    attempt = 0;
    lastSeq = null;
    connecting = false;
    useLive.setState({ status: 'off', ...(clearStamp ? { updatedAt: null } : {}) });
  }

  return {
    /** Starts once; another call does nothing until `stop`. */
    start() {
      if (running) return;
      running = true;
      gen += 1;
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('offline', onOffline);
      window.addEventListener('online', onOnline);
      if (!deps.online()) {
        down();
        return;
      }
      void connect();
    },
    /** Sign-out: close, and forget. A later `start` begins again. */
    stop: () => stop(),
  };
}

// `off` keeps `running` false after a 503 not_configured, but a repeated `start()` would try again and
// get the same answer, so the module remembers it for the session
let unavailable = false;

const live =
  typeof window === 'undefined'
    ? null
    : createRealtime({
        client: queryClient,
        token: async () => {
          try {
            return await apiCall<{ url: string; pass: string }>('/realtime/token', { body: {} });
          } catch (e) {
            if (e instanceof ApiFailure && e.code === 'not_configured') unavailable = true;
            throw e;
          }
        },
        open: (url) => new WebSocket(url) as unknown as Socket,
        now: () => new Date(),
        online: () => navigator.onLine !== false,
      });

/** After sign-in, in the api build only; the fake and `none` builds have no relay. */
export function startRealtime() {
  if (__SEN_BACKEND__ !== 'api' || unavailable) return;
  live?.start();
}

/** At sign-out, or when the session is gone. */
export function stopRealtime() {
  unavailable = false;
  live?.stop();
}
