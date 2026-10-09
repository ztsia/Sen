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
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 }).catch(async () => {
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
