import { test } from '@playwright/test';

// screen:new-look blockingMs 703 on the branch against 0 on main: where do the long tasks come from?
for (const [name, port] of [['main', 4175], ['branch', 4176]] as const) {
  test(`new-look long tasks on ${name}`, async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'no-preference', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block', baseURL: `http://localhost:${port}` });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.addInitScript(() => {
      (window as any).__lt = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries() as any[]) (window as any).__lt.push([Math.round(e.startTime), Math.round(e.duration), e.attribution?.[0]?.containerType ?? '']); }).observe({ type: 'longtask', buffered: true });
      (window as any).__vt = [];
      const s = document.startViewTransition?.bind(document);
      if (s) (document as any).startViewTransition = (a: any) => { (window as any).__vt.push(typeof a === 'function' ? 'fn' : JSON.stringify(a?.types ?? 'obj')); return s(a); };
    });
    await page.goto('/s/new-look?look=minted&mode=light');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.reload();
    await page.waitForTimeout(5000);
    const r = await page.evaluate(() => ({ lt: (window as any).__lt, vt: (window as any).__vt }));
    console.log(name, 'long tasks [start,dur]:', JSON.stringify(r.lt.map((x: any) => [x[0], x[1]])), 'sum>50:', r.lt.reduce((n: number, x: any) => n + Math.max(0, x[1] - 50), 0), 'VTs:', JSON.stringify(r.vt));
    await ctx.close();
  });
}
