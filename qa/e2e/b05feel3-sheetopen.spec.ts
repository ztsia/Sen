import { test } from '@playwright/test';
import { open } from './b05feel-lib';

// hawker/1 (a Review chip's sheet) and ask/2 are flagged 140 ms slower than main at 4x CPU. Is it the
// ripple, the view-transition machinery, or the sheet? Tap -> first frame the dialog exists / moved.
const cases = [
  ['head motion on', 'http://localhost:4181', 'no-preference'],
  ['head reduced', 'http://localhost:4181', 'reduce'],
  ['probe: no first measure in useSheetResize', 'http://localhost:4184', 'no-preference'],
  ['main motion on', 'http://localhost:4183', 'no-preference'],
] as const;
for (const [name, base, rm] of cases) {
  test(`R3-20 Review "Other…" chip: tap to sheet (${name})`, async ({ browser }) => {
    test.setTimeout(240_000);
    const res: number[][] = [];
    for (let i = 0; i < 8; i++) {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        serviceWorkers: 'block',
        baseURL: base,
        reducedMotion: rm,
      });
      const page = await ctx.newPage();
      await open(page, '/review');
      await page.waitForFunction(() => document.querySelector('[data-review]'));
      await page.waitForTimeout(1500);
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(() => {
        const w = window as any;
        w.__m = { down: 0, firstFrameAfterDown: 0, dialog: 0, moved: 0 };
        addEventListener(
          'pointerdown',
          (e) => {
            w.__m.down = e.timeStamp;
            requestAnimationFrame(() => requestAnimationFrame(() => (w.__m.firstFrameAfterDown = performance.now())));
            const tick = () => {
              const d = document.querySelector('[role=dialog]');
              if (d && !w.__m.dialog) w.__m.dialog = performance.now();
              if (d && !w.__m.moved && d.getBoundingClientRect().top < innerHeight - 40)
                w.__m.moved = performance.now();
              if (performance.now() - e.timeStamp < 3000) requestAnimationFrame(tick);
            };
            tick();
          },
          { capture: true },
        );
      });
      const chip = page.locator('[data-review] button', { hasText: /^Other/ }).first();
      await chip.click();
      await page.waitForTimeout(2500);
      const m = await page.evaluate(() => (window as any).__m);
      res.push([
        Math.round(m.firstFrameAfterDown - m.down),
        Math.round(m.dialog - m.down),
        Math.round(m.moved - m.down),
      ]);
      await ctx.close();
    }
    const med = (k: number) => res.map((r) => r[k]!).sort((a, b) => a - b)[Math.floor(res.length / 2)];
    console.log(
      `SHEETOPEN ${name}: [pointerdown->2nd frame, ->dialog in DOM, ->dialog moving] median ${med(0)}, ${med(1)}, ${med(2)}; all ${JSON.stringify(res)}`,
    );
  });
}
