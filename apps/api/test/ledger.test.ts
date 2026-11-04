import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createApp, type Deps } from '../src/app';
import type { PushMessage } from '../src/jobs/push';
import { LIMITS } from '../src/limits';

// The ledger against the local Postgres (pnpm test:db, B08): first run's seed and finish, one account
// per app (D145), balances from the view, the categories and what can't be done to them, the Capture
// switch, another person's ids, and the offline copy's new kinds.
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

const me = { id: randomUUID(), email: `ledger-me-${randomUUID()}@example.com` };
const other = { id: randomUUID(), email: `ledger-other-${randomUUID()}@example.com` };
const ours = [me.id, other.id];
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
      'x-forwarded-for': `10.9.0.${++ip % 250}`,
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
    headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': `10.9.1.${++ip % 250}` },
    body: JSON.stringify({ email, otp: codes.get(email) }),
  });
  const pairs = res.headers.getSetCookie().map((c) => c.split(';')[0]!);
  const session = pairs.find((p) => p.split('=')[0]!.endsWith('better-auth.session_token'))!;
  return { cookie: pairs.join('; '), token: session.slice(session.indexOf('=') + 1), headers: res.headers };
}

const count = async (q: string, args: unknown[]) => Number((await owner.query(q, args)).rows[0].n);
const run = (cookie: string, body: unknown) => call('/api/commands', { cookie, body });
let s = { me: { cookie: '', token: '' }, other: { cookie: '', token: '' } };
const RYT = { package: 'my.rytbank.app', label: 'Ryt Bank' };

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
  for (const p of [me, other]) {
    await owner.query('insert into auth_user (id, name, email, email_verified) values ($1, $2, $3, true)', [
      p.id,
      'Ledger',
      p.email,
    ]);
    await owner.query('insert into user_access (user_id, is_admin, features) values ($1, false, $2)', [p.id, ON]);
  }
  s = { me: await signIn(me.email), other: await signIn(other.email) };
});

afterAll(async () => {
  await owner.query('delete from auth_user where id = any($1)', [ours]);
  await Promise.all([owner.end(), appPool.end(), authPool.end()]);
});

describe('first run', () => {
  it('seeds the starting categories once (D33), and Unaccounted is never offered', async () => {
    expect((await call('/api/me', { cookie: s.me.cookie })).body?.setupDone).toBe(false);
    const r = await run(s.me.cookie, { type: 'setup.start' });
    expect(r.status).toBe(200);
    await run(s.me.cookie, { type: 'setup.start' });
    expect(await count('select count(*) n from categories where user_id = $1', [me.id])).toBe(21);
    const settings = await call('/api/settings', { cookie: s.me.cookie });
    const cats = settings.body?.categories as { name: string; system: string | null; meal: boolean }[];
    expect(cats).toHaveLength(21);
    expect(cats.find((c) => c.name === 'Meals')?.meal).toBe(true);
    expect(cats.filter((c) => c.system).map((c) => c.system)).toEqual(['cash', 'unaccounted', 'salary']);
    const spend = (await call('/api/categories?kind=spend', { cookie: s.me.cookie })).body as unknown as {
      label: string;
    }[];
    expect(spend).toHaveLength(17);
    expect(spend.map((c) => c.label)).not.toContain('Unaccounted');
    const income = (await call('/api/categories?kind=income', { cookie: s.me.cookie })).body as unknown as {
      label: string;
    }[];
    expect(income.map((c) => c.label)).toEqual(['Salary', 'Interest & returns', 'Other income']);
    // nobody else's
    expect((await call('/api/categories', { cookie: s.other.cookie })).body).toEqual([]);
  });

  it('finishes once, and says so on /me', async () => {
    expect((await run(s.me.cookie, { type: 'setup.finish' })).status).toBe(200);
    const first = (await owner.query('select setup_done_at from user_settings where user_id = $1', [me.id])).rows[0]
      .setup_done_at as Date;
    await run(s.me.cookie, { type: 'setup.finish' });
    const again = (await owner.query('select setup_done_at from user_settings where user_id = $1', [me.id])).rows[0]
      .setup_done_at as Date;
    expect(again.getTime()).toBe(first.getTime());
    expect((await call('/api/me', { cookie: s.me.cookie })).body?.setupDone).toBe(true);
    expect((await call('/api/me', { cookie: s.other.cookie })).body?.setupDone).toBe(false);
  });
});

describe('accounts', () => {
  const ryt = randomUUID();

  it('one per app, with today’s balance as its opening (D145)', async () => {
    const add = { type: 'account.add', id: ryt, name: 'Ryt Bank', kind: 'tracked', app: RYT, opening: 320050 };
    const r = await run(s.me.cookie, add);
    expect(r.status).toBe(200);
    expect(r.body?.undo).toEqual({ type: 'account.archive', id: ryt, archived: true });
    // the same id again is a retry
    expect((await run(s.me.cookie, add)).status).toBe(200);
    // a second account for the same app is refused, in words
    const pocket = await run(s.me.cookie, { ...add, id: randomUUID(), name: 'Ryt pocket' });
    expect(pocket.status).toBe(409);
    expect(pocket.body?.code).toBe('account_exists');
    expect(await count('select count(*) n from accounts where user_id = $1', [me.id])).toBe(1);
    const list = await call('/api/accounts', { cookie: s.me.cookie });
    expect(list.body).toMatchObject({
      total: 320050,
      tracked: [{ id: ryt, name: 'Ryt Bank', kind: 'tracked', balance: 320050, app: 'Ryt Bank', checkedAt: null }],
      elsewhere: [],
      gap: null,
    });
  });

  it('an Elsewhere account has no app and no balance', async () => {
    const bad = await run(s.me.cookie, {
      type: 'account.add',
      id: randomUUID(),
      name: 'Maybank',
      kind: 'elsewhere',
      app: null,
      opening: 100,
    });
    expect(bad.status).toBe(400);
    const ok = await run(s.me.cookie, {
      type: 'account.add',
      id: randomUUID(),
      name: 'Maybank',
      kind: 'elsewhere',
      app: null,
      opening: 0,
    });
    expect(ok.status).toBe(200);
    const list = await call('/api/accounts', { cookie: s.me.cookie });
    expect(list.body?.elsewhere).toMatchObject([{ name: 'Maybank', balance: null }]);
    expect(list.body?.total).toBe(320050);
  });

  it('counts only what moved after the opening (§7)', async () => {
    const at = (await owner.query('select opening_at from accounts where user_id = $1 and id = $2', [me.id, ryt]))
      .rows[0].opening_at as Date;
    const txn = (ms: number, direction: string, amount: number) =>
      owner.query(
        `insert into transactions (id, user_id, account_id, occurred_at, direction, amount, kind, source)
         values ($1, $2, $3, $4, $5, $6, $7, 'manual')`,
        [
          randomUUID(),
          me.id,
          ryt,
          new Date(at.getTime() + ms),
          direction,
          amount,
          direction === 'in' ? 'income' : 'spend',
        ],
      );
    await txn(-1000, 'out', 5000);
    await txn(1000, 'out', 1250);
    await txn(2000, 'in', 10000);
    const one = await call(`/api/accounts/${ryt}`, { cookie: s.me.cookie });
    expect(one.body).toMatchObject({
      opening: 320050,
      account: { balance: 320050 - 1250 + 10000 },
      recent: [],
      checks: [],
    });
    expect(one.body?.openingAt).toBe(at.toISOString());
  });

  it('a corrected opening balance keeps the moment it was seen, and undoes', async () => {
    const before = (await owner.query('select opening_at from accounts where id = $1', [ryt])).rows[0]
      .opening_at as Date;
    const r = await run(s.me.cookie, { type: 'account.edit', id: ryt, opening: 300000 });
    expect(r.body?.undo).toEqual({ type: 'account.edit', id: ryt, opening: 320050 });
    const after = (await owner.query('select opening_balance, opening_at from accounts where id = $1', [ryt])).rows[0];
    expect(Number(after.opening_balance)).toBe(300000);
    expect((after.opening_at as Date).getTime()).toBe(before.getTime());
    await run(s.me.cookie, r.body?.undo);
    expect(
      Number((await owner.query('select opening_balance from accounts where id = $1', [ryt])).rows[0].opening_balance),
    ).toBe(320050);
  });

  it('archiving frees the app for a new account, and the old one can’t come back over it', async () => {
    expect((await run(s.me.cookie, { type: 'account.archive', id: ryt, archived: true })).status).toBe(200);
    expect((await call('/api/accounts', { cookie: s.me.cookie })).body?.tracked).toEqual([]);
    const fresh = randomUUID();
    expect(
      (await run(s.me.cookie, { type: 'account.add', id: fresh, name: 'Ryt', kind: 'tracked', app: RYT, opening: 1 }))
        .status,
    ).toBe(200);
    const back = await run(s.me.cookie, { type: 'account.archive', id: ryt, archived: false });
    expect(back.status).toBe(409);
    expect(back.body?.code).toBe('account_exists');
  });

  it('are nobody else’s: another person’s id is not found, and they see none', async () => {
    expect((await call(`/api/accounts/${ryt}`, { cookie: s.other.cookie })).status).toBe(404);
    expect((await call('/api/accounts', { cookie: s.other.cookie })).body?.tracked).toEqual([]);
    const edit = await run(s.other.cookie, { type: 'account.edit', id: ryt, name: 'Mine now' });
    expect(edit.status).toBe(404);
    expect((await owner.query('select name from accounts where id = $1', [ryt])).rows[0].name).toBe('Ryt Bank');
  });

  it('come with capture: with the switch off, the API refuses them too (§9.6)', async () => {
    await owner.query('update user_access set features = $2 where user_id = $1', [other.id, { ...ON, capture: false }]);
    try {
      expect((await call('/api/accounts', { cookie: s.other.cookie })).status).toBe(403);
      const r = await run(s.other.cookie, {
        type: 'account.add',
        id: randomUUID(),
        name: 'TNG',
        kind: 'tracked',
        app: { package: 'my.com.tngdigital.ewallet', label: 'TNG' },
        opening: 0,
      });
      expect(r.status).toBe(403);
      expect(r.body?.code).toBe('capture_off');
    } finally {
      await owner.query('update user_access set features = $2 where user_id = $1', [other.id, ON]);
    }
  });
});

describe('categories', () => {
  const id = async (name: string) =>
    (await owner.query('select id from categories where user_id = $1 and name = $2', [me.id, name])).rows[0]
      .id as string;

  it('rename and flags, with undo', async () => {
    const meals = await id('Meals');
    const r = await run(s.me.cookie, { type: 'category.edit', id: meals, name: 'Food', discretionary: true });
    expect(r.status).toBe(200);
    expect(r.body?.undo).toEqual({ type: 'category.edit', id: meals, name: 'Meals', discretionary: false });
    await run(s.me.cookie, r.body?.undo);
    expect((await owner.query('select name, is_discretionary from categories where id = $1', [meals])).rows[0]).toEqual(
      {
        name: 'Meals',
        is_discretionary: false,
      },
    );
  });

  it('Sen’s own can be renamed but never archived, and Unaccounted takes no flags', async () => {
    const salary = await id('Salary');
    const arch = await run(s.me.cookie, { type: 'category.archive', id: salary, archived: true });
    expect(arch.status).toBe(409);
    expect(arch.body?.code).toBe('system_category');
    expect((await run(s.me.cookie, { type: 'category.edit', id: salary, name: 'Pay' })).status).toBe(200);
    const flag = await run(s.me.cookie, { type: 'category.edit', id: await id('Unaccounted'), meal: true });
    expect(flag.status).toBe(409);
    const income = await run(s.me.cookie, { type: 'category.edit', id: await id('Other income'), meal: true });
    expect(income.body?.code).toBe('income_flags');
  });

  it('a new one goes last; a taken name is refused; an archived one leaves the picker', async () => {
    const tea = randomUUID();
    expect((await run(s.me.cookie, { type: 'category.add', id: tea, name: 'Tea', kind: 'spend' })).status).toBe(200);
    const taken = await run(s.me.cookie, { type: 'category.add', id: randomUUID(), name: 'tea', kind: 'spend' });
    expect(taken.status).toBe(409);
    expect(taken.body?.field).toBe('name');
    let spend = (await call('/api/categories?kind=spend', { cookie: s.me.cookie })).body as unknown as { id: string }[];
    expect(spend.at(-1)?.id).toBe(tea);
    await run(s.me.cookie, { type: 'category.archive', id: tea, archived: true });
    spend = (await call('/api/categories?kind=spend', { cookie: s.me.cookie })).body as unknown as { id: string }[];
    expect(spend.map((c) => c.id)).not.toContain(tea);
    const all = (await call('/api/settings', { cookie: s.me.cookie })).body?.categories as {
      id: string;
      archived: boolean;
    }[];
    expect(all.find((c) => c.id === tea)?.archived).toBe(true);
  });

  it('another person’s category is not found', async () => {
    const r = await run(s.other.cookie, { type: 'category.edit', id: await id('Groceries'), name: 'x' });
    expect(r.status).toBe(404);
  });
});

describe('the offline copy (§5)', () => {
  it('carries the categories, accounts and your names, by version, and only yours', async () => {
    await run(s.me.cookie, { type: 'setting.set', key: 'you.bankNames', value: 'TAN WEI MING\nWEI MING TAN' });
    const down = await call('/api/sync/changes?since=0', { bearer: s.me.token, origin: null });
    expect(down.status).toBe(200);
    expect(down.body?.categories).toHaveLength(22);
    expect((down.body?.accounts as { kind: string }[]).map((a) => a.kind).sort()).toEqual([
      'elsewhere',
      'tracked',
      'tracked',
    ]);
    expect(down.body?.ownNames).toEqual(['TAN WEI MING', 'WEI MING TAN']);
    expect(down.body?.more).toBe(false);
    const none = await call(`/api/sync/changes?since=${down.body?.version}`, { bearer: s.me.token, origin: null });
    expect(none.body).toMatchObject({ categories: [], accounts: [], accountNames: [], ownNames: null, more: false });
    // a rename comes down on its own
    const groceries = (
      await owner.query("select id from categories where user_id = $1 and name = 'Groceries'", [me.id])
    ).rows[0].id;
    await run(s.me.cookie, { type: 'category.edit', id: groceries, name: 'Market' });
    const next = await call(`/api/sync/changes?since=${down.body?.version}`, { bearer: s.me.token, origin: null });
    expect(next.body?.categories).toMatchObject([{ id: groceries, name: 'Market' }]);
    const theirs = await call('/api/sync/changes?since=0', { bearer: s.other.token, origin: null });
    expect(theirs.body?.categories).toEqual([]);
    expect(theirs.body?.accounts).toEqual([]);
  });

  it('a ledger command from the shell’s outbox applies once', async () => {
    const id = randomUUID();
    const cmd = {
      id: randomUUID(),
      madeAt: new Date().toISOString(),
      command: { type: 'category.add', id, name: 'Parking', kind: 'spend' },
    };
    const r = await call('/api/sync', { body: { commands: [cmd] }, bearer: s.me.token, origin: null });
    expect(r.body?.synced.commands).toMatchObject([{ status: 'applied' }]);
    const again = await call('/api/sync', { body: { commands: [cmd] }, bearer: s.me.token, origin: null });
    expect(again.body?.synced.commands).toMatchObject([{ status: 'already' }]);
    expect(await count('select count(*) n from categories where user_id = $1 and id = $2', [me.id, id])).toBe(1);
  });
});
