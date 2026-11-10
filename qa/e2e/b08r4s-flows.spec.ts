import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';

// QA B08 run 4, scoped (tier 2): the fixes of 23da7b6..0944abe, at 390×844, against the API on sen_qa4
// (:5191) and the made-up backend (:5192). Run as b08r4.config.ts says, with
//   ./node_modules/.bin/playwright test -c b08r4.config.ts b08r4s-flows.spec.ts
// (the config matches both run 4 specs).

const SHOTS = new URL('../../qa-artifacts/B08_first-run-accounts/screens', import.meta.url).pathname;
const DB = process.env.QA_DB ?? 'sen_qa4';
const FAKE = 'http://127.0.0.1:5192';
const sql = (q: string) =>
  execFileSync('psql', ['-X', '-At', '-v', 'ON_ERROR_STOP=1', `postgres://sen_owner@127.0.0.1:5432/${DB}`, '-c', q], {
    encoding: 'utf8',
  }).trim();
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });

function person(features: Record<string, boolean>) {
  const id = randomUUID();
  const email = `qa.r4s.${id.slice(0, 8)}@example.com`;
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

/** The simulated shell's chosen apps (the dev panel's store), then a fresh load so Accounts reads them. */
async function choose(page: Page, packages: string[]) {
  await page.evaluate((p) => sessionStorage.setItem('sen.sim.chosen', JSON.stringify(p)), packages);
}

const add = (id: string, who: string, name: string, pkg: string, label: string, opening: number) =>
  sql(
    `insert into accounts(id,user_id,name,kind,notifier_package,notifier_label,opening_balance) values ('${id}','${who}','${name}','tracked','${pkg}','${label}',${opening})`,
  );

/** The resolved colours of a field's amount, label and message, and the page's text and error colours. */
async function colours(page: Page, input: Locator) {
  return input.evaluate((el) => {
    const field = el.closest('[data-slot="field"]') ?? el.parentElement!.parentElement!;
    const label = field.querySelector('label');
    const msg = field.querySelector('[data-slot="field-error"]');
    const probe = (v: string) => {
      const s = document.createElement('span');
      s.style.color = `var(${v})`;
      field.appendChild(s);
      const c = getComputedStyle(s).color;
      s.remove();
      return c;
    };
    return {
      amount: getComputedStyle(el).color,
      label: label ? getComputedStyle(label).color : null,
      message: msg ? getComputedStyle(msg).color : null,
      invalid: el.getAttribute('aria-invalid'),
      foreground: probe('--foreground'),
      destructive: probe('--destructive'),
      value: (el as HTMLInputElement).value,
    };
  });
}

test('R4S-FLOW-1: the only account archived: no total, no Add, Bring back restores it', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  const ryt = randomUUID();
  add(ryt, p.id, 'Ryt Bank', 'my.rytbank.app', 'Ryt Bank', 5000);
  sql(`insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`);
  const openedAt = sql(`select opening_at from accounts where id='${ryt}'`);
  await signIn(page, p.email);
  await page.goto('/s/accounts');
  await choose(page, ['my.rytbank.app']);
  await page.goto(`/s/account?id=${ryt}`);
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Archive this account' }).click();
  await expect.poll(() => sql(`select archived_at is not null from accounts where id='${ryt}'`)).toBe('t');
  await page.goto('/s/accounts');
  await expect(page.getByRole('button', { name: 'Bring back Ryt Bank' })).toBeVisible();
  await page.waitForTimeout(1200); // the chosen apps load from the simulated shell
  await expect(page.getByRole('button', { name: 'Add Ryt Bank' })).toHaveCount(0);
  await expect(page.getByText(/In 0 accounts?/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check balances' })).toHaveCount(0);
  await shot(page, 'R4S-FLOW-1-step-1-only-archived');
  test.info().annotations.push({
    type: 'accounts-text',
    description: (await page.locator('main').innerText()).replace(/\n+/g, ' / '),
  });
  await page.getByRole('button', { name: 'Bring back Ryt Bank' }).click();
  await expect(page.getByText('In 1 account', { exact: true })).toBeVisible();
  await expect(page.getByText('RM50.00').first()).toBeVisible();
  await shot(page, 'R4S-FLOW-1-step-2-brought-back');
  expect(sql(`select opening_at from accounts where id='${ryt}'`)).toBe(openedAt);
  expect(sql(`select count(*) from accounts where user_id='${p.id}' and archived_at is null`)).toBe('1');
});

test('R4S-FLOW-2: one of two archived, a third app with none: Add only for the third', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  const ryt = randomUUID();
  add(ryt, p.id, 'Ryt Bank', 'my.rytbank.app', 'Ryt Bank', 5000);
  add(randomUUID(), p.id, 'TNG eWallet', 'my.com.tngdigital.ewallet', "Touch ''n Go eWallet", 2550);
  sql(
    `update accounts set archived_at = now() where id='${ryt}'; insert into user_settings(user_id,setup_done_at) values ('${p.id}',now())`,
  );
  await signIn(page, p.email);
  await page.goto('/s/accounts');
  await choose(page, ['my.rytbank.app', 'my.com.tngdigital.ewallet', 'com.grabtaxi.passenger']);
  await page.goto('/s/accounts');
  await expect(page.getByText('In 1 account', { exact: true })).toBeVisible();
  await expect(page.getByText('RM25.50').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add GrabPay Wallet' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Add Ryt Bank' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Bring back Ryt Bank' })).toBeVisible();
  await shot(page, 'R4S-FLOW-2-step-1-one-archived-one-new');
  test.info().annotations.push({
    type: 'accounts-text',
    description: (await page.locator('main').innerText()).replace(/\n+/g, ' / '),
  });
});

test('R4S-AC-3: /accounts carries archived rows’ packages, and only one’s own', async ({ page }) => {
  const a = person({ shell: true, capture: true });
  const b = person({ shell: true, capture: true });
  add(randomUUID(), a.id, 'Ryt Bank', 'my.rytbank.app', 'Ryt Bank', 100);
  sql(`update accounts set archived_at=now() where user_id='${a.id}'`);
  add(randomUUID(), b.id, 'Old', 'com.pbb.mypb', 'MyPB', 100);
  sql(`update accounts set archived_at=now() where user_id='${b.id}'`);
  await signIn(page, a.email);
  const v = (await (await page.request.get('/api/accounts')).json()) as {
    archived: { name: string; package: string | null }[];
  };
  test.info().annotations.push({ type: 'archived', description: JSON.stringify(v.archived) });
  expect(v.archived.map((x) => [x.name, x.package])).toEqual([['Ryt Bank', 'my.rytbank.app']]);
});

test('R4S-FLOW-3a: first run’s accounts step: typed amounts are never red', async ({ page }) => {
  const p = person({ shell: true, capture: true });
  await signIn(page, p.email);
  await page.goto('/s/first-run');
  await expect(page.getByText('Step 2 of 7')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /^Choose these \d+$/ }).click();
  for (const n of [3, 4, 5]) {
    await page.waitForTimeout(350);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(`Step ${n} of 7`)).toBeVisible();
  }
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Type today’s balance, or 0.').first()).toBeVisible();
  const ryt = page.getByLabel('Ryt Bank', { exact: true });
  await ryt.fill('12.3.4');
  const tng = page.getByLabel('TNG eWallet', { exact: true });
  const r = await colours(page, ryt);
  const t = await colours(page, tng);
  test.info().annotations.push({ type: 'ryt-typed', description: JSON.stringify(r) });
  test.info().annotations.push({ type: 'tng-empty-error', description: JSON.stringify(t) });
  await shot(page, 'R4S-FLOW-3-step-1-first-run-typed-beside-errors');
  expect(r.amount).toBe(r.foreground);
  expect(t.invalid).toBe('true');
  expect(t.label).toBe(t.destructive);
  expect(t.amount).toBe(t.foreground);
});

test.describe('the made-up backend', () => {
  test.use({ baseURL: FAKE });
  for (const mode of ['light', 'dark'] as const)
    test(`R4S-FLOW-3b: manual entry, 0 typed with “above zero” showing, ${mode}`, async ({ page }) => {
      await page.goto(`/s/manual?look=minted&mode=${mode}`);
      const amount = page.getByLabel('Amount', { exact: true });
      await amount.click();
      await page.keyboard.type('0');
      await expect(amount).toHaveValue('0.00');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText('Type an amount above zero.')).toBeVisible();
      const c = await colours(page, amount);
      test.info().annotations.push({ type: `manual-${mode}`, description: JSON.stringify(c) });
      await shot(page, `R4S-FLOW-3-step-2-manual-zero-error-${mode}`);
      expect(c.invalid).toBe('true');
      expect(c.amount).toBe(c.foreground);
      expect(c.amount).not.toBe(c.destructive);
      expect(c.message).toBe(c.destructive);
    });
  test('R4S-FLOW-3c: Accounts → Add: empty refused, then typing clears it, in the text colour', async ({ page }) => {
    await page.goto('/s/accounts');
    await choose(page, [
      'my.rytbank.app',
      'my.com.tngdigital.ewallet',
      'com.pbb.mypb',
      'com.grabtaxi.passenger',
      'com.example.coffee',
    ]);
    await page.goto('/s/accounts');
    await page.getByRole('button', { name: 'Add A coffee app' }).click();
    const sheet = page.getByRole('dialog', { name: 'Add A coffee app' });
    await sheet.getByRole('button', { name: 'Add account' }).click();
    await expect(sheet.getByText('Type today’s balance, or 0.')).toBeVisible();
    const bal = sheet.getByLabel('Today’s balance');
    const before = await colours(page, bal);
    await bal.click();
    await page.keyboard.type('1999');
    const after = await colours(page, bal);
    test.info().annotations.push({ type: 'add-sheet', description: JSON.stringify({ before, after }) });
    await shot(page, 'R4S-FLOW-3-step-3-add-sheet-typed');
    expect(after.amount).toBe(after.foreground);
    expect(after.value).toBe('19.99');
  });
});
