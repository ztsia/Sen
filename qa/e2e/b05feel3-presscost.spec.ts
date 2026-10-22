import { test } from '@playwright/test';
import { open } from './b05feel-lib';

// How long does the pointerdown handler (ripple) hold the main thread at 4x CPU, and how long to the next frame?
for (const [name, base] of [
  ['head', 'http://localhost:4181'],
  ['main', 'http://localhost:4183'],
] as const) {
  for (const path of ['/review', '/s/payments', '/']) {
    test(`R3-20 pointerdown cost ${name} ${path}`, async ({ browser }) => {
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
      await open(page, path);
      await page.waitForTimeout(2500);
      await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(() => {
        const w = window as any;
        w.__p = [];
        window.addEventListener(
          'pointerdown',
          () => {
            w.__s = performance.now();
          },
          { capture: true },
        );
        window.addEventListener('pointerdown', () => {
          const end = performance.now();
          const s = w.__s;
          requestAnimationFrame(() => requestAnimationFrame(() => w.__p.push([end - s, performance.now() - s])));
        });
      });
      const target =
        path === '/review'
          ? page.locator('[data-review] button').first()
          : path === '/'
            ? page.locator('[data-k=insights]')
            : page.locator('main button[data-slot=item]').first();
      const box = (await target.boundingBox())!;
      for (let i = 0; i < 8; i++) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(400);
        await page.mouse.move(box.x + box.width / 2, box.y - 400);
        await page.mouse.up();
        await page.waitForTimeout(900);
      }
      const p: number[][] = await page.evaluate(() => (window as any).__p);
      const med = (k: number) => {
        const sorted = p.map((r) => r[k]!).sort((a, b) => a - b);
        return sorted[Math.floor(p.length / 2)]!.toFixed(0);
      };
      console.log(
        `PRESSCOST ${name} ${path}: handler ms median ${med(0)}, pointerdown->2nd frame median ${med(1)} (n=${p.length})`,
      );
      await ctx.close();
    });
  }
}
