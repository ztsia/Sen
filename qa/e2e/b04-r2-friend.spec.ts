import { test } from '@playwright/test';
import { open, shot, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const lines = async (p: import('@playwright/test').Page, n = 24) => (await text(p)).split('\n').filter((l) => l && !/EVERY SEN|^Home$|^Review|^Scan$|^Insights$|^More$|to review/.test(l)).slice(0, n).join(' | ');
test('F6: friend scenario', async ({ page }) => {
  await open(page, '/s/settings?scenario=month');
  console.log('SETTINGS:', await lines(page));
  await shot(page, 'R2-F6-step-1-settings-friend');
  for (const r of ['settings/members', 'settings/data', 'settings/sen', 'settings/claims', 'claims', 'payday', 'accounts', 'balance-check', 'settings/you', 'settings/capture']) {
    await open(page, `/s/${r}?scenario=month`);
    await page.waitForTimeout(500);
    console.log('==', r, '|', (await lines(page, 14)).slice(0, 330));
  }
  // a real claim id typed by hand, claims off
  await open(page, '/?scenario=wei-ming');
  const id = await page.evaluate(async () => { const m: any = await import(/* @vite-ignore */ '/src/data/index.ts'); return (await (await m.backend()).claimList()).claims[0]?.id; });
  await open(page, `/s/claim?id=${id}&scenario=month`);
  await page.waitForTimeout(500);
  console.log('claim by id, claims off:', (await lines(page, 6)).slice(0, 200));
  await shot(page, 'R2-F6-step-2-claim-by-id-claims-off');
  // owner still sees everything
  await open(page, '/s/settings?scenario=wei-ming');
  console.log('OWNER SETTINGS:', (await lines(page)).slice(0, 300));
  await open(page, '/s/settings/members?scenario=wei-ming');
  console.log('OWNER MEMBERS:', (await lines(page, 8)).slice(0, 200));
});
