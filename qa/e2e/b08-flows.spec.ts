import fs from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test, type Page, type Route } from '@playwright/test';
import { PEOPLE } from './b08-setup';

// QA B08 run 1: the flows of qa/B08/flows.md a browser can walk (b08.config.ts). Each step asserts first,
// then takes its screenshot, then writes its row for results.json. Made-up people and amounts only.
const ROOT = '../../qa-artifacts/B08_first-run-accounts';
const SHOTS = `${ROOT}/screens`;
const STEPS = `${ROOT}/steps.jsonl`;
fs.mkdirSync(SHOTS, { recursive: true });
const SERVER = 'http://localhost:4179';
const FAKE = 'http://localhost:4173';

async function step(
  page: Page,
  flow: string,
  n: number,
  slug: string,
  action: string,
  assertion: string,
  check: () => Promise<void>,
) {
  const file = `${flow}-step-${n}-${slug}`;
  let status = 'pass';
  let err = '';
  try {
    await check();
  } catch (e) {
    status = 'fail';
    err = String(e).slice(0, 900);
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/${file}.png` }).catch(() => undefined);
  fs.appendFileSync(STEPS, JSON.stringify({ flow, n, action, assertion, status, screenshot: `${file}.png`, err }) + '\n');
  if (status === 'fail') throw new Error(`${flow} step ${n}: ${err}`);
}

/** One query on sen_test as its owner. */
async function sql<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const req = createRequire(createRequire(new URL('../../apps/web/package.json', import.meta.url)).resolve('@sen/db'));
  const pg = req('pg') as { Client: new (o: { connectionString: string }) => any };
  const c = new pg.Client({ connectionString: 'postgres://sen_owner@127.0.0.1:5432/sen_test' });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}

type Who = keyof typeof PEOPLE;
const uid = (w: Who) => PEOPLE[w].id;

async function signIn(page: Page, who: Who) {
  await sql('truncate auth_rate_limit');
  await page.goto(`${SERVER}/s/sign-in?look=minted&mode=light`);
  await page.getByLabel('Your email').fill(PEOPLE[who].email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 15_000 });
}

async function atStep(page: Page, n: number, of = 7) {
  await expect(page.getByText(`Step ${n} of ${of}`)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(350);
}

/** From step 2 to the given step, the shell's steps answered by the simulator. */
async function toStep(page: Page, n: number) {
  await atStep(page, 2);
  if (n === 2) return;
  await page.getByRole('button', { name: /^Choose these \d+$/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 3);
  if (n === 3) return;
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 4);
  if (n === 4) return;
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 5);
}

const BAL = { 'TNG eWallet': '1,284.50', 'Ryt Bank': '500.00', 'Public Bank': '0.00', 'GrabPay Wallet': '23.90' };
const SEN = { 'TNG eWallet': 128450, 'Ryt Bank': 50000, 'Public Bank': 0, 'GrabPay Wallet': 2390 };

async function fillBalances(page: Page, skip?: string) {
  for (const [name, text] of Object.entries(BAL)) {
    if (name === skip) continue;
    await page.getByLabel(name, { exact: true }).fill(text);
  }
}

const accountsOf = (w: Who) =>
  sql<{ name: string; opening_balance: string; notifier_package: string; opening_at: Date; archived_at: Date | null }>(
    'select name, opening_balance, notifier_package, opening_at, archived_at from accounts where user_id = $1 order by name',
    [uid(w)],
  );

// ── FLOW-1, FLOW-4, FLOW-5: first run start to finish, against the API ──────────────────────────────
test('FLOW-1 first run, start to finish, saves every step', async ({ page }) => {
  await step(page, 'FLOW-1', 1, 'signed-in', 'Sign in, open first run', 'Step 2 of 7: Choose your apps', async () => {
    await signIn(page, 'ming');
    // D146 (2): capture on, in a plain browser, isn't sent to first run
    await expect(page).not.toHaveURL(/first-run/);
    await page.goto(`${SERVER}/s/first-run`);
    await atStep(page, 2);
    await expect(page.getByRole('heading', { name: 'Choose your apps' })).toBeVisible();
  });
  await step(page, 'FLOW-1', 2, 'apps', 'Choose these, Next', 'Step 3 of 7', async () => {
    await page.getByRole('button', { name: /^Choose these \d+$/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Next' }).click();
    await atStep(page, 3);
  });
  await step(page, 'FLOW-1', 3, 'access-skipped', 'Skip notification access', 'Step 4 of 7: Keep Sen running', async () => {
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await atStep(page, 4);
    await expect(page.getByRole('heading', { name: 'Keep Sen running' })).toBeVisible();
  });
  await step(page, 'FLOW-1', 4, 'accounts', 'Skip Keep Sen running', 'Step 5: four balance fields, no Add', async () => {
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await atStep(page, 5);
    for (const name of Object.keys(BAL)) await expect(page.getByLabel(name, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /add/i })).toHaveCount(0);
  });
  await step(page, 'FLOW-1', 5, 'typed', 'Type TNG as digits 128450, the rest', 'TNG reads 1,284.50', async () => {
    const tng = page.getByLabel('TNG eWallet', { exact: true });
    await tng.click();
    await page.keyboard.type('128450');
    await expect(tng).toHaveValue(/1,284\.50/);
    await fillBalances(page, 'TNG eWallet');
  });
  await step(page, 'FLOW-1', 6, 'saved', 'Next', 'Step 6; four accounts with those opening balances', async () => {
    await page.getByRole('button', { name: 'Next' }).click();
    await atStep(page, 6);
    const rows = await accountsOf('ming');
    expect(rows.length).toBe(4);
    for (const r of rows) {
      const want = Object.entries(SEN).find(([k]) => k === r.name)?.[1];
      expect(Number(r.opening_balance), r.name).toBe(want);
    }
    const cats = await sql<{ n: string }>('select count(*) n from categories where user_id = $1', [uid('ming')]);
    expect(cats[0]!.n).toBe('21');
  });
  await step(page, 'FLOW-1', 7, 'name', 'Type tan wei ming, Next', 'Step 7; own_names {TAN WEI MING}', async () => {
    await page.getByLabel('Your name').fill('tan wei ming');
    await expect(page.getByText('Sen will look for TAN WEI MING.')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await atStep(page, 7);
    await expect
      .poll(async () => (await sql<{ n: string[] }>('select own_names n from user_settings where user_id=$1', [uid('ming')]))[0]?.n)
      .toEqual(['TAN WEI MING']);
  });
  await step(page, 'FLOW-1', 8, 'payday', 'Payday: the default, Finish', 'Home; setup_done_at set; payday last-working', async () => {
    await expect(page.getByRole('radio', { name: 'Last working day' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page).toHaveURL(/4179\/(\?.*)?$/, { timeout: 10_000 });
    const s = await sql<{ d: Date | null; p: string | null }>(
      'select setup_done_at d, expected_payday p from user_settings where user_id=$1',
      [uid('ming')],
    );
    expect(s[0]!.d).not.toBeNull();
    expect(s[0]!.p).toBe('last-working');
  });
  await step(page, 'FLOW-1', 9, 'home', 'Look at Home', 'Home: Spent since you started (flows step 8)', async () => {
    await expect(page.getByTestId('hero')).toBeVisible();
    await expect(page.getByRole('main')).toContainText('Spent since you started');
  });
  await step(page, 'FLOW-5', 1, 'reload', 'Reload Home', 'still Home, never a first-run step', async () => {
    await page.reload();
    await expect(page.getByTestId('hero')).toBeVisible();
    await expect(page.getByText(/Step \d of 7/)).toHaveCount(0);
  });

  // FLOW-6: Accounts and an account
  await step(page, 'FLOW-6', 1, 'accounts', 'More → Accounts', 'total RM1,808.40; TNG RM1,284.50', async () => {
    await page.goto(`${SERVER}/s/accounts`);
    await expect(page.getByRole('main')).toContainText('RM1,808.40');
    await expect(page.getByRole('main')).toContainText('RM1,284.50');
    await expect(page.getByRole('main')).toContainText('In 4 accounts');
  });
  await step(page, 'FLOW-6', 2, 'account', 'Open TNG eWallet', 'opening balance RM1,284.50, fed by its app', async () => {
    await page.getByRole('button', { name: /TNG eWallet/ }).click();
    await expect(page.getByText('Opening balance')).toBeVisible();
    await expect(page.getByRole('main')).toContainText('RM1,284.50');
    await expect(page.getByRole('main')).toContainText('Fed by');
  });
  const before = (await accountsOf('ming')).find((r) => r.name === 'TNG eWallet')!;
  await step(page, 'FLOW-6', 3, 'edit', 'Edit → opening 1,300.00 → Save', 'stored 130000; opening_at unchanged', async () => {
    await page.getByRole('button', { name: 'Edit' }).click();
    const f = page.getByLabel('Opening balance');
    await f.fill('1,300.00');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('main')).toContainText('RM1,300.00');
    const after = (await accountsOf('ming')).find((r) => r.name === 'TNG eWallet')!;
    expect(after.opening_balance).toBe('130000');
    expect(after.opening_at.toISOString()).toBe(before.opening_at.toISOString());
  });
  await step(page, 'FLOW-6', 4, 'archived', 'Edit → Archive this account', 'back on Accounts, TNG gone, Undo offered', async () => {
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Archive this account' }).click();
    await expect(page).toHaveURL(/\/s\/accounts/);
    await expect(page.locator('[data-sonner-toast]')).toContainText(/archived/i);
    await expect(page.getByRole('main').getByRole('button', { name: /TNG eWallet/ })).toHaveCount(0);
  });
  await step(page, 'FLOW-6', 5, 'undone', 'Undo', 'TNG back on Accounts, archived_at null', async () => {
    await page.locator('[data-sonner-toast]').getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('main').getByRole('button', { name: /TNG eWallet/ })).toBeVisible();
    const r = (await accountsOf('ming')).find((x) => x.name === 'TNG eWallet')!;
    expect(r.archived_at).toBeNull();
  });
  await step(page, 'FLOW-6', 6, 'archived-gone', 'Archive again, let the toast go', 'is there any way back on Accounts?', async () => {
    await page.getByRole('button', { name: /TNG eWallet/ }).click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Archive this account' }).click();
    await expect(page).toHaveURL(/\/s\/accounts/);
    await page.waitForTimeout(7000);
    await page.reload();
    await expect(page.getByRole('main')).toContainText('In 3 accounts');
    // a way back: an Archived section, Bring back, or Add
    await expect(page.getByRole('main').getByText(/Archived|Bring back|Add an account/)).toBeVisible({ timeout: 2000 });
  });
});

test('FLOW-6b bring TNG back by SQL so the rest has four', async () => {
  await sql("update accounts set archived_at = null where user_id = $1 and name = 'TNG eWallet'", [uid('ming')]);
});

test('FLOW-7 Settings → Categories: rename, add, flags, archive; Unaccounted locked', async ({ page }) => {
  await signIn(page, 'ming');
  await step(page, 'FLOW-7', 1, 'list', 'Open Settings → Categories', 'the 18 spending and 3 income categories', async () => {
    await page.goto(`${SERVER}/s/settings/categories`);
    const spend = page.getByRole('region', { name: 'Spending categories' });
    await expect(spend.getByRole('button')).toHaveCount(18);
    await expect(page.getByRole('region', { name: 'Income categories' }).getByRole('button')).toHaveCount(3);
  });
  await step(page, 'FLOW-7', 2, 'renamed', 'Groceries → Groceries & market', 'the row is renamed', async () => {
    await page.getByRole('button', { name: /^Groceries,/ }).click();
    await page.getByLabel('Name').fill('Groceries & market');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect.poll(async () => (await sql<{ n: string }>("select count(*) n from categories where user_id=$1 and name='Groceries & market'", [uid('ming')]))[0]!.n).toBe('1');
    await page.keyboard.press('Escape');
  });
  await step(page, 'FLOW-7', 3, 'added', 'Add a category: Pets', 'Pets is in the spending grid', async () => {
    await page.getByRole('button', { name: 'Add a category' }).click();
    await page.getByLabel('Name').fill('Pets');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Spending categories' }).getByRole('button', { name: /^Pets,/ })).toBeVisible();
  });
  await step(page, 'FLOW-7', 4, 'flag', 'Pets → Discretionary on', 'is_discretionary true', async () => {
    await page.getByRole('button', { name: /^Pets,/ }).click();
    await page.getByRole('switch', { name: 'Discretionary' }).click();
    await expect.poll(async () => (await sql<{ d: boolean }>("select is_discretionary d from categories where user_id=$1 and name='Pets'", [uid('ming')]))[0]!.d).toBe(true);
  });
  await step(page, 'FLOW-7', 5, 'archived', 'Archive Pets', 'Pets under Archived, with Bring back', async () => {
    await page.getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByRole('button', { name: 'Bring back Pets' })).toBeVisible();
  });
  await step(page, 'FLOW-7', 6, 'unaccounted', 'Open Unaccounted', 'no flags, no Archive', async () => {
    await page.getByRole('button', { name: /^Unaccounted,/ }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Only balance checks book to it')).toBeVisible();
    await expect(sheet.getByRole('switch')).toHaveCount(0);
    await expect(sheet.getByRole('button', { name: 'Archive' })).toHaveCount(0);
  });
  await step(page, 'FLOW-7', 7, 'cash', 'Open Cash', 'flags, no Archive', async () => {
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Cash,/ }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('button', { name: 'Archive' })).toHaveCount(0);
    await expect(sheet.getByText('can be renamed but not archived')).toBeVisible();
  });
});

test('FLOW-8 Settings → You: a second name and payday 25, kept after reload', async ({ page }) => {
  await signIn(page, 'ming');
  await step(page, 'FLOW-8', 1, 'you', 'Open Settings → You', 'shows TAN WEI MING', async () => {
    await page.goto(`${SERVER}/s/settings/you`);
    await expect(page.getByLabel('Your names as banks print them')).toHaveValue('TAN WEI MING');
  });
  await step(page, 'FLOW-8', 2, 'saved', 'Add TAN W M; payday day 25', 'stored', async () => {
    const f = page.getByLabel('Your names as banks print them');
    await f.fill('TAN WEI MING\nTAN W M');
    await f.blur();
    await page.getByRole('radio', { name: /day/i }).first().click().catch(() => undefined);
    const day = page.getByLabel(/Day/);
    if (await day.count()) {
      await day.first().fill('25');
      await day.first().blur();
    }
    await expect.poll(async () => (await sql<{ n: string[]; p: string }>('select own_names n, expected_payday p from user_settings where user_id=$1', [uid('ming')]))[0]).toEqual({ n: ['TAN WEI MING', 'TAN W M'], p: '25' });
  });
  await step(page, 'FLOW-8', 3, 'reloaded', 'Reload', 'both kept', async () => {
    await page.reload();
    await expect(page.getByLabel('Your names as banks print them')).toHaveValue('TAN WEI MING\nTAN W M');
  });
});

// ── FLOW-2, FLOW-3: closed partway; a balance left empty ────────────────────────────────────────────
test('FLOW-2 closed at step 4 and at step 5 reopens where it was, with what was typed', async ({ page }) => {
  await signIn(page, 'reload');
  await page.goto(`${SERVER}/s/first-run`);
  await toStep(page, 4);
  await step(page, 'FLOW-2', 1, 'reload-4', 'Reload at step 4', 'Step 4 of 7 again', async () => {
    await page.reload();
    await atStep(page, 4);
  });
  await step(page, 'FLOW-2', 2, 'reload-5', 'Step 5, type Ryt 500.00, reload', 'Step 5, Ryt still 500.00', async () => {
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await atStep(page, 5);
    await page.getByLabel('Ryt Bank', { exact: true }).fill('500.00');
    await page.waitForTimeout(300);
    await page.reload();
    await atStep(page, 5);
    await expect(page.getByLabel('Ryt Bank', { exact: true })).toHaveValue(/500\.00/);
  });
  await step(page, 'FLOW-3', 1, 'empty', 'Leave TNG empty, Next', 'stays on 5, says what is missing, nothing saved', async () => {
    await fillBalances(page, 'TNG eWallet');
    await page.getByLabel('TNG eWallet', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Next' }).click();
    await atStep(page, 5);
    await expect(page.getByText('Type today’s balance, or 0.')).toBeVisible();
    expect((await accountsOf('reload')).length).toBe(0);
  });
  await step(page, 'FLOW-3', 2, 'zero', 'TNG 0, Next', 'step 6; TNG opening 0', async () => {
    await page.getByLabel('TNG eWallet', { exact: true }).fill('0');
    await page.getByRole('button', { name: 'Next' }).click();
    await atStep(page, 6);
    const r = await accountsOf('reload');
    expect(r.length).toBe(4);
    expect(r.find((x) => x.name === 'TNG eWallet')!.opening_balance).toBe('0');
  });
  await step(page, 'FLOW-2', 3, 'back-5', 'Back to step 5', 'the saved balances show', async () => {
    await page.getByRole('button', { name: 'Back' }).click();
    await atStep(page, 5);
    await expect(page.getByLabel('Ryt Bank', { exact: true })).toHaveValue(/500\.00/);
  });
});

// ── FLOW-12: offline at the accounts step ──────────────────────────────────────────────────────────
test('FLOW-12 offline at step 5: what Next says, and what is kept', async ({ page, context }) => {
  await signIn(page, 'offline');
  await page.goto(`${SERVER}/s/first-run`);
  await toStep(page, 5);
  await fillBalances(page);
  await step(page, 'FLOW-12', 1, 'offline-next', 'Go offline, tap Next', 'still step 5, a plain-words error, balances kept', async () => {
    await context.setOffline(true);
    await page.waitForTimeout(500);
    console.log('FLOW-12 banner:', await page.getByRole('main').innerText().then((t) => t.slice(0, 200)));
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(2000);
    console.log('FLOW-12 toast:', JSON.stringify(await page.locator('[data-sonner-toast]').allInnerTexts()));
    await atStep(page, 5);
    await expect(page.getByLabel('Ryt Bank', { exact: true })).toHaveValue(/500\.00/);
  });
  await step(page, 'FLOW-12', 2, 'online-next', 'Back online, Next', 'step 6, four accounts', async () => {
    await context.setOffline(false);
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Next' }).click();
    await atStep(page, 6);
    expect((await accountsOf('offline')).length).toBe(4);
  });
  await step(page, 'FLOW-13', 1, 'unchosen', 'Back to step 2, switch Grab off, forward to step 5', 'three fields; is Grab’s account still live?', async () => {
    for (const n of [5, 4, 3, 2]) {
      await page.getByRole('button', { name: 'Back' }).click();
      await atStep(page, n);
    }
    const grab = page.getByRole('switch', { name: /Grab/ }).first();
    if (await grab.isChecked()) await grab.click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Next' }).click();
    await atStep(page, 3);
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await atStep(page, 4);
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await atStep(page, 5);
    await expect(page.getByLabel('GrabPay Wallet', { exact: true })).toHaveCount(0);
    const live = (await accountsOf('offline')).filter((r) => !r.archived_at).map((r) => r.name);
    console.log('FLOW-13 live accounts after un-choosing Grab:', JSON.stringify(live));
  });
});

// ── FLOW-R: a dropped answer while saving the accounts (the dedupe rule) ────────────────────────────
test('FLOW-R a lost answer mid-save: Next again saves the rest, no error, one account per app', async ({ page }) => {
  await signIn(page, 'retry');
  await page.goto(`${SERVER}/s/first-run`);
  await toStep(page, 5);
  await fillBalances(page);
  let adds = 0;
  const lose = async (route: Route) => {
    const body = route.request().postData() ?? '';
    if (body.includes('"account.add"')) {
      adds++;
      if (adds === 2) {
        // the server saves it; the phone never hears back (a dropped connection)
        await route.fetch();
        return route.abort('connectionreset');
      }
    }
    return route.continue();
  };
  await page.route('**/api/commands', lose);
  await step(page, 'FLOW-R', 1, 'lost', 'Next; the 2nd account.add is saved but its answer lost', 'an error, still step 5', async () => {
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(1500);
    await atStep(page, 5);
    expect((await accountsOf('retry')).length).toBe(2);
  });
  await page.unroute('**/api/commands', lose);
  const said: string[] = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/commands') && r.status() >= 400) said.push(`${r.status()} ${await r.text()}`);
  });
  await step(page, 'FLOW-R', 2, 'retried', 'Next again', 'step 6; four accounts; no 409', async () => {
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(1500);
    console.log('FLOW-R retry responses:', JSON.stringify(said));
    console.log('FLOW-R toast:', await page.locator('[data-sonner-toast]').allInnerTexts());
    console.log('FLOW-R accounts:', JSON.stringify((await accountsOf('retry')).map((r) => r.name)));
    await atStep(page, 6);
    expect((await accountsOf('retry')).length).toBe(4);
  });
});

// ── FLOW-9: signed out mid-first-run; someone else signs in ────────────────────────────────────────
test('FLOW-9 the next person sees none of the last one’s typed balances', async ({ page }) => {
  await signIn(page, 'tz');
  await page.goto(`${SERVER}/s/first-run`);
  await toStep(page, 5);
  await page.getByLabel('Ryt Bank', { exact: true }).fill('777.77');
  await page.waitForTimeout(300);
  await step(page, 'FLOW-9', 1, 'signed-out', 'Settings → Account → Sign out', 'signed out', async () => {
    await page.goto(`${SERVER}/s/settings/account`);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    const confirm = page.getByRole('alertdialog').getByRole('button', { name: /Sign out/ });
    if (await confirm.count()) await confirm.click();
    await expect(page).toHaveURL(/sign-in/, { timeout: 10_000 });
    expect(await page.evaluate(() => localStorage.getItem('sen.firstRun'))).toBeNull();
  });
  await step(page, 'FLOW-9', 2, 'other', 'Another person signs in, opens first run', 'step 2, nothing of 777.77', async () => {
    await signIn(page, 'other');
    await page.goto(`${SERVER}/s/first-run`);
    await atStep(page, 2);
    expect(await page.evaluate(() => localStorage.getItem('sen.firstRun') ?? '')).not.toContain('777');
    await toStep(page, 5);
    await expect(page.getByLabel('Ryt Bank', { exact: true })).not.toHaveValue(/777/);
  });
});

// ── FLOW-10: without capture ────────────────────────────────────────────────────────────────────────
test('FLOW-10 without capture: the short first run, no accounts', async ({ page }) => {
  await step(page, 'FLOW-10', 1, 'sent', 'Sign in without capture', 'sent to first run: Step 2 of 2, Your categories', async () => {
    await signIn(page, 'nocap2');
    await expect(page).toHaveURL(/\/s\/first-run/);
    await atStep(page, 2, 2);
    await expect(page.getByRole('heading', { name: 'Your categories' })).toBeVisible();
  });
  await step(page, 'FLOW-10', 2, 'list', 'Look at the list', '17 spending categories, no Unaccounted', async () => {
    await expect(page.getByRole('switch')).toHaveCount(17);
    await expect(page.getByRole('switch', { name: 'Unaccounted' })).toHaveCount(0);
  });
  await step(page, 'FLOW-10', 3, 'done', 'Switch off Travel, Start using Sen', 'Home; Travel archived; setup done', async () => {
    await page.getByRole('switch', { name: 'Travel' }).click();
    await page.getByRole('button', { name: 'Start using Sen' }).click();
    await expect(page).toHaveURL(/4179\/(\?.*)?$/, { timeout: 10_000 });
    const t = await sql<{ a: Date | null }>("select archived_at a from categories where user_id=$1 and name='Travel'", [uid('nocap2')]);
    expect(t[0]!.a).not.toBeNull();
  });
  await step(page, 'FLOW-10', 4, 'no-accounts', 'More; /api/accounts', 'no Accounts row; 403 capture_off', async () => {
    const asked: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/api/accounts')) asked.push(`${r.status()} ${r.url().split('/api')[1]}`);
    });
    await page.goto(`${SERVER}/s/more`);
    await page.waitForTimeout(1500);
    console.log('FLOW-10 More asked:', JSON.stringify(asked));
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Accounts/ })).toHaveCount(0);
    const r = await page.request.get(`${SERVER}/api/accounts`);
    expect(r.status()).toBe(403);
    expect((await r.json()).code).toBe('capture_off');
  });
});

test('FLOW-10s without capture: switching off Cash in the short first run', async ({ page }) => {
  const said: string[] = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/commands') && r.status() >= 400) said.push(`${r.status()} ${await r.text()}`);
  });
  await signIn(page, 'nocap');
  await atStep(page, 2, 2);
  await step(page, 'FLOW-10s', 1, 'cash-offered', 'Look for Cash', 'is Cash offered as a switch?', async () => {
    console.log('Cash switch count:', await page.getByRole('switch', { name: 'Cash' }).count());
    console.log('Cash switch disabled:', await page.getByRole('switch', { name: 'Cash' }).isDisabled().catch(() => 'n/a'));
  });
  await step(page, 'FLOW-10s', 2, 'cash-off', 'Switch off Cash and Groceries, Start using Sen', 'Home, Groceries archived', async () => {
    const cash = page.getByRole('switch', { name: 'Cash' });
    if (await cash.isEnabled()) await cash.click();
    await page.getByRole('switch', { name: 'Groceries' }).click();
    await page.getByRole('button', { name: 'Start using Sen' }).click();
    await page.waitForTimeout(2000);
    console.log('FLOW-10s responses:', JSON.stringify(said));
    console.log('FLOW-10s toast:', await page.locator('[data-sonner-toast]').allInnerTexts());
    console.log('FLOW-10s url:', page.url());
    await expect(page).toHaveURL(/4179\/(\?.*)?$/);
  });
});

// ── the core journeys (D124), in the preview's fake ─────────────────────────────────────────────────
const promptCard = (page: Page) =>
  page
    .locator('*')
    .filter({ has: page.getByText(/^Stand-in/) })
    .filter({ has: page.getByRole('button', { name: 'Meals', exact: true }) })
    .last();
async function openFake(page: Page, path: string) {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${FAKE}${path}${sep}look=minted&mode=light`);
  await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
  await page.waitForTimeout(400);
}

test('CORE-first-run on the fake: scenario=new, start to finish', async ({ page }) => {
  await openFake(page, '/s/first-run?scenario=new');
  await step(page, 'CORE-first-run', 1, 'email', 'Type the email, send the code, sign in', 'Step 2 of 7', async () => {
    await page.getByLabel('Your email').fill('wei.ming@example.com');
    await page.getByRole('button', { name: 'Send the code' }).click();
    await page.getByLabel('6-digit code').fill('123456');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await atStep(page, 2);
  });
  await step(page, 'CORE-first-run', 2, 'accounts', 'Apps, access, running', 'Step 5: four balance fields', async () => {
    await toStep(page, 5);
    for (const name of Object.keys(BAL)) await expect(page.getByLabel(name, { exact: true })).toBeVisible();
  });
  await step(page, 'CORE-first-run', 3, 'name', 'Type the balances, Next', 'Step 6', async () => {
    await fillBalances(page);
    await page.getByRole('button', { name: 'Next' }).click();
    await atStep(page, 6);
  });
  await step(page, 'CORE-first-run', 4, 'payday', 'Name, Next', 'Step 7', async () => {
    await page.getByLabel('Your name').fill('tan wei ming');
    await page.getByRole('button', { name: 'Next' }).click();
    await atStep(page, 7);
  });
  await step(page, 'CORE-first-run', 5, 'home', 'Finish', 'Home: Spent since you started', async () => {
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByTestId('hero')).toBeVisible();
    await expect(page.getByRole('main')).toContainText('Spent since you started');
  });
  await step(page, 'CORE-first-run', 6, 'accounts-total', 'More → Accounts', 'total RM1,808.40', async () => {
    await page.getByRole('link', { name: 'More' }).click();
    await page.getByRole('link', { name: /^Accounts/ }).click();
    await expect(page.getByRole('main')).toContainText('RM1,808.40');
  });
});

test('CORE-pay-new: the prompt files a new merchant', async ({ page }) => {
  await openFake(page, '/review');
  await step(page, 'CORE-pay-new', 1, 'prompt', 'Dev panel → A notification arrives', 'the prompt names RM9.50 · ROTI BAKAR 88', async () => {
    await page.getByRole('button', { name: 'Dev panel' }).click();
    await page.getByRole('button', { name: 'A notification arrives' }).click();
    const prompt = promptCard(page);
    await expect(prompt).toContainText('ROTI BAKAR 88');
    await expect(prompt).toContainText('RM9.50');
  });
  await step(page, 'CORE-pay-new', 2, 'filed', 'Tap Meals', 'the payment is filed, the prompt goes', async () => {
    const prompt = promptCard(page);
    await prompt.getByRole('button', { name: 'Meals', exact: true }).click();
    await expect(prompt).toHaveCount(0, { timeout: 4000 });
    await expect(page.locator('[data-sonner-toast]')).toContainText(/ROTI BAKAR 88/i);
  });
});

test('CORE-scan-after: scan, confirm, three people, attached', async ({ page }) => {
  await openFake(page, '/');
  const tabs = page.getByRole('navigation', { name: 'Tabs' });
  await step(page, 'CORE-scan-after', 1, 'crop', 'Scan, choose a photo', 'Use this', async () => {
    const [camera] = await Promise.all([
      page.waitForEvent('filechooser'),
      tabs.getByRole('button', { name: 'Scan a receipt' }).click(),
    ]);
    await camera.setFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
    await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible();
  });
  await step(page, 'CORE-scan-after', 2, 'confirm', 'Use this', 'confirm shows SATE KAJANG HJ SAMURI', async () => {
    await page.getByRole('button', { name: 'Use this' }).click();
    await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
    await expect(page.getByText('SATE KAJANG HJ SAMURI')).toBeVisible();
  });
  await step(page, 'CORE-scan-after', 3, 'three', 'More people twice', 'RM21.38 a person', async () => {
    await page.getByRole('button', { name: 'More people' }).click();
    await page.getByRole('button', { name: 'More people' }).click();
    await expect(page.getByRole('region', { name: 'How many people ate?' })).toContainText('RM21.38');
  });
  await step(page, 'CORE-scan-after', 4, 'attached', 'Done', 'Attached to RM64.13 on Ryt Bank', async () => {
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.locator('[data-sonner-toast]')).toContainText('Attached to RM64.13 on Ryt Bank');
  });
});

// ── FLOW-11: away from KL ───────────────────────────────────────────────────────────────────────────
test.describe('away from KL', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });
  test('FLOW-11 the opening date reads in KL whatever the phone’s zone', async ({ page }) => {
    await openFake(page, '/s/accounts');
    await step(page, 'FLOW-11', 1, 'la-accounts', 'Accounts in Los Angeles time', 'the same total as in KL', async () => {
      const text = await page.getByRole('main').innerText();
      fs.writeFileSync(`${ROOT}/tz-la.txt`, text);
      await expect(page.getByRole('main')).toContainText('RM');
    });
  });
});
test('FLOW-11 KL twin', async ({ page }) => {
  await openFake(page, '/s/accounts');
  await step(page, 'FLOW-11', 2, 'kl-accounts', 'Accounts in KL time', 'identical text to Los Angeles', async () => {
    const text = await page.getByRole('main').innerText();
    const la = fs.readFileSync(`${ROOT}/tz-la.txt`, 'utf8');
    expect(text).toBe(la);
  });
});
