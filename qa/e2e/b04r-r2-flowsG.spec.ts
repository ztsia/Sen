import { expect, test } from '@playwright/test';
import { db, open, settled, tabs, toast, watch } from './b04r-helpers';
import { step } from './b04r-r2-lib';
import { acctId } from '../../apps/web/src/data/fake/scenario';

test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

test('R2-FLOW-33 Skipped notifications: a payment from one, once', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-33';
  await open(page, '/s/skipped');
  await settled(page);
  const N = '(db)=>db.txns.length';
  const n0 = await db<number>(page, N);
  await step(page, F, 1, 'skipped', 'Open Skipped notifications', 'one card each (app and time, title, text, "This was a payment" chip), three of them', async () => {
    expect(await page.getByRole('button', { name: 'This was a payment' }).count()).toBe(3);
    const h = await page.getByRole('button', { name: 'This was a payment' }).first().evaluate((e) => Math.round(e.getBoundingClientRect().height));
    expect(h).toBe(32);
  });
  const b = page.getByRole('button', { name: 'This was a payment' }).first();
  const box = (await b.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(120);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await step(page, F, 2, 'tapped', 'Tap "This was a payment" twice quickly', 'one card is restored (3 -> 2), not two; a toast offers Undo', async () => {
    await page.waitForTimeout(600);
    const n1 = await db<number>(page, N);
    console.log('txns', n0, '->', n1, 'cards left', await page.getByRole('article').count());
    await expect(toast(page)).toBeVisible();
    // one card restored; the one that slid into its place was not
    expect(await page.getByRole('article').count()).toBe(2);
  });
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-34 Account detail', async ({ page }) => {
  const F = 'R2-FLOW-34';
  await open(page, `/s/account?id=${acctId('ryt')}`);
  await settled(page);
  await step(page, F, 1, 'account', 'Open Ryt Bank', 'a header with the balance, facts in a grid (opening balance, fed by, last checked), an action bar (Check, Payments, Ask Sen) with captions, recent payments in a card; facts are not buttons', async () => {
    await expect(page.locator('main')).toContainText('Ryt Bank');
    for (const a of ['Check', 'Payments', 'Ask Sen']) await expect(page.getByRole('button', { name: a, exact: true })).toBeVisible();
    expect(await page.locator('main dl').count()).toBeGreaterThan(0);
    expect(await page.locator('main dl button').count()).toBe(0);
    await expect(page.locator('main')).toContainText(/Opening|Fed by|Last checked/i);
  });
  await page.getByRole('button', { name: 'Payments', exact: true }).click();
  await step(page, F, 2, 'payments', 'Tap Payments', 'Payments opens filtered to this account', async () => {
    await expect(page).toHaveURL(/\/s\/payments/);
  });
});

test('R2-FLOW-35 Reduced motion: the Insights pager and sheets settle', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });
  const page = await ctx.newPage();
  const F = 'R2-FLOW-35';
  await open(page, '/insights');
  await settled(page);
  await page.getByRole('tab', { name: 'Year' }).click();
  const samples = await page.evaluate(async () => {
    const t = document.querySelector('[aria-label^="Insights: "]') as HTMLElement;
    const out: number[] = [];
    for (let i = 0; i < 6; i++) { out.push(Math.round(t.scrollLeft)); await new Promise((r) => setTimeout(r, 30)); }
    return out;
  });
  console.log('scrollLeft samples under reduced motion', samples.join(','));
  await step(page, F, 1, 'pager', 'Choose the Year step with prefers-reduced-motion', 'the track jumps to the last card at once (the first sample is already the final position)', async () => {
    const final = samples[samples.length - 1]!;
    expect(final).toBeGreaterThan(0);
    expect(samples[0], `samples ${samples}`).toBe(final);
  });
  await ctx.close();
});
