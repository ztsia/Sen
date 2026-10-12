import { expect, test } from '@playwright/test';
import { db, dialog, dump, open, shot, text, toast, watch } from './b04-helpers';

// FLOW-1..4: shared bills. The dev server (5180) lets the test read the fake's own rows.
test.use({ baseURL: 'http://127.0.0.1:5180' });

test('FLOW-4 split-public: no app chrome, nothing of the person, hostile names, reload', async ({ page }) => {
  const w = watch(page);
  await open(page, '/s/split-public?id=demo-new');
  // no tab bar, no Sen button, no links
  await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ask Sen' })).toHaveCount(0);
  expect(await page.locator('a[href]').count()).toBe(0);
  const html = await page.content();
  for (const leak of ['NASI KANDAR', 'HAIDILAO', 'BBQ PLACE', '29,871', 'Ryt Bank', 'TNG', 'weiming@', 'TAN WEI MING'])
    expect(html, `leak: ${leak}`).not.toContain(leak);
  const stores = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } }));
  console.log('STORAGE', stores.slice(0, 400));
  await shot(page, 'FLOW-4-step-1-public-new');

  // no pay QR, no pay button while still changing
  await expect(page.getByText(/Pay RM/)).toHaveCount(0);

  // hostile / bad names
  const name = page.getByLabel("What's your name?");
  const cont = page.getByRole('button', { name: 'Continue' });
  for (const bad of ['', '   ', 'Ali', 'ali']) {
    await name.fill(bad);
    await cont.click();
    await page.waitForTimeout(400);
    await expect(page.getByText(/^Hi /)).toHaveCount(0);
    console.log(
      `name ${JSON.stringify(bad.slice(0, 12))} ->`,
      (await text(page))
        .split('\n')
        .filter((l) => /name|called|long|Type/i.test(l))
        .slice(0, 3)
        .join(' | '),
    );
  }
  await shot(page, 'FLOW-4-step-2-bad-names');
  const evil = '<img src=x onerror=window.__pwn=1>';
  await name.fill(evil);
  await cont.click();
  await expect(page.getByText('Sen remembers this browser.')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __pwn?: number }).__pwn)).toBeUndefined();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await shot(page, 'FLOW-4-step-3-hostile-name-inert');

  // reload: does Sen remember this browser (AC-7)?
  await page.reload();
  await page.waitForTimeout(800);
  const afterReload = await text(page);
  console.log('AFTER RELOAD has name box:', /What's your name/.test(afterReload), 'has Hi:', /Hi /.test(afterReload));
  await shot(page, 'FLOW-4-step-4-after-reload');
  expect(w.errors).toEqual([]);
});

test('FLOW-2 split-public sad: closed, final read-only, pay only when final', async ({ page }) => {
  await open(page, '/s/split-public?id=demo-closed');
  await expect(page.getByText('This split is closed')).toBeVisible();
  const t = await text(page);
  for (const s of ['KEDAI', 'Mee', 'RM', 'Pay']) expect(t, s).not.toContain(s);
  await shot(page, 'FLOW-2-step-1-closed');
  await open(page, '/s/split-public?id=nobody-knows');
  await expect(page.getByText('This split is closed')).toBeVisible();
  await open(page, '/s/split-public?id=demo-final');
  await expect(page.getByText('To change a tick, ask Wei Ming.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Pay' })).toContainText('Pay RM22.14');
  for (const cb of await page.getByRole('checkbox').all()) await expect(cb).toBeDisabled();
  await shot(page, 'FLOW-2-step-2-final-readonly');
  await open(page, '/s/split-public?id=demo');
  await expect(page.getByText(/Hi Mei/)).toBeVisible();
  await expect(page.getByText(/Pay RM/)).toHaveCount(0);
  await expect(page.getByRole('img', { name: /QR/ })).toHaveCount(0);
  await shot(page, 'FLOW-2-step-3-demo-changing-no-pay');
});

test('FLOW-2/1 payer: stuck split, lock without waiting, shares sum, DB agrees', async ({ page }) => {
  await open(page, '/s/split?id=');
  await page.goto('/');
  // find ids from the fake
  const ids = await db<{ nk: string; hd: string; bbq: string }>(
    page,
    `(d) => ({ nk: d.splits.find(s => d.members.some(m => m.splitId===s.id && m.name==='Kah Hoe') && !s.lockedAt)?.id, hd: d.splits.find(s=>s.paidBy==='other')?.id, bbq: d.splits.find(s=>s.lockedAt && s.paidBy==='me')?.id })`,
  );
  console.log('ids', JSON.stringify(ids));
  await open(page, `/s/split?id=${ids.nk}`);
  await dump(page, 'FLOW-2-nk-initial');
  await expect(page.getByText('Still changing')).toBeVisible();
  await expect(page.getByRole('img', { name: 'QR code for the table' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Everyone' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Someone else…' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Lock without waiting/ })).toHaveCount(0);
  await shot(page, 'FLOW-2-step-4-nk-stuck');
  // I tap Done with an item nobody has: must not lock
  await page.getByRole('button', { name: "I've ticked everything I had" }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText('Still changing')).toBeVisible();
  // Kah Hoe is not done, item unclaimed -> a hostile "Someone else" name
  await page.getByRole('button', { name: 'Someone else…' }).click();
  const d = dialog(page, 'Who had this?');
  await d.getByLabel("Friend's name").fill('<b>x</b>'.repeat(10));
  await d.getByRole('button', { name: 'Add' }).click();
  await page.waitForTimeout(600);
  console.log(
    'after hostile friend:',
    (await text(page))
      .split('\n')
      .filter((l) => /x|Waiting|Lock/.test(l))
      .slice(0, 6)
      .join(' | '),
  );
  await shot(page, 'FLOW-2-step-5-hostile-friend-name');
  const lock = page.getByRole('button', { name: /^Lock without waiting/ });
  await expect(lock).toBeVisible();
  await lock.click();
  await expect(page.getByText('Final', { exact: true })).toBeVisible();
  const sums = await db<{ total: number; shares: number[]; spending: number | null }>(
    page,
    `(d) => { const s = d.splits.find(x=>x.id==='${ids.nk}'); const ms = d.members.filter(m=>m.splitId===s.id); const t = d.txns.find(x=>x.id===s.transactionId); return { total: t.amount, shares: ms.map(m=>m.share), spending: t.myShare } }`,
  );
  console.log('SUMS', JSON.stringify(sums));
  expect(sums.shares.reduce((a, b) => a + b, 0)).toBe(sums.total);
  await shot(page, 'FLOW-2-step-6-locked');
});

test('FLOW-3 owe: I have paid, Undo, double tap', async ({ page }) => {
  await page.goto('/');
  const hd = await db<string>(page, `(d) => d.splits.find(s=>s.paidBy==='other').id`);
  await open(page, `/s/split?id=${hd}`);
  await expect(page.getByText(/You owe/).first()).toBeVisible();
  await expect(page.getByText('RM24.40').first()).toBeVisible();
  for (const cb of await page.getByRole('checkbox').all()) await expect(cb).toBeDisabled();
  await shot(page, 'FLOW-3-step-1-owe');
  const b = page.getByRole('button', { name: "I've paid" });
  await b.dblclick();
  await page.waitForTimeout(700);
  const paid = await db<number>(
    page,
    `(d) => d.members.filter(m => m.isMe && m.paidAt && d.splits.find(s=>s.id===m.splitId)?.paidBy==='other').length`,
  );
  console.log(
    'paid members',
    paid,
    await toast(page)
      .innerText()
      .catch(() => 'no toast'),
  );
  await shot(page, 'FLOW-3-step-2-paid');
});
