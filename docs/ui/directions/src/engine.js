/* Sen design directions: the shared engine. Pure helpers come first, so build.mjs can run the icon
   functions in node to export the SVG layers; everything that touches the DOM runs from boot().
   All figures are made up, in integer sen (the wireframe's data, D11). */
'use strict';
const TAU = Math.PI * 2;
const f2 = (n) => String(Math.round(n * 100) / 100);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- money: integer sen in, text out ----------
function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function rm(sen) { const a = Math.abs(sen); return (sen < 0 ? '−' : '') + 'RM' + group(Math.floor(a / 100)) + '.' + String(a % 100).padStart(2, '0'); }
function rmParts(sen) { const a = Math.abs(sen); return { cur: 'RM', whole: group(Math.floor(a / 100)), cents: String(a % 100).padStart(2, '0') }; }

// ---------- colour maths (WCAG contrast, OKLCH for shadcn's variables) ----------
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); }
function lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum(h) { const [r, g, b] = hexRgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function contrast(a, b) { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
function oklch(h) {
  const [r, g, b] = hexRgb(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B); let H = Math.atan2(B, A) * 180 / Math.PI; if (H < 0) H += 360;
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${C < 0.002 ? 0 : H.toFixed(1)})`;
}

// ---------- geometry ----------
function bez(p0, p1, p2, p3, t) { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; }
// n points spaced evenly by arc length along a chain of cubic segments
function sampleSegs(segs, n) {
  const fine = []; segs.forEach((s) => { for (let i = 0; i <= 160; i++) fine.push(bez(s[0], s[1], s[2], s[3], i / 160)); });
  const d = [0]; for (let i = 1; i < fine.length; i++) d.push(d[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
  const L = d[d.length - 1]; const out = []; let j = 0;
  for (let k = 0; k < n; k++) { const tg = L * k / (n - 1); while (j < d.length - 2 && d[j + 1] < tg) j++; const f = (tg - d[j]) / ((d[j + 1] - d[j]) || 1); out.push([fine[j][0] + f * (fine[j + 1][0] - fine[j][0]), fine[j][1] + f * (fine[j + 1][1] - fine[j][1])]); }
  return out;
}
const polyD = (pts, close) => pts.map((p, i) => (i ? 'L' : 'M') + f2(p[0]) + ' ' + f2(p[1])).join('') + (close ? 'Z' : '');

// ---------- adaptive icon: 108dp canvas, 72dp viewport, 66dp safe zone ----------
const MASKS = {
  circle: '<circle cx="54" cy="54" r="36"/>',
  squircle: '<path d="M54 18C80.5 18 90 27.5 90 54S80.5 90 54 90 18 80.5 18 54 27.5 18 54 18Z"/>',
  rounded: '<rect x="18" y="18" width="72" height="72" rx="17"/>',
  teardrop: '<path d="M54 18H90V54A36 36 0 1 1 54 18Z"/>',
};
let UID = 0;
function iconSVG(size, mask) { const p = 'i' + (UID++); return `<svg class="app-ic" width="${size}" height="${size}" viewBox="18 18 72 72" role="img" aria-label="Sen"><defs><clipPath id="${p}m">${MASKS[mask || 'squircle']}</clipPath></defs><g clip-path="url(#${p}m)">${DIR.icon.background(p)}${DIR.icon.foreground(p)}</g></svg>`; }
function layerSVG(which) {
  const p = 'i' + (UID++);
  const guides = '<rect x="18" y="18" width="72" height="72" fill="none" stroke="#ff2d95" stroke-width=".5" stroke-dasharray="2 2"/><circle cx="54" cy="54" r="33" fill="none" stroke="#18c8ff" stroke-width=".5"/>';
  if (which === 'background') return `<svg viewBox="0 0 108 108">${DIR.icon.background(p)}${guides}</svg>`;
  if (which === 'foreground') return `<svg viewBox="0 0 108 108">${DIR.icon.foreground(p)}${guides}</svg>`;
  if (which === 'monochrome') return `<svg viewBox="0 0 108 108" style="color:var(--foreground)">${DIR.icon.monochrome(p)}${guides}</svg>`;
  return `<svg viewBox="0 0 108 108">${DIR.icon.background(p)}${DIR.icon.foreground(p)}${guides}</svg>`;
}
function themedSVG(size, bg, fg) { const p = 'i' + (UID++); return `<svg class="app-ic" width="${size}" height="${size}" viewBox="18 18 72 72" role="img" aria-label="Sen, themed"><circle cx="54" cy="54" r="36" fill="${bg}"/><g style="color:${fg}">${DIR.icon.monochrome(p)}</g></svg>`; }
function smallSVG(size, color) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="color:${color}" aria-hidden="true">${DIR.icon.small()}</svg>`; }

// ---------- lucide-style glyphs (the stack's icon set) ----------
const GLYPH = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  review: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  insights: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  cal: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  sliders: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  note: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>',
  calc: '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
};
// one shared set, lucide (D81): every look draws these in its own icon colour, weight and line ends (DIR.icons)
const ico = (k, cls) => `<svg viewBox="0 0 24 24" class="lu${cls ? ` ${cls}` : ''}" aria-hidden="true">${GLYPH[k]}</svg>`;

// ---------- the tab bar: the same five tabs and the same outlines in every look; each look draws them in its own material ----------
const TABS = [['home', 'Home'], ['review', 'Review'], ['scan', 'Scan'], ['insights', 'Insights'], ['more', 'More']];
// outlines on a 24-unit square: strokes as absolute path data, the face some looks fill when a tab is active, and where a trail ends
const TAB_SK = {
  home: { d: ['M3.8 11.4L12 4.4L20.2 11.4', 'M6.2 9.4V19.6H17.8V9.4', 'M10.2 19.6V15.2Q10.2 13.8 11.6 13.8H12.4Q13.8 13.8 13.8 15.2V19.6'], area: 'M6.2 9.4L12 4.4L17.8 9.4V19.6H13.8V15.2Q13.8 13.8 12.4 13.8H11.6Q10.2 13.8 10.2 15.2V19.6H6.2Z', head: [12, 4.4] },
  review: { d: ['M3.6 13L6.4 6Q6.8 5 7.9 5H16.1Q17.2 5 17.6 6L20.4 13V18Q20.4 19.6 18.8 19.6H5.2Q3.6 19.6 3.6 18Z', 'M3.6 13H8.4L9.8 15.6H14.2L15.6 13H20.4'], area: 'M3.6 13H8.4L9.8 15.6H14.2L15.6 13H20.4V18Q20.4 19.6 18.8 19.6H5.2Q3.6 19.6 3.6 18Z', head: [12, 15.6] },
  scan: { d: ['M4 8.6V6.4Q4 4 6.4 4H8.6', 'M15.4 4H17.6Q20 4 20 6.4V8.6', 'M20 15.4V17.6Q20 20 17.6 20H15.4', 'M8.6 20H6.4Q4 20 4 17.6V15.4', 'M7.6 12H16.4'], head: [16.4, 12] },
  insights: { d: ['M4 3.8V18.4Q4 20 5.6 20H20.2', 'M7.6 15.4L11 11.4L14 13.8L19 7.8'], area: 'M7.6 15.4L11 11.4L14 13.8L19 7.8V17.4H7.6Z', head: [19, 7.8] },
  more: { d: [], dots: [[5.4, 12], [12, 12], [18.6, 12]], r: 1.7, head: [12, 12] },
};
// absolute path data (M L H V Q C Z) as fine polylines; the point that ends each command is marked as a vertex
function pathFine(d) {
  const tok = d.match(/[MLHVQCZ]|-?\d*\.?\d+/gi) || []; const polys = []; let P = null, i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
  const n = () => +tok[i++];
  const mark = () => { P[P.length - 1].v = 1; };
  const line = (x1, y1) => { const m = Math.max(1, Math.ceil(Math.hypot(x1 - x, y1 - y) / 0.2)); for (let k = 1; k <= m; k++) P.push([x + (x1 - x) * k / m, y + (y1 - y) * k / m]); x = x1; y = y1; mark(); };
  while (i < tok.length) {
    if (/[A-Z]/i.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === 'M') { x = sx = n(); y = sy = n(); P = [[x, y]]; mark(); polys.push(P); cmd = 'L'; }
    else if (cmd === 'L') line(n(), n());
    else if (cmd === 'H') line(n(), y);
    else if (cmd === 'V') line(x, n());
    else if (cmd === 'Z') { line(sx, sy); P.closed = true; }
    else if (cmd === 'Q') { const cx = n(), cy = n(), x1 = n(), y1 = n(); for (let k = 1; k <= 24; k++) { const t = k / 24, u = 1 - t; P.push([u * u * x + 2 * u * t * cx + t * t * x1, u * u * y + 2 * u * t * cy + t * t * y1]); } x = x1; y = y1; mark(); }
    else if (cmd === 'C') { const c1 = [n(), n()], c2 = [n(), n()], e = [n(), n()]; const p0 = [x, y]; for (let k = 1; k <= 32; k++) P.push(bez(p0, c1, c2, e, k / 32)); x = e[0]; y = e[1]; mark(); }
    else i++;
  }
  return polys;
}
// a fine polyline resampled every `step` units of its length, as [x, y, angle]
function resample(P, step) {
  const d = [0]; for (let i = 1; i < P.length; i++) d.push(d[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = d[d.length - 1]; const n = Math.max(1, Math.round(L / step)); const out = []; let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = L * k / n; while (j < P.length - 2 && d[j + 1] < s) j++;
    const a = P[j], b = P[Math.min(P.length - 1, j + 1)]; const f = (s - d[j]) / ((d[j + 1] - d[j]) || 1);
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])]);
  }
  out.len = L; return out;
}
// split a fine polyline where it turns by more than `deg` degrees at a vertex, as a pen would lift there
function splitSharp(P, deg) {
  const out = []; let cur = [P[0]];
  for (let i = 1; i < P.length; i++) {
    cur.push(P[i]);
    if (P[i].v && i < P.length - 1) {
      const a = P[i - 1], b = P[i], c = P[i + 1]; let t = Math.abs(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0])); if (t > Math.PI) t = TAU - t;
      if (t > deg * Math.PI / 180) { out.push(cur); cur = [P[i]]; }
    }
  }
  out.push(cur); return out.filter((q) => q.length > 1);
}
// every stroke of a tab's outline, as fine polylines, optionally split at sharp turns
function tabPolys(k, split) { return TAB_SK[k].d.flatMap((d) => pathFine(d)).flatMap((P) => (split ? splitSharp(P, split) : [P])); }
// a standalone SVG for the export (build.mjs) and the page alike
const svgTag = (vb, w, h, body, cls) => `<svg viewBox="${vb}" width="${w}" height="${h}"${cls ? ` class="${cls}"` : ''} aria-hidden="true">${body}</svg>`;
const SB_ICONS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 20h3v-4H2zM7 20h3v-7H7zM12 20h3V9h-3zM17 20h3V4h-3z" fill="currentColor"/></svg><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8" fill="currentColor"/></svg><svg viewBox="0 0 28 24" style="width:22px" aria-hidden="true"><rect x="1" y="6" width="22" height="12" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/><rect x="3" y="8" width="15" height="8" rx="2" fill="currentColor"/><rect x="24" y="10" width="2" height="4" rx="1" fill="currentColor" opacity=".55"/></svg>';

// ---------- the data (the wireframe's, D11) ----------
const DATA = {
  income: 420000, spent: 291550, day: 19, days: 31, toGo: 12,
  total: 840210, gap: 3620, gapDate: '3 Oct', review: 5,
  thisCycle: [4500, 101000, 108000, 119000, 126200, 141000, 147000, 156000, 169000, 182000, 211000, 219000, 226000, 238000, 247000, 260000, 268000, 286000, 291550],
  lastCycle: [6000, 98000, 106000, 113000, 121000, 133000, 141000, 150000, 160500, 171000, 180500, 189000, 198000, 211000, 222000, 236000, 248000, 263000, 277550, 284000, 289000, 293500, 296000, 299000, 301500, 303800, 305600, 307900, 309500, 311000, 312040],
  note: { when: 'Yesterday, 21:02', t: 'Quiet Friday: RM32.60 on meals. You’re RM140.00 ahead of last cycle’s spending, mostly Shopping.' },
};
const STATE_VIEW = {
  normal: { lbl: 'Left until payday', fig: 128450, sub: '12 days to go', day: 19, spent: 291550, pace: 'RM140.00 more than last cycle by this day', fab: 'resting' },
  payday: { lbl: 'Left until payday', fig: 420000, sub: '31 days to go', day: 1, spent: 0, pace: 'Last cycle ended with RM1,079.60 left', fab: 'note', total: 1260210, note: { when: 'Today, 09:14', t: 'Your salary landed: RM4,200.00 in Public Bank. The payday plan is ready, three moves and RM2,765.10 left to spend.' } },
  over: { lbl: 'Over by', fig: 21540, sub: '12 days to go', day: 19, spent: 441540, pace: 'RM1,639.90 more than last cycle by this day', fab: 'note', over: true, note: { when: 'Today, 21:02', t: 'Over by RM215.40 with 12 days to go, mostly Shopping. I can draft a plan to payday when you want one.' } },
  capture: { lbl: 'Left until payday', fig: 128450, sub: '12 days to go', day: 19, spent: 291550, pace: 'RM140.00 more than last cycle by this day', fab: 'resting', capture: true },
};
const AV_STATES = [
  ['resting', 'Resting', 'On the five tabs, bottom right'],
  ['note', 'Has a note', 'After the 9pm note, until you open it'],
  ['listening', 'Listening', 'The sheet is open, waiting for you'],
  ['thinking', 'Working', 'Running its tools'],
  ['helpers', 'With helpers', 'A subagent is out: research, the payday plan'],
  ['speaking', 'Answering', 'Writing its reply'],
  ['paused', 'Paused', 'Offline, or at this month’s AI cap'],
  ['done', 'Done', 'A change you applied went through'],
];
const DEMO = [
  { q: 'Can I afford a RM400 phone?', steps: [['thinking', 1500]], a: 'Not comfortably before payday. You have RM1,284.50 left for 12 days, and at your usual pace you’d reach payday with about RM235.10. After payday it fits.', acts: ['Make it a goal', 'Not now'] },
  { q: 'Where should I keep RM5,000?', steps: [['thinking', 900], ['helpers', 1700]], a: 'My researcher found two to compare, both drafts until you confirm the figures: Bank A at 3.00% a year, and Bank B at 3.20% for new money until 31 Dec.', acts: ['Check the figures', 'Not now'] },
];

// ---------- the pace chart (dataviz: 2px lines, grey context, one accent, legend) ----------
function paceChart(st, mode) {
  const W = 318, H = 76, L = 2, R = 2, T = 14, B = 16; const pw = W - L - R, ph = H - T - B; const days = 31, maxY = 470000;
  const X = (d) => L + ((d - 1) / (days - 1)) * pw, Y = (v) => T + ph - (v / maxY) * ph;
  const tc = st.spent === 0 ? [0] : st.over ? DATA.thisCycle.map((v) => Math.round(v * 441540 / 291550)) : DATA.thisCycle;
  const line = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${f2(X(i + 1))} ${f2(Y(v))}`).join('');
  const now = tc.length, last = tc[now - 1];
  let g = `<line x1="${L}" x2="${W - R}" y1="${f2(Y(0))}" y2="${f2(Y(0))}" stroke="var(--border)" stroke-width="1"/>`;
  g += `<line x1="${L}" x2="${W - R}" y1="${f2(Y(420000))}" y2="${f2(Y(420000))}" stroke="var(--border)" stroke-width="1"/><text x="${L}" y="${f2(Y(420000) - 5)}" class="ax">Income RM4,200</text>`;
  g += `<path d="${line(DATA.lastCycle)}" fill="none" stroke="var(--chart-context)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (now > 1) g += `<path d="${line(tc)}" fill="none" stroke="var(--chart-accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  g += `<circle cx="${f2(X(now))}" cy="${f2(Y(last))}" r="4.5" fill="var(--chart-accent)" stroke="var(--card)" stroke-width="2"/>`;
  g += `<text x="${L}" y="${H - 3}" class="ax">${st.spent === 0 ? '31 Oct' : '30 Sep'}</text><text x="${f2(X(now))}" y="${H - 3}" text-anchor="${now < 4 ? 'start' : 'middle'}" class="ax">Today</text><text x="${W - R}" y="${H - 3}" text-anchor="end" class="ax">Payday</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Spending this cycle against last cycle">${g}</svg>`;
}

// ---------- the phone: Home (D59, D68) ----------
function homeHTML(mode, stKey) {
  const st = STATE_VIEW[stKey]; const note = st.note || DATA.note;
  let h = '';
  if (st.capture) h += `<div class="warnbar" role="alert"><span><b>Capture is off</b>Payments aren’t being recorded.</span><button class="fix">Fix</button></div>`;
  if (stKey === 'payday') h += `<div class="card payday"><span><b>Payday: your salary landed</b><span class="sub">Four quick steps start the new cycle</span></span><button class="btn-pri">Start</button></div>`;
  const fig = DIR.heroFigure ? DIR.heroFigure(st.fig, mode, st) : defaultFigure(st.fig);
  h += `<button class="hero${st.over ? ' over' : ''}" aria-label="${esc(st.lbl)} ${esc(rm(st.fig))}, ${esc(st.sub)}"><span class="hero-lbl">${st.lbl}</span><span class="hero-fig">${fig}</span><span class="hero-sub">${st.sub}</span>${DIR.strip ? `<span class="strip">${DIR.strip(st.day, DATA.days, mode, st)}</span>` : ''}</button>`;
  const spentTxt = st.spent === 0 ? 'New cycle: nothing spent yet' : `Spent <b>${rm(st.spent)}</b> this cycle`;
  h += `<button class="card pace"><span class="row1"><span>${spentTxt}</span><span aria-hidden="true">›</span></span><span class="sub">${st.pace}</span>${st.spent === 0 ? '' : paceChart(st, mode) + '<span class="legend"><span><i style="background:var(--chart-accent)"></i>This cycle</span><span><i style="background:var(--chart-context)"></i>Last cycle</span></span>'}</button>`;
  h += `<button class="card note"><span class="note-head"><canvas class="av" data-size="28" data-state="resting" data-mode="${mode}"></canvas><b>Sen</b><span>${note.when}</span></span><p>${esc(note.t)}</p></button>`;
  h += `<button class="quiet"><span>Total balance</span><b>${rm(st.total || DATA.total)}</b><span>Gap at last check, ${DATA.gapDate}</span><b>${rm(DATA.gap)}</b></button>`;
  return `<div class="screen" data-mode="${mode}" data-state="${stKey}">
    <div class="sbar"><span>21:14</span><span class="sbi">${SB_ICONS}</span></div>
    <header class="appbar">${DIR.wordmark(mode)}</header>
    <main class="content">${h}</main>
    <button class="fab" aria-label="Ask Sen"><canvas class="av" data-size="60" data-state="${st.fab}" data-mode="${mode}"></canvas></button>
    ${tabbarHTML(mode)}
  </div>`;
}
// the five tabs in the look's own material; each icon is drawn idle and active, and the bar shows one or the other
let TB_N = 0;
function tabbarHTML(mode, on = 'home') {
  const T = DIR.tabs; const u = `tb${++TB_N}`; const oi = TABS.findIndex(([k]) => k === on);
  const items = TABS.map(([k, l], i) => {
    if (k === 'scan') return `<button class="tab tab-scan" data-k="scan" aria-label="Scan a receipt"><span class="scanbtn${T ? ' cs' : ''}">${T ? T.scan(mode, `${u}s`) : ico('scan')}</span><span class="tl">${l}</span></button>`;
    const isOn = k === on;
    const badge = k !== 'review' ? '' : T && T.badge ? `<span class="badge cb" aria-label="${DATA.review} to review">${T.badge(DATA.review, mode, `${u}b`)}</span>` : `<span class="badge">${DATA.review}</span>`;
    const icon = T ? `<span class="ti"><span class="i-off">${T.icon(k, false, mode, `${u}${k}0`)}</span><span class="i-on">${T.icon(k, true, mode, `${u}${k}1`)}</span></span>` : ico(k);
    return `<button class="tab${isOn ? ' on' : ''}" data-k="${k}" data-i="${i}"${isOn ? ' aria-current="page"' : ''}>${icon}<span class="tl">${l}</span>${badge}</button>`;
  }).join('');
  return `<nav class="tabbar" data-on="${on}" data-mode="${mode}" style="--i:${oi}">${T && T.bar ? T.bar(mode, u) : ''}<span class="tab-ind" aria-hidden="true">${T && T.ind ? T.ind(mode, `${u}i`) : ''}</span>${items}</nav>`;
}
// choosing a tab: the active state moves, in the look's own motion; the scan button just answers the press
function switchTab(bar, btn) {
  if (!bar || !btn) return;
  if (btn.dataset.k === 'scan') { btn.classList.remove('press'); void btn.offsetWidth; btn.classList.add('press'); clearTimeout(btn._p); btn._p = setTimeout(() => btn.classList.remove('press'), 800); return; }
  if (btn.classList.contains('on')) return;
  const from = bar.querySelector('.tab.on');
  if (from) { from.classList.remove('on', 'fresh'); from.removeAttribute('aria-current'); from.classList.add('left'); clearTimeout(from._l); from._l = setTimeout(() => from.classList.remove('left'), 900); }
  btn.classList.add('on', 'fresh'); btn.setAttribute('aria-current', 'page'); bar.dataset.on = btn.dataset.k; bar.style.setProperty('--i', btn.dataset.i);
  clearTimeout(btn._f); btn._f = setTimeout(() => btn.classList.remove('fresh'), 1900);
  if (DIR.tabs && DIR.tabs.switch && !REDUCED) DIR.tabs.switch(bar, from, btn);
}
function defaultFigure(sen) { const p = rmParts(sen); return `<span class="cur">${p.cur}</span><span>${p.whole}.${p.cents}</span>`; }

// ---------- Sen's sheet, with a short scripted answer ----------
function openSheet(screen) {
  if (screen.querySelector('.sheet')) return;
  const mode = screen.dataset.mode;
  const note = (STATE_VIEW[screen.dataset.state].note || DATA.note);
  screen.insertAdjacentHTML('beforeend', `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="Sen"><div class="grab"></div>
    <div class="sheet-head"><canvas class="av" data-size="40" data-state="listening" data-mode="${mode}"></canvas><span class="who"><b>Sen</b><span>Looking at: Home</span></span><button class="ib close" aria-label="Close">${ico('x')}</button></div>
    <div class="msgs"><div class="msg sen"><p>${esc(note.t)}</p><span class="when">${note.when}</span></div></div>
    <div class="chips">${DEMO.map((d, i) => `<button class="chip" data-q="${i}">${esc(d.q)}</button>`).join('')}</div>
    <div class="composer"><span>Ask Sen…</span><span class="send">${ico('up')}</span></div></div>`);
  mountAvatars(screen);
  requestAnimationFrame(() => requestAnimationFrame(() => { screen.querySelector('.sheet').classList.add('open'); screen.querySelector('.scrim').classList.add('open'); }));
}
function closeSheet(screen) {
  const sh = screen.querySelector('.sheet'), sc = screen.querySelector('.scrim'); if (!sh) return;
  sh.classList.remove('open'); sc.classList.remove('open'); clearTimeout(screen._demo);
  setTimeout(() => { sh.remove(); sc.remove(); }, REDUCED ? 0 : 330);
}
function ask(screen, i) {
  const d = DEMO[i]; const msgs = screen.querySelector('.msgs'); const av = screen.querySelector('.sheet-head .av');
  screen.querySelector('.chips').hidden = true;
  msgs.insertAdjacentHTML('beforeend', `<div class="msg me">${esc(d.q)}</div>`);
  const reply = document.createElement('div'); reply.className = 'msg sen'; reply.innerHTML = '<p></p>';
  let delay = 0; const steps = d.steps.slice();
  const run = () => {
    if (steps.length) { const [s, ms] = steps.shift(); setAv(av, s); screen._demo = setTimeout(run, REDUCED ? 0 : ms); return; }
    setAv(av, 'speaking'); msgs.append(reply); const p = reply.querySelector('p'); const words = d.a.split(' '); let k = 0;
    const tick = () => { k += REDUCED ? words.length : 2; p.textContent = words.slice(0, k).join(' '); msgs.scrollTop = msgs.scrollHeight; if (k < words.length) screen._demo = setTimeout(tick, 60); else { reply.insertAdjacentHTML('beforeend', `<span class="acts">${d.acts.map((a, j) => `<span class="${j ? 'btn-ghost' : 'btn-pri'}">${a}</span>`).join('')}</span><span class="when">Just now</span>`); msgs.scrollTop = msgs.scrollHeight; setAv(av, 'listening'); } };
    tick();
  };
  screen._demo = setTimeout(run, delay);
}
function setAv(c, s) { if (c) { c.dataset.state = s; c._dirty = true; } }

// ---------- avatars: one loop for every canvas on the page ----------
const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const AV = { set: new Set(), t0: 0, last: 0, io: null };
function mountAvatars(root) {
  root.querySelectorAll('canvas.av').forEach((c) => {
    if (c._m) return; c._m = true; const s = +c.dataset.size; const dpr = Math.min(3, (window.devicePixelRatio || 1));
    c.width = Math.round(s * dpr); c.height = Math.round(s * dpr); c.style.width = c.style.height = s + 'px'; c._dpr = dpr; c._vis = true; c._dirty = true;
    AV.set.add(c); if (AV.io) AV.io.observe(c);
  });
}
function avMode(c) { return c.dataset.mode === 'page' ? pageMode() : c.dataset.mode; }
function drawAv(c, t) { const s = +c.dataset.size, ctx = c.getContext('2d'); ctx.setTransform(c._dpr, 0, 0, c._dpr, 0, 0); ctx.clearRect(0, 0, s, s); DIR.avatar.draw(ctx, s, t, c.dataset.state, avMode(c)); }
function avLoop(now) {
  const t = (now - AV.t0) / 1000;
  if (now - AV.last > 32) { AV.last = now; for (const c of AV.set) { if (!c.isConnected) { AV.set.delete(c); continue; } if (!c._vis) continue; if (REDUCED && !c._dirty) continue; drawAv(c, REDUCED ? 2.2 : t); c._dirty = false; } }
  requestAnimationFrame(avLoop);
}
function pageMode() { const a = document.documentElement.getAttribute('data-theme'); if (a === 'dark' || a === 'light') return a; return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }

// ---------- page sections ----------
// the published pages (docs/ui/README.md); republish a page from its file to keep its URL
const LINKS = {
  minted: 'https://claude.ai/artifact/Co4jSZC5CRSRPgnSq9gnYG', firefly: 'https://claude.ai/artifact/DdtERg2hYY2HvEEdTUw7JY',
  instrument: 'https://claude.ai/artifact/FtzJQRoKgs542C4NyAvnkj', line: 'https://claude.ai/artifact/9N9VXLoYYTg2F4WwSvmZJ7',
  mercury: 'https://claude.ai/artifact/QMZtw9imqk8Jw6f44yxBGA', copper: 'https://claude.ai/artifact/PMtA2qnvKY3BwgFom611YM',
};
// the pool of six (D78); four of them play each year, one per quarter
const LOOKS = [['minted', 'Minted'], ['instrument', 'Instrument'], ['firefly', 'Firefly'], ['line', 'Line'], ['mercury', 'Mercury'], ['copper', 'Copper']];
function navHTML() {
  const L = DIR.links || LINKS;
  const items = LOOKS.map(([k, n]) => k === DIR.id ? `<span class="cur">${n}</span>` : (L[k] ? `<a href="${L[k]}" target="_blank" rel="noopener">${n}</a>` : `<span class="dim">${n}</span>`)).join('');
  return `<nav class="pg-nav" aria-label="Looks"><span class="lbl">Sen, six looks:</span>${items}</nav>`;
}
function secHead() { return `<header class="pg-head">${navHTML()}<h1 class="pg-title">${DIR.titleHTML || DIR.name}</h1><p class="pg-lede">${DIR.lede}</p><p class="pg-meta">${DIR.meta}</p></header>`; }
function secHome() {
  return `<section class="pg-sec" id="home"><h2 class="pg-h2">Home</h2>
  <p class="pg-p">The approved layout (D59, D68), in this theme, light and dark. Tap Sen’s button to open the sheet and ask it something. The states show the payday card, an overspent cycle and a health warning.</p>
  <div class="pg-row"><div class="seg" id="seg-state" role="group" aria-label="State">${[['normal', 'Normal'], ['payday', 'Payday'], ['over', 'Over budget'], ['capture', 'Capture off']].map(([k, l], i) => `<button data-st="${k}" aria-pressed="${!i}">${l}</button>`).join('')}</div>
  <div class="seg" id="seg-view" role="group" aria-label="View">${[['both', 'Side by side'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l], i) => `<button data-v="${k}" aria-pressed="${!i}">${l}</button>`).join('')}</div></div>
  <div class="phones has-tags" id="phones"><div class="phone-wrap" data-mode="light"><div class="phone light"></div><span class="tag">Light</span></div><div class="phone-wrap" data-mode="dark"><div class="phone dark"></div><span class="tag">Dark</span></div></div>
  <p class="cap" id="phones-hint"></p></section>`;
}
function secSen() {
  const P = SEN_PROFILE;
  return `<section class="pg-sec" id="sen"><h2 class="pg-h2">Sen</h2><p class="pg-p">${DIR.senIntro}</p>
  <div class="sen-top"><div class="sen-stage"><canvas class="av" data-size="220" data-state="resting" data-mode="page" id="sen-big"></canvas></div>
  <div class="profile"><h3>Sen</h3><p class="role">${P.role}</p><dl>
    <dt>Voice</dt><dd>${P.voice}</dd>
    <dt>Does</dt><dd>${P.does}</dd>
    <dt>Promises</dt><dd>${P.promises}</dd>
    <dt>Sounds like</dt><dd class="voice">“${esc(DATA.note.t)}”</dd></dl>
    <div class="seg" id="seg-av" role="group" aria-label="Sen's state">${AV_STATES.map(([k, l], i) => `<button data-s="${k}" aria-pressed="${!i}">${l}</button>`).join('')}</div></div></div>
  <div class="states">${AV_STATES.map(([k, l, w]) => `<div class="state"><canvas class="av" data-size="72" data-state="${k}" data-mode="page"></canvas><b>${l}</b><span>${w}</span></div>`).join('')}</div>
  <div class="incontext">${ctxBoxes()}</div></section>`;
}
function ctxBoxes() {
  return `<div class="ctxbox"><p class="cap">Its note on Home</p><div class="card note" style="pointer-events:none"><span class="note-head"><canvas class="av" data-size="28" data-state="resting" data-mode="page"></canvas><b>Sen</b><span>${DATA.note.when}</span></span><p>${esc(DATA.note.t)}</p></div></div>
  <div class="ctxbox"><p class="cap">A proposal in Review</p><div class="card" style="pointer-events:none;gap:10px"><span class="note-head"><canvas class="av" data-size="22" data-state="resting" data-mode="page"></canvas><span>Sen suggests a budget</span></span><b style="font-weight:600">Drinks & desserts, RM150.00 a cycle</b><span class="cap">You’ve spent RM123.00 so far this cycle.</span><span class="pg-row"><span class="btn-pri">Apply</span><span class="btn-ghost">Dismiss</span></span></div></div>
  <div class="ctxbox"><p class="cap">Its push, once a day at most (§12.4)</p>${shadeHTML(true)}</div>`;
}
function secIcon() {
  const masks = ['squircle', 'circle', 'rounded', 'teardrop'].map((m) => `<div class="maskc">${iconSVG(64, m)}<span>${{ squircle: 'HyperOS', circle: 'Pixel', rounded: 'One UI', teardrop: 'Teardrop' }[m]}</span></div>`).join('');
  return `<section class="pg-sec" id="icon"><h2 class="pg-h2">The icon</h2><p class="pg-p">${DIR.iconIntro}</p>
  <div class="icon-top">${launcherHTML()}<div class="icon-side">
    <div class="masks">${masks}</div>
    <div class="anatomy"><div class="layer"><div class="box">${layerSVG('background')}</div>Background layer</div><div class="layer"><div class="box mid">${layerSVG('foreground')}</div>Foreground layer</div><div class="layer"><div class="box">${layerSVG('both')}</div>108 dp canvas: 72 dp shows, the mark stays inside the 66 dp circle</div><div class="layer"><div class="box">${layerSVG('monochrome')}</div>Monochrome layer, for themed icons</div></div>
    ${themedHTML()}
    <div><p class="cap" style="margin:0 0 8px">The notification’s small icon: a flat white silhouette, shown at 24 dp</p>${shadeHTML(false)}</div>
  </div></div></section>`;
}
function launcherHTML() {
  const A = (n, g, bg, fg = '#fff') => `<div class="app"><span class="app-ic plain" style="background:${bg};color:${fg}">${ico(g)}</span><span class="app-lbl">${n}</span></div>`;
  const sen = `<div class="app">${iconSVG(56, 'squircle')}<span class="app-lbl">Sen</span><div class="pop" style="left:-34px;bottom:84px"><div>${ico('scan')}Scan receipt</div><div>${ico('plus')}Add expense</div></div></div>`;
  return `<div class="launcher" style="background:${DIR.wall || 'linear-gradient(165deg,#8ea3b8,#3e4c5e 55%,#232b36)'}"><div class="lsb"><span>21:14</span><span>5G · 82%</span></div><div class="clock">21:14</div><div class="date">Saturday, 18 October</div>
  <div class="lgrid">${A('Calendar', 'cal', '#e9ecf1', '#3a5a9a')}${A('Notes', 'note', '#f2d27a', '#5b4511')}${A('Gallery', 'image', '#e3e7ee', '#b4532a')}${A('Maps', 'pin', '#e4efe6', '#2f7a4c')}${A('Music', 'music', '#2b2d33')}${sen}${A('Files', 'folder', '#e8eaf0', '#4a5a78')}${A('Clock', 'clock', '#222428')}</div>
  <div class="dock">${A('Phone', 'phone', '#3b8a5a')}${A('Messages', 'msg', '#3a6fb8')}${A('Browser', 'globe', '#f3f4f7', '#3b5bb5')}${A('Camera', 'camera', '#4a4d55')}</div></div>`;
}
function themedHTML() {
  const T = (n, g) => `<div class="app"><svg class="app-ic" viewBox="0 0 56 56" width="56" height="56"><circle cx="28" cy="28" r="28" fill="#c9d4e3"/><g transform="translate(16 16)" fill="none" stroke="#1f2d42" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GLYPH[g]}</g></svg><span class="app-lbl" style="color:#1f2d42">${n}</span></div>`;
  return `<div><p class="cap" style="margin:0 0 8px">With themed icons on, Android tints the monochrome layer</p><div class="themed" style="background:#e4e9f1">${T('Calendar', 'cal')}${T('Maps', 'pin')}<div class="app">${themedSVG(56, '#c9d4e3', '#1f2d42')}<span class="app-lbl" style="color:#1f2d42">Sen</span></div>${T('Camera', 'camera')}</div>
  <div class="themed" style="background:#1d2129;margin-top:10px">${['cal', 'pin'].map((g, i) => `<div class="app"><svg class="app-ic" viewBox="0 0 56 56" width="56" height="56"><circle cx="28" cy="28" r="28" fill="#33405a"/><g transform="translate(16 16)" fill="none" stroke="#cfe0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GLYPH[g]}</g></svg><span class="app-lbl" style="color:#cfe0ff">${['Calendar', 'Maps'][i]}</span></div>`).join('')}<div class="app">${themedSVG(56, '#33405a', '#cfe0ff')}<span class="app-lbl" style="color:#cfe0ff">Sen</span></div></div></div>`;
}
function shadeHTML(senOnly) {
  const sb = `<div class="ssb"><span>21:02</span><span class="icons">${smallSVG(15, '#eceef2')}<svg viewBox="0 0 24 24" style="width:15px;height:15px" fill="#eceef2"><path d="M2 20h3v-4H2zM7 20h3v-7H7zM12 20h3V9h-3zM17 20h3V4h-3z"/></svg></span></div>`;
  const senMsg = `<div class="notif"><span class="nh">${smallSVG(14, '#c9ccd4')}Sen · 21:02</span><span class="nb"><span><span class="nt">Sen</span><br><span class="nx">${esc(DATA.note.t)}</span></span><canvas class="av" data-size="36" data-state="resting" data-mode="dark"></canvas></span></div>`;
  const prompt = `<div class="notif"><span class="nh">${smallSVG(14, '#c9ccd4')}Sen · now</span><span class="nt">RM12.90 · KOPI KAWAN</span><span class="nx">Which category? New merchant, paid from Ryt.</span><span class="na"><span>Drinks & desserts</span><span>Meals</span><span>Other</span></span></div>`;
  return `<div class="shade">${senOnly ? '' : sb}${senOnly ? senMsg : prompt + senMsg}</div>`;
}
function secTabs() {
  if (!DIR.tabs) return '';
  const T = DIR.tabs;
  const demo = (m) => `<div class="tabdemo-wrap"><div class="phone ${m} tabdemo"><div class="screen" data-mode="${m}">${tabbarHTML(m)}</div></div><span class="cap">${m === 'light' ? 'Light' : 'Dark'}</span></div>`;
  const sheet = (m) => `<div class="iconsheet m${m}">${['home', 'review', 'insights', 'more'].map((k) => `<div class="ic"><span class="ic2">${T.icon(k, false, m, `sh${m}${k}0`)}</span><span class="ic2">${T.icon(k, true, m, `sh${m}${k}1`)}</span><span class="cap">${k[0].toUpperCase()}${k.slice(1)}</span></div>`).join('')}<div class="ic ic-scan"><span class="ic2">${T.scan(m, `sh${m}sc`)}</span><span class="cap">The scan button</span></div></div>`;
  return `<section class="pg-sec" id="tabs"><h2 class="pg-h2">The tab bar</h2><p class="pg-p">${DIR.tabsIntro} The five tabs, their order and the outline of each icon are the same in every look (D77, D80); only the material changes. Tap a tab to see how this look moves between them.</p>
  <div class="tabdemos">${demo('light')}${demo('dark')}</div>
  <p class="cap">Each icon idle, then active, at twice its size. They’re saved as SVG files in <code>docs/ui/directions/assets/${DIR.id}/tabs/</code>, with the scan button and the badge.</p>
  <div class="iconsheets">${sheet('light')}${sheet('dark')}</div></section>`;
}
// ---------- the chart palette (palette.mjs, D77): the same hues in every look, tuned to its surfaces ----------
const VIZ = {
  cats: [['Meals', 84250, 76000], ['Shopping', 52300, 38000], ['Groceries', 41200, 45000], ['Transport', 30600, 31000], ['Drinks & desserts', 12300, 11000]],
  spoken: [['Fixed costs', 152000], ['Spent', 139550], ['Left', 128450]],
  food: [['Eating out', 84250], ['Groceries', 41200]],
  budgets: [['Drinks & desserts', 12300, 15000], ['Shopping', 52300, 80000]],
  days: [0, 4210, 0, 1250, 2890, 6420, 980, 0, 3150, 1730, 520, 8810, 2240, 0, 1450, 3980, 610, 5230, 1190],
};
function vizCats() {
  const W = 300, rowH = 30, max = 90000, lx = 116, bw = W - lx - 62;
  const g = VIZ.cats.map(([n, v, typ], i) => {
    const y = i * rowH + 6, w = bw * v / max, tx = lx + bw * typ / max, above = v > typ;
    return `<text x="0" y="${y + 13}" class="vl">${esc(n)}</text><path d="M${lx} ${y + 3}h${f2(w - 4)}a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-${f2(w - 4)}z" fill="var(${above ? '--chart-accent' : '--chart-context'})"/><line x1="${f2(tx)}" x2="${f2(tx)}" y1="${y}" y2="${y + 20}" stroke="var(--card)" stroke-width="5.5"/><line x1="${f2(tx)}" x2="${f2(tx)}" y1="${y}" y2="${y + 20}" stroke="var(--foreground)" stroke-width="1.5"/><text x="${f2(Math.max(lx + w, tx) + 6)}" y="${y + 13}" class="vv">${rm(v)}</text>`;
  }).join('');
  return `<svg class="viz" viewBox="0 0 ${W} ${VIZ.cats.length * rowH + 4}" role="img" aria-label="Each category this cycle against its typical level">${g}</svg>`;
}
function vizParts(parts, label) {
  const W = 300, total = parts.reduce((a, p) => a + p[1], 0); let x = 0;
  const segs = parts.map(([n, v], i) => { const w = (W - 2 * (parts.length - 1)) * v / total; const r = `<rect x="${f2(x)}" y="0" width="${f2(w)}" height="14" rx="${i === 0 || i === parts.length - 1 ? 4 : 0}" fill="var(--chart-${i + 1})"/>`; x += w + 2; return r; }).join('');
  const legend = parts.map(([n, v], i) => `<span><i style="background:var(--chart-${i + 1})"></i>${esc(n)} <b>${rm(v)}</b></span>`).join('');
  return `<svg class="viz" viewBox="0 0 ${W} 14" role="img" aria-label="${esc(label)}">${segs}</svg><span class="vlegend">${legend}</span>`;
}
function vizBudgets() {
  const done = DATA.day / DATA.days;
  return VIZ.budgets.map(([n, v, cap]) => {
    const share = v / cap, risk = share > done + 0.1;
    return `<div class="meter"><span class="mt"><span>${esc(n)}</span><span>${rm(v)} of ${rm(cap)}</span></span><svg class="viz" viewBox="0 0 300 12" aria-hidden="true"><rect x="0" y="2" width="300" height="8" rx="4" fill="var(--muted)"/><rect x="0" y="2" width="${f2(300 * Math.min(1, share))}" height="8" rx="4" fill="var(${risk ? '--money-warning' : '--chart-accent'})"/><line x1="${f2(300 * done)}" x2="${f2(300 * done)}" y1="0" y2="12" stroke="var(--card)" stroke-width="5.5"/><line x1="${f2(300 * done)}" x2="${f2(300 * done)}" y1="0" y2="12" stroke="var(--foreground)" stroke-width="1.5"/></svg>${risk ? `<span class="risk">${ico('alert')}At risk: ${Math.round(share * 100)}% spent, ${Math.round(done * 100)}% of the cycle gone</span>` : `<span class="cap">On track</span>`}</div>`;
  }).join('');
}
function vizCalendar() {
  const max = Math.max(...VIZ.days), cell = 36, gap = 4; let g = '';
  for (let d = 1; d <= DATA.days; d++) {
    const i = d - 1, x = (i % 7) * (cell + gap), y = Math.floor(i / 7) * (cell + gap); const v = VIZ.days[i];
    const step = v ? Math.ceil(5 * v / max) : 0;
    const fill = v === undefined ? 'none' : step ? `var(--chart-seq-${step})` : 'var(--muted)';
    g += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="6" fill="${fill}"${v === undefined ? ' stroke="var(--border)"' : ''}/><text x="${x + 5}" y="${y + 13}" class="vd${step >= 3 ? ' on' : ''}">${d}</text>`;
  }
  const steps = [1, 2, 3, 4, 5].map((k) => `<i style="background:var(--chart-seq-${k})"></i>`).join('');
  return `<svg class="viz cal" viewBox="0 0 ${7 * cell + 6 * gap} ${5 * cell + 4 * gap}" role="img" aria-label="Discretionary spending each day of the cycle">${g}</svg><span class="vlegend seq"><span>Less</span>${steps}<span>More</span></span>`;
}
function vizPanel(mode) {
  const card = (q, body, take) => `<div class="card vcard"><b class="vq">${q}</b>${body}<span class="vtake">${take}</span></div>`;
  return `<div class="vizpanel m${mode}" data-mode="${mode}"><span class="cap">${mode === 'light' ? 'Light' : 'Dark'}</span>
    ${card('Am I on track?', paceChart(STATE_VIEW.normal, mode) + '<span class="legend"><span><i style="background:var(--chart-accent)"></i>This cycle</span><span><i style="background:var(--chart-context)"></i>Last cycle</span></span>', 'RM140.00 more than last cycle by this day.')}
    ${card('Where did it go, and what changed?', vizCats(), 'Shopping is RM143.00 above its usual by day 19. The line marks typical.')}
    ${card('Which budgets are at risk?', vizBudgets(), 'Drinks & desserts is ahead of the cycle.')}
    ${card('How much is spoken for before I spend?', vizParts(VIZ.spoken, 'Fixed costs, spent and left'), 'RM1,520.00 is fixed each cycle.')}
    ${card('Eating out or cooking?', vizParts(VIZ.food, 'Eating out against groceries'), 'Two ringgit out for every one at home.')}
    ${card('When does the money leak?', vizCalendar(), 'The 12th: RM88.10 on the day.')}
  </div>`;
}
function secCharts() {
  const R = CHART_REPORT[DIR.id];
  const sw = (m) => `<div class="swatches m${m}"><span class="cap">${m === 'light' ? 'Light' : 'Dark'}</span>${CHART_HUES.map((h) => `<span class="swc"><i style="background:var(--chart-${h.slot})"></i><b>${h.slot} ${h.name}</b><code>${CHARTS[DIR.id][m][`chart-${h.slot}`]}</code></span>`).join('')}<span class="swc"><i style="background:var(--chart-accent)"></i><b>Accent</b><code>${DIR.tokens[m]['chart-accent']}</code></span><span class="swc"><i style="background:var(--chart-context)"></i><b>Context, Other</b><code>${DIR.tokens[m]['chart-context']}</code></span><span class="swc seq">${[1, 2, 3, 4, 5].map((k) => `<i style="background:var(--chart-seq-${k})"></i>`).join('')}<b>Sequential</b></span>
    <span class="cap">Every pair: colour-blind ΔE ${R[m].cvd}, normal ${R[m].normal}. Slots ${R[m].contrast.map((c) => `${c}:1`).join(', ')} on the card.</span></div>`;
  return `<section class="pg-sec" id="charts"><h2 class="pg-h2">Charts</h2><p class="pg-p">Most of Sen’s charts use two colours: the accent for what’s in focus, such as this cycle, and grey for context. When a chart shows different things side by side, they take three hues, blue, orchid and gold, in that order. The hues are the same in every look; only their lightness is tuned to ${DIR.name}’s surfaces. They keep clear of the colours that already mean something: green for money in, amber for a warning, red, and Copper’s verdigris. A budget at risk takes the warning colour, always with its icon and words.</p>
  <div class="swrow">${sw('light')}${sw('dark')}</div>
  <div class="vizrow">${vizPanel('light')}${vizPanel('dark')}</div>
  <p class="cap">All figures made up. Checked with the dataviz skill’s validator by <code>docs/ui/directions/palette.mjs</code>, which writes these colours into each look’s tokens.</p></section>`;
}
function secTheme() {
  return `<section class="pg-sec" id="theme"><h2 class="pg-h2">The theme</h2><p class="pg-p">${DIR.themeIntro} shadcn’s variables in light and dark, plus the money colours, which always mean the same thing (D58). Contrast is measured against the background. The chart palette is in the section above.</p>
  <div class="moneyrow"><div class="mchip in"><span>Money in</span><b>+RM4,200.00</b></div><div class="mchip out"><span>Money out</span><b>RM12.90</b></div><div class="mchip pend"><span>Not synced yet</span><b>RM6.50</b></div><div class="mchip warn"><span>Warning</span><b>Over by RM215.40</b></div></div>
  <div class="icrow" aria-label="The shared icons in this look">${['x', 'up', 'plus', 'camera', 'image', 'cal', 'sliders', 'wallet', 'calc', 'alert'].map((k) => `<span class="${k === 'alert' ? 'warn' : ''}">${ico(k)}</span>`).join('')}</div><p class="cap">Every icon outside the tab bar is the same lucide set in all six looks (D81). ${DIR.name} draws it at weight ${DIR.icons.weight}, with ${DIR.icons.cap} ends and ${DIR.icons.join} corners, in its icon colour; a warning takes the warning colour.</p>
  <div class="tokwrap"><table class="tok" id="tok"></table></div>
  <div class="modes"><div class="modebox spec"><span class="cap">Type</span><span class="s1">${DIR.heroFigure ? DIR.heroFigure(128450, pageMode(), STATE_VIEW.normal) : defaultFigure(128450)}</span><span class="s2">${DIR.typeNote.display}</span><span class="s3">${DIR.typeNote.ui}</span><span class="s4">${DIR.typeNote.voice}</span></div>
  <div class="cssbox"><button class="copy" id="copy-css">Copy</button><pre id="css-out"></pre></div></div></section>`;
}
function secTrade() { return `<section class="pg-sec" id="tradeoffs"><h2 class="pg-h2">Trade-offs</h2><div class="tradeoffs"><div><h3>What it does well</h3><ul>${DIR.good.map((x) => `<li>${x}</li>`).join('')}</ul></div><div><h3>What to weigh</h3><ul>${DIR.weigh.map((x) => `<li>${x}</li>`).join('')}</ul></div></div><p class="foot">${DIR.name} is one of six looks in Sen’s pool, and four of them play each year, one per quarter (D77, D78). Each is a theme, an icon and Sen’s avatar, designed together. Fonts load from Google here; the app will host its own (§17). All figures are made up.</p></section>`; }
const SEN_PROFILE = {
  role: 'Your money secretary. It plans, watches, researches, chases and reviews.',
  voice: 'Brief and plain, like a friend who’s good with money. Short, specific, no lectures.',
  does: 'A note at 9pm when something’s worth saying. The payday plan. Answers about where the money went. Proposals you apply with a tap.',
  promises: 'Every figure it states comes from your data, never its own maths. It changes nothing without your tap.',
};

// ---------- tokens: the table and the CSS ----------
const TOKEN_ROWS = [
  ['background', null], ['foreground', 'background'], ['card', null], ['muted-foreground', 'background'], ['primary', 'background'], ['primary-foreground', 'primary'],
  ['secondary', null], ['accent', null], ['border', null], ['ring', null], ['destructive', 'background'],
  ['money-in', 'background'], ['money-out', 'background'], ['money-pending', 'background'], ['money-warning', 'background'], ['icon', 'background'], ['chart-accent', 'card'], ['chart-context', 'card'], ['chart-1', 'card'], ['chart-2', 'card'], ['chart-3', 'card'],
];
function tokenTable() {
  const T = DIR.tokens; let h = '<thead><tr><th>Token</th><th>Light</th><th>Dark</th></tr></thead><tbody>';
  for (const [k, against] of TOKEN_ROWS) {
    const cell = (m) => { const v = T[m][k]; let r = ''; if (against) { const c = contrast(v, T[m][against]); r = `<span class="ratio${c >= 4.5 || (k.startsWith('chart') && c >= 3) ? ' ok' : ''}">${c.toFixed(1)}:1</span>`; } return `<td><span class="sw" style="background:${v}"></span><code>${v}</code>${r}</td>`; };
    h += `<tr><td><code>--${k}</code></td>${cell('light')}${cell('dark')}</tr>`;
  }
  return h + '</tbody>';
}
function cssExport() {
  const block = (sel, m) => `${sel} {\n` + Object.entries(DIR.tokens[m]).map(([k, v]) => `  --${k}: ${oklch(v)};`).join('\n') + '\n}';
  return `/* Sen, ${DIR.name}: shadcn/ui tokens plus Sen's money, chart and icon tokens */\n:root {\n  --radius: ${DIR.radius || '0.875rem'};\n  --icon-stroke: ${DIR.icons.weight};\n  --icon-cap: ${DIR.icons.cap};\n  --icon-join: ${DIR.icons.join};\n  --icon-dot-cap: ${dotCap(DIR.icons.cap)};\n}\n${block(':root', 'light')}\n${block('.dark', 'dark')}`;
}
// page and phone token blocks, generated once at boot
// lucide draws a dot as a zero-length line, which butt ends would hide, so dots take square ends there
const dotCap = (cap) => (cap === 'butt' ? 'square' : cap);
function iconVars() { const I = DIR.icons; return `--icon-stroke:${I.weight};--icon-cap:${I.cap};--icon-join:${I.join};--icon-dot-cap:${dotCap(I.cap)};`; }
function tokenCSS() {
  const vars = (m) => Object.entries(Object.assign({}, DIR.tokens[m], DIR.extra ? DIR.extra[m] : {})).map(([k, v]) => `--${k}:${v};`).join('');
  return `:root{${iconVars()}${vars('light')}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${vars('dark')}color-scheme:dark}}:root[data-theme="dark"]{${vars('dark')}color-scheme:dark}.phone.light{${vars('light')}color-scheme:light}.phone.dark{${vars('dark')}color-scheme:dark}.mlight{${vars('light')}}.mdark{${vars('dark')}}`;
}

// ---------- boot ----------
const VIEW = { st: 'normal', view: 'both' };
function renderPhones() {
  document.querySelectorAll('#phones .phone').forEach((ph) => { const mode = ph.classList.contains('dark') ? 'dark' : 'light'; ph.innerHTML = homeHTML(mode, VIEW.st); if (DIR.decorate) DIR.decorate(ph.querySelector('.screen'), mode, VIEW.st); });
  mountAvatars(document.getElementById('phones'));
  if (VIEW.st === 'payday' && DIR.paydayFx) document.querySelectorAll('#phones .phone .screen').forEach((s) => DIR.paydayFx(s, s.dataset.mode));
  fitPhones();
}
function fitPhones() {
  const box = document.getElementById('phones'); if (!box) return; const W = box.clientWidth;
  const wraps = [...box.querySelectorAll('.phone-wrap')];
  wraps.forEach((w) => { w.hidden = VIEW.view !== 'both' && w.dataset.mode !== VIEW.view; });
  const z = VIEW.view === 'both' ? Math.min(1, (W - 14) / 780) : Math.min(1, W / 390);
  wraps.forEach((w) => { w.style.setProperty('--z', z.toFixed(4)); w.classList.toggle('zoomable', VIEW.view === 'both' && z < 0.75); });
  box.classList.toggle('has-tags', VIEW.view === 'both');
  document.getElementById('phones-hint').textContent = VIEW.view === 'both' && z < 0.75 ? 'Tap a phone to see it full size.' : '';
}
function press(group, attr, val) { group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === val))); }
function boot() {
  const st = document.createElement('style'); st.textContent = tokenCSS(); document.head.prepend(st);
  const pg = document.getElementById('pg');
  pg.innerHTML = secHead() + secHome() + secSen() + secIcon() + secTabs() + secCharts() + secTheme() + secTrade();
  if (DIR.afterBoot) DIR.afterBoot(pg);
  document.getElementById('tok').innerHTML = tokenTable();
  document.getElementById('css-out').textContent = cssExport();
  AV.io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => es.forEach((e) => { e.target._vis = e.isIntersecting; if (e.isIntersecting) e.target._dirty = true; }), { rootMargin: '80px' }) : null;
  renderPhones(); mountAvatars(pg);
  AV.t0 = performance.now(); requestAnimationFrame(avLoop);
  document.getElementById('seg-state').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; VIEW.st = b.dataset.st; press(e.currentTarget, 'st', VIEW.st); renderPhones(); });
  document.getElementById('seg-view').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; VIEW.view = b.dataset.v; press(e.currentTarget, 'v', VIEW.view); fitPhones(); });
  document.getElementById('seg-av').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; press(e.currentTarget, 's', b.dataset.s); setAv(document.getElementById('sen-big'), b.dataset.s); });
  document.getElementById('phones').addEventListener('click', (e) => {
    const wrap = e.target.closest('.phone-wrap'); if (!wrap) return; const screen = wrap.querySelector('.screen');
    if (wrap.classList.contains('zoomable')) { VIEW.view = wrap.dataset.mode; press(document.getElementById('seg-view'), 'v', VIEW.view); fitPhones(); return; }
    if (e.target.closest('.fab')) return openSheet(screen);
    if (e.target.closest('.close') || e.target.closest('.scrim')) return closeSheet(screen);
    const chip = e.target.closest('.chip'); if (chip) return ask(screen, +chip.dataset.q);
    const tab = e.target.closest('.tabbar .tab'); if (tab) return switchTab(tab.closest('.tabbar'), tab);
  });
  const tabsSec = document.getElementById('tabs');
  if (tabsSec) tabsSec.addEventListener('click', (e) => { const tab = e.target.closest('.tabbar .tab'); if (tab) switchTab(tab.closest('.tabbar'), tab); });
  document.getElementById('copy-css').addEventListener('click', async (e) => { const b = e.currentTarget; try { await navigator.clipboard.writeText(cssExport()); b.textContent = 'Copied'; } catch (_) { const r = document.createRange(); r.selectNodeContents(document.getElementById('css-out')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected'; } setTimeout(() => { b.textContent = 'Copy'; }, 1600); });
  window.addEventListener('resize', fitPhones);
  const mq = matchMedia('(prefers-color-scheme: dark)'); const redraw = () => AV.set.forEach((c) => { c._dirty = true; });
  if (mq.addEventListener) mq.addEventListener('change', redraw);
  new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
