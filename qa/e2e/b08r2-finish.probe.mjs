// QA B08 run 2: where the 1.2 s after first run's Finish goes (metrics flag step:first-run/18). Fake
// preview on :4185, CPU 4× slower as qa-diff measures; a CPU profile from the tap until Home settles,
// self time summed by function.
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const o = 'http://localhost:4185';
await page.goto(`${o}/s/first-run?scenario=new&look=minted&mode=light`);
await page.getByLabel('Your email').fill('weiming@example.com');
await page.getByRole('button', { name: 'Send the code' }).click();
await page.getByLabel('6-digit code').fill('123456');
await page.getByRole('button', { name: 'Sign in', exact: true }).click();
await page.getByText('Step 2 of 7').waitFor();
const choose = page.getByRole('button', { name: /^Choose these \d+$/ });
if (await choose.count()) await choose.click();
await page.getByRole('button', { name: 'Next' }).click();
await page.getByText('Step 3 of 7').waitFor();
await page.getByRole('button', { name: 'Skip for now' }).click();
await page.getByText('Step 4 of 7').waitFor();
await page.getByRole('button', { name: 'Skip for now' }).click();
await page.getByText('Step 5 of 7').waitFor();
for (const el of await page.locator('main input[inputmode="numeric"]').all()) {
  await el.click();
  await page.keyboard.type('100');
}
await page.getByRole('button', { name: 'Next' }).click();
await page.getByText('Step 6 of 7').waitFor();
await page.getByLabel('Your name').fill('tan wei ming');
await page.getByRole('button', { name: 'Next' }).click();
await page.getByText('Step 7 of 7').waitFor();
await page.waitForTimeout(800);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
const t0 = Date.now();
await page.getByRole('button', { name: 'Finish' }).click();
await page.waitForURL((u) => !u.pathname.includes('first-run'));
const tNav = Date.now() - t0;
await page.getByTestId('hero').waitFor();
const tHero = Date.now() - t0;
await page.waitForTimeout(600);
const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => {
  const n = byId.get(id);
  const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`;
  self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0) / 1000);
});
console.log(`tap → left first-run: ${tNav} ms; tap → Home's figure: ${tHero} ms`);
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 14))
  console.log(`${v.toFixed(0).padStart(6)} ms  ${k}`);
await b.close();
