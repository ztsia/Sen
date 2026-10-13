import { expect, test } from '@playwright/test';
import { open, settled, tabs, toast, watch } from './b04r-helpers';
import { note, step } from './b04r-r3-lib';

// Run 3 flows F: offline, time zone. Dev server (db() reads the fake).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

test('R3-FLOW-18 offline: a banner not an error; the new payment is marked Not synced yet; back online it is one synced row', async ({
  browser,
}) => {
  const F = 'R3-FLOW-18';
  // a preview build with its service worker on, so the app's own files are there offline, as in the shell
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5292',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'allow',
  });
  const page = await context.newPage();
  const w = watch(page);
  let n = 0;
  await open(page, '/review');
  await settled(page);
  // let the worker cache every file, and the screens this walk needs, while online
  await page.waitForTimeout(3000);
  for (const p of ['/s/manual', '/s/payments']) {
    await page.goto(`${p}?look=minted&mode=light`);
    await page.waitForTimeout(1200);
  }
  await open(page, '/review');
  await settled(page);
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText(/You're offline/)).toBeVisible();
  n++;
  await step(
    page,
    F,
    n,
    'offline',
    'Go offline',
    'a banner "You\'re offline" (not an error toast); the screen keeps working',
    async () => {
      await expect(page.getByText(/You're offline/)).toBeVisible();
      await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
    },
  );
  await page.getByRole('button', { name: 'Add it' }).click();
  await page.getByLabel('Amount').fill('13.37');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText(/Added RM13\.37/);
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  note(F, `payments text offline: ${(await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 400)}`);
  const row = page.locator('main button').filter({ hasText: /RM13\.37/ });
  n++;
  await step(
    page,
    F,
    n,
    'saved-offline',
    'Save RM13.37 while offline',
    'exactly one RM13.37 row in Payments, marked "Not synced yet"',
    async () => {
      await expect(row).toHaveCount(1);
      await expect(row.first()).toContainText(/Not synced yet/);
    },
  );
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(6500);
  n++;
  await step(
    page,
    F,
    n,
    'online',
    'Come back online and wait 6 seconds',
    'the banner is gone, the row no longer says Not synced yet, and there is still exactly one RM13.37 row',
    async () => {
      await expect(page.getByText(/You're offline/)).toHaveCount(0);
      await expect(row).toHaveCount(1);
      await expect(row.first()).not.toContainText(/Not synced yet/);
    },
  );
  expect(w.errors.filter((e) => !/Failed to load resource|net::/.test(e))).toEqual([]);
  await context.close();
});

test('R3-FLOW-19 time zone: Los Angeles shows the same days, totals and labels as Kuala Lumpur', async ({
  browser,
}) => {
  const F = 'R3-FLOW-19';
  const read = async (tz: string) => {
    const ctx = await browser.newContext({
      baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291',
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
      timezoneId: tz,
    });
    const page = await ctx.newPage();
    await open(page, '/');
    const home = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
    await page.getByTestId('hero').click();
    const sheet = (await page.getByRole('dialog').innerText()).replace(/\n+/g, ' | ');
    await open(page, '/s/payments');
    await settled(page);
    const pay = (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 900);
    await open(page, '/insights');
    const ins = (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 500);
    const now = await page.evaluate(() => new Date().toString().slice(0, 40));
    await ctx.close();
    return { home, sheet, pay, ins, now };
  };
  const kl = await read('Asia/Kuala_Lumpur');
  const la = await read('America/Los_Angeles');
  const nz = await read('Pacific/Auckland');
  note(F, `device clocks: ${kl.now} / ${la.now} / ${nz.now}`);
  await step(
    await (await browser.newContext({ baseURL: 'http://127.0.0.1:5291' })).newPage(),
    F,
    1,
    'tz',
    'Read Home, the cycle sheet, Payments and Insights in three zones',
    'the text is identical in Kuala Lumpur, Los Angeles and Auckland',
    async () => {
      expect(la.home).toBe(kl.home);
      expect(la.sheet).toBe(kl.sheet);
      expect(la.pay).toBe(kl.pay);
      expect(la.ins).toBe(kl.ins);
      expect(nz.home).toBe(kl.home);
      expect(nz.pay).toBe(kl.pay);
    },
  );
});
