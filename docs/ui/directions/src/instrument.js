/* Direction: Instrument. A hundred sen make a ringgit, so Sen is drawn on a ten-by-ten grid: a precise
   instrument with a dot-matrix display. Colour only where money moves. Sen speaks in the same dots. */

// a 5×7 dot-matrix face for the figures, the wordmark and the title
const DM = {
  0: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], 3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], 5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], 7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], 9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  s: ['00000', '00000', '01111', '10000', '01110', '00001', '11110'], e: ['00000', '00000', '01110', '10001', '11111', '10000', '01110'],
  n: ['00000', '00000', '10110', '11001', '10001', '10001', '10001'], t: ['01000', '01000', '11100', '01000', '01000', '01001', '00110'],
  r: ['00000', '00000', '10110', '11001', '10000', '10000', '10000'], u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
  m: ['00000', '00000', '11010', '10101', '10101', '10001', '10001'],
  '+': ['000', '000', '010', '111', '010', '000', '000'],
  ',': ['00', '00', '00', '00', '00', '01', '10'], '.': ['0', '0', '0', '0', '0', '0', '1'],
};
// dots for a string: returns {w, h, dots: [x, y, lit]} in pitch units
function dmLayout(text) {
  const dots = []; let x = 0;
  for (const ch of text) { const g = DM[ch]; if (!g) { x += 3; continue; } g.forEach((row, y) => row.split('').forEach((b, i) => dots.push([x + i, y, b === '1']))); x += g[0].length + 1; }
  return { w: x - 1, h: 7, dots };
}
function dmSVG(text, pitch, r, on, off, cls) {
  const L = dmLayout(text); const W = L.w * pitch, H = 7 * pitch;
  const c = L.dots.filter((d) => d[2] || off).map((d) => `<circle cx="${f2(d[0] * pitch + pitch / 2)}" cy="${f2(d[1] * pitch + pitch / 2)}" r="${d[2] ? r : r * 0.92}" fill="${d[2] ? on : off}"/>`).join('');
  return `<svg ${cls ? `class="${cls}"` : ''} viewBox="0 0 ${f2(W)} ${f2(H)}" width="${f2(W)}" height="${f2(H)}" aria-hidden="true">${c}</svg>`;
}
// the 10×10 grid, one sen lit
function grid100(x0, y0, span, r, fill, lit, litFill, litR, glowId) {
  const p = (span - 2 * r) / 9; let s = '';
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
    const on = i * 10 + j === lit; const cx = x0 + r + j * p, cy = y0 + r + i * p;
    if (on && glowId) s += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(litR * 3.4)}" fill="url(#${glowId})"/>`;
    s += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${on ? litR : r}" fill="${on ? litFill : fill}"/>`;
  }
  return s;
}
// the avatar's 9×9 matrix, masked to a circle, cells in reading order
function matrix(N) { const h = (N - 1) / 2, out = []; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const dx = j - h, dy = i - h; if (dx * dx + dy * dy <= (h + 0.55) * (h + 0.55)) out.push({ i, j, dx, dy, d: Math.hypot(dx, dy) }); } return out; }
const IM = matrix(9), IM7 = matrix(7);
const TICK = new Set(['4,2', '5,3', '6,4', '5,5', '4,6', '3,7', '2,8'].map(String)), TICK7 = new Set(['3,1', '4,2', '5,3', '4,4', '3,5', '2,6'].map(String));

// ---------- the tab bar: the instrument's mode keys ----------
// each icon on a 9×9 grid of dots: printed on the body when idle, lit in a small display window when active
const IN_TABS = {
  home: ['....#....', '...#.#...', '..#...#..', '.#.....#.', '##.....##', '.#.....#.', '.#.###.#.', '.#.#.#.#.', '.###.###.'],
  review: ['.........', '..#####..', '.#.....#.', '#.......#', '###...###', '#..###..#', '#.......#', '#########', '.........'],
  scan: ['##.....##', '#.......#', '.........', '.........', '.#######.', '.........', '.........', '#.......#', '##.....##'],
  insights: ['#........', '#.......#', '#......#.', '#..#..#..', '#.#.##...', '##.......', '#........', '#........', '#########'],
  more: ['.........', '.........', '.........', '.........', '##.##.##.', '##.##.##.', '.........', '.........', '.........'],
};
// the glyph's dots centred on (cx, cy) at pitch p: lit and unlit, in reading order
function inGrid(k, cx, cy, p) {
  const lit = [], off = []; IN_TABS[k].forEach((row, y) => row.split('').forEach((ch, x) => (ch === '#' ? lit : off).push([x, y])));
  const xs = lit.map((q) => q[0]), ys = lit.map((q) => q[1]); const ox = cx - ((Math.min(...xs) + Math.max(...xs)) / 2) * p, oy = cy - ((Math.min(...ys) + Math.max(...ys)) / 2) * p;
  const at = (q) => [ox + q[0] * p, oy + q[1] * p];
  return { lit: lit.map(at), off: off.map(at) };
}
const inDots = (pts, r, fill, cls) => pts.map(([x, y], i) => `<circle cx="${f2(x)}" cy="${f2(y)}" r="${r}" fill="${fill}"${cls ? ` class="${cls}" style="--d:${i}"` : ''}/>`).join('');
const IN_LED = '#f3f2ec';
function inIcon(k, on, mode, u) {
  const dark = mode === 'dark'; const g = inGrid(k, 12, 12, 2.45);
  if (!on) return svgTag('0 0 24 24', 24, 24, inDots(g.off, 0.74, dark ? 'rgba(236,235,230,.08)' : 'rgba(23,24,26,.08)') + inDots(g.lit, 0.9, dark ? '#a3a5aa' : '#4c4e53'));
  // active: a window set into the body, its rim catching the light below; the dots light in reading order when chosen
  return svgTag('-6 -3 36 30', 36, 30, `<defs><linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050506"/><stop offset=".22" stop-color="${dark ? '#08090a' : '#141517'}"/><stop offset="1" stop-color="${dark ? '#0b0c0d' : '#17181b'}"/></linearGradient><filter id="${u}g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".8"/></filter></defs>`
    + `<rect x="-5.5" y="-1.6" width="35" height="27.4" rx="6.6" fill="${dark ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.8)'}"/><rect x="-5.5" y="-2.3" width="35" height="27.4" rx="6.6" fill="url(#${u}w)"/>`
    + inDots(g.off, 0.74, 'rgba(255,255,255,.075)') + `<g filter="url(#${u}g)" opacity=".55">${inDots(g.lit, 1.1, IN_LED)}</g>` + inDots(g.lit, 0.92, IN_LED, 'led'));
}
// the scan key: the one dark key on the panel, its mark lit
function inScan(mode, u) {
  const g = inGrid('scan', 26, 19, 2.55);
  return svgTag('0 0 52 40', 52, 40, `<defs><linearGradient id="${u}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#303237"/><stop offset="1" stop-color="#121315"/></linearGradient><filter id="${u}g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".9"/></filter></defs>`
    + `<rect y="2" width="52" height="38" rx="11" fill="#060607"/><rect width="52" height="38" rx="11" fill="url(#${u}k)"/><rect x=".5" y=".5" width="51" height="37" rx="10.5" fill="none" stroke="rgba(255,255,255,.1)"/>`
    + inDots(g.off, 0.7, 'rgba(255,255,255,.07)') + `<g filter="url(#${u}g)" opacity=".6">${inDots(g.lit, 1.15, IN_LED)}</g>` + inDots(g.lit, 0.95, IN_LED), 'sb');
}
// the review count in the display's own 5×7 dots
function inBadge(n) {
  const L = dmLayout(String(n)); const p = 1.55, w = L.w * p + 6, h = 7 * p + 5.4;
  return svgTag(`0 0 ${f2(w)} ${f2(h)}`, f2(w), f2(h), `<rect width="${f2(w)}" height="${f2(h)}" rx="4.2" fill="#141517"/><rect x=".4" y=".4" width="${f2(w - 0.8)}" height="${f2(h - 0.8)}" rx="3.8" fill="none" stroke="rgba(255,255,255,.12)" stroke-width=".8"/>${L.dots.filter((d) => d[2]).map((d) => `<circle cx="${f2(3 + d[0] * p + p / 2)}" cy="${f2(2.7 + d[1] * p + p / 2)}" r=".6" fill="${IN_LED}"/>`).join('')}`);
}

const DIR = {
  id: 'instrument', name: 'Instrument', title: 'Sen Instrument',
  fonts: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap',
  titleHTML: `<span class="dm-title" aria-label="Instrument">${dmSVG('Instrument', 9, 3.3, 'currentColor', 'var(--dm-off)')}</span>`,
  lede: 'A hundred sen make a ringgit, so Sen is drawn on a ten-by-ten grid. It’s a precise instrument: graphite and bone, a dot-matrix display for the one figure that matters, and colour only where money moves. Sen speaks in the same dots.',
  meta: 'Light is a bone-coloured body with a dark display set into it. Dark is the same instrument with the lights down.',
  senIntro: 'Sen is a glyph on a small round display, nine dots across, with no face. At rest one dot is lit: a single sen. It ripples when it listens, counts dot by dot while it works, splits into quarters when its helpers are out, and draws its reply as a waveform.',
  iconIntro: 'The grid of a hundred, with one sen lit. It’s the app’s whole promise in one picture: every sen counted, and this one accounted for. The themed icon keeps the grid faint and the lit sen solid; the notification icon is a small grid with one large dot.',
  tabsIntro: 'The tabs are the instrument’s mode keys. Idle icons are printed on the body in dots; the active one lights up in a small display window set into the body, dot by dot, the way the figure’s display draws. The scan key is the one dark key on the panel, and the review count shows in the same lit dots.',
  themeIntro: 'Bone and graphite, with a dark display for the figure that matters.',
  typeNote: { display: 'A 5×7 dot-matrix, drawn by the app, for the large figure, the wordmark and Sen', ui: 'Instrument Sans for everything you read and tap, narrower where space is tight, with tabular figures in columns.', voice: 'Sen writes in Instrument Sans, like the rest of the instrument.' },
  radius: '0.75rem',
  // every icon outside the tab bar is lucide, in this look's colour (the icon token), weight and line ends (D81): a display segment: heavier, squared off
  icons: { weight: 1.8, cap: 'square', join: 'miter' },
  tokens: {
    light: {
      background: '#ebebe7', foreground: '#17181a', card: '#f7f7f4', 'card-foreground': '#17181a', popover: '#fbfbf9', 'popover-foreground': '#17181a',
      primary: '#17181a', 'primary-foreground': '#f7f7f4', secondary: '#dfdfda', 'secondary-foreground': '#17181a', muted: '#e2e2dd', 'muted-foreground': '#54565b',
      accent: '#dededa', 'accent-foreground': '#17181a', destructive: '#c0291f', border: '#d0d0ca', input: '#c2c2bc', ring: '#17181a',
      'chart-accent': '#17181a', 'chart-context': '#acaca5',
      'money-in': '#13703d', 'money-out': '#17181a', 'money-pending': '#646670', 'money-warning': '#975400', icon: '#4c4e53',
    },
    dark: {
      background: '#161719', foreground: '#ecebe6', card: '#1d1e21', 'card-foreground': '#ecebe6', popover: '#222326', 'popover-foreground': '#ecebe6',
      primary: '#ecebe6', 'primary-foreground': '#161719', secondary: '#26272b', 'secondary-foreground': '#ecebe6', muted: '#212225', 'muted-foreground': '#9c9ea3',
      accent: '#2a2b2f', 'accent-foreground': '#ecebe6', destructive: '#ff7b72', border: '#2d2e32', input: '#37383d', ring: '#ecebe6',
      'chart-accent': '#ecebe6', 'chart-context': '#56585d',
      'money-in': '#5bd08f', 'money-out': '#ecebe6', 'money-pending': '#8f9196', 'money-warning': '#f0a84b', icon: '#a3a5aa',
    },
  },
  extra: {
    light: { display: '#141517', led: '#f3f2ec', 'led-dim': '#9b9ea4', 'dm-off': 'rgba(23,24,26,.08)', 'warn-bg': '#f6e1de', 'warn-fg': '#8e1c14', checker: 'rgba(23,24,26,.06)', 'led-warn': '#f0a84b' },
    dark: { display: '#0c0d0e', led: '#f3f2ec', 'led-dim': '#8f9196', 'dm-off': 'rgba(236,235,230,.08)', 'warn-bg': '#3b1a17', 'warn-fg': '#ffb4ab', checker: 'rgba(236,235,230,.06)', 'led-warn': '#f0a84b' },
  },
  wall: 'linear-gradient(165deg,#a7a59d 0%,#5f5e59 50%,#25262a 100%)',

  avatar: {
    draw(c, s, t, st) {
      const cx = s / 2, cy = s / 2;
      const g = c.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#2b2d31'); g.addColorStop(1, '#141517');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, s / 2, 0, TAU); c.fill();
      const small = s < 66; const M = small ? IM7 : IM; const pitch = s * (small ? 0.118 : 0.094), r = s * (small ? 0.044 : 0.031);
      const n = M.length; const count = Math.floor((t * 16) % (n + 14));
      for (let idx = 0; idx < n; idx++) {
        const k = M[idx]; let v = 0;
        if (st === 'resting') v = k.d < 0.5 ? 0.88 + 0.12 * Math.sin(t * 1.3) : (k.d < 1.1 ? 0.24 + 0.08 * Math.sin(t * 1.3) : 0);
        if (st === 'note') { v = k.d < 0.5 ? 1 : 0; if (k.i === 1 && k.j === (small ? 5 : 6)) v = (t * 1.1) % 1 < 0.55 ? 1 : 0.12; }
        if (st === 'listening') { const w = ((t * 0.8) % 1) * 5.2; v = Math.max(k.d < 0.5 ? 1 : 0, Math.max(0, 1 - Math.abs(k.d - w) * 1.5) * (1 - w / 5.4)); }
        if (st === 'thinking') v = idx < count ? (idx > count - 4 ? 1 : 0.55) : 0;
        if (st === 'helpers') { const q = (k.dx <= 0 ? 0 : 1) + (k.dy <= 0 ? 0 : 2); const on = Math.floor(t * 2.6) % 4; v = q === on ? 0.35 + 0.65 * ((Math.sin(t * 11 + k.d * 1.7) + 1) / 2) : (k.d < 0.5 ? 1 : 0.05); }
        if (st === 'speaking') { const h = 0.6 + 2.1 * Math.abs(Math.sin(t * 5.5 + k.j * 1.25) * Math.sin(t * 1.9 + k.j * 0.7)); v = Math.abs(k.dy) <= h ? 1 : 0; }
        if (st === 'done') v = (small ? TICK7 : TICK).has(`${k.i},${k.j}`) ? 1 : 0;
        if (st === 'paused') v = k.d < 0.5 ? 0.32 : 0;
        const x = cx + k.dx * pitch, y = cy + k.dy * pitch;
        if (v > 0.6 && s >= 26) { const hg = c.createRadialGradient(x, y, 0, x, y, r * 3.2); hg.addColorStop(0, `rgba(255,255,255,${0.28 * v})`); hg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = hg; c.beginPath(); c.arc(x, y, r * 3.2, 0, TAU); c.fill(); }
        c.fillStyle = v > 0.02 ? `rgba(246,245,240,${0.14 + 0.86 * v})` : 'rgba(255,255,255,.085)';
        c.beginPath(); c.arc(x, y, r * (v > 0.5 ? 1.12 : 1), 0, TAU); c.fill();
      }
      c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, s / 2 - 0.5, 0, TAU); c.stroke();
    },
  },

  icon: {
    background: (p) => `<defs><linearGradient id="${p}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2d31"/><stop offset="1" stop-color="#17181b"/></linearGradient></defs><rect width="108" height="108" fill="url(#${p}b)"/>`,
    foreground: (p) => `<defs><radialGradient id="${p}g"><stop offset="0" stop-color="#ffffff" stop-opacity=".6"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>${grid100(30, 30, 48, 1.95, '#43464c', 36, '#ffffff', 2.7, `${p}g`)}`,
    monochrome: () => `<g opacity=".38">${grid100(30, 30, 48, 1.95, 'currentColor', -1)}</g>${(() => { const p = (48 - 3.9) / 9; return `<circle cx="${f2(30 + 1.95 + 6 * p)}" cy="${f2(30 + 1.95 + 3 * p)}" r="2.9" fill="currentColor"/>`; })()}`,
    small: () => { let s = ''; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const big = i === 1 && j === 2; s += `<circle cx="${f2(4.5 + j * 5)}" cy="${f2(4.5 + i * 5)}" r="${big ? 2.5 : 1.15}" fill="currentColor"/>`; } return s; },
  },

  wordmark: () => `<span class="wm">${dmSVG('sen', 3.4, 1.3, 'currentColor', null)}</span>`,
  tabs: { icon: inIcon, scan: inScan, badge: inBadge },
  heroFigure(sen, mode, st) {
    const p = rmParts(sen); const on = st && st.over ? 'var(--led-warn)' : 'var(--led)'; const off = 'rgba(255,255,255,.07)';
    return `<span class="dm-cur">${dmSVG('RM', 3.1, 1.2, on, off)}</span>${dmSVG(`${p.whole}.${p.cents}`, 6.35, 2.45, on, off, 'dm-num')}`;
  },
  // the cycle as a row of dots on the display: days gone lit, today blinking, days to go dark
  strip(day, days) {
    const W = 318, H = 12, x = (i) => 5 + (i / (days - 1)) * (W - 10); let s = '';
    for (let i = 0; i < days; i++) { const d = i + 1; s += `<circle cx="${f2(x(i))}" cy="6" r="${d === day ? 3 : 2.3}" fill="${d < day ? 'rgba(243,242,236,.6)' : d === day ? 'var(--led)' : 'rgba(255,255,255,.1)'}"${d === day ? ' class="blink"' : ''}/>`; }
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true">${s}</svg>`;
  },
  paydayFx(screen) {
    if (REDUCED) return; const fig = screen.querySelector('.hero-fig'); const st = STATE_VIEW.payday; const t0 = performance.now(); const ms = 1300;
    const step = (now) => { const k = Math.min(1, (now - t0) / ms); const e = 1 - Math.pow(1 - k, 3); fig.innerHTML = DIR.heroFigure(Math.round(st.fig * e), 'dark', st); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  },

  good: [
    'The name, counted out: a hundred dots make a ringgit, and money only ever lights up in whole sen.',
    'Colour is spent only on money. The figure on Home glows on its own display, so it reads at a glance by day or night.',
    'Sen speaks in the same dots as the display, so the agent feels built into the instrument rather than added to it.',
  ],
  weigh: [
    'The most technical of the six. Some will read it as a gadget rather than a personal tool.',
    'The dot-matrix figures are drawn by the app, a small SVG component, and stay off small text, where dots stop being legible.',
    'With no brand colour, it relies on type and spacing to feel premium. A careless screen will look plain.',
  ],
};
