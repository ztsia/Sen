import { test } from '@playwright/test';
import { open } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
test('F11 fake: duplicate balance check, grant sum', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  console.log(JSON.stringify(await page.evaluate(async () => {
    const mod: any = await import(/* @vite-ignore */ '/src/data/index.ts');
    const db = (await mod.backend()).db();
    const area: any = await import(/* @vite-ignore */ '/src/data/fake/areas/index.ts');
    const views: any = await import(/* @vite-ignore */ '/src/data/fake/views.ts');
    const ctx = { offline: false, later() {} };
    const res: any = {};
    const acct = db.accounts.find((a: any) => a.kind === 'tracked');
    const bal0 = views.balances(db).get(acct.id);
    const adj0 = db.txns.filter((t: any) => t.kind === 'adjustment').length;
    try { area.applyArea(db, { type: 'balance.check', checks: [{ accountId: acct.id, balance: bal0 + 10000 }, { accountId: acct.id, balance: bal0 + 10000 }] }, ctx); res.dup = 'ACCEPTED'; } catch (e) { res.dup = 'threw: ' + String(e).slice(0, 60); }
    res.balanceUnchanged = views.balances(db).get(acct.id) === bal0; res.adjustmentsAdded = db.txns.filter((t: any) => t.kind === 'adjustment').length - adj0;
    area.applyArea(db, { type: 'balance.check', checks: [{ accountId: acct.id, balance: bal0 + 10000 }] }, ctx);
    res.singleOk = views.balances(db).get(acct.id) === bal0 + 10000;
    const m = db.settings.members.find((x: any) => x.email !== db.settings.email);
    try { area.applyArea(db, { type: 'member.set', id: m.id, key: 'grant', value: 9000000000000 }, ctx); area.applyArea(db, { type: 'member.set', id: m.id, key: 'grant', value: 9000000000000 }, ctx); res.grant = 'ACCEPTED twice, balance ' + m.balance; } catch (e) { res.grant = 'second refused: ' + String(e).slice(0, 50) + ' balance ' + m.balance + ' safe ' + Number.isSafeInteger(m.balance); }
    return res;
  })));
  // UI invite with 300-char email
  await open(page, '/s/settings/members');
  await page.getByRole('button', { name: 'Invite', exact: true }).click();
  await page.waitForTimeout(500);
  console.log('welcome default:', await page.getByLabel('Welcome credit').inputValue());
  const emails = ['a@', '<script>@x.co', 'a@b.c', 'a..b@x.co', 'a@-b.co', 'a@x.co.', 'ñ@x.co', 'a+tag@x.co', ' B@X.CO ', 'a b@x.co', 'x'.repeat(300) + '@example.com'];
  for (const e of emails) {
    await page.getByLabel('Their email').fill(e);
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await page.waitForTimeout(450);
    const msg = await page.getByText('Type their email, like name@example.com.').count();
    console.log('EMAIL', JSON.stringify(e.slice(0, 16)), e.length > 40 ? '(len ' + e.length + ')' : '', '=>', msg ? 'refused' : 'ACCEPTED');
    if (!msg) { await page.getByRole('button', { name: 'Invite', exact: true }).click().catch(() => {}); await page.waitForTimeout(500); }
  }
});
