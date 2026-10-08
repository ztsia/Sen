import { expect, test } from '@playwright/test';
import { shot, tabs, watch } from './helpers';

// QA B01, FLOW-13: Mercury and Copper in a Chromium with WebGL really switched off, not the ?gl=0 flag
// the slice's own test uses.
test.use({ launchOptions: { args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] } });

for (const look of ['mercury', 'copper'] as const)
  test(look, async ({ page }) => {
    const w = watch(page);
    await page.goto(`/dev/gallery?look=${look}&mode=dark`);
    await expect(page.locator('html')).toHaveAttribute('data-look', look);
    const gl = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl'));
    expect(gl, 'WebGL really is off').toBe(false);
    const fig = page.getByTestId('gallery-figure');
    await fig.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const ink = await fig
      .locator('canvas')
      .first()
      .evaluate((c: HTMLCanvasElement) => {
        const g = c.getContext('2d');
        if (!g) return -1;
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) n++;
        return n;
      });
    test.info().annotations.push({ type: 'fallback ink', description: String(ink) });
    await shot(page, `FLOW-13-step-1-${look}-no-webgl-figure`);
    await page.goto(`/?look=${look}&mode=dark`);
    await expect(tabs(page).locator('svg').first()).toBeVisible();
    await shot(page, `FLOW-13-step-2-${look}-no-webgl-home`);
    expect(ink).toBeGreaterThan(500);
    expect(w.errors).toEqual([]);
  });
