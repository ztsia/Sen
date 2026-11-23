// Builds docs/ui/insights/design.html: the design page for Sen's Insights tab (docs/screens.md insights,
// insights/card; spec 9.3, 9.8; D152, D153, D155, D157). Run: node docs/ui/insights/design-src/build.mjs
// It reads the looks' tokens and fonts from docs/ui/directions/assets (never writes there), the icons
// (icons.mjs → icons.json), Sen's avatar stills (avatars.mjs → avatars.json) and the figures (data.json,
// dumped from the app's made-up scenario, with the cycles it doesn't hold invented to agree with it).
// Every total drawn is asserted below, to the sen, before anything is written.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dirs = path.join(here, '../../directions');
const readDir = (f) => fs.readFileSync(path.join(dirs, f), 'utf8');
const ICONS = JSON.parse(fs.readFileSync(path.join(here, 'icons.json'), 'utf8'));
const AVATARS = JSON.parse(fs.readFileSync(path.join(here, 'avatars.json'), 'utf8'));
const D = JSON.parse(fs.readFileSync(path.join(here, 'data.json'), 'utf8'));
const svgUri = (svg) => `url("data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}")`;

const LOOKS = ['minted', 'copper'];
const MODES = ['light', 'dark'];
const FONTS = [
  ['Schibsted Grotesk', '400 700', null, 'schibstedgrotesk/schibstedgrotesk-normal-400-700-latin.woff2'],
  ['Libre Caslon Display', '400', null, 'librecaslondisplay/librecaslondisplay-normal-400-latin.woff2'],
  ['Archivo', '100 900', '62% 125%', 'archivo/archivo-normal-100-900-62-125-latin.woff2'],
];

// ---------- the looks: tokens scoped to a class, fonts inline, the tab bar as CSS images ----------
function lookCss(id) {
  const theme = readDir(`assets/${id}/theme.css`);
  const blocks = [...theme.matchAll(/(:root|\.dark)\s*\{([^}]*)\}/g)].map((m) => [m[1], m[2].trim()]);
  const base = blocks.filter(([s]) => s === ':root')[0][1];
  const light = blocks.filter(([s]) => s === ':root')[1][1];
  const dark = blocks.find(([s]) => s === '.dark')[1];
  const own = (readDir(`src/${id}.css`).match(/:root\s*\{([^}]*)\}/) || [])[1] || '';
  const keep = [...own.matchAll(/(--(?:font-ui|font-display|font-num|radius-card|radius-btn)):\s*([^;]+);/g)].map((m) => `${m[1]}: ${m[2].trim()};`).join(' ');
  let css = `.lk-${id} { ${base.replace(/\s+/g, ' ')} ${keep} }\n.lk-${id}.light { ${light.replace(/\s+/g, ' ')} }\n.lk-${id}.dark { ${dark.replace(/\s+/g, ' ')} }\n`;
  for (const mode of MODES) {
    const tab = (f) => readDir(`assets/${id}/tabs/${mode}/${f}.svg`);
    const img = { home: tab('home'), review: tab('review'), insights: tab('insights'), 'insights-on': tab('insights-active'), more: tab('more'), scan: tab('scan'), badge: tab('badge').replace(/>5<\/text>/, '>12</text>') };
    for (const [k, svg] of Object.entries(img)) css += `.lk-${id}.${mode} .ti-${k} { background-image: ${svgUri(svg)}; }\n`;
  }
  return css;
}
const fontCss = FONTS.map(([family, weight, stretch, file]) => `@font-face { font-family: "${family}"; font-style: normal; font-weight: ${weight};${stretch ? ` font-stretch: ${stretch};` : ''} font-display: swap; src: url(data:font/woff2;base64,${fs.readFileSync(path.join(dirs, 'assets/fonts', file)).toString('base64')}) format("woff2"); }`).join('\n');
const avCss = LOOKS.map((l) => `.lk-${l} .av.z60 { background-image: url(${AVATARS[l].resting[60]}); } .lk-${l} .av.z24 { background-image: url(${AVATARS[l].resting[24]}); }`).join('\n');

function keys() {
  const W = 382, rh = 46, g = 6, r = []; const key = (x, y, w) => r.push(`<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${rh}" rx="6"/>`);
  const kw = (W - 9 * g) / 10;
  for (let i = 0; i < 10; i++) key(i * (kw + g), 0, kw);
  for (let i = 0; i < 9; i++) key(kw / 2 + g / 2 + i * (kw + g), 54, kw);
  key(0, 108, 50); for (let i = 0; i < 7; i++) key(kw * 1.5 + g * 1.5 + i * (kw + g), 108, kw); key(W - 50, 108, 50);
  key(0, 162, 50); key(56, 162, kw); key(56 + kw + g, 162, W - 2 * (56 + kw + g)); key(W - 56 - kw, 162, kw); key(W - 50, 162, 50);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 208" preserveAspectRatio="none">${r.join('')}</svg>`;
}

// ---------- money, and the sums every drawing must agree with ----------
const rm = (s) => { if (!Number.isInteger(s)) throw new Error(`not sen: ${s}`); const neg = s < 0; s = Math.abs(s); return `${neg ? '−' : ''}RM${String(Math.floor(s / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${String(s % 100).padStart(2, '0')}`; };
const sum = (a) => a.reduce((x, y) => x + y, 0);
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: ${a} ≠ ${b}`); };
const pct = (a, b) => Math.round((100 * a) / b);
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

const N = D.now, SEP = D.sep;
const INCOME = N.onTrack.income;                       // 580480
const SPENT = N.onTrack.thisCycle.at(-1);              // 387353
const LEFT = INCOME - SPENT;                           // 193127
eq(LEFT, 193127, 'left until payday'); eq(SPENT, 387353, 'spent this cycle');
const DUE = 8510 + 2800;                               // Claude Pro and Netflix, still to come this cycle
eq(N.spokenFor.fixed + N.spokenFor.spent + N.spokenFor.left, INCOME, 'spoken for');
eq(N.spokenFor.left, LEFT - DUE, 'free to spend is left less what is still due');
eq(N.spokenFor.fixed - DUE + N.spokenFor.spent, SPENT, 'fixed paid plus the rest is spent');
const LASTBY = N.onTrack.lastCycle[18]; eq(SPENT - LASTBY, 27353, 'more than last cycle by this day');
const EST = N.onTrack.estimate; eq(INCOME - EST, 74053, 'left on payday at this pace');
const top6 = N.whereWent.slice(0, 6); const ELSE = SPENT - sum(top6.map((r) => r.sen)); eq(ELSE, 49650, 'everything else');
const leakNow = N.leak.spent.filter((x) => x !== null); eq(sum(leakNow), 39380, 'leak total');
const wkendNow = [3, 4, 10, 11, 17, 18].reduce((a, i) => a + leakNow[i], 0); eq(wkendNow, 26130, 'leak weekend'); eq(pct(wkendNow, sum(leakNow)), 66, 'leak share');
eq(pct(N.eatOut.eatingOut, N.eatOut.eatingOut + N.eatOut.groceries) + pct(N.eatOut.groceries, N.eatOut.eatingOut + N.eatOut.groceries), 100, 'eating out shares');
const savings = N.saving.cycles.map((c) => c.sen); eq(median(savings), N.saving.median, 'saving median'); eq(N.saving.median, 123795, 'saving median value');
const subsRows = D.subs.rows; eq(sum(subsRows.map((r) => r.approx ?? r.amount)), D.subs.monthly, 'subscriptions a month');
const G = D.goals.goals; eq(G[0].perCycle + G[1].perCycle, 78500, 'dated goals a cycle');
const sepSpent = SEP.onTrack.thisCycle.at(-1); eq(sepSpent, 442570, 'September spent'); eq(SEP.spokenFor.left, 137920, 'September left');
const augSpent = SEP.onTrack.lastCycle.at(-1); eq(augSpent - sepSpent, 29040, 'September against August');
const sepTop6 = SEP.whereWent.slice(0, 6); const SEP_ELSE = sepSpent - sum(sepTop6.map((r) => r.sen));
const leakSep = SEP.leak.spent; const wkendSep = [5, 6, 12, 13, 19, 20, 26, 27].reduce((a, i) => a + (leakSep[i] || 0), 0); eq(wkendSep, 34500, 'September weekend');
const WEEKS = [N.onTrack.thisCycle[4], N.onTrack.thisCycle[11] - N.onTrack.thisCycle[4], SPENT - N.onTrack.thisCycle[11]]; eq(WEEKS[2], 70353, 'last week'); eq(sum(WEEKS), SPENT, 'weeks');
// the catalogue's own figures
const BYACC = { Aug: [362040, 70230, 30140, 9200], Sep: [341020, 64050, 28500, 9000], Oct: [307353, 50000, 22000, 8000] };
eq(sum(BYACC.Aug), augSpent, 'August by account'); eq(sum(BYACC.Sep), sepSpent, 'September by account'); eq(sum(BYACC.Oct), SPENT, 'October by account');
const FLOW = { pb: [192990, 125673, 81817], ryt: [0, 50000, 100000], tng: [0, 30000, 0] };
eq(sum([...FLOW.pb, ...FLOW.ryt, ...FLOW.tng]), INCOME, 'flow from pay');
eq(FLOW.pb[1] + FLOW.ryt[1] + FLOW.tng[1], N.spokenFor.spent, 'flow spent'); eq(FLOW.pb[2] + FLOW.ryt[2], N.spokenFor.left, 'flow left');
const yearM = D.year.months; const julLeft = yearM[6].income - yearM[6].spent; eq(julLeft, 109670, 'July left');
// each cycle's bar agrees with the cycle picker's "left" and with September's own figures
yearM.slice(3, 9).forEach((m, i) => eq(m.income - m.spent, savings[i], `${m.label} left`));
eq(yearM[8].spent, sepSpent, 'Sep bar');
const under6 = yearM.slice(3, 9).filter((m) => m.spent < m.income).length; if (under6 !== 6) throw new Error('takeaway: ' + under6);
const yr9 = yearM.slice(0, 9), yrRate = (sum(yr9.map((m) => m.income)) - sum(yr9.map((m) => m.spent))) / sum(yr9.map((m) => m.income));

// ---------- small parts ----------
const I = (name, cls = '') => { if (!ICONS[name]) throw new Error(`icon ${name} is not in icons.json: add it to icons.mjs`); return `<svg class="lu${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`; };
const tile = (icon, tone = '') => `<span class="tile${tone ? ` ${tone}` : ''}">${I(icon)}</span>`;
const SBAR = `<div class="sbar"><span>20:41</span><span><svg viewBox="0 0 16 16"><path d="M1 12h2.4v3H1zM5.2 9h2.4v6H5.2zM9.4 6h2.4v9H9.4zM13.6 2H16v13h-2.4z"/></svg><svg viewBox="0 0 16 16"><path d="M8 14.2 5.6 11.4a3.4 3.4 0 0 1 4.8 0zM3.5 9a6.4 6.4 0 0 1 9 0l-1.2 1.4a4.6 4.6 0 0 0-6.6 0zM.9 6a10 10 0 0 1 14.2 0L13.9 7.4a8.2 8.2 0 0 0-11.8 0z"/></svg><svg viewBox="0 0 22 16" style="width:22px"><rect x="1" y="3.5" width="17" height="9" rx="2.5" fill="none" stroke="currentColor"/><rect x="2.5" y="5" width="11" height="6" rx="1.2"/><rect x="19.2" y="6" width="1.8" height="4" rx=".9"/></svg></span></div>`;
const tabbar = () => `<div class="tabbar"><span><i class="ti-home"></i>Home</span><span><i class="ti-review"></i><i class="bdg ti-badge"></i>Review</span><span class="scan"><i class="ti-scan"></i>Scan</span><span class="on"><i class="ti-insights-on"></i>Insights</span><span><i class="ti-more"></i>More</span></div>`;
const FAB = '<span class="av z60 fab" role="img" aria-label="Ask Sen"></span>';
const av24 = '<span class="av z24"></span>';
const ASOF = 'As of 20:41';
const x = (n) => n.toFixed(1);

// ---------- the charts (inline SVG at the card's inner width, so 1 unit is 1 px on a 390 px phone) ----------
const WW = 328, SW = 143; // a wide card's inner width, a small card's
const svg = (w, h, inner, cls = '') => `<svg class="ch${cls ? ` ${cls}` : ''}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
const grid = (x0, x1, ys) => ys.map((y) => `<line x1="${x0}" x2="${x1}" y1="${x(y)}" y2="${x(y)}" stroke="var(--border)" stroke-width="1"/>`).join('');
const dot = (cx, cy, fill = 'var(--chart-accent)') => `<circle cx="${x(cx)}" cy="${x(cy)}" r="4" fill="${fill}" stroke="var(--card)" stroke-width="2"/>`;
const colBar = (bx, by, bw, bh, fill, r = 4) => { if (bh <= 0) return ''; r = Math.min(r, bh, bw / 2); return `<path d="M${x(bx)} ${x(by + bh)}V${x(by + r)}q0 -${r} ${r} -${r}H${x(bx + bw - r)}q${r} 0 ${r} ${r}V${x(by + bh)}Z" fill="${fill}"/>`; };
const hBar = (bx, by, bw, bh, fill, r = 4) => { if (bw <= 0) return ''; r = Math.min(r, bw, bh / 2); return `<path d="M${x(bx)} ${x(by)}H${x(bx + bw - r)}q${r} 0 ${r} ${r}V${x(by + bh - r)}q0 ${r} -${r} ${r}H${x(bx)}Z" fill="${fill}"/>`; };
const t = (tx, ty, s, o = '') => `<text x="${x(tx)}" y="${x(ty)}" ${o}>${s}</text>`;

// Am I on track? cumulative spending against last cycle, the estimate dashed, income as the ceiling
function paceSvg(P, { w = WW, h = 150, tap = null, big = false } = {}) {
  const days = P.days, top = 600000, x0 = 0, x1 = w, y0 = big ? 18 : 16, y1 = h - 20;
  const X = (i) => x0 + ((x1 - x0) * i) / (days - 1), Y = (v) => y1 - ((y1 - y0) * v) / top;
  const pts = (a) => a.slice(0, days).map((v, i) => `${x(X(i))},${x(Y(v))}`).join(' ');
  const n = P.thisCycle.length, last = P.thisCycle[n - 1];
  let s = grid(x0, x1, [Y(0), Y(200000), Y(400000)]);
  s += t(x1, Y(200000) + 13, 'RM2,000', 'text-anchor="end"') + t(x1, Y(400000) + 13, 'RM4,000', 'text-anchor="end"');
  s += `<line x1="${x0}" x2="${x1}" y1="${x(Y(P.income))}" y2="${x(Y(P.income))}" stroke="var(--muted-foreground)" stroke-width="1" stroke-dasharray="4 3"/>`;
  s += t(x1, Y(P.income) - 5, `Income ${rm(P.income)}`, 'text-anchor="end"');
  s += `<polyline points="${pts(P.lastCycle)}" fill="none" stroke="var(--chart-context)" stroke-width="2" stroke-linejoin="round"/>`;
  s += `<path d="M${x(X(0))} ${x(Y(0))}L${pts(P.thisCycle).replace(/ /g, 'L')}L${x(X(n - 1))} ${x(Y(0))}Z" fill="color-mix(in oklab, var(--chart-accent) 9%, transparent)"/>`;
  if (P.estimate) s += `<line x1="${x(X(n - 1))}" y1="${x(Y(last))}" x2="${x(X(days - 1))}" y2="${x(Y(P.estimate))}" stroke="var(--chart-accent)" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="butt"/>`;
  s += `<polyline points="${pts(P.thisCycle)}" fill="none" stroke="var(--chart-accent)" stroke-width="2" stroke-linejoin="round"/>`;
  if (tap !== null) s += `<line x1="${x(X(tap))}" x2="${x(X(tap))}" y1="${y0 - 6}" y2="${y1}" stroke="var(--foreground)" stroke-width="1"/>` + dot(X(tap), Y(P.lastCycle[tap]), 'var(--chart-context)') + dot(X(tap), Y(P.thisCycle[tap]));
  else if (P.estimate) s += dot(X(n - 1), Y(last));
  s += t(0, h - 4, P.from) + (P.estimate ? t(X(n - 1), h - 4, 'Today', 'text-anchor="middle" class="fg"') : '') + t(x1, h - 4, P.to, 'text-anchor="end"');
  return svg(w, h, s);
}
const paceLegend = (P) => `<div class="lg mut" style="font-size:var(--f12);margin-top:8px"><span><i style="background:var(--chart-accent)"></i>${P.thisLabel}</span><span><i style="background:var(--chart-context)"></i>${P.lastLabel}</span>${P.estimate ? '<span><i class="dash"></i>Estimate to payday</span>' : ''}</div>`;
const PACE_NOW = { ...N.onTrack, from: '30 Sep', to: '29 Oct', thisLabel: 'This cycle', lastLabel: 'Last cycle' };
const PACE_SEP = { ...SEP.onTrack, estimate: null, income: 580490, from: '31 Aug', to: '29 Sep', thisLabel: 'September', lastLabel: 'August' };

// ColumnBars: the latest in the accent, the rest grey, a median or limit line named on the line
function columns(vals, labels, { w = WW, h = 132, line = null, lineLabel = '', top = null, valueLast = null, allLabels = true, accentAll = false } = {}) {
  const gut = line !== null && lineLabel ? 64 : 0, n = vals.length, gap = w > 200 ? 12 : 8, bw = (w - gut - gap * (n - 1)) / n, y0 = 18, y1 = h - 20; top = top || Math.max(...vals, line || 0) * 1.08;
  const Y = (v) => y1 - ((y1 - y0) * v) / top;
  let s = `<line x1="0" x2="${w}" y1="${y1}" y2="${y1}" stroke="var(--border)"/>`;
  vals.forEach((v, i) => { const bx = i * (bw + gap); s += colBar(bx, Y(v), bw, y1 - Y(v), i === n - 1 || accentAll ? 'var(--chart-accent)' : 'var(--chart-context)'); if (allLabels || i === 0 || i === n - 1) s += t(bx + bw / 2, h - 4, labels[i], `text-anchor="middle"${i === n - 1 ? ' class="fg"' : ''}`); });
  if (valueLast) s += t((n - 1) * (bw + gap) + bw / 2, Y(vals[n - 1]) - 6, valueLast, 'text-anchor="middle" class="b"');
  if (line !== null) s += `<line x1="0" x2="${w}" y1="${x(Y(line))}" y2="${x(Y(line))}" stroke="var(--muted-foreground)" stroke-width="1" stroke-dasharray="4 3"/>` + (lineLabel ? t(w, Y(line) - 6, lineLabel[0], 'text-anchor="end" class="fg"') + t(w, Y(line) + 14, lineLabel[1], 'text-anchor="end"') : '');
  return svg(w, h, s);
}

// the calendar: each day shaded by discretionary spending, on the sequential ramp
const shade = (v) => (v === null ? null : v === 0 ? 0 : v <= 1500 ? 1 : v <= 3000 ? 2 : v <= 7500 ? 3 : v <= 15000 ? 4 : 5);
function calendar(daily, startCol, { w = SW, today = null } = {}) {
  const g = 3, c = (w - 6 * g) / 7, hd = 16; const rows = Math.ceil((startCol + daily.length) / 7);
  let s = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => t(i * (c + g) + c / 2, 11, d, `text-anchor="middle"${i > 4 ? ' class="fg"' : ''}`)).join('');
  daily.forEach((v, i) => {
    const k = startCol + i, cx = (k % 7) * (c + g), cy = hd + Math.floor(k / 7) * (c + g), sh = shade(v);
    if (sh === null) s += `<rect x="${x(cx + .5)}" y="${x(cy + .5)}" width="${x(c - 1)}" height="${x(c - 1)}" rx="3" fill="none" stroke="var(--border)" stroke-dasharray="2 2"/>`;
    else s += `<rect x="${x(cx)}" y="${x(cy)}" width="${x(c)}" height="${x(c)}" rx="3" fill="${sh ? `var(--chart-seq-${sh})` : 'var(--muted)'}"${sh ? '' : ' stroke="var(--border)"'}/>`;
    if (i === today) s += `<rect x="${x(cx - 2)}" y="${x(cy - 2)}" width="${x(c + 4)}" height="${x(c + 4)}" rx="5" fill="none" stroke="var(--foreground)" stroke-width="2"/>`;
  });
  return svg(w, hd + rows * (c + g) - g + 2, s);
}
const ramp = '<div class="ramp">Less<span></span><i style="background:var(--muted);box-shadow:inset 0 0 0 1px var(--border)"></i>' + [1, 2, 3, 4, 5].map((i) => `<i style="background:var(--chart-seq-${i})"></i>`).join('') + '<span></span>More</div>';

// a spark: a tiny line, dashed here because the meal average is an estimate
function spark(vals, from, to, { w = SW, h = 48, dashed = false } = {}) {
  const lo = Math.min(...vals) * 0.9, hi = Math.max(...vals) * 1.04, y0 = 6, y1 = h - 18, n = vals.length;
  const X = (i) => 4 + ((w - 8) * i) / (n - 1), Y = (v) => y1 - ((y1 - y0) * (v - lo)) / (hi - lo);
  const p = vals.map((v, i) => `${x(X(i))},${x(Y(v))}`).join(' ');
  return svg(w, h, `<polyline points="${p}" fill="none" stroke="var(--chart-accent)" stroke-width="2" stroke-linejoin="round"${dashed ? ' stroke-dasharray="4 3"' : ''}/>${dot(X(n - 1), Y(vals[n - 1]))}${t(0, h - 3, from)}${t(w, h - 3, to, 'text-anchor="end" class="fg"')}`);
}

// a ring, for a goal (GoalMeter: the accent, never a warning)
function ring(p, size = 64, label = `${p}%`) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r, cx = size / 2;
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${cx}" cy="${cx}" r="${x(r)}" fill="none" stroke="var(--muted)" stroke-width="6"/><circle cx="${cx}" cy="${cx}" r="${x(r)}" fill="none" stroke="var(--chart-accent)" stroke-width="6" stroke-dasharray="${x((c * p) / 100)} ${x(c)}" transform="rotate(-90 ${cx} ${cx})"/><text x="${cx}" y="${cx + 4.5}" text-anchor="middle">${label}</text></svg>`;
}

// ---------- a card: the question, the figure or takeaway, its change, the view, then as of ----------
const chg = (icon, text, kind = '') => `<p class="chg${kind ? ` ${kind}` : ''}">${I(icon, 's14')}<span>${text}</span></p>`;
function card(o) {
  const head = `<div class="kh"><h3 class="q">${o.q}</h3>${o.isNew ? '<span class="badge acc">New</span>' : ''}</div>`;
  const asof = o.asof === false ? '' : `<div class="asof"><span class="t${o.asofCls ? ` ${o.asofCls}` : ''}">${o.asofIcon ? I(o.asofIcon, 's14') : ''}${o.asof || ASOF}</span>${o.asofR || ''}</div>`;
  const body = head + (o.fig ? `<p class="fig num">${o.fig}</p>` : '') + (o.take ? `<p class="take">${o.take}</p>` : '') + (o.chg || '') + (o.view ? `<div class="view">${o.view}</div>` : '') + (o.after || '') + asof;
  const cls = `kc${o.w ? ' w' : ''}${o.cls ? ` ${o.cls}` : ''}${o.isNew ? ' new' : ''}`;
  if (!o.arr) return `<div class="${cls}"${o.style ? ` style="${o.style}"` : ''}>${body}</div>`;
  const ctl = `<div class="ctl"><span class="hdl${o.hdlOpen ? ' open' : ''}">${I('grip-vertical')}</span><span class="sp"></span><span class="sz">${o.w ? `${I('square', 's16')}Small` : `${I('rectangle-horizontal', 's16')}Wide`}</span><span class="rm">${I('x')}</span></div>`;
  return `<div class="${cls}"${o.style ? ` style="${o.style}"` : ''}>${ctl}<div class="body">${body}</div>${o.extra || ''}</div>`;
}

// ---------- the fifteen seeded cards ----------
const C = {};
C.onTrack = (o = {}, P = PACE_NOW) => card({ w: true, q: 'Am I on track?', fig: `${rm(P === PACE_NOW ? LEFT : SEP.spokenFor.left)} left`, take: P === PACE_NOW ? 'for 12 days, until payday on Fri 30 Oct' : 'at payday, Wed 30 Sep',
  chg: P === PACE_NOW ? chg('trending-up', `${rm(SPENT - LASTBY)} more spent than by this day last cycle`) : chg('trending-down', `${rm(augSpent - sepSpent)} less spent than in August`),
  view: paceSvg(P) + paceLegend(P), ...o });
function meters(rows, share, past) {
  return `<div class="mt">${rows.map((r) => { const over = r.sen > r.cap, p = Math.min(100, (100 * r.sen) / r.cap), pace = !past && r.sen / share > r.cap;
    return `<div><p class="lb"><span>${r.label.replace('&', '&amp;')}</span><span class="num">${rm(r.sen)} of ${rm(r.cap)}</span></p><div class="bar"><i class="${over ? 'warn' : ''}" style="width:${x(p)}%"></i>${past ? '' : `<u style="left:${x(share * 100)}%"></u>`}</div>${over ? `<p class="note warn">${I('circle-alert', 's14')}Over by ${rm(r.sen - r.cap)}</p>` : pace ? `<p class="note">${I('trending-up', 's14')}Ahead of pace for the cycle</p>` : ''}</div>`; }).join('')}</div>`;
}
C.budgets = (o = {}, past = false) => card({ w: true, q: 'Which budgets are at risk?',
  take: past ? 'None went over. Meals came closest, at 86%.' : 'Shopping is over. Meals is ahead of pace.',
  view: meters(past ? SEP.budgets.rows : N.budgets.rows, past ? 1 : N.budgets.cycleShare, past) + (past ? '' : '<div class="lg mut" style="font-size:var(--f12);margin-top:12px"><span style="white-space:normal"><i class="tick"></i>Day 19 of 30: where an even pace would be</span></div>'), ...o });
function ranked(rows, other, { all = false, hi = null } = {}) {
  const top = Math.max(...rows.map((r) => Math.max(r.sen, r.typical)));
  return `<div class="mt rk2">${rows.map((r) => { const above = r.sen > r.typical * 1.1;
    return `<div${hi === r.label ? ' class="on"' : ''}><p class="lb"><span>${r.label.replace('&', '&amp;')}</span><span class="num">${rm(r.sen)}</span></p><div class="bar rb"><i style="width:${x((100 * r.sen) / top)}%;background:var(${above ? '--chart-accent' : '--chart-context'})"></i><u style="left:${x((100 * r.typical) / top)}%"></u></div>${all && above ? `<p class="note">${I('trending-up', 's14')}${rm(r.sen - r.typical)} above usual</p>` : ''}</div>`; }).join('')}${other ? `<p class="lb mut" style="font-size:var(--f13)"><span>Everything else</span><span class="num">${rm(other)}</span></p>` : ''}</div>`;
}
const rankLegend = '<div class="lg mut" style="font-size:var(--f12);margin-top:10px"><span><i class="sq" style="background:var(--chart-accent)"></i>Well above usual</span><span><i class="tick"></i>Usual by this day</span></div>';
C.where = (o = {}, past = false) => card({ w: true, q: 'Where did it go, and what changed?',
  take: past ? 'Most went to Home &amp; bills. Shopping ran above usual.' : 'Most went to Home &amp; bills. Meals and Shopping are above usual.',
  chg: past ? chg('trending-up', `Shopping ${rm(sepTop6[4].sen - sepTop6[4].typical)} above usual`) : chg('trending-up', `Meals ${rm(93293 - 71070)} and Shopping ${rm(32030 - 17060)} above usual`),
  view: ranked(past ? sepTop6 : top6, past ? SEP_ELSE : ELSE) + rankLegend, ...o });
C.leak = (o = {}, past = false) => card({ q: 'When does the money leak?', fig: `${past ? pct(wkendSep, sum(leakSep)) : 66}%`, take: 'of spending on extras fell on a weekend',
  view: (past ? calendar(leakSep, 0) : calendar(N.leak.spent, 2, { today: 18 })) + ramp, ...o });
C.small = (o = {}, past = false) => card({ q: 'Do the small things add up?', fig: rm(past ? 31560 : 17710), take: `on ${past ? 38 : 22} payments under RM15`,
  view: `<div class="dots">${'<i></i>'.repeat(past ? 38 : 22)}</div>`, chg: chg('info', `About ${past ? 7 : 5}% of what you spent`), ...o });
C.meal = (o = {}) => card({ q: 'What does a meal cost me?', fig: `${rm(3009)} <span class="badge">Estimate</span>`, take: 'a meal, over 31 meals',
  chg: chg('trending-up', `${rm(3009 - 2111)} more than in September`), view: spark(N.meal.history.map((h) => h.sen), 'May', 'Oct', { dashed: true }), ...o });
C.experiment = (o = {}) => card({ q: 'Am I keeping my experiment?', fig: '1 of 2', take: 'full weeks kept: GrabFood at most 3 a week',
  view: columns([5, 3, 1], ['28 Sep', '5 Oct', '12 Oct'], { w: SW, h: 104, line: 3, lineLabel: '', top: 6 }).replace('</svg>', `${t(SW, 104 - 20 - (64 * 3) / 6 - 5, 'Limit 3', 'text-anchor="end" class="fg"')}</svg>`), chg: chg('calendar-days', 'This week: 1 so far'), ...o });
const seg = (parts, h = 10, tick = null) => `<div class="seg" style="height:${h}px;position:relative">${parts.map(([v, c]) => `<i style="flex:${v};background:var(${c})"></i>`).join('')}${tick !== null ? `<u style="position:absolute;left:${tick}%;top:-4px;bottom:-4px;width:2px;margin-left:-1px;background:var(--foreground);box-shadow:0 0 0 2px var(--card);border-radius:1px"></u>` : ''}</div>`;
const lgdRows = (rows, total) => `<div class="lgd">${rows.map(([c, l, v, p]) => `<div><i style="background:var(${c})"></i><span>${l}</span><span class="num">${v}</span>${p !== undefined ? `<span class="pc">${p}</span>` : '<span></span>'}</div>`).join('')}${total ? `<div class="tot"><span></span><span>${total[0]}</span><span class="num">${total[1]}</span></div>` : ''}</div>`;
C.eatOut = (o = {}) => card({ w: true, q: 'Eating out or cooking?', fig: '79% eating out', take: 'of what went on food this cycle',
  chg: chg('trending-up', 'Up from a usual 66%'),
  view: seg([[93293, '--chart-1'], [24330, '--chart-2']], 10, 66) + lgdRows([['--chart-1', 'Eating out (Meals)', rm(93293), '79%'], ['--chart-2', 'Groceries', rm(24330), '21%']]) + '<div class="lg mut" style="font-size:var(--f12);margin-top:8px"><span><i class="tick"></i>Your usual share, 66%</span></div>', ...o });
C.spoken = (o = {}) => card({ w: true, q: 'How much is spoken for before I spend?', fig: `${rm(N.spokenFor.fixed)} fixed`, take: `of ${rm(INCOME)} pay, with ${rm(DUE)} of it still to come`,
  view: seg([[N.spokenFor.fixed, '--chart-1'], [N.spokenFor.spent, '--chart-2'], [N.spokenFor.left, '--chart-3']]) + lgdRows([['--chart-1', 'Fixed costs', rm(N.spokenFor.fixed)], ['--chart-2', 'Spent on the rest', rm(N.spokenFor.spent)], ['--chart-3', 'Free to spend', rm(N.spokenFor.left)]], ['Pay', rm(INCOME)]), ...o });
const SUBROW = [['Claude Pro', 'Tue 20 Oct', `≈ ${rm(8510)}`, 'USD 20.00', 3], ['Netflix Basic', 'Thu 22 Oct', rm(2800), '', 3], ['iCloud+ 200 GB', 'Tue 3 Nov', rm(490), '', 3], ['Spotify Premium', 'Thu 12 Nov', rm(2390), '', 3]];
const subRows = (rows) => `<div class="rows">${rows.map(([n, d, a, cur, k]) => `<div class="rw"><span class="g">${n}<small>${d} <span class="hist">${'<i></i>'.repeat(k)}<i class="ex"></i></span></small></span><span class="r fc">${a}${cur ? `<small>${cur}</small>` : ''}</span></div>`).join('')}</div><div class="lg mut" style="font-size:var(--f12);margin-top:6px"><span><span class="hist"><i></i></span>Charged as expected</span><span><span class="hist"><i class="ex"></i></span>Expected next</span></div>`;
C.renews = (o = {}) => card({ w: true, q: 'What renews soon?', fig: `${rm(D.subs.monthly)} a month`, take: 'on 4 subscriptions. Every past charge matched.', view: subRows(SUBROW), ...o });
C.saving = (o = {}) => card({ w: true, q: 'Am I saving more than before?', fig: rm(137920), take: 'left at September’s payday',
  chg: chg('trending-up', `${rm(137920 - 123795)} above the median of the last 6 cycles`, 'good'),
  view: columns(savings, ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], { line: 123795, lineLabel: ['Median', rm(123795)] }), ...o });
C.goals = (o = {}) => card({ w: true, q: 'Will my goals make it?', take: `The dated goals need ${rm(78500)} a cycle. You’ve had a median ${rm(123795)} left over the last 6.`,
  view: `<div class="rings">${G.map((g) => `<div>${ring(Math.floor((100 * g.saved) / g.target))}<b>${g.name.replace('Road tax and insurance', 'Road tax')}</b><span class="num">${rm(g.saved)}<br>of ${rm(g.target)}</span><span>${g.targetDate ? `${rm(g.perCycle)} a cycle` : 'No date set'}</span></div>`).join('')}</div>`, ...o });
C.trust = (o = {}) => card({ q: 'Can I trust these numbers?', fig: rm(5340), take: 'left your accounts with no payment to match it',
  view: columns(N.trust.cycles.map((c) => c.sen), ['Apr', '', '', '', '', '', 'Oct'], { w: SW, h: 84, allLabels: false }), chg: chg('trending-up', `Up from ${rm(610)} in September`), ...o });
const MERCH = [['GrabFood', 9, 24480], ['PLUS Malaysia', 7, 3070], ['Chicken Rice Shop', 6, 7400], ['ZUS Coffee', 4, 5770], ['Nando’s', 3, 20680]];
C.merchants = (o = {}) => card({ q: 'Where do I spend most often?', fig: 'GrabFood', take: `9 times, ${rm(24480)}`,
  view: `<div class="tl">${MERCH.slice(1).map(([n, k]) => `<div><p class="n"><span>${n}</span><span>×${k}</span></p><span class="tb" style="width:${x((100 * k) / 9)}%"></span></div>`).join('')}</div>`, ...o });
const YEAR_ROW = `<div class="gc"><div class="nrow">${tile('calendar', 'ta')}<span class="g">The year<small>2026 by month · ${(yrRate * 100).toFixed(1)}% saved · ${rm(9000)} tagged for relief</small></span>${I('chevron-right')}</div></div>`;

const TAB_CARDS = {
  'This cycle': (o = {}) => [C.onTrack(o), C.budgets(o), C.leak(o), C.small(o), C.where(o)],
  Food: (o = {}) => [C.meal(o), C.experiment(o), C.eatOut(o)],
  Commitments: (o = {}) => [C.spoken(o), C.renews(o)],
  'Over time': (o = {}) => [C.saving(o), C.goals(o), C.trust(o), C.merchants(o), YEAR_ROW],
};

// ---------- the screen ----------
const TABS4 = ['This cycle', 'Food', 'Commitments', 'Over time'];
const TABS8 = [...TABS4, 'Savings', 'Car', 'Japan', 'Work claims'];
// the cycle row: ‹ [the cycle, its dates ▾ / its day or when it closed] ›  (the owner chose arrows and the list together)
const cycRow = ({ name, dates, line2, prev = true, next = true, open = false }) => `<div class="cyc"><span class="ar${prev ? '' : ' off'}" aria-label="Previous cycle">${I('chevron-left')}</span><span class="pick${open ? ' open' : ''}"><span class="l1">${name} <span class="d">· ${dates}${I('chevron-down', 's16')}</span></span><span class="l2">${line2}</span></span><span class="ar${next ? '' : ' off'}" aria-label="Next cycle">${I('chevron-right')}</span></div>`;
const CYC_NOW = cycRow({ name: 'October', dates: '30 Sep – 29 Oct', line2: 'Day 19 of 30, 12 days to payday', next: false });
const CYC_SEP = cycRow({ name: 'September', dates: '31 Aug – 29 Sep', line2: 'Closed 29 Sep' });
const CYC_FIRST = cycRow({ name: 'May 2025', dates: '30 Apr – 29 May', line2: 'Closed 29 May · the first cycle Sen has', prev: false });
function tabRow(tabs, on, o = {}) {
  if (o.under) return `<div class="tabs u${o.fade ? ' fade' : ''}">${tabs.map((n) => `<span class="tc${n === on ? ' on' : ''}">${n}</span>`).join('')}</div>`;
  if (o.arr) return `<div class="tabs" style="flex-wrap:wrap;row-gap:8px">${tabs.map((n) => `<span class="tc mn${n === on ? ' on' : ''}${n === o.menuOn ? ' open' : ''}">${n}${I('chevron-down', 's16')}</span>`).join('')}<span class="tc add dash${o.addOff ? ' off' : ''}">${I('plus', 's16')}Add tab</span></div>`;
  return `<div class="tabs${o.scroll ? ' fadel' : ' fade'}">${tabs.map((n, i) => `<span class="tc${n === on ? ' on' : ''}"${i === 0 && o.scroll ? ` style="margin-left:-${o.scroll}px"` : ''}>${n}</span>`).join('')}</div>`;
}
const APPBAR = (open = false, back = '') => `<div class="appbar"><h1>Insights</h1>${back ? `<span class="btn xs sec back2">${I('undo-2', 's16')}${back}</span>` : ''}<span class="ic${open ? ' open' : ''}">${I('ellipsis')}</span></div>`;
const APPBAR_PAST = APPBAR(false, 'Back to October');
function screen(o = {}) {
  const tab = o.tab || 'This cycle', tabs = o.tabs || TABS4;
  const cards = o.cards || TAB_CARDS[tab](o.cardOpt || {});
  const top = `${o.appbar ?? APPBAR(o.menuOpen)}${o.cyc ?? CYC_NOW}${o.tabRow ?? tabRow(tabs, tab, o.tabOpt || {})}${o.cnt ? `<p class="cnt">${o.cnt}</p>` : ''}${o.banner || ''}`;
  return `<div class="scr${o.arr ? ' arr' : ''}"><div class="in"${o.y ? ` style="margin-top:-${o.y}px"` : ''}>${top}<div class="grid${o.one ? ' one' : ''}">${cards.join('')}</div></div></div>${o.fab === false ? '' : FAB}${o.done ? `<div class="done"><span class="btn">${I('check', 's18')}Done</span></div>` : ''}${tabbar()}${o.over || ''}`;
}

// ---------- the page's frames ----------
function phone({ look = 'minted', mode = 'light', inner, cap, tall = false, w = 390, h = 844, ts = 1, kb = false, alt, fold = 0 }) {
  const sz = w !== 390 || h !== 844 ? ` style="--w:${w}px;--h:${h}px"` : '';
  return `<figure class="sc-pw"${sz}><div class="sc-fr"><div class="ph lk-${look} ${mode}${tall ? ' tall' : ''}${ts !== 1 ? ' t15' : ''}${kb ? ' kbup' : ''}" role="img" aria-label="${(alt || cap).replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')}">${SBAR}${inner}${kb ? '<div class="kb"></div>' : ''}${fold ? `<div class="fold" style="top:${fold}px"><span>${fold} px · the first screen ends here</span></div>` : ''}<div class="gest"></div></div></div><figcaption>${cap}</figcaption></figure>`;
}
const strip = (inner, cap, cls = '', look = 'minted', mode = 'light') => `<figure class="sc-pw sc-cw"><div class="strip lk-${look} ${mode}${cls ? ` ${cls}` : ''}">${inner}</div><figcaption>${cap}</figcaption></figure>`;
const row = (label, items, cls = '') => `${label ? `<p class="sc-rowlbl">${label} <span class="sc-swipe">· swipe sideways</span></p>` : ''}<div class="sc-row${cls ? ` ${cls}` : ''}">${items.join('')}</div>`;
const notes = (items, cls = '') => `<div class="sc-notes${cls ? ` ${cls}` : ''}">${items.map((i) => `<p>${i}</p>`).join('')}</div>`;
const section = (id, title, line, body) => `<section class="sc-sec" id="${id}"><h2>${title}<small>${line}</small></h2>\n${body}</section>`;

// ---------- overlays ----------
const menu = (items, style) => `<div class="menu" style="${style}">${items.map((m) => (m === '-' ? '<div class="msep"></div>' : `<div class="mi${m[2] ? ` ${m[2]}` : ''}">${I(m[0])}${m[1]}${m[3] ? `<small>${m[3]}</small>` : ''}</div>`)).join('')}</div>`;
const sheet = ({ title, ctx = '', body, btn = '', list = false }) => `<div class="sheet"><div class="grab"></div><div class="hd"><h3>${title}</h3><span class="ic">${I('x')}</span></div>${ctx ? `<p class="ctx">${ctx}</p>` : ''}<div class="bd${list ? ' list' : ''}">${body}</div>${btn ? `<div class="ft"><span class="btn">${btn}</span></div>` : ''}</div>`;
const nrow = (icon, title, sub, right = '', cls = '') => `<div class="nrow${cls ? ` ${cls}` : ''}">${icon}<span class="g">${title}${sub ? `<small>${sub}</small>` : ''}</span>${right}</div>`;
const toast = (text, cls = '') => `<div class="toast${cls ? ` ${cls}` : ''}"><span class="g">${text}</span><span class="u">Undo</span></div>`;

// ---------- the opened card (insights/card) ----------
const BACK = (title) => `<div class="appbar bk"><span class="ic back">${I('arrow-left', 's24')}</span><h1>${title}</h1></div>`;
const facts = (src, watch) => `<div class="gc"><div class="nrow">${tile('receipt-text')}<span class="g">${src[0]}<small>${src[1]}</small></span></div>${watch ? `<div class="nrow">${tile('bell-ring', 'ta')}<span class="g">${watch[0]}<small>${watch[1]}</small></span>${I('chevron-right')}</div>` : ''}</div>`;
function opened({ tip = false } = {}) {
  const tipHtml = tip ? `<div class="tip" style="left:62px;top:62px"><span>Mon 12 Oct · day 13</span><span class="k"><i style="background:var(--chart-accent)"></i>This cycle<span>${rm(322570)}</span></span><span class="k"><i style="background:var(--chart-context)"></i>Last cycle<span>${rm(296730)}</span></span><span class="k" style="color:var(--muted-foreground)">Spent that day<span>${rm(322570 - 317000)}</span></span><span class="nx">Tap again for that day’s payments${I('chevron-right', 's16')}</span></div>` : '';
  const body = `<div class="op"><div class="hd"><p class="fig num" style="margin:0">${rm(LEFT)} left</p><p class="take mut" style="font-size:var(--f13);margin:0">for 12 days, until payday on Fri 30 Oct</p>${chg('trending-up', `${rm(SPENT - LASTBY)} more spent than by this day last cycle`)}</div>
  <div class="kc"><div class="seg2"><span class="on">${I('chart-line', 's16')}Chart</span><span>${I('table-2', 's16')}Table</span></div><div class="vw" style="margin-top:14px">${paceSvg(PACE_NOW, { h: 196, big: true, tap: tip ? 12 : null })}${tipHtml}</div>${paceLegend(PACE_NOW)}<p class="hint" style="margin-top:12px">${I('info', 's16')}${tip ? 'The figure stays until you tap somewhere else.' : 'Tap a day for its exact amount.'}</p></div>
  ${facts(['From your payments', `214 payments this cycle, and last cycle’s · ${ASOF}`], ['Watch: before payday', 'Tells you if you’re set to spend more than your pay'])}</div>`;
  return `<div class="scr">${BACK('Am I on track?')}<div class="in">${body}</div></div><div class="ask band"><span class="btn">${av24}Ask Sen about this</span></div>${tabbar()}`;
}
function openedWhere() {
  const all = N.whereWent; const rest = SPENT - sum(all.map((r) => r.sen));
  const rows = rest > 0 ? all : all;
  const body = `<div class="op"><div class="hd"><p class="take" style="margin:0">Most went to Home &amp; bills. Meals and Shopping are above usual.</p></div>
  <div class="kc">${ranked(rows.slice(0, 8), rest || null, { all: true, hi: 'Meals' }).replace(/<div( class="on")?><p class="lb">/g, (m, on) => `<div class="tapr${on ? ' on' : ''}"><p class="lb">`)}${rankLegend}<p class="hint" style="margin-top:12px">${I('info', 's16')}Tap a category for its payments.</p></div>
  ${facts(['From your payments', `This cycle, against your 12-month median by day 19 · ${ASOF}`], null)}</div>`;
  return `<div class="scr">${BACK('Where did it go, and what changed?')}<div class="in">${body}</div></div><div class="ask band"><span class="btn">${av24}Ask Sen about this</span></div>${tabbar()}`;
}
const PAYS = [['Sun 18 Oct', rm(6413), [['Sate Kajang Hj Samuri', 'Ryt Bank · 13:05', rm(6413)]]], ['Sat 17 Oct', rm(5030), [['GrabFood', 'Touch ’n Go · 15:20', rm(3180)], ['Nasi Kandar Pelita', 'Touch ’n Go · 12:55', rm(1850)]]], ['Fri 16 Oct', rm(2780), [['Chicken Rice Shop', 'Touch ’n Go · 12:40', rm(1290)], ['Nando’s', 'Public Bank · 19:50', rm(1490)]]]];
const payments = () => `<div class="scr">${BACK('Payments')}<div class="in"><div class="chips"><span class="chip">${I('utensils', 's16')}Meals${I('x', 's16')}</span><span class="chip">This cycle${I('x', 's16')}</span></div><p class="sum1">31 payments · ${rm(93293)}</p>${PAYS.map(([d, tot, rs]) => `<p class="dayh"><span>${d}</span><span class="num">${tot}</span></p><div class="lcard">${rs.map(([n, s, a]) => `<div class="lrow">${tile('utensils', 't1')}<span class="g">${n}<small>${s}</small></span><span class="a">${a}</span></div>`).join('')}</div>`).join('')}</div></div>${tabbar()}`;

// ---------- states ----------
const sk = (w, h, r = 6) => `<span class="sk" style="width:${w};height:${h}px;border-radius:${r}px"></span>`;
const skel = (wide, view) => `<div class="kc load${wide ? ' w' : ''}">${sk('62%', 18)}${sk('44%', 24)}${sk('80%', 12)}<span style="height:6px"></span>${view}${sk('34%', 10)}</div>`;
const SKELS = [skel(true, sk('100%', 130, 8)), skel(true, `${sk('100%', 10, 4)}${sk('100%', 10, 4)}${sk('100%', 10, 4)}`), skel(false, sk('100%', 100, 8)), skel(false, sk('100%', 60, 8))];
const PAST_ASOF = { asof: 'Final · closed 29 Sep' };
const pastCards = [C.onTrack(PAST_ASOF, PACE_SEP), C.budgets(PAST_ASOF, true), C.leak(PAST_ASOF, true), C.small(PAST_ASOF, true), C.where(PAST_ASOF, true)];
const TRIPS = [...TABS4, 'Trips'];
const emptyCard = card({ w: true, q: 'What have my trips cost?', after: `<div class="empty">${tile('inbox')}<span>Nothing tagged <b style="font-weight:500;color:var(--foreground)">Trip</b> this cycle yet. This fills in when a payment is tagged.</span></div>` });
const goneCard = card({ w: true, cls: 'gone', q: 'How much went on Penang?', take: 'The tag Penang was deleted, so this card has nothing left to count.', asof: 'Last updated 2 Oct', asofR: `<span class="btn xs out">${av24}Ask Sen</span>` });
const tripsCards = (first) => [first, card({ q: 'How much on Grab rides?', fig: rm(8640), take: 'on 14 rides this cycle' }), card({ q: 'What do I spend on tolls?', fig: rm(3070), take: 'on 7 trips through PLUS' })];

// ---------- the catalogue: the other card kinds, and the chart kinds the seeded cards don't use ----------
const kinds = [
  ['A number', 'One figure answers the question.', card({ q: 'How much on Grab rides?', fig: rm(8640), take: 'on 14 rides this cycle', chg: chg('trending-down', `${rm(1220)} less than last cycle`) })],
  ['Numbers', 'Two to four figures that belong together.', card({ w: true, q: 'How are Meals doing?', view: `<div class="fg" style="padding:0"><span><i>Spent</i><b class="num" style="font:600 var(--f17)/1.3 var(--font-ui)">${rm(93293)}</b></span><span><i>Left in the budget</i><b class="num" style="font:600 var(--f17)/1.3 var(--font-ui)">${rm(120000 - 93293)}</b></span><span><i>Payments</i><b class="num" style="font:600 var(--f17)/1.3 var(--font-ui)">31</b></span><span><i>A meal, estimated</i><b class="num" style="font:600 var(--f17)/1.3 var(--font-ui)">${rm(3009)}</b></span></div>` })],
  ['A chart', 'Any chart kind of spec 9.8; every seeded card but two is one.', card({ q: 'What did each week cost?', fig: rm(WEEKS[2]), take: 'in the week of 12–18 Oct', view: columns(WEEKS, ['30 Sep', '5 Oct', '12 Oct'], { w: SW, h: 96 }) })],
  ['A top list', 'The few things that come up most, with a count.', card({ q: 'What do I buy most at the grocer?', fig: 'Eggs', take: '4 times, from receipts', view: `<div class="tl">${[['Milk', 3], ['Bread', 3], ['Bananas', 2]].map(([n, k]) => `<div><p class="n"><span>${n}</span><span>×${k}</span></p><span class="tb" style="width:${x((100 * k) / 4)}%"></span></div>`).join('')}</div>` })],
  ['A target', 'Progress to one goal, bucket or limit.', card({ q: 'How close is Japan?', fig: '49%', take: `${rm(295000)} of ${rm(600000)}`, view: `<div class="bar"><i style="width:49%"></i></div>`, chg: chg('calendar-days', `${rm(61000)} a cycle to make 15 Mar`) })],
  ['What needs you', 'Counts of what waits on the person, opening where it waits.', card({ q: 'What needs me?', fig: '12', take: 'payments to review', after: `<div class="nrow" style="padding:0;min-height:48px;margin-top:6px"><span class="g" style="color:var(--primary);font-weight:500">Open Review</span>${I('chevron-right')}</div>`, asof: false })],
  ['What’s coming up', 'Dated things ahead, nearest first; amounts that are forecasts say so.', card({ w: true, q: 'What’s coming up?', view: `<div class="rows" style="margin-top:0">${[['Tue 20 Oct', 'Claude Pro', `≈ ${rm(8510)}`], ['Thu 22 Oct', 'Netflix Basic', rm(2800)], ['Fri 30 Oct', 'Payday', 'Expected']].map(([d, n, a]) => `<div class="rw"><span class="g">${n}<small>${d}</small></span><span class="r fc">${a}</span></div>`).join('')}</div>` })],
  ['The latest report', 'The newest of Sen’s scheduled reports, its figures from code.', card({ w: true, q: 'How did last week go?', fig: `${rm(WEEKS[2])} spent`, take: 'Week of 12–18 Oct · sent Mon 19 Oct, 08:00', after: `<div class="nrow" style="padding:0;min-height:48px;margin-top:6px">${tile('file-text', 'ta')}<span class="g">Read the report<small>3 things worth a look</small></span>${I('chevron-right')}</div>`, asof: false })],
  ['A quick question', 'A question asked often, one tap from Sen; it holds no figure.', card({ q: 'Can I afford a night out this week?', take: 'Sen answers in the chat, from today’s figures.', after: `<span class="btn sm out" style="margin-top:12px;width:100%">${av24}Ask Sen</span>`, asof: false })],
];
// area: one balance
const BAL = [1398020, 1392310, 1384560, 1381100, 1420890, 1417620, 1409330, 1405880, 1446420, 1441230, 1438760, 1432010, 1429550, 1468110, 1465087];
function areaSvg(w = WW, h = 120) {
  const lo = 1360000, hi = 1490000, y0 = 10, y1 = h - 20, n = BAL.length, X = (i) => (w * i) / (n - 1), Y = (v) => y1 - ((y1 - y0) * (v - lo)) / (hi - lo);
  const p = BAL.map((v, i) => `${x(X(i))},${x(Y(v))}`).join(' ');
  return svg(w, h, `${grid(0, w, [Y(1400000), Y(1450000)])}${t(0, Y(1400000) - 4, 'RM14,000')}${t(0, Y(1450000) - 4, 'RM14,500')}<path d="M0 ${y1}L${p.replace(/ /g, 'L')}L${w} ${y1}Z" fill="color-mix(in oklab, var(--chart-accent) 14%, transparent)"/><polyline points="${p}" fill="none" stroke="var(--chart-accent)" stroke-width="2"/>${dot(X(n - 1), Y(BAL[n - 1]))}${t(0, h - 4, '4 Oct')}${t(w, h - 4, '18 Oct', 'text-anchor="end" class="fg"')}`);
}
// stacked bar by account, Ryt Bank hidden from the legend
function stackedSvg(hide = 1, w = WW, h = 140) {
  const cols = ['--chart-1', '--chart-2', '--chart-3', '--chart-context'], labels = ['Aug', 'Sep', 'Oct, so far'], top = 500000, y0 = 8, y1 = h - 20, bw = 64, gap = (w - 3 * bw) / 2;
  let s = grid(0, w, [y1 - ((y1 - y0) * 200000) / top, y1 - ((y1 - y0) * 400000) / top]) + `<line x1="0" x2="${w}" y1="${y1}" y2="${y1}" stroke="var(--border)"/>`;
  Object.values(BYACC).forEach((parts, i) => { let y = y1; const bx = i * (bw + gap); const shown = parts.map((v, k) => (k === hide ? 0 : v)); const lastK = shown.map((v) => v > 0).lastIndexOf(true);
    shown.forEach((v, k) => { if (!v) return; const hh = ((y1 - y0) * v) / top; s += k === lastK ? colBar(bx, y - hh, bw, hh - (k ? 2 : 0), `var(${cols[k]})`) : `<rect x="${bx}" y="${x(y - hh)}" width="${bw}" height="${x(hh - (k ? 2 : 0))}" fill="var(${cols[k]})"/>`; y -= hh; });
    s += t(bx + bw / 2, h - 4, labels[i], 'text-anchor="middle"'); });
  return svg(w, h, s);
}
const stackedLegend = `<div class="lg mut" style="font-size:var(--f12);margin-top:8px"><span><i class="sq" style="background:var(--chart-1)"></i>Public Bank</span><span><i class="sq off"></i><span class="gone">Ryt Bank</span></span><span><i class="sq" style="background:var(--chart-3)"></i>Touch ’n Go</span><span><i class="sq" style="background:var(--chart-context)"></i>Other</span></div>`;
// bars with a line: spent by month, income as a line, one axis
function barsLineSvg(tap = 3, w = WW, h = 206) {
  const ms = yearM.slice(3, 9), top = 640000, gut = 52, pw = w - gut, y0 = 96, y1 = h - 20, gap = 10, bw = (pw - gap * 5) / 6, Y = (v) => y1 - ((y1 - y0) * v) / top;
  let s = grid(0, w, [Y(200000), Y(400000), Y(600000)]) + [200000, 400000, 600000].map((v) => t(w, Y(v) + 14, rm(v).replace('.00', ''), 'text-anchor="end"')).join('') + `<line x1="0" x2="${w}" y1="${y1}" y2="${y1}" stroke="var(--border)"/>`;
  ms.forEach((m, i) => { const bx = i * (bw + gap); s += colBar(bx, Y(m.spent), bw, y1 - Y(m.spent), 'var(--chart-1)'); s += t(bx + bw / 2, h - 4, m.label, `text-anchor="middle"${i === tap ? ' class="b"' : ''}`); });
  const p = ms.map((m, i) => `${x(i * (bw + gap) + bw / 2)},${x(Y(m.income))}`).join(' ');
  s += `<polyline points="${p}" fill="none" stroke="var(--chart-2)" stroke-width="2"/>` + ms.map((m, i) => (i === tap ? '' : `<circle cx="${x(i * (bw + gap) + bw / 2)}" cy="${x(Y(m.income))}" r="3" fill="var(--chart-2)"/>`)).join('');
  if (tap !== null) { const cx = tap * (bw + gap) + bw / 2; s += `<line x1="${x(cx)}" x2="${x(cx)}" y1="84" y2="${x(Y(ms[tap].income) - 6)}" stroke="var(--muted-foreground)" stroke-width="1"/><rect x="${x(tap * (bw + gap) - 3)}" y="${x(Y(ms[tap].income) - 10)}" width="${x(bw + 6)}" height="${x(y1 - Y(ms[tap].income) + 10)}" rx="6" fill="none" stroke="var(--foreground)" stroke-width="1.5"/>` + dot(cx, Y(ms[tap].income), 'var(--chart-2)'); }
  return svg(w, h, s);
}
// donut: the total in the middle, Meals highlighted, the rest grey
function donutSvg(size = 132) {
  const rows = [...top6.map((r) => [r.label, r.sen]), ['Everything else', ELSE]], r = size / 2 - 12, c = 2 * Math.PI * r, cx = size / 2, gapLen = 2;
  let a = 0, s = '';
  rows.forEach(([l, v]) => { const len = (c * v) / SPENT; s += `<circle cx="${cx}" cy="${cx}" r="${x(r)}" fill="none" stroke="var(${l === 'Meals' ? '--chart-accent' : '--chart-context'})" stroke-width="20" stroke-dasharray="${x(Math.max(0, len - gapLen))} ${x(c)}" stroke-dashoffset="${x(-a)}" transform="rotate(-90 ${cx} ${cx})"/>`; a += len; });
  return `<svg class="ch" viewBox="0 0 ${size} ${size}" style="width:${size}px;flex:none" aria-hidden="true">${s}<text x="${cx}" y="${cx - 2}" text-anchor="middle" class="b" style="font-size:var(--f13)">${rm(SPENT)}</text><text x="${cx}" y="${cx + 14}" text-anchor="middle">spent</text></svg>`;
}
// treemap
function treemapSvg(w = WW, h = 160) {
  const g = 2, H = (a) => a; const items = [];
  const c1 = (w * (120000 + 93293)) / SPENT; const hHome = (h * 120000) / (120000 + 93293);
  items.push(['Home &amp; bills', 120000, 0, 0, c1 - g, hHome - g], ['Meals', 93293, 0, hHome, c1 - g, h - hHome, true]);
  const w2 = w - c1, colA = [['Family', 50000], ['Shopping', 32030]], colB = [['Everything else', ELSE], ['Groceries', 24330], ['Car', 18050]], bt = 32030 + 24330 + 18050;
  const ta = sum(colA.map((r) => r[1])), tb = sum(colB.map((r) => r[1])), wa = (w2 * ta) / (ta + tb);
  [[colA, c1, wa - g, ta], [colB, c1 + wa, w2 - wa, tb]].forEach(([col, cx, cw, tot]) => { let cy = 0; col.forEach(([l, v], i) => { const ch = (h * v) / tot; items.push([l, v, cx, cy, cw, ch - (i < col.length - 1 ? g : 0)]); cy += ch; }); });
  eq(120000 + 93293 + 50000 + ELSE + bt, SPENT, 'treemap');
  eq(120000 + 93293 + ta + tb, SPENT, 'treemap cols');
  return svg(w, h, items.map(([l, v, ix, iy, iw, ih, hi]) => `<rect x="${x(ix)}" y="${x(iy)}" width="${x(iw)}" height="${x(ih)}" rx="4" fill="var(${hi ? '--chart-accent' : '--chart-context'})" opacity="${hi ? 1 : 0.55 + 0.45 * (v / 120000)}"/>${iw > (l === 'Everything else' ? 4 : l.length) * 6.8 + 12 && ih > 20 ? `<text x="${x(ix + 6)}" y="${x(iy + 16)}" style="fill:var(${hi ? '--primary-foreground' : '--foreground'})">${l === 'Everything else' ? 'Else' : l}</text>` : ''}${iw > 70 && ih > 40 ? `<text x="${x(ix + 6)}" y="${x(iy + 31)}" style="fill:var(${hi ? '--primary-foreground' : '--foreground'})">${rm(v)}</text>` : ''}`).join(''));
}
// waterfall: pay to what's left
function waterfallSvg(w = WW, h = 156) {
  const steps = [['Pay', 0, INCOME, false], ['Fixed', INCOME - N.spokenFor.fixed, INCOME, false], ['Spent', N.spokenFor.left, INCOME - N.spokenFor.fixed, false], ['Free', 0, N.spokenFor.left, true]];
  eq(INCOME - N.spokenFor.fixed - N.spokenFor.spent, N.spokenFor.left, 'waterfall');
  const top = 640000, y0 = 22, y1 = h - 20, bw = 58, gap = (w - 4 * bw) / 3, Y = (v) => y1 - ((y1 - y0) * v) / top; const vals = [rm(INCOME), `−${rm(N.spokenFor.fixed)}`, `−${rm(N.spokenFor.spent)}`, rm(N.spokenFor.left)];
  let s = `<line x1="0" x2="${w}" y1="${y1}" y2="${y1}" stroke="var(--border)"/>`;
  steps.forEach(([l, lo, hi, acc], i) => { const bx = i * (bw + gap); s += i === 0 || i === 3 ? colBar(bx, Y(hi), bw, Y(lo) - Y(hi), `var(${acc ? '--chart-accent' : '--chart-context'})`) : `<rect x="${bx}" y="${x(Y(hi))}" width="${bw}" height="${x(Y(lo) - Y(hi))}" rx="2" fill="var(--chart-context)" opacity=".6"/>`;
    s += t(bx + bw / 2, Y(hi) - 6, vals[i], `text-anchor="middle"${acc ? ' class="b"' : ' class="fg"'}`) + t(bx + bw / 2, h - 4, l, 'text-anchor="middle"');
    if (i < 3) { const ly = i === 0 ? Y(hi) : Y(lo); s += `<line x1="${x(bx + bw)}" x2="${x(bx + bw + gap)}" y1="${x(ly)}" y2="${x(ly)}" stroke="var(--muted-foreground)" stroke-width="1"/>`; } });
  return svg(w, h, s);
}
// flow: pay to accounts to what it became
function flowSvg(w = WW, h = 190) {
  const k = (h - 2 * 8) / INCOME, nw = 8, xs = [0, w / 2 - nw / 2, w - nw]; const g = 8;
  const acc = [['Public Bank', sum(FLOW.pb)], ['Ryt Bank', sum(FLOW.ryt)], ['Touch ’n Go', sum(FLOW.tng)]];
  const ends = [['Fixed', N.spokenFor.fixed, '--chart-1'], ['Spent', N.spokenFor.spent, '--chart-2'], ['Free', N.spokenFor.left, '--chart-3']];
  let s = ''; let y = 0; const accY = acc.map(([, v]) => { const r = y; y += v * k + g; return r; }); y = 0; const endY = ends.map(([, v]) => { const r = y; y += v * k + g; return r; });
  const link = (x0, ya, yb, x1, yc, yd, fill) => `<path d="M${x(x0)} ${x(ya)}C${x((x0 + x1) / 2)} ${x(ya)} ${x((x0 + x1) / 2)} ${x(yc)} ${x(x1)} ${x(yc)}V${x(yd)}C${x((x0 + x1) / 2)} ${x(yd)} ${x((x0 + x1) / 2)} ${x(yb)} ${x(x0)} ${x(yb)}Z" fill="${fill}"/>`;
  let py = 8; acc.forEach(([, v], i) => { s += link(nw, py, py + v * k, xs[1], accY[i], accY[i] + v * k, 'color-mix(in oklab, var(--chart-context) 45%, transparent)'); py += v * k; });
  const used = ends.map(() => 0);
  [FLOW.pb, FLOW.ryt, FLOW.tng].forEach((parts, i) => { let ay = accY[i]; parts.forEach((v, j) => { if (!v) return; const ey = endY[j] + used[j]; s += link(xs[1] + nw, ay, ay + v * k, xs[2], ey, ey + v * k, `color-mix(in oklab, var(${ends[j][2]}) 30%, transparent)`); ay += v * k; used[j] += v * k; }); });
  s += `<rect x="0" y="8" width="${nw}" height="${x(INCOME * k)}" rx="2" fill="var(--chart-accent)"/>`;
  acc.forEach(([l, v], i) => { s += `<rect x="${x(xs[1])}" y="${x(accY[i])}" width="${nw}" height="${x(v * k)}" rx="2" fill="var(--foreground)"/>` + t(xs[1] - 4, accY[i] + Math.max(10, (v * k) / 2) + 4, l, 'text-anchor="end" class="fg" style="paint-order:stroke;stroke:var(--card);stroke-width:4px"'); });
  ends.forEach(([l, v, c], i) => { s += `<rect x="${x(xs[2])}" y="${x(endY[i])}" width="${nw}" height="${x(v * k)}" rx="2" fill="var(${c})"/>` + t(xs[2] - 4, endY[i] + (v * k) / 2 - 2, l, 'text-anchor="end" class="fg"') + t(xs[2] - 4, endY[i] + (v * k) / 2 + 12, rm(v), 'text-anchor="end"'); });
  s += t(14, 20, 'Pay', 'class="fg" style="paint-order:stroke;stroke:var(--card);stroke-width:4px"') + t(14, 34, rm(INCOME), 'style="paint-order:stroke;stroke:var(--card);stroke-width:4px"');
  return svg(w, h, s);
}
const chartKinds = [
  ['Area', 'A balance over time, where the level matters as much as the change.', card({ w: true, q: 'How has Ryt Bank’s balance moved?', fig: rm(1465087), take: 'today, after 15 days', chg: chg('trending-up', `${rm(1465087 - 1398020)} more than on 4 Oct`), view: areaSvg() })],
  ['Stacked bar', 'Parts of a total, cycle by cycle; at most three parts and Other. Here a tap on Ryt Bank’s legend has hidden it.', card({ w: true, q: 'Which account paid for what?', take: 'Public Bank paid for most of every cycle.', view: stackedSvg() + stackedLegend })],
  ['Bars with a line', 'Two measures in the same unit, one axis: spending against income. Here the July cycle is tapped and held.', card({ w: true, q: 'Am I spending less than I earn?', take: 'Spent less than came in, every one of the last 6 cycles.', view: `<div class="vw">${barsLineSvg()}<div class="tip" style="left:64px;top:0"><span>July · 30 Jun – 30 Jul</span><span class="k"><i class="sq" style="background:var(--chart-1)"></i>Spent<span>${rm(yearM[6].spent)}</span></span><span class="k"><i style="background:var(--chart-2)"></i>Income<span>${rm(yearM[6].income)}</span></span><span class="k" style="color:var(--muted-foreground)">Left<span>${rm(julLeft)}</span></span></div></div><div class="lg mut" style="font-size:var(--f12);margin-top:8px"><span><i class="sq" style="background:var(--chart-1)"></i>Spent</span><span><i style="background:var(--chart-2)"></i>Income</span></div>` })],
  ['Donut', 'One part of a whole that people ask about, against the rest.', card({ w: true, q: 'How big a share is Meals?', view: `<div style="display:flex;gap:16px;align-items:center">${donutSvg()}<div style="display:grid;gap:4px"><p class="fig num" style="margin:0">24%</p><p class="take mut" style="font-size:var(--f13);margin:0">${rm(93293)} of ${rm(SPENT)} went on Meals</p><div class="lg mut" style="font-size:var(--f12);margin-top:4px"><span><i class="sq" style="background:var(--chart-accent)"></i>Meals</span><span><i class="sq" style="background:var(--chart-context)"></i>The rest</span></div></div></div>` })],
  ['Treemap', 'The whole cycle at a glance; a tap goes into a category.', card({ w: true, q: 'What did the whole cycle go on?', take: 'Meals is highlighted: it’s the most above usual.', view: treemapSvg() })],
  ['Waterfall', 'How one amount became another: pay to what’s free.', card({ w: true, q: 'Where does the pay go?', fig: `${rm(N.spokenFor.left)} free`, take: `of ${rm(INCOME)}, once the bills still due are paid`, view: waterfallSvg() })],
  ['Flow', 'Pay to accounts to what it became; the three ends are different things, so they take series colours.', card({ w: true, q: 'Where did the pay go?', take: 'Most came into Public Bank, and fixed costs left from there.', view: flowSvg() })],
];

// ---------- the sections ----------
const S = [];
const capT = (t, l) => `<b>${t}</b> · ${l}`;
S.push(section('cycle', '1 · This cycle', 'The tab you land on: five cards, wide ones across and the two small ones side by side. Drawn whole, so the phone is as tall as the tab.', row('', [
  phone({ tall: true, inner: screen(), cap: capT('Minted, light', 'Each card reads question first, then its answer in one line. The charts are grey and one accent; colour only where something is over.') }),
  phone({ tall: true, mode: 'dark', inner: screen(), cap: capT('Minted, dark', 'The accent turns light and the grey dark; the calendar ramp runs the other way, from dim to bright.') }),
  phone({ tall: true, look: 'copper', inner: screen(), cap: capT('Copper, light', 'The same screen in the look least like Minted: its fonts, its squarer buttons, its mahogany accent.') }),
])));
S.push(section('tabs', '2 · Food, Commitments, Over time', 'The other three seeded tabs, settled. <i>The year</i> is a row at the foot of <i>Over time</i>, not a card.', row('', [
  phone({ tall: true, inner: screen({ tab: 'Food', tabOpt: {} }), cap: capT('Food', 'Two small cards and one wide. The meal average is an estimate, so it says so and its line is dashed.') }),
  phone({ tall: true, inner: screen({ tab: 'Commitments', tabOpt: { scroll: 40 } }), cap: capT('Commitments', 'Two wide cards. The parts of the pay are different things, so they take series colours, with a legend.') }),
  phone({ tall: true, inner: screen({ tab: 'Over time', tabOpt: { scroll: 80 } }), cap: capT('Over time', 'Saving and goals wide, two small cards, then <i>The year</i> as a row.') }),
])));
// the cycle sheet: every cycle since Sen's first, newest first, grouped by year; what was left at each payday on one scale
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dmy = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MON[m - 1]}`; };
// a cycle's year is the year of its payday, the day after it ends
const cycYear = (c) => { const d = new Date(c.end + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.getUTCFullYear(); };
const CYCS = D.cycles.map((c) => ({ ...c, year: cycYear(c), dates: `${dmy(c.start)} – ${dmy(c.end)}` })).reverse();
// the checks: the last six agree with Saving more?, the year's months and the median; exactly one short cycle; October is now, its bar the estimate
CYCS.slice(1, 7).reverse().forEach((c, i) => eq(c.left, savings[i], `${c.label} left (saving)`));
yearM.slice(0, 9).forEach((m, i) => eq(m.income - m.spent, CYCS.find((c) => c.year === 2026 && c.label.startsWith(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'][i])).left, `${m.label} left (year)`));
eq(CYCS.filter((c) => c.left < 0).length, 1, 'one short cycle');
if (!CYCS[0].now || CYCS[0].label !== 'October' || CYCS[0].year !== 2026) throw new Error('first row is now');
const USUAL = median(CYCS.slice(1, 7).map((c) => c.left)); eq(USUAL, 123795, 'usual');
const LO = -30000, HI = 200000, bx = (v) => (100 * (v - LO)) / (HI - LO); const Z = bx(0);
if (Math.max(...CYCS.slice(1).map((c) => c.left)) > HI || Math.min(...CYCS.slice(1).map((c) => c.left)) < LO) throw new Error('cycle scale');
const cycBar = (c, viewing) => {
  const v = c.now ? INCOME - EST : c.left, col = c.left < 0 ? 'var(--money-warning)' : viewing ? 'var(--chart-accent)' : 'var(--chart-context)';
  const l = v < 0 ? bx(v) : Z, w = Math.abs(bx(v) - Z);
  return `<span class="cb"><i class="z" style="left:${x(Z)}%"></i><i class="u" style="left:${x(bx(USUAL))}%"></i><i class="v${v < 0 ? ' neg' : ''}${c.now ? ' est' : ''}" style="left:${x(l)}%;width:${x(w)}%;--c:${col}"></i></span>`;
};
const cycRowHtml = (c, viewing) => {
  const right = c.now ? `<span class="r"><b>Now</b><small>12 days to go</small></span>` : c.left < 0 ? `<span class="r short"><b class="num">${rm(-c.left)}</b><small>${I('circle-alert', 's14')}short</small></span>` : `<span class="r"><b class="num">${rm(c.left)}</b><small>&nbsp;</small></span>`;
  return `<div class="cr${viewing ? ' on' : ''}"><span class="n">${c.label}<small>${c.dates}</small></span>${cycBar(c, viewing)}${right}<span class="k">${viewing ? I('check', 's20') : ''}</span></div>`;
};
const ROW_H = 56, YH_H = 32, LIST_H = 400;
function cycSheet({ viewing = 'October-2026', y = 0 } = {}) {
  let html = '', at = 0, yrAt = {}; const years = [...new Set(CYCS.map((c) => c.year))];
  years.forEach((yr) => { yrAt[yr] = at; html += `<p class="yh">${yr}</p>`; at += YH_H; CYCS.filter((c) => c.year === yr).forEach((c) => { html += cycRowHtml(c, `${c.label}-${c.year}` === viewing); at += ROW_H; }); });
  if (y > at - LIST_H) throw new Error(`cycle sheet can only scroll ${at - LIST_H}, asked ${y}`);
  const stuck = years.filter((yr) => yrAt[yr] <= y).pop();
  const body = `<div class="cyl" style="height:${LIST_H}px"><div style="margin-top:-${y}px">${html}</div>${y > 0 ? `<p class="yh stuck">${stuck}</p>` : ''}</div>`;
  return { html: sheet({ title: 'Which cycle?', ctx: `What was left at each payday. <span class="ut"><i></i>Usual: ${rm(USUAL)}, the median of the last 6</span>`, body, list: true }), at, yrAt };
}
const CYC_TOP = cycSheet();
const Y2025 = CYC_TOP.yrAt[2025] + 20; // scrolled until 2025's heading has stuck, with December sliding under it
const CYC_SCROLLED = cycSheet({ y: Y2025 });
const CYC_DARK = cycSheet({ viewing: 'September-2026' });
S.push(section('picker', '3 · Changing cycle', 'Arrows step to the cycle next door; the button between them opens every cycle, each with what was left at its payday. Every tab follows it.', `${row('', [
  strip(`${APPBAR()}${CYC_NOW}`, capT('On the current cycle', 'The button’s second line is the day and the days to payday. › is dimmed: there’s no next cycle yet.'), 'top'),
  strip(`${APPBAR_PAST}${CYC_SEP}`, capT('On a past cycle', 'Both arrows work and the second line says when it closed. <i>Back to October</i> sits in the app bar, out of the row.'), 'top'),
  strip(`${APPBAR_PAST.replace('Back to October', 'Back to October')}${CYC_FIRST}`, capT('On the first cycle Sen has', '‹ is dimmed: nothing before it. The year shows because it isn’t this one.'), 'top'),
])}
${row('', [
  phone({ inner: `${screen({ cyc: CYC_NOW.replace('class="pick"', 'class="pick open"') })}<div class="scrim"></div>${CYC_TOP.html}`, cap: capT('The sheet, at the top', 'Newest first under 2026. Bars share one scale: the accent is the cycle you’re viewing, October’s is dashed because it’s an estimate until payday.') }),
  phone({ inner: `${screen({ cyc: CYC_NOW.replace('class="pick"', 'class="pick open"') })}<div class="scrim"></div>${CYC_SCROLLED.html}`, cap: capT('Scrolled to 2025', 'The year heading sticks while its cycles slide under it. The one short cycle says so in words, with its bar drawn the other way.') }),
  phone({ mode: 'dark', inner: `${screen({ appbar: APPBAR_PAST, cyc: CYC_SEP.replace('class="pick"', 'class="pick open"'), cards: pastCards })}<div class="scrim"></div>${CYC_DARK.html}`, cap: capT('Dark, viewing September', 'The check and the accent follow the cycle you’re on; October stays dashed, in grey.') }),
  phone({ tall: true, inner: screen({ appbar: APPBAR_PAST, cyc: CYC_SEP, cards: pastCards }), cap: capT('September, a past cycle', 'No estimate, no pace tick and no today; <i>as of</i> becomes <i>Final</i>. The way back is in the app bar.') }),
])}`));
const failAsof = { asof: 'Couldn’t update · as of 18:02', asofIcon: 'circle-alert', asofCls: 'fail', asofR: '<span style="color:var(--primary);font-weight:600">Try again</span>' };
S.push(section('states', '4 · States', 'What a card does when it’s loading, out of date, empty or broken. The screen around it doesn’t change.', row('', [
  phone({ inner: screen({ cards: SKELS }), cap: capT('First load', 'A skeleton shaped like each card, in its place and size, so nothing jumps when it fills.') }),
  phone({ inner: screen({ cardOpt: { asof: 'Updating · as of 18:02', asofIcon: 'refresh-cw' } }), cap: capT('Refreshing', 'The old figures stay, with their time. Nothing greys out or blinks.') }),
  phone({ inner: screen({ cardOpt: failAsof }), cap: capT('A failed refresh', 'The last good figures stay; <i>as of</i> is marked, says when, and offers <i>Try again</i>.') }),
  phone({ inner: screen({ tabs: TRIPS, tab: 'Trips', tabOpt: { scroll: 150 }, cards: tripsCards(emptyCard) }), cap: capT('A card you added, empty', 'It says so in its own words, and what will fill it. (A seeded card with nothing yet stays hidden.)') }),
  phone({ inner: screen({ tabs: TRIPS, tab: 'Trips', tabOpt: { scroll: 150 }, cards: tripsCards(goneCard) }), cap: capT('A card whose data is gone', 'Grey and dashed, no figures, why in one line, and <i>Ask Sen</i> to remake it.') }),
  phone({ inner: screen({ banner: `<div class="banner">${I('cloud-off', 's18')}<span class="g"><b>You’re offline.</b> These are from 18:02 and update when you’re back.</span></div>`, cardOpt: { asof: 'As of 18:02' } }), cap: capT('Offline', 'One line under the tabs, not on every card. Each card keeps its own time.') }),
])));
// arranging
const arrCnt = (n = 5, tab = 'This cycle') => `${I('grip-vertical', 's14').replace('class="lu', 'class="lu" style="display:inline;vertical-align:-2px" data-x="')}Drag a card, or tap its handle to move it. ${n} of 12 cards on ${tab}.`;
const arrCards = (o = {}) => TAB_CARDS['This cycle']({ arr: true, ...o });
const arrScreen = (o = {}) => screen({ arr: true, done: true, ...o, tabOpt: { arr: true, ...(o.tabOpt || {}) }, appbar: o.appbar ?? `<div class="appbar"><h1>Insights</h1></div>`, cnt: o.cnt ?? `Drag a card, or tap ${I('grip-vertical', 's14')} to move it · 5 of 12 cards`, cards: o.cards || arrCards() });
const dragCards = () => { const c = TAB_CARDS['This cycle']({ arr: true }); const lifted = C.leak({ arr: true, cls: 'lifted', style: 'left:22px;top:-26px;width:100%' }); return [c[0], `<div class="hole" style="position:relative">${lifted}<span class="finger" style="left:12px;top:-12px"></span></div>`, c[3], c[1], c[4]]; };
const hdlMenu = menu([['arrow-up', 'Move up', 'off', 'It’s first'], ['arrow-down', 'Move down'], ['arrow-up-to-line', 'Move to the top', 'off'], ['folder-input', 'Move to another tab…']], 'left:16px;top:330px;width:290px');
const moveSheet = (full = false) => sheet({ title: 'Move to which tab?', ctx: 'Am I on track?', list: true, body: [['This cycle', 'Here now', 'off', true], ['Food', '3 cards'], ['Commitments', '2 cards'], ['Over time', '4 cards and The year'], ...(full ? [['Savings', '12 of 12 cards: full', 'off'], ['Car', '3 cards'], ['Japan', '2 cards'], ['Work claims', '1 card']] : [])].map(([n, d, cls, here]) => nrow('', n, d, here ? I('check', 's24').replace('class="lu', 'class="lu ck') : I('chevron-right'), cls || '')).join('') + (full ? '' : `<div class="nrow">${I('plus').replace('class="lu', 'class="lu ck')}<span class="g" style="color:var(--primary);font-weight:500">A new tab…</span></div>`) });
const tabMenu = menu([['pencil', 'Rename'], ['move', 'Move'], '-', ['trash-2', 'Remove', 'del', '3 cards']], 'left:124px;top:198px');
const tabMoveSheet = sheet({ title: 'Where should Food go?', list: true, body: [['First', ''], ['After This cycle', 'Where it is now', true], ['After Commitments', ''], ['Last, after Over time', '']].map(([n, d, here]) => nrow('', n, d, here ? I('check', 's24').replace('class="lu', 'class="lu ck') : '')).join('') });
const nameSheet = sheet({ title: 'New tab', body: `<div class="fld"><label>Name</label><span class="inp focus">Trips</span><span class="hint">5 of 8 tabs. Cards you add later go to the tab you’re on.</span></div>`, btn: 'Add tab' });
const SAVQ = [['How much is in Ryt Bank?', 1465087, 'today'], ['How much went to savings?', 61000, 'this cycle'], ['What’s in the Japan pocket?', 295000, 'of RM6,000.00'], ['What did ASB pay out?', 18450, 'this year'], ['How much is in Public Bank?', 412650, 'today'], ['What’s set aside for road tax?', 70000, 'of RM1,400.00']];
S.push(section('arrange', '5 · Arranging', 'A mode, not a screen: the cards stay where they are and gain their controls. Every drag has a tap path.', `${row('Starting, and moving a card', [
  phone({ inner: arrScreen(), cap: capT('Just started, from a long-press', 'Each card: a handle, <i>Wide</i> or <i>Small</i>, and remove. Views quieten, cards sway slowly, <i>Done</i> sits under the thumb.') }),
  phone({ inner: arrScreen({ y: 330, cards: dragCards() }), cap: capT('A card mid-drag', 'The calendar is lifted. <i>Small things</i> has moved up beside its gap, so no half row ever opens.') }),
  phone({ inner: `${arrScreen({ cards: arrCards().map((c, i) => (i === 0 ? c.replace('class="hdl"', 'class="hdl open"') : c)) })}<div class="dim"></div>${hdlMenu.replace('class="menu"', 'class="menu lift"')}`, cap: capT('The tap path: the handle’s menu', 'Up, down, to the top, or to another tab. What can’t apply is greyed with why.') }),
  phone({ inner: `${arrScreen()}<div class="scrim"></div>${moveSheet()}`, cap: capT('Moving to another tab', 'A list of tabs with their counts, and a new tab from here too.') }),
])}
${row('Tabs', [
  phone({ inner: `${arrScreen({ tabOpt: { menuOn: 'Food' } })}<div class="dim"></div>${tabMenu}`, cap: capT('A tab’s menu', 'Its chevron in arranging, or a long-press on the tab at any time. Remove says what goes with it.') }),
  phone({ inner: `${arrScreen()}<div class="scrim"></div>${tabMoveSheet}`, cap: capT('Move, the tap path', 'Where the tab should go, as a short list. Dragging the tab chip does the same.') }),
  phone({ kb: true, inner: `${arrScreen()}<div class="scrim"></div>${nameSheet}`, cap: capT('Naming a new tab', 'From <i>Add tab</i>. A Quiet sheet, the button above the keyboard.') }),
  phone({ inner: arrScreen({ tabs: ['This cycle', 'Commitments', 'Over time'], over: toast('Removed Food and its 3 cards') }), cap: capT('A tab removed', 'Gone at once with its cards. <i>Undo</i> for 6 seconds, beside Sen’s button.') }),
])}
${row('Limits, and dark', [
  phone({ inner: arrScreen({ tabs: TABS8, tab: 'Savings', tabOpt: { addOff: true }, cnt: `${I('info', 's14')} 8 of 8 tabs, and 12 of 12 cards on Savings. Remove one to add another.`, cards: SAVQ.map(([q, f, tk]) => card({ arr: true, q, fig: rm(f), take: tk })) }), cap: capT('Both limits hit', '<i>Add tab</i> is greyed and the line under the tabs says why, and what to do.') }),
  phone({ inner: `${arrScreen({ tabs: TABS8 })}<div class="scrim"></div>${moveSheet(true)}`, cap: capT('A full tab can’t take a card', 'It stays in the list, greyed, with <i>12 of 12 cards: full</i>.') }),
  phone({ mode: 'dark', inner: arrScreen(), cap: capT('Arranging, dark', 'The controls are the same tokens; the quietened views hold.') }),
])}`));
const pinned = (isNew) => card({ w: true, isNew, q: 'How are Meals doing?', view: `<div class="fg" style="padding:0;grid-template-columns:1fr 1fr 1fr"><span><i>Spent</i><b class="num" style="font:600 var(--f17)/1.3 var(--font-ui)">${rm(93293)}</b></span><span><i>Budget left</i><b class="num" style="font:600 var(--f17)/1.3 var(--font-ui)">${rm(26707)}</b></span><span><i>Payments</i><b class="num" style="font:600 var(--f17)/1.3 var(--font-ui)">31</b></span></div>` });
S.push(section('pin', '6 · A card pinned from Sen’s chat', 'It lands first on the tab you’re on, marked <i>New</i> until you open it.', row('', [
  phone({ inner: screen({ cards: [pinned(true), ...TAB_CARDS['This cycle']()] , over: toast('Pinned to This cycle') }), cap: capT('Arriving', 'A ring and <i>New</i> on the card, and a toast with <i>Undo</i>.') }),
  phone({ inner: screen({ cards: [pinned(false), ...TAB_CARDS['This cycle']()] }), cap: capT('Once opened', 'The mark is gone; it’s a card like the others, and can be arranged like them.') }),
])));
const screenMenu = menu([['layout-grid', 'Arrange cards'], ['plus', 'Add a tab'], ['sparkles', 'Ask Sen for a card'], '-', ['rotate-ccw', 'Reset Insights']], 'right:8px;top:86px');
const resetDlg = `<div class="dlg"><h3>Reset Insights?</h3><p>This brings back This cycle, Food, Commitments and Over time with their 15 cards. Tabs and cards you added or changed are removed, and this can’t be undone.</p><div class="acts"><span class="btn out">Cancel</span><span class="btn del">Reset</span></div></div>`;
S.push(section('menu', '7 · The screen’s menu, and Reset', 'The one action in the app bar. <i>Arrange cards</i> is the way into arranging without a long-press.', row('', [
  phone({ inner: `${screen({ menuOpen: true })}<div class="dim"></div>${screenMenu}`, cap: capT('The menu', 'Arrange, add a tab, ask Sen for a card, and Reset set apart below a line.') }),
  phone({ inner: `${screen()}<div class="scrim"></div>${resetDlg}`, cap: capT('The Reset dialog', 'The only dialog on Insights, because it’s the only thing that can’t be undone.') }),
])));
S.push(section('open', '8 · A card opened', '<code>insights/card</code>: the view large, where it comes from and when, its watch, and <i>Ask Sen about this</i>. Pushed from Insights, so the tab bar stays and Sen’s button doesn’t.', row('', [
  phone({ inner: opened(), cap: capT('Am I on track?', 'The chart at full width, with a table behind it. Source and time, then the watch that goes with it.') }),
  phone({ inner: opened({ tip: true }), cap: capT('A day tapped', 'The exact figures, held. A second tap opens that day’s payments.') }),
  phone({ tall: true, inner: openedWhere(), cap: capT('Where did it go, and what changed?', 'Every category, each a row. Tapping Meals…') }),
  phone({ inner: payments(), cap: capT('…opens payments, filtered', 'Meals, this cycle, as removable chips; the count and total agree with the card.') }),
])));
const kindRow = (list) => list.map(([n, when, html]) => strip(`<div class="grid${/class="kc w/.test(html) ? '' : ''}">${/class="kc w/.test(html) ? html : `${html}<div class="kc ghost" aria-hidden="true"></div>`}</div>`, `<b>${n}</b> · ${when}`, 'top'));
S.push(section('kinds', '9 · Other cards Sen can pin or you can add', 'Each of spec 9.3’s card kinds, then each of 9.8’s chart kinds that no seeded card uses, at the size it would take.', `${row('Card kinds', kindRow(kinds))}${row('Chart kinds', kindRow(chartKinds))}`));
S.push(section('fit', '10 · Smaller phone, bigger text', 'What wraps and what gives way.', row('', [
  phone({ tall: true, w: 360, h: 640, fold: 640, inner: screen(), cap: capT('360 × 640', 'Small cards narrow to 151 px and the charts shrink with them. The dashed line is where the first screen ends.') }),
  phone({ tall: true, ts: 1.5, inner: screen({ one: true }), cap: capT('Text at 1.5×', 'Small cards go one to a row, questions wrap to two lines, and the calendar keeps its cells.') }),
])));

// either-ors
const eoTop = (o) => `${APPBAR()}${CYC_NOW}${o}`;
S.push(section('either', 'Either-or', 'The places I hesitated, each drawn both ways. My pick is first; the third was settled by the owner.', `${row('1 · The tab row', [
  strip(eoTop(tabRow(TABS4, 'This cycle')) + `<div class="grid">${C.leak()}${C.small()}</div>`, '<b>A · Chips (my pick)</b> · Reads as views of this one screen, not a second navigation; with eight it scrolls.', 'top'),
  strip(eoTop(tabRow(TABS4, 'This cycle', { under: true })) + `<div class="grid">${C.leak()}${C.small()}</div>`, '<b>B · Underlined tabs</b> · The four fit without scrolling, but it looks like a second tab row (patterns 6).', 'top'),
])}
${row('2 · A card’s first line', [
  strip(`<div class="grid">${C.leak()}${C.small()}</div>`, '<b>A · The question as the heading (my pick)</b> · You find the card by what you’d ask; the answer sits under it.', 'top'),
  strip(`<div class="grid">${card({ q: '', fig: '66% at weekends', take: 'When does the money leak?', view: calendar(N.leak.spent, 2, { today: 18 }) }).replace('<h3 class="q"></h3>', '')}${card({ q: '', fig: rm(17710), take: 'Do the small things add up?', view: `<div class="dots">${'<i></i>'.repeat(22)}</div>` }).replace('<h3 class="q"></h3>', '')}</div>`, '<b>B · The answer as the heading</b> · Faster to scan once you know the cards, but the question becomes a caption and the tab reads as a wall of numbers.', 'top'),
])}
${notes(['<b>3 · The cycle picker</b> · The owner chose both: arrows for the cycle next door and the button for the rest, drawn in section 3.'])}`));

const MAP = [
  ['The app bar and its ⋯ menu', 'Patterns 7 <code>AppBar</code> with one action; shadcn <code>DropdownMenu</code>', 'Menu of D155'],
  ['The cycle picker', 'Two shadcn <code>Button</code>s (ghost, icon, 48 px; <code>disabled</code> at either end) around a secondary <code>Button</code> with two lines, opening the Quiet sheet: <code>Drawer</code> with a <code>ScrollArea</code>, sticky year headings and a row per cycle (a <code>NavRow</code> with a thin bar)', 'D157 A; the bars are a 9.8 ranked bar laid out down the list, one scale, the estimate dashed'],
  ['The tab row', 'shadcn <code>Tabs</code> (<code>TabsList</code> restyled as chips, scrolling) ; in arranging, each trigger with a <code>DropdownMenu</code>', 'Not a second navigation: one screen’s views'],
  ['A card', 'Patterns 4 <code>InsightCard</code> on shadcn <code>Card</code>: title, figure or takeaway, change, view, <i>as of</i>', 'Two sizes, one grid; <code>grid-auto-flow: dense</code>'],
  ['Am I on track?', '9.8 <b>Line</b>, against last cycle, a limit line, a dashed estimate', 'shadcn <code>Chart</code> on Recharts <code>LineChart</code>/<code>Area</code>'],
  ['Which budgets are at risk?', 'Patterns 4 <code>Progress</code> meters with the elapsed tick (D29, D31)', 'Not a chart kind'],
  ['Where did it go?', '9.8 <b>Ranked bar</b>, a typical mark, <i>Everything else</i>', ''],
  ['When does the money leak?', '9.8 <b>Calendar</b>, a cycle; hand-drawn SVG', 'Recharts has none'],
  ['Do the small things add up?; A number', 'Patterns 4 figure; dots are decoration, one per payment', ''],
  ['What does a meal cost me?', '9.8 <b>Spark</b>, dashed as an estimate; shadcn <code>Badge</code>', ''],
  ['Am I keeping my experiment?; Saving; Trust', '9.8 <b>Bar</b>, one highlighted, a limit or median line (patterns 4 <code>ColumnBars</code>)', ''],
  ['Eating out or cooking?; Spoken for', '9.8 <b>Stacked bar</b>, shares, as one thin segmented bar, with legend rows', ''],
  ['What renews soon?; What’s coming up', 'Patterns 7 rows in a <code>GroupCard</code>; forecast amounts with ≈', 'Spec 11'],
  ['Will my goals make it?', '9.8 <b>Ring</b>, several (patterns 4 <code>GoalMeter</code>)', ''],
  ['Where do I spend most often?; A top list', '9.8 <b>Ranked bar</b>, top N, as thin bars under each name', ''],
  ['The year', 'Patterns 7 <code>NavRow</code> in a <code>GroupCard</code>', 'Opens <code>insights/year</code>'],
  ['Arranging: handle, Wide/Small, remove, Done', 'dnd-kit sortable over the grid; shadcn <code>Button</code> (ghost, icon; chip; main)', 'Sway off with reduced motion'],
  ['The handle’s menu; a tab’s menu', 'shadcn <code>DropdownMenu</code>, anchored', 'D155'],
  ['Move to a tab; move a tab; name a tab', 'The Quiet sheet (<code>Drawer</code>) with <code>NavRow</code>s or a shadcn <code>Input</code>', 'D157 A'],
  ['Reset', 'shadcn <code>AlertDialog</code>', 'The only dialog'],
  ['Toasts with Undo', 'Patterns 7 toast (shadcn <code>Sonner</code>)', '6 seconds, beside Sen’s button'],
  ['Skeletons; offline line', 'shadcn <code>Skeleton</code>; patterns 7 offline banner (<code>Alert</code>)', ''],
  ['The opened card', 'Patterns 7 detail page; shadcn <code>ToggleGroup</code> for chart and table; <code>Table</code> behind it', ''],
  ['A tap on a point', 'shadcn <code>ChartTooltip</code>, held on tap (trigger: click)', 'A second tap navigates'],
  ['Payments, filtered', 'The <code>payments</code> list with removable filter chips (<code>Badge</code> with a button)', ''],
  ['Area, Bars with a line, Donut, Treemap, Waterfall, Flow', '9.8 <b>Area</b> single; <b>Bars with a line</b> one axis; <b>Donut</b> one highlighted; <b>Treemap</b>; <b>Waterfall</b> pay to what’s left; <b>Flow</b>', 'Treemap and Flow: Recharts <code>Treemap</code>, <code>Sankey</code>'],
];
S.push(section('build', '11 · What each piece is built from', 'For the builder. Restyle shadcn in place with a <code>// Sen:</code> note.', `<div class="sc-tw"><table class="sc-table"><thead><tr><th>Drawn piece</th><th>Built from</th><th>Note</th></tr></thead><tbody>${MAP.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody></table></div>
<div class="sc-notes"><p><b>What I couldn’t make work as written, and what I drew instead</b></p><ol>
<li><b>An odd small card.</b> Patterns 4 fills a hole with the next small card, but when a tab has an odd number of small cards there is no next one. The last small card is drawn wide until a partner arrives.</li>
<li><b>Patterns 7 lists <code>StepPager</code> “for Insights”, and D130 says one card at a time.</b> D152 and D153 replaced both with tabs of cards, so neither is drawn.</li>
<li><b>D62 chose Insights “over sub-tabs”, and patterns 6 forbids a second tab row.</b> D153 decided the tabs. They’re drawn as chips inside the screen, under the cycle picker, so they read as views of one screen rather than navigation.</li>
<li><b>“Its change, coloured only where up or down means good or bad.”</b> Patterns 3 keeps the warning colour for over budget and green for money in. So only an over budget is warned, and only saving more than usual is green; every other change is grey, with an arrow and words.</li>
<li><b>The meal average is “labelled an estimate”</b> (spec 9.3). It has a badge, and its spark is dashed, as every estimate is.</li>
<li><b>A tab’s <i>Move</i></b> has no stated form. It opens a short list of places; dragging the chip in arranging does the same.</li>
<li><b>At 1.5× text</b> two small cards no longer fit side by side, so they stack one to a row. No half row is left, because every card is then full width.</li>
<li><b>Patterns 7’s app bar has one action.</b> On a past cycle it gains a second, <i>Back to October</i>, because the cycle row has no room once the arrows are in it. On the current cycle the app bar is as before.</li>
</ol></div>`));

const NAV = [['cycle', 'This cycle'], ['tabs', 'Other tabs'], ['picker', 'Changing cycle'], ['states', 'States'], ['arrange', 'Arranging'], ['pin', 'Pinned'], ['menu', 'Menu and Reset'], ['open', 'A card opened'], ['kinds', 'Other cards'], ['fit', 'Small and big'], ['either', 'Either-or'], ['build', 'Built from']];
const html = `<title>Insights</title>
<!-- Sen's Insights: the design page (docs/screens.md insights, insights/card; spec 9.3, 9.8; D152, D153, D155, D157).
     Built by docs/ui/insights/design-src/build.mjs; edit the source, then rebuild. Written for the Artifact tool,
     which adds the doctype and head. Every name and amount is made up. -->
<style>
${fontCss}
${LOOKS.map(lookCss).join('')}.ph { --keys: ${svgUri(keys())}; }
${avCss}
${fs.readFileSync(path.join(here, 'page.css'), 'utf8')}</style>
<div class="sc">
<header class="sc-top"><h1>Insights</h1>
<p class="sc-lede">Sen’s Insights as it should be built: a cycle picker, a row of tabs, then each tab’s cards, small ones in pairs and wide ones across. Every card asks its question first and answers it in a line; the chart under it is one accent on grey. Drawn at true size in Minted, with dark and Copper where a second look matters.</p>
<nav class="sc-nav" aria-label="On this page">${NAV.map(([id, n]) => `<a href="#${id}">${n}</a>`).join('')}</nav></header>
${S.join('\n')}
<p class="sc-foot">Every phone is 390 × 844 unless it says otherwise, scaled to fit the page; a tab taller than the phone is drawn whole. A strip is a piece of a screen at its true width. Inside them every colour, radius and font is the look’s token; the scrim, the shadows and the keyboard stand-in are plain black and grey. Names and amounts are the made-up month the app’s own screenshots use. Source: <code>docs/ui/insights/design-src/</code>.</p>
</div>
`;
fs.writeFileSync(path.join(here, '../design.html'), html);
console.log(`built design.html (${(html.length / 1024).toFixed(0)} KB)`);
