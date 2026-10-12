import { test } from '@playwright/test';
import { db, open, tabs } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
test('agent switch off: Sen button gone?', async ({ page }) => {
  await open(page, '/');
  await db(page, `(d) => { d.agent = false; return 1; }`);
  await tabs(page)
    .getByRole('link', { name: /^Insights/ })
    .click();
  await page.waitForTimeout(1000);
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await page.waitForTimeout(1000);
  console.log(
    'agent=false: Ask Sen button count on Home:',
    await page.getByRole('button', { name: 'Ask Sen', exact: true }).count(),
    ' | me.agent:',
    await db(page, `(d) => d.agent`),
  );
  await page.goto('/s/settings?look=minted&mode=light');
  await page.waitForTimeout(800);
});
