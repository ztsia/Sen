import { expect, test } from '@playwright/test';
import { open, tabs, watch } from './b04r-helpers';
import { step } from './b04r-r2-lib';

test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

test('R2-FLOW-32 The new look card', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-32';
  await open(page, '/s/new-look', 'copper', 'light');
  await page.waitForTimeout(1500);
  await step(page, F, 1, 'card', 'Open the new look screen in Copper', 'the look\'s name, Keep it (48 px, the one main action), Go back (40), the "Change each quarter" switch on, and the one-line note about Settings -> Appearance; no tab bar', async () => {
    await expect(page.getByRole('button', { name: 'Keep it' })).toBeVisible();
    const h = (n: string) => page.getByRole('button', { name: n }).evaluate((e) => Math.round(e.getBoundingClientRect().height));
    expect(await h('Keep it')).toBe(48);
    expect(await h('Go back')).toBe(40);
    await expect(page.getByRole('switch')).toBeChecked();
    await expect(page.locator('body')).toContainText(/Settings/);
    await expect(page.locator('body')).toContainText(/Appearance/);
    await expect(tabs(page)).toHaveCount(0);
    await expect(page.locator('body')).toContainText('Sen has a new look for this quarter');
    await expect(page.getByRole('heading', { name: 'Minted' }).or(page.getByText('Minted', { exact: true }))).toBeVisible();
  });
  await page.getByRole('button', { name: 'Keep it' }).click();
  await step(page, F, 2, 'kept', 'Tap Keep it', 'Home opens in the new look (Minted) with the tab bar', async () => {
    await expect(page).toHaveURL(/\/($|\?)/);
    await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
    await expect(tabs(page)).toBeVisible();
  });
  expect(w.errors).toEqual([]);
});
