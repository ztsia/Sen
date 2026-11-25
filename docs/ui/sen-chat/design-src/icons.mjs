// Saves the lucide icons the chat design page draws as icons.json, so build.mjs needs no packages.
// Reads them from the web app's lucide-react (ISC licence). Run it again when the page needs a new icon.
//   node docs/ui/sen-chat/design-src/icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, '../../../../apps/web/node_modules/lucide-react/dist/esm/icons');
const NAMES = `x check search arrow-left chevron-right chevron-left chevron-down chevron-up utensils coffee shopping-basket car house repeat
wallet trash-2 ellipsis copy pencil camera image undo-2 trending-up calendar-check scale download list-checks triangle-alert
circle-dashed plus arrow-up arrow-down square circle-check loader-circle globe external-link info wifi-off sparkles reply pin
thumbs-up thumbs-down rotate-ccw text-cursor file-text calendar-days calendar-clock brain bell-ring gauge file-spreadsheet
share-2 list-filter history clock circle-x circle sliders-horizontal arrow-up-right landmark banknote tag receipt-text
circle-pause smartphone shield-check badge-check corner-down-right paperclip eye`.split(/\s+/);

const out = {};
for (const name of NAMES) {
  let src = fs.readFileSync(path.join(dir, `${name}.mjs`), 'utf8');
  const alias = src.match(/export \{ default \} from '\.\/([\w-]+)\.mjs'/); // an old name re-exports the new one
  if (alias) src = fs.readFileSync(path.join(dir, `${alias[1]}.mjs`), 'utf8');
  const m = src.match(/node:\s*(\[[\s\S]*?\])\s*(?:,\s*aliases:[^\n]*)?\n\};/);
  if (!m) throw new Error(`no icon data for ${name}`);
  const node = m[1];
  const els = Function(`return ${node}`)();
  out[name] = els.map(([tag, attrs]) => `<${tag}${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => ` ${k}="${v}"`).join('')}/>`).join('');
}
fs.writeFileSync(path.join(here, 'icons.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(`saved ${Object.keys(out).length} icons`);
