import { expect, test } from '@playwright/test';
import { open, shot } from './b05feel-lib';

const touch = async (page: any, type: string, y?: number, x = 200) => {
  const cdp = (page as any).__cdp ?? ((page as any).__cdp = await page.context().newCDPSession(page));
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: y === undefined ? [] : [{ x, y }] });
};

for (const rm of ['no-preference', 'reduce'] as const) {
  test(`R3S-1 a scroll from a row leaves no ripple at once (${rm})`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 412, height: 915 },
      hasTouch: true,
      isMobile: true,
      serviceWorkers: 'block',
      baseURL: 'http://localhost:4181',
      reducedMotion: rm,
    });
    const page = await ctx.newPage();
    await open(page, '/s/payments');
    await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const w = window as any;
      w.__r = { made: 0, cancelAt: -1, goneAt: -1 };
      new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes) if ((n as Element).classList?.contains('press')) w.__r.made++;
      }).observe(document.body, { subtree: true, childList: true });
      addEventListener(
        'pointercancel',
        () => {
          w.__r.cancelAt = performance.now();
          const t = () => {
            if (!document.querySelector('.press')) w.__r.goneAt = performance.now();
            else requestAnimationFrame(t);
          };
          requestAnimationFrame(t);
        },
        { capture: true },
      );
    });
    await touch(page, 'touchStart', 600);
    for (let i = 1; i <= 10; i++) {
      await touch(page, 'touchMove', 600 - i * 30);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(100);
    const during = await page.locator('.press').count();
    await touch(page, 'touchEnd');
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => (window as any).__r);
    console.log(
      `SCROLLRIPPLE ${rm}: made ${r.made}, present 100 ms after the scroll began ${during}, cancel->gone ${r.goneAt < 0 ? 'n/a' : Math.round(r.goneAt - r.cancelAt)} ms`,
    );
    expect(during).toBe(0);
    // the ripple goes with the cancel (within a few frames), not after its 120 ms hold and 300 ms fade
    expect(r.goneAt - r.cancelAt).toBeLessThan(100);
    await ctx.close();
  });
}

test('R3S-1s a tap shows the ripple, ten quick taps leave none behind', async ({ page }) => {
  await open(page, '/more');
  const row = page.locator('[data-slot=item]').filter({ hasText: 'Payments' }).first();
  const rowCount = await page.locator('[data-slot=item]').count();
  const box = (await row.boundingBox())!;
  // one touch tap, sampled for the ripple while the finger is down
  await touch(page, 'touchStart', box.y + box.height / 2, box.x + 60);
  await expect(page.locator('.press')).toHaveCount(1);
  await shot(page, 'FLOW-R3S-1', 1, 'tap-ripple');
  await touch(page, 'touchEnd');
  await page.waitForTimeout(100);
  await page.goBack().catch(() => undefined);
  await open(page, '/more');
  const tabs = ['review', 'insights', 'more', 'review', 'insights', 'more', 'review', 'insights', 'more', 'review'];
  for (const k of tabs) await page.locator(`[data-k=${k}]`).click();
  await page.waitForTimeout(1200);
  expect(await page.locator('.press').count()).toBe(0);
  expect(await page.locator('[data-pressed]').count()).toBe(0);
  expect(rowCount).toBeGreaterThan(0);
});
