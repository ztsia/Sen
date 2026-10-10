// Mercury, ported from docs/ui/directions/src/mercury.js. Quicksilver, the liquid metal of precision
// instruments. Sen is a drop of it, rendered live: it splits into droplets when it sends out helpers
// and runs back together when they report. The figure that matters is poured in it. Where WebGL is
// missing, a painted 2D fallback draws a still drop and a typeset figure.
import {
  TAB_SK,
  TAU,
  allOf,
  dpr,
  f2,
  fontsReady,
  insertDecor,
  reduced,
  rmParts,
  svgTag,
  offScreen,
  unwatchOnScreen,
  watchOnScreen,
} from '../engine';
import type { AvatarState, IconTab, Look, Mode } from '../types';
import './look.css';

// ---------- the liquid: one small WebGL renderer, shared by every drop and figure on the page ----------
type Uniforms = Record<string, WebGLUniformLocation | null>;
const HG: {
  ok: boolean | null;
  gl: WebGLRenderingContext | null;
  cv: HTMLCanvasElement | null;
  u: Uniforms;
  w: number;
  h: number;
  blank: WebGLTexture | null;
} = {
  ok: null,
  gl: null,
  cv: null,
  u: {},
  w: 0,
  h: 0,
  blank: null,
};
export const HG_FS = `precision highp float;
uniform vec2 uRes; uniform sampler2D uTex; uniform float uTexW, uDmax, uRT, uN, uT, uWob, uDull, uDark, uGlint, uE, uOver, uK;
uniform vec4 uDrop[12]; uniform vec3 uWarn;
// the scene as a signed distance in device px (negative inside), and the radius of the shape there
vec2 scene(vec2 px) {
  float d = 1e5, R = uRT;
  if (uTexW > 0.0) { vec2 w = uWob * uE * vec2(sin(px.y * 0.12 / uE + uT * 1.9), cos(px.x * 0.1 / uE + uT * 1.4)); d = (0.5 - texture2D(uTex, (px + w) / uRes).r) * 2.0 * uDmax + (1.0 - uTexW) * uRT * 1.15; }
  for (int i = 0; i < 12; i++) {
    if (float(i) >= uN) break; vec4 q = uDrop[i]; float di = length(px - q.xy) - q.z * q.w;
    float h = clamp(0.5 + 0.5 * (d - di) / uK, 0.0, 1.0); d = mix(d, di, h) - uK * h * (1.0 - h); R = mix(R, q.z, h);
  }
  return vec2(d, max(R, uE));
}
float height(vec2 s) { float u = clamp(-s.x / s.y, 0.0, 1.0); return sqrt(1.0 - (1.0 - u) * (1.0 - u)); }
// what the metal reflects, seen from a little above: a bright sky or ceiling with one window, a dark horizon, a warm floor
vec3 env(vec3 r) {
  float e = r.z * 0.55 - r.y * 0.85;
  vec3 skyLo = mix(vec3(0.62, 0.6, 0.57), vec3(0.34, 0.31, 0.28), uDark), skyHi = mix(vec3(0.97, 0.95, 0.92), vec3(0.78, 0.74, 0.69), uDark);
  vec3 hor = mix(vec3(0.16, 0.14, 0.12), vec3(0.04, 0.032, 0.026), uDark);
  vec3 grLo = mix(vec3(0.34, 0.3, 0.26), vec3(0.15, 0.105, 0.07), uDark), grHi = mix(vec3(0.55, 0.48, 0.41), vec3(0.4, 0.26, 0.13), uDark);
  vec3 c = e > 0.0 ? mix(hor, mix(skyLo, skyHi, smoothstep(0.3, 1.0, e)), smoothstep(0.0, 0.36, e)) : mix(hor, mix(grLo, grHi, smoothstep(-0.3, -0.95, e)), smoothstep(0.0, -0.3, e));
  c += mix(vec3(0.1, 0.08, 0.06), vec3(0.22, 0.13, 0.05), uDark) * smoothstep(0.12, 0.0, abs(e + 0.1));
  vec2 w = vec2(r.x + 0.34 + 0.03 * sin(uT * 0.21), e - 0.72 + 0.02 * cos(uT * 0.17)) * vec2(1.0, 1.35);
  float pane = smoothstep(0.17, 0.14, max(abs(w.x) * 1.15, abs(w.y)));
  float frame = clamp(smoothstep(0.011, 0.0, abs(w.x)) + smoothstep(0.011, 0.0, abs(w.y + 0.015)), 0.0, 1.0);
  c = mix(c, vec3(1.3, 1.26, 1.18), pane * (1.0 - frame * 0.85));
  c *= 1.0 - 0.2 * smoothstep(0.09, 0.0, abs(r.x - 0.42)) * smoothstep(0.15, 0.5, e);
  return c;
}
void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 s0 = scene(px), sx = scene(px + vec2(uE, 0.0)), sy = scene(px + vec2(0.0, uE));
  float a = clamp(0.5 - s0.x, 0.0, 1.0);
  float h = height(s0); vec2 dh = vec2(height(sx) - h, height(sy) - h) / uE * s0.y * (1.0 - 0.75 * uDull);
  vec3 n = normalize(vec3(-dh, 1.0)); vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  vec3 col = env(r) * vec3(0.93, 0.95, 0.98);
  col += uGlint * vec3(1.0, 0.97, 0.92) * smoothstep(0.14, 0.0, abs(dot(n.xy, vec2(0.7, 0.7)) - (fract(uT * 0.5) * 1.6 - 0.8)));
  col = mix(col, vec3(dot(col, vec3(0.3, 0.5, 0.2))) * 0.55 + 0.14, uDull);
  col = mix(col, col * uWarn * 1.6, uOver);
  vec2 sh0 = scene(px - vec2(1.2, 2.6) * uE); float sh = clamp(0.5 - sh0.x / (2.5 * uE), 0.0, 1.0) * (0.24 + 0.12 * uDark) * (1.0 - a);
  gl_FragColor = vec4(col * a, a + sh);
}`;
/** Whether WebGL works here. A test can force the still fallback with `?gl=0`. */
function hgInit(): boolean {
  if (HG.ok !== null) return HG.ok;
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('gl') === '0')
      return (HG.ok = false);
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return (HG.ok = false);
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, HG_FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr) ?? 'link');
    gl.useProgram(pr);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    [
      'uRes',
      'uTex',
      'uTexW',
      'uDmax',
      'uRT',
      'uN',
      'uT',
      'uWob',
      'uDull',
      'uDark',
      'uGlint',
      'uE',
      'uOver',
      'uK',
      'uDrop',
      'uWarn',
    ].forEach((k) => {
      HG.u[k] = gl.getUniformLocation(pr, k);
    });
    // an empty texture for drops with no text
    HG.blank = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, HG.blank);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    HG.gl = gl;
    HG.cv = cv;
    return (HG.ok = true);
  } catch (e) {
    console.warn('Mercury falls back to 2D:', (e as Error).message);
    return (HG.ok = false);
  }
}
function hgTexture(src: ImageData) {
  const gl = HG.gl!;
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  return t;
}
type Drop = [number, number, number, number?];
interface HgOpts {
  tex?: WebGLTexture | null;
  texW?: number;
  dmax?: number;
  rt?: number;
  drops?: Drop[];
  k?: number;
  t?: number;
  dark?: boolean;
  wob?: number;
  dull?: number;
  glint?: number;
  over?: boolean;
  warn?: number[];
}
// render liquid into a 2D context at (0, 0, w, h) css px
function hgDraw(dst: CanvasRenderingContext2D, w: number, h: number, d: number, o: HgOpts) {
  const gl = HG.gl!;
  const cv = HG.cv!;
  const W = Math.max(1, Math.round(w * d)),
    H = Math.max(1, Math.round(h * d));
  if (W > HG.w || H > HG.h) {
    HG.w = Math.max(W, HG.w);
    HG.h = Math.max(H, HG.h);
    cv.width = HG.w;
    cv.height = HG.h;
  }
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const u = HG.u;
  gl.uniform2f(u.uRes, W, H);
  gl.uniform1f(u.uE, d);
  gl.uniform1f(u.uT, o.t || 0);
  gl.uniform1f(u.uWob, o.wob || 0);
  gl.uniform1f(u.uDull, o.dull || 0);
  gl.uniform1f(u.uDark, o.dark ? 1 : 0);
  gl.uniform1f(u.uGlint, o.glint || 0);
  gl.uniform1f(u.uOver, o.over ? 1 : 0);
  gl.uniform3fv(u.uWarn, o.warn || [1, 0.6, 0.2]);
  gl.uniform1f(u.uK, (o.k || 4) * d);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, o.tex || HG.blank);
  gl.uniform1i(u.uTex, 0);
  gl.uniform1f(u.uTexW, o.tex ? (o.texW === undefined ? 1 : o.texW) : 0);
  gl.uniform1f(u.uDmax, o.dmax || 16);
  gl.uniform1f(u.uRT, o.rt || 8);
  const D = new Float32Array(48);
  const drops = (o.drops || []).slice(0, 12);
  drops.forEach((q, i) => {
    D[i * 4] = q[0] * d;
    D[i * 4 + 1] = q[1] * d;
    D[i * 4 + 2] = q[2] * d;
    D[i * 4 + 3] = q[3] === undefined ? 1 : q[3];
  });
  gl.uniform4fv(u.uDrop, D);
  gl.uniform1f(u.uN, drops.length);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  dst.drawImage(cv, 0, HG.h - H, W, H, 0, 0, w, h);
}
const HG_WARN: Record<Mode, number[]> = { light: [0.86, 0.5, 0.12], dark: [1, 0.66, 0.32] };

// ---------- liquid text: the large figure and the wordmark ----------
const MQ_FAM = '"Hanken Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
interface MqPart {
  t: string;
  font: string;
  x: number;
}
interface MqState {
  W: number;
  H: number;
  size: number;
  parts: MqPart[];
  base: number;
  dpr: number;
  field: ImageData;
  tex: WebGLTexture | null;
  rt: number;
  dmax: number;
  /** Payday: droplets roll up out of the tube and pool into the new figure (`t` is set at the first frame). */
  pour: { t: number | null } | null;
  targets: [number, number][];
  fallback?: boolean;
}
type MqCanvas = HTMLCanvasElement & { _mq?: MqState; _m?: boolean };
const MQ: { set: Set<MqCanvas>; raf: number; t0: number } = { set: new Set(), raf: 0, t0: 0 };
function mqLayout(cv: MqCanvas) {
  const kind = cv.dataset.kind,
    W = Math.max(60, cv.clientWidth || 350);
  const g = document.createElement('canvas').getContext('2d')!;
  let size: number,
    parts: MqPart[] = [],
    H: number,
    base: number;
  if (kind === 'fig') {
    const p = rmParts(+(cv.dataset.sen ?? 0));
    size = 60;
    for (let k = 0; k < 12; k++) {
      g.font = `600 ${Math.round(size * 0.36)}px ${MQ_FAM}`;
      const wc = g.measureText('RM').width;
      g.font = `600 ${size}px ${MQ_FAM}`;
      const wn = g.measureText(`${p.whole}.${p.cents}`).width;
      parts = [
        { t: 'RM', font: `600 ${Math.round(size * 0.36)}px ${MQ_FAM}`, x: 6 },
        { t: `${p.whole}.${p.cents}`, font: `600 ${size}px ${MQ_FAM}`, x: 6 + wc + 8 },
      ];
      if (wc + 8 + wn <= W - 12 || size < 30) break;
      size -= 3;
    }
    H = Math.round(size * 1.12);
    base = Math.round(size * 0.9);
  } else {
    size = 25;
    parts = [{ t: 'Sen', font: `600 ${size}px ${MQ_FAM}`, x: 3 }];
    H = 32;
    base = 25;
  }
  return { W, H, size, parts, base };
}
// squared Euclidean distance transform (Felzenszwalb and Huttenlocher), to the nearest pixel where mask === target
function mqEDT(mask: Uint8Array, w: number, h: number, target: number) {
  const INF = 1e20,
    n = Math.max(w, h),
    f = new Float64Array(n),
    d = new Float64Array(n),
    v = new Int32Array(n),
    z = new Float64Array(n + 1),
    g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = mask[i] === target ? 0 : INF;
  const dt = (len: number) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s: number;
      while ((s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])) <= z[k]) k--;
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  };
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x];
    dt(h);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x];
    dt(w);
    for (let x = 0; x < w; x++) g[y * w + x] = d[x];
  }
  return g;
}
function mqPrepare(cv: MqCanvas) {
  const L = mqLayout(cv);
  const dp = dpr();
  cv.width = Math.round(L.W * dp);
  cv.height = Math.round(L.H * dp);
  cv.style.height = L.H + 'px';
  const m = document.createElement('canvas');
  m.width = cv.width;
  m.height = cv.height;
  const g = m.getContext('2d', { willReadFrequently: true })!;
  g.scale(dp, dp);
  g.fillStyle = '#fff';
  L.parts.forEach((q) => {
    g.font = q.font;
    g.fillText(q.t, q.x, L.base);
  });
  const W = m.width,
    H = m.height,
    img = g.getImageData(0, 0, W, H),
    px = img.data;
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) mask[i] = px[i * 4 + 3] > 127 ? 1 : 0;
  // the glyphs as a signed distance field, so every stroke can be shaded as a rounded tube of liquid
  const toOut = mqEDT(mask, W, H, 0),
    toIn = mqEDT(mask, W, H, 1);
  const inside: number[] = [];
  for (let i = 0; i < W * H; i++) if (mask[i]) inside.push(Math.sqrt(toOut[i]));
  inside.sort((a, b) => a - b);
  const rt = Math.max(2, inside[Math.floor(inside.length * 0.97)] || 4);
  const dmax = rt * 2.2;
  const targets: [number, number][] = [];
  let seed = 97;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < W * H; i++) {
    const sd = mask[i] ? -(Math.sqrt(toOut[i]) - 0.5) : Math.sqrt(toIn[i]) - 0.5;
    const v = Math.max(0, Math.min(255, Math.round((0.5 - sd / (2 * dmax)) * 255)));
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v;
    px[i * 4 + 3] = 255;
  }
  for (let tries = 0; targets.length < 10 && tries < 6000; tries++) {
    const x = Math.floor(rnd() * W),
      y = Math.floor(rnd() * H);
    if (mask[y * W + x] && Math.sqrt(toOut[y * W + x]) > rt * 0.6) targets.push([x / dp, y / dp]);
  }
  cv._mq = {
    ...L,
    dpr: dp,
    field: img,
    tex: null,
    rt,
    dmax,
    pour: cv.dataset.pour ? { t: null } : null,
    targets,
    fallback: !hgInit(),
  };
}
function mqDraw(cv: MqCanvas, t: number) {
  const F = cv._mq;
  if (!F) return;
  const g = cv.getContext('2d')!;
  const mode = cv.dataset.mode as Mode;
  const dark = mode === 'dark';
  const over = cv.dataset.over === '1';
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(F.dpr, 0, 0, F.dpr, 0, 0);
  if (F.fallback) {
    // the still fallback: the figure typeset in a painted metal gradient
    const gr = g.createLinearGradient(0, 0, 0, F.H);
    gr.addColorStop(0, dark ? '#efe9e1' : '#6b625a');
    gr.addColorStop(0.55, dark ? '#8a8279' : '#221c18');
    gr.addColorStop(1, dark ? '#c8a27a' : '#8a7660');
    g.fillStyle = over ? getComputedStyle(cv).getPropertyValue('--money-warning') : gr;
    F.parts.forEach((q) => {
      g.font = q.font;
      g.fillText(q.t, q.x, F.base);
    });
    return;
  }
  if (!F.tex) F.tex = hgTexture(F.field);
  const o: HgOpts = {
    tex: F.tex,
    texW: 1,
    rt: F.rt,
    dmax: F.dmax,
    k: F.size * 0.08,
    drops: [],
    t,
    dark,
    wob: reduced() ? 0 : 0.35,
    over,
    warn: HG_WARN[mode],
  };
  // payday: droplets roll up out of the tube and pool into the new figure
  if (F.pour && !reduced()) {
    if (F.pour.t === null) F.pour.t = t;
    const k = t - F.pour.t;
    if (k < 2.6) {
      o.texW = Math.min(1, Math.max(0, (k - 0.75) / 0.9));
      F.targets.forEach((q, i) => {
        const d = Math.min(1, Math.max(0, (k - i * 0.04) / 1.0));
        const e = 1 - Math.pow(1 - d, 3);
        const sx = F.W * (0.08 + 0.84 * (i / 9)),
          sy = F.H + 26;
        o.drops!.push([
          sx + (q[0] - sx) * e,
          sy + (q[1] - sy) * e - Math.sin(Math.PI * e) * 10,
          F.size * (0.1 - 0.03 * e),
          Math.max(0.01, 1 - Math.max(0, Math.min(1, (k - 1.1) / 0.8))),
        ]);
      });
      o.glint = Math.max(0, 1 - Math.abs(k - 2.0) / 0.5);
    } else F.pour = null;
  }
  hgDraw(g, F.W, F.H, F.dpr, o);
}
function mqMount(root: HTMLElement) {
  const mine: MqCanvas[] = [];
  root.querySelectorAll<MqCanvas>('canvas.mq').forEach((cv) => {
    if (cv._m) return;
    cv._m = true;
    MQ.set.add(cv);
    watchOnScreen(cv);
    mine.push(cv);
    void fontsReady(`600 60px ${MQ_FAM}`).then(() => {
      if (!cv.isConnected) return;
      mqPrepare(cv);
      mqDraw(cv, 2);
    });
  });
  if (!MQ.raf && MQ.set.size) {
    MQ.t0 = performance.now();
    let last = 0;
    const step = (now: number) => {
      if (now - last > 32) {
        last = now;
        const t = (now - MQ.t0) / 1000;
        for (const cv of MQ.set) {
          if (!cv.isConnected) {
            MQ.set.delete(cv);
            continue;
          }
          if (offScreen(cv)) continue;
          if (!reduced() && !cv._mq?.fallback) mqDraw(cv, t);
        }
      }
      MQ.raf = MQ.set.size ? requestAnimationFrame(step) : 0;
    };
    MQ.raf = requestAnimationFrame(step);
  }
  return () => {
    for (const cv of mine) {
      MQ.set.delete(cv);
      unwatchOnScreen(cv);
      cv._m = false;
    }
  };
}

// ---------- the column: a graduated glass tube, one mark a day, mercury up to today ----------
let MQ_N = 0;
function mqTube(day: number, days: number) {
  const W = 350,
    H = 26,
    y = 15,
    x0 = 15,
    x1 = W - 4,
    xd = (d: number) => x0 + 4 + ((d - 1) / (days - 1)) * (x1 - x0 - 10);
  const id = `mq${++MQ_N}`;
  const tx = xd(day);
  let s = `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--glass-hi)"/><stop offset=".5" stop-color="var(--glass)"/><stop offset="1" stop-color="var(--glass-lo)"/></linearGradient>`;
  s += `<linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f3ee"/><stop offset=".32" stop-color="#b9b4ad"/><stop offset=".55" stop-color="#3b332c"/><stop offset=".8" stop-color="#8d7a66"/><stop offset="1" stop-color="#d8c2a4"/></linearGradient>`;
  s += `<radialGradient id="${id}b" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#fbf9f6"/><stop offset=".35" stop-color="#b8b2ab"/><stop offset=".7" stop-color="#3a322b"/><stop offset="1" stop-color="#b59a7c"/></radialGradient></defs>`;
  // etched marks: one a day, longer each week, a ring at payday
  for (let d = 1; d <= days; d++) {
    const xx = xd(d);
    const wk = (d - 1) % 7 === 0;
    s += `<line x1="${f2(xx)}" x2="${f2(xx)}" y1="${wk ? 2 : 5}" y2="8.2" stroke="var(--etch)" stroke-width="${wk ? 0.9 : 0.6}"/>`;
  }
  s += `<circle cx="${f2(xd(days))}" cy="3.4" r="2.2" fill="none" stroke="var(--etch)" stroke-width=".8"/>`;
  // the tube and its bulb
  s += `<rect x="${x0}" y="${y - 4.5}" width="${x1 - x0}" height="9" rx="4.5" fill="url(#${id}g)" stroke="var(--glass-edge)" stroke-width=".7"/>`;
  s += `<circle cx="9" cy="${y}" r="7" fill="url(#${id}g)" stroke="var(--glass-edge)" stroke-width=".7"/><circle cx="9" cy="${y}" r="5.2" fill="url(#${id}b)"/>`;
  // the column, ending in a convex meniscus at today
  s += `<path d="M10 ${y - 1.9}H${f2(tx - 1.6)}a1.9 1.9 0 0 1 0 3.8H10z" fill="url(#${id}m)" class="col"/>`;
  s += `<line x1="${x0 + 3}" x2="${x1 - 4}" y1="${y - 2.9}" y2="${y - 2.9}" stroke="#fff" stroke-opacity=".55" stroke-width=".7" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true" style="overflow:visible">${s}</svg>`;
}

// ---------- Sen: a drop of quicksilver ----------
function mqDrops(s: number, t: number, st: AvatarState): Drop[] {
  const c = s / 2,
    R = s * 0.2;
  const wob = (i: number, a: number) => a * Math.sin(t * (1.3 + i * 0.37) + i * 2.1);
  const main = (r: number, dx = 0, dy = 0): Drop[] => [
    [c + dx + wob(0, s * 0.012), c + dy + wob(1, s * 0.01), r],
    [c + dx + s * 0.05 + wob(2, s * 0.02), c + dy - s * 0.03, r * 0.55],
    [c + dx - s * 0.05, c + dy + s * 0.04 + wob(3, s * 0.02), r * 0.5],
  ];
  if (st === 'resting') return main(R);
  if (st === 'note') {
    const k = (Math.sin(t * 2.2) + 1) / 2;
    return main(R).concat([[c + s * (0.3 - 0.03 * k), c - s * (0.22 - 0.02 * k), s * 0.065]]);
  }
  if (st === 'listening') return main(R * 1.12).map((d): Drop => [d[0], d[1] - s * 0.01, d[2]]);
  if (st === 'thinking') {
    const a = t * 2.4;
    return [
      [c + Math.cos(a) * s * 0.09, c + Math.sin(a) * s * 0.09, R * 0.82],
      [c - Math.cos(a) * s * 0.09, c - Math.sin(a) * s * 0.09, R * 0.82],
      [c, c, R * 0.4],
    ];
  }
  if (st === 'helpers') {
    const out = main(R * 0.9);
    for (let h = 0; h < 3; h++) {
      const a = t * 0.9 + (h * TAU) / 3;
      const r = s * (0.26 + 0.05 * Math.sin(t * 1.7 + h));
      out.push([c + Math.cos(a) * r, c + Math.sin(a) * r, s * 0.07]);
    }
    return out;
  }
  if (st === 'speaking') {
    const v = Math.abs(Math.sin(t * 7.5) * Math.sin(t * 2.3));
    return main(R * (0.94 + 0.12 * v)).concat([
      [c + s * 0.14 * Math.cos(t * 3), c + s * 0.14 * Math.sin(t * 3), R * 0.35 * v],
    ]);
  }
  if (st === 'paused')
    return [
      [c, c, R],
      [c + s * 0.04, c - s * 0.02, R * 0.5],
    ];
  if (st === 'done') {
    const k = (t % 3) / 3;
    const g = Math.min(1, k / 0.35);
    const d = s * 0.2 * (1 - g);
    const sq = 1 + 0.12 * Math.sin(Math.min(1, Math.max(0, (k - 0.35) / 0.3)) * Math.PI);
    return [
      [c - d, c, R * 0.72 * sq],
      [c + d, c, R * 0.72 * sq],
      [c, c, R * 0.3 * g],
    ];
  }
  return main(R);
}

// ---------- the tab bar: channels etched in the stone; the active one runs full of quicksilver ----------
const MQ_TAB = {
  light: { etch: 'rgba(43,37,32,.66)', lip: 'rgba(255,255,255,.8)', shade: 'rgba(30,20,12,.3)' },
  dark: { etch: 'rgba(239,232,223,.56)', lip: 'rgba(0,0,0,.5)', shade: 'rgba(0,0,0,.55)' },
};
// a tube of liquid metal, shaded in layers so it reads as round whichever way the stroke runs: a warm floor, a dark body, the sky above
const MQ_LAYERS: [number, string, number, number, number][] = [
  [3.15, '#b08a64', 0.45, 0, 0.32],
  [2.75, '#211b16', 1, 0, 0],
  [2, '#7d756e', 1, -0.05, -0.1],
  [1.2, '#d6d0c8', 1, -0.2, -0.32],
  [0.48, '#fffaf2', 0.95, -0.32, -0.52],
];
export const mqBead = (id: string) =>
  `<radialGradient id="${id}" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#fbf9f6"/><stop offset=".3" stop-color="#bdb7b0"/><stop offset=".64" stop-color="#2d261f"/><stop offset=".86" stop-color="#7a634d"/><stop offset="1" stop-color="#d8b994"/></radialGradient>`;
function mqEtch(k: IconTab, c: (typeof MQ_TAB)['light'], w: number) {
  const S = TAB_SK[k];
  const lip = (d: string) =>
    `<path d="${d}" fill="none" stroke="${c.lip}" stroke-width="${w + 0.2}" stroke-linecap="round" stroke-linejoin="round" transform="translate(.3 .45)"/>`;
  const groove = (d: string) =>
    `<path d="${d}" fill="none" stroke="${c.etch}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (S.dots)
    return S.dots
      .map(
        ([x, y]) =>
          `<circle cx="${x + 0.3}" cy="${y + 0.45}" r="1.75" fill="none" stroke="${c.lip}" stroke-width="${w}"/><circle cx="${x}" cy="${y}" r="1.75" fill="none" stroke="${c.etch}" stroke-width="${w}"/>`,
      )
      .join('');
  const d = S.d.join('');
  return lip(d) + groove(d);
}
function mqTabIcon(k: IconTab, on: boolean, mode: Mode, u: string) {
  const c = MQ_TAB[mode],
    S = TAB_SK[k];
  if (!on) return svgTag('0 0 24 24', 24, 24, mqEtch(k, c, 1.3));
  // active: the channel, then quicksilver run along it, stroke by stroke
  if (S.dots)
    return svgTag(
      '0 0 24 24',
      24,
      24,
      `<defs>${mqBead(`${u}b`)}</defs>${mqEtch(k, c, 1.1)}${S.dots.map(([x, y], i) => `<circle cx="${x + 0.25}" cy="${y + 0.7}" r="2.25" fill="${c.shade}"/><circle class="bead" style="--n:${i}" cx="${x}" cy="${y}" r="2.35" fill="url(#${u}b)"/>`).join('')}`,
    );
  const tube = S.d
    .map(
      (d, i) =>
        `<g class="hg" style="--n:${i}"><path d="${d}" fill="none" stroke="${c.shade}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(.35 .8)" pathLength="1"/>${MQ_LAYERS.map(([w, col, a, dx, dy]) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${a}" stroke-linecap="round" stroke-linejoin="round"${dx || dy ? ` transform="translate(${dx} ${dy})"` : ''} pathLength="1"/>`).join('')}</g>`,
    )
    .join('');
  return svgTag('0 0 24 24', 24, 24, mqEtch(k, c, 1.1) + tube);
}
// the scan button: a polished dome of the metal, with the scan mark etched into it
function mqTabScan(_mode: Mode, u: string) {
  const d = TAB_SK.scan.d.join('');
  return svgTag(
    '0 0 52 52',
    52,
    52,
    `<defs>${mqBead(`${u}d`)}<radialGradient id="${u}w"><stop offset="0" stop-color="#fffaf2" stop-opacity=".9"/><stop offset="1" stop-color="#fffaf2" stop-opacity="0"/></radialGradient></defs><circle cx="26" cy="26" r="24" fill="url(#${u}d)"/><ellipse cx="18.5" cy="15" rx="8" ry="4.6" transform="rotate(-30 18.5 15)" fill="url(#${u}w)"/><g transform="translate(14 14)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="rgba(255,250,242,.55)" stroke-width="2" transform="translate(.35 .5)"/><path d="${d}" stroke="rgba(28,22,18,.85)" stroke-width="1.9"/></g>`,
    'sb',
  );
}
// the review count in a bronze pill with a silver rim
function mqTabBadge(text: string, _mode: Mode, u: string) {
  const W = 21 + Math.max(0, text.length - 1) * 6.2;
  return `${svgTag(`0 0 ${f2(W)} 20`, f2(W), 20, `<defs><linearGradient id="${u}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf9f6"/><stop offset=".5" stop-color="#6f665e"/><stop offset="1" stop-color="#d8b994"/></linearGradient></defs><rect x=".6" y=".6" width="${f2(W - 1.2)}" height="18.8" rx="9.4" fill="#1c1612" stroke="url(#${u}r)" stroke-width="1.2"/>`)}<b style="color:#efe8df">${text}</b>`;
}

export const DIR: Look = {
  id: 'mercury',
  name: 'Mercury',
  radius: '1.125rem',
  // an etched channel: quiet stone grey, liquid ends
  icons: { weight: 1.6, cap: 'round', join: 'round' },

  avatar: {
    draw(c, s, t, st) {
      const cx = s / 2,
        cy = s / 2;
      const dp = c.canvas.width / s;
      const g = c.createRadialGradient(s * 0.34, s * 0.26, 0, cx, cy, s * 0.7);
      g.addColorStop(0, '#3a2f26');
      g.addColorStop(0.6, '#1d1712');
      g.addColorStop(1, '#100c0a');
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, s / 2, 0, TAU);
      c.fill();
      const drops = mqDrops(s, t, st);
      if (hgInit()) {
        c.save();
        c.beginPath();
        c.arc(cx, cy, s / 2, 0, TAU);
        c.clip();
        hgDraw(c, s, s, dp, {
          drops,
          k: s * 0.07,
          t,
          dark: true,
          wob: 0,
          dull: st === 'paused' ? 1 : 0,
          glint: st === 'done' ? Math.max(0, 1 - Math.abs((t % 3) / 3 - 0.62) / 0.12) : 0,
        });
        c.restore();
      } else
        drops.forEach((d) => {
          const r = d[2] * 1.4;
          const gr = c.createRadialGradient(d[0] - r * 0.35, d[1] - r * 0.4, 0, d[0], d[1], r);
          gr.addColorStop(0, '#fbf8f4');
          gr.addColorStop(0.45, '#9c958d');
          gr.addColorStop(0.8, '#2a231d');
          gr.addColorStop(1, '#a3825f');
          c.fillStyle = gr;
          c.beginPath();
          c.arc(d[0], d[1], r, 0, TAU);
          c.fill();
        });
      c.strokeStyle = 'rgba(255,240,225,.12)';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(cx, cy, s / 2 - 0.5, 0, TAU);
      c.stroke();
    },
  },

  icon: {
    background: (p) =>
      `<defs><radialGradient id="${p}b" cx="34%" cy="26%" r="90%"><stop offset="0" stop-color="#43362b"/><stop offset=".55" stop-color="#1d1712"/><stop offset="1" stop-color="#0f0b09"/></radialGradient></defs><rect width="108" height="108" fill="url(#${p}b)"/>`,
    foreground: (p) =>
      `<defs><radialGradient id="${p}d" cx="42%" cy="38%" r="62%"><stop offset="0" stop-color="#c9c3bc"/><stop offset=".42" stop-color="#8e867e"/><stop offset=".72" stop-color="#1f1914"/><stop offset=".9" stop-color="#6b5440"/><stop offset="1" stop-color="#d3a46e"/></radialGradient><radialGradient id="${p}w" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fffaf2"/><stop offset=".6" stop-color="#fffaf2" stop-opacity=".9"/><stop offset="1" stop-color="#fffaf2" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="52.5" cy="59" rx="20" ry="4" fill="#000" opacity=".35"/><circle cx="50" cy="51" r="20" fill="url(#${p}d)"/><ellipse cx="42.5" cy="42" rx="6.4" ry="4.2" transform="rotate(-28 42.5 42)" fill="url(#${p}w)"/><path d="M36.5 62a16 16 0 0 0 25 1" fill="none" stroke="#e7c08e" stroke-width="1.1" opacity=".55" stroke-linecap="round"/>
      <circle cx="72.5" cy="67" r="5.2" fill="url(#${p}d)"/><ellipse cx="70.6" cy="65.1" rx="1.8" ry="1.2" transform="rotate(-28 70.6 65.1)" fill="#fffaf2" opacity=".9"/>`,
    monochrome: () =>
      '<path fill="currentColor" fill-rule="evenodd" d="M50 31a20 20 0 1 1 0 40a20 20 0 1 1 0-40zM42.5 37.8c-3.1 0-5.6 1.9-5.6 4.2s2.5 4.2 5.6 4.2 5.6-1.9 5.6-4.2-2.5-4.2-5.6-4.2z"/><circle cx="72.5" cy="67" r="5.2" fill="currentColor"/>',
    small: () =>
      '<path fill="currentColor" fill-rule="evenodd" d="M10.5 3.5a7.5 7.5 0 1 1 0 15a7.5 7.5 0 1 1 0-15zM8 6.6c-1.2 0-2.1.7-2.1 1.6s.9 1.6 2.1 1.6 2.1-.7 2.1-1.6-.9-1.6-2.1-1.6z"/><circle cx="19.2" cy="19.2" r="2.6" fill="currentColor"/>',
  },

  wordmark: (mode) =>
    `<span class="wm"><canvas class="mq mq-wm" data-kind="wm" data-mode="${mode}" aria-hidden="true"></canvas></span>`,
  tabs: { icon: mqTabIcon, scan: mqTabScan, badge: mqTabBadge },
  heroFigure(sen, mode, st) {
    return `<canvas class="mq" data-kind="fig" data-sen="${sen}" data-over="${st.over ? 1 : 0}" data-mode="${mode}" aria-hidden="true"></canvas>`;
  },
  strip(day, days) {
    return mqTube(day, days);
  },
  // a window's light across the stone, and a few stray beads near the figure
  decorate(root) {
    const off: (() => void)[] = [insertDecor(root, 'afterbegin', '<div class="room" aria-hidden="true"></div>')];
    const hero = root.querySelector('.hero');
    if (hero)
      off.push(
        insertDecor(
          hero,
          'beforeend',
          '<span class="beads" aria-hidden="true"><i style="right:18px;top:30px;--r:5px"></i><i style="right:6px;top:52px;--r:3px"></i><i style="right:34px;top:64px;--r:2px"></i></span>',
        ),
      );
    return allOf(...off);
  },
  // payday: the figure is poured out of the tube, and the column rises to its mark
  paydayFx(root) {
    if (reduced()) return;
    const cv = root.querySelector<MqCanvas>('.hero-fig canvas');
    if (cv) {
      if (cv._mq) cv._mq.pour = { t: null };
      else cv.dataset.pour = '1';
    }
    root.querySelector('.strip .col')?.classList.add('rise');
  },
  mount: mqMount,
  reveal: null,
};
export default DIR;
