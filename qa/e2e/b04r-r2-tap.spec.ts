import { expect, test } from '@playwright/test';
import { open, settled, shot } from './b04r-helpers';

// R2-AC-8 sad twin: two taps at the same spot, 150 ms apart (after the first row has cleared and the next
// slid into its place) answer ONE question. The project's own double-tap test clicks the same button
// 20 ms apart, so it stays green even with the guard removed (phase 3 probe).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

test('R2-AC-8s review: a second tap 150 ms later, on the row that slid up, answers nothing', async ({ page }) => {
  await open(page, '/review');
  await settled(page);
  const rows = page.locator('[data-review="new-merchant"]');
  const before = await page.locator('[data-review]').count();
  const chip = rows.first().getByRole('button').first();
  const box = (await chip.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(150);
  await shot(page, 'R2-FLOW-3-step-5-between-taps');
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(800);
  const after = await page.locator('[data-review]').count();
  await shot(page, 'R2-FLOW-3-step-5-after-second-tap');
  expect(after, 'one row answered, not two').toBe(before - 1);
});
