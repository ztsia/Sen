import { test } from '@playwright/test';
import { open } from './b05feel-lib';

// scan-after's "Reading receipt…" under 4x CPU with motion on: is it ever on screen, and for how long,
// on head and on main? (the feel pass fails this journey on head, run after run)
for (const [name, base] of [['head', 'http://localhost:4181'], ['main', 'http://localhost:4183']] as const) {
  test(`R3-20 reading receipt is on screen (${name}, 4x, motion on)`, async ({ browser }) => {
    test.setTimeout(240_000);
    const out: any[] = [];
    for (let i = 0; i < 6; i++) {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, serviceWorkers: 'block', baseURL: base, reducedMotion: 'no-preference' });
      const page = await ctx.newPage();
      await open(page, '/');
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const [camera] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Scan a receipt' }).click(),
      ]);
      await camera.setFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
      await page.getByRole('button', { name: 'Use this' }).waitFor();
      await page.evaluate(() => {
        const w = window as any;
        w.__r = { first: -1, last: -1, paths: [] as any[] };
        const t0 = performance.now();
        setInterval(() => {
          const t = Math.round(performance.now() - t0);
          const has = document.body.innerText.includes('Reading receipt');
          if (has && w.__r.first < 0) w.__r.first = t;
          if (has) w.__r.last = t;
          const p = location.pathname;
          if (w.__r.paths[w.__r.paths.length - 1]?.[1] !== p) w.__r.paths.push([t, p]);
        }, 10);
      });
      await page.getByRole('button', { name: 'Use this' }).click();
      await page.waitForTimeout(6000);
      out.push(await page.evaluate(() => (window as any).__r));
      await ctx.close();
    }
    console.log(`READING ${name}:`, JSON.stringify(out));
  });
}
