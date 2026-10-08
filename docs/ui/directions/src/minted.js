/* Direction: Minted. Money's own craft: guilloché engraving, intaglio ink on opaline paper.
   Sen is a living rosette: two engraved bands around a silver bead (the sen). */

// The rosette: an outer rope (six wavy rings, twisted like a coin's milled edge) around an inner lace
// (six rose curves), with a silver bead at the centre, the sen. Radii are fractions of the mark's size.
const MINT = [
  { R: 0.37, A: 0.035, p: 20, copies: 6, spread: 0.34 },
  { R: 0.2, A: 0.1, p: 8, copies: 6, spread: 1 },
];
function bandPaths(cx, cy, size, b, steps, rot = 0) {
  const out = [];
  for (let k = 0; k < b.copies; k++) {
    const ph = (k / b.copies) * (TAU / b.p) * b.spread + rot; const pts = [];
    for (let j = 0; j < steps; j++) { const th = (j / steps) * TAU; const r = size * (b.R + b.A * Math.cos(b.p * th)); pts.push([cx + r * Math.cos(th + ph), cy + r * Math.sin(th + ph)]); }
    out.push(polyD(pts, true));
  }
  return out;
}
// size: the mark's diameter in the SVG's units
function rosetteSVG(cx, cy, size, color, sw, opacity) {
  const d = MINT.flatMap((b, i) => bandPaths(cx, cy, size, b, i ? 150 : 220));
  return `<g fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}" stroke-linejoin="round">${d.map((x) => `<path d="${x}"/>`).join('')}</g>`;
}

// microprint, the security line under the total and along the tab bar: one phrase, too small to copy
const mtMicro = (w, cls) => `<svg class="${cls}" viewBox="0 0 ${w} 5" preserveAspectRatio="none" aria-hidden="true"><text x="0" y="3.9" font-size="3.6" textLength="${w}" lengthAdjust="spacing" fill="currentColor">${'EVERY SEN COUNTED • '.repeat(Math.round(w / 58))}</text></svg>`;
// the foil seal on the payday card: an iridescent disc with the rosette struck through it
const mtSeal = () => `<svg class="seal" viewBox="0 0 108 108" aria-hidden="true"><defs><linearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfd9ea"/><stop offset=".35" stop-color="#e9dcf3"/><stop offset=".6" stop-color="#f3e7c9"/><stop offset=".85" stop-color="#cde8e2"/><stop offset="1" stop-color="#cfd9ea"/></linearGradient></defs><circle cx="54" cy="54" r="50" fill="url(#foil)"/>${rosetteSVG(54, 54, 100, '#4b5d78', 0.7, 0.6)}<circle cx="54" cy="54" r="7" fill="#4b5d78" opacity=".7"/></svg>`;

// ---------- the tab bar: engraved icons, and a bead riding the microprint ----------
const MT_TAB = {
  light: { idle: '#4b5b6c', on: '#0f2238', bead: ['#7f9cc0', '#173a63', '#0a192c'], btn: ['#26507f', '#14304f', '#0a192c'], badge: ['#173a63', '#f5f8fa'] },
  dark: { idle: '#95a5b7', on: '#e3e9ef', bead: ['#ffffff', '#c3d3e6', '#7f93ad'], btn: ['#2c5a8c', '#14304f', '#0a192c'], badge: ['#c3d3e6', '#0b1522'] },
};
// a line cut twice, the way engravers outline a letter: the stroke with its middle left uncut
function mtInline(d, color, w, u) {
  return `<defs><mask id="${u}m" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="#fff" stroke-width="${w}"/><path d="${d}" stroke="#000" stroke-width="${f2(w * 0.33)}"/></g></mask></defs><rect x="-4" y="-4" width="32" height="32" fill="${color}" mask="url(#${u}m)"/>`;
}
const mtBead = (c, u) => `<radialGradient id="${u}" cx="36%" cy="32%" r="72%"><stop offset="0" stop-color="${c.bead[0]}"/><stop offset=".6" stop-color="${c.bead[1]}"/><stop offset="1" stop-color="${c.bead[2]}"/></radialGradient>`;
function mtIcon(k, on, mode, u) {
  const c = MT_TAB[mode], S = TAB_SK[k];
  if (k === 'more') {
    // idle: three rings with a point, like coins seen edge-on; active: three beads, the sen
    return svgTag('0 0 24 24', 24, 24, on ? `<defs>${mtBead(c, `${u}b`)}</defs>${S.dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.3" fill="url(#${u}b)"/>`).join('')}`
      : S.dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.95" fill="none" stroke="${c.idle}" stroke-width=".8"/><circle cx="${x}" cy="${y}" r=".6" fill="${c.idle}"/>`).join(''));
  }
  const d = S.d.join('');
  if (!on) return svgTag('0 0 24 24', 24, 24, mtInline(d, c.idle, 2.3, u));
  // active: cut solid, and its face hatched the way a burin shades; the hatching is cut in from the left when chosen
  const face = S.area ? `<defs><pattern id="${u}h" width="1.45" height="1.45" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width=".5" height="1.45" fill="${c.on}"/></pattern><clipPath id="${u}c"><path d="${S.area}"/></clipPath><mask id="${u}r" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect class="cut" width="24" height="24" fill="#fff"/></mask></defs><g mask="url(#${u}r)"><rect width="24" height="24" fill="url(#${u}h)" clip-path="url(#${u}c)" opacity=".9"/></g>` : '';
  return svgTag('0 0 24 24', 24, 24, `${face}<path d="${d}" fill="none" stroke="${c.on}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>`);
}
// the scan button: a coin in intaglio blue, with a milled edge and the scan mark cut in silver
function mtScan(mode, u) {
  const c = MT_TAB[mode]; const ring = (r, w, dash, op) => `<circle cx="26" cy="26" r="${r}" fill="none" stroke="#dae5f1" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''} opacity="${op}"/>`;
  return svgTag('0 0 52 52', 52, 52, `<defs><radialGradient id="${u}g" cx="36%" cy="28%" r="80%"><stop offset="0" stop-color="${c.btn[0]}"/><stop offset=".58" stop-color="${c.btn[1]}"/><stop offset="1" stop-color="${c.btn[2]}"/></radialGradient></defs><circle cx="26" cy="26" r="24" fill="url(#${u}g)"/>${ring(22.4, 1.3, '.75 .9', 0.5)}${ring(20.3, 0.5, '', 0.35)}<g transform="translate(14 14)">${mtInline(TAB_SK.scan.d.join(''), '#dae5f1', 2.25, `${u}l`)}</g>`, 'sb');
}
// the review count on a seal with a scalloped edge; wider counts (99+) stretch the seal into a lozenge
function mtBadge(n, mode) {
  const text = String(n); const [fill, ink] = MT_TAB[mode].badge; const extra = Math.max(0, text.length - 1) * 6.2; const W = 21.2 + extra;
  const pts = []; for (let i = 0; i < 112; i++) { const t = (i / 112) * TAU; const r = 9.7 + 0.72 * Math.cos(16 * t); const cx = 10.6 + (Math.cos(t) > 0 ? extra : 0); pts.push([cx + r * Math.cos(t), 10.6 + r * Math.sin(t)]); }
  const ring = extra ? `<rect x="3.1" y="3.1" width="${f2(15 + extra)}" height="15" rx="7.5" fill="none" stroke="${ink}" stroke-width=".5" opacity=".5"/>` : `<circle cx="10.6" cy="10.6" r="7.5" fill="none" stroke="${ink}" stroke-width=".5" opacity=".5"/>`;
  return `${svgTag(`0 0 ${f2(W)} 21.2`, f2(W), 21.2, `<path d="${polyD(pts, true)}" fill="${fill}"/>${ring}`)}<b style="color:${ink}">${text}</b>`;
}

const DIR = {
  id: 'minted', name: 'Minted', title: 'Sen Minted',
  fonts: 'https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap',
  lede: 'Money has its own craft: the fine engraved lines on banknotes and watch dials, drawn so precisely they can’t be copied. Minted borrows it. Quiet paper, deep ink, and a Sen that is a living rosette, re-weaving itself while it works.',
  meta: 'Light is opaline paper and intaglio blue. Dark is the same ink at night, with the lines in silver.',
  senIntro: 'Sen is a guilloché rosette, generated live rather than drawn: two engraved bands around a silver bead, the sen. It has no face. It turns slowly at rest, its bands weave while it works, and smaller beads circle it when it sends out its helpers.',
  iconIntro: 'A minted rosette on deep ink, the same two bands as Sen, so the app and its agent share one mark. At launcher size it reads as a coin or a watch dial; the notification icon keeps only the outer ring and the bead.',
  tabsIntro: 'Engraved, like the rest of Minted. Idle icons are cut as a double line, the way engravers outline a letter; the active one is cut solid and its face hatched, the way a burin shades. A bead, the sen, rides the microprint along the top of the bar and rolls to the tab you choose. The scan button is a coin with a milled edge, and the review count sits on a seal.',
  themeIntro: 'Opaline paper and intaglio blue by day, the same ink at night with silver lines.',
  typeNote: { display: 'Libre Caslon Display, for the large figure and headings', ui: 'Schibsted Grotesk for everything else: labels, lists, buttons, with tabular figures in columns.', voice: 'Sen writes in the same grotesk. Plain words, set plainly.' },
  radius: '0.875rem',
  // every icon outside the tab bar is lucide, in this look's colour (the icon token), weight and line ends (D81): engraved: a fine cut that stops square, with sharp corners
  icons: { weight: 1.5, cap: 'butt', join: 'miter' },
  tokens: {
    light: {
      background: '#eef1f2', foreground: '#0f2238', card: '#fafbfb', 'card-foreground': '#0f2238', popover: '#fbfcfc', 'popover-foreground': '#0f2238',
      primary: '#173a63', 'primary-foreground': '#f5f8fa', secondary: '#e1e7eb', 'secondary-foreground': '#0f2238', muted: '#e4e9ec', 'muted-foreground': '#4b5b6c',
      accent: '#dfe6ec', 'accent-foreground': '#0f2238', destructive: '#b42318', border: '#d2d9de', input: '#c1cbd3', ring: '#173a63',
      'chart-accent': '#173a63', 'chart-context': '#a3b1bf',
      'money-in': '#146c45', 'money-out': '#0f2238', 'money-pending': '#5b6b7c', 'money-warning': '#955800', icon: '#4b5b6c',
    },
    dark: {
      background: '#0b1522', foreground: '#e3e9ef', card: '#101c2a', 'card-foreground': '#e3e9ef', popover: '#132131', 'popover-foreground': '#e3e9ef',
      primary: '#c3d3e6', 'primary-foreground': '#0b1522', secondary: '#1a2a3b', 'secondary-foreground': '#e3e9ef', muted: '#152334', 'muted-foreground': '#95a5b7',
      accent: '#1b2b3d', 'accent-foreground': '#e3e9ef', destructive: '#f28b82', border: '#21324a', input: '#2b3f57', ring: '#c3d3e6',
      'chart-accent': '#c3d3e6', 'chart-context': '#4a5e75',
      'money-in': '#5fc896', 'money-out': '#e3e9ef', 'money-pending': '#8e9db0', 'money-warning': '#e7a64e', icon: '#95a5b7',
    },
  },
  extra: {
    light: { engrave: 'rgba(15,34,56,.075)', 'warn-bg': '#f7e2df', 'warn-fg': '#8a1c13', checker: 'rgba(15,34,56,.06)' },
    dark: { engrave: 'rgba(195,211,230,.085)', 'warn-bg': '#3b1916', 'warn-fg': '#ffb4ab', checker: 'rgba(195,211,230,.06)' },
  },
  wall: 'linear-gradient(162deg,#a9b9c8 0%,#5b6e84 46%,#1c2735 100%)',

  avatar: {
    draw(c, s, t, st) {
      const cx = s / 2, cy = s / 2;
      const g = c.createRadialGradient(s * 0.36, s * 0.28, 0, cx, cy, s * 0.62);
      g.addColorStop(0, '#26507f'); g.addColorStop(0.58, '#14304f'); g.addColorStop(1, '#0a192c');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, s / 2, 0, TAU); c.fill();
      let rotO = t * 0.03, rotI = -t * 0.045, spread = MINT[0].spread, amp = 1, alpha = 0.82, grow = 1;
      if (st === 'listening') { alpha = 0.97; grow = 1.035; rotO = t * 0.05; rotI = -t * 0.07; }
      if (st === 'thinking' || st === 'helpers') { rotO = t * 0.2; rotI = -t * 0.3; spread = 0.34 + 0.22 * Math.sin(t * 1.6); alpha = 0.92; }
      if (st === 'speaking') { amp = 1 + 0.28 * Math.sin(t * 7) * (0.6 + 0.4 * Math.sin(t * 2.3)); rotO = t * 0.07; alpha = 0.94; }
      if (st === 'done') { const k = Math.max(0, 1 - ((t % 3) / 0.9)); alpha = 0.82 + 0.18 * k; grow = 1 + 0.04 * k; }
      if (st === 'paused') { alpha = 0.3; rotO = 0; rotI = 0; }
      c.lineWidth = Math.max(0.6, s / 190); c.lineJoin = 'round';
      c.strokeStyle = `rgba(218,229,241,${alpha})`;
      const bands = [Object.assign({}, MINT[0], { spread }), Object.assign({}, MINT[1], { A: MINT[1].A * amp })];
      bands.forEach((b, i) => {
        for (let k = 0; k < b.copies; k++) {
          const ph = (k / b.copies) * (TAU / b.p) * b.spread + (i ? rotI : rotO); const n = s > 100 ? 260 : 160;
          c.beginPath();
          for (let j = 0; j <= n; j++) { const th = (j / n) * TAU; const r = s * (b.R + b.A * Math.cos(b.p * th)) * grow; const x = cx + r * Math.cos(th + ph), y = cy + r * Math.sin(th + ph); j ? c.lineTo(x, y) : c.moveTo(x, y); }
          c.closePath(); c.stroke();
        }
      });
      const bead = (x, y, r) => { const bg = c.createRadialGradient(x - r * 0.35, y - r * 0.4, 0, x, y, r); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#9db2ca'); c.fillStyle = bg; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
      bead(cx, cy, s * (st === 'paused' ? 0.042 : 0.058));
      if (st === 'note') { const a = t * 0.9 - 1; bead(cx + s * 0.43 * Math.cos(a), cy + s * 0.43 * Math.sin(a), s * 0.04); }
      if (st === 'helpers') { for (let h = 0; h < 2; h++) { const a = t * 1.1 + h * Math.PI; bead(cx + s * 0.43 * Math.cos(a), cy + s * 0.43 * Math.sin(a), s * 0.034); } }
      c.strokeStyle = 'rgba(218,229,241,.22)'; c.lineWidth = Math.max(0.6, s / 120); c.beginPath(); c.arc(cx, cy, s / 2 - c.lineWidth, 0, TAU); c.stroke();
    },
  },

  icon: {
    background: (p) => `<defs><radialGradient id="${p}bg" cx="36%" cy="28%" r="88%"><stop offset="0" stop-color="#26507f"/><stop offset=".58" stop-color="#14304f"/><stop offset="1" stop-color="#0a192c"/></radialGradient></defs><rect width="108" height="108" fill="url(#${p}bg)"/>`,
    foreground: (p) => `<defs><radialGradient id="${p}bd" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9db2ca"/></radialGradient></defs>${rosetteSVG(54, 54, 78, '#dae5f1', 0.55, 0.88)}<circle cx="54" cy="54" r="4.4" fill="url(#${p}bd)"/>`,
    monochrome: () => `${rosetteSVG(54, 54, 78, 'currentColor', 0.7, 0.9)}<circle cx="54" cy="54" r="4.4" fill="currentColor"/>`,
    // the coin from above: a milled (dotted) edge, a rim, the bead
    small: () => '<circle cx="12" cy="12" r="10.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="1.1 1.25"/><circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.9" fill="currentColor"/>',
  },

  wordmark: () => '<span class="wm">Sen</span>',
  tabs: {
    icon: mtIcon, scan: mtScan, badge: mtBadge,
    // the microprint along the top of the bar, and the bead that rides it to the active tab
    bar: () => mtMicro(390, 'mt-micro'),
    ind: (mode, u) => svgTag('0 0 10 10', 10, 10, `<defs>${mtBead(MT_TAB[mode], `${u}g`)}</defs><circle cx="5" cy="5" r="3.9" fill="url(#${u}g)"/>`),
  },
  // the cycle as an engraved minute track: a tick a day, today raised, payday ringed
  strip(day, days) {
    const W = 350, H = 22, x = (i) => 1.5 + (i / (days - 1)) * (W - 3);
    let s = '';
    for (let i = 0; i < days; i++) {
      const d = i + 1; const past = d < day, now = d === day, pay = d === days; const h = now ? 15 : (d % 7 === 1 ? 9 : 6);
      const col = now ? 'var(--primary)' : past ? 'var(--foreground)' : 'var(--muted-foreground)';
      s += `<line x1="${f2(x(i))}" x2="${f2(x(i))}" y1="${H - h}" y2="${H}" stroke="${col}" stroke-width="${now ? 1.6 : 1}" opacity="${now ? 1 : past ? 0.55 : 0.35}"/>`;
      if (pay) s += `<circle cx="${f2(x(i) - 3.5)}" cy="${H - 12}" r="3" fill="none" stroke="var(--muted-foreground)" stroke-width="1"/>`;
    }
    s += `<circle cx="${f2(x(day - 1))}" cy="${H - 17.5}" r="3" fill="var(--primary)"/>`;
    return `<svg viewBox="0 0 ${W} ${H + 2}" width="100%" aria-hidden="true" style="overflow:visible">${s}</svg>`;
  },
  decorate(screen) {
    screen.insertAdjacentHTML('afterbegin', `<svg class="wm-rosette" viewBox="0 0 108 108" aria-hidden="true">${rosetteSVG(54, 54, 104, 'currentColor', 0.3, 1)}</svg>`);
    const q = screen.querySelector('.quiet');
    if (q) q.insertAdjacentHTML('afterbegin', mtMicro(350, 'micro'));
    const pd = screen.querySelector('.payday');
    if (pd) pd.insertAdjacentHTML('afterbegin', mtSeal());
  },
  paydayFx(screen) { const s = screen.querySelector('.seal'); if (s && !REDUCED) s.classList.add('shine'); },
  afterBoot(pg) {
    const head = pg.querySelector('.pg-head');
    head.insertAdjacentHTML('afterbegin', `<svg class="pg-rosette" viewBox="0 0 108 108" aria-hidden="true">${rosetteSVG(54, 54, 106, 'currentColor', 0.28, 1)}</svg>`);
  },

  good: [
    'With Copper, the most money-like of the six. Guilloché is the language of banknotes and fine watch dials, so it reads as premium without gold or black.',
    'Sen’s rosette is generated, not drawn, so every state is the same mark moving differently. Calm at rest, weaving while it works.',
    'Light mode leads: paper and ink suit an app glanced at many times a day.',
  ],
  weigh: [
    'Fine lines need care when small. Below about 24 px the rosette becomes a textured disc, so the notification icon keeps only the ring and the bead.',
    'Deep blue is the most expected finance colour of the six. The engraving is what keeps it from looking like a bank.',
    'The large figure is set in a serif, a deliberate exception to the chart rule of one sans for numbers.',
  ],
};
