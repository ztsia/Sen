// QA B08 run 1: the reviewer's probes of the ledger's routes and commands (spec §7, §8, §16, D146),
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
const url = (role: string) => `postgres://${role}@${HOST}:5432/sen_test`;
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

const a = { id: randomUUID(), email: `qa-b08-a-${randomUUID()}@example.com` };
const b = { id: randomUUID(), email: `qa-b08-b-${randomUUID()}@example.com` };
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

describe('setup.start', () => {
  it('three at once seed 21, once', async () => {
    const r = await Promise.all([1, 2, 3].map(() => cmd('a', { type: 'setup.start' })));
    note(`setup.start ×3 at once: ${r.map((x) => `${x.status} ${x.body.said}`).join(' | ')}`);
    expect((await rows('categories', a.id)).length).toBe(21);
  });
});

describe('account.add: the opening balance', () => {
  for (const [label, opening] of [
    ['12.5 (a float)', 12.5],
    ['"12.50" (text)', '12.50'],
    ['1e20', 1e20],
    ['null', null],
    ['true', true],
    ['MAX_SEN + 1', 10_000_000_000_000],
  ] as const)
    it(`refuses ${label}`, async () => {
      const r = await cmd('a', add({ opening }));
      note(`opening ${label}: ${r.status} ${JSON.stringify(r.body)}`);
      expect(r.status).toBe(400);
      shaped(r);
      expect((await rows('accounts', a.id)).length).toBe(0);
    });
  it('a negative opening balance', async () => {
    const r = await cmd('a', add({ opening: -500 }));
    note(
      `opening -500: ${r.status} ${JSON.stringify(r.body)}; stored ${(await rows('accounts', a.id)).map((x) => x.opening_balance)}`,
    );
  });
  it('a missing opening', async () => {
    const c = add() as Record<string, unknown>;
    delete c.opening;
    const r = await cmd('a', c);
    note(`no opening: ${r.status} ${JSON.stringify(r.body)}`);
    expect(r.status).toBe(400);
    shaped(r);
  });
});

describe('account.add: names and apps', () => {
  for (const [label, o] of [
    ['an empty name', { name: '   ' }],
    ['a 61-character name', { name: 'x'.repeat(61) }],
    ['a package with ../', { app: { package: '../../etc/passwd', label: 'x' } }],
    ['a package with SQL', { app: { package: "a.b'; drop table accounts; --", label: 'x' } }],
    ['a 10 000-character label', { app: { package: 'com.example.app', label: 'y'.repeat(10_000) } }],
    ['an Elsewhere account with a balance', { kind: 'elsewhere', app: null, opening: 100 }],
    ['an Elsewhere account with an app', { kind: 'elsewhere', opening: 0 }],
    ['a kind of savings', { kind: 'savings' }],
  ] as const)
    it(`refuses ${label}`, async () => {
      const r = await cmd('a', add(o as never));
      note(`${label}: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
      expect(r.status).toBe(400);
      shaped(r);
      expect((await rows('accounts', a.id)).length).toBe(0);
    });
  it('keeps a hostile but valid name as typed', async () => {
    const name = "Robert'); DROP TABLE accounts;--";
    const r = await cmd('a', add({ name }));
    note(`hostile name: ${r.status}; stored ${JSON.stringify((await rows('accounts', a.id)).map((x) => x.name))}`);
    expect(r.status).toBe(200);
    expect((await rows('accounts', a.id))[0]!.name).toBe(name);
  });
});

describe('account.add: dedupe', () => {
  it('the same id twice is one account', async () => {
    const id = randomUUID();
    const r1 = await cmd('a', add({ id }));
    const r2 = await cmd('a', add({ id }));
    note(`same id twice: ${r1.status} ${r1.body.said} / ${r2.status} ${r2.body.said}`);
    expect(r2.status).toBe(200);
    expect((await rows('accounts', a.id)).length).toBe(1);
  });
  it('the same app again with a fresh id (what first run sends on a retry)', async () => {
    await cmd('a', add());
    const r = await cmd('a', add());
    note(`same app, new id: ${r.status} ${JSON.stringify(r.body)}`);
    expect((await rows('accounts', a.id)).length).toBe(1);
  });
  it('B reusing A’s account id makes B’s own row, A’s untouched', async () => {
    const id = randomUUID();
    await cmd('a', add({ id, opening: 111 }));
    const r = await cmd('b', add({ id, opening: 222 }));
    note(`B with A's id: ${r.status} ${JSON.stringify(r.body)}`);
    expect((await rows('accounts', a.id))[0]!.opening_balance).toBe('111');
  });
});

describe('another person’s ids', () => {
  it('edit, archive and read of A’s account as B are 404, like a random id', async () => {
    const id = randomUUID();
    await cmd('a', add({ id }));
    const out = [
      await cmd('b', { type: 'account.edit', id, opening: 1 }),
      await cmd('b', { type: 'account.archive', id, archived: true }),
      await call(`/api/accounts/${id}`, { cookie: s.b }),
      await call(`/api/accounts/${randomUUID()}`, { cookie: s.b }),
    ];
    note(`B on A's account: ${out.map((x) => `${x.status} ${x.body?.code}`).join(' | ')}`);
    for (const r of out) expect(r.status).toBe(404);
    expect((await rows('accounts', a.id))[0]!.opening_balance).toBe('10000');
  });
  it('B can’t rename or archive A’s category', async () => {
    await cmd('a', { type: 'setup.start' });
    const meals = (await rows('categories', a.id)).find((x) => x.name === 'Meals')!;
    const r1 = await cmd('b', { type: 'category.edit', id: meals.id, name: 'Mine' });
    const r2 = await cmd('b', { type: 'category.archive', id: meals.id, archived: true });
    note(`B on A's category: ${r1.status} / ${r2.status}`);
    expect(r1.status).toBe(404);
    expect(r2.status).toBe(404);
  });
});

describe('categories', () => {
  beforeEach(async () => {
    await cmd('a', { type: 'setup.start' });
  });
  const byName = async (n: string) => (await rows('categories', a.id)).find((x) => x.name === n)!;
  for (const [label, body] of [
    ['a taken name, other case', { type: 'category.add', name: 'MEALS', kind: 'spend' }],
    ['a 41-character name', { type: 'category.add', name: 'z'.repeat(41), kind: 'spend' }],
    ['an empty name', { type: 'category.add', name: '  ', kind: 'spend' }],
    ['a kind of transfer', { type: 'category.add', name: 'Moves', kind: 'transfer' }],
  ] as const)
    it(`add refuses ${label}`, async () => {
      const r = await cmd('a', { ...body, id: randomUUID() });
      note(`category.add ${label}: ${r.status} ${JSON.stringify(r.body)}`);
      expect([400, 409]).toContain(r.status);
      shaped(r);
      expect((await rows('categories', a.id)).length).toBe(21);
    });
  it('rename onto a taken name is 409 name_taken on field name', async () => {
    const g = await byName('Groceries');
    const r = await cmd('a', { type: 'category.edit', id: g.id, name: 'meals' });
    note(`rename onto Meals: ${r.status} ${JSON.stringify(r.body)}`);
    expect(r.status).toBe(409);
    expect(r.body.field).toBe('name');
  });
  it('Unaccounted takes no flags; Cash and Salary are never archived; income takes no flags', async () => {
    const u = await byName('Unaccounted');
    const c = await byName('Cash');
    const sal = await byName('Salary');
    const out = [
      await cmd('a', { type: 'category.edit', id: u.id, discretionary: true }),
      await cmd('a', { type: 'category.archive', id: c.id, archived: true }),
      await cmd('a', { type: 'category.archive', id: sal.id, archived: true }),
      await cmd('a', { type: 'category.edit', id: sal.id, meal: true }),
    ];
    note(`system refusals: ${out.map((x) => `${x.status} ${x.body.code}`).join(' | ')}`);
    for (const r of out) {
      expect(r.status).toBe(409);
      shaped(r);
    }
  });
  it('renaming Cash keeps its system key', async () => {
    const c = await byName('Cash');
    await cmd('a', { type: 'category.edit', id: c.id, name: 'Tunai' });
    const after = (await rows('categories', a.id)).find((x) => x.id === c.id)!;
    note(`Cash renamed: ${after.name} ${after.system_key}`);
    expect(after.system_key).toBe('cash');
  });
  it('the same add twice (same id) is one category', async () => {
    const id = randomUUID();
    await cmd('a', { type: 'category.add', id, name: 'Pets', kind: 'spend' });
    const r = await cmd('a', { type: 'category.add', id, name: 'Pets', kind: 'spend' });
    note(`category.add twice: ${r.status} ${JSON.stringify(r.body)}`);
    expect((await rows('categories', a.id)).length).toBe(22);
  });
  it('the picker never offers Unaccounted or an archived one; a bad kind is 400', async () => {
    const tr = await byName('Travel');
    await cmd('a', { type: 'category.archive', id: tr.id, archived: true });
    const r = await call('/api/categories?kind=spend', { cookie: s.a });
    const names = r.body.map((x: { label: string }) => x.label);
    note(`picker: ${names.length} ${names.join(', ')}`);
    expect(names).not.toContain('Unaccounted');
    expect(names).not.toContain('Travel');
    const bad = await call('/api/categories?kind=../../x', { cookie: s.a });
    note(`kind=../../x: ${bad.status} ${JSON.stringify(bad.body)}`);
    expect(bad.status).toBe(400);
    shaped(bad);
  });
});

describe('You: names and payday', () => {
  for (const [label, value] of [
    ['day 0', { kind: 'day', day: 0 }],
    ['day 32', { kind: 'day', day: 32 }],
    ['day 15.5', { kind: 'day', day: 15.5 }],
    ['kind weekly', { kind: 'weekly' }],
    ['a string', 'last-working'],
  ] as const)
    it(`payday refuses ${label}`, async () => {
      const r = await cmd('a', { type: 'setting.set', key: 'you.payday', value });
      note(`payday ${label}: ${r.status} ${JSON.stringify(r.body)}`);
      expect(r.status).toBe(400);
      shaped(r);
    });
  it('a name of 2 000 characters, and a name with SQL', async () => {
    const r1 = await cmd('a', { type: 'setting.set', key: 'you.bankNames', value: 'A'.repeat(2000) });
    const r2 = await cmd('a', {
      type: 'setting.set',
      key: 'you.bankNames',
      value: "TAN'; DROP TABLE user_settings;--",
    });
    const st = (await rows('user_settings', a.id))[0];
    note(`names: 2000-char ${r1.status}; SQL ${r2.status}; stored ${JSON.stringify(st?.own_names)}`);
  });
  it('names without capture', async () => {
    await owner.query('update user_access set features = $2 where user_id = $1', [a.id, { ...ON, capture: false }]);
    const r = await cmd('a', { type: 'setting.set', key: 'you.bankNames', value: 'TAN WEI MING' });
    note(`names with capture off: ${r.status} ${JSON.stringify(r.body)}`);
  });
});

describe('capture off', () => {
  it('accounts are refused 403 capture_off, everywhere', async () => {
    const id = randomUUID();
    await cmd('a', add({ id }));
    await owner.query('update user_access set features = $2 where user_id = $1', [a.id, { ...ON, capture: false }]);
    const out = [
      await call('/api/accounts', { cookie: s.a }),
      await call(`/api/accounts/${id}`, { cookie: s.a }),
      await cmd('a', add()),
      await cmd('a', { type: 'account.edit', id, opening: 5 }),
      await cmd('a', { type: 'account.archive', id, archived: true }),
    ];
    note(`capture off: ${out.map((x) => `${x.status} ${x.body.code}`).join(' | ')}`);
    for (const r of out) {
      expect(r.status).toBe(403);
      expect(r.body.code).toBe('capture_off');
    }
    const sc = await call('/api/sync/changes?since=0', { cookie: s.a });
    note(`/sync/changes with capture off: ${sc.status} accounts=${JSON.stringify(sc.body?.accounts?.length)}`);
  });
});

describe('the balance on /accounts', () => {
  it('equals opening + in − out after opening_at; the total leaves archived out', async () => {
    const t = randomUUID();
    const r = randomUUID();
    await cmd('a', add({ id: t, opening: 10000 }));
    await cmd(
      'a',
      add({ id: r, name: 'Ryt Bank', app: { package: 'my.rytbank.app', label: 'Ryt Bank' }, opening: 5000 }),
    );
    const ins = (when: string, dir: string, amt: number, share: number | null) =>
      owner.query(
        `insert into transactions (id, user_id, account_id, occurred_at, direction, amount, kind, source, my_share) values ($1,$2,$3,(select opening_at from accounts where id = $3 and user_id = $2) ${when},$4,$5,$6,'manual',$7)`,
        [randomUUID(), a.id, t, dir, amt, dir === 'in' ? 'income' : 'spend', share],
      );
    await owner.query('select 1');
    await ins(`- interval '1 second'`, 'out', 999, null);
    await ins(`+ interval '1 microsecond'`, 'out', 12000 - 0, 4000);
    await ins(`+ interval '1 day'`, 'in', 3050, null);
    const v = await call('/api/accounts', { cookie: s.a });
    const tn = v.body.tracked.find((x: { id: string }) => x.id === t);
    note(
      `TNG balance ${tn.balance} (want 10000 − 12000 + 3050 = 1050); total ${v.body.total} (want 1050 + 5000 = 6050)`,
    );
    expect(tn.balance).toBe(1050);
    expect(v.body.total).toBe(6050);
    await cmd('a', { type: 'account.archive', id: r, archived: true });
    const v2 = await call('/api/accounts', { cookie: s.a });
    note(`after archiving Ryt: total ${v2.body.total}, tracked ${v2.body.tracked.length}`);
    expect(v2.body.total).toBe(1050);
  });
});
