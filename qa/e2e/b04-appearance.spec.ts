import { test } from '@playwright/test';
import { open, shot } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
test('FLOW-9 appearance: dark + pin Copper, leave, return, reload', async ({ page }) => {
  await open(page, '/s/settings/appearance');
  await page
    .getByRole('radio', { name: 'Dark' })
    .or(page.getByRole('button', { name: 'Dark' }))
    .first()
    .click()
    .catch(() => {});
  await page.getByRole('radio', { name: 'Copper' }).click();
  await page.waitForTimeout(700);
  console.log(
    'after pin: look',
    await page.locator('html').getAttribute('data-look'),
    'mode',
    await page.locator('html').getAttribute('data-mode'),
  );
  await shot(page, 'FLOW-9-step-3-pinned-copper');
  await page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: /^More/ }).click();
  await page.waitForTimeout(500);
  await page.getByText('Settings', { exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /^Appearance/ }).click();
  await page.waitForTimeout(500);
  console.log(
    'return: quarterly checked?',
    await page.getByRole('radio', { name: 'Changes each quarter' }).getAttribute('aria-checked'),
    '| copper checked?',
    await page.getByRole('radio', { name: 'Copper' }).getAttribute('aria-checked'),
  );
  await shot(page, 'FLOW-9-step-4-return');
  await page.goto('/s/settings/appearance');
  await page.waitForTimeout(1200);
  console.log(
    'reload: look',
    await page.locator('html').getAttribute('data-look'),
    'mode',
    await page.locator('html').getAttribute('data-mode'),
    '| quarterly checked?',
    await page.getByRole('radio', { name: 'Changes each quarter' }).getAttribute('aria-checked'),
  );
});
