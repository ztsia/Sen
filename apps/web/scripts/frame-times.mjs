#!/usr/bin/env node
// Measures how smoothly each look draws (B01, done-when 9): the gallery's top screen (four large
// figures, their strips, Sen's button and the tab bar) at 390×844 in Chromium, with the CPU slowed
// 4× to stand in for a phone. It records every animation frame for 6 seconds and prints the median
// and 95th-percentile frame time and the share of frames over 33 ms (below 30 fps).
//   SEN_ENV=preview pnpm exec vite build && pnpm exec vite preview --port 4173 &   then
//   node scripts/frame-times.mjs [http://localhost:4173] [looks...]
// With FRAME_TIMES=transitions it measures B05's motion instead (patterns.md §8): with motion on, six
// pushes into a payment and back, six tab switches and six taps' ripples, recording only the frames
// while a view transition or ripple runs. Every look should hold 60 fps: a p95 near 16.7 ms.
// In a cloud session WebGL runs on SwiftShader, a software renderer, so Mercury and Copper measure
// slower here than on a phone's GPU: read these as an upper bound.
import { chromium } from '@playwright/test';

const base = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:4173';
const looks = process.argv.slice(process.argv[2]?.startsWith('http') ? 3 : 2);
const LOOKS = looks.length ? looks : ['minted', 'mercury', 'copper'];

// FRAME_RATE_CPU=1 measures without the slowdown, to tell the renderer's cost from the CPU's
const RATE = Number(process.env.FRAME_RATE_CPU ?? 4);
const TRANSITIONS = process.env.FRAME_TIMES === 'transitions';
const browser = await chromium.launch();
const rows = [];

/** The frames drawn while `act` runs, from the page's own animation frames. */
async function framesDuring(page, act) {
  await page.evaluate(() => {
    // each run of frames while something moves (a view transition, or a ripple) is one segment
    window.__ft = [];
    window.__ftOn = true;
    let last = performance.now();
    let seg = null;
    const step = (now) => {
      const moving = document.documentElement.matches(':active-view-transition') || !!document.querySelector('.press');
      if (moving) {
        if (!seg) window.__ft.push((seg = []));
        seg.push(now - last);
      } else seg = null;
      last = now;
      if (window.__ftOn) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await act();
  return page.evaluate(() => {
    window.__ftOn = false;
    return window.__ft;
  });
}

if (TRANSITIONS) {
  for (const look of LOOKS) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
    const cdp = await page.context().newCDPSession(page);
    const kinds = {};
    await page.goto(`${base}/s/payments?look=${look}&mode=light`);
    await page.waitForTimeout(2500);
    // once each first, so the screens' code is loaded before the clock starts
    await page.locator('[data-share]').first().click();
    await page.waitForTimeout(1000);
    await page.goBack();
    await page.waitForTimeout(1000);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
    kinds['push and back'] = await framesDuring(page, async () => {
      for (let i = 0; i < 6; i++) {
        await page.locator('[data-share]').nth(i).click();
        await page.waitForTimeout(700);
        await page.goBack();
        await page.waitForTimeout(700);
      }
    });
    kinds['tab'] = await framesDuring(page, async () => {
      for (let i = 0; i < 6; i++) {
        await page.locator(`[data-k=${i % 2 ? 'home' : 'review'}]`).click();
        await page.waitForTimeout(900);
      }
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    for (const [kind, segs] of Object.entries(kinds)) {
      // a segment's first two frames are its start: the new screen's render and the capture, which a
      // navigation pays with motion off too; the rest is the motion itself
      const starts = segs.map((g) => g.slice(0, 2).reduce((a, b) => a + b, 0)).sort((a, b) => a - b);
      const s = segs.flatMap((g) => g.slice(2)).sort((a, b) => a - b);
      const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))] ?? 0;
      rows.push({
        look,
        kind,
        moves: segs.length,
        'start median ms': q(starts, 0.5).toFixed(0),
        'moving frames': s.length,
        'median ms': q(s, 0.5).toFixed(1),
        'p95 ms': q(s, 0.95).toFixed(1),
        'over 33 ms': `${Math.round((100 * s.filter((x) => x > 33.4).length) / (s.length || 1))}%`,
      });
    }
    await page.close();
  }
}

for (const look of TRANSITIONS ? [] : LOOKS)
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
