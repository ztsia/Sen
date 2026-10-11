import { chromium, devices } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { uid } from '../src/data/fake/ids.ts';
const paths = process.argv.slice(2).map((u) => u.replace(/uid:([\w:.-]+)/g, (_, n) => uid(n)));
const b = await chromium.launch();
const ctx = await b.newContext({
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  serviceWorkers: 'block',
});
const p = await ctx.newPage();
p.setDefaultTimeout(8000);
for (const u of paths) {
  const t0 = Date.now();
  try {
    await p.goto('http://localhost:4173' + u + (u.includes('?') ? '&' : '?') + 'look=minted&mode=light');
    await p.waitForTimeout(600);
    const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    console.log(
      Date.now() - t0,
      u,
      r.violations.map((v) => v.id + ':' + v.nodes.map((n) => n.target.join(' ')).join(',')).join(' | '),
    );
  } catch (e) {
    console.log('ERR', u, e.message.split('\n')[0]);
  }
}
await b.close();
