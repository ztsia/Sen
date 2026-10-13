import { expect, test } from '@playwright/test';
import { LOOKS, MODES, open } from './helpers';

// B04 (D130): Home is a glance, so it never scrolls at 390×844, in any look, light or dark.

for (const look of LOOKS)
  for (const mode of MODES)
    test(`Home fits the screen without scrolling in ${look}, ${mode}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await open(page, '/', look, mode);
      await expect(page.getByTestId('hero')).toBeVisible();
      await expect(page.getByTestId('quiet')).toBeVisible();
      const over = await page.evaluate(() => {
        const s = document.scrollingElement!;
        const m = document.querySelector('main')!;
        return Math.max(s.scrollHeight - s.clientHeight, m.scrollHeight - m.clientHeight);
      });
      expect(over).toBeLessThanOrEqual(0);
    });
