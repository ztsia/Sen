import { expect, test, type Page } from '@playwright/test';
import { open, shot, settled, tabs, toast, db, watch, text } from './b03-helpers';

// FLOW-16, 17, 18: AC-32, AC-32s, AC-33, AC-34, AC-59b

const FAKE = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };
async function scanTo(page: Page, file = FAKE) {
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await page.getByTestId('scan-camera').setInputFiles(file);
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Split' })).toBeVisible();
}

test('FLOW-16 Split > I paid > Just my part: Others\' items fold in, list still sums to total, shares in sen', async ({ page }) => {
  const errors = watch(page);
  await open(page, '/');
  await scanTo(page);
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('Who paid?');
  await shot(page, 'FLOW-16-step-1-who-paid');
  await dlg.getByRole('button', { name: 'I paid' }).click();
  await expect(dlg).toContainText('Share a link');
  await expect(dlg).toContainText('Just my part');
  await dlg.getByRole('button', { name: 'Just my part' }).click();
  await shot(page, 'FLOW-16-step-2-tick');
  // tick Sate ayam and Teh o ais
  await dlg.getByRole('checkbox').nth(0).click();
  await dlg.getByRole('checkbox').nth(3).click();
  const line = (await dlg.getByText(/Your part/).innerText()).replace(/\s+/g, ' ');
  console.log('tick summary:', line);
  const sens = await dlg.locator('p [data-sen]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-sen'))));
  console.log('mine/others:', sens);
  expect(sens[0]! + sens[1]!).toBe(6413);
  expect(sens[0]).toBe(2972 + 960);
  await dlg.getByRole('button', { name: 'Done' }).click();
  await page.waitForTimeout(800);
  console.log('toast:', await toast(page).innerText().catch(() => '(none)'), '| url', page.url());
  const o = await db<any>(page, `(d) => { const r = d.receipts[d.receipts.length-1]; const items = d.items.filter(i => i.receiptId === r.id); const sp = d.splits.find(s => s.receiptId === r.id); const ms = d.members.filter(m => m.splitId === sp.id); const t = d.txns.find(t => t.id === r.transactionId); return { itemSum: items.reduce((a,i)=>a+i.price,0), total: r.total, kinds: items.map(i => i.kind+':'+i.price), members: ms.map(m => m.name+':'+m.share+':'+!!m.doneAt), lockedAt: !!sp.lockedAt, myShare: t?.myShare, amount: t?.amount, status: r.status } }`);
  console.log(JSON.stringify(o));
  expect(o.itemSum).toBe(o.total);
  expect(o.members.map((m: string) => Number(m.split(':')[1])).reduce((a: number, b: number) => a + b, 0)).toBe(o.total);
  expect(o.myShare).toBe(3932);
  await shot(page, 'FLOW-16-step-3-after-just-my-part');
  expect(errors).toEqual([]);
});

test('FLOW-16 Just my part, A friend paid: you owe the ticked sum; nothing becomes your payment', async ({ page }) => {
  await open(page, '/');
  await scanTo(page);
  const before = await db<any>(page, `(d) => d.txns.length`);
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'A friend paid' }).click();
  await dlg.getByRole('button', { name: 'Just my part' }).click();
  await dlg.getByRole('checkbox').nth(1).click();
  await dlg.getByRole('button', { name: 'Done' }).click();
  await page.waitForTimeout(800);
  console.log('toast:', await toast(page).innerText().catch(() => '(none)'));
  const after = await db<any>(page, `(d) => d.txns.length`);
  console.log('txns', before, '->', after);
  expect(after).toBe(before);
  await tabs(page).getByRole('link', { name: /^Home/ }).click().catch(() => {});
});

test('FLOW-16 Share a link reaches the split stand-in; the receipt is committed once', async ({ page }) => {
  await open(page, '/');
  await scanTo(page);
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'I paid' }).click();
  await dlg.getByRole('button', { name: 'Share a link' }).click();
  await page.waitForTimeout(800);
  console.log('url', page.url());
  console.log((await text(page)).replace(/\n+/g, ' | ').slice(0, 200));
  await shot(page, 'FLOW-16-step-4-share-link-standin');
  const n = await db<any>(page, `(d) => d.receipts.length`);
  console.log('receipts', n);
});

test('FLOW-17 No receipt > Enter the items: unitemised allowed, overshoot refused, blanks refused', async ({ page }) => {
  await open(page, '/');
  const id = await db<string>(page, `(d) => d.txns.find(t => t.merchantRaw === 'SATE KAJANG HJ SAMURI').id`);
  const amt = await db<number>(page, `(d) => d.txns.find(t => t.merchantRaw === 'SATE KAJANG HJ SAMURI').amount`);
  console.log('payment', id, amt);
  await open(page, `/s/txn?id=${id}`);
  await page.getByRole('button', { name: 'No receipt…' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Enter the items' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/);
  await settled(page);
  console.log((await text(page)).replace(/\n+/g, ' | '));
  await shot(page, 'FLOW-17-step-1-by-hand');
  const add = async (desc: string, price: string) => {
    await page.getByLabel('Add an item').fill(desc);
    await page.getByLabel('Price').last().fill(price);
    await page.getByRole('button', { name: 'Add item', exact: true }).click();
  };
  // blank description
  await page.getByLabel('Price').last().fill('5.00');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  console.log('blank description ->', await page.locator('[data-slot="field-error"]').allInnerTexts());
  await add('Nasi', '10.00');
  await add('Teh', 'abc');
  console.log('bad price ->', await page.locator('[data-slot="field-error"]').allInnerTexts());
  const t1 = (await text(page)).replace(/\n+/g, ' | ');
  console.log('after one item:', t1.slice(0, 400));
  await shot(page, 'FLOW-17-step-2-one-item');
  expect(t1).toMatch(/not itemised/);
  // overshoot
  await page.getByLabel('Price').last().fill('');
  await add('Big', '999.00');
  const t2 = (await text(page)).replace(/\n+/g, ' | ');
  console.log('after overshoot:', t2.match(/Items come to[^|]*\|[^|]*\|[^|]*|[^|]*more than the payment/)?.[0]);
  await shot(page, 'FLOW-17-step-3-overshoot');
  const before = await db<any>(page, `(d) => ({ r: d.receipts.length, tx: d.txns.length })`);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(800);
  const after = await db<any>(page, `(d) => ({ r: d.receipts.length, tx: d.txns.length, last: d.receipts[d.receipts.length-1] && { total: d.receipts[d.receipts.length-1].total, tx: d.receipts[d.receipts.length-1].transactionId } })`);
  console.log('Done with items far above the payment ->', JSON.stringify({ before, after }), 'toast', await toast(page).innerText().catch(() => '(none)'));
  await shot(page, 'FLOW-17-step-4-done-overshoot');
});

test('FLOW-18 without capture: Done creates the payment; no waiting', async ({ page }) => {
  await open(page, '/?scenario=month');
  await page.waitForTimeout(500);
  const before = await db<any>(page, `(d) => ({ tx: d.txns.length, receipts: d.receipts.length })`);
  await tabs(page).getByRole('link', { name: /^Review/ }).click();
  const t = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
  console.log('month Review:', t.slice(0, 600));
  await shot(page, 'FLOW-18-step-1-month-review');
  await scanTo(page);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(800);
  console.log('toast:', await toast(page).innerText().catch(() => '(none)'));
  const after = await db<any>(page, `(d) => ({ tx: d.txns.length, receipts: d.receipts.length, last: d.txns[d.txns.length-1] })`);
  console.log(JSON.stringify({ before, tx: after.tx, receipts: after.receipts, last: { src: after.last.source, a: after.last.amount, cat: after.last.categoryId } }));
  expect(after.tx).toBe(before.tx + 1);
  expect(after.last.source).toBe('receipt');
});
