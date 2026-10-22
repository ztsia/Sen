import { expect, test } from '@playwright/test';
import { open, shot } from './b05feel-lib';
import { uid } from '../../apps/web/src/data/fake/ids';

// Who had this? sheet: the error appears (grows), then a name is typed and Add pressed again (changes
// again, closes). Every frame's sheet height, at 1x and 4x: does it ease, end at one height, stop quickly?
for (const [name, base] of [
  ['head', 'http://localhost:4181'],
  ['main', 'http://localhost:4183'],
] as const) {
  for (const rate of [1, 4]) {
    test(`R3S-3 who-had-this sheet heights, ${name}, ${rate}x`, async ({ browser }) => {
      test.setTimeout(120_000);
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        serviceWorkers: 'block',
        baseURL: base,
        reducedMotion: 'no-preference',
      });
      const page = await ctx.newPage();
      await open(page, `/s/split?id=${uid('split:nk')}`);
      await page.getByRole('button', { name: 'Someone else…' }).click();
      const dlg = page.getByRole('dialog', { name: 'Who had this?' });
      await dlg.waitFor();
      await page.waitForTimeout(1200);
      if (rate > 1) await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate });
      await page.evaluate(() => {
        const w = window as any;
        w.__h = [];
        const t0 = performance.now();
        const step = () => {
          const d = document.querySelector('[role=dialog]');
          if (d) w.__h.push([Math.round(performance.now() - t0), Math.round(d.getBoundingClientRect().height)]);
          if (performance.now() - t0 < 3500) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      await dlg.getByRole('button', { name: 'Add' }).click();
      await expect(page.getByText("Type your friend's name.")).toBeVisible();
      await page.waitForTimeout(500);
      await dlg.getByLabel("Friend's name").fill('Zul');
      await page.waitForTimeout(500);
      const s: number[][] = await page.evaluate(() => (window as any).__h);
      const hs = s.map((x) => x[1]!);
      // moves: frames where height changed by >1px
      const moves = s.filter((x, i) => i > 0 && Math.abs(x[1]! - s[i - 1]![1]!) > 1);
      const lastMove = moves.length ? moves[moves.length - 1]![0]! : 0;
      console.log(
        `SHEETHEIGHTS ${name} ${rate}x: distinct ${new Set(hs).size}, first ${hs[0]}, final ${hs[hs.length - 1]}, frames moving ${moves.length}, last move at ${lastMove} ms; sample ${JSON.stringify(s.filter((_, i) => i % 12 === 0).slice(0, 14))}`,
      );
      if (name === 'head' && rate === 1) await shot(page, 'FLOW-R3S-2', 1, 'who-had-this-after-error');
      await ctx.close();
    });
  }
}

test('R3S-3 a sheet that opens already tall does not animate on open (baseline)', async ({ page }) => {
  await open(page, '/s/payments');
  await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
  await page.locator('main button[data-slot=item]').first().click();
  await expect(page).toHaveURL(/\/s\/txn/);
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const w = window as any;
    w.__a = 0;
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (...a: any[]) {
      if ((this as Element).getAttribute('role') === 'dialog' || (this as Element).closest('[role=dialog]')) w.__a++;
      return (orig as any).apply(this, a);
    };
  });
  await page
    .locator('button')
    .filter({ hasText: /Meals|Groceries|Transport|Shopping|Bills|Drinks|Health|Fun|Other/i })
    .first()
    .click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(900);
  const onOpen = await page.evaluate(() => (window as any).__a);
  console.log('SHEETBASELINE animate() calls on open:', onOpen);
  expect(onOpen).toBe(0);
});
