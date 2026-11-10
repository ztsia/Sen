// QA B08 run 3: a screen's long tasks on load, main against this branch (metrics flag
// screen:settings/capture/access@capture-off). Same serving as b08r3-accounts-open.probe.mjs.
import { chromium, devices } from '@playwright/test';
const path = process.env.QA_PATH ?? '/s/settings/capture/access?scenario=capture-off';
const browser = await chromium.launch();
for (const base of process.argv.slice(2)) {
  const sums = [];
  for (let run = 0; run < 5; run++) {
    const ctx = await browser.newContext({
      ...devices['Pixel 7'],
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'allow',
      baseURL: base,
    });
    await ctx.addInitScript(() => {
      window.__lt = [];
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({
        type: 'longtask',
        buffered: true,
      });
    });
    const warm = await ctx.newPage();
    await warm.goto('/?look=minted&mode=light');
    await warm.waitForTimeout(2500);
    await warm.close();
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(`${path}${path.includes('?') ? '&' : '?'}look=minted&mode=light`);
    await page.waitForTimeout(4000);
    const lt = await page.evaluate(() => window.__lt);
    sums.push(`${lt.reduce((n, d) => n + Math.max(0, d - 50), 0)} ms ${JSON.stringify(lt)}`);
    await ctx.close();
  }
  console.log(base);
  for (const s of sums) console.log('  ', s);
}
await browser.close();
