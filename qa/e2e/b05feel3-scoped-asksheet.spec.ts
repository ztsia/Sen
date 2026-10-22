import { test } from '@playwright/test';
import { open } from './b05feel-lib';

let n = 0;
// Is the sheet-open delay specific to Review's chip? Same measurement for Ask Sen on Home and the Home figure's sheet.
for (const [name, base] of [
  ['head', 'http://localhost:4181'],
  ['no-ref probe', 'http://localhost:4184'],
  ['main', 'http://localhost:4183'],
  ['head', 'http://localhost:4181'],
  ['no-ref probe', 'http://localhost:4184'],
  ['main', 'http://localhost:4183'],
] as const) {
  for (const target of ['ask'] as const) {
    test(`R3S-3 ${target} sheet open ${name} 4x (${base.slice(-4)}, round ${n++})`, async ({ browser }) => {
      test.setTimeout(240_000);
      const res: number[] = [];
      for (let i = 0; i < 14; i++) {
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
        await open(page, '/');
        await page.waitForTimeout(2500);
        await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await page.evaluate(() => {
          const w = window as any;
          w.__m = { down: 0, dialog: 0 };
          addEventListener(
            'pointerdown',
            (e) => {
              w.__m.down = e.timeStamp;
              const tick = () => {
                if (document.querySelector('[role=dialog]') && !w.__m.dialog) w.__m.dialog = performance.now();
                if (!w.__m.dialog && performance.now() - e.timeStamp < 3000) requestAnimationFrame(tick);
              };
              tick();
            },
            { capture: true },
          );
        });
        if (target === 'ask') await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
        else await page.locator('main [data-sen]').first().click();
        await page.waitForTimeout(1500);
        const m = await page.evaluate(() => (window as any).__m);
        res.push(Math.round(m.dialog - m.down));
        await ctx.close();
      }
      const med = [...res].sort((a, b) => a - b)[7];
      console.log(`ASKSHEET ${target} ${name}: median ${med}; ${JSON.stringify(res)}`);
    });
  }
}
