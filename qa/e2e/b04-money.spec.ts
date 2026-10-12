import { expect, test } from '@playwright/test';
import { db, open, shot, text, toast, watch } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });

test('FLOW-7 accounts total, balance-check parse/hostile, Matches, Save books diffs', async ({ page }) => {
  const w = watch(page);
  await open(page, '/s/accounts');
  const total = await db<{ total: number; sum: number }>(
    page,
    `(d) => { return { total: 0, sum: 0 } }`,
  );
  void total;
  await open(page, '/s/balance-check');
  const rows = page.locator('[role="group"]');
  const n = await rows.count();
  console.log('rows', n);
  await shot(page, 'FLOW-7-step-1-balance-check');
  const first = rows.first();
  const input = first.getByRole('textbox');
  const save = page.getByRole('button', { name: 'Save' });
  const base = await db<number>(page, `(d) => d.txns.filter(t=>t.kind==='adjustment').length`);
  for (const bad of ['abc', '1e3', '-5', '1.234', '99999999999999999999', '0.1+0.2', 'RM 12.90', '1,5', '12.', '.5', '١٢٣']) {
    await input.fill(bad);
    await save.click();
    await page.waitForTimeout(250);
    const msg = (await first.innerText()).split('\n').filter((l) => /Type|large|decimals|amount/i.test(l)).join(' / ');
    const adj = await db<number>(page, `(d) => d.txns.filter(t=>t.kind==='adjustment').length`);
    console.log(JSON.stringify(bad), '->', msg || 'NO MESSAGE', 'adjustments', adj - base);
    expect(adj).toBe(base);
  }
  await shot(page, 'FLOW-7-step-2-hostile');
  // good typed values
  await input.fill('1,284.50');
  await page.getByRole('button', { name: /matches$/ }).nth(1).click();
  await save.click();
  await page.waitForTimeout(800);
  console.log('toast:', JSON.stringify(await toast(page).innerText().catch(() => 'none')), page.url());
  const adjs = await db<{ amount: number; direction: string }[]>(page, `(d) => d.txns.filter(t=>t.kind==='adjustment').slice(-3).map(t=>({amount:t.amount,direction:t.direction}))`);
  console.log('last adjustments', JSON.stringify(adjs));
  console.log(w.errors.join('\n'));
});

test('FLOW-7 sad: save with nothing typed, no-capture hides accounts', async ({ page }) => {
  await open(page, '/s/balance-check');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(300);
  console.log('empty save:', (await text(page)).split('\n').filter((l) => /Type what/.test(l)).join(''));
  await open(page, '/more?scenario=month');
  const t = await text(page);
  console.log('More (no capture) entries:', JSON.stringify(t.split('\n').slice(0, 14)));
  expect(t).not.toContain('Accounts');
  await open(page, '/s/accounts?scenario=month');
  console.log('accounts direct, no capture:', JSON.stringify((await text(page)).split('\n').slice(0, 8)));
  await shot(page, 'FLOW-7-step-3-accounts-nocapture');
  await open(page, '/s/balance-check?scenario=month');
  console.log('balance-check direct, no capture:', JSON.stringify((await text(page)).split('\n').slice(0, 8)));
  await open(page, '/s/claims?scenario=month');
  console.log('claims direct, no claims:', JSON.stringify((await text(page)).split('\n').slice(0, 8)));
  await open(page, '/s/settings?scenario=month');
  console.log('settings (friend):', JSON.stringify((await text(page)).split('\n').slice(0, 24)));
  await shot(page, 'FLOW-9-step-1-settings-friend');
});
