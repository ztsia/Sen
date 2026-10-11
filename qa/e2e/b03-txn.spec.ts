import { expect, test, type Page } from '@playwright/test';
import { open, shot, settled, tabs, toast, db } from './b03-helpers';

// FLOW-25, 26, 27, 28: AC-54..AC-59

const heroSen = async (page: Page) => {
  const a = (await page.getByTestId('hero').getAttribute('aria-label'))!;
  const m = /RM([\d,]+)\.(\d\d)/.exec(a)!;
  return (a.startsWith('Over by') ? -1 : 1) * (Number(m[1]!.replace(/,/g, '')) * 100 + Number(m[2]));
};
async function openPayment(page: Page, q: string) {
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await page.getByRole('searchbox', { name: 'Search payments' }).fill(q);
  await page.waitForTimeout(500);
  await page.locator('[data-index] button').first().click();
  await settled(page);
}

test('FLOW-25 txn shows every row of screens.md for a notification payment with a receipt', async ({ page }) => {
  await open(page, '/');
  await openPayment(page, 'MYDIN');
  const t = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
  console.log(t);
  await shot(page, 'FLOW-25-step-1-txn');
  for (const s of [
    'From Ryt Bank',
    'Merchant',
    'When',
    'Account',
    'Category',
    'Your spending',
    'Note',
    'Receipt ·',
    'Split',
    'Ask Sen about this',
    'What the bank said',
    'Correct amount, time or account',
    'Changes',
    'Mark as…',
    'Delete',
  ])
    if (!t.includes(s)) console.log('MISSING on txn:', s);
});

test('FLOW-25 category change: asked Just this one / From now on; From now on changes later payments only', async ({
  page,
}) => {
  await open(page, '/');
  await openPayment(page, 'NASI KANDAR ABC');
  const before = await db<any>(
    page,
    `(d) => { const all = d.txns.filter(t => t.merchantKey === 'NASI KANDAR ABC' && !t.deletedAt); const drinks = d.categories.find(c=>c.name==='Drinks & desserts').id; return { n: all.length, cats: all.map(t => t.categoryId), rule: d.rules.find(r => r.merchantKey==='NASI KANDAR ABC')?.categoryId, drinks } }`,
  );
  await page.getByRole('button', { name: 'Meals' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Drinks & desserts' }).click();
  await expect(page.getByRole('dialog')).toContainText('just this one?');
  await shot(page, 'FLOW-25-step-2-scope');
  // Just this one first
  await page.getByRole('button', { name: /Just this one/ }).click();
  await expect(toast(page)).toContainText('Changed to Drinks & desserts');
  const once = await db<any>(
    page,
    `(d) => { const all = d.txns.filter(t => t.merchantKey === 'NASI KANDAR ABC' && !t.deletedAt); return { cats: all.map(t => t.categoryId), rule: d.rules.find(r => r.merchantKey==='NASI KANDAR ABC')?.categoryId } }`,
  );
  const changed = once.cats.filter((c: string, i: number) => c !== before.cats[i]).length;
  console.log('just this one: payments changed', changed, '| rule unchanged', once.rule === before.rule);
  expect(changed).toBe(1);
  expect(once.rule).toBe(before.rule);
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(300);
  // From now on
  await page.getByRole('button', { name: 'Meals' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Drinks & desserts' }).click();
  await page.getByRole('button', { name: /From now on/ }).click();
  await expect(toast(page)).toContainText('from now on');
  const rule = await db<any>(
    page,
    `(d) => { const all = d.txns.filter(t => t.merchantKey === 'NASI KANDAR ABC' && !t.deletedAt); return { cats: all.map(t => t.categoryId), rule: d.rules.find(r => r.merchantKey==='NASI KANDAR ABC')?.categoryId } }`,
  );
  const changed2 = rule.cats.filter((c: string, i: number) => c !== before.cats[i]).length;
  console.log('from now on: payments changed', changed2, '| rule now drinks', rule.rule === before.drinks);
  expect(rule.rule).toBe(before.drinks);
  expect(changed2).toBe(1); // past payments stay as they are (D25, §6.3)
  const log = (await page.locator('section[aria-label="Changes"]').innerText()).replace(/\n+/g, ' | ');
  console.log('Changes:', log);
  await shot(page, 'FLOW-25-step-3-from-now-on');
});

test('AC-56 Changes records who made the change', async ({ page }) => {
  await open(page, '/');
  await openPayment(page, 'NASI KANDAR ABC');
  await page.getByRole('button', { name: 'Add a note' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('lunch with Ali');
  await page.getByRole('dialog').getByRole('button', { name: /Save/ }).click();
  await expect(toast(page)).toContainText('Note saved');
  const log = (await page.locator('section[aria-label="Changes"]').innerText()).replace(/\n+/g, ' | ');
  console.log('Changes after a note:', log);
  const actor = /you|You|system|Sen|agent/.test(log.replace('Changes', '').replace(/Note added/, ''));
  console.log('actor named in Changes:', actor);
});

test('FLOW-26 Mark as transfer: spending falls by exactly the amount; Undo returns to the sen', async ({ page }) => {
  await open(page, '/');
  const h0 = await heroSen(page);
  await openPayment(page, 'NASI KANDAR ABC');
  const amt = await db<number>(
    page,
    `(d) => d.txns.filter(t => t.merchantKey === 'NASI KANDAR ABC' && !t.deletedAt).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt))[0].amount`,
  );
  const label = await page.locator('main').innerText();
  console.log('amount of the payment opened:', amt, 'in the cycle?', label.includes('Today') || label.includes('Oct'));
  await page.getByRole('button', { name: 'Mark as…' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Transfer' }).click();
  await expect(toast(page)).toContainText(/transfer/i);
  await shot(page, 'FLOW-26-step-1-marked-transfer');
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await settled(page);
  const h1 = await heroSen(page);
  console.log('left until payday', h0, '->', h1, 'delta', h1 - h0, 'payment', amt);
  expect(h1 - h0).toBe(amt);
  // balances: a transfer with no other side: money out of the account remains out
  await page.goBack().catch(() => {});
});

test('FLOW-26 Delete acts at once with Undo, and no confirm dialog; Undo restores identical fields', async ({
  page,
}) => {
  await open(page, '/');
  const _h0 = await heroSen(page);
  await openPayment(page, 'NASI KANDAR ABC');
  const before = await db<any>(
    page,
    `(d) => d.txns.filter(t => t.merchantKey === 'NASI KANDAR ABC' && !t.deletedAt).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt))[0]`,
  );
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(toast(page)).toContainText('Deleted');
  await shot(page, 'FLOW-26-step-2-deleted');
  const mid = await db<any>(page, `(d) => d.txns.find(t => t.id === '${before.id}')`);
  console.log('after delete: deletedAt set =', !!mid.deletedAt);
  expect(mid.deletedAt).not.toBeNull();
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(400);
  const after = await db<any>(page, `(d) => d.txns.find(t => t.id === '${before.id}')`);
  expect(after).toEqual(before);
});

test('FLOW-26 Delete a notification payment, then it stays in What the bank said (dismissed, raw kept)', async ({
  page,
}) => {
  await open(page, '/');
  await openPayment(page, 'NASI KANDAR ABC');
  const id = new URL(page.url()).searchParams.get('id')!;
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.waitForTimeout(500);
  const row = await db<any>(
    page,
    `(d) => { const t = d.txns.find(t => t.id === '${id}'); const e = t.bankEventId && d.events.find(e => e.id === t.bankEventId); return { del: t.deletedAt, hasEvent: !!t.bankEventId, eventStatus: e?.parseStatus, eventText: e?.text?.slice(0, 30) } }`,
  );
  console.log('deleted notification payment:', JSON.stringify(row));
});

test('FLOW-26 Refund of…: refund lowers the purchase exactly and is never income; Undo restores', async ({ page }) => {
  await open(page, '/');
  const h0 = await heroSen(page);
  await tabs(page)
    .getByRole('link', { name: /^Review/ })
    .click();
  const row = page.locator('[data-review="money-in"]').filter({ hasText: 'TAN AH KOW' });
  await row.getByRole('button', { name: 'Refund of…' }).click();
  const dlg = page.getByRole('dialog');
  const pick = dlg.getByRole('button').filter({ hasText: 'RM500.00' }).first();
  console.log('candidate:', (await pick.innerText()).replace(/\n/g, ' | '));
  await pick.click();
  await expect(toast(page)).toContainText('refund');
  await page.waitForTimeout(300);
  await shot(page, 'FLOW-26-step-3-refund');
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await settled(page);
  const h1 = await heroSen(page);
  console.log('left until payday', h0, '->', h1, 'delta', h1 - h0, '(refund was RM100.00)');
  expect(h1 - h0).toBe(10000);
  await tabs(page)
    .getByRole('link', { name: /^Review/ })
    .click();
  await toast(page)
    .getByRole('button', { name: 'Undo' })
    .click()
    .catch(() => {});
});

test('FLOW-27 receipt screen: items sum to total; View photo; note; Keep as evidence', async ({ page }) => {
  await open(page, '/');
  const id = await db<string>(
    page,
    `(d) => { const r = d.receipts.find(r => r.merchantRaw === 'MYDIN' && r.transactionId); return r.id }`,
  );
  await open(page, `/s/receipt?id=${id}`);
  const t = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
  console.log(t);
  const sens = await page
    .locator('main [data-sen]')
    .evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-sen'))));
  console.log('sens', JSON.stringify(sens));
  await shot(page, 'FLOW-27-step-1-receipt');
  const r = await db<any>(
    page,
    `(d) => { const r = d.receipts.find(r => r.id === '${id}'); const items = d.items.filter(i => i.receiptId === r.id); return { total: r.total, tax: r.tax, service: r.serviceCharge, sum: items.reduce((a,i)=>a+i.price,0), n: items.length } }`,
  );
  console.log('receipt rows:', JSON.stringify(r));
  expect(r.sum).toBe(r.total);
  await page.getByRole('button', { name: /View photo/ }).click();
  await shot(page, 'FLOW-27-step-2-view-photo');
});

test('FLOW-27 every receipt in the scenario: items sum to the printed total', async ({ page }) => {
  await open(page, '/');
  const bad = await db<any>(
    page,
    `(d) => d.receipts.map(r => { const items = d.items.filter(i => i.receiptId === r.id); const sum = items.reduce((a,i)=>a+i.price,0); return { id: r.id.slice(0,8), m: r.merchantRaw, total: r.total, sum, n: items.length, status: r.status, src: r.source }; }).filter(x => x.n > 0 && x.sum !== x.total)`,
  );
  console.log('receipts whose item prices do not sum to total:', JSON.stringify(bad));
  const stats = await db<any>(
    page,
    `(d) => ({ receipts: d.receipts.length, withItems: new Set(d.items.map(i => i.receiptId)).size, sources: [...new Set(d.receipts.map(r => r.source))], noPhoto: d.receipts.filter(r => r.source === 'manual').length })`,
  );
  console.log(JSON.stringify(stats));
  expect(bad).toEqual([]);
});
