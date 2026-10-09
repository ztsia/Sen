import { expect, test } from '@playwright/test';
import { ready, shot, watch } from './b02-helpers';

// QA run 2: AC-39s (an unknown capture route) and AC-42 (offline in the web app).
test('AC-39s an unknown settings/capture route is not a crash', async ({ page }) => {
  const w = watch(page, 'http://localhost:4173');
  await page.goto('/s/settings/capture/nope');
  await ready(page);
  const body = await page.locator('body').innerText();
  test.info().annotations.push({ type: 'body', description: body.slice(0, 300) });
  await shot(page, 'AC-39s-unknown-route');
  expect(w.errors).toEqual([]);
  await expect(page.getByRole('heading').first()).toBeVisible();
});

test.describe('AC-42', () => {
  test.use({ serviceWorkers: 'allow' });
  test('AC-42 offline: a banner, and Capture still renders', async ({ page, context }) => {
    await page.goto('/more');
    await ready(page);
    await page
      .waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 })
      .catch(async () => {
        await page.reload();
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 });
      });
    await ready(page);
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Capture' }).click();
    await expect(page.getByRole('heading', { name: 'Capture' })).toBeVisible();
    await context.setOffline(true);
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /Your apps/ }).click();
    await expect(page.getByRole('heading', { name: 'Your apps' })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Ryt Bank' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: "You're offline" })).toBeVisible();
    await shot(page, 'AC-42-offline');
    await context.setOffline(false);
  });
});

test('AC-35 the heartbeat: nothing yet, then the last capture and the log', async ({ page }) => {
  await page.goto('/more');
  await ready(page);
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Capture' }).click();
  await page.getByRole('button', { name: /Your apps/ }).click();
  await page.getByRole('switch', { name: "Touch 'n Go eWallet" }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Dev panel' }).click();
  const panel = page.getByRole('dialog', { name: 'Dev panel' });
  await panel.getByRole('button', { name: 'Grant access' }).click();
  await panel.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Nothing captured yet.', { exact: false })).toBeVisible();
  await expect(page.getByText(/Invalid Date|NaN/)).toHaveCount(0);
  await shot(page, 'AC-35-step-1-nothing-yet');
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await panel.getByRole('button', { name: 'Post a notification' }).click();
  await panel.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText(/Last notification captured Today, \d\d:\d\d\./)).toBeVisible();
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await page.getByRole('button', { name: 'Heartbeat' }).click();
  await expect(page.getByText('Listener connected', { exact: true })).toBeVisible();
  await expect(page.getByText('Phone started', { exact: true })).toBeVisible();
  await expect(page.getByText(/Invalid Date|NaN/)).toHaveCount(0);
  await shot(page, 'AC-35-step-2-heartbeat-log');
});
