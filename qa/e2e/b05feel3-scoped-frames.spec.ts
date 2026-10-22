import { test } from '@playwright/test';
import { open } from './b05feel-lib';

// Every rendered frame after typing into the Payments search (rAF): is any row's centre under something
// that isn't the row (the sticky day header)? The journey's `covered` check caught this on head, never on main.
for (const [name, base] of [
  ['head', 'http://localhost:4181'],
  ['main', 'http://localhost:4183'],
] as const) {
  test(`R3S-4 covered rows per frame, ${name}`, async ({ browser }) => {
    test.setTimeout(240_000);
    const out: any[] = [];
    for (let i = 0; i < 25; i++) {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        serviceWorkers: 'block',
        baseURL: base,
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      await open(page, '/more');
      await page.getByText('Payments', { exact: true }).click();
      await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const w = window as any;
        w.__f = { bad: [] as any[], frames: 0 };
        const t0 = performance.now();
        const step = () => {
          w.__f.frames++;
          for (const b of document.querySelectorAll('main button[data-slot=item]')) {
            const r = b.getBoundingClientRect();
            if (!r.height || r.bottom < 0 || r.top > innerHeight) continue;
            const top = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
            if (top && top !== b && !b.contains(top) && top.closest('.sticky')) {
              w.__f.bad.push([
                Math.round(performance.now() - t0),
                Math.round(r.top),
                String(top.closest('.sticky')?.className).slice(0, 30),
                (b.textContent || '').slice(0, 20),
              ]);
              break;
            }
          }
          if (performance.now() - t0 < 1500) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      await page.getByRole('searchbox', { name: 'Search payments' }).fill('Public Bank');
      await page.waitForTimeout(1700);
      const f = await page.evaluate(() => (window as any).__f);
      out.push({ frames: f.frames, bad: f.bad.length, first: f.bad[0] });
      await ctx.close();
    }
    const n = out.filter((o) => o.bad).length;
    console.log(
      `COVEREDFRAMES ${name}: runs with a covered row ${n} of ${out.length}; samples ${JSON.stringify(out.filter((o) => o.bad).slice(0, 3))}`,
    );
  });
}
