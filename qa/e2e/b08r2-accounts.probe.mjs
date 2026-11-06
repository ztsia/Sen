// QA B08 run 2: More → Accounts, head (:4185) against main (:4186), CPU 4× slower (metrics flag
// step:balance-check/1). Times the tap to the total showing, and a CPU profile's top self time.
import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const [name, o] of [
  ['head', 'http://localhost:4185'],
  ['main', 'http://localhost:4186'],
])
  for (let i = 0; i < 3; i++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(`${o}/s/more?look=minted&mode=light`);
    await page.getByRole('link', { name: /^Accounts/ }).waitFor();
    await page.waitForTimeout(1200);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Profiler.start');
    const t0 = Date.now();
    await page.getByRole('link', { name: /^Accounts/ }).click();
    await page.getByText(/^In \d+ accounts$/).waitFor();
    const t = Date.now() - t0;
    const { profile } = await cdp.send('Profiler.stop');
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const self = new Map();
    profile.samples.forEach((id, k) => {
      const n = byId.get(id);
      const key = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}`;
      self.set(key, (self.get(key) ?? 0) + (profile.timeDeltas[k] ?? 0) / 1000);
    });
    const top = [...self]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k} ${v.toFixed(0)}`)
      .join('; ');
    console.log(`${name} #${i + 1}: tap → total ${t} ms | ${top}`);
    await ctx.close();
  }
await b.close();
