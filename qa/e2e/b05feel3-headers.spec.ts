import { test } from '@playwright/test';
import { open } from './b05feel-lib';

test('R3-own-transfer day header and row heights vs the list guesses', async ({ page }) => {
  await open(page, '/s/payments');
  await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
  await page.waitForTimeout(800);
  await page.getByRole('searchbox', { name: 'Search payments' }).fill('Public Bank');
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('main .sticky')].map(
      (e) => `${Math.round(e.getBoundingClientRect().height)}:${e.textContent!.slice(0, 22)}`,
    );
    const rows = [...document.querySelectorAll('main button[data-slot=item]')].map((e) =>
      Math.round(e.getBoundingClientRect().height),
    );
    return { heads, rows };
  });
  console.log('HEADERS', JSON.stringify(m));
});
