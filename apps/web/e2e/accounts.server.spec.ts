import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { FIRST_RUN, ownerSql } from './server.setup';

// Accounts against the API and sen_test (B08), where what's archived is real.

test.afterEach(() => ownerSql('truncate auth_rate_limit'));

async function signIn(page: Page, email: string) {
  await page.goto('/s/sign-in');
  await page.getByLabel('Your email').fill(email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 15_000 });
}

test('with every account archived, Accounts says what to do above them (QA B08 run 4, scoped 13)', async ({ page }) => {
  const hana = FIRST_RUN.capture.id;
  await ownerSql(
    `insert into accounts (id, user_id, name, kind, notifier_package, notifier_label, opening_balance, archived_at)
     values ($1, $2, 'Old Bank', 'tracked', 'com.example.oldbank', 'Old Bank', 0, now())`,
    [randomUUID(), hana],
  );
  await ownerSql('update accounts set archived_at = coalesce(archived_at, now()) where user_id = $1', [hana]);
  await ownerSql(
    `insert into user_settings (user_id, setup_done_at) values ($1, now())
     on conflict (user_id) do update set setup_done_at = coalesce(user_settings.setup_done_at, now())`,
    [hana],
  );
  // Hana stays unfinished for first-run.server.spec.ts, whichever runs first
  test.info().annotations.push({ type: 'restores', description: 'Hana unfinished, no accounts' });
  try {
    await walk(page);
  } finally {
    await ownerSql('delete from accounts where user_id = $1', [hana]);
    await ownerSql('update user_settings set setup_done_at = null where user_id = $1', [hana]);
  }
});

async function walk(page: Page) {
  await signIn(page, FIRST_RUN.capture.email);
  await page.goto('/s/accounts');
  await expect(page.getByText('No accounts in use', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Bring an archived account back below, or choose apps for Sen to read.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bring back Old Bank' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check balances' })).toHaveCount(0);
}
