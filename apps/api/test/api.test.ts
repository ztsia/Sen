import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { bigint, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { createApp, type Deps } from '../src/app';
import { LIMITS } from '../src/limits';
import { asPerson } from '../src/db';
import type { Env } from '../src/context';
import { onError } from '../src/errors';
import { resource } from '../src/resource';
import { Hono } from 'hono';

// The API against the local Postgres (pnpm test:db): sen_test, freshly migrated by packages/db/test/run.sh.
// Each role connects as it does on Vercel, so RLS here is RLS there. Never Neon.
const HOST = process.env.PGHOST ?? '127.0.0.1';
const url = (role: string) => `postgres://${role}@${HOST}:5432/sen_test`;
const owner = new pg.Pool({ connectionString: url('sen_owner'), max: 2 });
const app = new pg.Pool({ connectionString: url('app_user'), max: 1 });
const authPool = new pg.Pool({ connectionString: url('sen_auth'), max: 2 });

const codes = new Map<string, string>();
const deps: Deps = {
  // production's settings: a random code, sent by the mailer, which here keeps it for the test
  env: {
    target: 'production',
    secret: 'x'.repeat(48),
    urls: { app_user: url('app_user'), sen_auth: url('sen_auth') },
    gmail: null,
  },
  app,
  auth: authPool,
  mailer: { sendCode: async (to, code) => void codes.set(to, code) },
};
const { api } = createApp(deps);
const ORIGIN = 'https://sen.test';

let ip = 0;
const nextIp = () => `10.0.${Math.floor(++ip / 250)}.${ip % 250}`;

const admin = { id: randomUUID(), email: `admin-${randomUUID()}@example.com` };
const member = { id: randomUUID(), email: `member-${randomUUID()}@example.com` };

async function call(path: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
  const res = await api.request(`${ORIGIN}${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: {
      origin: ORIGIN,
      // a new address each call: Better Auth's rate limit (3 codes a minute) is per client address
      'x-forwarded-for': nextIp(),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.cookie ? { cookie: init.cookie } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  return {
    status: res.status,
    body: text ? (JSON.parse(text) as Record<string, unknown>) : null,
    headers: res.headers,
  };
}

/** Signs in by code, as the screen does: the session cookie it returns. */
async function signIn(email: string): Promise<string> {
  const sent = await call('/api/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in' } });
  expect(sent.status).toBe(200);
  const code = codes.get(email);
  expect(code).toMatch(/^\d{6}$/);
  const res = await api.request(`${ORIGIN}/api/auth/sign-in/email-otp`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': nextIp() },
    body: JSON.stringify({ email, otp: code }),
  });
  expect(res.status).toBe(200);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  expect(cookie).toContain('session_token');
  return cookie;
}

beforeAll(async () => {
  // most tests sign in often; the per-email limit has its own test below
  LIMITS.codesPerEmail.max = 1000;
  for (const [p, isAdmin] of [
    [admin, true],
    [member, false],
  ] as const) {
    await owner.query('insert into auth_user (id, name, email, email_verified) values ($1, $2, $3, true)', [
      p.id,
      'Test',
      p.email,
    ]);
    await owner.query('insert into user_access (user_id, is_admin, features) values ($1, $2, $3)', [
      p.id,
      isAdmin,
      { capture: isAdmin, agent: true },
    ]);
  }
});

afterAll(async () => {
  await owner.query('delete from auth_user where id = any($1)', [[admin.id, member.id]]);
  await Promise.all([owner.end(), app.end(), authPool.end()]);
});

describe('every request runs as its person', () => {
  it('connects as app_user, which owns nothing and cannot bypass RLS', async () => {
    const r = await app.query<{ u: string; bypass: boolean; super: boolean }>(
      'select current_user as u, rolbypassrls as bypass, rolsuper as super from pg_roles where rolname = current_user',
    );
    expect(r.rows[0]).toEqual({ u: 'app_user', bypass: false, super: false });
  });

  it('keeps the user id inside its transaction: a pooled connection never carries it on', async () => {
    // one connection in the pool, so both people's transactions and the bare query share it
    const seen = await Promise.all(
      [admin.id, member.id, admin.id, member.id].map((id) =>
        asPerson(app, id, async (db) => {
          const r = await db.execute<{ id: string }>(`select current_setting('app.user_id', true) as id`);
          await new Promise((ok) => setTimeout(ok, 5));
          return r.rows[0]!.id;
        }),
      ),
    );
    expect(seen).toEqual([admin.id, member.id, admin.id, member.id]);
    const after = await app.query<{ id: string | null }>(`select current_setting('app.user_id', true) as id`);
    expect(after.rows[0]!.id ?? '').toBe('');
    const rows = await app.query('select * from user_access');
    expect(rows.rowCount).toBe(0);
  });

  it('rolls back with the user id when a step fails', async () => {
    await expect(
      asPerson(app, member.id, async (db) => {
        await db.execute(`select 1`);
        throw new Error('step failed');
      }),
    ).rejects.toThrow('step failed');
    const r = await app.query<{ id: string | null }>(`select current_setting('app.user_id', true) as id`);
    expect(r.rows[0]!.id ?? '').toBe('');
  });
});

describe('sign-in by emailed code (D13, D52)', () => {
  it('says Sen is invitation-only for an unknown email, and sends nothing', async () => {
    const r = await call('/api/auth/email-otp/send-verification-otp', {
      body: { email: 'stranger@example.com', type: 'sign-in' },
    });
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ code: 'not_invited', field: 'email' });
    expect(codes.has('stranger@example.com')).toBe(false);
  });

  it('refuses a wrong code', async () => {
    await call('/api/auth/email-otp/send-verification-otp', { body: { email: member.email, type: 'sign-in' } });
    const wrong = codes.get(member.email) === '000000' ? '111111' : '000000';
    const r = await call('/api/auth/sign-in/email-otp', { body: { email: member.email, otp: wrong } });
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ code: 'INVALID_OTP' });
  });

  it('signs in with the right code, and every route answers as that person', async () => {
    const cookie = await signIn(member.email);
    expect((await call('/api/me', { cookie })).body).toEqual({
      capture: false,
      claims: false,
      agent: true,
      aiPausedUntil: null,
    });
    const s = await call('/api/settings', { cookie });
    expect(s.body).toMatchObject({
      email: member.email,
      admin: false,
      you: { bankNames: [], payday: { kind: 'none' } },
    });
  });

  it('answers 401 with the error shape when signed out', async () => {
    const r = await call('/api/me');
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ code: 'signed_out', message: 'Sign in to Sen.' });
    expect(r.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('signs out everywhere: revokes the other browser’s session too', async () => {
    const phone = await signIn(member.email);
    const laptop = await signIn(member.email);
    expect((await call('/api/me', { cookie: laptop })).status).toBe(200);
    const out = await call('/api/auth/revoke-sessions', { body: {}, cookie: phone });
    expect(out.status).toBe(200);
    expect((await call('/api/me', { cookie: laptop })).status).toBe(401);
    expect((await call('/api/me', { cookie: phone })).status).toBe(401);
  });

  it('refuses a suspended person', async () => {
    const cookie = await signIn(member.email);
    await owner.query('update user_access set suspended_at = now() where user_id = $1', [member.id]);
    try {
      const r = await call('/api/me', { cookie });
      expect(r.status).toBe(403);
      expect(r.body).toMatchObject({ code: 'suspended' });
    } finally {
      await owner.query('update user_access set suspended_at = null where user_id = $1', [member.id]);
    }
  });
});

describe('rate limits (QA B05 run 1, 4 and 6)', () => {
  const send = (email: string, ip: string) =>
    api.request(`${ORIGIN}/api/auth/email-otp/send-verification-otp`, {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ email, type: 'sign-in' }),
    });

  it('stops a sixth code within a minute from one address', async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await send(member.email, '10.9.9.9')).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('gives one email 5 codes in 10 minutes, from any address, and says why', async () => {
    const email = `limited-${randomUUID()}@example.com`;
    const id = randomUUID();
    await owner.query('insert into auth_user (id, name, email, email_verified) values ($1, $2, $3, true)', [
      id,
      'L',
      email,
    ]);
    const max = LIMITS.codesPerEmail.max;
    LIMITS.codesPerEmail.max = 5;
    try {
      const statuses = [];
      for (let i = 0; i < 6; i++) statuses.push((await send(email, nextIp())).status);
      expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
      const last = await send(email, nextIp());
      expect(await last.json()).toMatchObject({ code: 'too_many' });
    } finally {
      LIMITS.codesPerEmail.max = max;
      await owner.query('delete from auth_user where id = $1', [id]);
    }
  });

  it('limits lookups of uninvited emails from one address', async () => {
    const statuses = [];
    for (let i = 0; i < LIMITS.lookupsPerIp.max + 1; i++)
      statuses.push((await send(`nobody${i}@example.com`, '10.8.8.8')).status);
    expect(statuses.slice(0, -1).every((s) => s === 403)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it('takes a new code after three wrong ones (the code ends, not the person)', async () => {
    const ip = '10.7.7.7';
    const verify = (otp: string) =>
      api.request(`${ORIGIN}/api/auth/sign-in/email-otp`, {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ email: member.email, otp }),
      });
    await send(member.email, ip);
    const wrong = codes.get(member.email) === '000000' ? '111111' : '000000';
    for (let i = 0; i < 3; i++) await verify(wrong);
    expect((await (await verify(codes.get(member.email)!)).json()) as object).toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
    });
    await send(member.email, ip);
    expect((await verify(codes.get(member.email)!)).status).toBe(200);
  });
});

describe('codes', () => {
  it('sends a random code in production, never the previews’ fixed one (QA B05 run 1, 1)', async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 3; i++) {
      await call('/api/auth/email-otp/send-verification-otp', { body: { email: admin.email, type: 'sign-in' } });
      seen.add(codes.get(admin.email)!);
    }
    expect(seen.has('123456')).toBe(false);
    expect(seen.size).toBeGreaterThan(1);
  });

  it('refuses the previews’ fixed code in production', async () => {
    await call('/api/auth/email-otp/send-verification-otp', { body: { email: admin.email, type: 'sign-in' } });
    const r = await call('/api/auth/sign-in/email-otp', { body: { email: admin.email, otp: '123456' } });
    expect(r.status).toBe(400);
  });

  it('uses the fixed code on a preview, which has no mail', async () => {
    const sent: string[] = [];
    const p = createApp({
      ...deps,
      env: { ...deps.env, target: 'preview' },
      mailer: { sendCode: async (_t, c) => void sent.push(c) },
    }).api;
    await p.request(`${ORIGIN}/api/auth/email-otp/send-verification-otp`, {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': nextIp() },
      body: JSON.stringify({ email: admin.email, type: 'sign-in' }),
    });
    expect(sent).toEqual(['123456']);
  });

  it('tells a suspended person, and sends nothing (QA B05 run 1, 10)', async () => {
    await owner.query('update user_access set suspended_at = now() where user_id = $1', [member.id]);
    codes.delete(member.email);
    try {
      const r = await call('/api/auth/email-otp/send-verification-otp', {
        body: { email: member.email, type: 'sign-in' },
      });
      expect(r.status).toBe(403);
      expect(r.body).toMatchObject({ code: 'suspended' });
      expect(codes.has(member.email)).toBe(false);
    } finally {
      await owner.query('update user_access set suspended_at = null where user_id = $1', [member.id]);
    }
  });
});

describe('writes', () => {
  it('saves You with its audit entry, and answers with an undo', async () => {
    const cookie = await signIn(member.email);
    const r = await call('/api/commands', {
      cookie,
      body: { type: 'setting.set', key: 'you.payday', value: { kind: 'day', day: 25 } },
    });
    expect(r.body).toEqual({
      said: 'Payday saved',
      undo: { type: 'setting.set', key: 'you.payday', value: { kind: 'none' } },
    });
    const names = await call('/api/commands', {
      cookie,
      body: { type: 'setting.set', key: 'you.bankNames', value: ' TEST MEMBER \n\nMEMBER T' },
    });
    expect(names.status).toBe(200);
    const s = await call('/api/settings', { cookie });
    expect(s.body).toMatchObject({ you: { bankNames: ['TEST MEMBER', 'MEMBER T'], payday: { kind: 'day', day: 25 } } });
    const log = await owner.query('select action, actor from audit_log where user_id = $1 order by created_at', [
      member.id,
    ]);
    expect(log.rows).toEqual([
      { action: 'you.payday', actor: 'user' },
      { action: 'you.bankNames', actor: 'user' },
    ]);
  });

  it('answers 400, not 500, to a body that isn’t JSON (QA B05 run 1, 5)', async () => {
    const cookie = await signIn(member.email);
    for (const body of ['not json', '']) {
      const res = await api.request(`${ORIGIN}/api/commands`, {
        method: 'POST',
        headers: { origin: ORIGIN, cookie, 'content-type': 'application/json', 'x-forwarded-for': nextIp() },
        body,
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: 'invalid' });
    }
  });

  it('makes a retried write a no-op: no second audit entry (QA B05 run 1, 7)', async () => {
    const cookie = await signIn(member.email);
    const cmd = { type: 'setting.set', key: 'you.payday', value: { kind: 'day', day: 15 } };
    await call('/api/commands', { cookie, body: cmd });
    const count = async () =>
      (await owner.query('select count(*)::int n from audit_log where user_id = $1', [member.id])).rows[0].n as number;
    const stamp = async () =>
      (await owner.query('select updated_at from user_settings where user_id = $1', [member.id])).rows[0]
        .updated_at as Date;
    const [n, t] = [await count(), await stamp()];
    const again = await call('/api/commands', { cookie, body: cmd });
    expect(again.body).toMatchObject({ said: 'Payday saved' });
    expect(await count()).toBe(n);
    expect(await stamp()).toEqual(t);
  });

  it('checks every input with zod, and names the field', async () => {
    const cookie = await signIn(member.email);
    const r = await call('/api/commands', {
      cookie,
      body: { type: 'setting.set', key: 'you.payday', value: { kind: 'day', day: 40 } },
    });
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ code: 'invalid', field: 'day' });
    const junk = await call('/api/commands', { cookie, body: { type: 'no.such' } });
    expect(junk.status).toBe(400);
  });
});

describe('the admin’s routes refuse everyone else (D52)', () => {
  it('gives a member 403 on /admin/* and member.* commands', async () => {
    const cookie = await signIn(member.email);
    expect((await call('/api/admin/members', { cookie })).status).toBe(403);
    const cmd = await call('/api/commands', { cookie, body: { type: 'member.revoke', id: randomUUID() } });
    expect(cmd.status).toBe(403);
  });

  it('lists members for the admin, with switches and no money', async () => {
    const cookie = await signIn(admin.email);
    const r = await call('/api/admin/members', { cookie });
    expect(r.status).toBe(200);
    const rows = r.body as unknown as { email: string }[];
    expect(rows.map((m) => m.email)).toEqual(expect.arrayContaining([admin.email, member.email]));
    for (const m of rows) expect(Object.keys(m).sort()).toEqual(['admin', 'email', 'id', 'name', 'status', 'switches']);
    // all seven switches, as /settings has them (QA B05 run 1, 8)
    const mine = (r.body as unknown as { email: string; switches: Record<string, boolean> }[]).find(
      (m) => m.email === member.email,
    )!;
    expect(mine.switches).toEqual({
      shell: false,
      capture: false,
      agent: true,
      splits: false,
      email: false,
      calendar: false,
      claims: false,
    });
  });
});

describe('the generic resource routes', () => {
  // a table made for this test, the way a later slice makes one: user_id, RLS, grants, a tombstone
  const widgets = pgTable('test_widgets', {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    name: text('name').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  });
  const r = new Hono<Env>();
  r.onError(onError);
  r.use('*', async (c, next) => {
    const id = c.req.header('x-person')!;
    c.set('person', { id, email: '', name: '' });
    c.set('access', { isAdmin: false, features: {} as never, suspended: false });
    c.set('db', (fn) => asPerson(app, id, fn));
    await next();
  });
  r.route(
    '/w',
    resource({ name: 'test_widgets', table: widgets, fields: z.object({ name: z.string(), amount: z.int() }) }),
  );
  const as = (person: string, path: string, method = 'GET', body?: unknown) =>
    r.request(path, {
      method,
      headers: { 'x-person': person, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

  beforeAll(async () => {
    await owner.query(`create table test_widgets (id uuid primary key, user_id uuid not null references auth_user(id) on delete cascade,
      name text not null, amount bigint not null, updated_at timestamptz not null default now(), deleted_at timestamptz)`);
    await owner.query('alter table test_widgets enable row level security');
    for (const op of ['select', 'update', 'delete'])
      await owner.query(
        `create policy w_${op} on test_widgets for ${op} to app_user using (user_id = (select nullif(current_setting('app.user_id', true), '')::uuid))`,
      );
    await owner.query(
      `create policy w_insert on test_widgets for insert to app_user with check (user_id = (select nullif(current_setting('app.user_id', true), '')::uuid))`,
    );
    await owner.query(
      `alter policy w_update on test_widgets with check (user_id = (select nullif(current_setting('app.user_id', true), '')::uuid))`,
    );
    await owner.query('grant select, insert, update, delete on test_widgets to app_user');
  });
  afterAll(async () => {
    await owner.query('drop table test_widgets');
  });

  it('upserts by the client’s id: a retry is a no-op', async () => {
    const id = randomUUID();
    const a = await as(member.id, `/w/${id}`, 'PUT', { name: 'Kopi', amount: 450 });
    expect(a.status).toBe(200);
    await as(member.id, `/w/${id}`, 'PUT', { name: 'Kopi', amount: 450 });
    const list = (await (await as(member.id, '/w')).json()) as unknown[];
    expect(list).toHaveLength(1);
  });

  it('patches only the fields sent, and tombstones on delete', async () => {
    const id = randomUUID();
    await as(member.id, `/w/${id}`, 'PUT', { name: 'Nasi lemak', amount: 800 });
    const p = (await (await as(member.id, `/w/${id}`, 'PATCH', { amount: 850 })).json()) as {
      name: string;
      amount: number;
    };
    expect(p).toMatchObject({ name: 'Nasi lemak', amount: 850 });
    expect((await as(member.id, `/w/${id}`, 'DELETE')).status).toBe(204);
    expect((await as(member.id, `/w/${id}`)).status).toBe(404);
    const row = await owner.query('select deleted_at from test_widgets where id = $1', [id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
  });

  it('never reaches someone else’s row: read 404, overwrite 403, patch and delete 404', async () => {
    const id = randomUUID();
    await as(admin.id, `/w/${id}`, 'PUT', { name: 'Admin’s', amount: 100 });
    expect((await as(member.id, `/w/${id}`)).status).toBe(404);
    expect((await as(member.id, `/w/${id}`, 'PUT', { name: 'Taken', amount: 1 })).status).toBe(403);
    expect((await as(member.id, `/w/${id}`, 'PATCH', { amount: 1 })).status).toBe(404);
    expect((await as(member.id, `/w/${id}`, 'DELETE')).status).toBe(404);
    const row = await owner.query('select name, amount, deleted_at from test_widgets where id = $1', [id]);
    expect(row.rows[0]).toEqual({ name: 'Admin’s', amount: '100', deleted_at: null });
  });

  it('refuses an empty patch with a 400, and makes a repeated PUT a no-op', async () => {
    const id = randomUUID();
    await as(member.id, `/w/${id}`, 'PUT', { name: 'Teh', amount: 300 });
    expect((await as(member.id, `/w/${id}`, 'PATCH', {})).status).toBe(400);
    const audits = async () =>
      (await owner.query('select count(*)::int n from audit_log where entity_id = $1', [id])).rows[0].n as number;
    const n = await audits();
    await as(member.id, `/w/${id}`, 'PUT', { name: 'Teh', amount: 300 });
    expect(await audits()).toBe(n);
  });

  it('refuses a field it doesn’t know, and money that isn’t whole sen', async () => {
    expect((await as(member.id, `/w/${randomUUID()}`, 'PUT', { name: 'x', amount: 1, userId: admin.id })).status).toBe(
      400,
    );
    expect((await as(member.id, `/w/${randomUUID()}`, 'PUT', { name: 'x', amount: 1.5 })).status).toBe(400);
  });
});
