import { expect, test } from '@playwright/test';
import { open, shot, settled, tabs, toast, db, watch, text } from './b03-helpers';

// FLOW-30: AC-12, AC-12s, AC-70, AC-70s

test('FLOW-30 offline: banner, writes marked Not synced yet, reconnect syncs once with no duplicate rows', async ({ page, context }) => {
  const errors = watch(page);
  await open(page, '/review');
  const n0 = await db<number>(page, `(d) => d.txns.length`);
  // the dev server loads each screen's chunk on first use, so visit the two we need while still online
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.goBack();
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await tabs(page).getByRole('link', { name: /^Review/ }).click();
  await context.setOffline(true);
  await expect(page.getByText(/You're offline/)).toBeVisible();
  await shot(page, 'FLOW-30-step-1-offline-banner');
  // a change: add a payment and answer a Review row
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByLabel('Amount').fill('6.60');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText('Added RM6.60');
  await page.waitForTimeout(1600); // past the 1.2 s the fake would sync in if it were online
  const mid = await db<any>(page, `(d) => ({ n: d.txns.length, unsynced: Object.keys(d.unsynced).length })`);
  console.log('offline, 1.6 s after a write:', JSON.stringify(mid));
  expect(mid.unsynced).toBe(1);
  await page.getByRole('button', { name: /Skipped|Missing/ }).first().isVisible().catch(() => {});
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await page.waitForTimeout(500);
  const marks = await page.getByText('Not synced yet').count();
  console.log('Not synced yet marks while offline:', marks);
  expect(marks).toBeGreaterThanOrEqual(1);
  await shot(page, 'FLOW-30-step-2-not-synced-mark');
  await context.setOffline(false);
  await expect(page.getByText(/You're offline/)).toHaveCount(0);
  await page.waitForTimeout(2500);
  const after = await db<any>(page, `(d) => ({ n: d.txns.length, unsynced: Object.keys(d.unsynced).length, dup: d.txns.filter(t => t.amount === 660 && t.source === 'manual').length })`);
  console.log('back online, 2.5 s later:', JSON.stringify(after), 'start', n0);
  expect(after.unsynced).toBe(0);
  expect(after.n).toBe(n0 + 1);
  expect(after.dup).toBe(1);
  expect(await page.getByText('Not synced yet').count()).toBe(0);
  await shot(page, 'FLOW-30-step-3-synced');
  expect(errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e))).toEqual([]);
});

test('FLOW-30 offline then reload (preview build, service worker on): what the page does with the lost in-memory data', async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: 'http://127.0.0.1:5181', viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.goto('/review?look=minted&mode=light');
  await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true })); });
  await ctx.setOffline(true);
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByLabel('Amount').fill('3.30');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText('Added RM3.30');
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
  await page.waitForTimeout(1500);
  const t = (await page.locator('body').innerText()).replace(/\n+/g, ' | ');
  console.log('after offline reload:', t.slice(0, 250));
  await shot(page, 'FLOW-30-step-4-offline-reload');
  await ctx.setOffline(false);
  await page.goto('/more');
  await page.waitForTimeout(500);
  await page.getByText('Payments', { exact: true }).click();
  await page.waitForTimeout(800);
  await page.getByRole('searchbox', { name: 'Search payments' }).fill('');
  const first = await page.locator('[data-index] button').first().innerText().catch(() => '(none)');
  console.log('is the RM3.30 payment still there after reload? first row:', first.replace(/\n/g, ' | '));
  await ctx.close();
});
