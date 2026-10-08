// Sen's chart palette, one per look (S2, D77). Writes src/charts.js, which build.mjs folds into each
// look's tokens, and prints the dataviz checks for every look in light and dark.
//   node docs/ui/directions/palette.mjs          write src/charts.js and print the report
//   node docs/ui/directions/palette.mjs --check  print the report only; exit 1 if a check fails
//
// The method is the `dataviz` skill's (its validator is vendored as validate_palette.js):
// - Three categorical hues, the same in every look. A look tunes only lightness: each slot is solved
//   to the same contrast against that look's card, so it carries the same weight on every surface.
// - Every pair is checked, not just neighbours, so the slots work in any order and in any legend.
// - The hues keep clear of colours that already mean something (money in, warning, destructive,
//   Copper's verdigris), and money in most of all.
// - The accent (this cycle, the thing in focus) and the context grey are the look's own, in its
//   tokens. The sequential ramp runs from the card towards the accent, for the calendar.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { validate, validateOrdinal, contrast } from './validate_palette.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const LOOKS = ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'];
const MODES = ['light', 'dark'];

// the three hues: OKLCH hue, a chroma ceiling, and the contrast each slot keeps against the card
export const HUES = [
  { slot: 1, name: 'Blue', h: 268, c: 0.2, contrast: { light: 7.4, dark: 4.75 } },
  { slot: 2, name: 'Orchid', h: 343, c: 0.164, contrast: { light: 3.3, dark: 3.6 } },
  { slot: 3, name: 'Gold', h: 93, c: 0.164, contrast: { light: 3.05, dark: 4.8 } },
];
// colours that already mean something, and how far (OKLab ΔE ×100) a chart colour must stay from each.
// Money in has no words beside its colour on a chart, so it gets the full normal-vision floor. The rest
// always carry an icon and words, or never appear in a chart (the verdigris), so they get a lower one.
const RESERVED = [['money-in', 15], ['money-warning', 12], ['destructive', 12], ['patina', 12]];
const BAND = { light: [0.44, 0.76], dark: [0.49, 0.66] }; // inside the validator's lightness bands

// ---------- OKLab and OKLCH ----------
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const l2s = (c) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
function lab(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => s2l(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromLab(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return { hex: '#' + rgb.map((v) => Math.round(l2s(v) * 255).toString(16).padStart(2, '0')).join(''), inGamut: rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4) };
}
const lch = (L, C, H) => fromLab(L, C * Math.cos(H * Math.PI / 180), C * Math.sin(H * Math.PI / 180));
const deltaE = (x, y) => { const p = lab(x), q = lab(y); return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
// the most chroma up to the ceiling that stays inside sRGB
function atL(L, H, cap) { if (lch(L, cap, H).inGamut) return lch(L, cap, H).hex; let lo = 0, hi = cap; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (lch(L, m, H).inGamut) lo = m; else hi = m; } return lch(L, lo, H).hex; }
// the lightness at which a hue has the target contrast against the card, kept inside the band
function solve(hue, card, mode) {
  let lo = 0.3, hi = 0.9;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; const c = contrast(atL(m, hue.h, hue.c), card); if ((mode === 'light') === (c > hue.contrast[mode])) lo = m; else hi = m; }
  const [a, b] = BAND[mode]; return atL(Math.min(b, Math.max(a, (lo + hi) / 2)), hue.h, hue.c);
}
// five steps on the accent's hue, evenly spaced in lightness: the least at 2:1 against the card, the most
// at least as strong as the accent (L 0.35 or darker in light mode, 0.85 or lighter in dark)
function ramp(card, accent, mode) {
  const [L, a, b] = lab(accent); const C = Math.hypot(a, b), H = Math.atan2(b, a) * 180 / Math.PI;
  const at = (l) => atL(l, H, C);
  const most = mode === 'light' ? Math.min(L, 0.35) : Math.max(L, 0.85);
  let lo = mode === 'light' ? most : lab(card)[0], hi = mode === 'light' ? lab(card)[0] : most;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if ((contrast(at(m), card) < 2) === (mode === 'light')) hi = m; else lo = m; }
  const least = mode === 'light' ? lo : hi;
  return [0, 1, 2, 3, 4].map((k) => at(least + (most - least) * k / 4));
}

// ---------- the looks' own tokens, read from their source as build.mjs does ----------
function look(id) {
  const read = (f) => fs.readFileSync(path.join(here, 'src', f), 'utf8');
  const ctx = vm.createContext({ console });
  vm.runInContext(`${read('engine.js')}\n${read(`${id}.js`)}\nthis.DIR = DIR;`, ctx);
  return ctx.DIR;
}

const out = {}, report = {}; let failed = false;
for (const id of LOOKS) {
  const D = look(id); out[id] = {}; report[id] = {};
  for (const mode of MODES) {
    const t = Object.assign({}, D.tokens[mode], D.extra && D.extra[mode]); const card = t.card;
    const slots = HUES.map((h) => solve(h, card, mode));
    const v = validate(slots, { mode, surface: card, pairs: 'all' });
    const num = (i) => +(v.report[i][2].match(/ΔE ([\d.]+)/) || [0, 0])[1];
    const reserved = RESERVED.filter(([k]) => t[k]).flatMap(([k, min]) => slots.map((s, i) => ({ slot: i + 1, token: k, de: +deltaE(s, t[k]).toFixed(1), min })));
    const nearest = reserved.reduce((a, b) => (b.de - b.min < a.de - a.min ? b : a));
    const seq = ramp(card, t['chart-accent'], mode);
    const neutral = Math.hypot(lab(t['chart-accent'])[1], lab(t['chart-accent'])[2]) < 0.03;
    const o = validateOrdinal(seq, { mode, surface: card });
    const seqOk = o.report.every(([name, ok]) => ok || (neutral && name === 'Single hue'));
    const accent = { contrast: +contrast(t['chart-accent'], card).toFixed(2), fromWarning: +deltaE(t['chart-accent'], t['money-warning']).toFixed(1), fromContext: +deltaE(t['chart-accent'], t['chart-context']).toFixed(1) };
    const r = {
      ok: v.ok && reserved.every((x) => x.de >= x.min) && seqOk && accent.contrast >= 3 && accent.fromWarning >= 15,
      cvd: num(2), normal: num(3), contrast: slots.map((s) => +contrast(s, card).toFixed(2)), nearest, accent, seqOk,
    };
    if (!r.ok) failed = true;
    report[id][mode] = r;
    out[id][mode] = Object.fromEntries([...slots.map((s, i) => [`chart-${i + 1}`, s]), ...seq.map((s, i) => [`chart-seq-${i + 1}`, s])]);
  }
}

// ---------- the report ----------
const pad = (s, n) => String(s).padEnd(n);
console.log(`Sen's chart palette: ${HUES.map((h) => `${h.slot} ${h.name}`).join(', ')}. All pairs, every look, light and dark.\n`);
console.log(`${pad('look', 11)}${pad('mode', 6)}${pad('slots', 25)}${pad('CVD ΔE', 8)}${pad('normal', 8)}${pad('nearest meaning', 30)}${pad('accent', 26)}ok`);
for (const id of LOOKS) for (const mode of MODES) {
  const r = report[id][mode], n = r.nearest;
  console.log(`${pad(id, 11)}${pad(mode, 6)}${pad(HUES.map((h, i) => out[id][mode][`chart-${i + 1}`]).join(' '), 25)}${pad(r.cvd, 8)}${pad(r.normal, 8)}${pad(`slot ${n.slot}~${n.token} ${n.de} (≥${n.min})`, 30)}${pad(`${r.accent.contrast}:1, ${r.accent.fromWarning} from warn`, 26)}${r.ok ? 'PASS' : 'FAIL'}`);
}
console.log('\nTargets: CVD ΔE ≥ 8 (protan, deutan), normal vision ≥ 15, every slot ≥ 3:1 on the card, the accent ≥ 3:1 and ≥ 15 from the warning.');

if (!process.argv.includes('--check')) {
  const js = `/* Sen's chart palette, one per look. Written by docs/ui/directions/palette.mjs: change the hues there
   and run it again; don't edit this file. build.mjs folds these into each look's tokens. */
'use strict';
const CHART_HUES = ${JSON.stringify(HUES.map(({ slot, name, h }) => ({ slot, name, h })))};
const CHARTS = ${JSON.stringify(out, null, 1)};
const CHART_REPORT = ${JSON.stringify(report)};
if (typeof DIR !== 'undefined' && CHARTS[DIR.id]) for (const m of ['light', 'dark']) Object.assign(DIR.tokens[m], CHARTS[DIR.id][m]);
`;
  fs.writeFileSync(path.join(here, 'src', 'charts.js'), js);
  console.log('\nwrote src/charts.js');
}
process.exit(failed ? 1 : 0);
