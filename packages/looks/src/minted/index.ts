// Minted, ported from docs/ui/directions/src/minted.js. Money's own craft: guilloché engraving,
// intaglio ink on opaline paper. Sen is a living rosette: two engraved bands around a silver bead (the sen).
import { TAB_SK, TAU, allOf, f2, insertDecor, polyD, reduced, rmParts, svgTag } from '../engine';
import type { IconTab, Look, Mode } from '../types';
import './look.css';

// The rosette: an outer rope (six wavy rings, twisted like a coin's milled edge) around an inner lace
// (six rose curves), with a silver bead at the centre, the sen. Radii are fractions of the mark's size.
interface Band {
  R: number;
  A: number;
  p: number;
  copies: number;
  spread: number;
}
export const MINT: Band[] = [
  { R: 0.37, A: 0.035, p: 20, copies: 6, spread: 0.34 },
  { R: 0.2, A: 0.1, p: 8, copies: 6, spread: 1 },
];
function bandPaths(cx: number, cy: number, size: number, b: Band, steps: number, rot = 0) {
  const out: string[] = [];
  for (let k = 0; k < b.copies; k++) {
    const ph = (k / b.copies) * (TAU / b.p) * b.spread + rot;
    const pts: [number, number][] = [];
    for (let j = 0; j < steps; j++) {
      const th = (j / steps) * TAU;
      const r = size * (b.R + b.A * Math.cos(b.p * th));
      pts.push([cx + r * Math.cos(th + ph), cy + r * Math.sin(th + ph)]);
    }
    out.push(polyD(pts, true));
  }
  return out;
}
/** size: the mark's diameter in the SVG's units */
export function rosetteSVG(cx: number, cy: number, size: number, color: string, sw: number, opacity: number) {
  const d = MINT.flatMap((b, i) => bandPaths(cx, cy, size, b, i ? 150 : 220));
  return `<g fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}" stroke-linejoin="round">${d.map((x) => `<path d="${x}"/>`).join('')}</g>`;
}

// microprint, the security line along the tab bar: one phrase, too small to copy
const mtMicro = (w: number, cls: string) =>
  `<svg class="${cls}" viewBox="0 0 ${w} 5" preserveAspectRatio="none" aria-hidden="true"><text x="0" y="3.9" font-size="3.6" textLength="${w}" lengthAdjust="spacing" fill="currentColor">${'EVERY SEN COUNTED • '.repeat(Math.round(w / 58))}</text></svg>`;

// the payday card's foil seal, a small rosette on holographic foil
const mtSeal = () =>
  `<svg class="seal" viewBox="0 0 108 108" aria-hidden="true"><defs><linearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfd9ea"/><stop offset=".35" stop-color="#e9dcf3"/><stop offset=".6" stop-color="#f3e7c9"/><stop offset=".85" stop-color="#cde8e2"/><stop offset="1" stop-color="#cfd9ea"/></linearGradient></defs><circle cx="54" cy="54" r="50" fill="url(#foil)"/>${rosetteSVG(54, 54, 100, '#4b5d78', 0.7, 0.6)}<circle cx="54" cy="54" r="7" fill="#4b5d78" opacity=".7"/></svg>`;

// ---------- the tab bar: engraved icons, and a bead riding the microprint ----------
interface TabInk {
  idle: string;
  on: string;
  bead: [string, string, string];
  btn: [string, string, string];
  badge: [string, string];
}
const MT_TAB: Record<Mode, TabInk> = {
  light: {
    idle: '#4b5b6c',
    on: '#0f2238',
    bead: ['#7f9cc0', '#173a63', '#0a192c'],
    btn: ['#26507f', '#14304f', '#0a192c'],
    badge: ['#173a63', '#f5f8fa'],
  },
  dark: {
    idle: '#95a5b7',
    on: '#e3e9ef',
    bead: ['#ffffff', '#c3d3e6', '#7f93ad'],
    btn: ['#2c5a8c', '#14304f', '#0a192c'],
    badge: ['#c3d3e6', '#0b1522'],
  },
};
// a line cut twice, the way engravers outline a letter: the stroke with its middle left uncut
function mtInline(d: string, color: string, w: number, u: string) {
  return `<defs><mask id="${u}m" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="#fff" stroke-width="${w}"/><path d="${d}" stroke="#000" stroke-width="${f2(w * 0.33)}"/></g></mask></defs><rect x="-4" y="-4" width="32" height="32" fill="${color}" mask="url(#${u}m)"/>`;
}
const mtBead = (c: TabInk, u: string) =>
  `<radialGradient id="${u}" cx="36%" cy="32%" r="72%"><stop offset="0" stop-color="${c.bead[0]}"/><stop offset=".6" stop-color="${c.bead[1]}"/><stop offset="1" stop-color="${c.bead[2]}"/></radialGradient>`;
function mtIcon(k: IconTab, on: boolean, mode: Mode, u: string) {
  const c = MT_TAB[mode],
    S = TAB_SK[k];
  if (k === 'more') {
    // idle: three rings with a point, like coins seen edge-on; active: three beads, the sen
    const dots = S.dots ?? [];
    return svgTag(
      '0 0 24 24',
      24,
      24,
      on
        ? `<defs>${mtBead(c, `${u}b`)}</defs>${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.3" fill="url(#${u}b)"/>`).join('')}`
        : dots
            .map(
              ([x, y]) =>
                `<circle cx="${x}" cy="${y}" r="1.95" fill="none" stroke="${c.idle}" stroke-width=".8"/><circle cx="${x}" cy="${y}" r=".6" fill="${c.idle}"/>`,
            )
            .join(''),
    );
  }
  const d = S.d.join('');
  if (!on) return svgTag('0 0 24 24', 24, 24, mtInline(d, c.idle, 2.3, u));
  // active: cut solid, and its face hatched the way a burin shades; the hatching is cut in from the left when chosen
  const face = S.area
    ? `<defs><pattern id="${u}h" width="1.45" height="1.45" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width=".5" height="1.45" fill="${c.on}"/></pattern><clipPath id="${u}c"><path d="${S.area}"/></clipPath><mask id="${u}r" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect class="cut" width="24" height="24" fill="#fff"/></mask></defs><g mask="url(#${u}r)"><rect width="24" height="24" fill="url(#${u}h)" clip-path="url(#${u}c)" opacity=".9"/></g>`
    : '';
  return svgTag(
    '0 0 24 24',
    24,
    24,
    `${face}<path d="${d}" fill="none" stroke="${c.on}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
}
// the scan button: a coin in intaglio blue, with a milled edge and the scan mark cut in silver
function mtScan(mode: Mode, u: string) {
  const c = MT_TAB[mode];
  const ring = (r: number, w: number, dash: string, op: number) =>
    `<circle cx="26" cy="26" r="${r}" fill="none" stroke="#dae5f1" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''} opacity="${op}"/>`;
  return svgTag(
    '0 0 52 52',
    52,
    52,
    `<defs><radialGradient id="${u}g" cx="36%" cy="28%" r="80%"><stop offset="0" stop-color="${c.btn[0]}"/><stop offset=".58" stop-color="${c.btn[1]}"/><stop offset="1" stop-color="${c.btn[2]}"/></radialGradient></defs><circle cx="26" cy="26" r="24" fill="url(#${u}g)"/>${ring(22.4, 1.3, '.75 .9', 0.5)}${ring(20.3, 0.5, '', 0.35)}<g transform="translate(14 14)">${mtInline(TAB_SK.scan.d.join(''), '#dae5f1', 2.25, `${u}l`)}</g>`,
    'sb',
  );
}
// the review count on a seal with a scalloped edge; wider counts stretch the seal into a lozenge
function mtBadge(text: string, mode: Mode) {
  const [fill, ink] = MT_TAB[mode].badge;
  const extra = Math.max(0, text.length - 1) * 6.2;
  const W = 21.2 + extra;
  const pts: [number, number][] = [];
  for (let i = 0; i < 112; i++) {
    const t = (i / 112) * TAU;
    const r = 9.7 + 0.72 * Math.cos(16 * t);
    const cx = 10.6 + (Math.cos(t) > 0 ? extra : 0);
    pts.push([cx + r * Math.cos(t), 10.6 + r * Math.sin(t)]);
  }
  const ring = extra
    ? `<rect x="3.1" y="3.1" width="${f2(15 + extra)}" height="15" rx="7.5" fill="none" stroke="${ink}" stroke-width=".5" opacity=".5"/>`
    : `<circle cx="10.6" cy="10.6" r="7.5" fill="none" stroke="${ink}" stroke-width=".5" opacity=".5"/>`;
  return `${svgTag(`0 0 ${f2(W)} 21.2`, f2(W), 21.2, `<path d="${polyD(pts, true)}" fill="${fill}"/>${ring}`)}<b style="color:${ink}">${text}</b>`;
}

export const DIR: Look = {
  id: 'minted',
  name: 'Minted',
  radius: '0.875rem',
  // engraved: a fine cut that stops square, with sharp corners
  icons: { weight: 1.5, cap: 'butt', join: 'miter' },

  avatar: {
    draw(c, s, t, st) {
      const cx = s / 2,
        cy = s / 2;
      const g = c.createRadialGradient(s * 0.36, s * 0.28, 0, cx, cy, s * 0.62);
      g.addColorStop(0, '#26507f');
      g.addColorStop(0.58, '#14304f');
      g.addColorStop(1, '#0a192c');
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, s / 2, 0, TAU);
      c.fill();
      let rotO = t * 0.03,
        rotI = -t * 0.045,
        spread = MINT[0].spread,
        amp = 1,
        alpha = 0.82,
        grow = 1;
      if (st === 'listening') {
        alpha = 0.97;
        grow = 1.035;
        rotO = t * 0.05;
        rotI = -t * 0.07;
      }
      if (st === 'thinking' || st === 'helpers') {
        rotO = t * 0.2;
        rotI = -t * 0.3;
        spread = 0.34 + 0.22 * Math.sin(t * 1.6);
        alpha = 0.92;
      }
      if (st === 'speaking') {
        amp = 1 + 0.28 * Math.sin(t * 7) * (0.6 + 0.4 * Math.sin(t * 2.3));
        rotO = t * 0.07;
        alpha = 0.94;
      }
      if (st === 'done') {
        const k = Math.max(0, 1 - (t % 3) / 0.9);
        alpha = 0.82 + 0.18 * k;
        grow = 1 + 0.04 * k;
      }
      if (st === 'paused') {
        alpha = 0.3;
        rotO = 0;
        rotI = 0;
      }
      c.lineWidth = Math.max(0.6, s / 190);
      c.lineJoin = 'round';
      c.strokeStyle = `rgba(218,229,241,${alpha})`;
      const bands: Band[] = [
        { ...MINT[0], spread },
        { ...MINT[1], A: MINT[1].A * amp },
      ];
      bands.forEach((b, i) => {
        for (let k = 0; k < b.copies; k++) {
          const ph = (k / b.copies) * (TAU / b.p) * b.spread + (i ? rotI : rotO);
          const n = s > 100 ? 260 : 160;
          c.beginPath();
          for (let j = 0; j <= n; j++) {
            const th = (j / n) * TAU;
            const r = s * (b.R + b.A * Math.cos(b.p * th)) * grow;
            const x = cx + r * Math.cos(th + ph),
              y = cy + r * Math.sin(th + ph);
            if (j) c.lineTo(x, y);
            else c.moveTo(x, y);
          }
          c.closePath();
          c.stroke();
        }
      });
      const bead = (x: number, y: number, r: number) => {
        const bg = c.createRadialGradient(x - r * 0.35, y - r * 0.4, 0, x, y, r);
        bg.addColorStop(0, '#ffffff');
        bg.addColorStop(1, '#9db2ca');
        c.fillStyle = bg;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fill();
      };
      bead(cx, cy, s * (st === 'paused' ? 0.042 : 0.058));
      if (st === 'note') {
        const a = t * 0.9 - 1;
        bead(cx + s * 0.43 * Math.cos(a), cy + s * 0.43 * Math.sin(a), s * 0.04);
      }
      if (st === 'helpers') {
        for (let h = 0; h < 2; h++) {
          const a = t * 1.1 + h * Math.PI;
          bead(cx + s * 0.43 * Math.cos(a), cy + s * 0.43 * Math.sin(a), s * 0.034);
        }
      }
      c.strokeStyle = 'rgba(218,229,241,.22)';
      c.lineWidth = Math.max(0.6, s / 120);
      c.beginPath();
      c.arc(cx, cy, s / 2 - c.lineWidth, 0, TAU);
      c.stroke();
    },
  },

  icon: {
    background: (p) =>
      `<defs><radialGradient id="${p}bg" cx="36%" cy="28%" r="88%"><stop offset="0" stop-color="#26507f"/><stop offset=".58" stop-color="#14304f"/><stop offset="1" stop-color="#0a192c"/></radialGradient></defs><rect width="108" height="108" fill="url(#${p}bg)"/>`,
    foreground: (p) =>
      `<defs><radialGradient id="${p}bd" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9db2ca"/></radialGradient></defs>${rosetteSVG(54, 54, 78, '#dae5f1', 0.55, 0.88)}<circle cx="54" cy="54" r="4.4" fill="url(#${p}bd)"/>`,
    monochrome: () =>
      `${rosetteSVG(54, 54, 78, 'currentColor', 0.7, 0.9)}<circle cx="54" cy="54" r="4.4" fill="currentColor"/>`,
    // the coin from above: a milled (dotted) edge, a rim, the bead
    small: () =>
      '<circle cx="12" cy="12" r="10.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="1.1 1.25"/><circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.9" fill="currentColor"/>',
  },

  wordmark: () => '<span class="wm">Sen</span>',
  // set in Libre Caslon Display, with the currency small and spaced
  heroFigure(sen) {
    const p = rmParts(sen);
    return `<span class="cur">${p.cur}</span><span>${p.whole}.${p.cents}</span>`;
  },
  tabs: {
    icon: mtIcon,
    scan: mtScan,
    badge: mtBadge,
    // the microprint along the top of the bar, and the bead that rides it to the active tab
    bar: () => mtMicro(390, 'mt-micro'),
    ind: (mode, u) =>
      svgTag(
        '0 0 10 10',
        10,
        10,
        `<defs>${mtBead(MT_TAB[mode], `${u}g`)}</defs><circle cx="5" cy="5" r="3.9" fill="url(#${u}g)"/>`,
      ),
  },
  // the cycle as an engraved minute track: a tick a day, today raised, payday ringed
  strip(day, days) {
    const W = 350,
      H = 22,
      x = (i: number) => 1.5 + (i / (days - 1)) * (W - 3);
    let s = '';
    for (let i = 0; i < days; i++) {
      const d = i + 1;
      const past = d < day,
        now = d === day,
        pay = d === days;
      const h = now ? 15 : d % 7 === 1 ? 9 : 6;
      const col = now ? 'var(--primary)' : past ? 'var(--foreground)' : 'var(--muted-foreground)';
      s += `<line x1="${f2(x(i))}" x2="${f2(x(i))}" y1="${H - h}" y2="${H}" stroke="${col}" stroke-width="${now ? 1.6 : 1}" opacity="${now ? 1 : past ? 0.55 : 0.35}"/>`;
      if (pay)
        s += `<circle cx="${f2(x(i) - 3.5)}" cy="${H - 12}" r="3" fill="none" stroke="var(--muted-foreground)" stroke-width="1"/>`;
    }
    s += `<circle cx="${f2(x(day - 1))}" cy="${H - 17.5}" r="3" fill="var(--primary)"/>`;
    return `<svg viewBox="0 0 ${W} ${H + 2}" width="100%" aria-hidden="true" style="overflow:visible">${s}</svg>`;
  },
  // the rosette behind the wordmark, microprint above the quiet row, and the payday card's foil seal
  decorate(root) {
    const off: (() => void)[] = [
      insertDecor(
        root,
        'afterbegin',
        `<svg class="wm-rosette" viewBox="0 0 108 108" aria-hidden="true">${rosetteSVG(54, 54, 104, 'currentColor', 0.3, 1)}</svg>`,
      ),
    ];
    const quiet = root.querySelector('[data-testid="quiet"]');
    if (quiet) off.push(insertDecor(quiet, 'beforebegin', mtMicro(350, 'micro')));
    // the seal is the payday card's: the column says so when that card is showing
    const pay = root.hasAttribute('data-payday') ? root.querySelector('[data-slot="card"]') : null;
    if (pay) off.push(insertDecor(pay, 'afterbegin', mtSeal()));
    return allOf(...off);
  },
  paydayFx(root) {
    const seal = root.querySelector('.seal');
    if (seal && !reduced()) seal.classList.add('shine');
  },
  reveal: null,
};
export default DIR;
