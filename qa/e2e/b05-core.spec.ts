import { test } from '@playwright/test';
import { PEOPLE, fresh } from './b05-setup';
import { expect, note, signIn, step, tabs, toast, watch } from './b05-lib';

// The core journeys (docs/flows.md, D124) on B05's preview build: the server signs in, and the
// skeleton's fake still holds everything after it. Minted light, 390×844.
const SCAN = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };

test.beforeEach(() => fresh());

test('CORE-1 first-run: sign-in by code is real; the rest is B08', async ({ page }) => {
  const F = 'CORE-1';
  await page.goto('/s/first-run');
  await step(page, F, 1, 'gate', 'open first-run signed out', 'the gate sends it to sign-in', async () => {
    await expect(page).toHaveURL(/\/s\/sign-in/);
  });
  await signIn(page, PEOPLE.admin.email);
  await step(page, F, 2, 'home', 'sign in by code', 'home with the tab bar', async () => {
    await expect(tabs(page)).toBeVisible();
  });
  await page.goto('/s/first-run');
  await page.waitForTimeout(800);
  await step(
    page,
    F,
    3,
    'first-run',
    'open first-run signed in',
    'the first-run screen opens (note what step 1 asks)',
    async () => {
      note(F, `first-run signed in: ${(await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 300)}`);
      await expect(page).toHaveURL(/first-run/);
    },
  );
});

test('CORE-2 pay-new: answering a new merchant files it and makes a rule', async ({ page }) => {
  const errors = watch(page);
  const F = 'CORE-2';
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/review');
  const row = page.locator('[data-review="new-merchant"]').filter({ hasText: /ROTI BAKAR 88/i });
  await step(page, F, 1, 'prompt', 'Review shows the new merchant', 'RM9.50 · Roti Bakar 88 with answers', async () => {
    await expect(row).toBeVisible();
    await expect(row).toContainText('RM9.50');
  });
  await row.getByRole('button', { name: 'Meals' }).click();
  await step(
    page,
    F,
    2,
    'answered',
    'tap Meals',
    'the card goes; a toast says it is Meals from now on, with Undo',
    async () => {
      await expect(toast(page)).toContainText(/Roti Bakar 88 is Meals from now on/i);
      await expect(row).toHaveCount(0);
    },
  );
  note(F, `console errors: ${JSON.stringify(errors)}`);
});

test('CORE-3 scan-after: scan, confirm, Done attaches to the payment', async ({ page }) => {
  const F = 'CORE-3';
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 8000 }),
    tabs(page).getByRole('button', { name: 'Scan a receipt' }).click(),
  ]);
  await chooser.setFiles(SCAN);
  await step(page, F, 1, 'crop', 'Scan tab, choose a photo', 'crop opens', async () => {
    await expect(page).toHaveURL(/\/s\/crop/, { timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible();
  });
  await page.getByRole('button', { name: 'Use this' }).click();
  await step(page, F, 2, 'confirm', 'Use this', 'confirm with the items', async () => {
    await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
    await expect(page.getByRole('status').filter({ hasText: 'Items add up to the total' })).toBeVisible();
  });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await step(page, F, 3, 'attached', 'Done', 'Attached to RM64.13 on Ryt Bank, with Undo', async () => {
    await expect(toast(page)).toContainText('Attached to RM64.13 on Ryt Bank');
    await expect(toast(page)).toContainText('Undo');
  });
});
