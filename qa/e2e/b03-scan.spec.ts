import { expect, test, type Page } from '@playwright/test';
import { open, shot, settled, tabs, toast, watch, text, db } from './b03-helpers';

// FLOW-10..17: AC-24..AC-34

const FAKE = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };

async function scanTo(page: Page, file = FAKE) {
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await expect(page).toHaveURL(/\/scan/);
  await page.getByTestId('scan-camera').setInputFiles(file);
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page.getByText('Reading receipt…')).toBeVisible();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /./ }).first()).toBeVisible();
}

test('FLOW-10 scan-after (core): items sum to total, pax math, Done attaches; no second payment', async ({ page }) => {
  const errors = watch(page);
  await open(page, '/');
  await page.waitForTimeout(500);
  const before = await db<any>(
    page,
    `(d) => ({ txns: d.txns.length, receipts: d.receipts.length, sate: d.txns.find(t => t.merchantRaw === 'SATE KAJANG HJ SAMURI') })`,
  );
  console.log(
    'before:',
    JSON.stringify({
      txns: before.txns,
      receipts: before.receipts,
      sateAmount: before.sate?.amount,
      sateCat: before.sate?.categoryId,
    }),
  );
  await scanTo(page);
  await shot(page, 'FLOW-10-step-1-confirm');
  console.log((await text(page)).replace(/\n+/g, ' | '));
  const sens = await page
    .locator('main [data-sen]')
    .evaluateAll((els) => els.map((e) => ({ t: e.textContent!.slice(0, 20), s: Number(e.getAttribute('data-sen')) })));
  console.log(JSON.stringify(sens));
  // the draft's item prices sum to the total
  const d = await db<any>(page, `(d) => d.drafts[0]`);
  const sum = d.items.reduce((a: number, i: any) => a + i.price, 0);
  console.log(
    'draft total',
    d.total,
    'item prices sum',
    sum,
    'subtotal',
    d.subtotal,
    'tax',
    d.tax,
    'service',
    d.service,
    'prices',
    d.items.map((i: any) => i.price).join(','),
  );
  expect(sum).toBe(d.total);
  await expect(page.getByText('Items add up to the total ✓')).toBeVisible();
  const pax = page.getByRole('region', { name: 'How many people ate?' });
  const paxSens = () =>
    pax.locator('[data-sen]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-sen'))));
  expect(await paxSens()).toEqual([6413, 6413]);
  await page.getByRole('button', { name: 'More people' }).click();
  await page.getByRole('button', { name: 'More people' }).click();
  await expect(pax).toContainText('÷ 3 =');
  expect(await paxSens()).toEqual([6413, 2138]);
  // stepper floor
  await page.getByRole('button', { name: 'Fewer people' }).click();
  await page.getByRole('button', { name: 'Fewer people' }).click();
  await expect(page.getByRole('button', { name: 'Fewer people' })).toBeDisabled();
  await page.getByRole('button', { name: 'More people' }).click();
  await page.getByRole('button', { name: 'More people' }).click();
  await shot(page, 'FLOW-10-step-2-three-people');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toContainText('Attached to RM64.13 on Ryt Bank');
  await shot(page, 'FLOW-10-step-3-attached');
  const after = await db<any>(
    page,
    `(d) => ({ txns: d.txns.length, receipts: d.receipts.map(r => ({ id: r.id, tx: r.transactionId, total: r.total, pax: r.pax, status: r.status })), sate: d.txns.find(t => t.merchantRaw === 'SATE KAJANG HJ SAMURI'), items: d.items.filter(i => i.receiptId === d.receipts[d.receipts.length-1].id).map(i => i.price) })`,
  );
  console.log(
    'after:',
    JSON.stringify({
      txns: after.txns,
      last: after.receipts[after.receipts.length - 1],
      sateAmt: after.sate.amount,
      sateCat: after.sate.categoryId,
      itemSum: after.items.reduce((a: number, b: number) => a + b, 0),
    }),
  );
  expect(after.txns).toBe(before.txns); // no second payment
  expect(after.receipts.length).toBe(before.receipts + 1);
  expect(after.receipts[after.receipts.length - 1].tx).toBe(before.sate.id);
  expect(after.receipts[after.receipts.length - 1].pax).toBe(3);
  expect(after.sate.amount).toBe(6413);
  // Payments shows the receipt mark
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await page.getByRole('searchbox', { name: 'Search payments' }).fill('SATE KAJANG');
  await page.waitForTimeout(500);
  const rowTxt = await page
    .getByRole('button', { name: /^SATE KAJANG/ })
    .first()
    .innerText();
  console.log('payments row:', rowTxt.replace(/\n/g, ' | '));
  expect(rowTxt).toContain('Receipt');
  await shot(page, 'FLOW-10-step-4-payments-row');
  expect(errors).toEqual([]);
});

test('FLOW-11 confirm: fix the doubtful price; what happens to total, check line, and matching', async ({ page }) => {
  await open(page, '/');
  await scanTo(page);
  await page.getByRole('button', { name: /Nasi impit/ }).click();
  const dlg = page.getByRole('dialog');
  console.log('item sheet:', (await dlg.innerText()).replace(/\n+/g, ' | '));
  await shot(page, 'FLOW-11-step-1-item-sheet');
  const amt = dlg.getByLabel(/price|amount/i).first();
  await amt.fill('4.60');
  await dlg.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(400);
  const t = (await text(page)).replace(/\n+/g, ' | ');
  console.log('after fixing 4.50 -> 4.60:', t);
  await shot(page, 'FLOW-11-step-2-fixed-price');
  await expect(page.getByText('Check this price')).toHaveCount(0);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(800);
  console.log(
    'toast after Done with an edited total:',
    await toast(page)
      .innerText()
      .catch(() => '(none)'),
    '| url',
    page.url(),
  );
  await shot(page, 'FLOW-11-step-3-done-after-edit');
});

test('FLOW-12 receipt-first: nomatch receipt waits in Review; attach by hand adds items only', async ({ page }) => {
  await open(page, '/');
  await scanTo(page, { name: 'receipt-nomatch.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') });
  await shot(page, 'FLOW-12-step-1-confirm-nomatch');
  const before = await db<any>(page, `(d) => ({ txns: d.txns.length, r: d.receipts.length })`);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toContainText('Waiting for its payment');
  await expect(page).toHaveURL(/\/review/);
  const w = page.getByRole('region', { name: 'Waiting on others' });
  await expect(w).toContainText('KOPITIAM SRI DAMAI');
  const mid = await db<any>(
    page,
    `(d) => ({ txns: d.txns.length, r: d.receipts.length, st: d.receipts[d.receipts.length-1].status, tx: d.receipts[d.receipts.length-1].transactionId })`,
  );
  console.log('waiting receipt:', JSON.stringify(mid));
  expect(mid.txns).toBe(before.txns);
  expect(mid.st).toBe('awaiting_payment');
  expect(mid.tx).toBeNull();
  await w.getByRole('button', { name: 'Attach to a payment…' }).nth(1).click();
  const dlg = page.getByRole('dialog');
  // choose a payment of a different amount: GRABFOOD RM32.50
  await dlg.getByRole('button').filter({ hasText: 'GRABFOOD' }).first().click();
  await expect(toast(page)).toContainText('Attached to RM32.50');
  const after = await db<any>(
    page,
    `(d) => { const g = d.txns.find(t => t.merchantRaw === 'GRABFOOD' && t.amount === 3250); const r = d.receipts.find(r => r.merchantRaw === 'KOPITIAM SRI DAMAI'); return { amt: g.amount, cat: g.categoryId, rtx: r.transactionId, rstatus: r.status, same: r.transactionId === g.id, total: r.total, txns: d.txns.length } }`,
  );
  console.log('after attach by hand:', JSON.stringify(after));
  expect(after.txns).toBe(before.txns);
  expect(after.amt).toBe(3250);
  expect(after.same).toBe(true);
  await shot(page, 'FLOW-12-step-2-attached');
});

test('FLOW-13 several matches: a sheet asks which; nothing attached until chosen', async ({ page }) => {
  await open(page, '/review');
  // a second RM64.13 payment, typed in by hand, so two payments could match
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByLabel('Amount').fill('64.13');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText('Added RM64.13');
  await page.waitForTimeout(300);
  await scanTo(page);
  const before = await db<any>(page, `(d) => d.receipts.length`);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  console.log('match sheet:', (await dlg.innerText()).replace(/\n+/g, ' | '));
  const mid = await db<any>(page, `(d) => d.receipts.length`);
  expect(mid).toBe(before);
  await shot(page, 'FLOW-13-step-1-which-payment');
  await dlg.getByRole('button').filter({ hasText: 'RM64.13' }).first().click();
  await expect(toast(page)).toContainText('Attached to RM64.13');
  const after = await db<any>(page, `(d) => d.receipts.length`);
  expect(after).toBe(before + 1);
  await shot(page, 'FLOW-13-step-2-attached');
});

test('FLOW-14 the same file twice: second one must be "Already added" (content hash, §6.5)', async ({ page }) => {
  await open(page, '/');
  await scanTo(page);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toContainText('Attached to RM64.13');
  await page.waitForTimeout(300);
  const r1 = await db<any>(page, `(d) => d.receipts.length`);
  await scanTo(page); // the identical file, bytes and name
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(600);
  const t = await toast(page).innerText();
  const r2 = await db<any>(
    page,
    `(d) => ({ receipts: d.receipts.length, waiting: d.receipts.filter(r => r.status === 'awaiting_payment').length })`,
  );
  console.log(
    'second identical file -> toast:',
    JSON.stringify(t),
    'receipts',
    r1,
    '->',
    r2.receipts,
    'waiting',
    r2.waiting,
  );
  await shot(page, 'FLOW-14-step-1-same-file-twice');
  expect(t).toContain('Already added');
  expect(r2.receipts).toBe(r1);
});
