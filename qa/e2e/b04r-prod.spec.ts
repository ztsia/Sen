import { expect, test } from '@playwright/test';
import { shot } from './b04r-helpers';
test.use({ baseURL: 'http://127.0.0.1:5293' });
test('FLOW-21 production: no gallery, no dev panel, no scenario', async ({ page }) => {
  await page.goto('/dev/gallery');
  await expect(page).not.toHaveURL(/gallery/);
  await expect(page.getByRole('button', { name: 'Dev panel' })).toHaveCount(0);
  await page.goto('/?scenario=payday&state=empty');
  await page.waitForTimeout(800);
  const t = await page.locator('body').innerText();
  console.log('prod home:', t.replace(/\n+/g, ' / ').slice(0, 250));
  expect(t).not.toMatch(/Wei Ming|Payday plan|1,931/);
  await shot(page, 'FLOW-21-prod-home');
  await page.goto('/s/txn?id=x');
  await page.waitForTimeout(500);
  console.log('prod txn:', (await page.locator('body').innerText()).replace(/\n+/g, ' / ').slice(0, 200));
  await shot(page, 'FLOW-21-prod-txn');
});
