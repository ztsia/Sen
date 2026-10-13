import { expect, test } from '@playwright/test';
import { LOOKS, MODES, open } from './helpers';

// B04 (D130): Home is a glance, so it never scrolls at 390×844, in any look, light or dark, and in
// every scenario, including the two that add a card to act on (QA B04 redesign, finding 3).
const SCENARIOS = ['wei-ming', 'capture-off', 'payday', 'before-salary', 'first-cycle', 'cap', 'month'];

for (const scenario of SCENARIOS)
  for (const look of LOOKS)
    for (const mode of MODES)
      test(`Home fits the screen without scrolling, ${scenario}, in ${look}, ${mode}`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await open(page, `/?scenario=${scenario}`, look, mode);
        await expect(page.getByTestId('hero')).toBeVisible();
        // a friend (month) has no total balance row, so wait for the loading cards to clear instead
        await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
        const over = await page.evaluate(() => {
          const s = document.scrollingElement!;
          const m = document.querySelector('main')!;
          return Math.max(s.scrollHeight - s.clientHeight, m.scrollHeight - m.clientHeight);
        });
        expect(over).toBeLessThanOrEqual(0);
      });
