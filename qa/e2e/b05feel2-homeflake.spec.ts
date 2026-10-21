import { expect, test } from '@playwright/test';
import { open, recordVT } from './b05feel-lib';

// Is the Home tab from a pushed screen unreliable (apps/web/e2e/motion.spec.ts fails ~10% under load)?
test('Home from Payments (More -> Payments -> Home), cold context each time, with history traced', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  let bad = 0;
  for (let i = 0; i < Number(process.env.N ?? 40); i++) {
    const ctx = await browser.newContext({
      viewport: { width: 412, height: 915 },
      hasTouch: true,
      isMobile: true,
      serviceWorkers: 'block',
      baseURL: process.env.BASE ?? 'http://localhost:4181',
      reducedMotion: 'no-preference',
    });
    const page = await ctx.newPage();
    await recordVT(page, false);

    await page.addInitScript(() => {
      const w = window as any;
      w.__h = [];
      for (const m of ['go', 'back', 'forward', 'pushState', 'replaceState'] as const) {
        const o = (history as any)[m].bind(history);
        (history as any)[m] = (...a: any[]) => {
          w.__h.push(
            `${Math.round(performance.now())} ${m}(${a.map((x) => (typeof x === 'object' ? 'state' : x)).join(',')}) at ${location.pathname} idx=${history.state?.__TSR_index}`,
          );
          return o(...a);
        };
      }
      new MutationObserver(() => {
        const m = document.querySelector('[data-k=more][aria-current=page]');
        if (m && !w.__moreAt) {
          w.__moreAt = 1;
          w.__h.push(`${Math.round(performance.now())} DOM: More tab is current`);
        }
      }).observe(document, { subtree: true, attributes: true, childList: true });
      addEventListener('popstate', () =>
        w.__h.push(
          `${Math.round(performance.now())} popstate -> ${location.pathname} idx=${history.state?.__TSR_index}`,
        ),
      );
    });
    if (process.env.RATE) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.RATE) });
    }
    await page.goto('/?look=minted&mode=light');
    await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
    if (process.env.SETTLE) await page.waitForTimeout(Number(process.env.SETTLE));
    await page.evaluate(() => ((window as any).__h = []));
    await page.locator('[data-k=more]').click();
    await page.locator('[data-slot=item]').filter({ hasText: 'Payments' }).first().click();
    await page.locator('main button[data-slot=item]:has-text("RM")').first().waitFor();
    await page.evaluate(() => (window as any).__h.push(`${Math.round(performance.now())} --- tapping Home`));
    await page.locator('[data-k=home]').click();
    await page.waitForTimeout(1200);
    const url = new URL(page.url()).pathname;
    if (url !== '/') {
      bad++;
      console.log('BAD', i, url, JSON.stringify(await page.evaluate(() => (window as any).__h), null, 1));
    }
    await ctx.close();
  }
  console.log('bad runs', bad, 'of', process.env.N ?? 40);
  expect(bad, 'the Home tab landed on More instead of Home').toBe(0);
});
