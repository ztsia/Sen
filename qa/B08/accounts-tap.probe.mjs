// QA B08 run 4: More → Accounts, timed on main's and this branch's dist-qa builds (:4175, :4176), service
// worker warm, CPU 4× slower, mobile network: time to "In N accounts", the last DOM change, and the
// requests the tap makes. Usage: node qa/B08/accounts-tap.probe.mjs [runs]
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
    await page.goto(`http://localhost:${port}/s/accounts`);
    await page.waitForTimeout(2500);
    await page.goto(`http://localhost:${port}/more`);
    await page.waitForTimeout(1500);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 200000,
      uploadThroughput: 93750,
    });
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url().replace(/^https?:\/\/[^/]+/, '')));
    await page.evaluate(() => {
      window.__last = 0;
      new MutationObserver(() => (window.__last = performance.now())).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    });
    const t0 = await page.evaluate(() => performance.now());
    await page.getByText('Accounts', { exact: true }).click();
    await page.getByText(/^In \d+ accounts?$/).waitFor({ timeout: 15000 });
    const tTotal = (await page.evaluate(() => performance.now())) - t0;
    await page.waitForTimeout(2000);
    const tLast = (await page.evaluate(() => window.__last)) - t0;
    out[side].push(
      `${Math.round(tTotal)}/${Math.round(tLast)} ms, ${reqs.length} req${reqs.length ? ' (' + reqs.slice(0, 6).join(' ') + ')' : ''}`,
    );
    await ctx.close();
  }
for (const s of ['main', 'head']) console.log(s + ':\n  ' + out[s].join('\n  '));
await browser.close();
