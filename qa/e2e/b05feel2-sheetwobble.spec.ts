import { expect, test } from '@playwright/test';
import { shot } from './b05feel-lib';

// The category sheet after a pick: what calls Element.animate on the sheet, and when?
test('category sheet: the animate() calls after a pick, and frames', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const w = window as any;
    w.__anim = [];
    const o = Element.prototype.animate;
    Element.prototype.animate = function (kf: any, opt: any) {
      if ((this as Element).getAttribute?.('role') === 'dialog' || (this as Element).matches?.('[data-vaul-drawer]'))
        w.__anim.push([
          Math.round(performance.now() - (w.__t0 ?? 0)),
          JSON.stringify(kf.map((k: any) => k.height)),
          (this as Element).getBoundingClientRect().height | 0,
        ]);
      return o.call(this, kf, opt);
    };
  });
  await page.goto('/s/payments?look=minted&mode=light');
  await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
  await page.waitForTimeout(1200);
  await page.locator('main button[data-slot=item]').first().click();
  await page.waitForFunction(() => location.pathname.includes('txn'));
  await page.waitForTimeout(1200);
  await page
    .locator('button')
    .filter({ hasText: /Meals|Groceries|Transport|Shopping|Drinks/i })
    .first()
    .click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(1500);
  await page.evaluate(() => (((window as any).__t0 = performance.now()), ((window as any).__anim = [])));
  await page.getByRole('dialog').locator('button').filter({ hasNotText: /close/i }).nth(2).click();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(i === 0 ? 120 : 450);
    await shot(page, 'FLOW-R2-9', i + 1, `sheet-after-pick-${i}`);
  }
  console.log(
    'ANIMATE calls on the sheet [ms, heights, current height]:',
    JSON.stringify(await page.evaluate(() => (window as any).__anim)),
  );
  const calls = await page.evaluate(() => (window as any).__anim.length);
  expect(calls, 'a sheet resize is one animation, not one per frame').toBeLessThanOrEqual(3);
});
