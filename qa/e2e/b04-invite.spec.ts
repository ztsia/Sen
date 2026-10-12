import { test } from '@playwright/test';
import { db, open, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
test('invite validation', async ({ page }) => {
  await open(page, '/s/settings/members');
  await page.getByRole('button', { name: 'Invite', exact: true }).click();
  await page.waitForTimeout(500);
  console.log('welcome default', await page.getByLabel('Welcome credit').inputValue(), '| allowance', await page.getByLabel('Monthly allowance').inputValue());
  const n0 = await db<number>(page, `(d) => d.settings.members.length`);
  for (const e of ['a@', '<script>@x.co']) {
    await page.getByLabel('Their email').fill(e);
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await page.waitForTimeout(500);
    console.log('INVITE', JSON.stringify(e), '=> members', n0, '->', await db<number>(page, `(d) => d.settings.members.length`), (await text(page)).split('\n').filter((l) => /Type their email/.test(l)).slice(0, 1).join(''));
  }
  await page.getByLabel('Their email').fill('x'.repeat(300) + '@example.com');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await page.waitForTimeout(800);
  console.log('300-char email => members', await db<number>(page, `(d) => d.settings.members.length`));
});
