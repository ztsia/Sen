// QA B08 run 2: what More → Accounts fetches on head (:4185), CPU 4× slower: each request with its time from the tap.
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
await page.goto('http://localhost:4185/s/more?look=minted&mode=light');
await page.getByRole('link', { name: /^Accounts/ }).waitFor();
await page.waitForTimeout(1200);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const t0 = Date.now();
page.on('requestfinished', (r) =>
  console.log(`${String(Date.now() - t0).padStart(5)} ms  ${r.url().split('/').pop()}`),
);
await page.getByRole('link', { name: /^Accounts/ }).click();
await page.getByText('Tracked').waitFor();
console.log(`${String(Date.now() - t0).padStart(5)} ms  the Tracked card shows`);
await b.close();
