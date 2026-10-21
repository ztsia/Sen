import { test } from '@playwright/test';

// step:ask/3 (Insights tab tapped from Home, 4x CPU): when does the DOM stop mutating, branch vs main?
let n = 0;
for (const [name, port] of [['main', 4175], ['branch', 4176], ['main', 4175], ['branch', 4176], ['main', 4175], ['branch', 4176]] as const) {
  n++;
  test(`insights tab mutations on ${name} #${n}`, async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'no-preference', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block', baseURL: `http://localhost:${port}` });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto('/?look=minted&mode=light');
    await page.waitForTimeout(2500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(() => {
      const w = window as any;
      w.__mut = [];
      new MutationObserver((l) => { for (const m of l) w.__mut.push([Math.round(performance.now()), (m.target as HTMLElement).className?.toString().slice(0, 25) ?? '']); }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      w.__t0 = performance.now();
    });
    await page.locator('[data-k=insights]').click();
    await page.waitForTimeout(4000);
    const m = await page.evaluate(() => ({ t0: (window as any).__t0, mut: (window as any).__mut as [number, string][] }));
    const rel = m.mut.map((x) => [Math.round(x[0] - m.t0), x[1]] as const);
    const last = rel.at(-1);
    const late = rel.filter((x) => x[0] > 600).slice(0, 4);
    console.log(`${name}: ${rel.length} mutations, last at ${last?.[0]} ms (${last?.[1]}); first late: ${JSON.stringify(late)}`);
    await ctx.close();
  });
}
