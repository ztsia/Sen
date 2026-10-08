/* Direction: Line. Pen and ink: Sen keeps the ledger by hand. Cotton paper, iron-gall ink (the ink of
   ledgers and cheques, permanent because it bites into the paper: it writes blue and dries to black),
   and a figure that Sen writes itself, sen raised and underlined in their own column, the ledger way. */

// the brand loop on the 108 dp canvas: enters from the left edge, loops once, ends at the dot
const LOOP = [[[4, 63], [28, 63], [46, 64], [54, 52]], [[54, 52], [59, 43], [50, 36.5], [46, 44.5]], [[46, 44.5], [42, 53], [56, 63.5], [76.5, 62.6]]];
const LOOP_DOT = [80.6, 62.4];
// a pen stroke as one filled outline, thin to thick (for the icon's static layers)
function taperD(pts, w0, w1) {
  const L = [], R = []; const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2; L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return polyD(L.concat(R.reverse()), true);
}
function loopMark(color, w0, w1, scale = 1, dx = 0, dy = 0, dotR = 4.5) {
  const pts = sampleSegs(LOOP, 160).map((p) => [p[0] * scale + dx, p[1] * scale + dy]);
  return `<path d="${taperD(pts, w0 * scale, w1 * scale)}" fill="${color}"/><circle cx="${f2(LOOP_DOT[0] * scale + dx)}" cy="${f2(LOOP_DOT[1] * scale + dy)}" r="${f2(dotR * scale)}" fill="${color}"/>`;
}

// ---------- the pen ----------
// Single-stroke letters and figures, in a box 100 units tall (baseline 0, top −100), each a list of the
// strokes the pen makes without lifting. A point with a third value of 1 is a sharp turn.
const PEN_G = {
  0: { w: 56, s: [[[40, -97], [22, -96], [9, -74], [6, -42], [13, -10], [28, 1], [44, -8], [52, -38], [50, -74], [40, -97], [28, -94]]] },
  1: { w: 36, s: [[[6, -76], [20, -88], [31, -101, 1], [26, -54], [22, 0]]] },
  2: { w: 58, s: [[[7, -78], [16, -95], [34, -100], [48, -90], [49, -70], [36, -48], [16, -24], [3, 0, 1], [24, -3], [42, -1], [57, -3]]] },
  3: { w: 56, s: [[[8, -90], [24, -101], [42, -97], [48, -81], [40, -63], [22, -54, 1], [42, -50], [52, -34], [48, -12], [30, 0], [12, -2], [3, -13]]] },
  4: { w: 60, s: [[[40, -100], [24, -72], [8, -44], [3, -32, 1], [24, -33], [44, -34], [60, -36]], [[44, -64], [41, -30], [38, 0]]] },
  5: { w: 56, s: [[[14, -99], [11, -76], [8, -54, 1], [26, -60], [44, -54], [53, -36], [49, -13], [32, 0], [14, -1], [3, -12]], [[15, -99], [34, -100], [55, -102]]] },
  6: { w: 54, s: [[[46, -98], [30, -93], [14, -72], [6, -44], [8, -14], [22, 1], [40, -4], [50, -24], [46, -44], [30, -53], [14, -46], [8, -34]]] },
  7: { w: 56, s: [[[5, -99], [24, -100], [44, -101], [57, -102, 1], [44, -76], [30, -46], [18, 0]]] },
  8: { w: 56, s: [[[44, -82], [42, -97], [26, -101], [12, -92], [12, -74], [26, -60], [42, -46], [50, -26], [44, -6], [28, 1], [12, -6], [6, -24], [14, -44], [30, -56], [43, -70], [44, -82], [40, -92]]] },
  9: { w: 56, s: [[[49, -82], [42, -97], [24, -100], [10, -88], [9, -68], [20, -56], [38, -58], [49, -74], [49, -86, 1], [46, -54], [40, -24], [33, 0]]] },
  ',': { w: 16, s: [[[9, -7], [8, 4], [3, 15]]] },
  '.': { w: 16, s: [[[6, -3], [7.5, -1.5], [7, 0]]] },
  R: { w: 56, s: [[[8, 0], [8, -50], [9, -100, 1], [32, -101], [47, -91], [47, -72], [34, -58], [10, -54, 1], [26, -40], [40, -20], [53, 0]]] },
  M: { w: 72, s: [[[5, 0], [7, -50], [10, -100, 1], [24, -64], [36, -28, 1], [48, -64], [62, -100, 1], [64, -50], [66, 0]]] },
  L: { w: 58, s: [[[13, -100], [11, -50], [9, 0, 1], [30, -1], [56, -2]]] },
  i: { w: 22, s: [[[12, -58], [11, -28], [10, 0]], [[13, -84], [14, -82.5], [13.5, -81]]] },
  n: { w: 56, s: [[[9, -58], [9, -28], [8, 0, 1], [9, -30], [20, -52], [34, -58], [45, -50], [47, -28], [46, 0]]] },
  e: { w: 50, s: [[[8, -28], [26, -30], [44, -36], [42, -52], [28, -59], [12, -50], [6, -30], [12, -8], [28, 0], [46, -6]]] },
  s: { w: 46, s: [[[40, -52], [26, -59], [11, -54], [11, -40], [24, -31], [38, -22], [40, -8], [26, 0], [10, -2], [3, -10]]] },
};
// the brand loop as a glyph, so the pen can write it after the title
PEN_G['~'] = { w: 98, s: [sampleSegs(LOOP, 26).map((p) => [(p[0] - 4) * 1.18, (p[1] - 64) * 1.18])], dot: [(LOOP_DOT[0] - 4) * 1.18, (LOOP_DOT[1] - 64) * 1.18] };

// centripetal Catmull–Rom through the points, broken at sharp turns
function penSpline(pts) {
  const out = []; let run = [pts[0]];
  const flush = () => {
    const P = run; if (P.length === 1) { out.push(P[0]); return; }
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      const n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 1.2));
      for (let k = i ? 1 : 0; k <= n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((d) => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
      }
    }
  };
  for (let i = 1; i < pts.length; i++) { run.push(pts[i]); if (pts[i][2] === 1 && i < pts.length - 1) { flush(); out.pop(); run = [pts[i]]; } }
  flush(); return out;
}
// lay out text as pen strokes in px: [{pts: [[x, y]], len}] with x, y on the canvas, slanted like a hand
const PEN_SLANT = 0.2, PEN_NIB = -0.56;
function penText(text, x0, base, size, track = 0.08) {
  const k = size / 100; const strokes = []; let x = x0;
  for (const ch of text) {
    if (ch === ' ') { x += size * 0.3; continue; }
    const g = PEN_G[ch]; if (!g) continue;
    const map = (p) => [x + (p[0] - p[1] * PEN_SLANT) * k, base + p[1] * k];
    g.s.forEach((st) => strokes.push({ pts: penSpline(st).map(map), size }));
    if (g.dot) strokes.push({ pts: [map(g.dot), map([g.dot[0] + 0.5, g.dot[1]])], dot: true, size });
    x += (g.w + 100 * track) * k;
  }
  return { strokes, x };
}
// widths along each stroke: an italic nib, thick across its edge and fine along it, with ink pooling where the pen lands and lifts
function penPrep(strokes, size0) {
  let total = 0;
  strokes.forEach((s) => {
    const size = s.size || size0, wMax = Math.max(0.9, size * 0.104), wMin = Math.max(0.55, size * 0.022);
    if (!s.fine) { const R = [s.pts[0]]; for (let i = 1; i < s.pts.length; i++) { const a = s.pts[i - 1], b = s.pts[i]; const m = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.6); for (let k = 1; k <= m; k++) R.push([a[0] + (b[0] - a[0]) * k / m, a[1] + (b[1] - a[1]) * k / m]); } s.pts = R; s.fine = true; }
    const P = s.pts, n = P.length; s.w = []; s.d = [0];
    for (let i = 1; i < n; i++) s.d.push(s.d[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    s.len = s.d[n - 1] || 0.5;
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)]; const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
      let w = wMin + (wMax - wMin) * Math.abs(Math.sin(th - PEN_NIB)); const u = s.d[i] / s.len;
      w *= 0.82 + 0.18 * Math.min(1, u / 0.12) - 0.16 * Math.max(0, (u - 0.86) / 0.14);
      s.w.push(s.dot ? size * 0.07 : w);
    }
    s.pool = s.dot ? 0 : Math.max(wMin * 1.6, s.w[n - 1]) * 0.56; s.t0 = total; total += s.len + size * 0.9;
  });
  return total;
}
// mix two hex colours
function penMix(a, b, k) { const A = hexRgb(a), B = hexRgb(b); return `rgb(${[0, 1, 2].map((i) => Math.round(255 * (A[i] + (B[i] - A[i]) * k))).join(',')})`; }
// draw the strokes written so far: `upto` is how far the pen has travelled; ink dries from fresh to dry over `dry` of travel
function penInk(g, strokes, upto, fresh, dry, dryLen, sheen) {
  for (const s of strokes) {
    if (s.t0 > upto) break; const P = s.pts;
    for (let i = 0; i < P.length; i++) {
      const at = s.t0 + s.d[i]; if (at > upto) break; const age = Math.min(1, (upto - at) / dryLen);
      g.fillStyle = penMix(fresh, dry, age * age * (3 - 2 * age)); g.beginPath(); g.arc(P[i][0], P[i][1], s.w[i] / 2, 0, TAU); g.fill();
    }
    // a pool where the pen lifted, with the sheen dried iron-gall ink takes on
    const end = s.t0 + s.len; if (end <= upto && s.pool) {
      const q = P[P.length - 1], age = Math.min(1, (upto - end) / dryLen); g.fillStyle = penMix(fresh, dry, age); g.beginPath(); g.arc(q[0], q[1], s.pool, 0, TAU); g.fill();
      if (sheen && age > 0.6) { g.fillStyle = sheen; g.globalAlpha = 0.38 * (age - 0.6) / 0.4; g.beginPath(); g.arc(q[0] - s.pool * 0.25, q[1] - s.pool * 0.25, s.pool * 0.45, 0, TAU); g.fill(); g.globalAlpha = 1; }
      if (age < 1) { g.fillStyle = `rgba(255,255,255,${0.55 * (1 - age)})`; g.beginPath(); g.arc(q[0] - s.pool * 0.3, q[1] - s.pool * 0.32, s.pool * 0.28, 0, TAU); g.fill(); }
    }
  }
}

// ---------- written figures: Home's figure, the type specimen, the title and the wordmark ----------
const PEN = { set: new Set(), loop: false, t0: 0 };
const PEN_INK = { light: { fresh: '#2b4fd6', dry: '#1b2134', sheen: '#8a3a46' }, dark: { fresh: '#9db3ff', dry: '#ebe6da', sheen: '#c99a6b' } };
function penLayout(cv) {
  const kind = cv.dataset.kind, W = cv.clientWidth || 350; let H, strokes = [], rule = null;
  if (kind === 'fig') {
    const S = 44, base = 58; H = 76; const p = rmParts(+cv.dataset.sen);
    const cur = penText('RM', 6, base, S * 0.34, 0.1); let x = cur.x + S * 0.16; strokes = cur.strokes;
    const whole = penText(p.whole, x, base, S, 0.06); strokes = strokes.concat(whole.strokes); x = whole.x + S * 0.08;
    rule = x + S * 0.02;  // the sen column's rule
    const cents = penText(p.cents, x + S * 0.16, base - S * 0.46, S * 0.56, 0.06); strokes = strokes.concat(cents.strokes);
    const ux = x + S * 0.14, uw = cents.x - x - S * 0.12; strokes.push({ pts: penSpline([[ux, base - S * 0.36], [ux + uw * 0.5, base - S * 0.375], [ux + uw, base - S * 0.39]]) });
    cv._fit = cents.x;
  } else if (kind === 'title') {
    const S = Math.round(Math.min(92, Math.max(58, W * 0.15))); const base = Math.round(S * 1.12); H = Math.round(S * 1.38);
    const t = penText('Line', 8, base, S, 0.04); const loop = penText('~', t.x + S * 0.2, base - S * 0.12, S * 0.62, 0); strokes = t.strokes.concat(loop.strokes);
  } else {
    const S = 15, base = 21; H = 28; strokes = penText('sen', 2, base, S, 0.02).strokes;
  }
  const size = kind === 'fig' ? 44 : kind === 'title' ? Math.round(Math.min(92, Math.max(58, W * 0.15))) : 15;
  const total = penPrep(strokes, size);
  return { W, H, strokes, total, rule, size };
}
function penPrepare(cv) {
  const L = penLayout(cv); const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(L.W * dpr); cv.height = Math.round(L.H * dpr); cv.style.height = L.H + 'px';
  cv._pen = Object.assign(L, { dpr, start: null, done: false, key: '' });
}
function penDraw(cv, now) {
  const F = cv._pen; if (!F) return; const g = cv.getContext('2d'); const mode = cv.dataset.mode === 'page' ? pageMode() : cv.dataset.mode;
  const over = cv.dataset.over === '1'; const cs = getComputedStyle(cv); const ink = Object.assign({}, PEN_INK[mode]);
  if (over) { ink.fresh = ink.dry = cs.getPropertyValue('--money-warning').trim(); ink.sheen = null; }
  const speed = F.size * 9;  // px of stroke a second: a quick, sure hand
  if (F.start === null) F.start = now; const upto = REDUCED || cv.dataset.write === '0' ? 1e9 : (now - F.start) / 1000 * speed;
  const key = `${mode}|${over}`; if (F.done && F.key === key) return; F.key = key;
  g.setTransform(F.dpr, 0, 0, F.dpr, 0, 0); g.clearRect(0, 0, F.W, F.H);
  if (F.rule !== null) { g.strokeStyle = cs.getPropertyValue('--ledger-rule').trim(); g.lineWidth = 0.8; [0, 2.6].forEach((o) => { g.beginPath(); g.moveTo(F.rule + o, 6); g.lineTo(F.rule + o, F.H - 10); g.stroke(); }); }
  const dryLen = F.size * 14;
  penInk(g, F.strokes, upto, ink.fresh, ink.dry, dryLen, ink.sheen);
  F.done = upto > F.total + dryLen;
}
function penWrite(cv) { if (cv._pen) { cv._pen.start = null; cv._pen.done = false; } }
function penMount(root) {
  root.querySelectorAll('canvas.pen').forEach((cv) => {
    if (cv._m) return; cv._m = true; PEN.set.add(cv);
    Promise.resolve(document.fonts && document.fonts.ready).catch(() => {}).then(() => { if (cv.isConnected) penPrepare(cv); });
  });
  if (!PEN.loop) {
    PEN.loop = true; let last = 0;
    const step = (now) => { if (now - last > 30) { last = now; for (const cv of PEN.set) { if (!cv.isConnected) { PEN.set.delete(cv); continue; } penDraw(cv, now); } } requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
}

// ---------- the nib, for Sen ----------
// a steel nib seen from above, tip at (x, y), its body running down to the right; lift raises it off the paper
function penNib(c, x, y, L, lift, dark) {
  if (lift > 0) { c.fillStyle = `rgba(20,24,40,${0.16 * (1 - Math.min(1, lift / (L * 0.5)))})`; c.save(); c.translate(x + lift * 0.9, y + lift * 1.3); c.rotate(0.62); c.beginPath(); c.ellipse(L * 0.5, 0, L * 0.5, L * 0.17, 0, 0, TAU); c.fill(); c.restore(); }
  c.save(); c.translate(x - lift * 0.35, y - lift * 0.55); c.rotate(0.62);
  const g = c.createLinearGradient(0, -L * 0.2, 0, L * 0.2); g.addColorStop(0, dark ? '#d9dce4' : '#eef0f4'); g.addColorStop(0.45, dark ? '#9aa0ae' : '#b8bdc8'); g.addColorStop(1, dark ? '#5d6371' : '#7b8190');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(L * 0.3, -L * 0.04, L * 0.55, -L * 0.2, L * 0.82, -L * 0.2); c.quadraticCurveTo(L * 1.02, -L * 0.2, L * 1.02, 0); c.quadraticCurveTo(L * 1.02, L * 0.2, L * 0.82, L * 0.2); c.bezierCurveTo(L * 0.55, L * 0.2, L * 0.3, L * 0.04, 0, 0); c.fill();
  c.strokeStyle = 'rgba(30,34,48,.55)'; c.lineWidth = Math.max(0.5, L * 0.025); c.beginPath(); c.moveTo(L * 0.04, 0); c.lineTo(L * 0.5, 0); c.stroke();
  c.fillStyle = 'rgba(30,34,48,.6)'; c.beginPath(); c.arc(L * 0.53, 0, L * 0.045, 0, TAU); c.fill();
  c.restore();
}
// Sen's loop in the avatar's units, as pen strokes
const LOOP_A = sampleSegs(LOOP, 70).map((p) => [(p[0] - 50) / 34, (p[1] - 54) / 34]);
const LOOP_A_DOT = [(LOOP_DOT[0] - 50) / 34, (LOOP_DOT[1] - 54) / 34];
function avStrokes(list, s) { const k = s * 0.36, c = s / 2; return list.map((pts) => ({ pts: pts.map((p) => [c + p[0] * k, c + p[1] * k]) })); }

// ---------- the tab bar: icons written with the same italic nib ----------
// one stroke as a filled outline: a little hand-wobble, widths from the nib's angle, tapered ends, round where the pen lands and lifts
function lnOutline(P, wMin, wMax, seed) {
  const R = resample(P, 0.3); const n = R.length; if (n < 2) return '';
  const pts = R.map(([x, y, a], i) => { const s = (i / (n - 1)) * R.len; const o = 0.09 * Math.sin(s * 0.55 + seed) + 0.035 * Math.sin(s * 1.4 + seed * 1.7); return [x - Math.sin(a) * o, y + Math.cos(a) * o]; });
  const left = [], right = [], th = [], w = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; th[i] = Math.atan2(b[1] - a[1], b[0] - a[0]); const u = i / (n - 1);
    w[i] = (wMin + (wMax - wMin) * Math.abs(Math.sin(th[i] - PEN_NIB))) * (0.8 + 0.2 * Math.min(1, u / 0.15) - 0.18 * Math.max(0, (u - 0.85) / 0.15));
    const nx = -Math.sin(th[i]) * w[i] / 2, ny = Math.cos(th[i]) * w[i] / 2; left.push([pts[i][0] + nx, pts[i][1] + ny]); right.push([pts[i][0] - nx, pts[i][1] - ny]);
  }
  const cap = (c, t0, r) => { const out = []; for (let k = 1; k < 6; k++) { const t = t0 - (Math.PI * k) / 6; out.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]); } return out; };
  const end = cap(pts[n - 1], th[n - 1] + Math.PI / 2, w[n - 1] / 2), start = cap(pts[0], th[0] - Math.PI / 2, w[0] / 2);
  return polyD(left.concat(end, right.reverse(), start), true) + `M${f2(pts[n - 1][0] + w[n - 1] * 0.6)} ${f2(pts[n - 1][1])}a${f2(w[n - 1] * 0.6)} ${f2(w[n - 1] * 0.6)} 0 1 0 0 .01z`;
}
// a tab's icon as ink: one outline per pen stroke, lifted at sharp turns
function lnInk(k, wMin = 0.6, wMax = 2.3) {
  const S = TAB_SK[k];
  if (S.dots) return S.dots.map(([x, y], i) => `M${f2(x + 1.75)} ${f2(y + 0.1 * Math.sin(i))}a1.8 1.65 0 1 0 0 .01z`).join('');
  return tabPolys(k, 50).map((P, i) => lnOutline(P, wMin, wMax, i * 1.9 + k.length)).join('');
}
const LN_TAB = { light: { idle: '#5a5e6a', on: '#1b2134', red: '#b23a2e', paper: '#f5f5f1' }, dark: { idle: '#a19d94', on: '#ebe6da', red: '#e58a78', paper: '#141519' } };
function lnTabIcon(k, on, mode, u) {
  const c = LN_TAB[mode]; const ink = `<path d="${lnInk(k)}" fill="currentColor" fill-rule="nonzero"/>`;
  if (!on) return `<svg viewBox="0 0 24 24" width="24" height="24" color="${c.idle}" aria-hidden="true">${ink}</svg>`;
  // active: the same ink, revealed stroke by stroke behind the pen when chosen
  const S = TAB_SK[k]; const strokes = S.dots ? S.dots.map(([x, y]) => `M${x - 2} ${y}h4`) : S.d;
  return `<svg viewBox="0 0 24 24" width="24" height="24" color="${c.on}" aria-hidden="true"><defs><mask id="${u}w" maskUnits="userSpaceOnUse" x="-3" y="-3" width="30" height="30">${strokes.map((d, i) => `<path class="pen-w" style="--n:${i}" d="${d}" fill="none" stroke="#fff" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>`).join('')}</mask></defs><g mask="url(#${u}w)">${ink}</g></svg>`;
}
// the scan button: a dab of ink, the scan mark left as bare paper
function lnScan(mode, u) {
  const c = LN_TAB[mode]; const pts = []; for (let i = 0; i < 96; i++) { const t = (i / 96) * TAU; const r = 23.3 + 0.45 * Math.sin(t * 3 + 1.3) + 0.28 * Math.sin(t * 7 + 0.4) + 0.16 * Math.sin(t * 13); pts.push([26 + r * Math.cos(t), 26 + r * Math.sin(t)]); }
  return svgTag('0 0 52 52', 52, 52, `<defs><radialGradient id="${u}s" cx="34%" cy="28%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity="${mode === 'dark' ? 0.18 : 0.12}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><path d="${polyD(pts, true)}" fill="${c.on}"/><path d="${polyD(pts, true)}" fill="url(#${u}s)"/><g transform="translate(14 14)" color="${c.paper}"><path d="${lnInk('scan', 0.7, 2.1)}" fill="currentColor"/></g>`, 'sb');
}
// the review count, circled in red ink the way a bookkeeper marks what needs attention; a wider count (99+) gets a wider ring
function lnBadge(n, mode) {
  const text = String(n); const c = LN_TAB[mode]; const extra = Math.max(0, text.length - 1) * 3.2; const W = 21.2 + 2 * extra; const cx = W / 2;
  const P = []; for (let i = 0; i <= 80; i++) { const t = -1.95 + (i / 80) * TAU * 1.07; P.push([cx + (8.3 + extra + 0.35 * Math.sin(t * 2)) * Math.cos(t), 10.4 + 7.5 * Math.sin(t) + i * 0.012]); }
  return `${svgTag(`0 0 ${f2(W)} 21.2`, f2(W), 21.2, `<ellipse cx="${f2(cx)}" cy="10.4" rx="${f2(7.6 + extra)}" ry="6.8" fill="${c.paper}" opacity=".92"/><path d="${lnOutline(P, 0.45, 1.5, 3)}" fill="${c.red}"/>`)}<b style="color:${c.on}">${text}</b>`;
}
// Sen's underline under the active tab, written again when you choose another
function lnUnderline(mode) {
  const P = []; for (let i = 0; i <= 40; i++) { const x = -11.5 + 23 * (i / 40); P.push([x, 0.5 * Math.sin(x * 0.22) - x * 0.03]); }
  return `<svg viewBox="-13 -3 26 6" width="26" height="6" color="${LN_TAB[mode].on}" aria-hidden="true"><path d="${lnOutline(P, 0.35, 1.5, 5)}" fill="currentColor"/></svg>`;
}
function lnSwitch(bar) { const ind = bar.querySelector('.tab-ind'); ind.classList.remove('redraw'); void ind.offsetWidth; ind.classList.add('redraw'); }

let PEN_N = 0;
const DIR = {
  id: 'line', name: 'Line', title: 'Sen Line',
  fonts: 'https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Alegreya:ital,wght@0,400;0,500;1,400&display=swap',
  titleHTML: '<span class="vh">Line</span><canvas class="pen pen-title" data-kind="title" data-mode="page" aria-hidden="true"></canvas>',
  lede: 'Sen keeps the ledger by hand. Cotton paper and iron-gall ink, the ink of ledgers and cheques, made permanent by biting into the paper: it writes blue and dries to black. The figure that matters is written in front of you, with the sen raised and underlined in a column of their own, the way bookkeepers wrote money.',
  meta: 'Light is cotton paper and blue-black ink. Dark is the same hand in pale ink on black paper.',
  senIntro: 'Sen is the line its pen draws: one loop and a dot, the mark it signs with. At rest the ink is dry, and now and then it signs again. The nib lifts and waits when you open the sheet, doodles while it works, makes carbon copies when helpers go out, writes a line as it answers, and ticks when a change goes through.',
  iconIntro: 'One stroke of ink on a ruled line: it loops once, for the cycle, and ends at a dot where the ink has pooled and dried with a bronze sheen. The stroke swells and thins with the nib, so it reads as written, not drawn by a tool.',
  tabsIntro: 'Each icon is written with the same italic nib as the figure, thick and thin and a little uneven, the way a hand writes. Choose a tab and Sen writes its icon again, stroke by stroke, in wet blue ink that dries to black, and underlines it. The scan button is a dab of ink, and the review count is circled in red, the way a bookkeeper marks what needs attention.',
  themeIntro: 'Cotton paper and blue-black ink, and pale ink on black paper at night.',
  typeNote: { display: 'Sen’s own hand for the figure: single-stroke numerals written with an italic nib, sen raised and underlined', ui: 'Alegreya Sans for everything you read and tap, with lining, tabular figures in columns. Alegreya for headings.', voice: 'Sen writes in Alegreya italic, a calligrapher’s italic, like a note in the margin.' },
  radius: '1rem',
  // every icon outside the tab bar is lucide, in this look's colour (the icon token), weight and line ends (D81): the pen: ink-coloured, a nib's round ends
  icons: { weight: 1.5, cap: 'round', join: 'round' },
  tokens: {
    light: {
      background: '#f5f5f1', foreground: '#1b2134', card: '#fbfbf8', 'card-foreground': '#1b2134', popover: '#fbfbf8', 'popover-foreground': '#1b2134',
      primary: '#1b2134', 'primary-foreground': '#f8f8f4', secondary: '#ebebe5', 'secondary-foreground': '#1b2134', muted: '#ecece6', 'muted-foreground': '#585c68',
      accent: '#e9ebf3', 'accent-foreground': '#1b2134', destructive: '#b3261e', border: '#dddcd4', input: '#cfcec6', ring: '#2b4fd6',
      'chart-accent': '#1b2134', 'chart-context': '#b5b4ad',
      'money-in': '#147a46', 'money-out': '#1b2134', 'money-pending': '#666a75', 'money-warning': '#9e5000', icon: '#1b2134',
    },
    dark: {
      background: '#141519', foreground: '#ebe6da', card: '#1a1b20', 'card-foreground': '#ebe6da', popover: '#1c1d22', 'popover-foreground': '#ebe6da',
      primary: '#ebe6da', 'primary-foreground': '#141519', secondary: '#24252b', 'secondary-foreground': '#ebe6da', muted: '#202126', 'muted-foreground': '#a19d94',
      accent: '#22253a', 'accent-foreground': '#ebe6da', destructive: '#ff8a80', border: '#2b2c32', input: '#36373e', ring: '#9db3ff',
      'chart-accent': '#ebe6da', 'chart-context': '#4c4d55',
      'money-in': '#62d49a', 'money-out': '#ebe6da', 'money-pending': '#9a978f', 'money-warning': '#f2a65a', icon: '#ebe6da',
    },
  },
  extra: {
    light: { 'warn-bg': '#f8e3df', 'warn-fg': '#8a1c14', checker: 'rgba(27,33,52,.05)', 'tab-on': '#1b2134', 'fab-bg': '#fbfbf8', 'fab-shadow': '0 0 0 1px rgba(27,33,52,.08), 0 10px 24px -10px rgba(27,33,52,.35)', 'ink-fresh': '#2b4fd6', 'ledger-rule': 'rgba(196,110,96,.5)', feint: 'rgba(120,150,200,.16)', pencil: '#a9a8a2', paper: '#f5f5f1' },
    dark: { 'warn-bg': '#3a1b18', 'warn-fg': '#ffb4ab', checker: 'rgba(235,230,218,.05)', 'tab-on': '#ebe6da', 'fab-bg': '#1c1d22', 'fab-shadow': '0 0 0 1px rgba(235,230,218,.1), 0 10px 24px -10px rgba(0,0,0,.6)', 'ink-fresh': '#9db3ff', 'ledger-rule': 'rgba(214,128,112,.42)', feint: 'rgba(160,180,230,.08)', pencil: '#5b5b62', paper: '#141519' },
  },
  wall: 'linear-gradient(165deg,#d9d8d0 0%,#9b9a92 52%,#3a3b40 100%)',

  avatar: {
    draw(c, s, t, st, mode) {
      const cx = s / 2, cy = s / 2; const dark = mode === 'dark'; const ink = PEN_INK[dark ? 'dark' : 'light']; const big = s >= 36;
      c.fillStyle = dark ? '#1c1d22' : '#fbfbf8'; c.beginPath(); c.arc(cx, cy, s / 2, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.arc(cx, cy, s / 2 - 0.5, 0, TAU); c.clip();
      if (big) { c.strokeStyle = dark ? 'rgba(160,180,230,.1)' : 'rgba(120,150,200,.22)'; c.lineWidth = Math.max(0.6, s / 200); c.beginPath(); c.moveTo(0, cy + s * 0.12); c.lineTo(s, cy + s * 0.12); c.stroke(); }
      const size = s * 0.42; const loop = avStrokes([LOOP_A], s); penPrep(loop, size); const len = loop[0].len;
      const dotAt = (k) => [cx + LOOP_A_DOT[0] * s * 0.36, cy + LOOP_A_DOT[1] * s * 0.36];
      const dot = (r, col) => { const q = dotAt(); c.fillStyle = col; c.beginPath(); c.arc(q[0], q[1], r, 0, TAU); c.fill(); };
      const nibL = s * 0.34; let nib = null;
      if (st === 'resting' || st === 'paused') {
        // dry ink, still; now and then the light catches its sheen
        const col = st === 'paused' ? (dark ? '#55565c' : '#c4c3bc') : ink.dry;
        penInk(c, loop, 1e9, col, col, 1, null); dot(Math.max(1.2, s * 0.042), col);
        if (st === 'resting' && big) { const P = loop[0].pts, ph = (t % 9) / 1.6; if (ph < 1) { const i0 = Math.floor(P.length * ph); c.fillStyle = dark ? 'rgba(255,250,240,.35)' : 'rgba(150,90,110,.45)'; for (let i = Math.max(0, i0 - 18); i < Math.min(P.length, i0); i++) { c.beginPath(); c.arc(P[i][0], P[i][1], loop[0].w[i] * 0.22, 0, TAU); c.fill(); } } }
      } else if (st === 'note') {
        // a new note: the loop signed afresh in wet ink, over the last signature
        const cyc = t % 4.5; const w = Math.min(1, cyc / 1.3);
        c.globalAlpha = 1 - w; penInk(c, loop, 1e9, ink.dry, ink.dry, 1, null); c.globalAlpha = 1;
        penInk(c, loop, len * w + (cyc - 1.3 > 0 ? (cyc - 1.3) * len * 0.5 : 0), ink.fresh, ink.dry, len * 1.6, null);
        if (w < 1 && big) { const i = Math.min(loop[0].pts.length - 1, Math.floor(loop[0].pts.length * w)); nib = loop[0].pts[i]; }
        if (w >= 1) { dot(Math.max(1.2, s * 0.048), ink.fresh); if (big) { c.fillStyle = 'rgba(255,255,255,.7)'; const q = dotAt(); c.beginPath(); c.arc(q[0] - s * 0.014, q[1] - s * 0.015, s * 0.012, 0, TAU); c.fill(); } }
      } else if (st === 'listening') {
        penInk(c, loop, 1e9, ink.dry, ink.dry, 1, null); dot(Math.max(1.2, s * 0.042), ink.dry);
        if (big) { const q = dotAt(); nib = [q[0] + s * 0.02, q[1] - s * 0.04]; penNib(c, nib[0], nib[1], nibL, s * (0.07 + 0.015 * Math.sin(t * 2.4)), dark); nib = null; }
      } else if (st === 'thinking' || st === 'helpers') {
        // doodles: a figure of eight that dries and fades as the pen moves on
        const f = (v) => [0.78 * Math.sin(2 * v + 0.5), 0.5 * Math.sin(3 * v)]; const T = t * 1.3;
        const draw = (dx, dy, alpha, col) => {
          const pts = []; for (let i = 0; i <= 50; i++) pts.push(f(T - 2.4 + 2.4 * i / 50)); const sk = avStrokes([pts.map((p) => [p[0] + dx, p[1] + dy])], s); penPrep(sk, size * 0.9);
          c.globalAlpha = alpha; penInk(c, sk, sk[0].len, ink.fresh, col, sk[0].len * 0.7, null); c.globalAlpha = 1; return sk[0].pts[sk[0].pts.length - 1];
        };
        if (st === 'helpers') { draw(0.12, 0.13, 0.32, dark ? '#7f86a8' : '#9aa2c4'); draw(-0.1, -0.12, 0.22, dark ? '#7f86a8' : '#9aa2c4'); }
        nib = draw(0, 0, 1, ink.dry);
      } else if (st === 'speaking') {
        // a line of writing, left to right
        const ph = (t * 0.55) % 1; const pts = []; for (let i = 0; i <= 60; i++) { const x = -1 + 2 * (i / 60) * ph; pts.push([x, 0.06 + 0.15 * Math.sin(x * 9) * (0.6 + 0.4 * Math.sin(x * 3.1))]); }
        const sk = avStrokes([pts], s); penPrep(sk, size * 0.85); penInk(c, sk, sk[0].len, ink.fresh, ink.dry, sk[0].len * 0.6, null); nib = sk[0].pts[sk[0].pts.length - 1];
      } else if (st === 'done') {
        const k = Math.min(1, (t % 3.5) / 0.6); const sk = avStrokes([penSpline([[-0.6, 0.02], [-0.42, 0.18], [-0.2, 0.42, 1], [0.2, -0.04], [0.66, -0.46]])], s); penPrep(sk, size * 1.1);
        if (k < 1) { c.globalAlpha = 0.18; penInk(c, sk, 1e9, ink.dry, ink.dry, 1, null); c.globalAlpha = 1; }
        penInk(c, sk, sk[0].len * k, ink.fresh, ink.dry, sk[0].len * 0.5, ink.sheen); if (k < 1 && big) { const i = Math.min(sk[0].pts.length - 1, Math.floor(sk[0].pts.length * k)); nib = sk[0].pts[i]; }
      }
      if (nib && big) penNib(c, nib[0], nib[1], nibL, 0, dark);
      c.restore();
      c.strokeStyle = dark ? 'rgba(235,230,218,.12)' : 'rgba(27,33,52,.1)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, s / 2 - 0.5, 0, TAU); c.stroke();
    },
  },

  icon: {
    background: (p) => `<defs><radialGradient id="${p}p" cx="40%" cy="30%" r="90%"><stop offset="0" stop-color="#fbfbf8"/><stop offset="1" stop-color="#ecebe4"/></radialGradient></defs><rect width="108" height="108" fill="url(#${p}p)"/><line x1="0" x2="108" y1="66.5" y2="66.5" stroke="#9fb3d8" stroke-width=".7" opacity=".55"/><line x1="0" x2="108" y1="44" y2="44" stroke="#9fb3d8" stroke-width=".7" opacity=".3"/>`,
    foreground: (p) => `<defs><linearGradient id="${p}i" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b2134"/><stop offset=".7" stop-color="#1e2742"/><stop offset="1" stop-color="#26357a"/></linearGradient><radialGradient id="${p}s" cx="38%" cy="35%" r="60%"><stop offset="0" stop-color="#9a4a52" stop-opacity=".85"/><stop offset=".6" stop-color="#5a2a3a" stop-opacity=".35"/><stop offset="1" stop-color="#1b2134" stop-opacity="0"/></radialGradient></defs>${loopMark(`url(#${p}i)`, 1.1, 3.9)}<circle cx="${LOOP_DOT[0]}" cy="${LOOP_DOT[1]}" r="3" fill="url(#${p}s)"/>`,
    monochrome: () => loopMark('currentColor', 1.4, 3.8),
    small: () => loopMark('currentColor', 6.4, 8.6, 0.27, -1.6, -2, 8.4),
  },

  wordmark: (mode) => `<span class="wm"><canvas class="pen pen-wm" data-kind="wm" data-mode="${mode}" data-write="0" aria-hidden="true"></canvas><svg viewBox="0 30 92 42" aria-hidden="true">${loopMark('var(--primary)', 1.6, 4.2)}</svg></span>`,
  tabs: { icon: lnTabIcon, scan: lnScan, badge: lnBadge, ind: lnUnderline, switch: lnSwitch },
  heroFigure(sen, mode, st) { return `<canvas class="pen" data-kind="fig" data-sen="${sen}" data-over="${st && st.over ? 1 : 0}" data-mode="${mode}" aria-hidden="true"></canvas>`; },
  // the cycle as a ruled line in ink up to today, pencil dots to payday, a tick each week and a double rule at payday
  strip(day, days) {
    const W = 340, H = 22, y = 12, x = (d) => 3 + ((d - 1) / (days - 1)) * (W - 14); const tx = x(day);
    const pts = []; for (let d = 1; d <= day; d += 0.25) { const xx = x(d); pts.push([xx, y + 0.45 * Math.sin(xx / 23) + 0.25 * Math.sin(xx / 7.3)]); }
    if (pts.length < 2) pts.push([tx + 0.5, y]);
    let s = `<path d="${taperD(pts, 1.1, 2.4)}" fill="var(--primary)" class="drawn"/>`;
    for (let d = 8; d < day; d += 7) s += `<path d="M${f2(x(d) - 1)} ${y - 7}l${f2(1.6)} 4.6" stroke="var(--primary)" stroke-width="1.3" stroke-linecap="round" opacity=".75"/>`;
    for (let d = day + 1; d < days; d++) s += `<circle cx="${f2(x(d))}" cy="${f2(y + 0.3 * Math.sin(d))}" r=".95" fill="var(--pencil)"/>`;
    s += `<path d="M${f2(W - 6)} ${y - 6}l.6 12M${f2(W - 2.6)} ${y - 6}l.6 12" stroke="var(--muted-foreground)" stroke-width="1.1" stroke-linecap="round"/>`;
    const id = `wet${++PEN_N}`;
    s += `<defs><radialGradient id="${id}" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".25" stop-color="var(--ink-fresh)"/><stop offset="1" stop-color="var(--ink-fresh)"/></radialGradient></defs><circle cx="${f2(tx)}" cy="${y}" r="4.4" fill="url(#${id})" class="wet"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true" style="overflow:visible">${s}</svg>`;
  },
  decorate(screen) {
    penMount(screen);
    // a double rule under the total, the ledger's way of closing a sum
    const q = screen.querySelector('.quiet b'); if (q) q.classList.add('total');
  },
  paydayFx(screen) { if (REDUCED) return; const l = screen.querySelector('.strip .drawn'); if (l) l.classList.add('draw'); },
  afterBoot(pg) { penMount(pg); },

  good: [
    'The most personal of the six. Sen writes the figure in front of you, in ink that dries as you watch, so the app feels kept by hand rather than computed.',
    'Ledger manners give it meaning: sen raised and underlined in their own column, a double rule under totals, an overspent figure written in the warning ink, the way losses went into the books in red.',
    'Sen draws while it thinks, makes carbon copies for its helpers and ticks when it’s done, which reads as someone working on paper rather than a machine spinning.',
  ],
  weigh: [
    'Its colour is ink, not a brand hue: blue-black by day and pale by night, with fresh blue only while the ink is wet. It leans on the hand, the paper and the spacing to feel premium.',
    'Raised, underlined sen are a bookkeeper’s convention. They read naturally on a price tag, but the figure is one step less plain than a typeset amount.',
    'The handwriting is drawn by the app, a small canvas component with its own numerals. It writes once when a screen opens, then stays still.',
  ],
};
