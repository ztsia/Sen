// Builds one self-contained page per look (run palette.mjs first when the chart hues change), ready for the Artifact tool (no doctype: the tool adds it),
// and writes every asset the look draws as files under assets/<id>/, so the app can use them and
// nothing lives only in a published page: the theme's tokens, the launcher icon's layers and the
// notification icon, the tab bar (each icon idle and active, the scan button, the badge, light and
// dark), the look's marks, and the data its drawn type is made from. Fonts are saved by fonts.mjs.
//   node docs/ui/directions/build.mjs            all six
//   node docs/ui/directions/build.mjs minted     one
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(here, 'src', f), 'utf8');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'];
const MODES = ['light', 'dark'];

// an SVG fragment as a file: the namespace, sizes for viewBox-only marks, and the page's ARIA dropped
function svgFile(svg) {
  let s = svg.trim().replace(/ aria-hidden="true"/g, '').replace(/ class="[^"]*"/, (m) => (svg.trim().startsWith(`<svg${m}`) ? '' : m));
  if (!/^<svg[^>]*xmlns=/.test(s)) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const vb = (s.match(/^<svg[^>]*viewBox="([^"]+)"/) || [])[1];
  if (vb) { const [, , w, h] = vb.split(/[\s,]+/).map(Number); s = s.replace(/^(<svg[^>]*?) width="100%"/, `$1 width="${w}"`); if (!/^<svg[^>]*\swidth=/.test(s)) s = s.replace('<svg', `<svg width="${w}" height="${h}"`); }
  return `${s}\n`;
}
// CSS variables resolved to the look's values for one mode, so a file renders on its own
const resolveVars = (s, D, mode) => s.replace(/var\(--([\w-]+)\)/g, (m, k) => (D.tokens[mode][k] ?? (D.extra && D.extra[mode][k]) ?? m));
// the badge's number, which the page sets as HTML over the shape, as SVG text
function badgeFile(markup, font) {
  const m = markup.match(/^(<svg[\s\S]*?<\/svg>)<b style="color:([^"]+)">([^<]+)<\/b>$/); if (!m) return markup;
  const [, svg, color, n] = m; const [x, y, w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  return svg.replace(/<\/svg>$/, `<text x="${x + w / 2}" y="${y + h / 2 + 3.9}" text-anchor="middle" font-family="${font}" font-size="11" font-weight="700" fill="${color}">${n}</text></svg>`);
}
function write(file, body) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); }

// each look's marks: its drawings outside the icon and tab bar. A mark that differs by mode is written once per mode.
const MARKS = {
  minted: ($) => ({
    'rosette.svg': () => `<svg viewBox="0 0 108 108">${$('rosetteSVG')(54, 54, 104, '#0f2238', 0.3, 1)}</svg>`,
    'seal.svg': () => $('mtSeal')(),
    'microprint.svg': (mode) => $('mtMicro')(350, '').replace('fill="currentColor"', `fill="${$('DIR').tokens[mode]['muted-foreground']}"`),
    'bead.svg': (mode) => $('DIR').tabs.ind(mode, 'b'),
  }),
  instrument: ($) => ({
    'wordmark.svg': (mode) => $('dmSVG')('sen', 3.4, 1.3, $('DIR').tokens[mode].foreground, null),
    'grid.svg': () => `<svg viewBox="0 0 108 108"><rect width="108" height="108" fill="#17181b"/>${$('grid100')(30, 30, 48, 1.95, '#43464c', 36, '#ffffff', 2.7)}</svg>`,
  }),
  firefly: () => ({}),
  line: ($) => ({
    'loop.svg': (mode) => `<svg viewBox="0 30 92 42">${$('loopMark')($('DIR').tokens[mode].primary, 1.6, 4.2)}</svg>`,
    'underline.svg': (mode) => $('DIR').tabs.ind(mode, 'u'),
  }),
  mercury: ($) => ({
    'bead.svg': () => `<svg viewBox="0 0 24 24"><defs>${$('mqBead')('b')}</defs><circle cx="12" cy="12" r="10" fill="url(#b)"/></svg>`,
  }),
  copper: ($) => ({
    'coin.svg': () => `<svg viewBox="0 0 52 52"><defs>${$('cuCoinFill')('c')}</defs><circle cx="26" cy="26" r="24" fill="url(#c)"/><circle cx="26" cy="26" r="23" fill="none" stroke="rgba(60,25,10,.42)" stroke-width="1.7" stroke-dasharray=".7 .8"/></svg>`,
  }),
};
// each look's data: what its drawn type and marks are made from
const DATA = {
  minted: ($) => ({ 'rosette.json': { note: 'Guilloché bands: radius R and amplitude A as fractions of the mark\'s size, p petals, copies twisted by spread. See rosetteSVG in src/minted.js.', bands: $('MINT') } }),
  instrument: ($) => ({ 'dot-matrix.json': { note: 'The 5×7 face for the figure, the wordmark and the title, and the 9×9 tab icons. 1 or # is a lit dot.', face5x7: $('DM'), tabs9x9: $('IN_TABS') } }),
  firefly: () => ({}),
  line: ($) => ({ 'pen-glyphs.json': { note: 'Single-stroke letters and figures in a box 100 units tall (baseline 0, top -100). A point with a third value of 1 is a sharp turn. Written with an italic nib at nibAngle radians and slanted by slant. See penText and penPrep in src/line.js.', nibAngle: $('PEN_NIB'), slant: $('PEN_SLANT'), glyphs: $('PEN_G') } }),
  mercury: () => ({}),
  copper: ($) => ({ 'patina.json': { note: 'The colour of the copper for a share of the cycle\'s money spent, from 0 (payday, polished) to 1 (all of it, green). Overspent is green all over. See cuAgeColor in src/copper.js.', steps: Array.from({ length: 21 }, (_, i) => ({ spent: i / 20, rgb: $('cuAgeColor')(i / 20) })) } }),
};
// what each look draws in code rather than as files, for its README
const IN_CODE = {
  minted: 'Sen\'s rosette (canvas, eight states) and the large figure, set in Libre Caslon Display.',
  instrument: 'Sen\'s 9×9 matrix (canvas, eight states) and the dot-matrix figure, drawn from `data/dot-matrix.json`.',
  firefly: 'the figure written in fireflies, Sen\'s firefly, the river and bokeh (canvas), and the twig strip (`strip.svg` is one day of it).',
  line: 'the handwritten figure, title and wordmark, written by the pen engine from `data/pen-glyphs.json`, and Sen\'s nib (canvas).',
  mercury: 'the liquid figure, title, wordmark and Sen\'s drop: a WebGL renderer (`HG_FS` in `src/mercury.js`) with a painted 2D fallback.',
  copper: 'the struck figure and title, and Sen\'s coin with its two faces: a WebGL renderer (`CU_FS` in `src/copper.js`) with a painted 2D fallback. The patina follows `data/patina.json`.',
};
const MARK_NOTES = {
  'rosette.svg': 'The guilloché rosette, as on the page and behind the wordmark', 'seal.svg': 'The foil seal on the payday card', 'microprint.svg': 'The microprint line under the total and along the tab bar', 'bead.svg': 'The bead, the sen',
  'wordmark.svg': 'The wordmark in dots', 'grid.svg': 'The grid of a hundred with one sen lit', 'loop.svg': 'The loop and its dot, the mark Sen signs with', 'underline.svg': 'Sen\'s underline under the active tab', 'coin.svg': 'The coin, with its milled edge', 'strip.svg': 'The cycle strip on Home, on day 19 of 31',
};

const exported = {};
for (const id of ids) {
  const engine = read('engine.js'); const dirJs = `${read(`${id}.js`)}\n${read('charts.js')}`; const dirCss = read(`${id}.css`);
  const css = read('engine.css') + '\n' + dirCss;
  const ctx = vm.createContext({ console });
  vm.runInContext(`${engine}\n${dirJs}\nthis.DIR = DIR; this.$ = (name) => eval(name);`, ctx);
  const D = ctx.DIR, $ = ctx.$;

  const html = `<title>${D.title}</title>
<!-- Sen, the look "${D.name}" (S2, D57, D78). Built by docs/ui/directions/build.mjs from src/; edit the source, then rebuild.
     Written for the Artifact tool, which adds the doctype and head. All figures are made up. Its assets are in assets/${id}/. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${D.fonts}">
<style>
${css}</style>
<div class="pg" id="pg"></div>
<script>
${engine}
${dirJs}
boot();
</script>
`;
  fs.writeFileSync(path.join(here, `${id}.html`), html);

  // the look's folder is all written here, so it starts empty: nothing stale survives a rename
  const out = path.join(here, 'assets', id); fs.rmSync(out, { recursive: true, force: true }); const files = [];
  const put = (rel, body) => { write(path.join(out, rel), body); files.push(rel); };
  // the theme: shadcn's tokens and Sen's money tokens as CSS, and every variable as JSON
  put('theme.css', `${$('cssExport')()}\n`);
  put('tokens.json', `${JSON.stringify({ look: D.name, radius: D.radius, fonts: D.fonts, icons: { set: 'lucide', note: 'Every icon outside the tab bar (D81): lucide outlines in this weight (at 24 px) and these line ends. Colour: the icon token, or the foreground of the button or status it sits in. Lucide draws a dot as a zero-length line (h.01), which takes dotLinecap so butt ends don\'t hide it.', weight: D.icons.weight, linecap: D.icons.cap, linejoin: D.icons.join, dotLinecap: D.icons.cap === 'butt' ? 'square' : D.icons.cap }, light: Object.assign({}, D.tokens.light, D.extra && D.extra.light), dark: Object.assign({}, D.tokens.dark, D.extra && D.extra.dark) }, null, 2)}\n`);
  // the launcher icon: Android's adaptive layers on the 108 dp canvas, a masked preview, and the 24 dp notification icon
  put('launcher/background.svg', svgFile(`<svg viewBox="0 0 108 108">${D.icon.background('b')}</svg>`));
  put('launcher/foreground.svg', svgFile(`<svg viewBox="0 0 108 108">${D.icon.foreground('f')}</svg>`));
  put('launcher/monochrome.svg', svgFile(`<svg viewBox="0 0 108 108" color="#000000">${D.icon.monochrome('m')}</svg>`));
  put('launcher/preview.svg', svgFile(`<svg viewBox="18 18 72 72"><defs><clipPath id="pm">${$('MASKS').squircle}</clipPath></defs><g clip-path="url(#pm)">${D.icon.background('pb')}${D.icon.foreground('pf')}</g></svg>`));
  put('notification.svg', svgFile(`<svg viewBox="0 0 24 24" color="#ffffff">${D.icon.small()}</svg>`));
  // the tab bar, in each mode
  const font = ((dirCss.match(/--font-ui:\s*([^;]+);/) || [])[1] || 'system-ui').replace(/"/g, "'");
  for (const mode of MODES) {
    for (const [k] of $('TABS')) {
      if (k === 'scan') { put(`tabs/${mode}/scan.svg`, svgFile(resolveVars(D.tabs.scan(mode, 's'), D, mode))); continue; }
      put(`tabs/${mode}/${k}.svg`, svgFile(resolveVars(D.tabs.icon(k, false, mode, `${k}0`), D, mode)));
      put(`tabs/${mode}/${k}-active.svg`, svgFile(resolveVars(D.tabs.icon(k, true, mode, `${k}1`), D, mode)));
    }
    if (D.tabs.badge) put(`tabs/${mode}/badge.svg`, svgFile(badgeFile(resolveVars(D.tabs.badge(5, mode, 'b'), D, mode), font)));
  }
  // marks, with the cycle strip as it looks on day 19 of 31
  // Instrument's strip is always on its dark display, so its file carries the display behind it
  const strip = (mode) => { const s = D.strip(19, 31, mode, $('STATE_VIEW').normal); if (id !== 'instrument') return s; const vb = s.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number); return s.replace(/(<svg[^>]*>)/, `$1<rect x="${vb[0] - 6}" y="${vb[1] - 6}" width="${vb[2] + 12}" height="${vb[3] + 12}" rx="6" fill="${D.extra[mode].display}"/>`).replace(/viewBox="[^"]+"/, `viewBox="${vb[0] - 6} ${vb[1] - 6} ${vb[2] + 12} ${vb[3] + 12}"`); };
  const marks = Object.assign({ 'strip.svg': strip }, MARKS[id]($));
  for (const [name, fn] of Object.entries(marks)) {
    const byMode = MODES.map((mode) => svgFile(resolveVars(fn(mode), D, mode)));
    if (byMode[0] === byMode[1]) put(`marks/${name}`, byMode[0]); else MODES.forEach((mode, i) => put(`marks/${mode}/${name}`, byMode[i]));
  }
  for (const [name, obj] of Object.entries(DATA[id]($))) put(`data/${name}`, `${JSON.stringify(obj, null, 1)}\n`);
  // an index of it all
  const markRows = Object.keys(marks).map((n) => `| \`marks/${files.includes(`marks/${n}`) ? n : `light/${n}\`, \`marks/dark/${n}`}\` | ${MARK_NOTES[n] || n} |`).join('\n');
  const dataRows = Object.keys(DATA[id]($)).map((n) => `| \`data/${n}\` | ${DATA[id]($)[n].note.split('. ')[0]} |`).join('\n');
  put('README.md', `# ${D.name}: assets\n\nEverything ${D.name} draws, as files the app can use, written by \`docs/ui/directions/build.mjs\` from \`src/${id}.js\` and \`src/${id}.css\`. Don't edit these by hand: change the source and rebuild. The page itself is \`docs/ui/directions/${id}.html\`, and its fonts are in \`../fonts/\`.\n\n| Path | What it is |\n|---|---|\n| \`theme.css\` | shadcn/ui's tokens and Sen's money tokens, light and dark, in OKLCH |\n| \`tokens.json\` | The same tokens with the look's own variables, as hex |\n| \`launcher/\` | The adaptive icon on Android's 108 dp canvas: \`background.svg\`, \`foreground.svg\`, \`monochrome.svg\` for themed icons, and \`preview.svg\` in a squircle mask |\n| \`notification.svg\` | The 24 dp notification icon, a flat silhouette |\n| \`tabs/light/\`, \`tabs/dark/\` | The tab bar: each icon idle (\`home.svg\`) and active (\`home-active.svg\`) on the shared outlines in \`../tab-outlines.json\`, the scan button and the badge |\n${markRows}\n${dataRows ? `${dataRows}\n` : ''}\nDrawn live in code, not as files: ${IN_CODE[id]}\n`);
  exported[id] = files.length;
  console.log(`built ${id}.html (${(html.length / 1024).toFixed(0)} KB) and ${files.length} files in assets/${id}/`);
  if (id === ids[ids.length - 1]) {
    write(path.join(here, 'assets', 'README.md'), `# Assets\n\nEverything the six looks draw, saved as files, so the design never lives only in a published page.\n\n| Path | What it holds |\n|---|---|\n| \`minted/\`, \`instrument/\`, \`firefly/\`, \`line/\`, \`mercury/\`, \`copper/\` | One look each: its theme tokens, launcher and notification icons, tab bar, marks and data. Each has a README |\n| \`fonts/\` | The fonts the looks use, as WOFF2, with their licences and \`fonts.css\` |\n| \`tab-outlines.json\` | The five tabs and the outline of each tab icon, which every look shares (D80) |\n\n\`docs/ui/directions/build.mjs\` writes the look folders and \`tab-outlines.json\` from \`src/\`, and \`fonts.mjs\` writes \`fonts/\`. Change the source and rebuild; don't edit these files by hand. \`docs/ui/README.md\` lists every design page and where its source is.\n`);
    write(path.join(here, 'assets', 'tab-outlines.json'), `${JSON.stringify({ note: 'The five tabs in order, and each icon\'s outline on a 24-unit square, shared by every look: strokes as absolute SVG path data, the face some looks fill when a tab is active, and the head, where a trail ends. Each look draws these in its own material (D80).', tabs: $('TABS'), outlines: $('TAB_SK') }, null, 1)}\n`);
  }
}
