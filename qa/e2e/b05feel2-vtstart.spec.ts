import { test } from '@playwright/test';

// What a push costs at the start: from the tap to the first frame showing the new screen, on head and on main,
// with the CPU 4x slower (brief 6: no transition delays a tap's first visible change past 100 ms).
for (const [name, base] of [
  ['head', 'http://localhost:4181'],
  ['main', 'http://localhost:4183'],
] as const) {
  test(`tap to first frame of the new screen, ${name}, 4x CPU`, async ({ browser }) => {
    test.setTimeout(240_000);
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
    // once to warm the chunk, then measure
    await page.locator('main button[data-slot=item]').first().click();
    await page.waitForFunction(() => location.pathname.includes('txn'));
    await page.waitForTimeout(1200);
    await page.goBack();
    await page.waitForTimeout(1200);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const out: number[] = [];
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => {
        const w = window as any;
        w.__t0 = 0;
        w.__first = 0;
        addEventListener('pointerdown', () => (w.__t0 = performance.now()), { once: true, capture: true });
        const poll = () => {
          if (
            w.__t0 &&
            !w.__first &&
            location.pathname.includes('txn') &&
            document.querySelector('[aria-label=Back]') &&
            !document.querySelector('.press ~ *, h1')?.textContent?.includes('Payments')
          )
            w.__first = performance.now();
          if (!w.__first) requestAnimationFrame(poll);
        };
        poll();
      });
      await page.locator('main button[data-slot=item]').nth(i).click();
      await page.waitForFunction(() => (window as any).__first, null, { timeout: 20000 });
      out.push(Math.round(await page.evaluate(() => (window as any).__first - (window as any).__t0)));
      await page.waitForTimeout(900);
      await page.goBack();
      await page.waitForTimeout(900);
    }
    console.log(`PUSH ${name} tap->new screen first frame (ms) at 4x:`, JSON.stringify(out));
    await ctx.close();
  });
}
