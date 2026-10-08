// Phone-width check of a built direction page, in light and dark: no sideways scroll, no script
// errors, and screenshots of Home's states, Sen's sheet, the tab bar and every section, to look at before
// publishing.
//   node docs/ui/directions/qa.mjs minted [out-dir]
// Needs Playwright (installed globally in cloud sessions) and network access to Google Fonts.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const load = (base) => { try { return createRequire(base)('playwright'); } catch { return null; } };
const { chromium } = load(import.meta.url) || load('/opt/node22/lib/node_modules/');
const here = path.dirname(fileURLToPath(import.meta.url));
const id = process.argv[2];
if (!id) { console.error('usage: node docs/ui/directions/qa.mjs <id> [out-dir]'); process.exit(1); }
const out = process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(), `sen-${id}-`));
fs.mkdirSync(out, { recursive: true });
// the skeleton the Artifact tool wraps a page in
const page0 = fs.readFileSync(path.join(here, `${id}.html`), 'utf8');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${page0}</body></html>`;

const browser = await chromium.launch();
let failed = false;
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const shot = (el, n) => el.screenshot({ path: path.join(out, `${scheme}-${n}.png`) });
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  await page.screenshot({ path: path.join(out, `${scheme}-0-top.png`) });
  await page.click(`#seg-view button[data-v="${scheme}"]`); await page.waitForTimeout(300);
  const phone = await page.$(`.phone-wrap[data-mode="${scheme}"]`);
  await shot(phone, '1-home');
  await page.click(`.phone-wrap[data-mode="${scheme}"] .fab`); await page.waitForTimeout(700);
  await page.click(`.phone-wrap[data-mode="${scheme}"] .chip[data-q="1"]`); await page.waitForTimeout(1500);
  await shot(phone, '2-sen-working');
  await page.waitForTimeout(3500); await shot(phone, '3-sen-answer');
  await page.click(`.phone-wrap[data-mode="${scheme}"] .close`); await page.waitForTimeout(400);
  for (const st of ['payday', 'over', 'capture']) { await page.click(`#seg-state button[data-st="${st}"]`); await page.waitForTimeout(900); await shot(phone, `4-${st}`); }
  // the tab bar: switch to Insights and back, on the phone and in its own section
  const bar = `.phone-wrap[data-mode="${scheme}"] .tabbar`;
  await page.click(`${bar} .tab[data-k="insights"]`); await page.waitForTimeout(2000); await shot(await page.$(bar), '4-tab-insights');
  await page.click(`${bar} .tab[data-k="home"]`); await page.waitForTimeout(2000);
  await page.click(`#tabs .tabdemo-wrap:last-child .tab[data-k="review"]`); await page.waitForTimeout(2000);
  for (const sec of ['sen', 'icon', 'tabs', 'charts', 'theme', 'tradeoffs']) await shot(await page.$(`#${sec}`), `5-${sec}`);
  const ok = sw <= cw && !errs.length; failed ||= !ok;
  console.log(`${id} ${scheme}: ${sw <= cw ? 'no sideways scroll' : `scrolls sideways (${sw} > ${cw})`}, ${errs.length ? errs.join('; ') : 'no errors'}`);
  await ctx.close();
}
await browser.close();
console.log(`screenshots in ${out}`);
process.exit(failed ? 1 : 0);
