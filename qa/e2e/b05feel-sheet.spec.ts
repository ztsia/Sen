import { expect, test } from '@playwright/test';
import { open, recordVT, shot, vts, watch } from './b05feel-lib';

test('FLOW-9b a sheet changing step eases its height; a sheet moves no screen (AC-5, AC-17)', async ({ page }) => {
  const errors = watch(page);
  await recordVT(page, false);
  await page.addInitScript(() => {
    const w = window as any;
    w.__ro = [];
    w.__anim = [];
    const o = ResizeObserver.prototype.observe;
    ResizeObserver.prototype.observe = function (t: Element, ...a: any[]) {
      w.__ro.push((t as HTMLElement).className.toString().slice(0, 40));
      return o.call(this, t, ...a);
    };
    const an = Element.prototype.animate;
    Element.prototype.animate = function (kf: any, opt: any) {
      w.__anim.push(JSON.stringify(kf) + JSON.stringify(opt) + (this as HTMLElement).getAttribute('role'));
      return an.call(this, kf, opt);
    };
  });
  await open(page, '/s/payments');
  await page.locator('[data-share]').first().click();
  await expect(page).toHaveURL(/\/s\/txn/);
  await page.waitForTimeout(500);
  const before = (await vts(page)).length;
  // the category fact opens the category sheet
  const cat = page
    .locator('button')
    .filter({ hasText: /Meals|Groceries|Transport|Shopping|Bills|Drinks|Health|Fun|Other/i })
    .first();
  console.log(
    'cat buttons',
    await page
      .locator('button')
      .filter({ hasText: /Meals|Groceries|Transport|Shopping|Bills|Drinks|Health|Fun|Other/i })
      .count(),
  );
  await cat.click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await page.waitForTimeout(600);
  await shot(page, 'FLOW-9', 3, 'category-sheet');
  const h0 = await dlg.evaluate((e) => e.getBoundingClientRect().height);
  await page.evaluate(() => {
    const d = document.querySelector('[role=dialog]')!;
    const w = window as any;
    w.__h = [];
    const t0 = performance.now();
    const tick = () => {
      w.__h.push([Math.round(performance.now() - t0), Math.round(d.getBoundingClientRect().height)]);
      requestAnimationFrame(tick);
    };
    tick();
  });
  console.log(
    'dialog anims before click',
    await page.evaluate(() => {
      const d = document.querySelector('[role=dialog]') as HTMLElement;
      return JSON.stringify({
        n: d.getAnimations().length,
        names: d.getAnimations().map((a: any) => a.animationName ?? a.transitionProperty),
        cls: d.className.slice(0, 200),
        style: d.getAttribute('style'),
      });
    }),
  );
  const opts = dlg.locator('button').filter({ hasNotText: /close/i });
  const n = await opts.count();
  console.log('sheet buttons', n, 'h0', h0);
  // pick the last option (not the current one)
  await opts.nth(n - 1).click();
  await page.waitForTimeout(500);
  const hs = await page.evaluate(() => (window as any).__h as number[][]);
  const heights = [...new Set(hs.map((x) => x[1]))];
  console.log(
    'RO observed',
    JSON.stringify(await page.evaluate(() => (window as any).__ro)),
    'animate calls',
    JSON.stringify(await page.evaluate(() => (window as any).__anim)),
  );
  console.log('heights seen', JSON.stringify(heights));
  expect(heights.length, 'a sheet changing step passes through in-between heights (AC-17)').toBeGreaterThan(2);
  await shot(page, 'FLOW-9', 4, 'category-sheet-step2');
  console.log('vts during sheet', (await vts(page)).length - before);
  expect((await vts(page)).length - before).toBe(0);
  await page.goBack();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});
