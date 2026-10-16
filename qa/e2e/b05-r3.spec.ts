import { test } from '@playwright/test';
import { PEOPLE, fresh, sql } from './b05-setup';
import { expect, note, signIn, step } from './b05-lib';

// QA B05 run 3 (scoped): qa/B05/flows.md *Run 3*, Minted light at 390×844 against sen_qa.
const sessions = (id: string) => Number(sql(`select count(*) from auth_session where user_id = '${id}'`));
const KEPT = 'sen.api.kept';

test.beforeEach(() => fresh());

test('FLOW-31 sign out everywhere from another browser, then this one offline', async ({ browser }) => {
  const F = 'FLOW-31';
  const a = await browser.newContext({ serviceWorkers: 'allow' });
  const b = await browser.newContext();
  const pa = await a.newPage();
  const pb = await b.newPage();
  await signIn(pa, PEOPLE.ben.email);
  await pa.goto('/s/settings/you');
  await pa.waitForTimeout(1500);
  await step(pa, F, 1, 'kept', 'browser A opens Settings → You', 'the device keeps the last answer for offline', async () => {
    const kept = await pa.evaluate((k) => localStorage.getItem(k), KEPT);
    note(F, `kept after You: ${kept?.slice(0, 160)}`);
    expect(kept).toContain(PEOPLE.ben.email);
  });
  await signIn(pb, PEOPLE.ben.email);
  await pb.goto('/s/settings/account');
  await pb.getByRole('button', { name: 'Sign out everywhere' }).click();
  await pb.getByRole('alertdialog').getByRole('button', { name: 'Sign out everywhere' }).click();
  await expect(pb).toHaveURL(/sign-in/);
  expect(sessions(PEOPLE.ben.id)).toBe(0);
  await pa.goto('/s/settings/you');
  await pa.waitForTimeout(2000);
  const keptAfter = await pa.evaluate((k) => localStorage.getItem(k), KEPT);
  note(F, `kept after the 401: ${keptAfter?.slice(0, 160)}`);
  await step(pa, F, 2, 'revoked', 'browser A reads the server again', 'it is sent to sign-in', async () => {
    await expect(pa).toHaveURL(/sign-in/);
  });
  await a.setOffline(true);
  await pa.goto('/s/settings/you').catch(() => undefined);
  await pa.waitForTimeout(2500);
  await step(pa, F, 3, 'offline', 'browser A, offline, opens Settings → You', 'nothing of Ben is kept or shown', async () => {
    const text = await pa.locator('body').innerText().catch(() => '');
    note(F, `offline open after revocation: ${pa.url()} | ${text.replace(/\n+/g, ' | ').slice(0, 300)}`);
    expect(text).not.toContain('Last working day');
    expect(await pa.evaluate((k) => localStorage.getItem(k), KEPT)).toBeNull();
  });
  await a.close();
  await b.close();
});

test('FLOW-32 paused, then another person signs in on the same tab', async ({ page }) => {
  const F = 'FLOW-32';
  await signIn(page, PEOPLE.ben.email);
  sql(`update user_access set suspended_at = now() where user_id = '${PEOPLE.ben.id}'`);
  try {
    await page.getByRole('link', { name: 'More' }).click();
    await page.goto('/s/settings/you');
    await step(page, F, 1, 'paused', 'Ben, suspended, opens You', 'sign-in says paused', async () => {
      await expect(page).toHaveURL(/sign-in/);
      await expect(page.locator('body')).toContainText(/paused/i);
    });
    await page.getByLabel('Your email').fill(PEOPLE.admin.email);
    await page.getByRole('button', { name: 'Send the code' }).click();
    await page.getByLabel('6-digit code').fill('123456');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).not.toHaveURL(/sign-in/);
    await page.getByRole('link', { name: 'More' }).click();
    await page.goto('/s/settings/account');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/sign-in/);
    await step(page, F, 2, 'next-person', 'the admin signs in on that tab, then signs out', 'sign-in no longer says paused', async () => {
      await expect(page.locator('body')).not.toContainText(/paused/i);
    });
  } finally {
    sql(`update user_access set suspended_at = null where user_id = '${PEOPLE.ben.id}'`);
  }
});

test('FLOW-33 typing a name while You refetches', async ({ page }) => {
  const F = 'FLOW-33';
  sql(`insert into user_settings (user_id, own_names, expected_payday) values ('${PEOPLE.admin.id}', '{BEN B}', 'last-working')
       on conflict (user_id) do update set own_names = '{BEN B}', expected_payday = 'last-working'`);
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/s/settings/you');
  const names = page.getByRole('textbox').first();
  await names.click();
  await page.keyboard.press('End');
  await page.keyboard.type('\nBEN BIN ABU');
  // another device changes the payday; the screen hears of it (the app refetches on focus / a change)
  sql(`update user_settings set expected_payday = '9' where user_id = '${PEOPLE.admin.id}'`);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(2000);
  await step(page, F, 1, 'draft', 'type a second name, while the saved payday changes elsewhere', 'the typed name is still in the field', async () => {
    const v = await names.inputValue();
    note(F, `names field: ${JSON.stringify(v)}; day field: ${await page.getByLabel('Day of the month').inputValue({ timeout: 1000 }).catch(() => 'not shown: no refetch happened')}`);
    expect(v).toContain('BEN BIN ABU');
  });
});
