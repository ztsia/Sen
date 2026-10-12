import { test } from '@playwright/test';
import { dialog, open } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
test('source link opens externally', async ({ page, context }) => {
  await open(page, '/');
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  const d = dialog(page, 'Sen');
  const [popup] = await Promise.all([
    context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
    d.getByRole('button', { name: /^Source 1:/ }).click(),
  ]);
  console.log(
    'popup:',
    popup ? popup.url() : 'none',
    '| opener:',
    popup ? await popup.evaluate(() => String(window.opener)).catch(() => 'n/a') : '',
    '| app still on',
    new URL(page.url()).pathname,
  );
  const links = await d.locator('a[href]').count();
  console.log('anchor links in Sen sheet:', links);
});
