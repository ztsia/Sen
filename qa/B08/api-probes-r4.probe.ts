// QA B08 run 4: the reviewer's own probes (same harness as runs 1 and 2) of the ledger's routes and commands (spec §7, §8, §16, D146),
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

const a = { id: randomUUID(), email: `qa-b08r4-a-${randomUUID()}@example.com` };
const b = { id: randomUUID(), email: `qa-b08r4-b-${randomUUID()}@example.com` };
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
const cats = async (who: 'a' | 'b', id: string) => {
  await cmd(who, { type: 'setup.start' });
  return (await owner.query('select id, name, system_key, archived_at from categories where user_id = $1', [id])).rows;
};

describe('run 4: accounts by id', () => {
  it('an upper-case id of one’s own account', async () => {
    const id = randomUUID();
    await cmd('a', add({ id }));
    const lower = await call(`/api/accounts/${id}`, { cookie: s.a });
    const upper = await call(`/api/accounts/${id.toUpperCase()}`, { cookie: s.a });
    note(`lower ${lower.status}; upper ${upper.status} ${JSON.stringify(upper.body).slice(0, 120)}`);
    expect(lower.status).toBe(200);
  });
});

describe('run 4: the opening balance’s types', () => {
  for (const [label, v] of [
    ['10.5', 10.5],
    ['"1000" (text)', '1000'],
    ['1e13 (past MAX_SEN)', 1e13],
    ['null', null],
    ['true', true],
  ] as const)
    it(`opening ${label} is refused, shaped, no row`, async () => {
      const r = await cmd('a', add({ opening: v }));
      note(`opening ${label}: ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
      shaped(r);
      expect(r.status).toBe(400);
      expect((await rows('accounts', a.id)).length).toBe(0);
    });
  it('9 999 999 999 999 (MAX_SEN) is stored exactly and read back exactly', async () => {
    const r = await cmd('a', add({ opening: 9_999_999_999_999 }));
    const l = await list('a');
    note(
      `MAX_SEN: ${r.status}; /accounts total ${l.body?.total}; row ${(await rows('accounts', a.id))[0]?.opening_balance}`,
    );
    expect(l.body?.total).toBe(9_999_999_999_999);
  });
});

describe('run 4: category names', () => {
  it('bringing back a category whose name is taken again is refused in words', async () => {
    await cats('a', a.id);
    const pets = randomUUID();
    await cmd('a', { type: 'category.add', id: pets, name: 'Pets', kind: 'spend' });
    await cmd('a', { type: 'category.archive', id: pets, archived: true });
    await cmd('a', { type: 'category.add', id: randomUUID(), name: 'pets', kind: 'spend' });
    const r = await cmd('a', { type: 'category.archive', id: pets, archived: false });
    note(`bring back Pets over live 'pets': ${r.status} ${JSON.stringify(r.body)}`);
    shaped(r);
    expect(r.status).toBe(409);
  });
  it('a name only spaces, and 41 characters, are refused on field name; 40 is kept', async () => {
    await cats('a', a.id);
    const sp = await cmd('a', { type: 'category.add', id: randomUUID(), name: '   ', kind: 'spend' });
    const long = await cmd('a', { type: 'category.add', id: randomUUID(), name: 'x'.repeat(41), kind: 'spend' });
    const ok = await cmd('a', { type: 'category.add', id: randomUUID(), name: 'y'.repeat(40), kind: 'spend' });
    note(
      `spaces ${sp.status} ${JSON.stringify(sp.body)}; 41: ${long.status} ${JSON.stringify(long.body)}; 40: ${ok.status}`,
    );
    expect(sp.status).toBe(400);
    expect(long.status).toBe(400);
    expect(ok.status).toBe(200);
  });
  it('a look-alike of a taken name (a zero-width space inside Meals)', async () => {
    await cats('a', a.id);
    const r = await cmd('a', { type: 'category.add', id: randomUUID(), name: 'Me​als', kind: 'spend' });
    const live = (
      await owner.query(
        "select name from categories where user_id = $1 and archived_at is null and replace(name, E'\\u200b', '') = 'Meals'",
        [a.id],
      )
    ).rows;
    note(`'Me\\u200bals': ${r.status} ${JSON.stringify(r.body)}; live rows reading "Meals": ${live.length}`);
    expect(live.length).toBe(1);
  });
  it('a name taken by the other kind (an income category called Meals)', async () => {
    await cats('a', a.id);
    const r = await cmd('a', { type: 'category.add', id: randomUUID(), name: 'Meals', kind: 'income' });
    note(`income 'Meals': ${r.status} ${JSON.stringify(r.body)}`);
    expect(r.status).toBe(409);
  });
  it('the income picker offers the three money-in categories, in order', async () => {
    await cats('a', a.id);
    const r = await call('/api/categories?kind=income', { cookie: s.a });
    note(`income picker: ${JSON.stringify(r.body.map((x: { label: string }) => x.label))}`);
    expect(r.body.map((x: { label: string }) => x.label)).toEqual(['Salary', 'Interest & returns', 'Other income']);
  });
});

describe('run 4: without capture', () => {
  it('first run still seeds 21 and finishes; accounts stay refused', async () => {
    await owner.query('update user_access set features = $2 where user_id = $1', [a.id, { ...ON, capture: false }]);
    const st = await cmd('a', { type: 'setup.start' });
    const fin = await cmd('a', { type: 'setup.finish' });
    const me = await call('/api/me', { cookie: s.a });
    const acc = await list('a');
    const n = (await rows('categories', a.id)).length;
    note(
      `start ${st.status} ${st.body?.said}; finish ${fin.status}; /me setupDone ${me.body?.setupDone}; categories ${n}; /accounts ${acc.status} ${acc.body?.code}`,
    );
    expect(n).toBe(21);
    expect(me.body?.setupDone).toBe(true);
    expect(acc.status).toBe(403);
  });
});

describe('run 4: idempotency', () => {
  it('archiving a category twice changes nothing the second time', async () => {
    await cats('a', a.id);
    const id = (await rows('categories', a.id)).find((c) => c.name === 'Travel').id;
    const r1 = await cmd('a', { type: 'category.archive', id, archived: true });
    const at1 = (await owner.query('select archived_at, version from categories where id = $1', [id])).rows[0];
    const r2 = await cmd('a', { type: 'category.archive', id, archived: true });
    const at2 = (await owner.query('select archived_at, version from categories where id = $1', [id])).rows[0];
    note(
      `first ${r1.status} undo=${!!r1.body?.undo}; second ${r2.status} undo=${!!r2.body?.undo}; archived_at same ${String(at1.archived_at) === String(at2.archived_at)}; version ${at1.version}→${at2.version}`,
    );
    expect(String(at1.archived_at)).toBe(String(at2.archived_at));
    expect(at2.version).toBe(at1.version);
  });
  it('the same account.edit twice moves the version once', async () => {
    const id = randomUUID();
    await cmd('a', add({ id }));
    await cmd('a', { type: 'account.edit', id, opening: 5 });
    const v1 = (await owner.query('select version, opening_at from accounts where id = $1', [id])).rows[0];
    await cmd('a', { type: 'account.edit', id, opening: 5 });
    const v2 = (await owner.query('select version, opening_at from accounts where id = $1', [id])).rows[0];
    note(`version ${v1.version}→${v2.version}; opening_at kept ${String(v1.opening_at) === String(v2.opening_at)}`);
    expect(v2.version).toBe(v1.version);
  });
});
