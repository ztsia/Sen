import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { klDay } from '@sen/core/cycles';
import { klAt } from '@sen/core/jobs';
import { verifyPass } from '@sen/core/realtime';
import { createApp, type Deps } from '../src/app';
import { FRAME_TASKS, ONCE_TASKS } from '../src/jobs/frames';
import { fcmPusher, type PushMessage } from '../src/jobs/push';
import { workerRelay } from '../src/jobs/relay';
import { runTick, type TickDeps } from '../src/jobs/tick';
import { LIMITS } from '../src/limits';

// The scheduler against the local Postgres (pnpm test:db, B06): ticks that overlap, frames once per
// person and date, one-off jobs once, retries, the watchdog, health, push tokens and relay passes.
const HOST = process.env.PGHOST ?? '127.0.0.1';
const url = (role: string) => `postgres://${role}@${HOST}:5432/sen_test`;
const owner = new pg.Pool({ connectionString: url('sen_owner'), max: 2 });
const appPool = new pg.Pool({ connectionString: url('app_user'), max: 10 });
const authPool = new pg.Pool({ connectionString: url('sen_auth'), max: 5 });

const pushed: { userId: string; msg: PushMessage }[] = [];
const hints: { userId: string; topics: string[] }[] = [];
const wakes: Date[] = [];
const push = {
  on: true,
  send: async (userId: string, msg: PushMessage) => {
    pushed.push({ userId, msg });
    return 1;
  },
};
const RELAY_SECRET = 'r'.repeat(40);
const realRelay = workerRelay(
  { url: 'https://relay.test', secret: RELAY_SECRET },
  's'.repeat(40),
  async () => new Response('ok'),
);
const relay = {
  on: true,
  hint: async (userId: string, topics: string[]) => void hints.push({ userId, topics }),
  pass: realRelay.pass,
  wake: async (at: Date) => void wakes.push(at),
};
const tickDeps: TickDeps = { pool: appPool, push, relay };
const SCHEDULER = 's'.repeat(40);
const codes = new Map<string, string>();
const deps: Deps = {
  env: {
    target: 'production',
    secret: 'j'.repeat(48),
    urls: { app_user: url('app_user'), sen_auth: url('sen_auth') },
    gmail: null,
    scheduler: SCHEDULER,
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

const admin = { id: randomUUID(), email: `jobs-admin-${randomUUID()}@example.com` };
const member = { id: randomUUID(), email: `jobs-member-${randomUUID()}@example.com` };
const ours = [admin.id, member.id];
let ip = 0;

async function call(
  path: string,
  init: { method?: string; body?: unknown; cookie?: string; headers?: Record<string, string> } = {},
) {
  const res = await api.request(`${ORIGIN}${path}`, {
    method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
    headers: {
      origin: ORIGIN,
      'x-forwarded-for': `10.7.0.${++ip % 250}`,
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(init.cookie ? { cookie: init.cookie } : {}),
      ...init.headers,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}

async function signIn(email: string): Promise<string> {
  await call('/api/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in' } });
  const res = await api.request(`${ORIGIN}/api/auth/sign-in/email-otp`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': `10.7.1.${++ip % 250}` },
    body: JSON.stringify({ email, otp: codes.get(email) }),
  });
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}

const runs = async (key: string) =>
  (
    await owner.query<{ user_id: string; status: string; attempts: number }>(
      'select user_id, status, attempts from job_runs where run_key = $1 and user_id = any($2) order by user_id',
      [key, ours],
    )
  ).rows;

let cookies = { admin: '', member: '' };

beforeAll(async () => {
  LIMITS.codesPerEmail.max = 1000;
  LIMITS.codesPerIp.max = 1000;
  LIMITS.lookupsPerIp.max = 1000;
  // this file is the scheduler's: only its two people get daily jobs, and health starts from nothing
  await owner.query('delete from job_runs');
  await owner.query('delete from scheduled_jobs');
  await owner.query('update user_access set suspended_at = now() where suspended_at is null');
  for (const [p, isAdmin] of [
    [admin, true],
    [member, false],
  ] as const) {
    await owner.query('insert into auth_user (id, name, email, email_verified) values ($1, $2, $3, true)', [
      p.id,
      'Jobs',
      p.email,
    ]);
    await owner.query('insert into user_access (user_id, is_admin, features) values ($1, $2, $3)', [p.id, isAdmin, {}]);
  }
  cookies = { admin: await signIn(admin.email), member: await signIn(member.email) };
});

beforeEach(() => {
  pushed.length = 0;
  hints.length = 0;
  wakes.length = 0;
});

afterAll(async () => {
  await owner.query('delete from auth_user where id = any($1)', [ours]);
  await owner.query('update user_access set suspended_at = null');
  await Promise.all([owner.end(), appPool.end(), authPool.end()]);
});

describe('the tick', () => {
  it('runs only with the scheduler secret', async () => {
    expect((await call('/api/jobs/tick', { method: 'POST' })).status).toBe(401);
    const ok = await call('/api/jobs/tick', { method: 'POST', headers: { authorization: `Bearer ${SCHEDULER}` } });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ ran: expect.any(Number), next: expect.any(String) });
  });

  it('runs the morning job once per person and date, even when two ticks overlap', async () => {
    const at = new Date(klAt('2030-01-02', 7).getTime() + 10 * 60_000); // 07:10
    const [a, b] = await Promise.all([runTick(tickDeps, at), runTick(tickDeps, at)]);
    expect(a.frame).toBe('morning');
    expect((await runs('morning:2030-01-02')).map((r) => [r.status, r.attempts])).toEqual([
      ['ok', 1],
      ['ok', 1],
    ]);
    expect(a.ran + b.ran).toBe(2);
    const again = await runTick(tickDeps, at);
    expect(again.ran).toBe(0);
    // done: sleeps until the evening
    expect(again.next).toBe(klAt('2030-01-02', 21).toISOString());
    // the backup watchdog: the admin has no backup, so one push; the member's isn't the watchdog's
    expect(pushed.filter((p) => p.msg.title.includes('backed up')).map((p) => p.userId)).toEqual([admin.id]);
  });

  it('pushes the backup alert once a day, however often the morning job runs', async () => {
    await owner.query("delete from job_runs where run_key = 'morning:2030-01-02'");
    await runTick(tickDeps, new Date(klAt('2030-01-02', 7).getTime() + 20 * 60_000));
    expect(pushed).toEqual([]);
  });

  it('retries a failed frame in five minutes, up to three attempts', async () => {
    const boom = async () => {
      throw new Error('boom');
    };
    FRAME_TASKS.morning.push(boom);
    try {
      const at = new Date(klAt('2030-01-03', 7).getTime());
      const first = await runTick(tickDeps, at);
      expect(first.failed).toBe(2);
      expect(first.next).toBe(new Date(at.getTime() + 5 * 60_000).toISOString());
      expect((await runs('morning:2030-01-03')).map((r) => [r.status, r.attempts])).toEqual([
        ['failed', 1],
        ['failed', 1],
      ]);
      await runTick(tickDeps, at);
      await runTick(tickDeps, at);
      const last = await runTick(tickDeps, at);
      expect(last.ran).toBe(0);
      expect((await runs('morning:2030-01-03')).map((r) => r.attempts)).toEqual([3, 3]);
    } finally {
      FRAME_TASKS.morning.pop();
    }
  });

  it('sleeps outside the frames', async () => {
    const r = await runTick(tickDeps, klAt('2030-01-04', 13));
    expect(r.frame).toBeNull();
    expect(r.ran).toBe(0);
    expect(r.next).toBe(klAt('2030-01-04', 21).toISOString());
  });
});

describe('one-off jobs', () => {
  const schedule = (userId: string, kind: string, key: string, runAt = new Date(Date.now() - 1000)) =>
    owner.query('insert into scheduled_jobs (user_id, kind, run_at, dedupe_key) values ($1, $2, $3, $4) returning id', [
      userId,
      kind,
      runAt,
      key,
    ]);
  const job = async (key: string) =>
    (await owner.query('select status, attempts, run_at from scheduled_jobs where dedupe_key = $1', [key])).rows[0];

  it('runs a due job once, even when two ticks overlap, and records it', async () => {
    await schedule(member.id, 'test', 'once-1');
    await Promise.all([runTick(tickDeps, klAt('2030-01-04', 13)), runTick(tickDeps, klAt('2030-01-04', 13))]);
    expect(pushed.map((p) => [p.userId, p.msg.title])).toEqual([[member.id, 'Sen’s test job ran']]);
    expect(hints).toEqual([{ userId: member.id, topics: ['jobs'] }]);
    expect(await job('once-1')).toMatchObject({ status: 'done', attempts: 1 });
    const recorded = await owner.query("select status from job_runs where user_id = $1 and job = 'once:test'", [
      member.id,
    ]);
    expect(recorded.rows).toEqual([{ status: 'ok' }]);
  });

  it('leaves a job in the future alone, and wakes for it', async () => {
    const soon = new Date(Date.now() + 10 * 60_000);
    await schedule(member.id, 'test', 'once-2', soon);
    const r = await runTick(tickDeps, new Date());
    expect(pushed).toEqual([]);
    expect(new Date(r.next).getTime()).toBeLessThanOrEqual(soon.getTime());
    await owner.query("update scheduled_jobs set status = 'done' where dedupe_key = 'once-2'");
  });

  it('retries a failing job later, then gives up', async () => {
    ONCE_TASKS.flaky = async () => {
      throw new Error('flaky');
    };
    try {
      await schedule(member.id, 'flaky', 'once-3');
      await runTick(tickDeps, new Date());
      const after = await job('once-3');
      expect(after).toMatchObject({ status: 'due', attempts: 1 });
      expect(new Date(after.run_at).getTime()).toBeGreaterThan(Date.now() + 4 * 60_000);
      for (let i = 0; i < 2; i++) {
        await owner.query("update scheduled_jobs set run_at = now() - interval '1 second' where dedupe_key = 'once-3'");
        await runTick(tickDeps, new Date());
      }
      expect(await job('once-3')).toMatchObject({ status: 'failed', attempts: 3 });
    } finally {
      delete ONCE_TASKS.flaky;
    }
  });

  it('fails a kind with no work at once, including the prototype’s names', async () => {
    await schedule(member.id, 'toString', 'once-4');
    await runTick(tickDeps, new Date());
    expect(await job('once-4')).toMatchObject({ status: 'failed', attempts: 1 });
  });

  it('schedules the test job a minute ahead, once per minute, and wakes the Worker', async () => {
    const [a, b] = [
      await call('/api/jobs/test', { body: {}, cookie: cookies.admin }),
      await call('/api/jobs/test', { body: {}, cookie: cookies.admin }),
    ];
    expect(a.status).toBe(200);
    expect(a.body!.push).toBe(true);
    const runAt = new Date(a.body!.runAt as string);
    expect(runAt.getTime() - Date.now()).toBeGreaterThan(55_000);
    expect(runAt.getTime() - Date.now()).toBeLessThanOrEqual(120_000);
    const rows = await owner.query(
      "select 1 from scheduled_jobs where user_id = $1 and kind = 'test' and status = 'due'",
      [admin.id],
    );
    expect(rows.rowCount).toBe(b.body!.runAt === a.body!.runAt ? 1 : 2);
    expect(wakes.map((w) => w.toISOString())).toContain(runAt.toISOString());
    await owner.query("update scheduled_jobs set status = 'done' where kind = 'test'");
  });
});

describe('health', () => {
  // a member's own rows can't hide a dead backup or morning from the monitor (QA B06 run 1, finding 3)
  it('counts only the admin’s runs', async () => {
    await owner.query('delete from job_runs');
    await owner.query(
      "insert into job_runs (user_id, job, run_key, status) values ($1, 'morning', 'fake-m', 'ok'), ($1, 'backup', 'fake-b', 'ok')",
      [member.id],
    );
    expect((await call('/api/health/jobs')).body).toMatchObject({ late: ['morning', 'backup'] });
  });

  it('fails while the morning job or the backup is late, with no data', async () => {
    await owner.query('delete from job_runs');
    const late = await call('/api/health/jobs');
    expect(late.status).toBe(503);
    expect(late.body).toEqual({ code: 'late', message: 'Late: morning, backup.', late: ['morning', 'backup'] });
    await owner.query(
      "insert into job_runs (user_id, job, run_key, status, ran_at) values ($1, 'morning', 'm', 'ok', now() - interval '27 hours')",
      [admin.id],
    );
    await owner.query("select record_backup('7', 'ok', 4096, 1000, null)");
    expect((await call('/api/health/jobs')).body).toMatchObject({ late: ['morning'] });
    await owner.query("insert into job_runs (user_id, job, run_key, status) values ($1, 'morning', 'm2', 'ok')", [
      admin.id,
    ]);
    expect(await call('/api/health/jobs')).toEqual({ status: 200, body: { ok: true } });
  });

  it('shows the admin the last backup and R2’s storage in Settings, and nobody else', async () => {
    const a = await call('/api/settings', { cookie: cookies.admin });
    expect(a.body!.data).toMatchObject({
      lastBackup: expect.any(String),
      storage: { used: 4096, allowance: 10_000_000_000, warnAt: 5_000_000_000 },
    });
    const m = await call('/api/settings', { cookie: cookies.member });
    expect(m.body!.data).toEqual({ lastBackup: null, exportReady: false, storage: null });
  });

  it('warns the admin once a month when backups pass half of R2', async () => {
    await owner.query("select record_backup('8', 'ok', 5000000000, 1000, null)");
    // today's morning, so the backups just recorded count as held (the last 30 days)
    const today = klDay(new Date());
    await runTick(tickDeps, klAt(today, 7));
    await owner.query('delete from job_runs where run_key = $1', [`morning:${today}`]);
    await runTick(tickDeps, klAt(today, 7));
    expect(pushed.filter((p) => p.msg.title.includes('half full')).map((p) => p.userId)).toEqual([admin.id]);
  });
});

describe('push and live updates', () => {
  it('keeps a phone’s token with the last person signed in on it, and forgets it on sign-out', async () => {
    const token = `fcm-${randomUUID()}`;
    expect((await call('/api/push/token', { method: 'PUT', body: { token }, cookie: cookies.admin })).status).toBe(200);
    expect((await call('/api/push/token', { method: 'PUT', body: { token }, cookie: cookies.member })).status).toBe(
      200,
    );
    const owners = await owner.query('select user_id from push_tokens where fcm_token = $1', [token]);
    expect(owners.rows).toEqual([{ user_id: member.id }]);
    expect((await call('/api/push/token', { method: 'DELETE', body: { token }, cookie: cookies.member })).status).toBe(
      200,
    );
    expect((await owner.query('select 1 from push_tokens where fcm_token = $1', [token])).rowCount).toBe(0);
    expect((await call('/api/push/token', { method: 'PUT', body: { token: '' }, cookie: cookies.member })).status).toBe(
      400,
    );
  });

  it('sends a test push to the admin’s own phones, a few a minute at most', async () => {
    const r = await call('/api/push/test', { body: {}, cookie: cookies.admin });
    expect(r).toEqual({ status: 200, body: { sent: 1 } });
    expect(pushed.map((p) => p.userId)).toEqual([admin.id]);
    for (let i = 0; i < LIMITS.testsPerPerson.max; i++)
      await call('/api/push/test', { body: {}, cookie: cookies.admin });
    expect((await call('/api/push/test', { body: {}, cookie: cookies.admin })).status).toBe(429);
  });

  // D142 (4): the checks are the admin's (QA B06 run 1, finding 2)
  it('refuses the test push and the test job to a member', async () => {
    const before = await owner.query("select 1 from scheduled_jobs where user_id = $1 and kind = 'test'", [member.id]);
    for (const path of ['/api/push/test', '/api/jobs/test'])
      expect(await call(path, { body: {}, cookie: cookies.member })).toEqual({
        status: 403,
        body: { code: 'forbidden', message: 'Only the admin can do that.' },
      });
    expect(pushed).toEqual([]);
    const after = await owner.query("select 1 from scheduled_jobs where user_id = $1 and kind = 'test'", [member.id]);
    expect(after.rowCount).toBe(before.rowCount);
  });

  it('gives a pass to the person’s own channel only', async () => {
    const r = await call('/api/realtime/token', { body: {}, cookie: cookies.member });
    expect(r.body!.url).toBe('wss://relay.test/connect');
    expect(await verifyPass(RELAY_SECRET, r.body!.pass as string)).toBe(`user:${member.id}`);
  });

  it('hints the person’s other screens after a settings change', async () => {
    await call('/api/commands', {
      body: { type: 'setting.set', key: 'you.payday', value: { kind: 'day', day: 25 } },
      cookie: cookies.member,
    });
    expect(hints).toEqual([{ userId: member.id, topics: ['settings'] }]);
  });

  // D142 (5): a lost phone stops getting the person's pushes (QA B06 run 1, finding 1)
  it('forgets every phone’s token when the person signs out everywhere', async () => {
    const phones = [`fcm-lost-${randomUUID()}`, `fcm-kept-${randomUUID()}`];
    for (const token of phones)
      await call('/api/push/token', { method: 'PUT', body: { token }, cookie: cookies.member });
    const admins = `fcm-admin-${randomUUID()}`;
    await call('/api/push/token', { method: 'PUT', body: { token: admins }, cookie: cookies.admin });
    const count = async (id: string) =>
      (await owner.query('select 1 from push_tokens where user_id = $1', [id])).rowCount;
    const adminTokens = await count(admin.id);
    expect(await count(member.id)).toBeGreaterThanOrEqual(2);
    expect((await call('/api/auth/revoke-sessions', { body: {}, cookie: cookies.member })).status).toBe(200);
    expect(await count(member.id)).toBe(0);
    expect(await count(admin.id)).toBe(adminTokens);
    await owner.query('delete from push_tokens where fcm_token = $1', [admins]);
    cookies.member = await signIn(member.email);
  });
});

describe('FCM', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = {
    project_id: 'sen-test',
    client_email: 'push@sen-test.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };

  it('signs in as the service account, sends to each phone, and forgets one FCM says is gone', async () => {
    const live = `fcm-live-${randomUUID()}`;
    const gone = `fcm-gone-${randomUUID()}`;
    for (const token of [live, gone])
      await call('/api/push/token', { method: 'PUT', body: { token }, cookie: cookies.admin });
    const calls: { url: string; body: string }[] = [];
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      const u = String(input);
      calls.push({ url: u, body: String(init?.body) });
      if (u.startsWith('https://oauth2.googleapis.com')) return Response.json({ access_token: 'at', expires_in: 3600 });
      return String(init?.body).includes(gone) ? new Response('{}', { status: 404 }) : Response.json({ name: 'm' });
    }) as typeof fetch;
    const fcm = fcmPusher(account, appPool, fetcher);
    expect(await fcm.send(admin.id, { title: 'T', body: 'B' })).toBe(1);
    expect(calls[0]!.body).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer');
    expect(calls.filter((c) => c.url.endsWith('/projects/sen-test/messages:send'))).toHaveLength(2);
    const left = await owner.query('select fcm_token from push_tokens where user_id = $1', [admin.id]);
    expect(left.rows.map((r) => r.fcm_token)).toEqual([live]);
    // the access token is kept while it lasts
    await fcm.send(admin.id, { title: 'T', body: 'B' });
    expect(calls.filter((c) => c.url.startsWith('https://oauth2.googleapis.com'))).toHaveLength(1);
  });
});
