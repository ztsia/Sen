import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

// QA B08 run 4: the run-4 flows of qa/B08/flows.md, at 390×844, against the API on QA's own database
// (sen_qa4); the core journeys on the made-up backend (:5192). Each step asserts, then screenshots into
// qa-artifacts/<branch>/screens. See b08r4.config.ts.

const SHOTS = new URL('../../qa-artifacts/B08_first-run-accounts/screens', import.meta.url).pathname;
const DB = process.env.QA_DB ?? 'sen_qa4';
const FAKE = 'http://127.0.0.1:5192';
const sql = (q: string) =>
  execFileSync('psql', ['-X', '-At', '-v', 'ON_ERROR_STOP=1', `postgres://sen_owner@127.0.0.1:5432/${DB}`, '-c', q], {
    encoding: 'utf8',
  }).trim();

const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });
const toast = (page: Page) => page.locator('[data-sonner-toast]').first();

/** A fresh invited person, with the switches given. */
function person(features: Record<string, boolean>) {
  const id = randomUUID();
  const email = `qa.r4.${id.slice(0, 8)}@example.com`;
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

const accountsOf = (id: string) =>
  sql(
    `select coalesce(string_agg(notifier_package||'='||opening_balance, ',' order by notifier_package),'') from accounts where user_id='${id}' and archived_at is null`,
  );

test('R4-FLOW-1/2/3/5/7: first run end to end, reopened, a lost save, never again, Accounts', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  await signIn(page, p.email);
  // a plain browser with capture isn't held (D146 (2)); first run is reached by its link, as in the shell
  await page.goto('/s/first-run');
  await atStep(page, 2);
  await page.getByRole('button', { name: /^Choose these \d+$/ }).click();
  await expect(page.getByRole('switch', { name: /Ryt Bank/ })).toBeChecked();
  // Grab is left for later (R4-FLOW-8)
  await page.getByRole('switch', { name: /^Grab/ }).click();
  await expect(page.getByRole('switch', { name: /^Grab/ })).not.toBeChecked();
  await shot(page, 'R4-FLOW-1-step-1-apps');
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 3);
  await shot(page, 'R4-FLOW-1-step-2-access');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 4);
  await page.reload();
  await atStep(page, 4);
  await shot(page, 'R4-FLOW-2-step-1-reopened-at-4');
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 5);
  expect(sql(`select count(*) from categories where user_id='${p.id}'`)).toBe('21');

  // R4-FLOW-3: empty refused
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Type today’s balance, or 0.').first()).toBeVisible();
  expect(accountsOf(p.id)).toBe('');
  await shot(page, 'R4-FLOW-3-step-1-empty-refused');
  // bank-style typing (D132): 1,2,8,4,5,0 → 1,284.50; a typed 0 → 0.00
  const ryt = page.getByLabel('Ryt Bank', { exact: true });
  await ryt.click();
  await page.keyboard.type('128450');
  await expect(ryt).toHaveValue('1,284.50');
  const tng = page.getByLabel('TNG eWallet', { exact: true });
  await tng.click();
  await page.keyboard.type('0');
  await expect(tng).toHaveValue('0.00');
  await expect(page.getByText('eWallet and GO+ together')).toBeVisible();
  await expect(page.getByText(/Main account and pockets together/)).toBeVisible();
  await page.getByLabel('Public Bank', { exact: true }).fill('6,400.00');
  // no field for Grab (not chosen) or Google Wallet (a card wallet)
  await expect(page.getByLabel('GrabPay Wallet', { exact: true })).toHaveCount(0);
  await shot(page, 'R4-FLOW-1-step-3-balances-typed');
  await page.reload();
  await atStep(page, 5);
  await expect(page.getByLabel('Ryt Bank', { exact: true })).toHaveValue('1,284.50');
  await expect(page.getByLabel('TNG eWallet', { exact: true })).toHaveValue('0.00');
  await shot(page, 'R4-FLOW-2-step-2-typing-kept');

  // R4-FLOW-3: the save's answer is lost after the server took the first account
  let cut = 0;
  await page.route('**/api/commands', async (route) => {
    const body = route.request().postDataJSON() as { type?: string };
    if (body?.type === 'account.add' && cut === 1) {
      cut++;
      await route.fetch(); // the server takes it...
      return route.abort('connectionreset'); // ...and the answer never arrives
    }
    if (body?.type === 'account.add') cut++;
    return route.continue();
  });
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(toast(page)).toBeVisible({ timeout: 10_000 });
  const lost = (await toast(page).innerText()).replace(/\s+/g, ' ');
  test.info().annotations.push({ type: 'lost-save-toast', description: lost });
  await atStep(page, 5);
  await expect(page.getByLabel('Ryt Bank', { exact: true })).toHaveValue('1,284.50');
  await shot(page, 'R4-FLOW-3-step-2-lost-save');
  await page.unroute('**/api/commands');
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 6);
  expect(accountsOf(p.id)).toBe('com.pbb.mypb=640000,my.com.tngdigital.ewallet=0,my.rytbank.app=128450');
  expect(sql(`select count(*) from accounts where user_id='${p.id}'`)).toBe('3');
  await shot(page, 'R4-FLOW-3-step-3-saved-once');

  await page.getByLabel('Your name').fill('  tan   wei ming ');
  await expect(page.getByText('Sen will look for TAN WEI MING.')).toBeVisible();
  await shot(page, 'R4-FLOW-1-step-4-name');
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 7);
  await expect(page.getByRole('radio', { name: 'Last working day' })).toBeChecked();
  await shot(page, 'R4-FLOW-1-step-5-payday');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).not.toHaveURL(/first-run/, { timeout: 10_000 });
  await expect(page.getByTestId('hero')).toBeVisible();
  await shot(page, 'R4-FLOW-1-step-6-home');
  await expect
    .poll(
      () =>
        sql(
          `select own_names::text||'|'||coalesce(expected_payday::text,'null')||'|'||(setup_done_at is not null) from user_settings where user_id='${p.id}'`,
        ),
      { timeout: 10_000 },
    )
    .toMatch(/^\{"TAN WEI MING"\}\|last-working\|true$/);

  // R4-FLOW-5: never again
  await page.goto('/s/first-run');
  await expect(page).not.toHaveURL(/first-run/, { timeout: 10_000 });
  await page.reload();
  await expect(page.getByText(/Step \d of/)).toHaveCount(0);
  await shot(page, 'R4-FLOW-5-step-1-first-run-link-goes-home');

  // R4-FLOW-7: Accounts, and one account
  await page.goto('/s/accounts');
  await expect(page.getByText('In 3 accounts')).toBeVisible();
  await expect(page.getByText('RM7,684.50').first()).toBeVisible();
  await shot(page, 'R4-FLOW-7-step-1-accounts');
  await page.getByRole('button', { name: /TNG eWallet/ }).click();
  await expect(page.getByText('RM0.00').first()).toBeVisible();
  await expect(page.getByText(/Touch 'n Go eWallet/).first()).toBeVisible();
  await shot(page, 'R4-FLOW-7-step-2-account-tng');

  // R4-FLOW-8 (D148): Grab chosen now gets its account on Accounts
  await page.goto('/s/settings/capture/apps');
  await page.getByRole('switch', { name: /^Grab/ }).click();
  await expect(page.getByRole('switch', { name: /^Grab/ })).toBeChecked();
  await shot(page, 'R4-FLOW-8-step-1-grab-chosen');
  await page.goto('/s/accounts');
  await expect(page.getByText('Not added yet')).toBeVisible();
  await shot(page, 'R4-FLOW-8-step-2-not-added-yet');
  await page.getByRole('button', { name: 'Add GrabPay Wallet' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add GrabPay Wallet' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Add account' }).click();
  await expect(sheet.getByText('Type today’s balance, or 0.')).toBeVisible();
  expect(accountsOf(p.id)).not.toContain('grab');
  await shot(page, 'R4-FLOW-8-step-3-empty-refused');
  const bal = sheet.getByLabel('Today’s balance');
  await bal.click();
  await page.keyboard.type('0');
  await expect(bal).toHaveValue('0.00');
  await sheet.getByRole('button', { name: 'Add account' }).click();
  await expect(sheet).toHaveCount(0, { timeout: 10_000 });
  await expect.poll(() => accountsOf(p.id)).toContain('com.grabtaxi.passenger=0');
  await expect(page.getByText('Not added yet')).toHaveCount(0);
  await expect(page.getByText('In 4 accounts')).toBeVisible();
  await expect(page.getByText('RM7,684.50').first()).toBeVisible();
  await shot(page, 'R4-FLOW-8-step-4-added');
});

test('R4-AC-28.s: bringing an account back over a newer live one is refused in words', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  sql(
    `insert into accounts(id,user_id,name,kind,notifier_package,notifier_label,opening_balance,archived_at) values ('${randomUUID()}','${p.id}','Ryt Bank old','tracked','my.rytbank.app','Ryt Bank',100,now()); ` +
      `insert into accounts(id,user_id,name,kind,notifier_package,notifier_label,opening_balance) values ('${randomUUID()}','${p.id}','Ryt Bank','tracked','my.rytbank.app','Ryt Bank',5000); ` +
      `insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`,
  );
  await signIn(page, p.email);
  await page.goto('/s/accounts');
  await expect(page.getByRole('button', { name: 'Bring back Ryt Bank old' })).toBeVisible();
  await page.getByRole('button', { name: 'Bring back Ryt Bank old' }).click();
  await expect(toast(page)).toContainText('That app already has an account in Sen');
  await shot(page, 'R4-AC-28s-step-1-bring-back-refused');
  expect(sql(`select count(*) from accounts where user_id='${p.id}' and archived_at is null`)).toBe('1');
});

test('R4-AC-41.s: signing out mid first run clears the draft for the next person', async ({ page }) => {
  const one = person({ shell: true, capture: true });
  await signIn(page, one.email);
  await page.goto('/s/first-run');
  await atStep(page, 2);
  await page.getByRole('button', { name: /^Choose these \d+$/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 3);
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 4);
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 5);
  const ryt = page.getByLabel('Ryt Bank', { exact: true });
  await ryt.click();
  await page.keyboard.type('987654');
  await expect(ryt).toHaveValue('9,876.54');
  const draft = await page.evaluate(() => localStorage.getItem('sen.firstRun'));
  expect(draft).toContain('9,876.54');
  // sign out from Settings → Account (capture in a browser isn't held at first run)
  await page.goto('/s/settings');
  await page.getByRole('button', { name: /^Account,/ }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/sign-in/, { timeout: 10_000 });
  expect(await page.evaluate(() => localStorage.getItem('sen.firstRun'))).toBeNull();
  const two = person({ shell: true, capture: true });
  await signIn(page, two.email);
  await page.goto('/s/first-run');
  await atStep(page, 2);
  await shot(page, 'R4-AC-41s-step-1-next-person-starts-clean');
});

test('R4-FLOW-6: without capture, the short first run: Cash locked, a switch off archives', async ({ page }) => {
  const p = person({});
  await signIn(page, p.email);
  await expect(page).toHaveURL(/\/s\/first-run/);
  await atStep(page, 2, 2);
  await expect(page.getByRole('switch', { name: 'Cash' })).toBeDisabled();
  await expect(page.getByRole('switch', { name: 'Cash' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Unaccounted' })).toHaveCount(0);
  await shot(page, 'R4-FLOW-6-step-1-categories');
  await page.getByRole('switch', { name: 'Travel' }).click();
  await page.getByRole('button', { name: 'Start using Sen' }).click();
  await expect(page).not.toHaveURL(/first-run/, { timeout: 10_000 });
  await shot(page, 'R4-FLOW-6-step-2-home');
  expect(sql(`select archived_at is not null from categories where user_id='${p.id}' and name='Travel'`)).toBe('t');
  expect(sql(`select count(*) from categories where user_id='${p.id}' and archived_at is null`)).toBe('20');
  await page.goto('/more');
  await expect(page.getByRole('button', { name: /Accounts/ })).toHaveCount(0);
  await page.goto('/s/accounts');
  await expect(page.getByText('No accounts here')).toBeVisible();
  await shot(page, 'R4-FLOW-6-step-3-no-accounts');
});

test('R4-FLOW-9: Settings → Categories: rename, add, a taken name in the field, archive, bring back', async ({
  page,
}) => {
  const p = person({ shell: true, capture: true });
  sql(`insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`);
  await signIn(page, p.email);
  await page.request.post('/api/commands', { data: { type: 'setup.start' } });
  await page.goto('/s/settings/categories');
  await expect(page.getByRole('button', { name: /^Groceries,/ })).toBeVisible();
  await shot(page, 'R4-FLOW-9-step-1-list');
  await page.getByRole('button', { name: /^Groceries,/ }).click();
  await page.getByLabel('Name').fill('Market');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => sql(`select count(*) from categories where user_id='${p.id}' and name='Market'`)).toBe('1');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Add a category' }).click();
  await page.getByLabel('Name').fill('Pets');
  await page.getByRole('button', { name: /^Add/ }).last().click();
  await expect
    .poll(() => sql(`select count(*) from categories where user_id='${p.id}' and name='Pets' and archived_at is null`))
    .toBe('1');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Add a category' }).click();
  await page.getByLabel('Name').fill('pets');
  await page.getByRole('button', { name: /^Add/ }).last().click();
  await expect(page.locator('[data-slot="field-error"]', { hasText: 'already have' })).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue('pets');
  await shot(page, 'R4-FLOW-9-step-2-taken-name-in-field');
  expect(sql(`select count(*) from categories where user_id='${p.id}' and lower(name)='pets'`)).toBe('1');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /^Pets,/ }).click();
  await page.getByRole('switch', { name: /Discretionary/ }).click();
  await expect
    .poll(() => sql(`select is_discretionary from categories where user_id='${p.id}' and name='Pets'`))
    .toBe('t');
  await page.getByRole('button', { name: 'Archive' }).click();
  await expect
    .poll(() => sql(`select archived_at is not null from categories where user_id='${p.id}' and name='Pets'`))
    .toBe('t');
  await page.getByRole('button', { name: 'Bring back Pets' }).click();
  await expect
    .poll(() => sql(`select archived_at is null from categories where user_id='${p.id}' and name='Pets'`))
    .toBe('t');
  await shot(page, 'R4-FLOW-9-step-3-brought-back');
  // Unaccounted: shown, but nothing makes it pickable or flaggable
  const un = page.getByRole('button', { name: /^Unaccounted,/ });
  if (await un.count()) {
    await un.click();
    await shot(page, 'R4-FLOW-9-step-4-unaccounted');
    test.info().annotations.push({
      type: 'unaccounted-switches',
      description: String(await page.getByRole('switch').count()),
    });
  }
  const picker = await page.request.get('/api/categories?kind=spend');
  const labels = ((await picker.json()) as { label: string }[]).map((c) => c.label);
  expect(labels).not.toContain('Unaccounted');
  expect(labels).toContain('Market');
});

test('R4-FLOW-10: Settings → You: a second name and payday 25 persist', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  sql(`insert into user_settings(user_id,setup_done_at,own_names) values ('${p.id}',now(),'{"TAN WEI MING"}')`);
  await signIn(page, p.email);
  await page.goto('/s/settings/you');
  const names = page.getByLabel('Your names as banks print them');
  await expect(names).toHaveValue('TAN WEI MING');
  await names.fill('TAN WEI MING\nwei ming tan');
  await names.blur();
  await page.getByRole('radio', { name: 'A day' }).click();
  await page.getByLabel('Day of the month').fill('25');
  await page.getByLabel('Day of the month').press('Enter');
  await expect
    .poll(() => sql(`select own_names::text||'|'||expected_payday::text from user_settings where user_id='${p.id}'`), {
      timeout: 10_000,
    })
    .toMatch(/\|25$/);
  test.info().annotations.push({
    type: 'names-stored',
    description: sql(`select own_names::text from user_settings where user_id='${p.id}'`),
  });
  await page.reload();
  await expect(page.getByLabel('Day of the month')).toHaveValue('25');
  await shot(page, 'R4-FLOW-10-step-1-you-saved');
});

test('R4-FLOW-11: Accounts in New York keep KL’s dates and the same figures', async ({ browser }) => {
  const p = person({ shell: true, capture: true });
  // opened 00:30 on 10 Nov in KL, which is 11:30 on 9 Nov in New York
  sql(
    `insert into accounts(id,user_id,name,kind,notifier_package,notifier_label,opening_balance,opening_at) values ('${randomUUID()}','${p.id}','Ryt Bank','tracked','my.rytbank.app','Ryt Bank',123456,'2026-11-09 16:30:00+00'); ` +
      `insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`,
  );
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    baseURL: 'http://127.0.0.1:5191',
    timezoneId: 'America/New_York',
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  await signIn(page, p.email);
  await page.goto('/s/accounts');
  await expect(page.getByText('RM1,234.56').first()).toBeVisible();
  await page.getByRole('button', { name: /Ryt Bank/ }).click();
  await expect(page.getByText(/10 Nov/).first()).toBeVisible();
  await expect(page.getByText(/9 Nov/)).toHaveCount(0);
  await shot(page, 'R4-FLOW-11-step-1-account-in-new-york');
  await ctx.close();
});

test('R4-FLOW-4: access skipped: Home says capture is off, with a fix', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  await signIn(page, p.email);
  await page.goto('/s/first-run');
  await atStep(page, 2);
  await page.getByRole('button', { name: /^Choose these \d+$/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 3);
  await shot(page, 'R4-FLOW-4-step-1-access');
  test.info().annotations.push({
    type: 'access-step-text',
    description: (await page.locator('main').innerText()).slice(0, 400),
  });
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 4);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 5);
  for (const label of ['Ryt Bank', 'TNG eWallet', 'Public Bank', 'GrabPay Wallet']) {
    const f = page.getByLabel(label, { exact: true });
    await f.click();
    await page.keyboard.type('0');
  }
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 6);
  await page.getByLabel('Your name').fill('QA PERSON');
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 7);
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).not.toHaveURL(/first-run/, { timeout: 10_000 });
  await shot(page, 'R4-FLOW-4-step-2-home');
  test
    .info()
    .annotations.push({ type: 'home-text', description: (await page.locator('main').innerText()).slice(0, 600) });
});

test.describe('core journeys on the made-up backend', () => {
  test.use({ baseURL: FAKE });
  test('R4-FLOW-C2 pay-new: the prompt in Review, Meals makes a rule, Undo puts it back', async ({ page }) => {
    await page.goto('/review');
    const row = page.locator('[data-review="new-merchant"]').filter({ hasText: 'ROTI BAKAR 88' });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await shot(page, 'R4-FLOW-C2-step-1-review');
    await row.getByRole('button', { name: 'Meals' }).click();
    await expect(toast(page)).toContainText(/ROTI BAKAR 88 is Meals from now on/i);
    await expect(row).toHaveCount(0);
    await shot(page, 'R4-FLOW-C2-step-2-answered');
    await toast(page).getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('[data-review="new-merchant"]').filter({ hasText: 'ROTI BAKAR 88' })).toBeVisible();
    await shot(page, 'R4-FLOW-C2-step-3-undone');
  });
  test('R4-FLOW-C3 scan-after: read, three people, Done attaches', async ({ page }) => {
    await page.goto('/');
    const [camera] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Scan a receipt' }).click(),
    ]);
    await camera.setFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
    await page.getByRole('button', { name: 'Use this' }).click();
    await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
    await expect(page.getByText('SATE KAJANG HJ SAMURI')).toBeVisible();
    await shot(page, 'R4-FLOW-C3-step-1-confirm');
    await page.getByRole('button', { name: 'More people' }).click();
    await page.getByRole('button', { name: 'More people' }).click();
    await expect(page.getByRole('region', { name: 'How many people ate?' })).toContainText('RM21.38');
    await shot(page, 'R4-FLOW-C3-step-2-three-people');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(toast(page)).toContainText('Attached to RM64.13 on Ryt Bank');
    await shot(page, 'R4-FLOW-C3-step-3-attached');
  });
  test('R4-FLOW-C1 first-run on the made-up backend, all seven steps', async ({ page }) => {
    await page.goto('/s/first-run?scenario=new');
    await atStep(page, 1);
    await shot(page, 'R4-FLOW-C1-step-1-sign-in');
  });
});

test.describe('a production build’s B08 screens, on the real API', () => {
  test.use({ baseURL: 'http://127.0.0.1:5193' });
  test('R4-PROD: Settings, Categories, Accounts and an account open; the short first run finishes', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const p = person({ shell: true, capture: true });
    const acct = randomUUID();
    sql(
      `insert into accounts(id,user_id,name,kind,notifier_package,notifier_label,opening_balance) values ('${acct}','${p.id}','Ryt Bank','tracked','my.rytbank.app','Ryt Bank',128450); ` +
        `insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`,
    );
    await signIn(page, p.email);
    await page.request.post('/api/commands', { data: { type: 'setup.start' } });
    await page.goto('/s/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await page.waitForTimeout(800);
    await shot(page, 'R4-PROD-step-1-settings');
    test.info().annotations.push({
      type: 'prod-settings-text',
      description: (await page.locator('main').innerText()).slice(0, 500),
    });
    await page.goto('/s/settings/categories');
    await expect(page.getByRole('button', { name: /^Groceries,/ })).toBeVisible({ timeout: 10_000 });
    await shot(page, 'R4-PROD-step-2-categories');
    await page.goto('/s/accounts');
    await expect(page.getByText('RM1,284.50').first()).toBeVisible({ timeout: 10_000 });
    await shot(page, 'R4-PROD-step-3-accounts');
    await page.goto(`/s/account?id=${acct}`);
    await page.waitForTimeout(1500);
    await shot(page, 'R4-PROD-step-4-account');
    test.info().annotations.push({
      type: 'prod-account-text',
      description: (await page.locator('main').innerText()).slice(0, 400),
    });
    test.info().annotations.push({ type: 'prod-page-errors', description: errors.join(' | ') || 'none' });
    expect(errors).toEqual([]);
  });
  test('R4-PROD: without capture, the short first run in production', async ({ page }) => {
    const p = person({});
    await signIn(page, p.email);
    await expect(page).toHaveURL(/\/s\/first-run/);
    await atStep(page, 2, 2);
    await shot(page, 'R4-PROD-step-5-short-first-run');
    await page.getByRole('button', { name: 'Start using Sen' }).click();
    await expect(page).not.toHaveURL(/first-run/, { timeout: 10_000 });
    await shot(page, 'R4-PROD-step-6-home');
    expect(sql(`select (setup_done_at is not null) from user_settings where user_id='${p.id}'`)).toBe('t');
  });
});

test('R4-FLOW-12: an archived app’s account: Not added yet and Archived at once?', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  sql(`insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`);
  await signIn(page, p.email);
  // Ryt chosen in the shell, with its account
  await page.goto('/s/settings/capture/apps');
  const ryt = page.getByRole('switch', { name: /Ryt Bank/ });
  if (!(await ryt.isChecked())) await ryt.click();
  await expect(ryt).toBeChecked();
  const id = randomUUID();
  await page.request.post('/api/commands', {
    data: {
      type: 'account.add',
      id,
      name: 'Ryt Bank',
      kind: 'tracked',
      app: { package: 'my.rytbank.app', label: 'Ryt Bank' },
      opening: 5000,
    },
  });
  await page.goto(`/s/account?id=${id}`);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Archive this account' }).click();
  await expect.poll(() => sql(`select archived_at is not null from accounts where id='${id}'`)).toBe('t');
  await page.goto('/s/accounts');
  await expect(page.getByText('Archived')).toBeVisible();
  await page.waitForTimeout(800);
  await shot(page, 'R4-FLOW-12-step-1-archived-and-not-added');
  test
    .info()
    .annotations.push({ type: 'accounts-text', description: (await page.locator('main').innerText()).slice(0, 600) });
  test.info().annotations.push({
    type: 'add-ryt-buttons',
    description: String(await page.getByRole('button', { name: 'Add Ryt Bank' }).count()),
  });
});
