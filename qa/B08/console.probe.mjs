// QA B08 run 4: the console warnings and errors a screen logs, by text, on main's and this branch's
// dist-qa builds (`vite preview --outDir dist-qa` on :4175 and :4176), service worker warm, as metrics.spec
// counts them, with the CPU 4× slower and a mobile network. Usage: node qa/B08/console.probe.mjs '/review?state=empty' [runs]
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium } = require('playwright');
const path = process.argv[2] ?? '/review?state=empty';
const runs = Number(process.argv[3] ?? 3);
const browser = await chromium.launch();
for (const [side, port] of [
  ['main', 4175],
  ['head', 4176],
]) {
  for (let i = 0; i < runs; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${port}/`);
    await page.waitForTimeout(2500);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    const seen = [];
    page.on(
      'console',
      (m) => (m.type() === 'error' || m.type() === 'warning') && seen.push(`${m.type()}: ${m.text().slice(0, 200)}`),
    );
    page.on('pageerror', (e) => seen.push(`pageerror: ${e.message.slice(0, 200)}`));
    await page.goto(`http://localhost:${port}${path}`);
    await page.waitForTimeout(3000);
    console.log(`${side} #${i + 1}: ${seen.length}${seen.length ? '\n   ' + seen.join('\n   ') : ''}`);
    await ctx.close();
  }
}
await browser.close();
