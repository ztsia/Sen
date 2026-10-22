import { test } from '@playwright/test';
import { open } from './b05feel-lib';

// Where do the extra ~100 ms of opening the category sheet go at 4x CPU? A CPU profile of one tap, head and main.
for (const [name, base] of [
  ['head', 'http://localhost:4181'],
  ['main', 'http://localhost:4183'],
] as const) {
  test(`R3-20 profile of the Other… tap (${name})`, async ({ browser }) => {
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
    await open(page, '/review');
    await page.waitForFunction(() => document.querySelector('[data-review]'));
    await page.waitForTimeout(2500);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Profiler.start');
    await page
      .locator('[data-review] button', { hasText: /^Other/ })
      .first()
      .click();
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(800);
    const { profile } = (await cdp.send('Profiler.stop')) as any;
    const byId = new Map<number, any>(profile.nodes.map((n: any) => [n.id, n]));
    const self = new Map<string, number>();
    const dt: number[] = profile.timeDeltas;
    profile.samples.forEach((id: number, i: number) => {
      const n = byId.get(id);
      const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`;
      self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0) / 1000);
    });
    const parent = new Map<number, number>();
    for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
    const callers = new Map<string, number>();
    profile.samples.forEach((id: number, i: number) => {
      const n = byId.get(id);
      if (n.callFrame.functionName !== 'getBoundingClientRect') return;
      const chain: string[] = [];
      let c = parent.get(id);
      while (c && chain.length < 4) {
        const f = byId.get(c).callFrame;
        chain.push(`${f.functionName || 'anon'}@${f.url.split('/').pop()}:${f.lineNumber}:${f.columnNumber}`);
        c = parent.get(c);
      }
      const k = chain.join(' < ');
      callers.set(k, (callers.get(k) ?? 0) + (dt[i] ?? 0) / 1000);
    });
    console.log(`GBCR ${name}: ` + JSON.stringify([...callers.entries()].map(([k, v]) => `${v.toFixed(0)}ms ${k}`)));
    const top = [...self.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([k, v]) => `${v.toFixed(0)}ms ${k}`);
    console.log(`PROFILE ${name}:\n  ` + top.join('\n  '));
    await ctx.close();
  });
}
