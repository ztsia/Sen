import { test } from '@playwright/test';
import { db, open, shot, text, tabs } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
test('account page, you payday, invite validation', async ({ page }) => {
  await open(page, '/s/accounts');
  const id = await db<string>(page, `(d) => d.accounts.find(a=>a.kind==='tracked').id`);
  await open(page, `/s/account?id=${id}`);
  console.log(
    'ACCOUNT:',
    (await text(page))
      .split('\n')
      .filter(Boolean)
      .filter((l) => !/EVERY SEN/.test(l))
      .slice(0, 26)
      .join(' | '),
  );
  await shot(page, 'FLOW-7-step-4-account');
  await open(page, '/s/balance-check');
  console.log('balance-check tab bar present:', await tabs(page).count());
  await open(page, '/s/settings/you');
  await page.getByRole('radio', { name: /A day/ }).click();
  for (const d of ['0', '32', 'abc', '15']) {
    await page.getByLabel(/Day/).first().fill(d);
    await page.getByLabel(/Day/).first().blur();
    await page.waitForTimeout(400);
    console.log(
      'YOU payday',
      JSON.stringify(d),
      '=>',
      (await text(page))
        .split('\n')
        .filter((l) => /1 to 31|saved|Payday saved/i.test(l))
        .join(' / ') || 'no message',
      '| db',
      await db<string>(page, `(d) => JSON.stringify(d.settings.you.payday)`),
    );
  }
  await open(page, '/s/settings/members');
  await page.getByRole('button', { name: 'Invite' }).click();
  await page.waitForTimeout(500);
  for (const e of ['a@', '<script>@x.co', 'x'.repeat(300) + '@example.com']) {
    await page.getByLabel('Their email').fill(e);
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await page.waitForTimeout(500);
    console.log(
      'INVITE',
      JSON.stringify(e.slice(0, 14)),
      '=> members',
      await db<number>(page, `(d) => d.settings.members.length`),
      (await text(page))
        .split('\n')
        .filter((l) => /Type their email/.test(l))
        .slice(0, 1)
        .join(''),
    );
    if ((await db<number>(page, `(d) => d.settings.members.length`)) > 3) break;
  }
  console.log(
    'welcome default',
    await page
      .getByLabel('Welcome credit')
      .inputValue()
      .catch(() => 'n/a'),
  );
});
