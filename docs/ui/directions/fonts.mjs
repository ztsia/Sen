// Saves the looks' fonts in the repo, so the design doesn't depend on Google Fonts staying up: the
// Latin and Latin Extended subsets of every family the six looks use, as WOFF2, with each family's
// licence (all are SIL Open Font License 1.1) and a fonts.css that loads them from these files.
// The app hosts its own fonts (spec §17); these are its source. Needs network access; run it again
// when a look changes its fonts.
//   node docs/ui/directions/fonts.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'assets', 'fonts');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const get = (url, bin) => execFileSync('curl', ['-sSfL', '-A', UA, url], { encoding: bin ? 'buffer' : 'utf8', maxBuffer: 64 << 20 });
const slug = (family) => family.toLowerCase().replace(/[^a-z0-9]+/g, '');
const KEEP = new Set(['latin', 'latin-ext']);

// each look's Google Fonts URL, read from its source
const ids = ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'];
const urls = ids.map((id) => {
  const ctx = vm.createContext({ console });
  vm.runInContext(`${fs.readFileSync(path.join(here, 'src', 'engine.js'), 'utf8')}\n${fs.readFileSync(path.join(here, 'src', `${id}.js`), 'utf8')}\nthis.DIR = DIR;`, ctx);
  return [id, ctx.DIR.fonts];
});

fs.mkdirSync(out, { recursive: true });
// one face per file: a variable font is listed once per weight asked for, all pointing at one file, so
// those become one face with a weight range
const faces = new Map(); const usedBy = new Map();
for (const [id, url] of urls) {
  const css = get(url);
  for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g)) {
    const [, subset, body] = m; if (!KEEP.has(subset)) continue;
    const prop = (k) => (body.match(new RegExp(`${k}:\\s*([^;]+);`)) || [])[1];
    const family = prop('font-family').replace(/['"]/g, '').trim(); const style = prop('font-style').trim();
    const stretch = prop('font-stretch'); const src = body.match(/url\((https:[^)]+)\)/)[1];
    const f = faces.get(src) || { family, style, stretch: stretch && stretch.trim(), src, range: prop('unicode-range').trim(), subset, weights: new Set() };
    for (const w of prop('font-weight').trim().split(/\s+/)) f.weights.add(+w);
    faces.set(src, f);
    if (!usedBy.has(family)) usedBy.set(family, new Set()); usedBy.get(family).add(id);
  }
}
for (const f of faces.values()) {
  const w = [...f.weights].sort((a, b) => a - b); f.weight = w.length > 1 ? `${w[0]} ${w[w.length - 1]}` : `${w[0]}`;
  f.name = `${slug(f.family)}-${f.style}-${f.weight.replace(' ', '-')}${f.stretch ? `-${f.stretch.replace(/\s+/g, '-').replace(/%/g, '')}` : ''}-${f.subset}.woff2`;
}

let css = '/* The six looks\' fonts, served from this folder. Written by docs/ui/directions/fonts.mjs. All SIL OFL 1.1: see each family\'s OFL.txt. */\n';
const families = [...new Set([...faces.values()].map((f) => f.family))].sort();
for (const family of families) {
  const dir = path.join(out, slug(family)); fs.mkdirSync(dir, { recursive: true });
  const mine = [...faces.values()].filter((x) => x.family === family).sort((a, b) => a.name.localeCompare(b.name));
  for (const old of fs.readdirSync(dir)) if (old.endsWith('.woff2') && !mine.some((f) => f.name === old)) fs.rmSync(path.join(dir, old));
  for (const f of mine) {
    const file = path.join(dir, f.name); if (!fs.existsSync(file)) fs.writeFileSync(file, get(f.src, true));
    css += `@font-face { font-family: '${family}'; font-style: ${f.style}; font-weight: ${f.weight};${f.stretch ? ` font-stretch: ${f.stretch};` : ''} font-display: swap; src: url('${slug(family)}/${f.name}') format('woff2'); unicode-range: ${f.range}; }\n`;
  }
  const lic = path.join(dir, 'OFL.txt'); if (!fs.existsSync(lic)) fs.writeFileSync(lic, get(`https://raw.githubusercontent.com/google/fonts/main/ofl/${slug(family)}/OFL.txt`));
  console.log(`${family}: ${mine.length} files, used by ${[...usedBy.get(family)].join(', ')}`);
}
fs.writeFileSync(path.join(out, 'fonts.css'), css);
fs.writeFileSync(path.join(out, 'README.md'), `# Fonts\n\nThe fonts the six looks use, saved here so the design doesn't depend on Google Fonts. Each family's folder has its files (WOFF2, the Latin and Latin Extended subsets) and its licence, the SIL Open Font License 1.1, which allows bundling them in the app. \`fonts.css\` loads them from this folder.\n\nWritten by \`docs/ui/directions/fonts.mjs\`; run it again when a look changes its fonts. The app hosts its own fonts (\`spec_v2.md\` §17), from these files.\n\n| Family | Used by |\n|---|---|\n${families.map((f) => `| ${f} | ${[...usedBy.get(f)].join(', ')} |`).join('\n')}\n`);
console.log(`fonts.css and README.md in ${path.relative(process.cwd(), out)}`);
