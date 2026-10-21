import { test } from '@playwright/test';
import { recordVT, vts } from './b05feel-lib';

// How long is the page blocked (a view transition active) for each kind of change, at a 4x slower CPU? (AC-7, AC-27)
test('view transition length under 4x CPU', async ({ browser }) => {
  const ctx = await browser.newContext({
    reducedMotion: 'no-preference',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
    baseURL: 'http://localhost:4176',
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await recordVT(page);
  await page.goto('/?look=minted&mode=light');
  await page.waitForTimeout(2500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const steps: [string, () => Promise<unknown>][] = [
    ['home -> insights (tab)', () => page.locator('[data-k=insights]').click()],
    ['insights -> review (tab)', () => page.locator('[data-k=review]').click()],
    ['review -> more (tab)', () => page.locator('[data-k=more]').click()],
    ['more -> home (tab)', () => page.locator('[data-k=home]').click()],
    ['home -> insights again (tab)', () => page.locator('[data-k=insights]').click()],
  ];
  for (const [name, act] of steps) {
    const n = (await vts(page)).length;
    await act();
    await page.waitForTimeout(3500);
    const v = (await vts(page)).slice(n);
    console.log(
      name,
      JSON.stringify(
        v.map((x) => ({ types: x.types, readyMs: Math.round(x.ready ?? -1), finMs: Math.round(x.fin ?? -1) })),
      ),
    );
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await ctx.close();
});
