// Line, ported from docs/ui/directions/src/line.js. Pen and ink: Sen keeps the ledger by hand. Cotton
// paper, iron-gall ink (it writes blue and dries to black), and a figure Sen writes itself, sen raised
// and underlined in their own column, the ledger way.
import {
  TAB_SK,
  TAU,
  dpr,
  f2,
  fontsReady,
  hexRgb,
  polyD,
  reduced,
  resample,
  rmParts,
  sampleSegs,
  svgTag,
  tabPolys,
  type Pt,
} from '../engine';
import type { IconTab, Look, Mode } from '../types';
import './look.css';

// the brand loop on the 108 dp canvas: enters from the left edge, loops once, ends at the dot
const LOOP: [Pt, Pt, Pt, Pt][] = [
  [
    [4, 63],
    [28, 63],
    [46, 64],
    [54, 52],
  ],
  [
    [54, 52],
    [59, 43],
    [50, 36.5],
    [46, 44.5],
  ],
  [
    [46, 44.5],
    [42, 53],
    [56, 63.5],
    [76.5, 62.6],
  ],
];
const LOOP_DOT: Pt = [80.6, 62.4];
// a pen stroke as one filled outline, thin to thick (for the icon's static layers)
function taperD(pts: Pt[], w0: number, w1: number) {
  const L: Pt[] = [],
    R: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(n - 1, i + 1)];
    let nx = -(b[1] - a[1]),
      ny = b[0] - a[0];
    const m = Math.hypot(nx, ny) || 1;
    nx /= m;
    ny /= m;
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return polyD(L.concat(R.reverse()), true);
}
export function loopMark(color: string, w0: number, w1: number, scale = 1, dx = 0, dy = 0, dotR = 4.5) {
  const pts = sampleSegs(LOOP, 160).map((p): Pt => [p[0] * scale + dx, p[1] * scale + dy]);
  return `<path d="${taperD(pts, w0 * scale, w1 * scale)}" fill="${color}"/><circle cx="${f2(LOOP_DOT[0] * scale + dx)}" cy="${f2(LOOP_DOT[1] * scale + dy)}" r="${f2(dotR * scale)}" fill="${color}"/>`;
}

// ---------- the pen ----------
// Single-stroke letters and figures, in a box 100 units tall (baseline 0, top −100), each a list of the
// strokes the pen makes without lifting. A point with a third value of 1 is a sharp turn.
type GP = [number, number] | [number, number, 1];
interface Glyph {
  w: number;
  s: GP[][];
  dot?: Pt;
}
export const PEN_G: Record<string, Glyph> = {
  0: {
    w: 56,
    s: [
      [
        [40, -97],
        [22, -96],
        [9, -74],
        [6, -42],
        [13, -10],
        [28, 1],
        [44, -8],
        [52, -38],
        [50, -74],
        [40, -97],
        [28, -94],
      ],
    ],
  },
  1: {
    w: 36,
    s: [
      [
        [6, -76],
        [20, -88],
        [31, -101, 1],
        [26, -54],
        [22, 0],
      ],
    ],
  },
  2: {
    w: 58,
    s: [
      [
        [7, -78],
        [16, -95],
        [34, -100],
        [48, -90],
        [49, -70],
        [36, -48],
        [16, -24],
        [3, 0, 1],
        [24, -3],
        [42, -1],
        [57, -3],
      ],
    ],
  },
  3: {
    w: 56,
    s: [
      [
        [8, -90],
        [24, -101],
        [42, -97],
        [48, -81],
        [40, -63],
        [22, -54, 1],
        [42, -50],
        [52, -34],
        [48, -12],
        [30, 0],
        [12, -2],
        [3, -13],
      ],
    ],
  },
  4: {
    w: 60,
    s: [
      [
        [40, -100],
        [24, -72],
        [8, -44],
        [3, -32, 1],
        [24, -33],
        [44, -34],
        [60, -36],
      ],
      [
        [44, -64],
        [41, -30],
        [38, 0],
      ],
    ],
  },
  5: {
    w: 56,
    s: [
      [
        [14, -99],
        [11, -76],
        [8, -54, 1],
        [26, -60],
        [44, -54],
        [53, -36],
        [49, -13],
        [32, 0],
        [14, -1],
        [3, -12],
      ],
      [
        [15, -99],
        [34, -100],
        [55, -102],
      ],
    ],
  },
  6: {
    w: 54,
    s: [
      [
        [46, -98],
        [30, -93],
        [14, -72],
        [6, -44],
        [8, -14],
        [22, 1],
        [40, -4],
        [50, -24],
        [46, -44],
        [30, -53],
        [14, -46],
        [8, -34],
      ],
    ],
  },
  7: {
    w: 56,
    s: [
      [
        [5, -99],
        [24, -100],
        [44, -101],
        [57, -102, 1],
        [44, -76],
        [30, -46],
        [18, 0],
      ],
    ],
  },
  8: {
    w: 56,
    s: [
      [
        [44, -82],
        [42, -97],
        [26, -101],
        [12, -92],
        [12, -74],
        [26, -60],
        [42, -46],
        [50, -26],
        [44, -6],
        [28, 1],
        [12, -6],
        [6, -24],
        [14, -44],
        [30, -56],
        [43, -70],
        [44, -82],
        [40, -92],
      ],
    ],
  },
  9: {
    w: 56,
    s: [
      [
        [49, -82],
        [42, -97],
        [24, -100],
        [10, -88],
        [9, -68],
        [20, -56],
        [38, -58],
        [49, -74],
        [49, -86, 1],
        [46, -54],
        [40, -24],
        [33, 0],
      ],
    ],
  },
  ',': {
    w: 16,
    s: [
      [
        [9, -7],
        [8, 4],
        [3, 15],
      ],
    ],
  },
  '.': {
    w: 16,
    s: [
      [
        [6, -3],
        [7.5, -1.5],
        [7, 0],
      ],
    ],
  },
  R: {
    w: 56,
    s: [
      [
        [8, 0],
        [8, -50],
        [9, -100, 1],
        [32, -101],
        [47, -91],
        [47, -72],
        [34, -58],
        [10, -54, 1],
        [26, -40],
        [40, -20],
        [53, 0],
      ],
    ],
  },
  M: {
    w: 72,
    s: [
      [
        [5, 0],
        [7, -50],
        [10, -100, 1],
        [24, -64],
        [36, -28, 1],
        [48, -64],
        [62, -100, 1],
        [64, -50],
        [66, 0],
      ],
    ],
  },
  L: {
    w: 58,
    s: [
      [
        [13, -100],
        [11, -50],
        [9, 0, 1],
        [30, -1],
        [56, -2],
      ],
    ],
  },
  i: {
    w: 22,
    s: [
      [
        [12, -58],
        [11, -28],
        [10, 0],
      ],
      [
        [13, -84],
        [14, -82.5],
        [13.5, -81],
      ],
    ],
  },
  n: {
    w: 56,
    s: [
      [
        [9, -58],
        [9, -28],
        [8, 0, 1],
        [9, -30],
        [20, -52],
        [34, -58],
        [45, -50],
        [47, -28],
        [46, 0],
      ],
    ],
  },
  e: {
    w: 50,
    s: [
      [
        [8, -28],
        [26, -30],
        [44, -36],
        [42, -52],
        [28, -59],
        [12, -50],
        [6, -30],
        [12, -8],
        [28, 0],
        [46, -6],
      ],
    ],
  },
  s: {
    w: 46,
    s: [
      [
        [40, -52],
        [26, -59],
        [11, -54],
        [11, -40],
        [24, -31],
        [38, -22],
        [40, -8],
        [26, 0],
        [10, -2],
        [3, -10],
      ],
    ],
  },
};
export const PEN_SLANT = 0.2,
  PEN_NIB = -0.56;

// centripetal Catmull–Rom through the points, broken at sharp turns
function penSpline(pts: GP[]): Pt[] {
  const out: Pt[] = [];
  let run: GP[] = [pts[0]];
  const flush = () => {
    const P = run;
    if (P.length === 1) {
      out.push([P[0][0], P[0][1]]);
      return;
    }
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)],
        p1 = P[i],
        p2 = P[i + 1],
        p3 = P[Math.min(P.length - 1, i + 2)];
      const n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 1.2));
      for (let k = i ? 1 : 0; k <= n; k++) {
        const t = k / n,
          t2 = t * t,
          t3 = t2 * t;
        const at = (d: 0 | 1) =>
          0.5 *
          (2 * p1[d] +
            (-p0[d] + p2[d]) * t +
            (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 +
            (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3);
        out.push([at(0), at(1)]);
      }
    }
  };
  for (let i = 1; i < pts.length; i++) {
    run.push(pts[i]);
    if (pts[i][2] === 1 && i < pts.length - 1) {
      flush();
      out.pop();
      run = [pts[i]];
    }
  }
  flush();
  return out;
}
interface Stroke {
  pts: Pt[];
  size?: number;
  dot?: boolean;
  fine?: boolean;
  w?: number[];
  d?: number[];
  len?: number;
  pool?: number;
  t0?: number;
}
// lay out text as pen strokes in px, slanted like a hand
function penText(text: string, x0: number, base: number, size: number, track = 0.08) {
  const k = size / 100;
  const strokes: Stroke[] = [];
  let x = x0;
  for (const ch of text) {
    if (ch === ' ') {
      x += size * 0.3;
      continue;
    }
    const g = PEN_G[ch];
    if (!g) continue;
    const map = (p: readonly number[]): Pt => [x + (p[0] - p[1] * PEN_SLANT) * k, base + p[1] * k];
    g.s.forEach((st) => strokes.push({ pts: penSpline(st).map(map), size }));
    if (g.dot) strokes.push({ pts: [map(g.dot), map([g.dot[0] + 0.5, g.dot[1]])], dot: true, size });
    x += (g.w + 100 * track) * k;
  }
  return { strokes, x };
}
type Prepped = Stroke & { w: number[]; d: number[]; len: number; pool: number; t0: number };
// widths along each stroke: an italic nib, thick across its edge and fine along it, with ink pooling where the pen lands and lifts
function penPrep(strokes: Stroke[], size0: number): number {
  let total = 0;
  strokes.forEach((s) => {
    const size = s.size || size0,
      wMax = Math.max(0.9, size * 0.104),
      wMin = Math.max(0.55, size * 0.022);
    if (!s.fine) {
      const R: Pt[] = [s.pts[0]];
      for (let i = 1; i < s.pts.length; i++) {
        const a = s.pts[i - 1],
          b = s.pts[i];
        const m = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.6);
        for (let k = 1; k <= m; k++) R.push([a[0] + ((b[0] - a[0]) * k) / m, a[1] + ((b[1] - a[1]) * k) / m]);
      }
      s.pts = R;
      s.fine = true;
    }
    const P = s.pts,
      n = P.length;
    const w: number[] = [];
    const d = [0];
    for (let i = 1; i < n; i++) d.push(d[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const len = d[n - 1] || 0.5;
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)],
        b = P[Math.min(n - 1, i + 1)];
      const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
      let wi = wMin + (wMax - wMin) * Math.abs(Math.sin(th - PEN_NIB));
      const u = d[i] / len;
      wi *= 0.82 + 0.18 * Math.min(1, u / 0.12) - 0.16 * Math.max(0, (u - 0.86) / 0.14);
      w.push(s.dot ? size * 0.07 : wi);
    }
    Object.assign(s, { w, d, len, pool: s.dot ? 0 : Math.max(wMin * 1.6, w[n - 1]) * 0.56, t0: total });
    total += len + size * 0.9;
  });
  return total;
}
// mix two hex colours
function penMix(a: string, b: string, k: number) {
  const A = hexRgb(a),
    B = hexRgb(b);
  return `rgb(${[0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * k)).join(',')})`;
}
// draw the strokes written so far: `upto` is how far the pen has travelled; ink dries from fresh to dry over `dryLen` of travel
function penInk(
  g: CanvasRenderingContext2D,
  strokes: Stroke[],
  upto: number,
  fresh: string,
  dry: string,
  dryLen: number,
  sheen: string | null,
) {
  for (const st of strokes) {
    const s = st as Prepped;
    if (s.t0 > upto) break;
    const P = s.pts;
    for (let i = 0; i < P.length; i++) {
      const at = s.t0 + s.d[i];
      if (at > upto) break;
      const age = Math.min(1, (upto - at) / dryLen);
      g.fillStyle = penMix(fresh, dry, age * age * (3 - 2 * age));
      g.beginPath();
      g.arc(P[i][0], P[i][1], s.w[i] / 2, 0, TAU);
      g.fill();
    }
    // a pool where the pen lifted, with the sheen dried iron-gall ink takes on
    const end = s.t0 + s.len;
    if (end <= upto && s.pool) {
      const q = P[P.length - 1],
        age = Math.min(1, (upto - end) / dryLen);
      g.fillStyle = penMix(fresh, dry, age);
      g.beginPath();
      g.arc(q[0], q[1], s.pool, 0, TAU);
      g.fill();
      if (sheen && age > 0.6) {
        g.fillStyle = sheen;
        g.globalAlpha = (0.38 * (age - 0.6)) / 0.4;
        g.beginPath();
        g.arc(q[0] - s.pool * 0.25, q[1] - s.pool * 0.25, s.pool * 0.45, 0, TAU);
        g.fill();
        g.globalAlpha = 1;
      }
      if (age < 1) {
        g.fillStyle = `rgba(255,255,255,${0.55 * (1 - age)})`;
        g.beginPath();
        g.arc(q[0] - s.pool * 0.3, q[1] - s.pool * 0.32, s.pool * 0.28, 0, TAU);
        g.fill();
      }
    }
  }
}

// ---------- written figures: the large figure and the wordmark ----------
interface PenState {
  W: number;
  H: number;
  strokes: Stroke[];
  total: number;
  rule: number | null;
  size: number;
  dpr: number;
  start: number | null;
  done: boolean;
  key: string;
}
type PenCanvas = HTMLCanvasElement & { _pen?: PenState; _m?: boolean };
const PEN: { set: Set<PenCanvas>; raf: number } = { set: new Set(), raf: 0 };
const PEN_INK: Record<Mode, { fresh: string; dry: string; sheen: string | null }> = {
  light: { fresh: '#2b4fd6', dry: '#1b2134', sheen: '#8a3a46' },
  dark: { fresh: '#9db3ff', dry: '#ebe6da', sheen: '#c99a6b' },
};
function penLayout(cv: PenCanvas) {
  const kind = cv.dataset.kind,
    W = cv.clientWidth || 350;
  let H: number,
    strokes: Stroke[],
    rule: number | null = null;
  if (kind === 'fig') {
    const S = 44,
      base = 58;
    H = 76;
    const p = rmParts(+(cv.dataset.sen ?? 0));
    const cur = penText('RM', 6, base, S * 0.34, 0.1);
    let x = cur.x + S * 0.16;
    strokes = cur.strokes;
    const whole = penText(p.whole, x, base, S, 0.06);
    strokes = strokes.concat(whole.strokes);
    x = whole.x + S * 0.08;
    rule = x + S * 0.02; // the sen column's rule
    const cents = penText(p.cents, x + S * 0.16, base - S * 0.46, S * 0.56, 0.06);
    strokes = strokes.concat(cents.strokes);
    const ux = x + S * 0.14,
      uw = cents.x - x - S * 0.12;
    strokes.push({
      pts: penSpline([
        [ux, base - S * 0.36],
        [ux + uw * 0.5, base - S * 0.375],
        [ux + uw, base - S * 0.39],
      ]),
    });
  } else {
    const S = 15,
      base = 21;
    H = 28;
    strokes = penText('sen', 2, base, S, 0.02).strokes;
  }
  const size = kind === 'fig' ? 44 : 15;
  const total = penPrep(strokes, size);
  return { W, H, strokes, total, rule, size };
}
function penPrepare(cv: PenCanvas) {
  const L = penLayout(cv);
  const d = dpr();
  cv.width = Math.round(L.W * d);
  cv.height = Math.round(L.H * d);
  cv.style.height = L.H + 'px';
  cv._pen = { ...L, dpr: d, start: null, done: false, key: '' };
}
function penDraw(cv: PenCanvas, now: number) {
  const F = cv._pen;
  if (!F) return;
  const g = cv.getContext('2d')!;
  const mode = cv.dataset.mode as Mode;
  const over = cv.dataset.over === '1';
  const cs = getComputedStyle(cv);
  const ink = { ...PEN_INK[mode] };
  if (over) {
    ink.fresh = ink.dry = cs.getPropertyValue('--money-warning').trim();
    ink.sheen = null;
  }
  const speed = F.size * 9; // px of stroke a second: a quick, sure hand
  if (F.start === null) F.start = now;
  const upto = reduced() || cv.dataset.write === '0' ? 1e9 : ((now - F.start) / 1000) * speed;
  const key = `${mode}|${over}`;
  if (F.done && F.key === key) return;
  F.key = key;
  g.setTransform(F.dpr, 0, 0, F.dpr, 0, 0);
  g.clearRect(0, 0, F.W, F.H);
  if (F.rule !== null) {
    g.strokeStyle = cs.getPropertyValue('--ledger-rule').trim();
    g.lineWidth = 0.8;
    [0, 2.6].forEach((o) => {
      g.beginPath();
      g.moveTo(F.rule! + o, 6);
      g.lineTo(F.rule! + o, F.H - 10);
      g.stroke();
    });
  }
  const dryLen = F.size * 14;
  penInk(g, F.strokes, upto, ink.fresh, ink.dry, dryLen, ink.sheen);
  F.done = upto > F.total + dryLen;
}
function penMount(root: HTMLElement) {
  const mine: PenCanvas[] = [];
  root.querySelectorAll<PenCanvas>('canvas.pen').forEach((cv) => {
    if (cv._m) return;
    cv._m = true;
    PEN.set.add(cv);
    mine.push(cv);
    void fontsReady().then(() => {
      if (cv.isConnected) penPrepare(cv);
    });
  });
  if (!PEN.raf && PEN.set.size) {
    let last = 0;
    const step = (now: number) => {
      if (now - last > 30) {
        last = now;
        for (const cv of PEN.set) {
          if (!cv.isConnected) {
            PEN.set.delete(cv);
            continue;
          }
          penDraw(cv, now);
        }
      }
      PEN.raf = PEN.set.size ? requestAnimationFrame(step) : 0;
    };
    PEN.raf = requestAnimationFrame(step);
  }
  return () => {
    for (const cv of mine) {
      PEN.set.delete(cv);
      cv._m = false;
    }
  };
}

// ---------- the nib, for Sen ----------
// a steel nib seen from above, tip at (x, y), its body running down to the right; lift raises it off the paper
function penNib(c: CanvasRenderingContext2D, x: number, y: number, L: number, lift: number, dark: boolean) {
  if (lift > 0) {
    c.fillStyle = `rgba(20,24,40,${0.16 * (1 - Math.min(1, lift / (L * 0.5)))})`;
    c.save();
    c.translate(x + lift * 0.9, y + lift * 1.3);
    c.rotate(0.62);
    c.beginPath();
    c.ellipse(L * 0.5, 0, L * 0.5, L * 0.17, 0, 0, TAU);
    c.fill();
    c.restore();
  }
  c.save();
  c.translate(x - lift * 0.35, y - lift * 0.55);
  c.rotate(0.62);
  const g = c.createLinearGradient(0, -L * 0.2, 0, L * 0.2);
  g.addColorStop(0, dark ? '#d9dce4' : '#eef0f4');
  g.addColorStop(0.45, dark ? '#9aa0ae' : '#b8bdc8');
  g.addColorStop(1, dark ? '#5d6371' : '#7b8190');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(L * 0.3, -L * 0.04, L * 0.55, -L * 0.2, L * 0.82, -L * 0.2);
  c.quadraticCurveTo(L * 1.02, -L * 0.2, L * 1.02, 0);
  c.quadraticCurveTo(L * 1.02, L * 0.2, L * 0.82, L * 0.2);
  c.bezierCurveTo(L * 0.55, L * 0.2, L * 0.3, L * 0.04, 0, 0);
  c.fill();
  c.strokeStyle = 'rgba(30,34,48,.55)';
  c.lineWidth = Math.max(0.5, L * 0.025);
  c.beginPath();
  c.moveTo(L * 0.04, 0);
  c.lineTo(L * 0.5, 0);
  c.stroke();
  c.fillStyle = 'rgba(30,34,48,.6)';
  c.beginPath();
  c.arc(L * 0.53, 0, L * 0.045, 0, TAU);
  c.fill();
  c.restore();
}
// Sen's loop in the avatar's units, as pen strokes
const LOOP_A = sampleSegs(LOOP, 70).map((p): Pt => [(p[0] - 50) / 34, (p[1] - 54) / 34]);
const LOOP_A_DOT: Pt = [(LOOP_DOT[0] - 50) / 34, (LOOP_DOT[1] - 54) / 34];
function avStrokes(list: Pt[][], s: number): Stroke[] {
  const k = s * 0.36,
    c = s / 2;
  return list.map((pts) => ({ pts: pts.map((p): Pt => [c + p[0] * k, c + p[1] * k]) }));
}

// ---------- the tab bar: icons written with the same italic nib ----------
// one stroke as a filled outline: a little hand-wobble, widths from the nib's angle, tapered ends, round where the pen lands and lifts
function lnOutline(P: Pt[], wMin: number, wMax: number, seed: number) {
  const R = resample(P, 0.3);
  const n = R.length;
  if (n < 2) return '';
  const pts = R.map(([x, y, a], i): Pt => {
    const s = (i / (n - 1)) * R.len;
    const o = 0.09 * Math.sin(s * 0.55 + seed) + 0.035 * Math.sin(s * 1.4 + seed * 1.7);
    return [x - Math.sin(a) * o, y + Math.cos(a) * o];
  });
  const left: Pt[] = [],
    right: Pt[] = [],
    th: number[] = [],
    w: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(n - 1, i + 1)];
    th[i] = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const u = i / (n - 1);
    w[i] =
      (wMin + (wMax - wMin) * Math.abs(Math.sin(th[i] - PEN_NIB))) *
      (0.8 + 0.2 * Math.min(1, u / 0.15) - 0.18 * Math.max(0, (u - 0.85) / 0.15));
    const nx = (-Math.sin(th[i]) * w[i]) / 2,
      ny = (Math.cos(th[i]) * w[i]) / 2;
    left.push([pts[i][0] + nx, pts[i][1] + ny]);
    right.push([pts[i][0] - nx, pts[i][1] - ny]);
  }
  const cap = (c: Pt, t0: number, r: number) => {
    const out: Pt[] = [];
    for (let k = 1; k < 6; k++) {
      const t = t0 - (Math.PI * k) / 6;
      out.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]);
    }
    return out;
  };
  const end = cap(pts[n - 1], th[n - 1] + Math.PI / 2, w[n - 1] / 2),
    start = cap(pts[0], th[0] - Math.PI / 2, w[0] / 2);
  return (
    polyD(left.concat(end, right.reverse(), start), true) +
    `M${f2(pts[n - 1][0] + w[n - 1] * 0.6)} ${f2(pts[n - 1][1])}a${f2(w[n - 1] * 0.6)} ${f2(w[n - 1] * 0.6)} 0 1 0 0 .01z`
  );
}
// a tab's icon as ink: one outline per pen stroke, lifted at sharp turns
function lnInk(k: IconTab | 'scan', wMin = 0.6, wMax = 2.3) {
  const S = TAB_SK[k];
  if (S.dots)
    return S.dots.map(([x, y], i) => `M${f2(x + 1.75)} ${f2(y + 0.1 * Math.sin(i))}a1.8 1.65 0 1 0 0 .01z`).join('');
  return tabPolys(k, 50)
    .map((P, i) => lnOutline(P, wMin, wMax, i * 1.9 + k.length))
    .join('');
}
const LN_TAB = {
  light: { idle: '#5a5e6a', on: '#1b2134', red: '#b23a2e', paper: '#f5f5f1' },
  dark: { idle: '#a19d94', on: '#ebe6da', red: '#e58a78', paper: '#141519' },
};
function lnTabIcon(k: IconTab, on: boolean, mode: Mode, u: string) {
  const c = LN_TAB[mode];
  const ink = `<path d="${lnInk(k)}" fill="currentColor" fill-rule="nonzero"/>`;
  if (!on) return `<svg viewBox="0 0 24 24" width="24" height="24" color="${c.idle}" aria-hidden="true">${ink}</svg>`;
  // active: the same ink, revealed stroke by stroke behind the pen when chosen
  const S = TAB_SK[k];
  const strokes = S.dots ? S.dots.map(([x, y]) => `M${x - 2} ${y}h4`) : S.d;
  return `<svg viewBox="0 0 24 24" width="24" height="24" color="${c.on}" aria-hidden="true"><defs><mask id="${u}w" maskUnits="userSpaceOnUse" x="-3" y="-3" width="30" height="30">${strokes.map((d, i) => `<path class="pen-w" style="--n:${i}" d="${d}" fill="none" stroke="#fff" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>`).join('')}</mask></defs><g mask="url(#${u}w)">${ink}</g></svg>`;
}
// the scan button: a dab of ink, the scan mark left as bare paper
function lnScan(mode: Mode, u: string) {
  const c = LN_TAB[mode];
  const pts: Pt[] = [];
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * TAU;
    const r = 23.3 + 0.45 * Math.sin(t * 3 + 1.3) + 0.28 * Math.sin(t * 7 + 0.4) + 0.16 * Math.sin(t * 13);
    pts.push([26 + r * Math.cos(t), 26 + r * Math.sin(t)]);
  }
  return svgTag(
    '0 0 52 52',
    52,
    52,
    `<defs><radialGradient id="${u}s" cx="34%" cy="28%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity="${mode === 'dark' ? 0.18 : 0.12}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><path d="${polyD(pts, true)}" fill="${c.on}"/><path d="${polyD(pts, true)}" fill="url(#${u}s)"/><g transform="translate(14 14)" color="${c.paper}"><path d="${lnInk('scan', 0.7, 2.1)}" fill="currentColor"/></g>`,
    'sb',
  );
}
// the review count, circled in red ink the way a bookkeeper marks what needs attention; a wider count gets a wider ring
function lnBadge(text: string, mode: Mode) {
  const c = LN_TAB[mode];
  const extra = Math.max(0, text.length - 1) * 3.2;
  const W = 21.2 + 2 * extra;
  const cx = W / 2;
  const P: Pt[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = -1.95 + (i / 80) * TAU * 1.07;
    P.push([cx + (8.3 + extra + 0.35 * Math.sin(t * 2)) * Math.cos(t), 10.4 + 7.5 * Math.sin(t) + i * 0.012]);
  }
  return `${svgTag(`0 0 ${f2(W)} 21.2`, f2(W), 21.2, `<ellipse cx="${f2(cx)}" cy="10.4" rx="${f2(7.6 + extra)}" ry="6.8" fill="${c.paper}" opacity=".92"/><path d="${lnOutline(P, 0.45, 1.5, 3)}" fill="${c.red}"/>`)}<b style="color:${c.on}">${text}</b>`;
}
// Sen's underline under the active tab, written again when you choose another
function lnUnderline(mode: Mode) {
  const P: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = -11.5 + 23 * (i / 40);
    P.push([x, 0.5 * Math.sin(x * 0.22) - x * 0.03]);
  }
  return `<svg viewBox="-13 -3 26 6" width="26" height="6" color="${LN_TAB[mode].on}" aria-hidden="true"><path d="${lnOutline(P, 0.35, 1.5, 5)}" fill="currentColor"/></svg>`;
}
function lnSwitch(bar: HTMLElement) {
  const ind = bar.querySelector('.tab-ind');
  if (!ind) return;
  ind.classList.remove('redraw');
  void (ind as HTMLElement).offsetWidth;
  ind.classList.add('redraw');
}

let PEN_N = 0;
export const DIR: Look = {
  id: 'line',
  name: 'Line',
  radius: '1rem',
  // the pen: ink-coloured, a nib's round ends
  icons: { weight: 1.5, cap: 'round', join: 'round' },

  avatar: {
    draw(c, s, t, st, mode) {
      const cx = s / 2,
        cy = s / 2;
      const dark = mode === 'dark';
      const ink = PEN_INK[dark ? 'dark' : 'light'];
      const big = s >= 36;
      c.fillStyle = dark ? '#1c1d22' : '#fbfbf8';
      c.beginPath();
      c.arc(cx, cy, s / 2, 0, TAU);
      c.fill();
      c.save();
      c.beginPath();
      c.arc(cx, cy, s / 2 - 0.5, 0, TAU);
      c.clip();
      if (big) {
        c.strokeStyle = dark ? 'rgba(160,180,230,.1)' : 'rgba(120,150,200,.22)';
        c.lineWidth = Math.max(0.6, s / 200);
        c.beginPath();
        c.moveTo(0, cy + s * 0.12);
        c.lineTo(s, cy + s * 0.12);
        c.stroke();
      }
      const size = s * 0.42;
      const loop = avStrokes([LOOP_A], s);
      penPrep(loop, size);
      const len = (loop[0] as Prepped).len;
      const dotAt = (): Pt => [cx + LOOP_A_DOT[0] * s * 0.36, cy + LOOP_A_DOT[1] * s * 0.36];
      const dot = (r: number, col: string) => {
        const q = dotAt();
        c.fillStyle = col;
        c.beginPath();
        c.arc(q[0], q[1], r, 0, TAU);
        c.fill();
      };
      const nibL = s * 0.34;
      let nib: Pt | null = null;
      if (st === 'resting' || st === 'paused') {
        // dry ink, still; now and then the light catches its sheen
        const col = st === 'paused' ? (dark ? '#55565c' : '#c4c3bc') : ink.dry;
        penInk(c, loop, 1e9, col, col, 1, null);
        dot(Math.max(1.2, s * 0.042), col);
        if (st === 'resting' && big) {
          const L0 = loop[0] as Prepped;
          const P = L0.pts,
            ph = (t % 9) / 1.6;
          if (ph < 1) {
            const i0 = Math.floor(P.length * ph);
            c.fillStyle = dark ? 'rgba(255,250,240,.35)' : 'rgba(150,90,110,.45)';
            for (let i = Math.max(0, i0 - 18); i < Math.min(P.length, i0); i++) {
              c.beginPath();
              c.arc(P[i][0], P[i][1], L0.w[i] * 0.22, 0, TAU);
              c.fill();
            }
          }
        }
      } else if (st === 'note') {
        // a new note: the loop signed afresh in wet ink, over the last signature
        const cyc = t % 4.5;
        const w = Math.min(1, cyc / 1.3);
        c.globalAlpha = 1 - w;
        penInk(c, loop, 1e9, ink.dry, ink.dry, 1, null);
        c.globalAlpha = 1;
        penInk(c, loop, len * w + (cyc - 1.3 > 0 ? (cyc - 1.3) * len * 0.5 : 0), ink.fresh, ink.dry, len * 1.6, null);
        if (w < 1 && big) {
          const i = Math.min(loop[0].pts.length - 1, Math.floor(loop[0].pts.length * w));
          nib = loop[0].pts[i];
        }
        if (w >= 1) {
          dot(Math.max(1.2, s * 0.048), ink.fresh);
          if (big) {
            c.fillStyle = 'rgba(255,255,255,.7)';
            const q = dotAt();
            c.beginPath();
            c.arc(q[0] - s * 0.014, q[1] - s * 0.015, s * 0.012, 0, TAU);
            c.fill();
          }
        }
      } else if (st === 'listening') {
        penInk(c, loop, 1e9, ink.dry, ink.dry, 1, null);
        dot(Math.max(1.2, s * 0.042), ink.dry);
        if (big) {
          const q = dotAt();
          penNib(c, q[0] + s * 0.02, q[1] - s * 0.04, nibL, s * (0.07 + 0.015 * Math.sin(t * 2.4)), dark);
        }
      } else if (st === 'thinking' || st === 'helpers') {
        // doodles: a figure of eight that dries and fades as the pen moves on
        const f = (v: number): Pt => [0.78 * Math.sin(2 * v + 0.5), 0.5 * Math.sin(3 * v)];
        const T = t * 1.3;
        const draw = (dx: number, dy: number, alpha: number, col: string): Pt => {
          const pts: Pt[] = [];
          for (let i = 0; i <= 50; i++) pts.push(f(T - 2.4 + (2.4 * i) / 50));
          const sk = avStrokes([pts.map((p): Pt => [p[0] + dx, p[1] + dy])], s);
          penPrep(sk, size * 0.9);
          const s0 = sk[0] as Prepped;
          c.globalAlpha = alpha;
          penInk(c, sk, s0.len, ink.fresh, col, s0.len * 0.7, null);
          c.globalAlpha = 1;
          return s0.pts[s0.pts.length - 1];
        };
        if (st === 'helpers') {
          draw(0.12, 0.13, 0.32, dark ? '#7f86a8' : '#9aa2c4');
          draw(-0.1, -0.12, 0.22, dark ? '#7f86a8' : '#9aa2c4');
        }
        nib = draw(0, 0, 1, ink.dry);
      } else if (st === 'speaking') {
        // a line of writing, left to right
        const ph = (t * 0.55) % 1;
        const pts: Pt[] = [];
        for (let i = 0; i <= 60; i++) {
          const x = -1 + 2 * (i / 60) * ph;
          pts.push([x, 0.06 + 0.15 * Math.sin(x * 9) * (0.6 + 0.4 * Math.sin(x * 3.1))]);
        }
        const sk = avStrokes([pts], s);
        penPrep(sk, size * 0.85);
        const s0 = sk[0] as Prepped;
        penInk(c, sk, s0.len, ink.fresh, ink.dry, s0.len * 0.6, null);
        nib = s0.pts[s0.pts.length - 1];
      } else if (st === 'done') {
        const k = Math.min(1, (t % 3.5) / 0.6);
        const sk = avStrokes(
          [
            penSpline([
              [-0.6, 0.02],
              [-0.42, 0.18],
              [-0.2, 0.42, 1],
              [0.2, -0.04],
              [0.66, -0.46],
            ]),
          ],
          s,
        );
        penPrep(sk, size * 1.1);
        const s0 = sk[0] as Prepped;
        if (k < 1) {
          c.globalAlpha = 0.18;
          penInk(c, sk, 1e9, ink.dry, ink.dry, 1, null);
          c.globalAlpha = 1;
        }
        penInk(c, sk, s0.len * k, ink.fresh, ink.dry, s0.len * 0.5, ink.sheen);
        if (k < 1 && big) {
          const i = Math.min(s0.pts.length - 1, Math.floor(s0.pts.length * k));
          nib = s0.pts[i];
        }
      }
      if (nib && big) penNib(c, nib[0], nib[1], nibL, 0, dark);
      c.restore();
      c.strokeStyle = dark ? 'rgba(235,230,218,.12)' : 'rgba(27,33,52,.1)';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(cx, cy, s / 2 - 0.5, 0, TAU);
      c.stroke();
    },
  },

  icon: {
    background: (p) =>
      `<defs><radialGradient id="${p}p" cx="40%" cy="30%" r="90%"><stop offset="0" stop-color="#fbfbf8"/><stop offset="1" stop-color="#ecebe4"/></radialGradient></defs><rect width="108" height="108" fill="url(#${p}p)"/><line x1="0" x2="108" y1="66.5" y2="66.5" stroke="#9fb3d8" stroke-width=".7" opacity=".55"/><line x1="0" x2="108" y1="44" y2="44" stroke="#9fb3d8" stroke-width=".7" opacity=".3"/>`,
    foreground: (p) =>
      `<defs><linearGradient id="${p}i" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b2134"/><stop offset=".7" stop-color="#1e2742"/><stop offset="1" stop-color="#26357a"/></linearGradient><radialGradient id="${p}s" cx="38%" cy="35%" r="60%"><stop offset="0" stop-color="#9a4a52" stop-opacity=".85"/><stop offset=".6" stop-color="#5a2a3a" stop-opacity=".35"/><stop offset="1" stop-color="#1b2134" stop-opacity="0"/></radialGradient></defs>${loopMark(`url(#${p}i)`, 1.1, 3.9)}<circle cx="${LOOP_DOT[0]}" cy="${LOOP_DOT[1]}" r="3" fill="url(#${p}s)"/>`,
    monochrome: () => loopMark('currentColor', 1.4, 3.8),
    small: () => loopMark('currentColor', 6.4, 8.6, 0.27, -1.6, -2, 8.4),
  },

  wordmark: (mode) =>
    `<span class="wm"><canvas class="pen pen-wm" data-kind="wm" data-mode="${mode}" data-write="0" aria-hidden="true"></canvas><svg viewBox="0 30 92 42" aria-hidden="true">${loopMark('var(--primary)', 1.6, 4.2)}</svg></span>`,
  tabs: { icon: lnTabIcon, scan: lnScan, badge: lnBadge, ind: lnUnderline, switch: lnSwitch },
  heroFigure(sen, mode, st) {
    return `<canvas class="pen" data-kind="fig" data-sen="${sen}" data-over="${st.over ? 1 : 0}" data-mode="${mode}" aria-hidden="true"></canvas>`;
  },
  // the cycle as a ruled line in ink up to today, pencil dots to payday, a tick each week and a double rule at payday
  strip(day, days) {
    const W = 340,
      y = 12,
      x = (d: number) => 3 + ((d - 1) / (days - 1)) * (W - 14);
    const tx = x(day);
    const pts: Pt[] = [];
    for (let d = 1; d <= day; d += 0.25) {
      const xx = x(d);
      pts.push([xx, y + 0.45 * Math.sin(xx / 23) + 0.25 * Math.sin(xx / 7.3)]);
    }
    if (pts.length < 2) pts.push([tx + 0.5, y]);
    let s = `<path d="${taperD(pts, 1.1, 2.4)}" fill="var(--primary)" class="drawn"/>`;
    for (let d = 8; d < day; d += 7)
      s += `<path d="M${f2(x(d) - 1)} ${y - 7}l${f2(1.6)} 4.6" stroke="var(--primary)" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>`;
    for (let d = day + 1; d < days; d++)
      s += `<circle cx="${f2(x(d))}" cy="${f2(y + 0.3 * Math.sin(d))}" r=".95" fill="var(--pencil)"/>`;
    s += `<path d="M${f2(W - 6)} ${y - 6}l.6 12M${f2(W - 2.6)} ${y - 6}l.6 12" stroke="var(--muted-foreground)" stroke-width="1.1" stroke-linecap="round"/>`;
    const id = `wet${++PEN_N}`;
    s += `<defs><radialGradient id="${id}" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".25" stop-color="var(--ink-fresh)"/><stop offset="1" stop-color="var(--ink-fresh)"/></radialGradient></defs><circle cx="${f2(tx)}" cy="${y}" r="4.4" fill="url(#${id})" class="wet"/>`;
    return `<svg viewBox="0 0 ${W} 22" width="100%" aria-hidden="true" style="overflow:visible">${s}</svg>`;
  },
  mount: penMount,
  reveal: null,
};
export default DIR;
