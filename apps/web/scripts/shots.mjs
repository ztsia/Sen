// Full-page screenshots of screens at 390×844 in chosen looks, against a running dev server.
//   node apps/web/scripts/shots.mjs --port 5180 --out qa-artifacts/redesign/A \
//     --looks minted:light,copper:dark,line:light  home=/  txn=/s/payments@RM  settings=/s/settings
// A screen is name=path, with @text to tap the first button holding that text after load (to reach a
// screen that needs an id), and !fit to report whether it scrolls. Files are <out>/<name>-<look>-<mode>.png.
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i < 0 ? d : args.splice(i, 2)[1];
};
const port = opt('port', '5173');
const out = opt('out', 'qa-artifacts/shots');
const looks = opt('looks', 'minted:light')
  .split(',')
  .map((l) => l.split(':'));
mkdirSync(out, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
for (const spec of args) {
  const name = spec.slice(0, spec.indexOf('='));
  const rest = spec.slice(spec.indexOf('=') + 1);
  const fit = rest.endsWith('!fit');
  const [path, tap] = rest.replace(/!fit$/, '').split('@');
  for (const [look, mode] of looks) {
    await p.goto(`http://localhost:${port}${path}${path.includes('?') ? '&' : '?'}look=${look}&mode=${mode}`);
    // wait for the loading skeletons to clear, then for the drawing to settle
    await p
      .waitForFunction(() => !document.querySelector('[data-slot="skeleton"]'), null, { timeout: 15000 })
      .catch(() => {});
    await p.waitForTimeout(600);
    if (tap) {
      await p.locator('main').getByRole('button').filter({ hasText: tap }).first().click();
      await p.waitForTimeout(800);
    }
    if (fit) {
      const over = await p.evaluate(() => {
        const s = document.scrollingElement;
        const m = document.querySelector('main');
        return Math.max(s.scrollHeight - s.clientHeight, m ? m.scrollHeight - m.clientHeight : 0);
      });
      console.log(`${name} ${look} ${mode}: ${over > 0 ? `scrolls ${over}px` : 'fits'}`);
    }
    // screens scroll inside <main>, so grow the window to the content for one tall picture
    const extra = await p.evaluate(() => {
      const m = document.querySelector('main');
      return m ? Math.max(0, m.scrollHeight - m.clientHeight) : 0;
    });
    if (extra) await p.setViewportSize({ width: 390, height: 844 + extra });
    await p.screenshot({ path: `${out}/${name}-${look}-${mode}.png`, fullPage: true });
    if (extra) await p.setViewportSize({ width: 390, height: 844 });
  }
}
await b.close();
