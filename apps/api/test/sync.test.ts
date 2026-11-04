import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { klDay } from '@sen/core/cycles';
import type { SyncEvent } from '@sen/core/sync';
import { createApp, type Deps } from '../src/app';
import { asPerson } from '../src/db';
import { captureWatchdog, type JobCtx } from '../src/jobs/frames';
import { captureHealth } from '../src/sync/health';
import type { PushMessage } from '../src/jobs/push';
import { LIMITS } from '../src/limits';
import { dedupeKey, eventId } from '@sen/db';

// The outbox's sync against the local Postgres (pnpm test:db, B07): the same batch twice is a no-op,
// a bad item is refused alone, the shell's bearer session, the Capture switch, commands applied once,
// tombstones, the pull-down by version, the watchdog on a fake clock, and Sign out everywhere.
const HOST = process.env.PGHOST ?? '127.0.0.1';
const url = (role: string) => `postgres://${role}@${HOST}:5432/sen_test`;
const owner = new pg.Pool({ connectionString: url('sen_owner'), max: 2 });
const appPool = new pg.Pool({ connectionString: url('app_user'), max: 10 });
const authPool = new pg.Pool({ connectionString: url('sen_auth'), max: 5 });

const pushed: { userId: string; msg: PushMessage }[] = [];
const hints: { userId: string; topics: string[] }[] = [];
const push = { on: true, send: async (userId: string, msg: PushMessage) => (pushed.push({ userId, msg }), 1) };
const relay = {
  on: true,
  hint: async (userId: string, topics: string[]) => void hints.push({ userId, topics }),
  pass: async () => null,
  wake: async () => undefined,
};
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

const phone = { id: randomUUID(), email: `sync-phone-${randomUUID()}@example.com` };
const other = { id: randomUUID(), email: `sync-other-${randomUUID()}@example.com` };
const ours = [phone.id, other.id];
let ip = 0;

interface Init {
  method?: string;
  body?: unknown;
  cookie?: string;
  bearer?: string;
  origin?: string | null;
}
async function call(path: string, init: Init = {}) {
  const res = await api.request(`${ORIGIN}${path}`, {
    method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
    headers: {
      ...(init.origin === null ? {} : { origin: init.origin ?? ORIGIN }),
      'x-forwarded-for': `10.8.0.${++ip % 250}`,
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(init.cookie ? { cookie: init.cookie } : {}),
      ...(init.bearer ? { authorization: `Bearer ${init.bearer}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a test reads whatever JSON came back
  return { status: res.status, headers: res.headers, body: text ? (JSON.parse(text) as Record<string, any>) : null };
}

/** Signs in through Sen's own routes: the cookie a browser (or the shell's WebView) would keep, and its token. */
async function signIn(email: string) {
  await call('/api/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in' } });
  const res = await api.request(`${ORIGIN}/api/auth/sign-in/email-otp`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': `10.8.1.${++ip % 250}` },
    body: JSON.stringify({ email, otp: codes.get(email) }),
  });
  const pairs = res.headers.getSetCookie().map((c) => c.split(';')[0]!);
  const session = pairs.find((p) => p.split('=')[0]!.endsWith('better-auth.session_token'))!;
  return { cookie: pairs.join('; '), token: session.slice(session.indexOf('=') + 1), headers: res.headers };
}

/** A captured notification as the shell sends it, with its derived id. */
function event(userId: string, n: number, text = `You paid RM${n}.00 to •-ELEVEN`): SyncEvent {
  const when = Date.UTC(2026, 10, 1, 1, 0, n);
  const e = {
    package: 'my.com.tngdigital.ewallet',
    channelId: 'payments',
    notificationKey: `0|my.com.tngdigital.ewallet|${n}|null|10123`,
    postedAt: new Date(when + 50).toISOString(),
    notifiedAt: new Date(when).toISOString(),
    title: 'Payment',
    text,
    bigText: null,
    maybeOtp: false,
  };
  const key = dedupeKey(e.package, e.notificationKey, when, e.title, e.text, e.bigText);
  return { ...e, id: eventId(userId, key), dedupeKey: key };
}

const beat = (connected = true) => ({
  id: randomUUID(),
  listenerConnected: connected,
  access: true,
  lastBankEventAt: null,
  appVersion: '0.7.0',
});
const setFeatures = (id: string, f: Record<string, boolean>) =>
  owner.query('update user_access set features = $2 where user_id = $1', [id, f]);
const count = async (q: string, args: unknown[]) => Number((await owner.query(q, args)).rows[0].n);

let s = { phone: { cookie: '', token: '' }, other: { cookie: '', token: '' } };

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
  for (const p of [phone, other]) {
    await owner.query('insert into auth_user (id, name, email, email_verified) values ($1, $2, $3, true)', [
      p.id,
      'Sync',
      p.email,
    ]);
    await owner.query('insert into user_access (user_id, is_admin, features) values ($1, false, $2)', [p.id, ON]);
  }
  s = { phone: await signIn(phone.email), other: await signIn(other.email) };
});

beforeEach(async () => {
  pushed.length = 0;
  hints.length = 0;
  await setFeatures(phone.id, ON);
});

afterAll(async () => {
  await owner.query('delete from auth_user where id = any($1)', [ours]);
  await Promise.all([owner.end(), appPool.end(), authPool.end()]);
});

describe('the shell’s session', () => {
  it('signing in never hands page scripts the token', async () => {
    const { headers } = await signIn(phone.email);
    expect(headers.get('set-auth-token')).toBeNull();
  });

  it('the shell syncs with the WebView’s session as a bearer token, with no Origin', async () => {
    const r = await call('/api/sync', { body: { heartbeat: beat() }, bearer: s.phone.token, origin: null });
    expect(r.status).toBe(200);
    expect(r.body?.capture).toBe(true);
  });

  it('an unsigned token, or none, is signed out', async () => {
    const bare = decodeURIComponent(s.phone.token).split('.')[0]!;
    expect((await call('/api/sync', { body: {}, bearer: bare, origin: null })).status).toBe(401);
    expect((await call('/api/sync', { body: {}, origin: null })).status).toBe(401);
  });
});

describe('/sync', () => {
  it('stores new events, and the same batch again adds nothing', async () => {
    const batch = { events: [event(phone.id, 1), event(phone.id, 2)], heartbeat: beat() };
    const first = await call('/api/sync', { body: batch, bearer: s.phone.token, origin: null });
    expect(first.status).toBe(200);
    expect(first.body?.synced.events).toEqual(batch.events.map((e) => e.id));
    expect(hints).toContainEqual({ userId: phone.id, topics: ['capture'] });
    // a retry, a replay after a reconnect, a reinstall, a second phone: the same ids again
    const again = await call('/api/sync', { body: { events: batch.events }, bearer: s.phone.token, origin: null });
    expect(again.body?.synced.events).toEqual(batch.events.map((e) => e.id));
    expect(await count('select count(*) n from bank_events where user_id = $1', [phone.id])).toBe(2);
  });

  it('refuses a bad event alone, and keeps the rest', async () => {
    const good = event(phone.id, 3);
    const wrongId = { ...event(phone.id, 4), id: randomUUID() };
    const someoneElses = event(other.id, 5);
    const edited = { ...event(phone.id, 6), text: 'You paid RM600.00 to •-ELEVEN' };
    const r = await call('/api/sync', {
      body: { events: [good, wrongId, someoneElses, edited, { id: 'x' }] },
      bearer: s.phone.token,
      origin: null,
    });
    expect(r.status).toBe(200);
    expect(r.body?.synced.events).toEqual([good.id]);
    expect(r.body?.refused.events).toEqual([
      { id: wrongId.id, reason: 'id' },
      { id: someoneElses.id, reason: 'id' },
      { id: edited.id, reason: 'dedupe_key' },
      { id: 'x', reason: 'malformed' },
    ]);
  });

  it('with Capture off, refuses events with its code, and still takes the heartbeat', async () => {
    await setFeatures(phone.id, { ...ON, capture: false });
    const r = await call('/api/sync', { body: { events: [event(phone.id, 7)] }, bearer: s.phone.token, origin: null });
    expect(r.status).toBe(403);
    expect(r.body?.code).toBe('capture_off');
    const hb = await call('/api/sync', { body: { heartbeat: beat() }, bearer: s.phone.token, origin: null });
    expect(hb.status).toBe(200);
    expect(hb.body?.capture).toBe(false);
    expect(
      await count('select count(*) n from bank_events where user_id = $1 and text like $2', [phone.id, '%RM7.00%']),
    ).toBe(0);
  });

  it('with the shell off, refuses the shell', async () => {
    await setFeatures(phone.id, { ...ON, shell: false });
    const r = await call('/api/sync', { body: {}, bearer: s.phone.token, origin: null });
    expect(r.status).toBe(403);
    expect(r.body?.code).toBe('shell_off');
  });

  it('applies a command once: a retry can’t undo a change made since on another device', async () => {
    const cmd = {
      id: randomUUID(),
      madeAt: new Date().toISOString(),
      command: { type: 'setting.set', key: 'you.payday', value: { kind: 'day', day: 25 } },
    };
    const first = await call('/api/sync', { body: { commands: [cmd] }, bearer: s.phone.token, origin: null });
    expect(first.body?.synced.commands).toEqual([{ id: cmd.id, status: 'applied', said: 'Payday saved' }]);
    // the browser changes it
    await call('/api/commands', {
      body: { type: 'setting.set', key: 'you.payday', value: { kind: 'last-working' } },
      cookie: s.phone.cookie,
    });
    // the shell never got its answer, and sends the command again
    const retry = await call('/api/sync', { body: { commands: [cmd] }, bearer: s.phone.token, origin: null });
    expect(retry.body?.synced.commands).toEqual([{ id: cmd.id, status: 'already', said: '' }]);
    const row = await owner.query('select expected_payday from user_settings where user_id = $1', [phone.id]);
    expect(row.rows[0].expected_payday).toBe('last-working');
  });

  it('refuses a command not built yet, and applies the rest', async () => {
    const no = {
      id: randomUUID(),
      madeAt: new Date().toISOString(),
      command: { type: 'txn.delete', id: randomUUID() },
    };
    const yes = {
      id: randomUUID(),
      madeAt: new Date().toISOString(),
      command: { type: 'setting.set', key: 'you.bankNames', value: 'SYNC P' },
    };
    const r = await call('/api/sync', { body: { commands: [no, yes] }, bearer: s.phone.token, origin: null });
    expect(r.body?.synced.commands.map((c: { status: string }) => c.status)).toEqual(['refused', 'applied']);
    expect(await count('select count(*) n from outbox_applied where user_id = $1 and id = $2', [phone.id, no.id])).toBe(
      0,
    );
  });

  it('an edit applies once, and only its fields', async () => {
    const e = event(phone.id, 8);
    await call('/api/sync', { body: { events: [e] }, bearer: s.phone.token, origin: null });
    const edit = { id: randomUUID(), kind: 'bank_event', rowId: e.id, fields: { parse_status: 'skipped' } };
    const r = await call('/api/sync', { body: { edits: [edit] }, bearer: s.phone.token, origin: null });
    expect(r.body?.synced.edits).toEqual([edit.id]);
    // the server re-reads it since; the retried edit must not undo that
    await owner.query('update bank_events set parse_status = \'parsed\', parsed = \'{"by":"server"}\' where id = $1', [
      e.id,
    ]);
    await call('/api/sync', { body: { edits: [edit] }, bearer: s.phone.token, origin: null });
    const row = await owner.query('select parse_status, parsed from bank_events where id = $1', [e.id]);
    expect(row.rows[0]).toEqual({ parse_status: 'parsed', parsed: { by: 'server' } });
    const missing = { id: randomUUID(), kind: 'bank_event', rowId: randomUUID(), fields: { parse_status: 'skipped' } };
    const m = await call('/api/sync', { body: { edits: [missing] }, bearer: s.phone.token, origin: null });
    expect(m.body?.refused.edits).toEqual([{ id: missing.id, reason: 'not_found' }]);
  });
});

describe('the chosen apps', () => {
  it('sync up, pull down by version, and a stale phone can’t bring a removed one back', async () => {
    const id = randomUUID();
    const chosen = { id, package: 'com.ryt.bank', label: 'Ryt', chosenAt: '2026-11-01T00:00:00.000Z', deletedAt: null };
    await call('/api/sync', { body: { captureApps: [chosen] }, bearer: s.phone.token, origin: null });
    const down = await call('/api/sync/changes?since=0', { bearer: s.phone.token, origin: null });
    expect(down.body?.captureApps).toEqual([chosen]);
    const v1 = down.body?.version as number;
    // removed on this phone
    await call('/api/sync', {
      body: { captureApps: [{ ...chosen, deletedAt: '2026-11-02T00:00:00.000Z' }] },
      bearer: s.phone.token,
      origin: null,
    });
    const after = await call(`/api/sync/changes?since=${v1}`, { bearer: s.phone.token, origin: null });
    expect(after.body?.captureApps).toEqual([{ ...chosen, deletedAt: '2026-11-02T00:00:00.000Z' }]);
    // a stale phone still holds it
    await call('/api/sync', { body: { captureApps: [chosen] }, bearer: s.phone.token, origin: null });
    expect(
      await count('select count(*) n from capture_apps where user_id = $1 and deleted_at is null', [phone.id]),
    ).toBe(0);
    const none = await call(`/api/sync/changes?since=${after.body?.version}`, { bearer: s.phone.token, origin: null });
    expect(none.body).toMatchObject({ captureApps: [], more: false, version: after.body?.version });
  });

  it('are nobody else’s to read', async () => {
    const r = await call('/api/sync/changes?since=0', { bearer: s.other.token, origin: null });
    expect(r.body?.captureApps).toEqual([]);
  });
});

describe('what the web app reads', () => {
  it('Captured on this phone is the server’s events, newest first, and only yours', async () => {
    const mine = await call('/api/captured', { cookie: s.phone.cookie });
    expect(mine.status).toBe(200);
    const times = (mine.body?.events as { postedAt: string }[]).map((e) => e.postedAt);
    expect(times.length).toBeGreaterThan(0);
    expect([...times].sort().reverse()).toEqual(times);
    expect((await call('/api/captured', { cookie: s.other.cookie })).body?.events).toEqual([]);
  });

  it('Captured on this phone pages through events that share a posted time', async () => {
    const at = new Date('2026-10-10T02:00:00Z');
    for (let i = 0; i < 51; i++)
      await owner.query(
        `insert into bank_events (id, user_id, package, notification_key, posted_at, notified_at, title, text, dedupe_key)
         values ($1, $2, 'my.com.tngdigital.ewallet', 'k', $3, $3, 'Payment', 'Tie', $4)`,
        [randomUUID(), other.id, at, randomUUID().replaceAll('-', '').repeat(2)],
      );
    const seen = new Set<string>();
    let before: string | null = null;
    do {
      const q: string = before ? `?before=${encodeURIComponent(before)}` : '';
      const r = await call(`/api/captured${q}`, { cookie: s.other.cookie });
      expect(r.status).toBe(200);
      for (const e of r.body?.events as { id: string }[]) seen.add(e.id);
      before = r.body?.next ?? null;
    } while (before);
    expect(seen.size).toBe(51);
    expect((await call('/api/captured?before=2026-10-10T02:00:00Z', { cookie: s.other.cookie })).status).toBe(400);
    await owner.query("delete from bank_events where user_id = $1 and text = 'Tie'", [other.id]);
  });

  it('capture’s health says when the morning job last ran, and if that’s over 26 hours', async () => {
    await owner.query(
      "insert into job_runs (user_id, job, run_key, status, ran_at) values ($1, 'morning', $2, 'ok', now() - interval '27 hours')",
      [phone.id, `morning:sync-${randomUUID()}`],
    );
    const h = await call('/api/capture/health', { cookie: s.phone.cookie });
    expect(h.body).toMatchObject({ on: true, schedulerLate: true });
    const r = await call('/api/sync', { body: {}, bearer: s.phone.token, origin: null });
    expect(Date.now() - Date.parse(r.body?.morningAt)).toBeGreaterThan(26 * 3_600_000);
  });
});

describe('the capture watchdog', () => {
  const ctx = (userId: string, now: Date): JobCtx => ({
    userId,
    isAdmin: false,
    now,
    day: klDay(now),
    db: (fn) => asPerson(appPool, userId, fn),
    push,
    relay,
  });

  const H = 3_600_000;
  /** 10:00 in Kuala Lumpur on a day of its own, so each test's once-a-day alert is its own. */
  const day = (n: number) => new Date(Date.UTC(2027, 0, n, 2));
  /** The phone's capture state, set outright: one heartbeat and at most one event, so each rule is tested alone. */
  const state = async (
    now: Date,
    o: {
      beatAgo: number;
      connected?: boolean;
      access?: boolean;
      eventAgo?: number | null;
      eventAt?: Date;
      gotAt?: Date;
      listenAgo?: number;
    },
  ) => {
    await owner.query('delete from device_heartbeats where user_id = $1', [phone.id]);
    await owner.query('delete from bank_events where user_id = $1', [phone.id]);
    const beatAt = new Date(now.getTime() - o.beatAgo * H);
    if (o.listenAgo !== undefined)
      await owner.query(
        "insert into device_heartbeats (id, user_id, listener_connected, access, app_version, created_at) values ($1, $2, true, true, '0.7.0', $3)",
        [randomUUID(), phone.id, new Date(now.getTime() - o.listenAgo * H)],
      );
    await owner.query(
      "insert into device_heartbeats (id, user_id, listener_connected, access, app_version, created_at) values ($1, $2, $3, $4, '0.7.0', $5)",
      [randomUUID(), phone.id, o.connected ?? true, o.access ?? true, beatAt],
    );
    if (o.eventAgo === null) return;
    const posted = o.eventAt ?? new Date(now.getTime() - (o.eventAgo ?? 1) * H);
    // the server got it when it was posted, or now for one stamped in the future
    const got = o.gotAt ?? (posted.getTime() > now.getTime() ? now : posted);
    await owner.query(
      `insert into bank_events (id, user_id, package, notification_key, posted_at, notified_at, title, text, dedupe_key, created_at)
       values ($1, $2, 'my.com.tngdigital.ewallet', 'k', $3, $3, 'Payment', 'You paid RM1.00', $4, $5)`,
      [randomUUID(), phone.id, posted, randomUUID().replaceAll('-', '').repeat(2), got],
    );
  };
  const health = (now: Date) => asPerson(appPool, phone.id, (db) => captureHealth(db, phone.id, true, now));

  it('pushes once a day when the listener has been quiet for a day, though events are recent', async () => {
    const now = day(1);
    await state(now, { beatAgo: 25, eventAgo: 1 });
    expect((await health(now)).silent).toBe('no-heartbeat');
    await captureWatchdog(ctx(phone.id, now));
    // later the same Kuala Lumpur day: no second push
    await captureWatchdog(ctx(phone.id, new Date(now.getTime() + 60_000)));
    expect(pushed).toEqual([
      {
        userId: phone.id,
        msg: expect.objectContaining({ title: 'Capture may be off', body: expect.stringMatching(/for a day/) }),
      },
    ]);
    // the next day, still quiet: again
    await captureWatchdog(ctx(phone.id, new Date(now.getTime() + 86_400_000)));
    expect(pushed).toHaveLength(2);
  });

  it('stays quiet 23 hours after the last heartbeat, with an event the same day', async () => {
    const now = day(4);
    await state(now, { beatAgo: 23, eventAgo: 2 });
    await captureWatchdog(ctx(phone.id, now));
    expect(pushed).toEqual([]);
  });

  it('pushes at once when the phone says notification access is off, though it synced an hour ago', async () => {
    const now = day(5);
    await state(now, { beatAgo: 1, access: false, connected: false, eventAgo: 2 });
    const h = await health(now);
    expect(h).toMatchObject({ silent: 'no-access', access: false, listenerConnected: false });
    await captureWatchdog(ctx(phone.id, now));
    expect(pushed[0]?.msg.body).toMatch(/can’t read notifications/);
  });

  it('counts a day from the listener’s own last heartbeat, not a sync that says it’s off', async () => {
    const now = day(6);
    await state(now, { beatAgo: 1, connected: false, listenAgo: 25, eventAgo: 2 });
    const h = await health(now);
    expect(h.silent).toBe('no-heartbeat');
    expect(Date.parse(h.lastListenAt!)).toBe(now.getTime() - 25 * H);
    await captureWatchdog(ctx(phone.id, now));
    expect(pushed[0]?.msg.body).toMatch(/listener on your phone has been off for a day/);
    await state(now, { beatAgo: 1, connected: false, listenAgo: 20, eventAgo: 2 });
    expect((await health(now)).silent).toBeNull();
  });

  it('pushes when no event has come for 2 days, though heartbeats do', async () => {
    const now = day(7);
    await state(now, { beatAgo: 1, eventAgo: 49 });
    expect((await health(now)).silent).toBe('no-events');
    await state(now, { beatAgo: 1, eventAgo: 47 });
    expect((await health(now)).silent).toBeNull();
    await state(now, { beatAgo: 1, eventAgo: 49 });
    await captureWatchdog(ctx(phone.id, now));
    expect(pushed[0]?.msg.body).toMatch(/No payment notifications for 2 days/);
  });

  it('isn’t fooled by a phone clock running behind: an event counts when the server got it', async () => {
    const now = day(9);
    await state(now, { beatAgo: 1, eventAt: new Date(now.getTime() - 72 * H), gotAt: new Date(now.getTime() - H) });
    expect((await health(now)).silent).toBeNull();
  });

  it('isn’t silenced by a phone clock running ahead', async () => {
    const now = day(8);
    // the last real event was 3 days ago; the phone stamped this one a week ahead, and the server got it then
    await state(now, {
      beatAgo: 1,
      eventAt: new Date(now.getTime() + 7 * 86_400_000),
      gotAt: new Date(now.getTime() - 72 * H),
    });
    await owner.query('update device_heartbeats set last_bank_event_at = $2 where user_id = $1', [
      phone.id,
      new Date(now.getTime() + 7 * 86_400_000),
    ]);
    expect((await health(now)).silent).toBe('no-events');
  });

  it('stays quiet with Capture off, or with no shell ever synced', async () => {
    await setFeatures(phone.id, { ...ON, capture: false });
    await captureWatchdog(ctx(phone.id, new Date(Date.now() + 9 * 86_400_000)));
    await captureWatchdog(ctx(other.id, new Date(Date.now() + 9 * 86_400_000)));
    expect(pushed).toEqual([]);
  });
});

describe('Sign out everywhere', () => {
  it('from a browser, signs the shell out too', async () => {
    const browser = await signIn(phone.email);
    const shell = await signIn(phone.email);
    expect((await call('/api/sync', { body: {}, bearer: shell.token, origin: null })).status).toBe(200);
    expect((await call('/api/auth/revoke-sessions', { body: {}, cookie: browser.cookie })).status).toBe(200);
    expect((await call('/api/sync', { body: {}, bearer: shell.token, origin: null })).status).toBe(401);
  });
});
