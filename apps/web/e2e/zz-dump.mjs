import { chromium, devices } from '@playwright/test';
import { uid } from '../src/data/fake/ids.ts';
const urls = process.argv.slice(2).map((u) => u.replace(/uid:([\w:.-]+)/g, (_, n) => uid(n)));
const b = await chromium.launch();
const ctx = await b.newContext({
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
});
const p = await ctx.newPage();
for (const u of urls) {
  await p.goto('http://localhost:4173' + u + (u.includes('?') ? '&' : '?') + 'look=minted&mode=light');
  await p.waitForTimeout(1200);
  const t = await p.evaluate(() => {
    const m = document.querySelector('main') ?? document.body;
    const btns = [...m.querySelectorAll('button,a,input,[role=checkbox],[role=radio],[role=switch]')].map(
      (e) =>
        `${e.tagName.toLowerCase()}[${e.getAttribute('role') || e.type || ''}] "${(e.getAttribute('aria-label') || e.textContent || e.placeholder || '').trim().slice(0, 50)}"`,
    );
    return m.innerText.replace(/\n+/g, ' | ') + '\n  CONTROLS: ' + btns.join(' ; ');
  });
  console.log('=== ' + u + '\n' + t + '\n');
}
await b.close();
