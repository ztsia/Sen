// QA B07 run 2 (scoped): the reviewer's probes of capture's health and /captured's paging, after the fixes.
// Against the local sen_test after `pnpm test:db`. Not part of any suite: run it with the config beside it,
//   pnpm exec vitest run --config qa/B07/vitest.probe.config.ts
// Each `it` records what it saw with `note()`, so a finding's evidence is the real output; the
// expectations are the spec's, so a red test here is a finding.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { klDay } from '@sen/core/cycles';
import type { SyncEvent } from '@sen/core/sync';
import { dedupeKey, eventId } from '@sen/db';
import { createApp, type Deps } from '../../apps/api/src/app';
import { asPerson } from '../../apps/api/src/db';
import { captureWatchdog, type JobCtx } from '../../apps/api/src/jobs/frames';
import type { PushMessage } from '../../apps/api/src/jobs/push';
import { LIMITS } from '../../apps/api/src/limits';

const HOST = process.env.PGHOST ?? '127.0.0.1';
const url = (role: string) => `postgres://${role}@${HOST}:5432/sen_test`;
const owner = new pg.Pool({ connectionString: url('sen_owner'), max: 2 });
const appPool = new pg.Pool({ connectionString: url('app_user'), max: 10 });
const authPool = new pg.Pool({ connectionString: url('sen_auth'), max: 5 });

const pushed: { userId: string; msg: PushMessage }[] = [];
const push = { on: true, send: async (userId: string, msg: PushMessage) => (pushed.push({ userId, msg }), 1) };
const relay = { on: true, hint: async () => undefined, pass: async () => null, wake: async () => undefined };
const codes = new Map<string, string>();
const deps: Deps = {
  env: {
    target: 'production',
    secret: 'k'.repeat(48),
    urls: { app_user: url('app_user'), sen_auth: url('sen_auth') },
    gmail: null,
    scheduler: 's'.repeat(40),
    relay: null,
    firebase: null,
  },
  app: appPool,
  auth: authPool,
  mailer: { sendCode: async (to, c) => void codes.set(to, c) },
  push,
  relay,
};
const { api } = createApp(deps);
const ORIGIN = 'https://sen.test';
const ON = { shell: true, capture: true, agent: true, splits: true, email: false, calendar: false, claims: false };

const a = { id: randomUUID(), email: `qa-b07-a-${randomUUID()}@example.com` };
const b = { id: randomUUID(), email: `qa-b07-b-${randomUUID()}@example.com` };
const admin = { id: randomUUID(), email: `qa-b07-admin-${randomUUID()}@example.com` };
const ours = [a.id, b.id, admin.id];
let ip = 0;

export const notes: string[] = [];
const note = (s: string) => {
  notes.push(s);
  console.log(`[probe] ${s}`);
};

interface Init {
  method?: string;
  body?: unknown;
  raw?: string;
  cookie?: string;
  bearer?: string;
  origin?: string | null;
}
async function call(path: string, init: Init = {}) {
  const res = await api.request(`${ORIGIN}${path}`, {
    method: init.method ?? (init.body !== undefined || init.raw !== undefined ? 'POST' : 'GET'),
    headers: {
      ...(init.origin === null ? {} : { origin: init.origin ?? ORIGIN }),
      'x-forwarded-for': `10.9.0.${++ip % 250}`,
      ...(init.body !== undefined || init.raw !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(init.cookie ? { cookie: init.cookie } : {}),
      ...(init.bearer ? { authorization: `Bearer ${init.bearer}` } : {}),
    },
    body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
  const text = await res.text();
  let body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { status: res.status, body };
}

async function signIn(email: string) {
  await call('/api/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in' } });
  const res = await api.request(`${ORIGIN}/api/auth/sign-in/email-otp`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': `10.9.1.${++ip % 250}` },
    body: JSON.stringify({ email, otp: codes.get(email) }),
  });
  const pairs = res.headers.getSetCookie().map((c) => c.split(';')[0]!);
  const session = pairs.find((p) => p.split('=')[0]!.endsWith('better-auth.session_token'))!;
  return { cookie: pairs.join('; '), token: session.slice(session.indexOf('=') + 1) };
}

let n = 1000;
function event(
  userId: string,
  o: Partial<{ when: number; posted: number; title: string; text: string; key: string }> = {},
): SyncEvent {
  const i = ++n;
  const when = o.when ?? Date.UTC(2026, 9, 1, 1, 0, 0) + i * 1000;
  const e = {
    package: 'com.rytbank.app',
    channelId: 'payments',
    notificationKey: o.key ?? `0|com.rytbank.app|${i}|null|10123`,
    postedAt: new Date(o.posted ?? when + 50).toISOString(),
    notifiedAt: new Date(when).toISOString(),
    title: o.title ?? 'Payment successful',
    text: o.text ?? `You paid RM${i}.00 to KEDAI MAJU`,
    bigText: null,
    maybeOtp: false,
  };
  const key = dedupeKey(e.package, e.notificationKey, when, e.title, e.text, e.bigText);
  return { ...e, id: eventId(userId, key), dedupeKey: key };
}
const setFeatures = (id: string, f: Record<string, boolean>) =>
  owner.query('update user_access set features = $2 where user_id = $1', [id, f]);
const wipe = async (id: string) => {
  for (const t of ['bank_events', 'capture_apps', 'device_heartbeats', 'outbox_applied', 'alerts_sent'])
    await owner.query(`delete from ${t} where user_id = $1`, [id]);
};
const ctx = (userId: string, now: Date): JobCtx => ({
  userId,
  isAdmin: false,
  now,
  day: klDay(now),
  db: (fn) => asPerson(appPool, userId, fn),
  push,
  relay,
});

let s = { a: { cookie: '', token: '' }, b: { cookie: '', token: '' }, admin: { cookie: '', token: '' } };
const sync = (who: 'a' | 'b', body: unknown) => call('/api/sync', { body, bearer: s[who].token, origin: null });

beforeAll(async () => {
  for (const k of [
    'codesPerEmail',
    'codesPerEmailDay',
    'codesPerIpDay',
    'codesPerDay',
    'codesPerIp',
    'lookupsPerIp',
  ] as const)
    LIMITS[k].max = 1000;
  for (const p of [a, b, admin]) {
    await owner.query('insert into auth_user (id, name, email, email_verified) values ($1, $2, $3, true)', [
      p.id,
      'QA',
      p.email,
    ]);
    await owner.query('insert into user_access (user_id, is_admin, features) values ($1, $2, $3)', [
      p.id,
      p === admin,
      ON,
    ]);
  }
  s = { a: await signIn(a.email), b: await signIn(b.email), admin: await signIn(admin.email) };
});
beforeEach(async () => {
  pushed.length = 0;
  for (const p of ours) {
    await setFeatures(p, ON);
    await wipe(p);
  }
});
afterAll(async () => {
  await owner.query('delete from auth_user where id = any($1)', [ours]);
  await Promise.all([owner.end(), appPool.end(), authPool.end()]);
});

const H = 3_600_000;
/** A heartbeat row as the shell's sync leaves it, at a server time `ago` ms before now. */
const beatAt = (id: string, ago: number, o: { connected: boolean; access: boolean }) =>
  owner.query(
    'insert into device_heartbeats (id, user_id, listener_connected, access, app_version, created_at) values ($1, $2, $3, $4, $5, now() - make_interval(secs => $6::double precision / 1000))',
    [randomUUID(), id, o.connected, o.access, '0.7.0', ago],
  );
/** An event the server got `ago` ms before now, stamped by the phone `skew` ms off (inserted as the owner: created_at is the server's). */
async function eventAt(id: 'a' | 'b', ago: number, skew = 0) {
  const uid = id === 'a' ? a.id : b.id;
  const t = Date.now() - ago + skew;
  const e = event(uid, { when: t, posted: t });
  await owner.query(
    `insert into bank_events (id, user_id, package, channel_id, notification_key, posted_at, notified_at, title, text, dedupe_key, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now() - make_interval(secs => $11::double precision / 1000))`,
    [e.id, uid, e.package, e.channelId, e.notificationKey, e.postedAt, e.notifiedAt, e.title, e.text, e.dedupeKey, ago],
  );
}
const health = async () => (await call('/api/capture/health', { cookie: s.a.cookie })).body;

describe('R2-AC-1 access off, then back', () => {
  it('pushes once naming access; Home says Capture is off; back on, nothing', async () => {
    await eventAt('a', 2 * H);
    await beatAt(a.id, 3 * H, { connected: true, access: true });
    await beatAt(a.id, 1 * H, { connected: false, access: false });
    const h1 = await health();
    const now = new Date();
    await captureWatchdog(ctx(a.id, now));
    await captureWatchdog(ctx(a.id, new Date(now.getTime() + 20 * 60_000)));
    note(`access off: health.silent ${h1.silent}; pushes ${pushed.length}; body «${pushed[0]?.msg.body}»`);
    expect(h1.silent).toBe('no-access');
    expect(pushed).toHaveLength(1);
    expect(pushed[0]!.msg.body).toMatch(/access|can.t read/i);
    await beatAt(a.id, 0, { connected: true, access: true });
    const h2 = await health();
    pushed.length = 0;
    await captureWatchdog(ctx(a.id, new Date(now.getTime() + 86_400_000)));
    note(`access back: health.silent ${h2.silent}; pushes the next day ${pushed.length}`);
    expect([h2.silent, pushed.length]).toEqual([null, 0]);
  });
});

describe('R2-AC-2 the listener off, access on, daily syncs arriving', () => {
  it('23 h: quiet; 25 h: one push whose words say the listener is off', async () => {
    await eventAt('a', 1 * H);
    await beatAt(a.id, 23 * H, { connected: true, access: true });
    await beatAt(a.id, 1 * H, { connected: false, access: true });
    await captureWatchdog(ctx(a.id, new Date()));
    const at23 = pushed.length;
    await owner.query(
      "update device_heartbeats set created_at = created_at - interval '2 hours' where user_id = $1 and listener_connected",
      [a.id],
    );
    const h = await health();
    await captureWatchdog(ctx(a.id, new Date(Date.now() + 86_400_000)));
    note(
      `listener off: at 23 h pushes ${at23}; at 25 h pushes ${pushed.length}, silent ${h.silent}, listenerConnected ${h.listenerConnected}, lastListenAt ${h.lastListenAt}; push body «${pushed[0]?.msg.body}»`,
    );
    expect(at23).toBe(0);
    expect(pushed).toHaveLength(1);
    // the phone synced an hour ago: words saying Sen hasn't heard from it would be untrue
    expect(pushed[0]!.msg.body).not.toMatch(/hasn.t heard from your phone/);
  });
});

describe('R2-AC-3 Capture switched back on after days off', () => {
  it('the next morning, before any payment: no push', async () => {
    await eventAt('a', 4 * 24 * H);
    await beatAt(a.id, 4 * 24 * H, { connected: true, access: true });
    for (const d of [3, 2, 1]) await beatAt(a.id, d * 24 * H, { connected: false, access: true });
    await setFeatures(a.id, { ...ON, capture: false });
    // the sync that tells the shell it's on again carries the last heartbeat from before it rebinds
    await setFeatures(a.id, ON);
    await beatAt(a.id, 1 * H, { connected: false, access: true });
    const h = await health();
    await captureWatchdog(ctx(a.id, new Date(Date.now() + 8 * H)));
    note(
      `switched on 1 h ago, no connected heartbeat since: silent ${h.silent}; next-morning pushes ${pushed.length}; body «${pushed[0]?.msg.body ?? ''}»`,
    );
    expect(pushed).toHaveLength(0);
  });
});

describe('R2-AC-5 paging', () => {
  it('51 events a microsecond apart within one millisecond: all 51', async () => {
    const t = Date.UTC(2026, 9, 11, 2, 0, 0);
    const iso = new Date(t).toISOString().replace('Z', '');
    const evs = Array.from({ length: 51 }, (_, i) => ({
      ...event(a.id, { when: t + i, key: `us-${i}` }),
      postedAt: `${iso}${String(i + 100).padStart(3, '0')}Z`,
    }));
    const r = await sync('a', { events: evs });
    note(
      `microsecond postedAt accepted: ${r.status} synced ${r.body?.synced?.events?.length} refused ${JSON.stringify(r.body?.refused?.events?.slice(0, 1))}`,
    );
    const stored = (
      await owner.query(
        "select to_char(posted_at, 'HH24:MI:SS.US') t from bank_events where user_id = $1 order by posted_at desc limit 2",
        [a.id],
      )
    ).rows.map((x) => x.t);
    const seen = new Set<string>();
    let before: string | null = null;
    let pages = 0;
    do {
      const p = await call(`/api/captured${before ? `?before=${encodeURIComponent(before)}` : ''}`, {
        cookie: s.a.cookie,
      });
      for (const e of p.body.events) seen.add(e.id);
      before = p.body.next;
      pages++;
    } while (before && pages < 5);
    note(
      `sub-ms: stored like ${stored.join(', ')}; pages ${pages}; distinct seen ${seen.size} of ${r.body?.synced?.events?.length}`,
    );
    expect(seen.size).toBe(r.body?.synced?.events?.length);
  });

  it('cursors: malformed, old-style, tricks, over-long → 400 with the shape', async () => {
    const id = randomUUID();
    for (const c of [
      'abc',
      '2026-10-10T02:00:00.000Z',
      `2026-10-10T02:00:00.000Z_${id}_x`,
      `2026-10-10T02:00:00.000Z_notauuid`,
      `x_${id}`,
      `${'2026-10-10T02:00:00.000Z'}_${id}${'0'.repeat(80)}`,
      `2026-10-10T02:00:00.000+08:00_${id}`,
      "2026-10-10T02:00:00.000Z_' or 1=1--",
    ]) {
      const r = await call(`/api/captured?before=${encodeURIComponent(c)}`, { cookie: s.a.cookie });
      note(`cursor «${c.slice(0, 50)}»: ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
      expect(r.status).toBeLessThan(500);
    }
  });
});

describe('R2-AC-6 the phone clock', () => {
  it('3 days behind, events every day: no push', async () => {
    await beatAt(a.id, 1 * H, { connected: true, access: true });
    for (const d of [0, 1, 2]) await eventAt('a', d * 24 * H + 2 * H, -3 * 24 * H);
    const h = await health();
    await captureWatchdog(ctx(a.id, new Date()));
    note(
      `phone 3 days behind, a payment every day: lastEventAt ${h.lastEventAt}, silent ${h.silent}; pushes ${pushed.length}`,
    );
    expect(pushed).toHaveLength(0);
  });
});

describe('R2-AC-7 once a day', () => {
  it('two ticks in one KL day at different instants: one push; the next day: one more', async () => {
    await beatAt(a.id, 30 * H, { connected: true, access: true });
    const d0 = new Date(Date.now() + 2 * H);
    await captureWatchdog(ctx(a.id, d0));
    await captureWatchdog(ctx(a.id, new Date(d0.getTime() + 5 * 60_000)));
    const same = pushed.length;
    await captureWatchdog(ctx(a.id, new Date(d0.getTime() + 24 * H)));
    note(`once a day: same day ${same}, after the next day ${pushed.length}`);
    expect([same, pushed.length]).toEqual([1, 2]);
  });
});
