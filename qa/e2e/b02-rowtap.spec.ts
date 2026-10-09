import { expect, test } from '@playwright/test';
import { shot, sim, toCapture } from './b02-helpers';
test('a tap anywhere on a picking row ticks it (the row is the target)', async ({ page }) => {
  await toCapture(page);
  await page.getByRole('button', { name: /Your apps/ }).click();
  await page.getByRole('button', { name: 'Choose these 5' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await sim(page, 'Grant access');
  await sim(page, 'Post a notification', 2);
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await page.getByRole('button', { name: 'Share samples' }).click();
  const t = (await page.getByText('PBB. You have received a DuitNow Transfer', { exact: false }).boundingBox())!;
  await page.touchscreen.tap(t.x + t.width / 2, t.y + t.height / 2);
  await expect(page.getByRole('checkbox').nth(0)).toBeChecked();
  await expect(page.getByRole('button', { name: 'Share 1 sample' })).toBeVisible();
  await shot(page, 'FLOW-9-step-2b-row-tap-ticks');
});
