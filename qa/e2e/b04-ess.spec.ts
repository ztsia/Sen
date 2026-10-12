import { expect, test } from '@playwright/test';
import { db, open, shot, text, toast } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const st = (page: import('@playwright/test').Page) => db<string>(page, `(d) => JSON.stringify(d.claimState.claims.map(c=>[c.scheme,c.period,c.status,c.essRef]))`);
test('send to ESS from list and claim', async ({ page }) => {
  await open(page, '/s/claims');
  const ess = page.getByRole('button', { name: /Send to ESS/ });
  console.log('list: enabled?', await ess.isEnabled());
  console.log('before', await st(page));
  await ess.click();
  await page.waitForTimeout(2500);
  console.log('after list ESS', await st(page), JSON.stringify(await toast(page).innerText().catch(() => 'none')));
  await shot(page, 'FLOW-8-step-5-send-to-ess-list');
  // single claim page, phone, complete: double click
  await open(page, '/s/claims');
  const ids = await db<string[]>(page, `(d) => d.claimState.claims.map(c=>c.id)`);
  await open(page, `/s/claim?id=${ids[0]}`);
  const e2 = page.getByRole('button', { name: /Send to ESS/ });
  console.log('claim page ess enabled', await e2.isEnabled());
  await e2.dblclick();
  await page.waitForTimeout(2500);
  console.log('after claim ESS dbl', await st(page), JSON.stringify(await toast(page).innerText().catch(() => 'none')));
  await shot(page, 'FLOW-8-step-6-send-to-ess-claim');
  console.log((await text(page)).split('\n').filter(Boolean).slice(0, 14).join(' | '));
});
