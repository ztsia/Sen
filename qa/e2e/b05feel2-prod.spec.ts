import { expect, test } from '@playwright/test';

// R2-33: a production build carries no motion demo, no haptic log, and loads only its own origin.
test.use({ baseURL: 'http://localhost:4182' });

test('R2-33 production: no dev gallery motion page, no __senHaptics, only our own origin', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (r) => origins.add(new URL(r.url()).origin));
  await page.goto('/dev/gallery/motion');
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => typeof (window as any).__senHaptics)).toBe('undefined');
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).not.toMatch(/Press feedback|Screen change|Motion demo/i);
  await page.goto('/more');
  await page.waitForTimeout(800);
  expect([...origins].filter((o) => !o.startsWith('http://localhost:4182'))).toEqual([]);
});

test('R2-33 production bundle: no demo and no secret-looking strings added by the slice', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
  expect(scripts.length).toBeGreaterThan(0);
  for (const s of scripts) {
    const js = await (await request.get(s)).text();
    expect(js).not.toMatch(/__senHaptics/);
    expect(js).not.toMatch(/(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY)/);
  }
});
