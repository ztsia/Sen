/* Direction: Copper. Sen is named after the coin, and the one-sen coin was copper; it isn't minted
   any more. Copper browns, then greens, as it wears, and a polish brings it back. Here the patina is the
   money: the figure tarnishes as the cycle's money is spent and is green all over once it's overspent,
   each day's coin on the strip keeps the patina it had that day, and payday polishes everything bright.
   Sen is a coin, and the flip is its gesture. */

// ---------- the metal: a small WebGL shader for struck copper, with patina from noise ----------
const CU = { ok: null, gl: null, cv: null, u: {}, w: 0, h: 0, coinTex: null, light: [-0.62, -0.58, 0.53], tilt: [0, 0] };
const CU_FS = `precision highp float;
uniform vec2 uRes; uniform sampler2D uTex; uniform float uE, uT, uMode, uAge, uAgeX, uSpan, uPolish, uOver, uDark, uGlint, uBump, uNC;
uniform vec3 uL, uWarn; uniform vec4 uCoin[3]; uniform vec3 uSpin[3];
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
// copper, tarnished by age (0 polished, 1 old) with verdigris gathering in the recesses
vec3 metal(vec3 n, vec2 q, float age, float recess, float glint) {
  vec3 L = normalize(uL), H = normalize(L + vec3(0.0, 0.0, 1.0));
  float tar = smoothstep(0.0, 0.78, age); float nz = fbm(q);
  vec3 base = mix(vec3(0.96, 0.6, 0.43), mix(vec3(0.6, 0.33, 0.2), vec3(0.36, 0.2, 0.13), smoothstep(0.4, 1.0, age)), tar);
  base *= 0.88 + 0.24 * nz;
  float diff = max(dot(n, L), 0.0); float spec = pow(max(dot(n, H), 0.0), mix(60.0, 12.0, tar)) * mix(1.25, 0.3, tar);
  float sky = smoothstep(-0.6, 0.7, -n.y * 0.8 - n.x * 0.3);
  vec3 c = base * (0.16 + 0.68 * diff + 0.32 * sky) + vec3(1.0, 0.86, 0.74) * spec;
  float green = smoothstep(0.6, 0.78, nz * 0.6 + recess * 0.5 + age * 0.62 - 0.22) * smoothstep(0.3, 0.7, age);
  c = mix(c, vec3(0.34, 0.6, 0.51) * (0.5 + 0.5 * diff) + 0.04, green * 0.9);
  // overspent: green all over
  if (uOver > 0.5) c = mix(c, vec3(0.31, 0.58, 0.49) * (0.55 + 0.5 * diff) + 0.05 * nz, 0.94);
  c += vec3(1.0, 0.9, 0.78) * glint;
  return c;
}
float hT(vec2 px) { return texture2D(uTex, px / uRes).r; }
void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 L = normalize(uL);
  if (uMode < 0.5) {
    // struck letters on stone: flat tops, bevelled sides, a cast shadow
    float h = hT(px), hx = hT(px + vec2(uE, 0.0)), hy = hT(px + vec2(0.0, uE));
    float a = clamp((h - 0.5) / max(length(vec2(hx - h, hy - h)), 1e-4) + 0.5, 0.0, 1.0);
    vec3 n = normalize(vec3(-(hx - h) / uE * uBump, -(hy - h) / uE * uBump, 1.0));
    float x = px.x / uRes.x; float age = clamp(uAge + uAgeX * (px.x / uSpan - 0.5), 0.0, 1.0);
    float glint = 0.0; if (uPolish > -0.5) { glint = exp(-pow((x - uPolish) * 9.0, 2.0)) * 0.9; if (x < uPolish) age = 0.0; }
    vec3 col = metal(n, px / uE * 0.045, age, 1.0 - smoothstep(0.55, 0.92, h), glint + uGlint * exp(-pow((x - fract(uT * 0.18) * 1.6 + 0.3) * 6.0, 2.0)) * 0.35);
    float hs = hT(px + normalize(L.xy) * 2.4 * uE); float sh = smoothstep(0.42, 0.62, hs) * (0.22 + 0.14 * uDark) * (1.0 - a);
    gl_FragColor = vec4(col * a, a + sh);
    return;
  }
  // coins: each may be turned about its upright axis by an angle, showing its face, edge or reverse
  vec4 outc = vec4(0.0);
  for (int i = 0; i < 3; i++) {
    if (float(i) >= uNC) break;
    vec4 cn = uCoin[i]; vec3 sp = uSpin[i]; vec2 p = (px - cn.xy) / cn.z; float cs = cos(sp.x), sn = sin(sp.x);
    float e = sqrt(max(0.0, 1.0 - p.y * p.y)); float fw = e * abs(cs), T = 0.11;
    float side = sign(sn * cs + 1e-5);
    vec4 c = vec4(0.0);
    // the milled edge, seen as the coin turns
    float bx = p.x * side; if (abs(p.y) < 1.0 && bx > fw - 0.004 && bx < fw + T * abs(sn) && abs(sn) > 0.02) {
      float ridge = 0.6 + 0.4 * sin(p.y * 70.0); vec3 n = normalize(vec3(side * abs(sn), -p.y * 0.8, 0.25));
      vec3 col = metal(n, p * 30.0, cn.w, 0.6, 0.0) * ridge; c = vec4(col, 1.0) * clamp((fw + T * abs(sn) - bx) * cn.z / uE, 0.0, 1.0);
    }
    if (abs(cs) > 0.02) {
      float u = p.x / cs; float r2 = u * u + p.y * p.y;
      if (r2 < 1.0) {
        vec2 fuv = vec2(u, p.y) * 0.5 + 0.5; float k = 0.004; bool back = cs < 0.0;
        vec2 fs = back ? vec2(1.0 - fuv.x, fuv.y) : fuv;
        float h = back ? texture2D(uTex, fs).g : texture2D(uTex, fs).r;
        float hx = back ? texture2D(uTex, fs + vec2(k, 0.0)).g : texture2D(uTex, fs + vec2(k, 0.0)).r;
        float hy = back ? texture2D(uTex, fs + vec2(0.0, k)).g : texture2D(uTex, fs + vec2(0.0, k)).r;
        vec3 nf = normalize(vec3(-(hx - h) * 9.0 * (back ? -1.0 : 1.0), -(hy - h) * 9.0, 1.0));
        vec3 n = normalize(vec3(nf.x * cs + nf.z * sn, nf.y, -nf.x * sn + nf.z * cs));
        // a coin's lustre: highlights that wheel around its centre as the light moves
        float ang = atan(p.y, u); float wheel = pow(abs(cos(ang - atan(L.y, L.x))), 10.0) * 0.22 * (1.0 - smoothstep(0.2, 0.8, cn.w)) * step(h, 0.4);
        float glint = sp.y * exp(-pow((u + p.y) * 0.7 - (fract(uT * 0.45) * 3.2 - 1.6), 2.0) * 18.0);
        vec3 col = metal(n, fs * 26.0 + float(i) * 7.0, cn.w, (1.0 - smoothstep(0.3, 0.75, h)) * 0.55, glint) + wheel;
        float a = clamp((1.0 - sqrt(r2)) * cn.z * abs(cs) / uE + 0.5, 0.0, 1.0);
        c = mix(c, vec4(col, 1.0), a);
      }
    }
    outc = mix(outc, c, c.a);
  }
  gl_FragColor = vec4(outc.rgb * outc.a, outc.a);
}`;
function cuInit() {
  if (CU.ok !== null) return CU.ok;
  try {
    const cv = document.createElement('canvas'); const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return (CU.ok = false);
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}')); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, CU_FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uTex', 'uE', 'uT', 'uMode', 'uAge', 'uAgeX', 'uSpan', 'uPolish', 'uOver', 'uDark', 'uGlint', 'uBump', 'uNC', 'uL', 'uWarn', 'uCoin', 'uSpin'].forEach((k) => { CU.u[k] = gl.getUniformLocation(pr, k); });
    CU.gl = gl; CU.cv = cv; CU.coinTex = cuTexture(cuCoinFaces());
    // strike the faces again once the legend's typeface has loaded
    document.fonts.load(`700 100px ${CU_FAM}`).then(() => { CU.coinTex = cuTexture(cuCoinFaces()); }).catch(() => {});
    return (CU.ok = true);
  } catch (e) { console.warn('Copper falls back to 2D:', e.message); return (CU.ok = false); }
}
function cuTexture(src) {
  const gl = CU.gl; const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); return t;
}
// the two faces as height maps: red is the obverse (rim, beads, SEN), green the reverse (rim, beads, a turned field)
function cuCoinFaces() {
  const N = 512, c = N / 2; const face = (draw) => { const cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.filter = 'blur(2.2px)'; draw(g); return g.getImageData(0, 0, N, N).data; };
  const common = (g) => {
    g.fillStyle = 'rgb(70,70,70)'; g.beginPath(); g.arc(c, c, c * 0.995, 0, TAU); g.fill();
    g.strokeStyle = 'rgb(255,255,255)'; g.lineWidth = c * 0.1; g.beginPath(); g.arc(c, c, c * 0.93, 0, TAU); g.stroke();
    g.fillStyle = 'rgb(200,200,200)'; for (let i = 0; i < 72; i++) { const a = (i / 72) * TAU; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.79, c + Math.sin(a) * c * 0.79, c * 0.022, 0, TAU); g.fill(); }
  };
  const ob = face((g) => { common(g); g.fillStyle = 'rgb(225,225,225)'; g.font = `700 ${Math.round(N * 0.2)}px Archivo, system-ui, sans-serif`; g.fontStretch = 'expanded'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SEN', c, c + N * 0.01); });
  const rv = face((g) => { common(g); g.strokeStyle = 'rgb(110,110,110)'; g.lineWidth = 1.2; for (let r = 0.1; r < 0.72; r += 0.035) { g.beginPath(); g.arc(c, c, c * r, 0, TAU); g.stroke(); } g.fillStyle = 'rgb(220,220,220)'; g.beginPath(); g.arc(c, c, c * 0.07, 0, TAU); g.fill(); });
  const img = new ImageData(N, N); for (let i = 0; i < N * N; i++) { img.data[i * 4] = ob[i * 4]; img.data[i * 4 + 1] = rv[i * 4]; img.data[i * 4 + 3] = 255; }
  return img;
}
// render into a 2D context. o: {mode: 0 text | 1 coins, tex, age, ageX, polish, over, dark, glint, bump, coins: [[x, y, r, age, angle, glint]] css px, t}
function cuDraw(dst, w, h, dpr, o) {
  const gl = CU.gl; const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
  if (W > CU.w || H > CU.h) { CU.w = Math.max(W, CU.w); CU.h = Math.max(H, CU.h); CU.cv.width = CU.w; CU.cv.height = CU.h; }
  gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); const u = CU.u;
  const L = cuLight(o.t || 0);
  gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uE, dpr); gl.uniform1f(u.uT, o.t || 0); gl.uniform1f(u.uMode, o.mode || 0); gl.uniform1f(u.uAge, o.age || 0); gl.uniform1f(u.uAgeX, o.ageX || 0); gl.uniform1f(u.uSpan, (o.span || w) * dpr);
  gl.uniform1f(u.uPolish, o.polish === undefined ? -1 : o.polish); gl.uniform1f(u.uOver, o.over ? 1 : 0); gl.uniform1f(u.uDark, o.dark ? 1 : 0); gl.uniform1f(u.uGlint, o.glint || 0); gl.uniform1f(u.uBump, (o.bump || 4) * dpr);
  gl.uniform3fv(u.uL, L); gl.uniform3fv(u.uWarn, o.warn || [0.8, 0.45, 0.1]);
  const C = new Float32Array(12), S = new Float32Array(9); (o.coins || []).slice(0, 3).forEach((q, i) => { C.set([q[0] * dpr, q[1] * dpr, q[2] * dpr, q[3]], i * 4); S.set([q[4] || 0, q[5] || 0, 0], i * 3); });
  gl.uniform4fv(u.uCoin, C); gl.uniform3fv(u.uSpin, S); gl.uniform1f(u.uNC, (o.coins || []).length);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, o.mode ? CU.coinTex : o.tex); gl.uniform1i(u.uTex, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  dst.drawImage(CU.cv, 0, CU.h - H, W, H, 0, 0, w, h);
}
// the light rakes in from the upper left and drifts; tilting the phone, or moving a pointer over it, moves it
function cuLight(t) {
  const az = -2.36 + 0.32 * Math.sin(t * 0.37) + CU.tilt[0] * 0.9, el = 0.62 + 0.12 * Math.sin(t * 0.23) + CU.tilt[1] * 0.4;
  return [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)];
}
const CU_WARN = { light: [0.72, 0.38, 0.04], dark: [0.98, 0.62, 0.3] };

// ---------- struck figures: Home's figure, the type specimen and the title ----------
const CF = { set: new Set(), loop: false, t0: 0, wired: false };
const CU_FAM = 'Archivo, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
function cuLayout(cv) {
  const kind = cv.dataset.kind, W = Math.max(60, cv.clientWidth || 350); const g = document.createElement('canvas').getContext('2d'); let size, parts = [], H, base;
  const font = (wt, px) => `${wt} ${px}px ${CU_FAM}`;
  if (kind === 'fig') {
    const p = rmParts(+cv.dataset.sen); size = 56;
    for (let k = 0; k < 12; k++) { g.font = font(600, Math.round(size * 0.36)); g.fontStretch = 'semi-expanded'; const wc = g.measureText('RM').width; g.font = font(600, size); g.fontStretch = 'semi-expanded'; const wn = g.measureText(`${p.whole}.${p.cents}`).width; if (wc + 8 + wn <= W - 14 || size < 30) { parts = [{ t: 'RM', font: font(600, Math.round(size * 0.36)), x: 6 }, { t: `${p.whole}.${p.cents}`, font: font(600, size), x: 6 + wc + 8 }]; break; } size -= 3; }
    H = Math.round(size * 1.14); base = Math.round(size * 0.9);
  } else { size = Math.round(Math.min(92, Math.max(56, W * 0.15))); parts = [{ t: cv.dataset.text, font: font(700, size), x: 6 }]; H = Math.round(size * 1.18); base = Math.round(size * 0.9); }
  g.font = parts[parts.length - 1].font; g.fontStretch = 'semi-expanded'; const span = parts[parts.length - 1].x + g.measureText(parts[parts.length - 1].t).width;
  return { W, H, size, parts, base, span };
}
function cuPrepare(cv) {
  const L = cuLayout(cv); const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(L.W * dpr); cv.height = Math.round(L.H * dpr); cv.style.height = L.H + 'px';
  // a height map: the glyphs softened at their edges, so they stand like struck relief
  const m = document.createElement('canvas'); m.width = cv.width; m.height = cv.height; const g = m.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, m.width, m.height); g.scale(dpr, dpr); g.filter = `blur(${Math.max(0.6, L.size * 0.022)}px)`; g.fillStyle = '#fff';
  L.parts.forEach((q) => { g.font = q.font; g.fontStretch = 'semi-expanded'; g.fillText(q.t, q.x, L.base); });
  cv._cu = Object.assign(L, { dpr, mask: m, tex: null, polish: cv.dataset.polish ? { t: null } : null, fallback: !cuInit() });
}
function cuDrawFig(cv, t) {
  const F = cv._cu; if (!F) return; const g = cv.getContext('2d'); const mode = cv.dataset.mode === 'page' ? pageMode() : cv.dataset.mode; const over = cv.dataset.over === '1';
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(F.dpr, 0, 0, F.dpr, 0, 0);
  if (F.fallback) { const gr = g.createLinearGradient(0, 0, 0, F.H); gr.addColorStop(0, '#f0b48c'); gr.addColorStop(0.5, '#b4643c'); gr.addColorStop(1, '#6e3720'); g.fillStyle = over ? getComputedStyle(cv).getPropertyValue('--money-warning') : gr; F.parts.forEach((q) => { g.font = q.font; g.fillText(q.t, q.x, F.base); }); return; }
  if (!F.tex) F.tex = cuTexture(F.mask);
  const o = { mode: 0, tex: F.tex, t, dark: mode === 'dark', over, warn: CU_WARN[mode], bump: F.size * 0.1, age: +cv.dataset.age || 0, ageX: +cv.dataset.agex || 0, span: F.span, glint: 1 };
  // payday: a polish sweeps across and takes the old cycle's tarnish with it
  if (F.polish && !REDUCED) { if (F.polish.t === null) F.polish.t = t; const k = (t - F.polish.t) / 1.5; if (k < 1.25) { o.polish = k * 1.25 - 0.1; o.age = 0.92; } else F.polish = null; }
  cuDraw(g, F.W, F.H, F.dpr, o);
}
function cuMount(root) {
  root.querySelectorAll('canvas.cu').forEach((cv) => {
    if (cv._m) return; cv._m = true; CF.set.add(cv);
    Promise.all([document.fonts.load(`600 56px ${CU_FAM}`), document.fonts.load(`700 80px ${CU_FAM}`)]).catch(() => {}).then(() => { if (cv.isConnected) { cuPrepare(cv); if (REDUCED) cuDrawFig(cv, 2); } });
  });
  if (!CF.wired) {
    CF.wired = true;
    // the glint follows a pointer over a phone, and the phone's own tilt where it reports one
    addEventListener('pointermove', (e) => { const ph = e.target.closest && e.target.closest('.phone, .pg-head, .spec'); if (!ph) return; const r = ph.getBoundingClientRect(); CU.tilt = [((e.clientX - r.left) / r.width - 0.5) * 1.2, ((e.clientY - r.top) / r.height - 0.5) * -0.8]; });
    addEventListener('deviceorientation', (e) => { if (e.gamma === null) return; CU.tilt = [Math.max(-1, Math.min(1, e.gamma / 35)), Math.max(-1, Math.min(1, (e.beta - 40) / -45))]; });
  }
  if (!CF.loop) {
    CF.loop = true; CF.t0 = performance.now(); let last = 0;
    const step = (now) => { if (now - last > 32) { last = now; const t = (now - CF.t0) / 1000; for (const cv of CF.set) { if (!cv.isConnected) { CF.set.delete(cv); continue; } if (!REDUCED) cuDrawFig(cv, t); } } requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
}

// ---------- the strip: a coin a day, each keeping the patina of the money spent by then ----------
let CU_N = 0;
// the patina for a share of the cycle's money spent: bright, then brown, then green
function cuAgeColor(a) {
  const stops = [[0, [222, 142, 96]], [0.4, [178, 104, 64]], [0.7, [130, 74, 44]], [0.9, [104, 100, 76]], [1, [86, 152, 132]]];
  for (let i = 1; i < stops.length; i++) if (a <= stops[i][0]) { const [a0, c0] = stops[i - 1], [a1, c1] = stops[i]; const k = (a - a0) / (a1 - a0); return c0.map((v, j) => Math.round(v + (c1[j] - v) * k)); }
  return stops[stops.length - 1][1];
}
// the cycle's spending so far, day by day (the pace chart's figures, scaled to this state)
function cuSpentByDay(st) { if (!st || !st.spent) return []; const last = DATA.thisCycle[DATA.thisCycle.length - 1]; return DATA.thisCycle.map((v) => Math.round(v * st.spent / last)); }
function cuStrip(day, days, st) {
  const W = 350, H = 22, y = 11, x = (d) => 6 + ((d - 1) / (days - 1)) * (W - 14), r = 4.3; const id = `cu${++CU_N}`; let defs = '', s = '';
  const spent = cuSpentByDay(st);
  const coin = (cx, rr, share, key) => {
    const c = cuAgeColor(Math.min(1, share)); const hi = c.map((v) => Math.min(255, v + 46)), lo = c.map((v) => Math.round(v * 0.62));
    defs += `<radialGradient id="${id}-${key}" cx="36%" cy="32%" r="75%"><stop offset="0" stop-color="rgb(${hi})"/><stop offset=".55" stop-color="rgb(${c})"/><stop offset="1" stop-color="rgb(${lo})"/></radialGradient>`;
    return `<circle cx="${cx}" cy="${y}" r="${rr}" fill="url(#${id}-${key})"/><circle cx="${cx}" cy="${y}" r="${f2(rr - 0.9)}" fill="none" stroke="rgb(${lo})" stroke-width=".5" opacity=".7"/>`;
  };
  for (let d = 1; d <= days; d++) {
    const cx = f2(x(d));
    if (d < day) s += coin(cx, r, (spent[d - 1] || 0) / DATA.income, d);
    else if (d > day) s += `<circle cx="${cx}" cy="${y}" r="${d === days ? r + 0.6 : r - 0.6}" fill="none" stroke="var(--blank)" stroke-width="${d === days ? 1.1 : 0.8}"${d === days ? '' : ' stroke-dasharray="1.2 1.1"'}/>`;
  }
  // today: the newest coin, with the figure's own patina, catching the light
  const tx = f2(x(day)); s += coin(tx, r + 1.6, (st && st.spent ? st.spent : 0) / DATA.income, 'now');
  s += `<rect x="${f2(+tx - 7)}" y="${y - 7}" width="3" height="14" fill="#fff" opacity=".85" class="shine" transform="rotate(28 ${tx} ${y})" clip-path="url(#${id}-c)"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true" style="overflow:visible"><defs>${defs}<clipPath id="${id}-c"><circle cx="${tx}" cy="${y}" r="${r + 1.6}"/></clipPath></defs>${s}</svg>`;
}

// ---------- Sen: a coin, and the flip is its gesture ----------
// one flip every `period` seconds, lasting `dur`: angle (turns about its upright axis) and lift, with a small bounce on landing
function cuFlip(t, period, dur, turns, height, phase = 0) {
  const k = ((t + phase) % period) / dur;
  if (k < 1) { const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; return { a: e * turns * TAU, lift: Math.sin(Math.PI * k) * height, k }; }
  const b = (k - 1) * dur / 0.32; return { a: 0, lift: b < 1 ? height * 0.1 * Math.sin(Math.PI * b) * (1 - b) : 0, k };
}
// the coins to draw: [x, y, r, patina, angle, glint, lift]; patina is the cycle's money spent (1 when overspent)
function cuCoins(s, t, st, age) {
  const c = s / 2, R = s * 0.34;
  if (st === 'resting') { const f = cuFlip(t, 10, 1.6, 1, s * 0.04, 4); return [[c, c, R, age, f.a, 0.5, f.lift]]; }
  if (st === 'note') { const f = cuFlip(t, 3.2, 0.9, 2, s * 0.15); return [[c, c, R, age, f.a, f.k > 1 && f.k < 1.8 ? 1 : 0.3, f.lift]]; }
  if (st === 'listening') return [[c, c, R * 1.04, Math.min(age, 0.15), 0, 0.9, 0]];
  if (st === 'thinking') { const w = Math.sin(t * 9); return [[c, c + s * 0.008 * w, R * (1 + 0.015 * w), age, t * 5 + 0.6 * Math.sin(t * 1.3), 0.4, 0]]; }
  if (st === 'helpers') { const out = [[c, c, R * 0.82, age, t * 2.2, 0.4, 0]]; for (let h = 0; h < 2; h++) { const a = t * 0.9 + h * Math.PI; out.push([c + Math.cos(a) * s * 0.33, c + Math.sin(a) * s * 0.33, s * 0.1, Math.min(age, 0.3), t * 3.4 + h, 0.3, 0]); } return out; }
  if (st === 'speaking') return [[c, c, R, age, 0.38 * Math.sin(t * 6.5) * Math.abs(Math.sin(t * 2.1)), 0.5, 0]];
  if (st === 'paused') return [[c, c, R, 1, 0, 0, 0]];
  if (st === 'done') { const f = cuFlip(t, 3.2, 0.7, 1, s * 0.1); return [[c, c, R, Math.min(age, 0.2), f.a, f.k > 1 && f.k < 2 ? 1.3 : 0.3, f.lift]]; }
  return [[c, c, R, age, 0, 0.4, 0]];
}

// ---------- the tab bar: icons carved into the stone; the active one struck in polished copper ----------
// carved in limestone, a cut reads darker with a lit lower lip; cut into dark stone, it reads lighter, the way letters in slate do
const CU_TAB = {
  light: { cut: 'rgba(52,40,32,.66)', lip: 'rgba(255,255,255,.9)', lipAt: [0.4, 0.5], deep: null, shade: 'rgba(30,18,10,.32)' },
  dark: { cut: '#8b9692', lip: 'rgba(0,0,0,.5)', lipAt: [-0.3, -0.35], deep: 'rgba(0,0,0,.4)', shade: 'rgba(0,0,0,.55)' },
};
const cuMetal = (id, x1 = 3, y1 = 3, x2 = 21, y2 = 21) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#ffdabe"/><stop offset=".32" stop-color="#e3986a"/><stop offset=".64" stop-color="#b0633b"/><stop offset="1" stop-color="#7a3f22"/></linearGradient>`;
const cuCoinFill = (id) => `<radialGradient id="${id}" cx="34%" cy="28%" r="80%"><stop offset="0" stop-color="#f7c3a0"/><stop offset=".38" stop-color="#d98b5c"/><stop offset=".74" stop-color="#a9592f"/><stop offset="1" stop-color="#6e3720"/></radialGradient>`;
function cuCarve(k, c, w) {
  const S = TAB_SK[k]; const [lx, ly] = c.lipAt; const st = (d, col, sw, tr) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${tr ? ` transform="translate(${tr})"` : ''}/>`;
  if (S.dots) return S.dots.map(([x, y]) => `<circle cx="${x + lx}" cy="${y + ly}" r="1.75" fill="${c.lip}"/><circle cx="${x}" cy="${y}" r="1.7" fill="${c.cut}"/>`).join('');
  const d = S.d.join(''); return st(d, c.lip, w + 0.15, `${lx} ${ly}`) + st(d, c.cut, w) + (c.deep ? st(d, c.deep, w * 0.42, '-.25 -.3') : '');
}
function cuTabIcon(k, on, mode, u) {
  const c = CU_TAB[mode], S = TAB_SK[k];
  if (!on) return svgTag('0 0 24 24', 24, 24, cuCarve(k, c, 1.75));
  // active: struck in relief, with a cast shadow, the copper itself and a bright edge where the light rakes it
  if (S.dots) return svgTag('0 0 24 24', 24, 24, `<defs>${cuCoinFill(`${u}c`)}</defs>${S.dots.map(([x, y]) => `<circle cx="${x + 0.45}" cy="${y + 0.7}" r="2.35" fill="${c.shade}"/><circle cx="${x}" cy="${y}" r="2.35" fill="url(#${u}c)"/><circle cx="${x}" cy="${y}" r="1.85" fill="none" stroke="#5a2d18" stroke-width=".35" opacity=".6"/>`).join('')}`);
  const d = S.d.join('');
  return svgTag('0 0 24 24', 24, 24, `<defs>${cuMetal(`${u}m`)}</defs><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="${c.shade}" stroke-width="2.4" transform="translate(.5 .8)"/><path d="${d}" stroke="url(#${u}m)" stroke-width="2.15"/><path d="${d}" stroke="rgba(255,244,232,.85)" stroke-width=".5" transform="translate(-.38 -.42)"/></g>`);
}
// the scan button: a coin with a milled edge, the scan mark stamped into it
function cuTabScan(mode, u) {
  const d = TAB_SK.scan.d.join('');
  return svgTag('0 0 52 52', 52, 52, `<defs>${cuCoinFill(`${u}c`)}</defs><circle cx="26" cy="26" r="24" fill="url(#${u}c)"/><circle cx="26" cy="26" r="23" fill="none" stroke="rgba(60,25,10,.42)" stroke-width="1.7" stroke-dasharray=".7 .8"/><circle cx="26" cy="26" r="20.6" fill="none" stroke="rgba(255,226,200,.45)" stroke-width=".6"/><circle cx="26" cy="26" r="20" fill="none" stroke="rgba(80,35,15,.35)" stroke-width=".6"/><g transform="translate(14 14)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="rgba(255,225,200,.6)" stroke-width="2" transform="translate(.4 .5)"/><path d="${d}" stroke="#5c2c16" stroke-width="1.9"/></g>`, 'sb');
}
// the review count on a smaller coin, which stretches into a bar of copper for wider counts (99+)
function cuTabBadge(n, mode, u) {
  const text = String(n); const W = 21 + Math.max(0, text.length - 1) * 6.2;
  return `${svgTag(`0 0 ${f2(W)} 21`, f2(W), 21, `<defs>${cuCoinFill(`${u}c`)}</defs><rect x=".5" y=".5" width="${f2(W - 1)}" height="20" rx="10" fill="url(#${u}c)"/><rect x="1.1" y="1.1" width="${f2(W - 2.2)}" height="18.8" rx="9.4" fill="none" stroke="rgba(60,25,10,.45)" stroke-width="1" stroke-dasharray=".55 .6"/>`)}<b style="color:#2a1208">${text}</b>`;
}

const DIR = {
  id: 'copper', name: 'Copper', title: 'Sen Copper',
  fonts: 'https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&display=swap',
  titleHTML: '<span class="vh">Copper</span><canvas class="cu cu-title" data-kind="title" data-text="Copper" data-mode="page" data-age=".55" data-agex="1.25" aria-hidden="true"></canvas>',
  lede: 'Sen is named after the coin, and the one-sen coin was copper; it isn’t minted any more. Copper browns and then greens as it wears, and a polish brings it back. Here the patina is your money. The figure is struck in copper and tarnishes as the cycle’s money is spent, green all over once you’re over. Each day’s coin on the strip keeps the patina it had that day, and payday polishes everything bright.',
  meta: 'Light is copper on pale limestone. Dark is the same coin on green-black stone.',
  senIntro: 'Sen is a copper coin, struck with its name, and no face, wearing the same patina as your money. The flip is its gesture. It lies still while the light drifts across it, and turns over now and then. With a note, it tosses itself every few seconds. It spins on its edge while it works, sends smaller coins out to its helpers, rocks as it answers, goes green when paused, and flips once, cleanly, when a change goes through.',
  iconIntro: 'A coin, turned a little so its milled edge shows, polished on one side and green with patina on the other: a cycle’s money, from payday to the last of it, on one sen. The themed and notification icons keep the turned coin and its edge.',
  tabsIntro: 'Idle icons are carved into the stone; the active one is struck in polished copper, with a press and a flash, like a die striking a blank. The scan button is a coin with a milled edge, and the review count sits on a smaller one. The tabs stay bright: patina is kept for money spent.',
  themeIntro: 'Copper on pale limestone by day, and on green-black stone by night.',
  typeNote: { display: 'Archivo, semi-expanded and semibold, struck in copper for the figure and the title', ui: 'Archivo for everything you read and tap, at its normal width, with tabular figures in columns.', voice: 'Sen writes in Archivo italic, plain, like the legend on a coin.' },
  radius: '0.75rem',
  // every icon outside the tab bar is lucide, in this look's colour (the icon token), weight and line ends (D81): carved: a chisel stops square, the turns stay round
  icons: { weight: 1.8, cap: 'butt', join: 'round' },
  tokens: {
    light: {
      background: '#e7e8e3', foreground: '#211a16', card: '#f3f4f0', 'card-foreground': '#211a16', popover: '#f6f7f3', 'popover-foreground': '#211a16',
      primary: '#8b4526', 'primary-foreground': '#fbf6f1', secondary: '#dcddd6', 'secondary-foreground': '#211a16', muted: '#dfe0da', 'muted-foreground': '#5f5a54',
      accent: '#e0ddd5', 'accent-foreground': '#211a16', destructive: '#b3261e', border: '#d3d4cc', input: '#c5c6bd', ring: '#8b4526',
      'chart-accent': '#6a2816', 'chart-context': '#b3b1a8',
      'money-in': '#146c45', 'money-out': '#211a16', 'money-pending': '#67625b', 'money-warning': '#9a5300', icon: '#5f5a54',
    },
    dark: {
      background: '#111816', foreground: '#ece5dc', card: '#18211f', 'card-foreground': '#ece5dc', popover: '#1c2523', 'popover-foreground': '#ece5dc',
      primary: '#e2976a', 'primary-foreground': '#111816', secondary: '#1f2927', 'secondary-foreground': '#ece5dc', muted: '#1b2422', 'muted-foreground': '#9aa5a1',
      accent: '#22302d', 'accent-foreground': '#ece5dc', destructive: '#ff8a7a', border: '#26322f', input: '#33413d', ring: '#e2976a',
      'chart-accent': '#ad7d64', 'chart-context': '#4f5d59',
      'money-in': '#62cf96', 'money-out': '#ece5dc', 'money-pending': '#94a09c', 'money-warning': '#f2ad5e', icon: '#9aa5a1',
    },
  },
  extra: {
    light: { 'warn-bg': '#f5e0da', 'warn-fg': '#8a1c14', checker: 'rgba(33,26,22,.06)', blank: 'rgba(33,26,22,.32)', patina: '#5c9c88', 'fab-bg': '#16201e' },
    dark: { 'warn-bg': '#3b1c16', 'warn-fg': '#ffb4a6', checker: 'rgba(236,229,220,.06)', blank: 'rgba(236,229,220,.3)', patina: '#6fb39d', 'fab-bg': '#16201e' },
  },
  wall: 'linear-gradient(162deg,#7c9a91 0%,#3f5a54 46%,#1a2422 100%)',

  avatar: {
    draw(c, s, t, st) {
      const cx = s / 2, cy = s / 2; const dpr = c.canvas.width / s;
      const g = c.createRadialGradient(s * 0.36, s * 0.28, 0, cx, cy, s * 0.72); g.addColorStop(0, '#2c3d39'); g.addColorStop(0.6, '#17221f'); g.addColorStop(1, '#0d1412');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, s / 2, 0, TAU); c.fill();
      // its patina is the money: a phone's own state, or a little wear on this page
      const scr = c.canvas.closest && c.canvas.closest('.screen'); const age = scr && scr.dataset.patina ? +scr.dataset.patina : 0.3; const over = !!(scr && scr.dataset.over === '1') && st !== 'paused';
      const coins = cuCoins(s, t, st, age);
      c.save(); c.beginPath(); c.arc(cx, cy, s / 2, 0, TAU); c.clip();
      // a soft shadow where each coin lies, smaller and fainter as it lifts
      coins.forEach((q) => { const k = 1 - Math.min(1, q[6] / (s * 0.18)); const sx = q[0] + q[2] * 0.12, sy = q[1] + q[2] * 0.16; const sg = c.createRadialGradient(sx, sy, 0, sx, sy, q[2] * (1.05 - 0.15 * (1 - k))); sg.addColorStop(0, `rgba(0,0,0,${0.45 * k})`); sg.addColorStop(0.7, `rgba(0,0,0,${0.2 * k})`); sg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, q[2] * 1.05, 0, TAU); c.fill(); });
      const drawn = coins.map((q) => [q[0], q[1] - q[6], q[2] * (1 + q[6] / s * 0.5), q[3], q[4], q[5]]);
      if (cuInit()) cuDraw(c, s, s, dpr, { mode: 1, coins: drawn, t, dark: true, over });
      else drawn.forEach((q) => { const sx = Math.max(0.08, Math.abs(Math.cos(q[4]))); const gr = c.createRadialGradient(q[0] - q[2] * 0.3, q[1] - q[2] * 0.35, 0, q[0], q[1], q[2]); gr.addColorStop(0, '#ffd9bd'); gr.addColorStop(0.5, '#c46e42'); gr.addColorStop(1, '#6e3720'); c.fillStyle = gr; c.beginPath(); c.ellipse(q[0], q[1], q[2] * sx, q[2], 0, 0, TAU); c.fill(); });
      c.restore();
      c.strokeStyle = 'rgba(236,229,220,.12)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, s / 2 - 0.5, 0, TAU); c.stroke();
    },
  },

  icon: {
    background: (p) => `<defs><radialGradient id="${p}b" cx="34%" cy="26%" r="92%"><stop offset="0" stop-color="#34483f"/><stop offset=".55" stop-color="#172220"/><stop offset="1" stop-color="#0c1311"/></radialGradient></defs><rect width="108" height="108" fill="url(#${p}b)"/>`,
    foreground: (p) => `<defs><linearGradient id="${p}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd8bb"/><stop offset=".3" stop-color="#df915e"/><stop offset=".52" stop-color="#a65a33"/><stop offset=".7" stop-color="#7a5b43"/><stop offset=".86" stop-color="#5f9a86"/><stop offset="1" stop-color="#4c8574"/></linearGradient><linearGradient id="${p}e" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5b3220"/><stop offset=".5" stop-color="#9a5634"/><stop offset="1" stop-color="#3f5f55"/></linearGradient><pattern id="${p}m" width="1.6" height="108" patternUnits="userSpaceOnUse"><rect width=".8" height="108" fill="#000" opacity=".28"/></pattern></defs>
      <ellipse cx="57.5" cy="56" rx="21" ry="25" fill="url(#${p}e)"/><ellipse cx="57.5" cy="56" rx="21" ry="25" fill="url(#${p}m)"/>
      <ellipse cx="53" cy="55" rx="21" ry="25" fill="url(#${p}f)"/><ellipse cx="53" cy="55" rx="17.6" ry="21" fill="none" stroke="#5a2f1c" stroke-opacity=".45" stroke-width="1.2"/><ellipse cx="53" cy="55" rx="15.4" ry="18.4" fill="none" stroke="#fff3e6" stroke-opacity=".35" stroke-width=".7" stroke-dasharray=".9 1.4"/>
      <path d="M41 44c3-6 9-9 15-9" fill="none" stroke="#fff6ec" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>`,
    monochrome: () => '<path fill="currentColor" d="M54 30h6c9 0 16 11.2 16 25S69 80 60 80h-6c9 0 16-11.2 16-25S63 30 54 30z" opacity=".6"/><path fill="currentColor" fill-rule="evenodd" d="M54 30c9 0 16 11.2 16 25S63 80 54 80 38 68.8 38 55s7-25 16-25zm0 4.6c-6.6 0-11.6 9.1-11.6 20.4S47.4 75.4 54 75.4 65.6 66.3 65.6 55 60.6 34.6 54 34.6z"/><ellipse cx="54" cy="55" rx="8.6" ry="15.6" fill="currentColor"/>',
    small: () => '<path fill="currentColor" d="M11.4 3h2.4c3.4 0 6 4 6 9s-2.6 9-6 9h-2.4c3.4 0 6-4 6-9s-2.6-9-6-9z" opacity=".65"/><path fill="currentColor" fill-rule="evenodd" d="M11.4 3c3.4 0 6 4 6 9s-2.6 9-6 9-6-4-6-9 2.6-9 6-9zm0 2c-2.2 0-4 3.1-4 7s1.8 7 4 7 4-3.1 4-7-1.8-7-4-7z"/><ellipse cx="11.4" cy="12" rx="2.3" ry="4.6" fill="currentColor"/>',
  },

  wordmark: () => '<span class="wm">sen</span>',
  tabs: { icon: cuTabIcon, scan: cuTabScan, badge: cuTabBadge },
  heroFigure(sen, mode, st) { const age = st && st.spent ? Math.min(1, st.spent / DATA.income) : 0; return `<canvas class="cu" data-kind="fig" data-sen="${sen}" data-over="${st && st.over ? 1 : 0}" data-age="${f2(age)}" data-mode="${mode}" aria-hidden="true"></canvas>`; },
  strip(day, days, mode, st) { return cuStrip(day, days, st); },
  decorate(screen, mode, key) {
    // Sen's coin wears the same patina as the figure; overspent, the label keeps the warning colour and its icon
    const st = STATE_VIEW[key] || {}; screen.dataset.patina = f2(Math.min(1, (st.spent || 0) / DATA.income)); screen.dataset.over = st.over ? '1' : '0';
    if (st.over) { const l = screen.querySelector('.hero-lbl'); if (l) l.insertAdjacentHTML('afterbegin', ico('alert', 'warn-ic')); }
    cuMount(screen);
  },
  paydayFx(screen) { if (REDUCED) return; const cv = screen.querySelector('.hero-fig canvas'); if (!cv) return; if (cv._cu) cv._cu.polish = { t: null }; else cv.dataset.polish = '1'; },
  afterBoot(pg) { cuMount(pg); },

  good: [
    'The closest tie to the name: Sen is the coin, and copper is what it was made of.',
    'The money is in the material. The figure tarnishes as the cycle’s money goes and is green all over once you’re over, so you see how much is gone before you read a digit. The strip shows the day it went, and payday’s polish is a small ritual of its own.',
    'Tactile and warm without gold: copper reads as craft and use, not luxury. In the app the light follows the phone’s tilt, so the figure feels struck rather than printed; on this page, drag across a phone to move it.',
  ],
  weigh: [
    'It’s a coin idea again, like Minted’s milled edge. The two differ in material and colour, warm struck metal against cool engraved paper, but they share the mint.',
    'Two colours need care. Green means money in everywhere else in Sen, and here verdigris means money spent: a bluer green, only ever on copper, but a second meaning to learn. And copper sits close to the warning orange, so a warning always carries its icon and words, like the overspent label.',
    'The struck figure and the spinning coin need WebGL, like Mercury’s. Without it they fall back to a painted coin and a typeset figure.',
  ],
};
