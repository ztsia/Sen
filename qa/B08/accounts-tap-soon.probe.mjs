// QA B08 run 4: More → Accounts, timed on main's and this branch's dist-qa builds (:4175, :4176), service
// worker warm, CPU 4× slower, mobile network: time to "In N accounts", the last DOM change, and the
// requests the tap makes, tapped as soon as More shows (as the journey does), listing what changes late.
// Usage: node qa/B08/accounts-tap-soon.probe.mjs [runs]
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
    await page.goto(`http://localhost:${port}/`);
    await page.waitForTimeout(2500);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 200000,
      uploadThroughput: 93750,
    });
    await page.goto(`http://localhost:${port}/more`);
    await page.getByText('Accounts', { exact: true }).waitFor();
    const cdpDone = [];
    cdp.on('Network.loadingFinished', () => cdpDone.push(Date.now() - T0));
    const reqs = [];
    const T = Date.now();
    page.on('requestfinished', (r) =>
      reqs.push(`${r.url().replace(/^https?:\/\/[^/]+\/assets\//, '')}@${Date.now() - T0}`),
    );
    let T0 = T;
    await page.evaluate(() => {
      window.__last = 0;
      window.__late = [];
      const t = performance.now();
      new MutationObserver((ms) => {
        window.__last = performance.now();
        if (window.__last - t > 600)
          for (const m of ms) {
            const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
            window.__late.push(
              `${Math.round(window.__last - t)}:${m.type}:${el?.tagName}.${(el?.getAttribute('data-slot') || el?.className || '').toString().slice(0, 40)}${m.attributeName ? '[' + m.attributeName + ']' : ''}`,
            );
          }
      }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    });
    const t0 = await page.evaluate(() => performance.now());
    T0 = Date.now();
    await page.getByText('Accounts', { exact: true }).click();
    await page.getByText(/^In \d+ accounts?$/).waitFor({ timeout: 15000 });
    const tTotal = (await page.evaluate(() => performance.now())) - t0;
    await page.waitForTimeout(2000);
    const tLast = (await page.evaluate(() => window.__last)) - t0;
    const late = await page.evaluate(() => [...new Set(window.__late)].slice(0, 8));
    out[side].push(
      `cdp loadingFinished after tap (ms): ${cdpDone.join(',')}\n  late: ${late.join(' | ')}\n  ${Math.round(tTotal)}/${Math.round(tLast)} ms, ${reqs.length} req${reqs.length ? ' (' + reqs.join(' ') + ')' : ''}`,
    );
    await ctx.close();
  }
for (const s of ['main', 'head']) console.log(s + ':\n  ' + out[s].join('\n  '));
await browser.close();
