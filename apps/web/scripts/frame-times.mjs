#!/usr/bin/env node
// Measures how smoothly each look draws (B01, done-when 9): the gallery's top screen (four large
// figures, their strips, Sen's button and the tab bar) at 390×844 in Chromium, with the CPU slowed
// 4× to stand in for a phone. It records every animation frame for 6 seconds and prints the median
// and 95th-percentile frame time and the share of frames over 33 ms (below 30 fps).
//   pnpm exec vite build && pnpm exec vite preview --port 4173 &   then
//   node scripts/frame-times.mjs [http://localhost:4173] [looks...]
// In a cloud session WebGL runs on SwiftShader, a software renderer, so Mercury and Copper measure
// slower here than on a phone's GPU: read these as an upper bound.
import { chromium } from '@playwright/test';

const base = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:4173';
const looks = process.argv.slice(process.argv[2]?.startsWith('http') ? 3 : 2);
const LOOKS = looks.length ? looks : ['minted', 'mercury', 'copper'];

// FRAME_RATE_CPU=1 measures without the slowdown, to tell the renderer's cost from the CPU's
const RATE = Number(process.env.FRAME_RATE_CPU ?? 4);
const browser = await chromium.launch();
const rows = [];
for (const look of LOOKS)
  for (const mode of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const cdp = await page.context().newCDPSession(page);
    await page.goto(`${base}/dev/gallery?look=${look}&mode=${mode}`);
    await page.waitForTimeout(2500); // fonts, the look's module, shaders
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
    const times = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const t = [];
          let last = performance.now();
          const end = last + 6000;
          const step = (now) => {
            t.push(now - last);
            last = now;
            if (now < end) requestAnimationFrame(step);
            else resolve(t);
          };
          requestAnimationFrame(step);
        }),
    );
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const s = [...times].sort((a, b) => a - b);
    const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
    rows.push({
      look,
      mode,
      frames: s.length,
      'median ms': q(0.5).toFixed(1),
      'p95 ms': q(0.95).toFixed(1),
      'over 33 ms': `${Math.round((100 * s.filter((x) => x > 33.4).length) / s.length)}%`,
    });
    await page.close();
  }
await browser.close();
console.table(rows);
