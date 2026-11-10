import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

// QA B08 run 3: the run-3 flows of qa/B08/flows.md, at 390×844, against the API on QA's own database
// (sen_qa). Each step asserts, then screenshots into qa-artifacts/<branch>/screens. See b08r3.config.ts.

const SHOTS = new URL("../../qa-artifacts/B08_first-run-accounts/screens", import.meta.url).pathname;
const DB = process.env.QA_DB ?? 'sen_qa';
const sql = (q: string) =>
  execFileSync('psql', ['-X', '-At', '-v', 'ON_ERROR_STOP=1', `postgres://sen_owner@127.0.0.1:5432/${DB}`, '-c', q], {
    encoding: 'utf8',
  }).trim();

const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });

/** A fresh invited person, with the switches given; returns their email and id. */
function person(features: Record<string, boolean>) {
  const id = randomUUID();
  const email = `qa.r3.${id.slice(0, 8)}@example.com`;
  sql(
    `insert into auth_user(id,name,email) values ('${id}','QA','${email}'); ` +
      `insert into user_access(user_id,features) values ('${id}','${JSON.stringify(features)}')`,
  );
  return { id, email };
}

async function signIn(page: Page, email: string) {
  sql('truncate auth_rate_limit');
  await page.goto('/s/sign-in');
  await page.getByLabel('Your email').fill(email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 15_000 });
}

const atStep = async (page: Page, n: number, of = 7) => {
  await expect(page.getByText(`Step ${n} of ${of}`)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(350);
};

test('R3-FLOW-1/2/3/4/5: first run end to end, closed mid-way, bad balances, never again, Accounts', async ({
  page,
}) => {
  const p = person({ shell: true, capture: true });
  await signIn(page, p.email);
  // a plain browser with capture isn't held (D146 (2)); first run is reached by its link, as the shell's would be
  await page.goto('/s/first-run');
  await atStep(page, 2);
  await shot(page, 'R3-FLOW-1-step-1-apps');
  await page.getByRole('button', { name: /^Choose these \d+$/ }).click();
  await expect(page.getByRole('switch', { name: /Ryt Bank/ })).toBeChecked();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 3);
  await shot(page, 'R3-FLOW-1-step-2-access');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 4);
  // R3-FLOW-2: closed at step 4 reopens at step 4
  await page.reload();
  await atStep(page, 4);
  await shot(page, 'R3-FLOW-2-step-1-reopened-at-4');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 5);
  // the categories were seeded once by setup.start
  expect(sql(`select count(*) from categories where user_id='${p.id}'`)).toBe('21');

  // R3-FLOW-3: an empty balance is refused in words; nothing is saved
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Type today’s balance, or 0.').first()).toBeVisible();
  expect(sql(`select count(*) from accounts where user_id='${p.id}'`)).toBe('0');
  await shot(page, 'R3-FLOW-3-step-1-empty-refused');
  // letters and a minus never land in a money field (digits enter from the right, D132)
  const ryt = page.getByLabel('Ryt Bank', { exact: true });
  await ryt.click();
  await page.keyboard.type('-12a.3x45');
  await expect(ryt).toHaveValue('123.45');
  await shot(page, 'R3-FLOW-3-step-2-letters-ignored');

  // R3-FLOW-1 step 4: balances, one 1,234.50 and one 0
  await ryt.fill('1,234.50');
  const grab = page.getByLabel('GrabPay Wallet', { exact: true });
  await grab.click();
  await page.keyboard.type('0');
  await expect(grab).toHaveValue('0.00');
  await page.getByLabel('TNG eWallet', { exact: true }).fill('85.00');
  await page.getByLabel('Public Bank', { exact: true }).fill('6,400.00');
  // R3-FLOW-2: closed mid-typing keeps what was typed
  await page.reload();
  await atStep(page, 5);
  await expect(page.getByLabel('Ryt Bank', { exact: true })).toHaveValue('1,234.50');
  await expect(page.getByLabel('GrabPay Wallet', { exact: true })).toHaveValue('0.00');
  await shot(page, 'R3-FLOW-2-step-2-typing-kept');
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 6);
  expect(
    sql(
      `select string_agg(notifier_package||'='||opening_balance, ',' order by notifier_package) from accounts where user_id='${p.id}' and archived_at is null`,
    ),
  ).toBe('com.grabtaxi.passenger=0,com.pbb.mypb=640000,my.com.tngdigital.ewallet=8500,my.rytbank.app=123450');
  await shot(page, 'R3-FLOW-1-step-4-accounts-saved');

  // step 5: the name, printed as banks print it
  await page.getByLabel('Your name').fill('  tan   wei ming ');
  await expect(page.getByText('Sen will look for TAN WEI MING.')).toBeVisible();
  await shot(page, 'R3-FLOW-1-step-5-name');
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 7);
  // step 6: payday, a day number refused out of range, then the default
  await page.getByRole('radio', { name: 'A day number' }).click();
  await page.getByLabel('Day of the month').fill('32');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText('Type a day from 1 to 31.')).toBeVisible();
  await shot(page, 'R3-FLOW-1-step-6-payday-32-refused');
  await page.getByRole('radio', { name: 'Last working day' }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).not.toHaveURL(/first-run/, { timeout: 10_000 });
  await expect(page.getByTestId('hero')).toBeVisible();
  await shot(page, 'R3-FLOW-1-step-7-home');
  await expect
    .poll(() => sql(`select own_names::text||'|'||coalesce(expected_payday::text,'null')||'|'||(setup_done_at is not null) from user_settings where user_id='${p.id}'`), { timeout: 10_000 })
    .toMatch(/^\{"TAN WEI MING"\}\|.*last-working.*\|true$/);

  // R3-FLOW-4: finished, the steps never come back
  await page.goto('/s/first-run');
  await expect(page).not.toHaveURL(/first-run/, { timeout: 10_000 });
  await expect(page.getByText(/Step \d of/)).toHaveCount(0);
  await shot(page, 'R3-FLOW-4-step-1-first-run-link-goes-home');

  // R3-FLOW-5: Accounts and one account
  await page.goto('/s/accounts');
  await expect(page.getByText('In 4 accounts')).toBeVisible();
  await expect(page.getByText('RM7,719.50').first()).toBeVisible();
  await expect(page.getByText('Main account and pockets together')).toBeVisible();
  await expect(page.getByText('eWallet and GO+ together')).toBeVisible();
  await shot(page, 'R3-FLOW-5-step-1-accounts');
  await page.getByRole('button', { name: /Ryt Bank/ }).click();
  await expect(page.getByText('RM1,234.50').first()).toBeVisible();
  await shot(page, 'R3-FLOW-5-step-2-account');
});

test('R3-FLOW-5b: one account reads “In 1 account”', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  sql(
    `insert into accounts(id,user_id,name,kind,notifier_package,notifier_label,opening_balance) values ('${randomUUID()}','${p.id}','Ryt Bank','tracked','my.rytbank.app','Ryt Bank',5000); ` +
      `insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`,
  );
  await signIn(page, p.email);
  await page.goto('/s/accounts');
  await expect(page.getByText('RM50.00').first()).toBeVisible();
  await shot(page, 'R3-FLOW-5b-step-1-one-account');
  await expect(page.getByText('In 1 account', { exact: true })).toBeVisible();
});

test('R3-FLOW-6: Settings → Categories: rename, add, a taken name, archive, Sen’s own', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  sql(`insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`);
  await signIn(page, p.email);
  await page.request.post('/api/commands', { data: { type: 'setup.start' } });
  await page.goto('/s/settings/categories');
  await expect(page.getByRole('button', { name: /^Groceries,/ })).toBeVisible();
  await shot(page, 'R3-FLOW-6-step-1-list');
  // rename Groceries → Market
  await page.getByRole('button', { name: /^Groceries,/ }).click();
  await page.getByLabel('Name').fill('Market');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => sql(`select count(*) from categories where user_id='${p.id}' and name='Market'`)).toBe('1');
  await shot(page, 'R3-FLOW-6-step-2-renamed');
  await page.keyboard.press('Escape');
  // a taken name: where does the refusal show?
  await page.getByRole('button', { name: /^Market,/ }).click();
  await page.getByLabel('Name').fill('meals');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('You already have a category with that name.')).toBeVisible();
  await shot(page, 'R3-FLOW-6-step-3-taken-name');
  const inField = await page.locator('[data-slot="field-error"]', { hasText: 'already have' }).count();
  test.info().annotations.push({ type: 'taken-name-in-field', description: String(inField) });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  // add Pets, flag it, archive it
  await page.getByRole('button', { name: 'Add a category' }).click();
  await page.getByLabel('Name').fill('Pets');
  await page.getByRole('button', { name: /^Add/ }).last().click();
  await expect.poll(() => sql(`select count(*) from categories where user_id='${p.id}' and name='Pets' and archived_at is null`)).toBe('1');
  await shot(page, 'R3-FLOW-6-step-4-added');
  await page.getByRole('button', { name: /^Pets,/ }).click();
  await page.getByRole('switch', { name: /Discretionary/ }).click();
  await expect.poll(() => sql(`select is_discretionary from categories where user_id='${p.id}' and name='Pets'`)).toBe('t');
  await page.getByRole('button', { name: 'Archive' }).click();
  await expect.poll(() => sql(`select archived_at is not null from categories where user_id='${p.id}' and name='Pets'`)).toBe('t');
  await expect(page.getByRole('button', { name: 'Bring back Pets' })).toBeVisible();
  await shot(page, 'R3-FLOW-6-step-5-archived');
  // Cash: no Archive, says why
  await page.getByRole('button', { name: /^Cash,/ }).click();
  await expect(page.getByText('Sen relies on this one, so it can be renamed but not archived.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Archive' })).toHaveCount(0);
  await shot(page, 'R3-FLOW-6-step-6-cash-kept');
  await page.reload();
  await expect(page.getByRole('button', { name: /^Market,/ })).toBeVisible();
});

test('R3-FLOW-7: Settings → You: a second name and payday 25 persist', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  sql(`insert into user_settings(user_id,setup_done_at,own_names) values ('${p.id}',now(),'{"TAN WEI MING"}')`);
  await signIn(page, p.email);
  await page.goto('/s/settings/you');
  const names = page.getByLabel('Your names as banks print them');
  await expect(names).toHaveValue('TAN WEI MING');
  await names.fill('TAN WEI MING\nWEI MING TAN');
  await names.blur();
  await page.getByRole('radio', { name: 'A day' }).click();
  await page.getByLabel('Day of the month').fill('25');
  await page.getByLabel('Day of the month').press('Enter');
  await expect
    .poll(() => sql(`select own_names::text||'|'||expected_payday::text from user_settings where user_id='${p.id}'`), { timeout: 10_000 })
    .toMatch(/^\{"TAN WEI MING","WEI MING TAN"\}\|.*25/);
  await page.reload();
  await expect(page.getByLabel('Day of the month')).toHaveValue('25');
  await shot(page, 'R3-FLOW-7-step-1-you-saved');
});

test('R3-FLOW-8: without capture, the short first run: Cash locked, a switch off archives', async ({ page }) => {
  const p = person({});
  await signIn(page, p.email);
  await expect(page).toHaveURL(/\/s\/first-run/);
  await atStep(page, 2, 2);
  await expect(page.getByRole('switch', { name: 'Cash' })).toBeDisabled();
  await expect(page.getByRole('switch', { name: 'Unaccounted' })).toHaveCount(0);
  await expect(page.getByText(/payday/i).first()).toBeVisible();
  await shot(page, 'R3-FLOW-8-step-1-categories');
  await page.getByRole('switch', { name: 'Travel' }).click();
  await page.getByRole('button', { name: 'Start using Sen' }).click();
  await expect(page).not.toHaveURL(/first-run/, { timeout: 10_000 });
  await shot(page, 'R3-FLOW-8-step-2-home');
  expect(sql(`select archived_at is not null from categories where user_id='${p.id}' and name='Travel'`)).toBe('t');
  expect(sql(`select count(*) from categories where user_id='${p.id}' and archived_at is null`)).toBe('20');
  expect(sql(`select coalesce(expected_payday::text,'null') from user_settings where user_id='${p.id}'`)).toBe('null');
});

test('R3-TZ: Accounts’ dates in another timezone stay KL’s', async ({ browser }) => {
  const p = person({ shell: true, capture: true });
  // opened 00:30 on 10 Nov in KL, which is 08:30 on 9 Nov in Los Angeles
  sql(
    `insert into accounts(id,user_id,name,kind,notifier_package,notifier_label,opening_balance,opening_at) values ('${randomUUID()}','${p.id}','Ryt Bank','tracked','my.rytbank.app','Ryt Bank',5000,'2026-11-09 16:30:00+00'); ` +
      `insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`,
  );
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    baseURL: 'http://127.0.0.1:5191',
    timezoneId: 'America/Los_Angeles',
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  await signIn(page, p.email);
  await page.goto('/s/accounts');
  await page.getByRole('button', { name: /Ryt Bank/ }).click();
  await expect(page.getByText(/10 Nov/).first()).toBeVisible();
  await expect(page.getByText(/9 Nov/)).toHaveCount(0);
  await shot(page, 'R3-TZ-step-1-account-in-la');
  await ctx.close();
});

test('R3-FLOW-9: an app chosen after first run: is there a way to give it an account?', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  sql(
    `insert into accounts(id,user_id,name,kind,notifier_package,notifier_label,opening_balance) values ('${randomUUID()}','${p.id}','Ryt Bank','tracked','my.rytbank.app','Ryt Bank',5000); ` +
      `insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`,
  );
  await signIn(page, p.email);
  // Settings → Capture → apps: choose the suggested ones (TNG, Public Bank and Grab join Ryt)
  await page.goto('/s/settings/capture/apps');
  await page.getByRole('button', { name: /^Choose these \d+$/ }).click();
  await expect(page.getByRole('switch', { name: /Touch 'n Go eWallet/ })).toBeChecked();
  await shot(page, 'R3-FLOW-9-step-1-apps-chosen-later');
  await page.goto('/s/accounts');
  await expect(page.getByText('In 1 accounts')).toBeVisible();
  await expect(page.getByRole('button', { name: /add/i })).toHaveCount(0);
  await shot(page, 'R3-FLOW-9-step-2-accounts-no-add');
  expect(sql(`select count(*) from accounts where user_id='${p.id}'`)).toBe('1');
});

test('R3-AC-25.s: without capture, Settings → You shows no names, and payday is optional', async ({ page }) => {
  const p = person({});
  sql(`insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`);
  await signIn(page, p.email);
  await page.goto('/s/settings/you');
  await expect(page.getByText('Without capture, a payday is optional.')).toBeVisible();
  await expect(page.getByLabel('Your names as banks print them')).toHaveCount(0);
  await shot(page, 'R3-AC-25s-step-1-you-without-capture');
});
