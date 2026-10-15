import { test } from '@playwright/test';
import { PEOPLE, fresh, sql } from './b05-setup';
import { expect, note, signIn, step } from './b05-lib';

test.beforeEach(() => fresh());

test('FLOW-14 a session that expired on the server', async ({ page }) => {
  const F = 'FLOW-14';
  await signIn(page, PEOPLE.ben.email);
  sql(`update auth_session set expires_at = now() - interval '1 minute' where user_id = '${PEOPLE.ben.id}'`);
  await page.goto('/s/settings/account');
  await step(page, F, 1, 'expired', 'the session expires; open Account', 'sign-in, not a broken screen', async () => {
    await expect(page).toHaveURL(/\/s\/sign-in/);
  });
});

test('FLOW-15 a suspended person signs in', async ({ page }) => {
  const F = 'FLOW-15';
  sql(`update user_access set suspended_at = now() where user_id = '${PEOPLE.ben.id}'`);
  try {
    await signIn(page, PEOPLE.ben.email);
    await page.waitForTimeout(1500);
    const body = (await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 300);
    note(F, `suspended, after sign-in: ${page.url()} | ${body}`);
    await page.goto('/s/settings/account');
    await page.waitForTimeout(800);
    note(F, `suspended, Account: ${(await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 300)}`);
    await step(page, F, 1, 'suspended', 'a suspended person signs in and opens Account', 'says access is paused, in words (§9.6 Suspend)', async () => {
      await expect(page.locator('body')).toContainText(/paused/i);
    });
  } finally {
    sql(`update user_access set suspended_at = null where user_id = '${PEOPLE.ben.id}'`);
  }
});

test('FLOW-16 signed in, the sign-in address', async ({ page }) => {
  const F = 'FLOW-16';
  await signIn(page, PEOPLE.ben.email);
  await page.goto('/s/sign-in');
  await page.waitForTimeout(800);
  note(F, `signed in, /s/sign-in shows: ${(await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 160)}`);
  await step(page, F, 1, 'sign-in-again', 'open /s/sign-in while signed in', 'recorded (no spec rule)', async () => {
    await expect(page.locator('main')).toBeVisible();
  });
});

test('FLOW-17 Sign out while offline', async ({ page, context }) => {
  const F = 'FLOW-17';
  await signIn(page, PEOPLE.ben.email);
  await page.goto('/s/settings/account');
  await expect(page.locator('main')).toContainText(PEOPLE.ben.email);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForTimeout(800);
  const t = await page.locator('[data-sonner-toast]').first().innerText().catch(() => '(no toast)');
  note(F, `offline sign out: url ${page.url()} toast "${t.replace(/\n+/g, ' | ')}"`);
  await step(page, F, 1, 'offline-sign-out', 'offline, tap Sign out', 'says it needs a connection; still on Account; session kept', async () => {
    await expect(page).toHaveURL(/settings\/account/);
    expect(t).toMatch(/connection|reach/i);
  });
  await context.setOffline(false);
});
