import { expect, test } from '@playwright/test';
import { PROD, ready, shot, sim, toCapture, touchHold, watch } from './b02-helpers';

test.describe('production build', () => {
  test.use({ baseURL: PROD, serviceWorkers: 'allow' });

  test('FLOW-10 opens offline from the service worker; the API is never served from cache', async ({ page, context }) => {
    const w = watch(page, PROD);
    await page.goto('/');
    await expect(page.getByTestId('not-built')).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    });
    await shot(page, 'FLOW-10-step-1-online');
    // online: two API calls go through the network and nothing about them is cached
    const online = await page.evaluate(async () => {
      const a = await fetch('/api/qa-probe?n=1'); const b = await fetch('/api/qa-probe?n=1');
      const names = await caches.keys();
      const all = (await Promise.all(names.map(async (n) => (await (await caches.open(n)).keys()).map((r) => new URL(r.url).pathname)))).flat();
      return { a: a.status, b: b.status, cachedApi: all.filter((p) => p.startsWith('/api/')), total: all.length };
    });
    expect(online.cachedApi).toEqual([]);
    expect(online.total).toBeGreaterThan(10);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('not-built')).toBeVisible();
    await shot(page, 'FLOW-10-step-2-offline-reload');
    // the five tabs, offline
    for (const [tab, path] of [['Review', '/review'], ['Insights', '/insights'], ['More', '/more'], ['Home', '/']] as const) {
      await page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: new RegExp(tab) }).click();
      await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/$' : path}`));
    }
    await shot(page, 'FLOW-10-step-3-offline-tabs');
    // a deep link offline gets the app shell
    await page.goto('/s/settings/capture');
    await expect(page.getByText("Capture works in Sen's Android app", { exact: false })).toBeVisible();
    const offlineApi = await page.evaluate(() => fetch('/api/qa-probe?n=1').then((r) => `status ${r.status}`, (e) => `rejected: ${e}`));
    expect(offlineApi).toMatch(/^rejected/);
    await shot(page, 'FLOW-10-step-4-offline-deep-link');
    await context.setOffline(false);
    expect(w.external).toEqual([]);
    expect(w.errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(e))).toEqual([]);
  });

  test('FLOW-13 capture screens in a plain browser, and the hidden tests stay hidden', async ({ page }) => {
    const w = watch(page, PROD);
    await page.goto('/s/settings/capture');
    await expect(page.getByText("Capture works in Sen's Android app", { exact: false })).toBeVisible();
    await shot(page, 'FLOW-13-step-1-capture-needs-app');
    for (const id of ['apps', 'access', 'running', 'captured']) {
      await page.goto(`/s/settings/capture/${id}`);
      await expect(page.getByText("Capture works in Sen's Android app", { exact: false })).toBeVisible();
    }
    await page.goto('/s/settings/account');
    const v = page.getByRole('button', { name: 'Version Web app' });
    await expect(v).toBeVisible();
    const box = (await v.boundingBox())!;
    await touchHold(page, box.x + 40, box.y + box.height / 2, 800);
    await page.waitForTimeout(300);
    await expect(page.getByRole('heading', { name: 'Tests' })).toHaveCount(0);
    await shot(page, 'FLOW-13-step-2-account-web');
    // no simulator in production
    await expect(page.getByRole('button', { name: 'Dev panel' })).toHaveCount(0);
    expect(w.external).toEqual([]);
    expect(w.errors).toEqual([]);
  });

  test('CORE the production build: five tabs and More open with no error', async ({ page }) => {
    const w = watch(page, PROD);
    await page.goto('/');
    await ready(page);
    for (const [tab, path] of [['Review', '/review'], ['Insights', '/insights'], ['More', '/more'], ['Home', '/']] as const) {
      await page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: new RegExp(tab) }).click();
      await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/$' : path}`));
      await shot(page, `CORE-step-${tab.toLowerCase()}`);
    }
    await page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: /^Scan/ }).or(page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: /^Scan/ })).first().click();
    await expect(page).toHaveURL(/\/scan/);
    await shot(page, 'CORE-step-scan');
    expect(w.external).toEqual([]);
    expect(w.errors).toEqual([]);
  });
});

test.describe('another timezone', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('FLOW-12 a capture at 23:30 KL on 31 Oct shows 23:30, whatever the device', async ({ page }) => {
    // 31 Oct 2026, 23:30 in Kuala Lumpur is 15:30 UTC; in Los Angeles it's 08:30 the same day
    await page.clock.install({ time: new Date('2026-10-31T15:30:00Z') });
    await toCapture(page);
    await page.getByRole('button', { name: /Your apps/ }).click();
    await page.getByRole('button', { name: 'Choose these 5' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await sim(page, 'Grant access');
    await sim(page, 'Post a notification');
    await page.getByRole('button', { name: /Captured on this phone/ }).click();
    const row = page.getByRole('main').locator('li').first();
    await expect(row).toContainText('Today, 23:30');
    await expect(row).not.toContainText('08:30');
    await shot(page, 'FLOW-12-step-1-kl-time');
    // and the next KL day: 1 Nov 00:10 KL (16:10 UTC), still 31 Oct in LA
    await page.clock.setFixedTime(new Date('2026-10-31T16:10:00Z'));
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: /Captured on this phone/ }).click();
    await expect(page.getByRole('main').locator('li').first()).toContainText('Yesterday, 23:30');
    await shot(page, 'FLOW-12-step-2-next-kl-day');
  });
});
