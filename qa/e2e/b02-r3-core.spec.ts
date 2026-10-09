import { expect, test } from '@playwright/test';
import { ready, shot, watch } from './b02-helpers';

// QA run 3: docs/flows.md marks no journey as core, so every run walks the frame B02 sits in once: the five
// tabs from the tab bar, then Settings → Capture, at 412×915 in the preview build.
test('CORE the five tabs and the way to Capture', async ({ page }) => {
  const w = watch(page, 'http://localhost:4173');
  await page.goto('/');
  await ready(page);
  const tabs = page.getByRole('navigation', { name: 'Tabs' });
  await expect(tabs).toBeVisible();
  await shot(page, 'CORE-step-1-home');
  for (const [name, path] of [
    [/Review/, '/review'],
    [/Insights/, '/insights'],
    [/More/, '/more'],
  ] as const) {
    await tabs.getByRole('link', { name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(tabs.getByRole('link', { name })).toHaveAttribute('aria-current', 'page');
  }
  await shot(page, 'CORE-step-2-more');
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Capture' }).click();
  await expect(page.getByRole('heading', { name: 'Capture' })).toBeVisible();
  await expect(page).toHaveURL(/\/s\/settings\/capture$/);
  await shot(page, 'CORE-step-3-capture');
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});
