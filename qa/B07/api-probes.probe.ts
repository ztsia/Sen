// QA B07 run 1: the reviewer's own probes of /sync and its neighbours, against the local sen_test (after
// `pnpm test:db` has migrated it). Not part of any suite: run it with the config beside it,
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
function event(userId: string, o: Partial<{ when: number; posted: number; title: string; text: string; key: string }> = {}): SyncEvent {
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
const beat = (o: Partial<{ listenerConnected: boolean; access: boolean; lastBankEventAt: string | null }> = {}) => ({
  id: randomUUID(),
  listenerConnected: o.listenerConnected ?? true,
  access: o.access ?? true,
  lastBankEventAt: o.lastBankEventAt ?? null,
  appVersion: '0.7.0',
});
const setFeatures = (id: string, f: Record<string, boolean>) =>
  owner.query('update user_access set features = $2 where user_id = $1', [id, f]);
const count = async (q: string, args: unknown[]) => Number((await owner.query(q, args)).rows[0].n);
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
  for (const k of ['codesPerEmail', 'codesPerEmailDay', 'codesPerIpDay', 'codesPerDay', 'codesPerIp', 'lookupsPerIp'] as const)
    LIMITS[k].max = 1000;
  for (const p of [a, b, admin]) {
    await owner.query('insert into auth_user (id, name, email, email_verified) values ($1, $2, $3, true)', [p.id, 'QA', p.email]);
    await owner.query('insert into user_access (user_id, is_admin, features) values ($1, $2, $3)', [p.id, p === admin, ON]);
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

describe('dedupe (AC-4, AC-4s, AC-5)', () => {
  it('a batch posted three ways is one row; two whens are two; shifted field boundaries are two', async () => {
    const e = event(a.id);
    const r1 = await sync('a', { events: [e] });
    const r2 = await sync('a', { events: [e] });
    const r3 = await sync('a', { events: [event(a.id), e] });
    note(`dedupe: statuses ${r1.status},${r2.status},${r3.status}; rows for e = ${await count('select count(*) n from bank_events where id = $1', [e.id])}`);
    expect(await count('select count(*) n from bank_events where user_id = $1', [a.id])).toBe(2);
    const same = { text: 'You paid RM5.00 to KEDAI MAJU', key: '0|com.rytbank.app|77|null|10123' };
    await sync('a', { events: [event(a.id, { ...same, when: Date.UTC(2026, 9, 2, 4, 0, 0) }), event(a.id, { ...same, when: Date.UTC(2026, 9, 2, 4, 3, 0) })] });
    expect(await count("select count(*) n from bank_events where user_id = $1 and text = 'You paid RM5.00 to KEDAI MAJU'", [a.id])).toBe(2);
    const w = Date.UTC(2026, 9, 3, 1, 0, 0);
    await sync('a', { events: [event(a.id, { when: w, key: 'k1', title: 'ab', text: 'c' }), event(a.id, { when: w, key: 'k1', title: 'a', text: 'bc' })] });
    expect(await count("select count(*) n from bank_events where user_id = $1 and notification_key = 'k1'", [a.id])).toBe(2);
  });

  it('five identical batches at once: one row each, no 500', async () => {
    const batch = { events: [event(a.id), event(a.id)] };
    const rs = await Promise.all(Array.from({ length: 5 }, () => sync('a', batch)));
    note(`concurrent identical batches: statuses ${rs.map((r) => r.status).join(',')}`);
    expect(rs.every((r) => r.status === 200)).toBe(true);
    expect(await count('select count(*) n from bank_events where user_id = $1', [a.id])).toBe(2);
  });
});

describe('isolation (AC-1s, AC-14)', () => {
  it('B sending A’s exact event (A’s id) is refused; B’s own copy is B’s row', async () => {
    const ea = event(a.id, { when: Date.UTC(2026, 9, 5), text: 'You paid RM9.00 to KEDAI MAJU', key: 'iso' });
    await sync('a', { events: [ea] });
    const rb = await sync('b', { events: [ea] });
    note(`B sends A's id: ${JSON.stringify(rb.body?.refused?.events)}`);
    expect(rb.body?.refused?.events).toEqual([{ id: ea.id, reason: 'id' }]);
    const eb = event(b.id, { when: Date.UTC(2026, 9, 5), text: 'You paid RM9.00 to KEDAI MAJU', key: 'iso' });
    expect(eb.dedupeKey).toBe(ea.dedupeKey);
    const rb2 = await sync('b', { events: [eb] });
    expect(rb2.body?.synced?.events).toEqual([eb.id]);
    expect(await count('select count(*) n from bank_events where dedupe_key = $1', [ea.dedupeKey])).toBe(2);
    // B edits A's event by id: not found, A's row unchanged
    const ed = await sync('b', { edits: [{ id: randomUUID(), kind: 'bank_event', rowId: ea.id, fields: { parse_status: 'dismissed' } }] });
    note(`B edits A's event: ${JSON.stringify(ed.body?.refused?.edits)}`);
    expect(ed.body?.refused?.edits?.[0]?.reason).toBe('not_found');
    expect((await owner.query('select parse_status from bank_events where id = $1', [ea.id])).rows[0].parse_status).toBe('unparsed');
    // B's Captured shows only B's
    const cb = await call('/api/captured', { cookie: s.b.cookie });
    expect(cb.body.events.map((x: { id: string }) => x.id)).toEqual([eb.id]);
  });

  it('the admin reads no one’s chosen apps or events through /admin/members', async () => {
    await sync('a', { events: [event(a.id)], captureApps: [{ id: randomUUID(), package: 'com.rytbank.app', label: 'Ryt Bank', chosenAt: new Date().toISOString(), deletedAt: null }] });
    const m = await call('/api/admin/members', { cookie: s.admin.cookie });
    const txt = JSON.stringify(m.body);
    note(`admin members: status ${m.status}, mentions a package: ${/com\.rytbank|KEDAI/.test(txt)}`);
    expect(m.status).toBe(200);
    expect(txt).not.toMatch(/com\.rytbank|KEDAI/);
    const c = await call('/api/captured', { cookie: s.admin.cookie });
    expect(c.body.events).toEqual([]);
  });
});

describe('the Capture switch (AC-11, AC-12)', () => {
  it('a mixed batch with Capture off: what is refused and what is kept', async () => {
    await setFeatures(a.id, { ...ON, capture: false });
    const app = { id: randomUUID(), package: 'com.rytbank.app', label: 'Ryt Bank', chosenAt: new Date().toISOString(), deletedAt: null };
    const r = await sync('a', { events: [event(a.id)], captureApps: [app], heartbeat: beat() });
    const apps = await count('select count(*) n from capture_apps where user_id = $1', [a.id]);
    const beats = await count('select count(*) n from device_heartbeats where user_id = $1', [a.id]);
    note(`capture off, mixed batch: ${r.status} ${JSON.stringify(r.body)}; capture_apps ${apps}, heartbeats ${beats}`);
    expect(r.status).toBe(403);
    expect(r.body?.code).toBe('capture_off');
    expect(await count('select count(*) n from bank_events where user_id = $1', [a.id])).toBe(0);
    // the shell's resend without events (SyncRun.pushLoop) takes the rest
    const r2 = await sync('a', { captureApps: [app], heartbeat: beat() });
    expect(r2.status).toBe(200);
    expect(await count('select count(*) n from capture_apps where user_id = $1', [a.id])).toBe(1);
  });

  it('Capture missing from the switches (an older row) counts as off', async () => {
    await owner.query("update user_access set features = features - 'capture' where user_id = $1", [a.id]);
    const r = await sync('a', { events: [event(a.id)] });
    note(`capture key absent: ${r.status} ${r.body?.code}`);
    expect(r.status).toBe(403);
  });

  it('the shell off: /sync and /sync/changes refused, nothing written', async () => {
    await setFeatures(a.id, { ...ON, shell: false });
    const r = await sync('a', { events: [event(a.id)], heartbeat: beat() });
    const c = await call('/api/sync/changes', { bearer: s.a.token, origin: null });
    note(`shell off: sync ${r.status} ${r.body?.code}; changes ${c.status} ${c.body?.code}`);
    expect([r.status, c.status]).toEqual([403, 403]);
    expect(await count('select count(*) n from device_heartbeats where user_id = $1', [a.id])).toBe(0);
  });
});

describe('edits (AC-8, AC-9)', () => {
  it('an edit re-sent after another device’s change doesn’t undo it', async () => {
    const e = event(a.id);
    await sync('a', { events: [e] });
    const ed = { id: randomUUID(), kind: 'bank_event', rowId: e.id, fields: { parse_status: 'skipped' } };
    await sync('a', { edits: [ed] });
    await owner.query("update bank_events set parse_status = 'dismissed', linked_event_id = null where id = $1", [e.id]);
    const again = await sync('a', { edits: [ed] });
    const st = (await owner.query('select parse_status from bank_events where id = $1', [e.id])).rows[0].parse_status;
    note(`edit replay: synced ${JSON.stringify(again.body?.synced?.edits)}; status ${st}; ledger rows ${await count('select count(*) n from outbox_applied where id = $1', [ed.id])}`);
    expect(st).toBe('dismissed');
  });
});

describe('the offline copy (AC-17, AC-18)', () => {
  it('changes since a version: a choice and a removal, then nothing; no one else’s', async () => {
    const v0 = (await call('/api/sync/changes', { bearer: s.a.token, origin: null })).body.version;
    const c1 = { id: randomUUID(), package: 'my.com.tngdigital.ewallet', label: "Touch 'n Go eWallet", chosenAt: '2026-10-01T00:00:00.000Z', deletedAt: null };
    await sync('a', { captureApps: [c1] });
    await sync('b', { captureApps: [{ ...c1, id: randomUUID() }] });
    await sync('a', { captureApps: [{ ...c1, deletedAt: '2026-10-02T00:00:00.000Z' }] });
    const ch = await call(`/api/sync/changes?since=${v0}`, { bearer: s.a.token, origin: null });
    note(`changes since ${v0}: ${JSON.stringify(ch.body)}`);
    expect(ch.body.captureApps).toHaveLength(1); // the same row, changed twice: only its latest state
    expect(ch.body.captureApps[0].deletedAt).not.toBeNull();
    const again = await call(`/api/sync/changes?since=${ch.body.version}`, { bearer: s.a.token, origin: null });
    expect(again.body.captureApps).toEqual([]);
    // a stale phone re-sends the live choice
    await sync('a', { captureApps: [c1] });
    expect(await count('select count(*) n from capture_apps where user_id = $1 and deleted_at is null', [a.id])).toBe(0);
    for (const q of ['abc', '-1', '1.5', '99999999999999999999'])
      note(`changes?since=${q}: ${(await call(`/api/sync/changes?since=${q}`, { bearer: s.a.token, origin: null })).status}`);
  });

  it('the version counter is shared by everyone (what it tells another person)', async () => {
    const v0 = (await call('/api/sync/changes', { bearer: s.a.token, origin: null })).body.version;
    for (let i = 0; i < 5; i++)
      await sync('b', { captureApps: [{ id: randomUUID(), package: `com.qa.b${i}`, label: 'x', chosenAt: new Date().toISOString(), deletedAt: null }] });
    await sync('a', { captureApps: [{ id: randomUUID(), package: 'com.qa.a', label: 'x', chosenAt: new Date().toISOString(), deletedAt: null }] });
    const v1 = (await call(`/api/sync/changes?since=${v0}`, { bearer: s.a.token, origin: null })).body.version;
    note(`A's version jumped from ${v0} to ${v1} for A's one change: B's 5 changes are visible as a gap of ${v1 - v0 - 1}`);
  });
});

describe('the watchdog (AC-20)', () => {
  it('access revoked: the shell still syncs heartbeats saying so; does the push come within a day?', async () => {
    const lastPay = new Date(Date.now() - 20 * 3_600_000); // a payment yesterday evening
    await sync('a', { events: [event(a.id, { when: lastPay.getTime(), posted: lastPay.getTime() })], heartbeat: beat() });
    // access revoked; the next morning's daily sync says so
    await sync('a', { heartbeat: beat({ access: false, listenerConnected: false, lastBankEventAt: lastPay.toISOString() }) });
    await captureWatchdog(ctx(a.id, new Date(Date.now() + 10 * 3_600_000)));
    const h = await call('/api/capture/health', { cookie: s.a.cookie });
    note(`access off, 30 h after the last payment: pushes ${pushed.length}; health ${JSON.stringify(h.body)}`);
    expect(pushed).toHaveLength(1);
  });

  it('a phone clock a year ahead: posted_at in the future keeps no-events quiet for ever', async () => {
    const ahead = Date.now() + 365 * 86_400_000;
    await sync('a', { events: [event(a.id, { when: ahead, posted: ahead })], heartbeat: beat() });
    await owner.query("update device_heartbeats set created_at = now() + interval '3 days' - interval '1 hour' where user_id = $1", [a.id]);
    await captureWatchdog(ctx(a.id, new Date(Date.now() + 3 * 86_400_000)));
    note(`future posted_at, 3 days without a real event: pushes ${pushed.length}`);
    expect(pushed).toHaveLength(1);
  });

  it('25 h without a heartbeat: one push and one alerts_sent row, ticked twice', async () => {
    await sync('a', { heartbeat: beat() });
    await owner.query("update device_heartbeats set created_at = now() - interval '25 hours' where user_id = $1", [a.id]);
    const now = new Date();
    await captureWatchdog(ctx(a.id, now));
    await captureWatchdog(ctx(a.id, now));
    const sent = await count("select count(*) n from alerts_sent where user_id = $1 and alert_key like 'capture_off:%'", [a.id]);
    note(`25 h quiet: pushes ${pushed.length}, alerts_sent ${sent}, title ${pushed[0]?.msg.title}`);
    expect([pushed.length, sent]).toEqual([1, 1]);
  });
});

describe('Captured on this phone (AC-30)', () => {
  it('paging through 51 events posted in the same millisecond returns all 51', async () => {
    const t = Date.UTC(2026, 9, 10, 2, 0, 0);
    const evs = Array.from({ length: 51 }, (_, i) => event(a.id, { when: t + i, posted: t, key: `tie-${i}` }));
    const r = await sync('a', { events: evs });
    expect(r.body.synced.events).toHaveLength(51);
    const p1 = await call('/api/captured', { cookie: s.a.cookie });
    const p2 = p1.body.next ? await call(`/api/captured?before=${encodeURIComponent(p1.body.next)}`, { cookie: s.a.cookie }) : { body: { events: [] } };
    const seen = new Set([...p1.body.events, ...p2.body.events].map((x: { id: string }) => x.id));
    note(`ties: page 1 ${p1.body.events.length}, next ${p1.body.next}, page 2 ${p2.body.events.length}; distinct seen ${seen.size} of 51`);
    expect(seen.size).toBe(51);
  });
});

describe('hostile and malformed input (AC-10, AC-10s)', () => {
  it('each answers with the error shape, never a 500', async () => {
    const cases: [string, Init][] = [
      ['not JSON', { raw: '{"events":[' }],
      ['an array', { body: [] }],
      ['events not an array', { body: { events: 'x' } }],
      ['101 events', { body: { events: Array.from({ length: 101 }, () => event(a.id)) } }],
      ['an unknown key', { body: { events: [], extra: 1 } }],
      ['heartbeat malformed', { body: { heartbeat: { id: 'x' } } }],
      ['a null item', { body: { events: [null, 7, 'x'] } }],
      ['a command not an object', { body: { commands: [{ id: randomUUID(), command: 'x', madeAt: new Date().toISOString() }] } }],
    ];
    for (const [name, init] of cases) {
      const r = await call('/api/sync', { ...init, bearer: s.a.token, origin: null });
      note(`${name}: ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
      expect(r.status).toBeLessThan(500);
    }
  });

  it('SQL metacharacters, ../ and long strings are stored as raw text, exactly', async () => {
    const text = `You paid RM1.00 to '); DROP TABLE bank_events;-- ../../etc ${'Ж'.repeat(7000)}`;
    const e = event(a.id, { text, title: `${'x'.repeat(3999)}'` });
    const r = await sync('a', { events: [e] });
    const row = (await owner.query('select text, title from bank_events where id = $1', [e.id])).rows[0];
    note(`hostile text: ${r.status}, stored exactly ${row?.text === text && row?.title === e.title}`);
    expect(row?.text).toBe(text);
    const tooLong = event(a.id, { text: 'y'.repeat(8001) });
    const r2 = await sync('a', { events: [tooLong] });
    note(`text of 8001: ${JSON.stringify(r2.body?.refused?.events)}`);
  });

  it('/match is an empty frame: twice the same; signed out 401; a body with fields 400', async () => {
    const m1 = await call('/api/match', { body: {}, cookie: s.a.cookie });
    const m2 = await call('/api/match', { body: {}, cookie: s.a.cookie });
    const m3 = await call('/api/match', { body: {} });
    const m4 = await call('/api/match', { body: { x: 1 }, cookie: s.a.cookie });
    note(`match: ${m1.status} ${JSON.stringify(m1.body)}, ${m2.status}, signed out ${m3.status} ${JSON.stringify(m3.body)}, extra ${m4.status} ${JSON.stringify(m4.body)}`);
    expect([m1.status, m2.status, m3.status, m4.status]).toEqual([200, 200, 401, 400]);
  });

  it('a heartbeat can’t set its own time', async () => {
    const r = await sync('a', { heartbeat: { ...beat(), createdAt: '2020-01-01T00:00:00Z' } });
    const at = (await owner.query('select created_at from device_heartbeats where user_id = $1', [a.id])).rows[0]?.created_at as Date;
    note(`heartbeat with createdAt: ${r.status}; stored ${at?.toISOString()}`);
    expect(Math.abs(at.getTime() - Date.now())).toBeLessThan(60_000);
  });
});

describe('the session (AC-24, AC-25, AC-26)', () => {
  it('the bearer token as the WebView stores it, URL-decoded, forged; then Sign out everywhere', async () => {
    const shell = await signIn(a.email);
    const enc = await call('/api/sync', { body: {}, bearer: shell.token, origin: null });
    const dec = await call('/api/sync', { body: {}, bearer: decodeURIComponent(shell.token), origin: null });
    const forged = await call('/api/sync', { body: {}, bearer: decodeURIComponent(shell.token).split('.')[0] + '.AAAA', origin: null });
    note(`bearer: encoded ${enc.status}, decoded ${dec.status}, forged signature ${forged.status} ${JSON.stringify(forged.body)}`);
    expect(enc.status).toBe(200);
    expect(forged.status).toBe(401);
    const browser = await signIn(a.email);
    await call('/api/auth/revoke-sessions', { body: {}, cookie: browser.cookie });
    const after = await call('/api/sync', { body: {}, bearer: shell.token, origin: null });
    note(`after Sign out everywhere: ${after.status} ${JSON.stringify(after.body)}`);
    expect(after.status).toBe(401);
    s.a = await signIn(a.email);
  });
});
