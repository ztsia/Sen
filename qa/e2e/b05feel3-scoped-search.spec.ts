import { expect, test } from '@playwright/test';
import { open } from './b05feel-lib';

// Scoped re-check: the Payments search, sampled every 8 ms for 1.5 s after typing. Is a row ever under the
// sticky day header, even for a frame, on the way to the filtered list? Head against main, 1x and 4x CPU.
for (const [name, base] of [
  ['head', 'http://localhost:4181'],
  ['main', 'http://localhost:4183'],
] as const) {
  for (const rate of [1, 4]) {
    test(`R3S-4 search frames, ${name}, ${rate}x`, async ({ browser }) => {
      test.setTimeout(180_000);
      const out: { framesCovered: number; msCovered: number; finalRows: number }[] = [];
      for (let i = 0; i < 8; i++) {
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
        await open(page, '/s/payments');
        await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
        await page.waitForTimeout(1200);
        if (rate > 1) await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate });
        await page.evaluate(() => {
          const w = window as any;
          w.__s = { covered: [] as number[], rows: 0 };
          const t0 = performance.now();
          const iv = setInterval(() => {
            const t = performance.now() - t0;
            const sticky = document.querySelector('main .sticky > *') as HTMLElement | null;
            let c = 0;
            if (sticky) {
              const sr = sticky.getBoundingClientRect();
              for (const b of document.querySelectorAll('main button[data-slot=item]')) {
                const r = b.getBoundingClientRect();
                if (r.height === 0) continue;
                // the row's centre is under the sticky header's box
                const cy = r.top + r.height / 2;
                if (cy > sr.top && cy < sr.bottom) c++;
              }
            }
            if (c) w.__s.covered.push(Math.round(t));
            w.__s.rows = document.querySelectorAll('main button[data-slot=item]').length;
            if (t > 2500) clearInterval(iv);
          }, 8);
        });
        await page.getByRole('searchbox', { name: 'Search payments' }).fill('Public Bank');
        await page.waitForTimeout(2700);
        const s = await page.evaluate(() => (window as any).__s);
        const cov: number[] = s.covered;
        out.push({
          framesCovered: cov.length,
          msCovered: cov.length ? cov[cov.length - 1]! - cov[0]! : 0,
          finalRows: s.rows,
        });
        await ctx.close();
      }
      console.log(`SEARCHFRAMES ${name} ${rate}x: ${JSON.stringify(out)}`);
    });
  }
}

test('R3S-4s no match, then clear', async ({ page }) => {
  await open(page, '/s/payments');
  await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
  const full = await page.locator('main button[data-slot=item]').count();
  await page.getByRole('searchbox', { name: 'Search payments' }).fill('zzzzqq');
  await expect(page.getByText('No payments match')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search payments' }).fill('');
  await expect(page.getByText('No payments match')).toHaveCount(0);
  await expect
    .poll(() => page.locator('main button[data-slot=item]').count())
    .toBeGreaterThanOrEqual(Math.min(full, 5));
  await page.getByRole('searchbox', { name: 'Search payments' }).fill('Public Bank');
  await expect(page.getByRole('status').filter({ hasText: /payments? match/ })).toBeVisible();
  console.log('STATUS', await page.getByRole('status').filter({ hasText: /match/ }).first().textContent());
});
