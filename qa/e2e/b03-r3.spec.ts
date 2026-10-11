import { expect, test, type Page } from '@playwright/test';
import { open, shot, settled, tabs, toast, db, watch, text } from './b03-helpers';

// QA B03 run 3. R3-1..R3-37 (qa/B03/acceptance.md, "Run 3"), FLOW-R3-1..18.

const FAKE = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-r3') };
const undoBtn = (page: Page) => toast(page).getByRole('button', { name: 'Undo' });
const flat = async (page: Page) => (await page.locator('main').innerText()).replace(/\s+/g, ' ');

async function goPayments(page: Page) {
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
}
async function openRow(page: Page, search: string, row?: RegExp) {
  await goPayments(page);
  await page.getByRole('searchbox').fill(search);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: row ?? new RegExp(search) }).first().click();
  await expect(page).toHaveURL(/\/s\/txn/);
  await settled(page);
}
async function scanTo(page: Page, file = FAKE) {
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await expect(page).toHaveURL(/\/scan/);
  await page.getByTestId('scan-camera').setInputFiles(file);
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /./ }).first()).toBeVisible();
}
const homeNums = async (page: Page) => {
  const t = await flat(page);
  return { left: /Left until payday RM ([\d,.]+)/.exec(t)?.[1] ?? /Over by RM ([\d,.]+)/.exec(t)?.[1], spent: /Spent RM([\d,.]+)/.exec(t)?.[1], t: t.slice(0, 260) };
};

test('R3-A By-hand: Enter in the price of Add item adds the item once and shows no error', async ({ page }) => {
  const errors = watch(page);
  await open(page, '/review');
  await openRow(page, 'KEDAI MAKAN AH CHOY');
  await page.getByRole('button', { name: 'No receipt…' }).click();
  await page.getByRole('button', { name: 'Enter the items' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/);
  await settled(page);
  await shot(page, 'R3-A-step-1-by-hand');
  await page.getByLabel('Add an item').fill('Teh tarik');
  await page.getByLabel('Price', { exact: true }).fill('3.50');
  await page.getByLabel('Price', { exact: true }).press('Enter');
  await page.waitForTimeout(600);
  const t = await flat(page);
  const n = (t.match(/Teh tarik/g) ?? []).length;
  const err = /Say what it is/.test(t);
  console.log('Teh tarik items:', n, '| error shown:', err, '|', t.slice(0, 500));
  await shot(page, 'R3-A-step-2-after-enter');
  console.log('errors', errors);
  expect(n).toBe(1);
  expect(err).toBe(false);
});

test('R3-B Mark an OUTGOING payment as Refund of…: spending drops by twice its amount', async ({ page }) => {
  await open(page, '/');
  await page.waitForTimeout(400);
  const h0 = await homeNums(page);
  await openRow(page, 'KEDAI MAKAN AH CHOY');
  await page.getByRole('button', { name: 'Mark as…' }).click();
  await page.getByRole('button', { name: 'Refund of…' }).click();
  await page.getByRole('button', { name: /ZUS COFFEE/ }).first().click();
  await expect(toast(page)).toContainText('Marked as a refund');
  await shot(page, 'R3-B-step-1-marked');
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await settled(page);
  const h1 = await homeNums(page);
  console.log('Home before', JSON.stringify(h0), 'after', JSON.stringify(h1));
  const d = await db<any>(page, `(d) => d.txns.filter(t => t.kind==='refund').map(t => [t.merchantRaw, t.direction, t.amount, t.linkedTransactionId])`);
  console.log('refund rows', JSON.stringify(d));
});

test('R3-C Confirm: fixing a doubtful price moves the committed total off the printed one', async ({ page }) => {
  await open(page, '/');
  await page.waitForTimeout(400);
  await scanTo(page);
  const d0 = await db<any>(page, `(d) => d.drafts[d.drafts.length-1]`);
  console.log('printed total', d0.total, 'items', d0.items.map((i: any) => [i.description, i.amount, i.price, i.doubtful]).join(' | '));
  await page.getByRole('button', { name: /Nasi impit/ }).click();
  await page.getByLabel('Price printed on the receipt').fill('9.50');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(300);
  const t = await flat(page);
  console.log('after fix:', t.slice(0, 900));
  await shot(page, 'R3-C-step-1-fixed');
  const done = page.getByRole('button', { name: 'Done', exact: true });
  console.log('Done enabled after the check fails:', await done.isEnabled());
  await done.click();
  await page.waitForTimeout(600);
  const r = await db<any>(page, `(d) => d.receipts[d.receipts.length-1]`);
  console.log('committed receipt total', r.total, 'status', r.status, 'tx', r.transactionId);
});

test('R3-E manual amount: typed text to sen, and the refusals', async ({ page }) => {
  await open(page, '/review');
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await expect(page).toHaveURL(/\/s\/manual/);
  const amount = page.getByLabel('Amount');
  await page.getByRole('radio', { name: 'Meals' }).click();
  const cases = ['.5', '12.', '12.345', 'abc', '-5', '+5', '1e3', '0', '0.00', '1234,56', '12 50', '９９', '100000000000', '9007199254740993', '00012', 'RM12', '1_000', '   7.5  ', '0x10', '1,23', '١٢'];
  const out: string[] = [];
  for (const c of cases) {
    const n0 = await db<number>(page, `(d) => d.txns.filter(t => t.source==='manual').length`);
    await amount.fill(c);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(250);
    const msg = (await page.locator('[data-slot=field-error]').allInnerTexts()).join(' / ');
    const n1 = await db<number>(page, `(d) => d.txns.filter(t => t.source==='manual').length`);
    const last = await db<any>(page, `(d) => { const m = d.txns.filter(t => t.source==='manual'); return m.length ? m[m.length-1].amount : null }`);
    out.push(`${JSON.stringify(c)} -> saved=${n1 - n0} amount=${n1 - n0 ? last : '-'} msg=${JSON.stringify(msg)}`);
    if (n1 - n0) { await open(page, '/review'); await page.getByRole('button', { name: /Missing a payment/ }).click(); await page.getByRole('radio', { name: 'Meals' }).click(); }
  }
  console.log(out.join('\n'));
});

test('R3-E2 manual saves exactly the typed sen', async ({ page }) => {
  for (const [typed, sen] of [['1,234.56', 123456], ['0.30', 30], ['12.5', 1250], ['99999999999.99', 9999999999999]] as const) {
    await open(page, '/review');
    await page.getByRole('button', { name: /Missing a payment/ }).click();
    await page.getByRole('radio', { name: 'Meals' }).click();
    await page.getByLabel('Amount').fill(typed);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);
    const got = await db<any>(page, `(d) => { const m = d.txns.filter(t => t.source==='manual'); return m.length ? m[m.length-1].amount : null }`);
    console.log(typed, '->', got, got === sen ? 'ok' : 'MISMATCH', 'toast:', (await toast(page).innerText().catch(() => '')).replace(/\s+/g, ' '));
    expect(got).toBe(sen);
  }
});

test('R3-F hostile text: markup, long strings, RTL render as text everywhere', async ({ page }) => {
  const errors = watch(page);
  let dialogs = 0;
  page.on('dialog', (d) => { dialogs++; void d.dismiss(); });
  await open(page, '/review');
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByLabel('Amount').fill('5.00');
  await page.getByRole('button', { name: 'More' }).click();
  const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  await page.getByLabel('Merchant').fill(evil + 'M'.repeat(300));
  await page.getByLabel('Note').fill('line1\n  line2 ' + 'N'.repeat(5000) + ' مرحبا 🙂 ../../etc/passwd');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(800);
  await goPayments(page);
  await shot(page, 'R3-F-step-1-payments');
  const row = page.getByRole('button', { name: /<img src=x/ }).first();
  await expect(row).toBeVisible();
  const box = await row.boundingBox();
  const amt = await row.locator('[data-sen]').first().boundingBox();
  const rowTxt = await row.innerText();
  console.log('row height', box?.height, 'amount box', JSON.stringify(amt), 'amount text', rowTxt.split('\n').filter(l => /RM/.test(l)).join('|'));
  console.log('img injected in DOM:', await page.locator('main img[src="x"]').count(), 'scripts in main:', await page.locator('main script').count());
  await row.click();
  await settled(page);
  await shot(page, 'R3-F-step-2-txn');
  console.log('txn page overflow-x:', await page.evaluate(() => { const m = document.querySelector('main'); return document.documentElement.scrollWidth > innerWidth || (m ? m.scrollWidth > m.clientWidth : 'no main'); }));
  console.log('imgs', await page.locator('main img[src="x"]').count(), 'dialogs', dialogs, 'errors', JSON.stringify(errors));
  expect(dialogs).toBe(0);
});

test('R3-D Home, cycle sheet and Payments agree to the sen', async ({ page }) => {
  await open(page, '/');
  await page.waitForTimeout(400);
  const h = await homeNums(page);
  await page.getByRole('button', { name: /Left until payday/ }).click();
  await page.waitForTimeout(400);
  const sheet = (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ');
  console.log('home', JSON.stringify(h), '\nsheet', sheet);
  await shot(page, 'R3-D-step-1-cycle-sheet');
  await page.keyboard.press('Escape');
  await page.getByText(/more than last cycle by this day/).click();
  await expect(page).toHaveURL(/payments/);
  await settled(page);
  const hdr = await page.evaluate(() => 0);
  // scroll through the virtualised list collecting day headers
  const seen = new Map<string, string>();
  const main = page.locator('main');
  for (let i = 0; i < 80; i++) {
    const heads = await page.locator('main h3').allInnerTexts();
    const spans = await page.locator('main h3').evaluateAll((els) => els.map((e) => e.parentElement!.innerText.replace(/\s+/g, ' ')));
    for (const s of spans) seen.set(s.split(' Spent')[0]!, s);
    const before = await main.evaluate((m) => m.scrollTop);
    await main.evaluate((m) => (m.scrollTop += 600));
    await page.waitForTimeout(60);
    const after = await main.evaluate((m) => m.scrollTop);
    if (after === before) break;
  }
  console.log('headers', seen.size, JSON.stringify([...seen.values()]));
  console.log('count line', await page.getByRole('status').filter({ hasText: /payments/ }).first().innerText());
  const sum = [...seen.values()].reduce((a, s) => a + Number((/Spent RM([\d,.]+)/.exec(s)?.[1] ?? '0').replace(/[,.]/g, '')), 0);
  console.log('sum of day headers (sen):', sum);
});
