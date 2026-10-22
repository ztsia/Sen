import { expect, test } from '@playwright/test';

// fix/4's settle: how long does the category sheet keep moving after the pick (4x CPU), head and main?
for (const [name, base] of [
  ['head', 'http://localhost:4181'],
  ['main', 'http://localhost:4183'],
] as const) {
  test(`category sheet settle, ${name}, 4x CPU`, async ({ browser }) => {
    test.setTimeout(60_000);
    const ctx = await browser.newContext({
      viewport: { width: 412, height: 915 },
      hasTouch: true,
      isMobile: true,
      serviceWorkers: 'block',
      baseURL: base,
      reducedMotion: 'no-preference',
    });
    const page = await ctx.newPage();
    await page.goto('/s/payments?look=minted&mode=light');
    await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
    await page.waitForTimeout(1500);
    await page.locator('main button[data-slot=item]').first().click();
    await page.waitForFunction(() => location.pathname.includes('txn'));
    await page.waitForTimeout(1500);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.RATE ?? 4) });
    const res: number[][] = [];
    for (let i = 0; i < 1; i++) {
      await page
        .locator('button')
        .filter({ hasText: /Meals|Groceries|Transport|Shopping|Drinks/i })
        .first()
        .click();
      await page.getByRole('dialog').waitFor();
      await page.waitForTimeout(1800);
      await page.evaluate(() => {
        const w = window as any;
        w.__s = [];
        const t0 = performance.now();
        w.__t0 = t0;
        const tick = () => {
          const d = document.querySelector('[role=dialog]');
          if (d) {
            const r = d.getBoundingClientRect();
            w.__s.push([Math.round(performance.now() - t0), Math.round(r.top), Math.round(r.height)]);
          }
          if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
        };
        tick();
      });
      const opts = page.getByRole('dialog').locator('button').filter({ hasNotText: /close/i });
      await opts.nth(2 + i).click();
      await page.waitForTimeout(3100);
      const s: number[][] = await page.evaluate(() => (window as any).__s);
      // last time the top or height changed by more than 1px between frames
      let last = 0;
      for (let k = 1; k < s.length; k++)
        if (Math.abs(s[k]![1]! - s[k - 1]![1]!) > 1 || Math.abs(s[k]![2]! - s[k - 1]![2]!) > 1) last = s[k]![0]!;
      res.push([last, s.length]);
      if (i === 0) console.log(name, 'samples', JSON.stringify(s.filter((_, k) => k % 6 === 0).slice(0, 40)));
      // close the follow-up sheet
      await page
        .getByRole('dialog')
        .locator('button')
        .filter({ hasText: /Just this one/ })
        .click()
        .catch(() => undefined);
      await page.waitForTimeout(1200);
    }
    console.log(`SHEET ${name}: last movement (ms after the pick), frames:`, JSON.stringify(res));
    expect(res[0]![0], 'the sheet keeps moving long after its 200 ms ease').toBeLessThan(600);
    await ctx.close();
  });
}
