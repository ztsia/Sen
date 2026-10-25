import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { Hono } from 'hono';
import { bigint, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { createApp, MAX_BODY, type Deps } from '../src/app';
import type { Env } from '../src/context';
import { asPerson } from '../src/db';
import { onError } from '../src/errors';
import { LIMITS } from '../src/limits';
import { resource } from '../src/resource';
import { RESOURCE_ROUTES, ROUTES, type Method, type RouteSpec } from '../src/routes.table';

// The route sweep (D139): the same bad requests at every route in routes.table.ts, so an input edge
// case is found once for all routes, not one route per QA run. Against the local Postgres
// (pnpm test:db), never Neon.
const HOST = process.env.PGHOST ?? '127.0.0.1';
const url = (role: string) => `postgres://${role}@${HOST}:5432/sen_test`;
const owner = new pg.Pool({ connectionString: url('sen_owner'), max: 2 });
const appPool = new pg.Pool({ connectionString: url('app_user'), max: 5 });
const authPool = new pg.Pool({ connectionString: url('sen_auth'), max: 5 });

const codes = new Map<string, string>();
const SCHEDULER = 's'.repeat(40);
const deps: Deps = {
  env: {
    target: 'production',
    secret: 'y'.repeat(48),
    urls: { app_user: url('app_user'), sen_auth: url('sen_auth') },
    gmail: null,
    scheduler: SCHEDULER,
    relay: null,
    firebase: null,
  },
  app: appPool,
  auth: authPool,
  mailer: { sendCode: async (to, code) => void codes.set(to, code) },
  // push and the relay answer as if they were set up, so their routes are swept past the 503
  push: { on: true, send: async () => 0 },
  relay: {
    on: true,
    hint: async () => undefined,
    pass: async () => ({ url: 'wss://relay.test/connect', pass: 'p' }),
    wake: async () => undefined,
  },
};
const { api } = createApp(deps);
const ORIGIN = 'https://sen.test';
const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

let ip = 0;
const nextIp = () => `10.9.${Math.floor(++ip / 250)}.${ip % 250}`;

const admin = { id: randomUUID(), email: `sweep-admin-${randomUUID()}@example.com` };
const member = { id: randomUUID(), email: `sweep-member-${randomUUID()}@example.com` };
// signs out and revokes as the auth routes are swept, so nobody else's session ends with it
const spare = { id: randomUUID(), email: `sweep-spare-${randomUUID()}@example.com` };
const cookies = { admin: '', member: '', spare: '' };

interface Req {
  method: string;
  path: string;
  cookie?: string;
  /** a raw body, sent as is */
  raw?: string;
  /** a body, as JSON */
  body?: unknown;
  /** headers to add, or to drop when undefined */
  headers?: Record<string, string | undefined>;
}

async function send(r: Req) {
  const headers: Record<string, string> = { origin: ORIGIN, 'x-forwarded-for': nextIp() };
  if (r.body !== undefined || r.raw !== undefined) headers['content-type'] = 'application/json';
  if (r.cookie) headers.cookie = r.cookie;
  for (const [k, v] of Object.entries(r.headers ?? {}))
    if (v === undefined) delete headers[k];
    else headers[k] = v;
  const res = await api.request(`${ORIGIN}${r.path}`, {
    method: r.method,
    headers,
    body: r.raw ?? (r.body !== undefined ? JSON.stringify(r.body) : undefined),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = undefined;
  }
  return { status: res.status, json, headers: res.headers, text };
}

/** What every answer owes, whatever was asked: never a 5xx, Sen's error shape, no caching, its timing. */
function holds(res: Awaited<ReturnType<typeof send>>, what: string, opts: { sensShape?: boolean } = {}) {
  expect(res.status, `${what}: ${res.text.slice(0, 200)}`).toBeLessThan(500);
  expect(res.headers.get('server-timing'), `${what}: Server-Timing`).toMatch(/^app;dur=[\d.]+, db;dur=[\d.]+/);
  if (opts.sensShape !== false && res.status >= 400) {
    expect(res.json, `${what}: the error shape`).toMatchObject({
      code: expect.any(String),
      message: expect.any(String),
    });
    expect(res.headers.get('cache-control'), `${what}: no-store`).toBe('no-store');
  }
}

/** A body for the route, its placeholders filled in. */
const bodyFor = (spec: RouteSpec, path: string): unknown => {
  if (path === '/api/auth/sign-in/email-otp') return { email: member.email, otp: '000000' };
  if (spec.body === undefined) return spec.method === 'GET' ? undefined : {};
  return JSON.parse(JSON.stringify(spec.body).replaceAll('<member>', member.email));
};
const callsOf = (spec: RouteSpec) => spec.calls ?? [spec.path];
const deep = (n: number): unknown => (n === 0 ? 'x' : { a: deep(n - 1) });

async function signIn(email: string): Promise<string> {
  const sent = await send({
    method: 'POST',
    path: '/api/auth/email-otp/send-verification-otp',
    body: { email, type: 'sign-in' },
  });
  expect(sent.status).toBe(200);
  const res = await api.request(`${ORIGIN}/api/auth/sign-in/email-otp`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': nextIp() },
    body: JSON.stringify({ email, otp: codes.get(email) }),
  });
  expect(res.status).toBe(200);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}

beforeAll(async () => {
  LIMITS.codesPerEmail.max = 1000;
  LIMITS.codesPerIp.max = 1000;
  LIMITS.lookupsPerIp.max = 1000;
  LIMITS.testsPerPerson.max = 1000;
  for (const [p, isAdmin] of [
    [admin, true],
    [member, false],
    [spare, false],
  ] as const) {
    await owner.query('insert into auth_user (id, name, email, email_verified) values ($1, $2, $3, true)', [
      p.id,
      'Sweep',
      p.email,
    ]);
    await owner.query('insert into user_access (user_id, is_admin, features) values ($1, $2, $3)', [p.id, isAdmin, {}]);
  }
  // a morning run and a backup just now, so /health/jobs answers its good request with 200
  for (const job of ['morning', 'backup'])
    await owner.query(`insert into job_runs (user_id, job, run_key, status) values ($1, $2, $3, 'ok')`, [
      admin.id,
      job,
      `${job}:sweep`,
    ]);
  cookies.admin = await signIn(admin.email);
  cookies.member = await signIn(member.email);
  cookies.spare = await signIn(spare.email);
});

afterAll(async () => {
  await owner.query('delete from auth_user where id = any($1)', [[admin.id, member.id, spare.id]]);
  await Promise.all([owner.end(), appPool.end(), authPool.end()]);
});

describe('the route table lists every route', () => {
  it('matches what the app registers, handler for handler', () => {
    // a handler takes (c); a middleware takes (c, next) and isn't a route of its own
    const registered = new Set(api.routes.filter((r) => r.handler.length < 2).map((r) => `${r.method} ${r.path}`));
    const listed = new Set(ROUTES.map((r) => `${r.method} ${r.path}`));
    // `on(['GET', 'POST'], ...)` registers each method; ALL would mean every method, and isn't used
    expect(
      [...registered].filter((k) => !listed.has(k)),
      'routes missing from routes.table.ts',
    ).toEqual([]);
    expect(
      [...listed].filter((k) => !registered.has(k)),
      'listed routes the app no longer has',
    ).toEqual([]);
  });
});

describe.each(ROUTES)('$method $path', (spec) => {
  const asWho = spec.access === 'admin' ? 'admin' : spec.access === 'auth' ? 'spare' : 'member';
  // the Worker's tick carries the scheduler secret, not a session
  const cred = (): Partial<Req> =>
    spec.access === 'scheduler' ? { headers: { authorization: `Bearer ${SCHEDULER}` } } : { cookie: cookies[asWho] };

  it('answers its own request', async () => {
    if (spec.access === 'auth') return; // Better Auth's own answers are its tests'; the bad ones are ours
    const res = await send({
      method: spec.method,
      path: spec.path,
      ...cred(),
      body: bodyFor(spec, spec.path),
    });
    holds(res, 'the good request');
    expect(res.status, res.text).toBeLessThan(300);
  });

  it('refuses the signed out, and everyone without the right', async () => {
    if (spec.access === 'public' || spec.access === 'auth') return;
    const out = await send({ method: spec.method, path: spec.path, body: bodyFor(spec, spec.path) });
    holds(out, 'signed out');
    expect(out.status).toBe(401);
    expect(out.json).toMatchObject({ code: 'signed_out' });
    if (spec.access === 'scheduler') {
      for (const authorization of [`Bearer ${SCHEDULER}x`, `Bearer ${SCHEDULER.slice(1)}`, SCHEDULER, cookies.member]) {
        const wrong = await send({ method: spec.method, path: spec.path, headers: { authorization } });
        holds(wrong, 'a wrong secret');
        expect(wrong.status).toBe(401);
      }
      const person = await send({ method: spec.method, path: spec.path, cookie: cookies.admin });
      expect(person.status, 'a session is no scheduler').toBe(401);
    }
    if (spec.access === 'admin') {
      const m = await send({
        method: spec.method,
        path: spec.path,
        cookie: cookies.member,
        body: bodyFor(spec, spec.path),
      });
      holds(m, 'a member');
      expect(m.status).toBe(403);
    }
  });

  it('answers a wrong method and an unknown path with the error shape', async () => {
    for (const path of callsOf(spec)) {
      for (const method of METHODS.filter((m) => !ROUTES.some((r) => r.method === m && r.path === spec.path))) {
        const res = await send({ method, path, ...cred(), body: method === 'GET' ? undefined : {} });
        holds(res, `${method} ${path}`, { sensShape: spec.access !== 'auth' });
        expect(res.status, `${method} ${path}`).toBeGreaterThanOrEqual(400);
      }
      const res = await send({
        method: spec.method,
        path: `${path}/nope`,
        ...cred(),
        body: bodyFor(spec, path),
      });
      holds(res, `${path}/nope`);
      // with no session, an unknown path is the signed-out answer first
      expect([spec.access === 'scheduler' ? 401 : 404], `${path}/nope`).toContain(res.status);
    }
  });

  // the tick is no browser's: it reads no body, and its secret is its check (the test above)
  it.runIf(spec.method !== 'GET' && spec.access !== 'scheduler')(
    'takes a write only from Sen’s pages, as JSON, and refuses bad bodies',
    async () => {
      for (const path of callsOf(spec)) {
        const good = bodyFor(spec, path);
        const bad = async (what: string, r: Partial<Req>, status: number | number[]) => {
          const res = await send({ method: spec.method, path, cookie: cookies[asWho], body: good, ...r });
          holds(res, `${path}: ${what}`);
          expect([status].flat(), `${path}: ${what} gave ${res.status} ${res.text.slice(0, 120)}`).toContain(
            res.status,
          );
        };
        await bad('a foreign Origin', { headers: { origin: 'https://evil.example' } }, 403);
        await bad('Origin null', { headers: { origin: 'null' } }, 403);
        await bad('not JSON', { raw: 'email=a', headers: { 'content-type': 'text/plain' } }, [400, 415]);
        await bad('broken JSON', { raw: '{"a":' }, 400);
        await bad('a NUL', { body: { ...(good as object), note: 'a\u0000b' } }, 400);
        await bad('deep nesting', { body: deep(40) }, 400);
        await bad('an oversized body', { raw: JSON.stringify({ note: 'x'.repeat(MAX_BODY) }) }, 413);
        // no Origin at all is a client that isn't a browser: allowed, and still never a 5xx
        const res = await send({
          method: spec.method,
          path,
          cookie: cookies[asWho],
          body: good,
          headers: { origin: undefined },
        });
        holds(res, `${path}: no Origin`, { sensShape: spec.access !== 'auth' });
      }
    },
  );
});

describe('the generic resource routes, swept', () => {
  // a table made here, as a later slice makes one (as api.test.ts' widgets)
  const gadgets = pgTable('test_gadgets', {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    name: text('name').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  });
  const router = resource({
    name: 'test_gadgets',
    table: gadgets,
    fields: z.object({ name: z.string(), amount: z.int() }),
  });
  const r = new Hono<Env>();
  r.onError(onError);
  r.use('*', async (c, next) => {
    const id = c.req.header('x-person')!;
    c.set('person', { id, email: '', name: '' });
    c.set('access', { isAdmin: false, features: {} as never, suspended: false });
    c.set('db', (fn) => asPerson(appPool, id, fn));
    await next();
  });
  r.route('/g', router);
  const as = (person: string, method: string, path: string, body?: unknown) =>
    r.request(path, {
      method,
      headers: { 'x-person': person, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const mine = randomUUID();

  beforeAll(async () => {
    await owner.query(`create table test_gadgets (id uuid primary key, user_id uuid not null references auth_user(id) on delete cascade,
      name text not null, amount bigint not null, updated_at timestamptz not null default now(), deleted_at timestamptz)`);
    await owner.query('alter table test_gadgets enable row level security');
    const me = `user_id = (select nullif(current_setting('app.user_id', true), '')::uuid)`;
    for (const op of ['select', 'delete'])
      await owner.query(`create policy g_${op} on test_gadgets for ${op} to app_user using (${me})`);
    await owner.query(`create policy g_insert on test_gadgets for insert to app_user with check (${me})`);
    await owner.query(`create policy g_update on test_gadgets for update to app_user using (${me}) with check (${me})`);
    await owner.query('grant select, insert, update, delete on test_gadgets to app_user');
    expect((await as(admin.id, 'PUT', `/g/${mine}`, { name: 'Mine', amount: 100 })).status).toBe(200);
  });
  afterAll(async () => {
    await owner.query('drop table test_gadgets');
  });

  it('lists exactly the routes resource.ts registers', () => {
    const registered = router.routes.filter((x) => x.handler.length < 2).map((x) => `${x.method} ${x.path}`);
    expect(registered.sort()).toEqual(RESOURCE_ROUTES.map((x) => `${x.method} ${x.path}`).sort());
  });

  it.each(RESOURCE_ROUTES.filter((x) => x.path === '/:id'))(
    '$method /:id never reaches another person’s row',
    async ({ method }) => {
      const body =
        method === 'PUT' ? { name: 'Theirs now', amount: 1 } : method === 'PATCH' ? { name: 'Theirs now' } : undefined;
      const res = await as(member.id, method, `/g/${mine}`, body);
      // read, patch and delete see nothing (404); an upsert onto it fails RLS's check (403)
      expect([403, 404], `${method}: ${res.status}`).toContain(res.status);
      const row = await owner.query('select name, amount, deleted_at from test_gadgets where id = $1', [mine]);
      expect(row.rows[0]).toMatchObject({ name: 'Mine', deleted_at: null });
    },
  );

  it('makes identical upserts sent at once one change and one audit entry, creating or updating', async () => {
    const audits = async (id: string) =>
      (await owner.query('select action from audit_log where entity_id = $1 order by created_at', [id])).rows.map(
        (r: { action: string }) => r.action,
      );
    const id = randomUUID();
    const twice = async (body: unknown) =>
      (await Promise.all([1, 2, 3].map(() => as(admin.id, 'PUT', `/g/${id}`, body)))).map((r) => r.status);
    expect(await twice({ name: 'New', amount: 5 })).toEqual([200, 200, 200]);
    expect(await audits(id)).toEqual(['create']);
    expect(await twice({ name: 'Renamed', amount: 5 })).toEqual([200, 200, 200]);
    expect(await audits(id)).toEqual(['create', 'update']);
  });

  it.each(RESOURCE_ROUTES)('$method $path refuses a bad id and bad bodies with a 400', async ({ method, path }) => {
    if (path === '/:id') {
      const res = await as(
        admin.id,
        method,
        '/g/not-a-uuid',
        method === 'GET' || method === 'DELETE' ? undefined : { name: 'x', amount: 1 },
      );
      expect(res.status, `${method} not-a-uuid`).toBe(400);
    }
    if (method === 'PUT' || method === 'PATCH') {
      for (const body of [
        { name: 'x', amount: 1.5 },
        { name: 'x', amount: 1, userId: member.id },
        { name: 'a\u0000', amount: 1 },
      ]) {
        const res = await as(admin.id, method, `/g/${randomUUID()}`, body);
        expect(res.status, `${method} ${JSON.stringify(body)}`).toBe(400);
      }
    }
  });
});
