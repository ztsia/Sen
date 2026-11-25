// Saves a still of Sen's avatar in each of its eight states (D76), drawn by the look's own code, as
// avatars.json, so build.mjs needs no packages and no canvas. It loads the look's page from
// docs/ui/directions/ in a headless Chromium with the network off, and calls DIR.avatar.draw on a
// fresh canvas at each size the chat uses. Run it again if a look's avatar changes.
//   NODE_PATH=/opt/node22/lib/node_modules node docs/ui/sen-chat/design-src/avatars.mjs [contact-sheet.png]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const dirs = path.join(here, '../../directions');

export const LOOKS = ['minted', 'copper'];
export const SIZES = [22, 24, 36, 56]; // jump-to-latest, the head row and a card, the header, the page's legend
// One still per state, at the moment that shows the state best (the engine's time, in seconds).
// Minted: the rope at its widest weave while working, the lace at full swing while answering, the
// note's bead at the upper right, the flash of done. Copper: mid-flip, on edge, rocking.
export const STILLS = {
  minted: { resting: 2.2, note: 0.24, listening: 2.2, thinking: 0.98, helpers: 0.98, speaking: 0.22, paused: 2.2, done: 3.0 },
  copper: { resting: 2.2, note: 0.5, listening: 2.2, thinking: 0.36, helpers: 0.6, speaking: 0.24, paused: 2.2, done: 0.3 },
};
const DPR = 3;
const font = (file) => fs.readFileSync(path.join(dirs, 'assets/fonts', file)).toString('base64');
const FONTS = `<style>@font-face { font-family: Archivo; font-weight: 100 900; font-stretch: 62% 125%; src: url(data:font/woff2;base64,${font('archivo/archivo-normal-100-900-62-125-latin.woff2')}) format("woff2"); }</style>`;

const browser = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
const out = {};
const sheet = [];
for (const look of LOOKS) {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.route('**/*', (r) => (r.request().url().startsWith('data:') ? r.continue() : r.abort()));
  const html = fs.readFileSync(path.join(dirs, `${look}.html`), 'utf8');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONTS}</head><body>${html}</body></html>`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.load('700 20px Archivo'));
  await page.waitForTimeout(400);
  out[look] = await page.evaluate(({ stills, sizes, dpr }) => {
    const res = {};
    for (const [state, t] of Object.entries(stills)) {
      res[state] = {};
      for (const s of sizes) {
        const c = document.createElement('canvas'); c.width = s * dpr; c.height = s * dpr; c.dataset.size = s; c.dataset.state = state;
        document.body.append(c);
        const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        DIR.avatar.draw(ctx, s, t, state, 'light'); // eslint-disable-line no-undef
        res[state][s] = c.toDataURL('image/png'); c.remove();
      }
    }
    return res;
  }, { stills: STILLS[look], sizes: SIZES, dpr: DPR });
  sheet.push(`<p>${look}</p>${Object.entries(out[look]).map(([st, by]) => `<figure><img src="${by[56]}" width="112"><img src="${by[24]}" width="24"><figcaption>${st}</figcaption></figure>`).join('')}`);
  await page.close();
}
if (process.argv[2]) {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1100, height: 420 } });
  await page.setContent(`<body style="font:13px system-ui;background:#fbfcfc;display:flex;flex-wrap:wrap;gap:8px;align-items:end"><style>figure{margin:0;text-align:center}p{width:100%;margin:8px 0 0}</style>${sheet.join('')}</body>`);
  await page.screenshot({ path: process.argv[2] });
}
await browser.close();
fs.writeFileSync(path.join(here, 'avatars.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(`saved ${LOOKS.length} looks × ${Object.keys(STILLS.minted).length} states × ${SIZES.length} sizes (${(fs.statSync(path.join(here, 'avatars.json')).size / 1024).toFixed(0)} KB)`);
