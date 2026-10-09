import { expect, test } from '@playwright/test';
import { ready, shot } from './b02-helpers';
test('More: rows sharing one label', async ({ page }) => {
  await page.goto('/more');
  await ready(page);
  const labels = await page.getByRole('main').getByRole('link').allInnerTexts();
  const dupes = labels.map((l) => l.split('\n')[0]!.trim()).filter((l, i, a) => a.indexOf(l) !== i);
  console.log('duplicate labels on More:', JSON.stringify(dupes));
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Account/ })
    .last()
    .scrollIntoViewIfNeeded();
  await shot(page, 'PATTERN-more-two-account-rows');
  expect(dupes).toEqual([]);
});
