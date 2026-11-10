// QA B08 run 3: More → Accounts with the CPU 4× slower (metrics flag step:balance-check/1): the time
// from the tap to the accounts' total, the long tasks in between, and the requests. Serve main's and
// this branch's dist-qa (qa-diff's builds) on two ports and pass them: node … http://127.0.0.1:5193 http://127.0.0.1:5194
import { chromium, devices } from '@playwright/test';
const browser = await chromium.launch();
for (const base of process.argv.slice(2)) {
  const out = [];
  for (let run = 0; run < 4; run++) {
    const ctx = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, serviceWorkers: 'allow', baseURL: base });
    const page = await ctx.newPage();
    await page.goto('/more?look=minted&mode=light');
    await page.waitForTimeout(2500);
    const cdp = await ctx.newCDPSession(page);
    if (process.env.FRESH) {
      // as the journey does: a fresh page on /more, throttled from its load, and the tap as soon as the row shows
      await page.close();
      const p2 = await ctx.newPage();
      const c2 = await ctx.newCDPSession(p2);
      await c2.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await p2.goto('/more?look=minted&mode=light');
      await p2.getByText('Accounts', { exact: true }).waitFor();
      const t = Date.now();
      await p2.getByText('Accounts', { exact: true }).click();
      await p2.getByText(/In \d+ accounts/).waitFor();
      out.push(`fresh: content ${Date.now() - t} ms`);
      await ctx.close();
      continue;
    }
    await page.reload();
    await page.getByText('Accounts', { exact: true }).waitFor();
    await page.waitForTimeout(800);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    await page.evaluate(() => {
      window.__lt = [];
      window.__muts = [];
      new MutationObserver((ms) => {
        const t = performance.now();
        for (const m of ms) window.__muts.push([Math.round(t), m.type, (m.target.getAttribute?.('data-slot') || m.target.tagName || '#text') + (m.attributeName ? '@' + m.attributeName : '')]);
      }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      window.__t0 = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask' });
    });
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url().replace(base, '')));
    await page.evaluate(() => (window.__t0 = performance.now()));
    const t0 = Date.now();
    await page.getByText('Accounts', { exact: true }).click();
    await page.getByText(/In \d+ accounts/).waitFor();
    const ms = Date.now() - t0;
    await page.waitForTimeout(2000);
    const muts = await page.evaluate(() => window.__muts.map(([t, k, w]) => [t - window.__t0, k, w]).filter(([t]) => t >= 0));
    const last = muts.at(-1);
    const late = muts.filter(([t]) => t > ms).map(([t, k, w]) => `${t}:${w}`);
    const uniq = [...new Set(late.map((x) => x.split(':')[1]))].slice(0, 8);
    const lt = await page.evaluate(() => window.__lt);
    out.push(`content ${ms} ms; last change ${last?.[0]} ms (${last?.[2]}); after content: ${late.length} changes ${JSON.stringify(uniq)}; long tasks ${JSON.stringify(lt)}; requests ${reqs.length ? reqs.join(' ') : 'none'}`);
    await ctx.close();
  }
  console.log(base);
  for (const o of out) console.log('  ', o);
}
await browser.close();
