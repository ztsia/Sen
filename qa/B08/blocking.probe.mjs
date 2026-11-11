// QA B08 run 4: a screen's main-thread blocking (the sum of each long task's time past 50 ms) on main's and
// this branch's dist-qa builds (:4175, :4176), service worker warm, CPU 4× slower, mobile network.
// Usage: node qa/B08/blocking.probe.mjs /insights [runs]
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium } = require('playwright');
const path = process.argv[2] ?? '/insights';
const runs = Number(process.argv[3] ?? 5);
const browser = await chromium.launch();
const out = { main: [], head: [] };
for (let i = 0; i < runs; i++)
  for (const [side, port] of [
    ['main', 4175],
    ['head', 4176],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${port}/`);
    await page.waitForTimeout(2500);
    await page.addInitScript(() => {
      window.__lt = [];
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({
        type: 'longtask',
        buffered: true,
      });
    });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(`http://localhost:${port}${path}`);
    await page.waitForTimeout(4000);
    const lt = await page.evaluate(() => window.__lt);
    out[side].push({
      blocking: Math.round(lt.reduce((s, d) => s + Math.max(0, d - 50), 0)),
      tasks: lt.map(Math.round),
    });
    await ctx.close();
  }
for (const s of ['main', 'head']) console.log(s, out[s].map((x) => `${x.blocking} [${x.tasks.join(',')}]`).join(' | '));
await browser.close();
