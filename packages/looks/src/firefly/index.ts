// Firefly, ported from docs/ui/directions/src/firefly.js. In the mangroves along the Selangor River,
// fireflies gather by the thousand and flash in time. Sen is one of them. The figure that matters is
// written in fireflies, and the share of them alight is the share of the cycle's money still left.
import {
  TAB_SK,
  TAU,
  dpr,
  f2,
  fontsReady,
  insertDecor,
  polyD,
  reduced,
  resample,
  rmParts,
  sampleSegs,
  svgTag,
  tabPolys,
  type Pt,
  offScreen,
  unwatchOnScreen,
  watchOnScreen,
} from '../engine';
import type { IconTab, Look, Mode } from '../types';
import './look.css';

// the S the firefly draws, tail at bottom left, head at top right (108 dp canvas)
const FF_S: [Pt, Pt, Pt, Pt][] = [
  [
    [37, 74],
    [45, 82],
    [68, 80],
    [68, 66.5],
  ],
  [
    [68, 66.5],
    [68, 53.5],
    [40, 55],
    [40, 42],
  ],
  [
    [40, 42],
    [40, 30],
    [62, 27.5],
    [70, 35],
  ],
];
function ffTrail(n: number, color: string, alphaFloor: number, glow: boolean, p = '') {
  const pts = sampleSegs(FF_S, n);
  let s = '';
  for (let i = 0; i < n - 1; i++) {
    const t = i / (n - 2);
    s += `<circle cx="${f2(pts[i][0])}" cy="${f2(pts[i][1])}" r="${f2(0.95 + 1.3 * t * t)}" fill="${color}" opacity="${f2(alphaFloor + (1 - alphaFloor) * t)}"/>`;
  }
  const h = pts[n - 1];
  if (glow) s += `<circle cx="${f2(h[0])}" cy="${f2(h[1])}" r="19" fill="url(#${p}g)"/>`;
  s += `<circle cx="${f2(h[0])}" cy="${f2(h[1])}" r="4.5" fill="${glow ? '#fffce8' : color}"/>`;
  return s;
}
// a firefly's flash: a quick rise and a slower fade, u in 0..1 of its period
const ffFlash = (u: number) => (u < 0.07 ? u / 0.07 : Math.exp(-(u - 0.07) * 10));
// a seeded random, so decorations come out the same on every render
function ffRand(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

// a glowing point on canvas
function ffLight(c: CanvasRenderingContext2D, x: number, y: number, s: number, k: number, a: number, halo: number) {
  const R = s * (s < 44 ? halo * 1.25 : halo) * k;
  const hg = c.createRadialGradient(x, y, 0, x, y, R);
  hg.addColorStop(0, `rgba(255,251,214,${0.95 * a})`);
  hg.addColorStop(0.22, `rgba(246,238,140,${0.55 * a})`);
  hg.addColorStop(1, 'rgba(236,229,108,0)');
  c.fillStyle = hg;
  c.beginPath();
  c.arc(x, y, R, 0, TAU);
  c.fill();
  c.fillStyle = `rgba(255,252,232,${Math.min(1, 0.3 + a)})`;
  c.beginPath();
  c.arc(x, y, s * (s < 44 ? 0.12 : 0.085) * k * (0.85 + 0.15 * a), 0, TAU);
  c.fill();
}

// ---------- the figure written in fireflies ----------
const FF_FAM = '"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
interface Fly {
  hx: number;
  hy: number;
  per: number;
  ph: number;
  w1: number;
  w2: number;
  r: number;
  on: boolean;
  /** Where it flies in from on payday, and how long it waits. */
  sx: number;
  sy: number;
  dl: number;
}
interface Part {
  t: string;
  font: string;
  x: number;
}
interface FFState {
  W: number;
  H: number;
  base: number;
  L: { size: number; parts: Part[] };
  P: Fly[];
  dpr: number;
  gather: { t: number; dur: number } | null;
  key?: string;
  under?: HTMLCanvasElement;
}
type FFCanvas = HTMLCanvasElement & { _ff?: FFState; _m?: boolean };
const FFT: { set: Set<FFCanvas>; sprite: HTMLCanvasElement | null; raf: number; t0: number } = {
  set: new Set(),
  sprite: null,
  raf: 0,
  t0: 0,
};
// one soft light, drawn once and stamped for every firefly
function ffSprite() {
  if (FFT.sprite) return FFT.sprite;
  const n = 48,
    cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const g = cv.getContext('2d')!;
  const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  r.addColorStop(0, 'rgba(255,253,236,1)');
  r.addColorStop(0.12, 'rgba(255,248,200,1)');
  r.addColorStop(0.26, 'rgba(246,236,140,.55)');
  r.addColorStop(0.55, 'rgba(236,222,110,.14)');
  r.addColorStop(1, 'rgba(236,222,110,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, n, n);
  FFT.sprite = cv;
  return cv;
}
// the figure as canvas text: the currency small, the amount large, fitted to the width
const FF_PAD = 8;
function ffLayout(g: CanvasRenderingContext2D, W: number, sen: number, size: number) {
  const p = rmParts(sen);
  let parts: Part[] = [];
  for (let k = 0; k < 12; k++) {
    const big = `500 ${size}px ${FF_FAM}`,
      cur = `400 ${Math.round(size * 0.36)}px ${FF_FAM}`;
    g.font = cur;
    const wc = g.measureText('RM').width;
    g.font = big;
    const wn = g.measureText(`${p.whole}.${p.cents}`).width;
    parts = [
      { t: 'RM', font: cur, x: FF_PAD },
      { t: `${p.whole}.${p.cents}`, font: big, x: FF_PAD + wc + 6 },
    ];
    if (wc + 6 + wn <= W - 2 * FF_PAD || size < 30) break;
    size -= 3;
  }
  return { size, parts };
}
function ffPrepare(cv: FFCanvas) {
  const W = Math.max(120, cv.clientWidth || cv.parentElement?.clientWidth || 350);
  const g0 = document.createElement('canvas').getContext('2d')!;
  const sen = +(cv.dataset.sen ?? 0);
  const L = ffLayout(g0, W, sen, 58);
  const base = Math.round(L.size * 0.94),
    H = Math.round(L.size * 1.16);
  const d = dpr();
  cv.width = Math.round(W * d);
  cv.height = Math.round(H * d);
  cv.style.height = H + 'px';
  // sample the glyphs at twice the resolution, then pick the fireflies' places at random inside them
  const k = 2,
    m = document.createElement('canvas');
  m.width = W * k;
  m.height = H * k;
  const mg = m.getContext('2d', { willReadFrequently: true })!;
  mg.scale(k, k);
  mg.fillStyle = '#fff';
  L.parts.forEach((q) => {
    mg.font = q.font;
    mg.fillText(q.t, q.x, base);
  });
  const px = mg.getImageData(0, 0, m.width, m.height).data;
  const cand: number[] = [];
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++) if (px[(y * m.width + x) * 4 + 3] > 150) cand.push(x, y);
  const total = cand.length / 2;
  // a firefly every few pixels of the glyphs; the share of them alight is the share of the cycle's income still left
  const want = Math.round(total / (k * k) / 9.5);
  const income = +(cv.dataset.income ?? 0);
  const lit = cv.dataset.over === '1' ? 0 : income > 0 ? Math.min(1, sen / income) : 1;
  const rnd = ffRand(sen || 7919);
  const P: Fly[] = [];
  for (let i = 0; i < want; i++) {
    const j = i + Math.floor(rnd() * (total - i));
    const ax = cand[2 * j],
      ay = cand[2 * j + 1];
    cand[2 * j] = cand[2 * i];
    cand[2 * j + 1] = cand[2 * i + 1];
    cand[2 * i] = ax;
    cand[2 * i + 1] = ay;
    P.push({
      hx: (ax + rnd()) / k,
      hy: (ay + rnd()) / k,
      per: 2.2 + rnd() * 2.6,
      ph: rnd() * 10,
      w1: 0.4 + rnd() * 0.8,
      w2: rnd() * TAU,
      r: 0.75 + rnd() * 0.6,
      on: i < Math.round(lit * want),
      sx: 0,
      sy: 0,
      dl: rnd() * 0.7,
    });
  }
  cv._ff = { W, H, base, L, P, dpr: d, gather: null };
  if (cv.dataset.gather) ffGather(cv);
}
// payday: the fireflies fly in from the twig below and settle into their places
function ffGather(cv: FFCanvas) {
  const F = cv._ff;
  if (!F || reduced()) return;
  const rnd = ffRand(4242);
  F.P.forEach((p) => {
    p.sx = rnd() * F.W;
    p.sy = F.H + 22 + rnd() * 26;
  });
  F.gather = { t: (performance.now() - FFT.t0) / 1000, dur: 1.5 };
}
function ffDraw(cv: FFCanvas, t: number) {
  const F = cv._ff;
  if (!F) return;
  const g = cv.getContext('2d')!;
  const mode = cv.dataset.mode as Mode;
  const dark = mode === 'dark';
  const cs = getComputedStyle(cv);
  const over = cv.dataset.over === '1';
  g.setTransform(F.dpr, 0, 0, F.dpr, 0, 0);
  g.clearRect(0, 0, F.W, F.H);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  // the underlay keeps the figure legible whatever the swarm is doing: by night a warm haze, by day the night itself
  const key = `${mode}|${over}`;
  if (F.key !== key || !F.under) {
    const u = document.createElement('canvas');
    u.width = cv.width;
    u.height = cv.height;
    const ug = u.getContext('2d')!;
    ug.scale(F.dpr, F.dpr);
    const text = (fill: string) => {
      ug.fillStyle = fill;
      F.L.parts.forEach((q) => {
        ug.font = q.font;
        ug.fillText(q.t, q.x, F.base);
      });
    };
    if (over) text(cs.getPropertyValue('--money-warning').trim());
    else if (dark) {
      ug.filter = `blur(${Math.max(3, F.L.size * 0.09)}px)`;
      text('rgba(250,224,118,.26)');
      ug.filter = 'none';
      text('rgba(250,224,118,.075)');
    } else text(cs.getPropertyValue('--night-ink').trim() || '#1d1a45');
    F.under = u;
    F.key = key;
  }
  g.drawImage(F.under, 0, 0, F.W, F.H);
  if (!F.P.length || over) return;
  const spr = ffSprite();
  g.globalCompositeOperation = dark ? 'lighter' : 'source-atop';
  // every eight seconds the swarm flashes together, in a wave from left to right
  const still = reduced();
  const sy = still ? -1 : (t % 8) - 0.4;
  const G = F.gather;
  const sz = Math.max(2.6, F.L.size * 0.075);
  for (const p of F.P) {
    if (!p.on) {
      g.globalAlpha = dark ? 0.3 : 0.16;
      g.drawImage(spr, p.hx - 1.6, p.hy - 1.6, 3.2, 3.2);
      continue;
    }
    let x = p.hx,
      y = p.hy,
      b = 0.8;
    if (!still) {
      x += 0.45 * Math.sin(t * p.w1 + p.w2);
      y += 0.45 * Math.cos(t * p.w1 * 0.8 + p.w2);
      const wave = Math.exp(-Math.pow(sy - (x / F.W) * 0.6, 2) * 70);
      b = 0.26 + 0.6 * ffFlash(((t + p.ph) % p.per) / p.per) * (1 - wave) + 0.95 * wave;
      if (G) {
        const k = Math.min(1, Math.max(0, (t - G.t - p.dl) / G.dur));
        if (k < 1) {
          const e = 1 - Math.pow(1 - k, 3);
          x = p.sx + (x - p.sx) * e;
          y = p.sy + (y - p.sy) * e - Math.sin(Math.PI * e) * 14;
          b = 0.55 + 0.45 * Math.abs(Math.sin(t * 9 + p.ph));
        }
      }
    }
    const r = sz * p.r * (0.75 + 0.45 * b) * (dark ? 1 : 1.25);
    g.globalAlpha = Math.min(1, 0.95 * b);
    g.drawImage(spr, x - r, y - r, 2 * r, 2 * r);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  if (G && t - G.t > G.dur + 0.8) F.gather = null;
}
function ffMount(root: HTMLElement) {
  const mine: FFCanvas[] = [];
  root.querySelectorAll<FFCanvas>('canvas.ffc').forEach((cv) => {
    if (cv._m) return;
    cv._m = true;
    FFT.set.add(cv);
    watchOnScreen(cv);
    mine.push(cv);
    void fontsReady(`500 58px ${FF_FAM}`, `400 21px ${FF_FAM}`).then(() => {
      if (!cv.isConnected) return;
      ffPrepare(cv);
      ffDraw(cv, 2.2);
    });
  });
  if (!FFT.raf && FFT.set.size) {
    FFT.t0 = performance.now();
    let last = 0;
    const step = (now: number) => {
      if (now - last > 32) {
        last = now;
        const t = (now - FFT.t0) / 1000;
        for (const cv of FFT.set) {
          if (!cv.isConnected) {
            FFT.set.delete(cv);
            continue;
          }
          if (offScreen(cv)) continue;
          if (!reduced()) ffDraw(cv, t);
        }
      }
      FFT.raf = FFT.set.size ? requestAnimationFrame(step) : 0;
    };
    FFT.raf = requestAnimationFrame(step);
  }
  return () => {
    for (const cv of mine) {
      FFT.set.delete(cv);
      unwatchOnScreen(cv);
      cv._m = false;
    }
  };
}

// the twig the fireflies settle on, one perch a day; the berembang flower at its tip is payday
function ffTwig(day: number, days: number, now: number) {
  const W = 350,
    H = 30;
  const yb = (x: number) => 16 + 2.4 * Math.sin(x / 61 + 0.5) - 0.006 * x;
  const x0 = 6,
    x1 = W - 14;
  const pts: Pt[] = [];
  for (let x = 0; x <= x1; x += 6) pts.push([x, yb(x)]);
  pts.push([x1, yb(x1)]);
  const L: Pt[] = [],
    R: Pt[] = [];
  pts.forEach((p, i) => {
    const w = 1.9 - 1.3 * (i / (pts.length - 1));
    L.push([p[0], p[1] - w / 2]);
    R.push([p[0], p[1] + w / 2]);
  });
  let s = `<path d="${polyD(L.concat(R.reverse()), true)}" fill="var(--twig)"/>`;
  (
    [
      [44, 1, 0.9],
      [118, -1, 1.15],
      [176, 1, 0.95],
      [252, -1, 1],
      [312, 1, 0.85],
    ] as const
  ).forEach(([x, dir, k]) => {
    const y = yb(x) + 0.6;
    s += `<path d="M${x} ${f2(y)}c${f2(2 * dir * k)} ${f2(3.4 * k)} ${f2(6 * dir * k)} ${f2(5.4 * k)} ${f2(9.5 * dir * k)} ${f2(5.6 * k)}c${f2(-1.8 * dir * k)} ${f2(-2.6 * k)} ${f2(-5 * dir * k)} ${f2(-4.4 * k)} ${f2(-9.5 * dir * k)} ${f2(-5.6 * k)}z" fill="var(--twig)"/>`;
  });
  // the flower: a pompom of stamens
  const fx = W - 7,
    fy = yb(x1) - 1;
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI * 0.95 + (i / 13) * Math.PI * 1.9;
    s += `<line x1="${fx}" y1="${f2(fy)}" x2="${f2(fx + 5.2 * Math.cos(a))}" y2="${f2(fy + 5.2 * Math.sin(a))}" stroke="var(--flower)" stroke-width=".7" stroke-linecap="round"/>`;
  }
  s += `<circle cx="${fx}" cy="${f2(fy)}" r="1.6" fill="var(--flower)"/>`;
  for (let i = 0; i < days; i++) {
    const d = i + 1;
    const x = x0 + (i / (days - 1)) * (x1 - x0 - 8);
    const y = yb(x) - 2.9;
    if (d < day) {
      const f = d / day;
      s += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(1.25 + 0.7 * f)}" fill="var(--ffly)" opacity="${f2(0.16 + 0.62 * f * f)}" class="tw-ff"/>`;
    } else if (d > day) s += `<circle cx="${f2(x)}" cy="${f2(y + 0.8)}" r="1.15" fill="var(--twig-bud)"/>`;
  }
  const tx = x0 + ((day - 1) / (days - 1)) * (x1 - x0 - 8),
    ty = yb(tx) - 3.2;
  s += `<circle cx="${f2(tx)}" cy="${f2(ty)}" r="12" fill="url(#ffs-${now})" class="ff-now-halo"/><circle cx="${f2(tx)}" cy="${f2(ty)}" r="3.3" fill="var(--ffly-core)" class="ff-now"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true" style="overflow:visible"><defs><radialGradient id="ffs-${now}"><stop offset="0" stop-color="var(--ffly-core)"/><stop offset=".28" stop-color="var(--ffly)" stop-opacity=".7"/><stop offset="1" stop-color="var(--ffly)" stop-opacity="0"/></radialGradient></defs>${s}</svg>`;
}

// out-of-focus lights behind the screen, and the blue hour's horizon
function ffSky(mode: Mode) {
  const r = ffRand(mode === 'dark' ? 11 : 23);
  let b = '';
  const n = mode === 'dark' ? 6 : 4;
  for (let i = 0; i < n; i++) {
    const sz = 26 + r() * 54;
    const left = i % 2 ? 62 + r() * 34 : -10 + r() * 30;
    b += `<i style="left:${f2(left)}%;top:${f2(4 + r() * 70)}%;width:${f2(sz)}px;height:${f2(sz)}px;--o:${f2(0.05 + r() * 0.1)};--dx:${f2(r() * 30 - 15)}px;--dy:${f2(r() * 24 - 12)}px;animation-delay:${f2(-r() * 30)}s"></i>`;
  }
  return `<div class="sky" aria-hidden="true"><div class="bokeh">${b}</div></div>`;
}

// ---------- the tab bar: each icon a firefly's trail, dotted as a long exposure shows it ----------
const FF_TAB = {
  light: { idle: '#545072', dot: '#2a2566', head: '#c99412', halo: '201,148,18', glow: 0 },
  dark: { idle: '#a7a3c8', dot: '#f4e98a', head: '#fffce8', halo: '244,233,138', glow: 0.55 },
};
// the dots of a tab's trail, each with its distance from the head, where the firefly is
function ffTabDots(k: IconTab | 'scan', step: number) {
  const S = TAB_SK[k];
  const [hx, hy] = S.head;
  const out: [number, number, number][] = [];
  if (S.dots) S.dots.forEach(([x, y]) => out.push([x, y, Math.hypot(x - hx, y - hy)]));
  tabPolys(k).forEach((P) => {
    const R = resample(P, step);
    const n = P.closed ? R.length - 1 : R.length;
    for (let i = 0; i < n; i++) out.push([R[i][0], R[i][1], Math.hypot(R[i][0] - hx, R[i][1] - hy)]);
  });
  return out;
}
function ffTabBody(k: IconTab | 'scan', on: boolean, mode: Mode, u: string) {
  const c = FF_TAB[mode],
    S = TAB_SK[k];
  const big = k === 'more';
  const dots = ffTabDots(k, 2.05);
  if (!on)
    return dots
      .map(([x, y]) => `<circle cx="${f2(x)}" cy="${f2(y)}" r="${big ? 1.5 : 0.82}" fill="${c.idle}"/>`)
      .join('');
  // active: alight, brightest near the head, with a halo where the firefly is
  const lit = dots
    .map(([x, y, d]) => {
      const k2 = Math.exp(-d / 8);
      return `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2((big ? 1.3 : 0.76) + 0.4 * k2)}" fill="${c.dot}" opacity="${f2(0.5 + 0.5 * k2)}"/>`;
    })
    .join('');
  const [hx, hy] = S.head;
  return (
    `<defs><radialGradient id="${u}h"><stop offset="0" stop-color="rgb(${c.halo})" stop-opacity="${c.glow ? 0.6 : 0.4}"/><stop offset="1" stop-color="rgb(${c.halo})" stop-opacity="0"/></radialGradient>${c.glow ? `<filter id="${u}f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation=".9"/></filter>` : ''}</defs>` +
    `<circle cx="${hx}" cy="${hy}" r="${big ? 6 : 5}" fill="url(#${u}h)" class="ff-halo"/>` +
    (c.glow ? `<g filter="url(#${u}f)" opacity="${c.glow}">${lit}</g>` : '') +
    lit +
    `<circle cx="${hx}" cy="${hy}" r="${big ? 1.9 : 1.45}" fill="${c.head}"/>`
  );
}
const ffTabIcon = (k: IconTab, on: boolean, mode: Mode, u: string) =>
  svgTag('0 0 24 24', 24, 24, ffTabBody(k, on, mode, u));
// the scan button: a patch of night, fireflies circling its edge and the scan mark in light
function ffScan(_mode: Mode, u: string) {
  let ring = '';
  const r = ffRand(29);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU;
    ring += `<circle cx="${f2(26 + Math.cos(a) * 21.4)}" cy="${f2(26 + Math.sin(a) * 21.4)}" r="${f2(0.45 + r() * 0.45)}" fill="#f4e98a" opacity="${f2(0.25 + r() * 0.55)}" class="ff-ring" style="--d:${f2(r() * 3)}s"/>`;
  }
  return svgTag(
    '0 0 52 52',
    52,
    52,
    `<defs><radialGradient id="${u}n" cx="66%" cy="26%" r="78%"><stop offset="0" stop-color="#2e2769"/><stop offset=".55" stop-color="#17143a"/><stop offset="1" stop-color="#0b0a1e"/></radialGradient></defs><circle cx="26" cy="26" r="24" fill="url(#${u}n)"/>${ring}<g transform="translate(14 14)">${ffTabBody('scan', true, 'dark', `${u}g`)}</g>`,
    'sb',
  );
}
// the count on a disc of light, which stretches into a pill for wider counts
function ffBadge(text: string, mode: Mode) {
  const dark = mode === 'dark';
  const W = 20 + Math.max(0, text.length - 1) * 6.2;
  return `${svgTag(`0 0 ${f2(W)} 20`, f2(W), 20, `<rect x=".6" y=".6" width="${f2(W - 1.2)}" height="18.8" rx="9.4" fill="${dark ? '#f4e98a' : '#2a2566'}"/>`)}<b style="color:${dark ? '#1b1636' : '#fbfaff'}">${text}</b>`;
}
// choosing a tab: a firefly flies from the old tab to the new one, leaving its trail, and lights it
function ffFly(bar: HTMLElement, from: HTMLElement | null, to: HTMLElement) {
  if (!from) return;
  const br = bar.getBoundingClientRect();
  const s = br.width / bar.offsetWidth || 1;
  const c = (el: HTMLElement): Pt => {
    const r = (el.querySelector('.ti') ?? el).getBoundingClientRect();
    return [(r.left + r.width / 2 - br.left) / s, (r.top + r.height / 2 - br.top) / s];
  };
  const [x0, y0] = c(from),
    [x1, y1] = c(to);
  const N = 22,
    dur = 680;
  const pts: Pt[] = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    pts.push([x0 + (x1 - x0) * e, y0 + (y1 - y0) * e - Math.sin(Math.PI * e) * (14 + Math.abs(x1 - x0) * 0.06)]);
  }
  const fly = document.createElement('i');
  fly.className = 'ff-fly';
  bar.append(fly);
  fly.animate(
    pts.map(([x, y]) => ({ transform: `translate(${f2(x)}px, ${f2(y)}px)` })),
    { duration: dur, easing: 'linear', fill: 'forwards' },
  );
  pts.forEach(([x, y], k) => {
    if (k % 2 || k === N) return;
    const d = document.createElement('i');
    d.className = 'ff-trail';
    d.style.transform = `translate(${f2(x)}px, ${f2(y)}px)`;
    d.style.animationDelay = `${Math.round((k / N) * dur)}ms`;
    bar.append(d);
    setTimeout(() => d.remove(), dur + 1200);
  });
  setTimeout(() => fly.remove(), dur + 40);
}

let FF_N = 0;
export const DIR: Look = {
  id: 'firefly',
  name: 'Firefly',
  radius: '1rem',
  // a light trail: soft ends
  icons: { weight: 1.6, cap: 'round', join: 'round' },

  avatar: {
    draw(c, s, t, st) {
      const cx = s / 2,
        cy = s / 2;
      const big = s >= 40;
      const g = c.createRadialGradient(s * 0.66, s * 0.24, 0, cx, cy, s * 0.75);
      g.addColorStop(0, '#2e2769');
      g.addColorStop(0.55, '#17143a');
      g.addColorStop(1, '#0b0a1e');
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, s / 2, 0, TAU);
      c.fill();
      c.save();
      c.beginPath();
      c.arc(cx, cy, s / 2, 0, TAU);
      c.clip();
      const hz = s * 0.72;
      const focus = st === 'listening' ? 0.35 : 1;
      if (big) {
        // the far bank's glow, the river, and lights out of focus
        const hg = c.createLinearGradient(0, hz - s * 0.24, 0, hz);
        hg.addColorStop(0, 'rgba(126,84,156,0)');
        hg.addColorStop(1, 'rgba(126,84,156,.34)');
        c.fillStyle = hg;
        c.fillRect(0, hz - s * 0.24, s, s * 0.24);
        c.fillStyle = 'rgba(5,4,15,.6)';
        c.fillRect(0, hz, s, s - hz);
        c.strokeStyle = 'rgba(176,160,232,.09)';
        c.lineWidth = Math.max(0.6, s / 160);
        for (let k = 0; k < 5; k++) {
          const y = hz + s * (0.035 + k * 0.05);
          const o = Math.sin(t * 0.6 + k) * s * 0.04;
          c.beginPath();
          c.moveTo(s * 0.12 + o, y);
          c.lineTo(s * 0.88 + o, y);
          c.stroke();
        }
        (
          [
            [0.24, 0.27, 0.075, '240,222,150'],
            [0.79, 0.38, 0.055, '170,152,240'],
            [0.6, 0.15, 0.045, '170,152,240'],
            [0.36, 0.52, 0.04, '240,222,150'],
          ] as const
        ).forEach(([x, y, r, col], i) => {
          const bx = s * (x + 0.012 * Math.sin(t * 0.13 + i)),
            by = s * (y + 0.01 * Math.cos(t * 0.11 + i * 2));
          const a = (0.1 + 0.05 * Math.sin(t * 0.7 + i * 1.7)) * focus;
          const bg = c.createRadialGradient(bx, by, 0, bx, by, s * r);
          bg.addColorStop(0, `rgba(${col},${a})`);
          bg.addColorStop(0.75, `rgba(${col},${a * 0.8})`);
          bg.addColorStop(1, `rgba(${col},0)`);
          c.fillStyle = bg;
          c.beginPath();
          c.arc(bx, by, s * r, 0, TAU);
          c.fill();
        });
      }
      // where the light is at time u: a slow figure of eight at rest, quick loops while working
      const busy = st === 'thinking' || st === 'helpers';
      const path = (u: number): Pt =>
        busy
          ? [cx + s * 0.15 * Math.sin(u * 2.4), cy - s * 0.04 + s * 0.09 * Math.sin(u * 4.8)]
          : [cx + s * 0.08 * Math.sin(u * 0.5), cy - s * 0.05 + s * 0.045 * Math.sin(u * 1.0)];
      let here = path(t),
        a = 0.5 + 0.5 * ffFlash((t % 3.2) / 3.2),
        halo = 0.42,
        trail = 0;
      if (st === 'note') {
        here = [cx, cy - s * 0.05];
        const u = t % 2.2;
        a = 0.55 + 0.45 * Math.max(ffFlash(u / 0.9), u > 0.3 ? ffFlash((u - 0.3) / 0.9) : 0);
        const ph = (t * 0.45) % 1;
        c.strokeStyle = `rgba(246,238,140,${0.5 * (1 - ph)})`;
        c.lineWidth = Math.max(1, s / 70);
        c.beginPath();
        c.arc(here[0], here[1], s * (0.1 + 0.3 * ph), 0, TAU);
        c.stroke();
      }
      if (st === 'listening') {
        here = [cx, cy - s * 0.04];
        a = 0.94 + 0.06 * Math.sin(t * 1.6);
        halo = 0.52;
      }
      if (busy) {
        trail = 10;
        a = 0.45 + 0.55 * ffFlash((t % 1.1) / 1.1);
      }
      if (st === 'speaking') {
        here = [cx, cy - s * 0.05];
        a = 0.62 + 0.38 * Math.abs(Math.sin(t * 8.5) * Math.sin(t * 2.9));
      }
      if (st === 'paused') {
        here = [cx, hz - s * 0.03];
        a = 0.16;
        halo = 0.22;
      }
      if (st === 'done') {
        here = [cx, cy - s * 0.05];
        const k = Math.max(0, 1 - (t % 3) / 0.7);
        a = 0.8 + 0.2 * k;
        halo = 0.42 + 0.16 * k;
        const ph = (t % 3) / 1.2;
        if (ph < 1) {
          c.strokeStyle = `rgba(255,248,200,${0.6 * (1 - ph)})`;
          c.lineWidth = Math.max(1, s / 60);
          c.beginPath();
          c.arc(here[0], here[1], s * (0.08 + 0.36 * ph), 0, TAU);
          c.stroke();
        }
      }
      // its reflection in the river
      if (big && here[1] < hz) {
        const ry = hz + (hz - here[1]) * 0.55;
        for (let k = 0; k < 6; k++) {
          const y = ry + (k - 2.5) * s * 0.018;
          const w = s * (0.05 - Math.abs(k - 2.5) * 0.007);
          const o = Math.sin(t * 2.2 + k * 1.3) * s * 0.012;
          c.strokeStyle = `rgba(246,236,150,${0.32 * a * (1 - Math.abs(k - 2.5) / 3.2)})`;
          c.lineWidth = Math.max(0.8, s / 110);
          c.beginPath();
          c.moveTo(here[0] - w + o, y);
          c.lineTo(here[0] + w + o, y);
          c.stroke();
        }
      }
      // the trail: where it blinked a moment ago
      for (let k = trail; k >= 1; k--) {
        const p = path(t - k * 0.085);
        const f = 1 - k / (trail + 1);
        c.fillStyle = `rgba(246,238,140,${0.6 * f * f})`;
        c.beginPath();
        c.arc(p[0], p[1], s * (0.011 + 0.016 * f), 0, TAU);
        c.fill();
      }
      // helpers flash in time with Sen, like the river's fireflies
      if (st === 'helpers') {
        for (let h = 0; h < 3; h++) {
          const u = t * 0.6 + (h * TAU) / 3;
          ffLight(
            c,
            cx + s * 0.31 * Math.cos(u),
            cy - s * 0.06 + s * 0.2 * Math.sin(u),
            s,
            0.42,
            0.2 + 0.8 * ffFlash((t % 1.1) / 1.1),
            0.42,
          );
        }
      }
      ffLight(c, here[0], here[1], s, 1, a, halo);
      c.restore();
    },
  },

  icon: {
    background: (p) =>
      `<defs><radialGradient id="${p}n" cx="72%" cy="22%" r="95%"><stop offset="0" stop-color="#2f2869"/><stop offset=".5" stop-color="#171436"/><stop offset="1" stop-color="#0d0b20"/></radialGradient><linearGradient id="${p}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7e549c" stop-opacity="0"/><stop offset="1" stop-color="#7e549c" stop-opacity=".42"/></linearGradient><radialGradient id="${p}b"><stop offset="0" stop-color="#f0de96" stop-opacity=".16"/><stop offset=".8" stop-color="#f0de96" stop-opacity=".12"/><stop offset="1" stop-color="#f0de96" stop-opacity="0"/></radialGradient><radialGradient id="${p}v"><stop offset="0" stop-color="#aa98f0" stop-opacity=".16"/><stop offset=".8" stop-color="#aa98f0" stop-opacity=".1"/><stop offset="1" stop-color="#aa98f0" stop-opacity="0"/></radialGradient></defs><rect width="108" height="108" fill="url(#${p}n)"/><rect y="66" width="108" height="20" fill="url(#${p}h)"/><rect y="86" width="108" height="22" fill="#08071a" opacity=".55"/><circle cx="31" cy="35" r="7" fill="url(#${p}b)"/><circle cx="80" cy="50" r="5" fill="url(#${p}v)"/><circle cx="74" cy="76" r="4" fill="url(#${p}b)"/>`,
    foreground: (p) =>
      `<defs><radialGradient id="${p}g"><stop offset="0" stop-color="#fffbd8"/><stop offset=".16" stop-color="#f6ef8e" stop-opacity=".95"/><stop offset=".42" stop-color="#ece56c" stop-opacity=".3"/><stop offset="1" stop-color="#ece56c" stop-opacity="0"/></radialGradient></defs>${ffTrail(20, '#f2ec8a', 0.16, true, p)}`,
    monochrome: () => ffTrail(16, 'currentColor', 0.3, false),
    small: () => {
      const pts = sampleSegs(
        [
          [
            [5.5, 19.5],
            [7.5, 22],
            [17, 21.5],
            [17, 16.5],
          ],
          [
            [17, 16.5],
            [17, 11.5],
            [7, 12.5],
            [7, 8],
          ],
          [
            [7, 8],
            [7, 3.5],
            [14.5, 2.5],
            [18, 5.5],
          ],
        ],
        8,
      );
      return (
        pts
          .slice(0, 7)
          .map((q, i) => `<circle cx="${f2(q[0])}" cy="${f2(q[1])}" r="${f2(1.05 + 0.2 * i)}" fill="currentColor"/>`)
          .join('') + `<circle cx="${f2(pts[7][0])}" cy="${f2(pts[7][1])}" r="3.2" fill="currentColor"/>`
      );
    },
  },

  wordmark: () => '<span class="wm">sen<i class="ff" aria-hidden="true"></i></span>',
  tabs: { icon: ffTabIcon, scan: ffScan, badge: ffBadge, switch: ffFly },
  heroFigure(sen, mode, st) {
    return `<canvas class="ffc" data-sen="${sen}" data-income="${st.income ?? 0}" data-over="${st.over ? 1 : 0}" data-mode="${mode}" aria-hidden="true"></canvas>`;
  },
  strip(day, days) {
    return ffTwig(day, days, ++FF_N);
  },
  // the sky behind Home: the blue hour by day, the night's out-of-focus lights after dark
  decorate(root, mode) {
    return insertDecor(root, 'afterbegin', ffSky(mode));
  },
  // payday: the fireflies fly in from the twig, then the twig's lights answer together
  paydayFx(root) {
    if (reduced()) return;
    const cv = root.querySelector<FFCanvas>('.hero-fig canvas');
    if (cv) {
      if (cv._ff) ffGather(cv);
      else cv.dataset.gather = 'twig';
    }
    const hero = root.querySelector('.hero');
    if (!hero) return;
    setTimeout(() => {
      hero.classList.add('sync');
      setTimeout(() => hero.classList.remove('sync'), 2600);
    }, 1700);
  },
  mount: ffMount,
  reveal: null,
};
export default DIR;
