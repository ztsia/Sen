import { test } from '@playwright/test';
import { open } from './b05feel-lib';

// How long after a tap does the new screen show up (DOM commit), under a 4x slower CPU, motion on vs reduced (AC-27)
for (const rm of ['no-preference', 'reduce'] as const) {
  test(`push latency, motion ${rm}`, async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: rm, viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, serviceWorkers: 'block', baseURL: 'http://localhost:4181' });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await open(page, '/s/payments');
    // warm up once
    await page.locator('[data-share]').first().click();
    await page.waitForTimeout(800);
    await page.goBack();
    await page.waitForTimeout(800);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const out: number[] = [];
    for (let i = 0; i < 6; i++) {
      const ms = await page.evaluate(
        (i) =>
          new Promise<number>((res) => {
            const el = document.querySelectorAll<HTMLElement>('[data-share]')[i];
            const t0 = performance.now();
            const poll = () => {
              if (location.pathname.includes('/s/txn') && document.querySelector('[data-share-figure]')) res(performance.now() - t0);
              else requestAnimationFrame(poll);
            };
            el.click();
            poll();
          }),
        i,
      );
      out.push(Math.round(ms));
      await page.waitForTimeout(900);
      await page.goBack();
      await page.waitForTimeout(900);
    }
    console.log(`motion ${rm}: click -> txn figure in the DOM (ms, 4x CPU):`, JSON.stringify(out));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await ctx.close();
  });
}
