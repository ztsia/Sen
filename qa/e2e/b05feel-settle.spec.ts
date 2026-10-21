import { test } from '@playwright/test';
import { open } from './b05feel-lib';

// What does a tap that changes nothing but the ripple cost in DOM mutations (the metrics' "settle")?
for (const rm of ['no-preference', 'reduce'] as const) {
  test(`mutations after a bare tap, motion ${rm}`, async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: rm, viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, serviceWorkers: 'block', baseURL: 'http://localhost:4181' });
    const page = await ctx.newPage();
    await open(page, '/more');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const w = window as any;
      w.__mut = [];
      new MutationObserver((l) => { for (const m of l) w.__mut.push([Math.round(performance.now()), m.type, (m.target as HTMLElement).className?.toString().slice(0, 30) ?? '']); }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    });
    const box = (await page.locator('[data-k=more]').boundingBox())!;
    const t0 = await page.evaluate(() => { (window as any).__t0 = performance.now(); return 0; });
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => ({ t0: (window as any).__t0, mut: (window as any).__mut }));
    const rel = m.mut.map((x: any) => [x[0] - Math.round(m.t0), x[1], x[2]]);
    console.log(`motion ${rm}: mutations (ms after tap):`, JSON.stringify(rel.slice(0, 12)), 'last at', rel.at(-1)?.[0]);
    await ctx.close();
  });
}
