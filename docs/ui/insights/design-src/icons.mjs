// Saves the lucide icons the Insights design page draws as icons.json, so build.mjs needs no packages.
// Reads them from the web app's lucide-react (ISC licence). Run it again when the page needs a new icon.
//   node docs/ui/insights/design-src/icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, '../../../../apps/web/node_modules/lucide-react/dist/esm/icons');
const NAMES = `x check arrow-left chevron-right chevron-down chevron-up chevron-left ellipsis grip-vertical plus trash-2 pencil arrow-up arrow-down
move rotate-ccw layout-grid sparkles calendar-days calendar triangle-alert trending-up trending-down info wifi-off refresh-cw circle-alert loader-circle
pin eye-off eye bell-ring rectangle-horizontal square chart-line chart-column table-2 utensils repeat receipt-text shopping-basket target
list-checks inbox calendar-clock file-text search undo-2 ban arrow-up-to-line folder-input arrow-right circle-check cloud-off hourglass message-square-text
wallet landmark car coffee house shopping-bag smartphone users banknote scale gauge`.split(/\s+/);

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
