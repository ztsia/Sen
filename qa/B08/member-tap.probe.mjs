// QA B08 run 4: Settings → Members, the tap that opens a member's sheet (members journey, step 9), timed by
// Event Timing (as the harness's firstChangeMs) on main's and this branch's dist-qa builds (:4175, :4176),
// service worker warm, CPU 4× slower. Usage: node qa/B08/member-tap.probe.mjs [runs]
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium } = require('playwright');
const runs = Number(process.argv[2] ?? 5);
const browser = await chromium.launch();
const out = { main: [], head: [] };
for (let i = 0; i < runs; i++)
  for (const [side, port] of [
    ['main', 4175],
    ['head', 4176],
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'allow',
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${port}/s/settings/members`);
    await page.waitForTimeout(2500);
    await page.addInitScript(() => {
      window.__ev = [];
      new PerformanceObserver((l) =>
        l.getEntries().forEach((e) => window.__ev.push([e.name, Math.round(e.duration), e.interactionId])),
      ).observe({ type: 'event', durationThreshold: 16, buffered: true });
    });
    await page.reload();
    await page.getByRole('button', { name: /^Hui Min/ }).waitFor();
    await page.waitForTimeout(1500);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(() => (window.__ev = []));
    await page.getByRole('button', { name: /^Hui Min/ }).click();
    await page.getByRole('button', { name: 'Remove', exact: true }).waitFor();
    await page.waitForTimeout(800);
    const ev = await page.evaluate(() => window.__ev.filter((e) => e[2] > 0));
    const max = ev.length ? Math.max(...ev.map((e) => e[1])) : 16;
    out[side].push(max);
    await ctx.close();
  }
console.log(JSON.stringify(out));
await browser.close();
