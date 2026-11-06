// QA B08 run 2: more of the reviewer's probes (beside run 1's, same harness) of the ledger's routes and commands (spec §7, §8, §16, D146),
// against the local sen_test after `pnpm test:db`. Not part of any suite: run it with the config beside it,
//   pnpm exec vitest run --config qa/B08/vitest.probe.config.ts
// Each `it` records what it saw with `note()`, so a finding's evidence is the real output; the
// expectations are the spec's, so a red test here is a finding.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { createApp, type Deps } from '../../apps/api/src/app';
import { LIMITS } from '../../apps/api/src/limits';

const HOST = process.env.PGHOST ?? '127.0.0.1';
const url = (role: string) => `postgres://${role}@${HOST}:5432/${process.env.QA_DB ?? 'sen_test'}`;
const owner = new pg.Pool({ connectionString: url('sen_owner'), max: 2 });
const appPool = new pg.Pool({ connectionString: url('app_user'), max: 10 });
const authPool = new pg.Pool({ connectionString: url('sen_auth'), max: 5 });
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
  push: { on: false, send: async () => 0 },
  relay,
};
const { api } = createApp(deps);
const ORIGIN = 'https://sen.test';
const ON = { shell: true, capture: true, agent: true, splits: true, email: false, calendar: false, claims: false };

const a = { id: randomUUID(), email: `qa-b08r2-a-${randomUUID()}@example.com` };
const b = { id: randomUUID(), email: `qa-b08r2-b-${randomUUID()}@example.com` };
const ours = [a.id, b.id];
let ip = 0;
const note = (s: string) => console.log(`[probe] ${s}`);

async function call(path: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
  const res = await api.request(`${ORIGIN}${path}`, {
    method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
    headers: {
      origin: ORIGIN,
      'x-forwarded-for': `10.8.0.${++ip % 250}`,
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(init.cookie ? { cookie: init.cookie } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
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
    headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': `10.8.1.${++ip % 250}` },
    body: JSON.stringify({ email, otp: codes.get(email) }),
  });
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0]!)
    .join('; ');
}

const s = { a: '', b: '' };
const cmd = (who: 'a' | 'b', body: unknown) => call('/api/commands', { body, cookie: s[who] });
/** The project's error shape, never a stack or a 500. */
const shaped = (r: { status: number; body: { code?: unknown; message?: unknown } | null }) => {
  expect(r.status).toBeLessThan(500);
  expect(typeof r.body?.code).toBe('string');
  expect(typeof r.body?.message).toBe('string');
  expect(JSON.stringify(r.body)).not.toMatch(/at .*\.ts:\d+|stack/i);
};
const rows = async (t: string, id: string) =>
  (
    await owner.query(`select * from ${t} where user_id = $1 ${t === 'user_settings' ? '' : 'order by created_at'}`, [
      id,
    ])
  ).rows;
const tng = { package: 'my.com.tngdigital.ewallet', label: "Touch 'n Go eWallet" };
const add = (o: Partial<{ id: string; name: string; opening: unknown; app: unknown; kind: string }> = {}) => ({
  type: 'account.add',
  id: o.id ?? randomUUID(),
  name: o.name ?? 'TNG eWallet',
  kind: o.kind ?? 'tracked',
  app: o.app === undefined ? tng : o.app,
  opening: 'opening' in o ? o.opening : 10000,
});

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
  for (const p of [a, b]) {
    await owner.query('insert into auth_user (id, name, email, email_verified) values ($1, $2, $3, true)', [
      p.id,
      'QA',
      p.email,
    ]);
    await owner.query('insert into user_access (user_id, is_admin, features) values ($1, false, $2)', [p.id, ON]);
  }
  s.a = await signIn(a.email);
  s.b = await signIn(b.email);
});
beforeEach(async () => {
  for (const p of ours) {
    await owner.query('update user_access set features = $2 where user_id = $1', [p, ON]);
    for (const t of ['transactions', 'account_names', 'accounts', 'categories', 'user_settings', 'audit_log'])
      await owner.query(`delete from ${t} where user_id = $1`, [p]);
  }
});
afterAll(async () => {
  await owner.query('delete from auth_user where id = any($1)', [ours]);
  await Promise.all([owner.end(), appPool.end(), authPool.end()]);
});

const list = (who: 'a' | 'b') => call('/api/accounts', { cookie: s[who] });

describe('run 2: the seed', () => {
  it('a category added before setup.start still leaves Sen its three system categories', async () => {
    const pre = await cmd('a', { type: 'category.add', id: randomUUID(), name: 'Pets', kind: 'spend' });
    const st = await cmd('a', { type: 'setup.start' });
    const cats = await rows('categories', a.id);
    note(
      `category.add before start: ${pre.status}; setup.start: ${st.status} ${st.body.said}; categories: ${cats.length}; system: ${
        cats
          .filter((c) => c.system_key)
          .map((c) => c.system_key)
          .join(',') || 'none'
      }`,
    );
    expect(cats.filter((c) => c.system_key).length).toBe(3);
  });
});

describe('run 2: NUL and hostile text', () => {
  for (const [label, body] of [
    ['account name with NUL', () => add({ name: 'TNG\u0000x' })],
    ['category name with NUL', () => ({ type: 'category.add', id: randomUUID(), name: 'Pe\u0000ts', kind: 'spend' })],
    ['bank names with NUL', () => ({ type: 'setting.set', key: 'you.bankNames', value: 'TAN\u0000WEI' })],
    ['app label with NUL', () => add({ app: { package: 'my.com.tngdigital.ewallet', label: 'T\u0000NG' } })],
  ] as const)
    it(`${label} is a shaped 4xx, never a 500`, async () => {
      const r = await cmd('a', body());
      note(`${label}: ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
      shaped(r);
    });
});

describe('run 2: which apps get an account', () => {
  it('an account for a messaging app (never choosable, D86)', async () => {
    const r = await cmd('a', add({ name: 'WhatsApp', app: { package: 'com.whatsapp', label: 'WhatsApp' } }));
    note(`account.add for com.whatsapp: ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
});

describe('run 2: bring back over a newer account (D147 (4))', () => {
  it('is refused in words, and leaves one live account', async () => {
    const old = randomUUID();
    await cmd('a', add({ id: old }));
    await cmd('a', { type: 'account.archive', id: old, archived: true });
    const nu = await cmd('a', add());
    const back = await cmd('a', { type: 'account.archive', id: old, archived: false });
    const live = (await rows('accounts', a.id)).filter((x) => !x.archived_at);
    note(`new: ${nu.status}; bring back old: ${back.status} ${JSON.stringify(back.body)}; live: ${live.length}`);
    expect(back.status).toBe(409);
    expect(live.length).toBe(1);
  });
  it('an archived account opens as 404 (not listed live)', async () => {
    const id = randomUUID();
    await cmd('a', add({ id }));
    await cmd('a', { type: 'account.archive', id, archived: true });
    const r = await call(`/api/accounts/${id}`, { cookie: s.a });
    const l = await list('a');
    note(`archived /accounts/:id ${r.status}; /accounts archived: ${JSON.stringify(l.body.archived)}`);
    expect(l.body.archived.length).toBe(1);
  });
});

describe('run 2: two adds for one app at once', () => {
  it('one wins, the other is a shaped 409', async () => {
    const r = await Promise.all([cmd('a', add()), cmd('a', add())]);
    const live = (await rows('accounts', a.id)).filter((x) => !x.archived_at);
    note(`two at once: ${r.map((x) => `${x.status} ${x.body.code ?? x.body.said}`).join(' | ')}; live ${live.length}`);
    expect(live.length).toBe(1);
    for (const x of r) expect(x.status).toBeLessThan(500);
  });
});

describe('run 2: a hand-made Unaccounted', () => {
  it('after renaming Sen’s, a new category called Unaccounted is an ordinary, pickable one', async () => {
    await cmd('a', { type: 'setup.start' });
    const un = (await rows('categories', a.id)).find((c) => c.system_key === 'unaccounted');
    await cmd('a', { type: 'category.edit', id: un.id, name: 'Gap' });
    const r = await cmd('a', { type: 'category.add', id: randomUUID(), name: 'Unaccounted', kind: 'spend' });
    const pick = await call('/api/categories?kind=spend', { cookie: s.a });
    note(
      `add "Unaccounted" after rename: ${r.status}; picker has: ${pick.body
        .map((c: { label: string }) => c.label)
        .filter((l: string) => /unacc|gap/i.test(l))
        .join(',')}`,
    );
  });
});

describe('run 2: payday and names edges', () => {
  for (const v of [
    { kind: 'day', day: 0 },
    { kind: 'day', day: 32 },
    { kind: 'day', day: 15.5 },
    { kind: 'day', day: '15' },
    { kind: 'weekly' },
    'last-working',
    null,
  ])
    it(`payday ${JSON.stringify(v)} is refused`, async () => {
      const r = await cmd('a', { type: 'setting.set', key: 'you.payday', value: v });
      note(`payday ${JSON.stringify(v)}: ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
      shaped(r);
      expect(r.status).toBe(400);
    });
  it('names: blank lines and spaces only save nothing', async () => {
    const r = await cmd('a', { type: 'setting.set', key: 'you.bankNames', value: '\n   \n' });
    const [st] = await rows('user_settings', a.id);
    note(`blank names: ${r.status}; own_names ${JSON.stringify(st?.own_names)}`);
  });
  it('setup.finish with no accounts at all (the API alone)', async () => {
    const r = await cmd('a', { type: 'setup.finish' });
    const me = await call('/api/me', { cookie: s.a });
    note(`finish with no accounts: ${r.status}; setupDone ${me.body.setupDone}`);
  });
});

describe('run 2: the opening balance', () => {
  for (const [label, opening] of [
    ['12.5 (a float)', 12.5],
    ['"12.50" (text)', '12.50'],
    ['1e20', 1e20],
    ['MAX_SEN + 1', 10_000_000_000_000],
  ] as const)
    it(`refuses ${label} with a shaped 400, storing nothing`, async () => {
      const r = await cmd('a', add({ opening }));
      note(`opening ${label}: ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
      shaped(r);
      expect(r.status).toBe(400);
      expect((await rows('accounts', a.id)).length).toBe(0);
    });
  it('0 and 123450 are stored as given', async () => {
    await cmd('a', add({ opening: 0 }));
    await cmd('a', add({ opening: 123450, name: 'Ryt Bank', app: { package: 'my.rytbank.app', label: 'Ryt Bank' } }));
    const got = (await rows('accounts', a.id)).map((x) => `${x.name}=${x.opening_balance}`);
    note(`stored: ${got.join(', ')}`);
    expect(got.sort()).toEqual(['Ryt Bank=123450', 'TNG eWallet=0']);
  });
});
