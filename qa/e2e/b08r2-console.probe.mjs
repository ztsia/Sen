// QA B08 run 2 (as qa-diff opens a screen: the service worker warm, the CPU 4× slower): the console messages a screen logs on open, head (:4185) against main (:4186), each 3 times.
import { chromium } from '@playwright/test';
const paths = process.argv.slice(2);
const b = await chromium.launch();
for (const [name, origin] of [
  ['head', 'http://localhost:4185'],
  ['main', 'http://localhost:4186'],
])
  for (const p of paths)
    for (let i = 0; i < 3; i++) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
      const warm = await ctx.newPage();
      await warm.goto(origin + '/?look=minted&mode=light');
      await warm.waitForTimeout(2500);
      await warm.close();
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const msgs = [];
      page.on(
        'console',
        (m) => (m.type() === 'error' || m.type() === 'warning') && msgs.push(`${m.type()}: ${m.text().slice(0, 220)}`),
      );
      page.on('pageerror', (e) => msgs.push(`pageerror: ${String(e).slice(0, 220)}`));
      await page.goto(origin + p + (p.includes('?') ? '&' : '?') + 'look=minted&mode=light');
      await page.waitForTimeout(2500);
      console.log(`${name} ${p} #${i + 1}: ${msgs.length}`, msgs.join(' | '));
      await ctx.close();
    }
await b.close();
