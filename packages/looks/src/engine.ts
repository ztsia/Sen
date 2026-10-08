// The looks' shared engine, ported from docs/ui/directions/src/engine.js: pure geometry and the
// tab outlines every look draws on (D80). Money comes from @sen/core, never from here.
import { moneyParts } from '@sen/core/money';
import type { IconTab, TabKey } from './types';

export const TAU = Math.PI * 2;
/** A coordinate for SVG text: two decimals at most, as the design pages wrote them. */
export const f2 = (n: number) => String(Math.round(n * 100) / 100);

/** Sen as the parts a look draws: `{ cur: 'RM', whole: '1,284', cents: '50' }`. */
export function rmParts(sen: number) {
  const p = moneyParts(Math.abs(sen));
  return { cur: p.currency, whole: p.whole, cents: p.cents };
}

// ---------- motion: the app says whether to settle every look's motion to its final frame ----------
let reducedFn: () => boolean = () => false;
export const setReducedMotion = (fn: () => boolean) => {
  reducedFn = fn;
};
export const reduced = () => reducedFn();

// ---------- the page's fonts: a look drawing type on a canvas waits for its face ----------
export function fontsReady(...faces: string[]): Promise<unknown> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  return Promise.all(faces.map((f) => document.fonts.load(f))).catch(() => undefined);
}

/** The device pixel ratio, capped, for canvases. */
export const dpr = (cap = 2.5) => Math.min(cap, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);

// ---------- geometry ----------
export type Pt = [number, number];
export function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}
/** n points spaced evenly by arc length along a chain of cubic segments */
export function sampleSegs(segs: [Pt, Pt, Pt, Pt][], n: number): Pt[] {
  const fine: Pt[] = [];
  segs.forEach((s) => {
    for (let i = 0; i <= 160; i++) fine.push(bez(s[0], s[1], s[2], s[3], i / 160));
  });
  const d = [0];
  for (let i = 1; i < fine.length; i++)
    d.push(d[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
  const L = d[d.length - 1];
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const tg = (L * k) / (n - 1);
    while (j < d.length - 2 && d[j + 1] < tg) j++;
    const f = (tg - d[j]) / (d[j + 1] - d[j] || 1);
    out.push([fine[j][0] + f * (fine[j + 1][0] - fine[j][0]), fine[j][1] + f * (fine[j + 1][1] - fine[j][1])]);
  }
  return out;
}
export const polyD = (pts: readonly (readonly number[])[], close?: boolean) =>
  pts.map((p, i) => (i ? 'L' : 'M') + f2(p[0]) + ' ' + f2(p[1])).join('') + (close ? 'Z' : '');

// ---------- the adaptive icon's masks, on the 108 dp canvas ----------
export const MASKS = {
  circle: '<circle cx="54" cy="54" r="36"/>',
  squircle: '<path d="M54 18C80.5 18 90 27.5 90 54S80.5 90 54 90 18 80.5 18 54 27.5 18 54 18Z"/>',
  rounded: '<rect x="18" y="18" width="72" height="72" rx="17"/>',
  teardrop: '<path d="M54 18H90V54A36 36 0 1 1 54 18Z"/>',
};

// ---------- the tab bar: the same five tabs and the same outlines in every look ----------
export const TABS: [TabKey, string][] = [
  ['home', 'Home'],
  ['review', 'Review'],
  ['scan', 'Scan'],
  ['insights', 'Insights'],
  ['more', 'More'],
];
export interface TabOutline {
  d: string[];
  area?: string;
  head: Pt;
  dots?: Pt[];
  r?: number;
}
/** Outlines on a 24-unit square: strokes as absolute path data, the face some looks fill when active, and where a trail ends. */
export const TAB_SK: Record<TabKey, TabOutline> = {
  home: {
    d: [
      'M3.8 11.4L12 4.4L20.2 11.4',
      'M6.2 9.4V19.6H17.8V9.4',
      'M10.2 19.6V15.2Q10.2 13.8 11.6 13.8H12.4Q13.8 13.8 13.8 15.2V19.6',
    ],
    area: 'M6.2 9.4L12 4.4L17.8 9.4V19.6H13.8V15.2Q13.8 13.8 12.4 13.8H11.6Q10.2 13.8 10.2 15.2V19.6H6.2Z',
    head: [12, 4.4],
  },
  review: {
    d: [
      'M3.6 13L6.4 6Q6.8 5 7.9 5H16.1Q17.2 5 17.6 6L20.4 13V18Q20.4 19.6 18.8 19.6H5.2Q3.6 19.6 3.6 18Z',
      'M3.6 13H8.4L9.8 15.6H14.2L15.6 13H20.4',
    ],
    area: 'M3.6 13H8.4L9.8 15.6H14.2L15.6 13H20.4V18Q20.4 19.6 18.8 19.6H5.2Q3.6 19.6 3.6 18Z',
    head: [12, 15.6],
  },
  scan: {
    d: [
      'M4 8.6V6.4Q4 4 6.4 4H8.6',
      'M15.4 4H17.6Q20 4 20 6.4V8.6',
      'M20 15.4V17.6Q20 20 17.6 20H15.4',
      'M8.6 20H6.4Q4 20 4 17.6V15.4',
      'M7.6 12H16.4',
    ],
    head: [16.4, 12],
  },
  insights: {
    d: ['M4 3.8V18.4Q4 20 5.6 20H20.2', 'M7.6 15.4L11 11.4L14 13.8L19 7.8'],
    area: 'M7.6 15.4L11 11.4L14 13.8L19 7.8V17.4H7.6Z',
    head: [19, 7.8],
  },
  more: {
    d: [],
    dots: [
      [5.4, 12],
      [12, 12],
      [18.6, 12],
    ],
    r: 1.7,
    head: [12, 12],
  },
};

/** A fine polyline; `v` marks a point that ends a path command, `closed` a closed subpath. */
export type FinePt = [number, number] & { v?: 1 };
export type FinePoly = FinePt[] & { closed?: boolean };

/** Absolute path data (M L H V Q C Z) as fine polylines; the point that ends each command is marked as a vertex. */
export function pathFine(d: string): FinePoly[] {
  const tok = d.match(/[MLHVQCZ]|-?\d*\.?\d+/gi) || [];
  const polys: FinePoly[] = [];
  let P: FinePoly = [];
  let i = 0,
    cmd = '',
    x = 0,
    y = 0,
    sx = 0,
    sy = 0;
  const n = () => +tok[i++]; // path data is geometry, never money
  const mark = () => {
    P[P.length - 1].v = 1;
  };
  const line = (x1: number, y1: number) => {
    const m = Math.max(1, Math.ceil(Math.hypot(x1 - x, y1 - y) / 0.2));
    for (let k = 1; k <= m; k++) P.push([x + ((x1 - x) * k) / m, y + ((y1 - y) * k) / m] as FinePt);
    x = x1;
    y = y1;
    mark();
  };
  while (i < tok.length) {
    if (/[A-Z]/i.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === 'M') {
      x = sx = n();
      y = sy = n();
      P = [[x, y] as FinePt];
      mark();
      polys.push(P);
      cmd = 'L';
    } else if (cmd === 'L') line(n(), n());
    else if (cmd === 'H') line(n(), y);
    else if (cmd === 'V') line(x, n());
    else if (cmd === 'Z') {
      line(sx, sy);
      P.closed = true;
    } else if (cmd === 'Q') {
      const cx = n(),
        cy = n(),
        x1 = n(),
        y1 = n();
      for (let k = 1; k <= 24; k++) {
        const t = k / 24,
          u = 1 - t;
        P.push([u * u * x + 2 * u * t * cx + t * t * x1, u * u * y + 2 * u * t * cy + t * t * y1] as FinePt);
      }
      x = x1;
      y = y1;
      mark();
    } else if (cmd === 'C') {
      const c1: Pt = [n(), n()],
        c2: Pt = [n(), n()],
        e: Pt = [n(), n()];
      const p0: Pt = [x, y];
      for (let k = 1; k <= 32; k++) P.push(bez(p0, c1, c2, e, k / 32) as FinePt);
      x = e[0];
      y = e[1];
      mark();
    } else i++;
  }
  return polys;
}

export type Sample = [number, number, number];
/** A fine polyline resampled every `step` units of its length, as [x, y, angle]. */
export function resample(P: readonly Pt[], step: number): Sample[] & { len: number } {
  const d = [0];
  for (let i = 1; i < P.length; i++) d.push(d[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = d[d.length - 1];
  const n = Math.max(1, Math.round(L / step));
  const out = [] as unknown as Sample[] & { len: number };
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = (L * k) / n;
    while (j < P.length - 2 && d[j + 1] < s) j++;
    const a = P[j],
      b = P[Math.min(P.length - 1, j + 1)];
    const f = (s - d[j]) / (d[j + 1] - d[j] || 1);
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])]);
  }
  out.len = L;
  return out;
}
/** Split a fine polyline where it turns by more than `deg` degrees at a vertex, as a pen would lift there. */
export function splitSharp(P: FinePoly, deg: number): FinePoly[] {
  const out: FinePoly[] = [];
  let cur: FinePoly = [P[0]];
  for (let i = 1; i < P.length; i++) {
    cur.push(P[i]);
    if (P[i].v && i < P.length - 1) {
      const a = P[i - 1],
        b = P[i],
        c = P[i + 1];
      let t = Math.abs(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]));
      if (t > Math.PI) t = TAU - t;
      if (t > (deg * Math.PI) / 180) {
        out.push(cur);
        cur = [P[i]];
      }
    }
  }
  out.push(cur);
  return out.filter((q) => q.length > 1);
}
/** Every stroke of a tab's outline, as fine polylines, optionally split at sharp turns. */
export function tabPolys(k: IconTab | 'scan', split?: number): FinePoly[] {
  return TAB_SK[k].d.flatMap((d) => pathFine(d)).flatMap((P) => (split ? splitSharp(P, split) : [P]));
}
/** A standalone SVG. */
export const svgTag = (vb: string, w: number | string, h: number | string, body: string, cls?: string) =>
  `<svg viewBox="${vb}" width="${w}" height="${h}"${cls ? ` class="${cls}"` : ''} aria-hidden="true">${body}</svg>`;

/** A seeded random number generator, so a look's scatter is the same on every draw. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hex colour as [r, g, b] in 0–255. */
export function hexRgb(h: string): [number, number, number] {
  let s = h.replace('#', '');
  if (s.length === 3)
    s = s
      .split('')
      .map((c) => c + c)
      .join('');
  const v = (i: number) => hexByte(s.slice(i, i + 2));
  return [v(0), v(2), v(4)];
}
function hexByte(two: string): number {
  const d = (c: string) => '0123456789abcdef'.indexOf(c.toLowerCase());
  return d(two[0]) * 16 + d(two[1]);
}

// ---------- off screen, nothing draws ----------
// A look's live drawing (a figure or wordmark on a canvas) skips any canvas scrolled out of view, as the
// avatars do, so a long screen doesn't spend frames on what nobody sees. Unknown counts as on screen.
const onScreen = new WeakMap<Element, boolean>();
const screenIo =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver((es) => es.forEach((e) => onScreen.set(e.target, e.isIntersecting)), {
        rootMargin: '80px',
      })
    : null;
/** Starts following whether `el` is on screen. */
export const watchOnScreen = (el: Element) => screenIo?.observe(el);
/** Stops following `el`. */
export const unwatchOnScreen = (el: Element) => {
  screenIo?.unobserve(el);
  onScreen.delete(el);
};
/** True only when `el` is known to be off screen. */
export const offScreen = (el: Element) => onScreen.get(el) === false;
