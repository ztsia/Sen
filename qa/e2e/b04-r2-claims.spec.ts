import { test } from '@playwright/test';
import { open, shot, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const lines = async (p: import('@playwright/test').Page, n = 40) =>
  (await text(p))
    .split('\n')
    .filter((l) => l && !/EVERY SEN|^Home$|^Review$|^Scan$|^Insights$|^More$|to review|^RM \d/.test(l))
    .slice(0, n)
    .join(' | ');
test('F9: claims coherence', async ({ page }) => {
  await open(page, '/s/settings/claims');
  console.log('SETTINGS CLAIMS:', (await lines(page, 14)).slice(0, 420));
  await open(page, '/s/claims');
  console.log('CLAIMS:', (await lines(page, 30)).slice(0, 700));
  await shot(page, 'R2-F9-step-1-claims');
  await open(page, '/s/payday?scenario=payday');
  console.log('PAYDAY step 1:', (await lines(page, 14)).slice(0, 420));
  await shot(page, 'R2-F9-step-2-payday-claims');
  await open(page, '/s/claims?scenario=payday');
  console.log('CLAIMS in payday scenario:', (await lines(page, 30)).slice(0, 700));
  await shot(page, 'R2-F9-step-3-claims-payday-scenario');
  await open(page, '/?scenario=payday');
  console.log('HOME payday:', (await lines(page, 16)).slice(0, 420));
  await open(page, '/s/payday?scenario=payday');
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(600);
  console.log('PAYDAY asked:', (await lines(page, 14)).slice(0, 400));
});
