import { expect, test } from '@playwright/test';
import { closePanel, openPanel, shot, tabs } from './helpers';

// QA B01: a look's module arriving slowly (a phone on a weak connection). While Copper's chunk is
// in flight, the frame should keep the previous look whole (look.tsx: "Until it arrives, the
// previous look stays").
test('FLOW-1d switching look on a slow connection keeps the frame whole', async ({ page }) => {
  await page.route(/\/assets\/copper-[\w-]+\.(js|css)$/, async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });
  await page.goto('/');
  await expect(tabs(page).locator('svg').first()).toBeVisible();
  const before = (await tabs(page).boundingBox())!;
  const p = await openPanel(page);
  await p.getByRole('radio', { name: 'Copper', exact: true }).click();
  await closePanel(page);
  await page.waitForTimeout(800);
  const during = (await tabs(page).boundingBox())!;
  const look = await page.locator('html').getAttribute('data-look');
  test.info().annotations.push({
    type: 'tab bar height before / during load',
    description: `${before.height} / ${during.height}, data-look=${look}`,
  });
  await shot(page, 'FLOW-1d-step-1-copper-loading');
  await page.waitForTimeout(3500);
  const after = (await tabs(page).boundingBox())!;
  await shot(page, 'FLOW-1d-step-2-copper-loaded');
  test.info().annotations.push({ type: 'tab bar height after load', description: String(after.height) });
  expect(Math.abs(during.height - before.height), 'the tab bar changes shape while the look loads').toBeLessThan(4);
});
