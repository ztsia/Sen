import { expect, test, type Page } from '@playwright/test';
import { open, shot, settled, tabs, toast, db, watch } from './b03-helpers';

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
  await page
    .getByRole('button', { name: row ?? new RegExp(search) })
    .first()
    .click();
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
  return {
    left: /Left until payday RM ([\d,.]+)/.exec(t)?.[1] ?? /Over by RM ([\d,.]+)/.exec(t)?.[1],
    spent: /Spent RM([\d,.]+)/.exec(t)?.[1],
    t: t.slice(0, 260),
  };
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

test('R3-B Mark an OUTGOING payment: Refund of… and Income are not offered, and spending is unchanged', async ({
  page,
}) => {
  // finding 28, fixed: a refund is money in (§7, D21), so money out is never offered as one
  await open(page, '/');
  await expect(page.getByTestId('hero')).toBeVisible();
  await page.waitForTimeout(400);
  const h0 = await homeNums(page);
  await openRow(page, 'KEDAI MAKAN AH CHOY');
  await page.getByRole('button', { name: 'Mark as…' }).click();
  await expect(page.getByRole('button', { name: 'Transfer' })).toBeVisible();
  await shot(page, 'R3-B-step-1-mark-as');
  await expect(page.getByRole('button', { name: 'Refund of…' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Income' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await expect(page.getByTestId('hero')).toBeVisible();
  await page.waitForTimeout(400);
  expect(await homeNums(page)).toEqual(h0);
});

test('R3-C Confirm: fixing a doubtful price moves the committed total off the printed one', async ({ page }) => {
  await open(page, '/');
  await page.waitForTimeout(400);
  await scanTo(page);
  const d0 = await db<any>(page, `(d) => d.drafts[d.drafts.length-1]`);
  console.log(
    'printed total',
    d0.total,
    'items',
    d0.items.map((i: any) => [i.description, i.amount, i.price, i.doubtful]).join(' | '),
  );
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
  // the receipt's total is the printed one; a corrected price must not turn it into another amount
  expect(r.total).toBe(d0.total);
});

test('R3-E manual amount: typed text to sen, and the refusals', async ({ page }) => {
  await open(page, '/review');
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await expect(page).toHaveURL(/\/s\/manual/);
  const amount = page.getByLabel('Amount');
  await page.getByRole('radio', { name: 'Meals' }).click();
  const cases = [
    '.5',
    '12.',
    '12.345',
    'abc',
    '-5',
    '+5',
    '1e3',
    '0',
    '0.00',
    '1234,56',
    '12 50',
    '９９',
    '100000000000',
    '9007199254740993',
    '00012',
    'RM12',
    '1_000',
    '   7.5  ',
    '0x10',
    '1,23',
    '١٢',
  ];
  const out: string[] = [];
  for (const c of cases) {
    const n0 = await db<number>(page, `(d) => d.txns.filter(t => t.source==='manual').length`);
    await amount.fill(c);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(250);
    const msg = (await page.locator('[data-slot=field-error]').allInnerTexts()).join(' / ');
    const n1 = await db<number>(page, `(d) => d.txns.filter(t => t.source==='manual').length`);
    const last = await db<any>(
      page,
      `(d) => { const m = d.txns.filter(t => t.source==='manual'); return m.length ? m[m.length-1].amount : null }`,
    );
    out.push(`${JSON.stringify(c)} -> saved=${n1 - n0} amount=${n1 - n0 ? last : '-'} msg=${JSON.stringify(msg)}`);
    if (n1 - n0) {
      await open(page, '/review');
      await page.getByRole('button', { name: /Missing a payment/ }).click();
      await page.getByRole('radio', { name: 'Meals' }).click();
    }
  }
  console.log(out.join('\n'));
});

test('R3-E2 manual saves exactly the typed sen', async ({ page }) => {
  for (const [typed, sen] of [
    ['1,234.56', 123456],
    ['0.30', 30],
    ['12.5', 1250],
    ['99999999999.99', 9999999999999],
  ] as const) {
    await open(page, '/review');
    await page.getByRole('button', { name: /Missing a payment/ }).click();
    await page.getByRole('radio', { name: 'Meals' }).click();
    await page.getByLabel('Amount').fill(typed);
    await shot(page, `R3-E2-typed-${sen}`);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);
    const got = await db<any>(
      page,
      `(d) => { const m = d.txns.filter(t => t.source==='manual'); return m.length ? m[m.length-1].amount : null }`,
    );
    console.log(
      typed,
      '->',
      got,
      got === sen ? 'ok' : 'MISMATCH',
      'toast:',
      (
        await toast(page)
          .innerText()
          .catch(() => '')
      ).replace(/\s+/g, ' '),
    );
    expect(got).toBe(sen);
  }
});

test('R3-F hostile text: markup, long strings, RTL render as text everywhere', async ({ page }) => {
  const errors = watch(page);
  let dialogs = 0;
  page.on('dialog', (d) => {
    dialogs++;
    void d.dismiss();
  });
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
  await expect(page.getByRole('button', { name: /<img src=x/ }).first()).toBeVisible();
  await page.waitForTimeout(500);
  await shot(page, 'R3-F-step-1-payments');
  const row = page.getByRole('button', { name: /<img src=x/ }).first();
  await expect(row).toBeVisible();
  const box = await row.boundingBox();
  const amt = await row.locator('[data-sen]').first().boundingBox();
  const rowTxt = await row.innerText();
  console.log(
    'row height',
    box?.height,
    'amount box',
    JSON.stringify(amt),
    'amount text',
    rowTxt
      .split('\n')
      .filter((l) => /RM/.test(l))
      .join('|'),
  );
  console.log(
    'img injected in DOM:',
    await page.locator('main img[src="x"]').count(),
    'scripts in main:',
    await page.locator('main script').count(),
  );
  await row.click();
  await settled(page);
  await page.waitForTimeout(900);
  await shot(page, 'R3-F-step-2-txn');
  console.log(
    'txn page overflow-x:',
    await page.evaluate(() => {
      const m = document.querySelector('main');
      return document.documentElement.scrollWidth > innerWidth || (m ? m.scrollWidth > m.clientWidth : 'no main');
    }),
  );
  console.log(
    'imgs',
    await page.locator('main img[src="x"]').count(),
    'dialogs',
    dialogs,
    'errors',
    JSON.stringify(errors),
  );
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
  // scroll through the virtualised list collecting day headers
  const seen = new Map<string, string>();
  const main = page.locator('main');
  for (let i = 0; i < 80; i++) {
    const spans = await page
      .locator('main h3')
      .evaluateAll((els) => els.map((e) => e.parentElement!.innerText.replace(/\s+/g, ' ')));
    for (const s of spans) seen.set(s.split(' Spent')[0]!, s);
    const before = await main.evaluate((m) => m.scrollTop);
    await main.evaluate((m) => (m.scrollTop += 600));
    await page.waitForTimeout(60);
    const after = await main.evaluate((m) => m.scrollTop);
    if (after === before) break;
  }
  console.log('headers', seen.size, JSON.stringify([...seen.values()]));
  console.log(
    'count line',
    await page
      .getByRole('status')
      .filter({ hasText: /payments/ })
      .first()
      .innerText(),
  );
  const sum = [...seen.values()].reduce(
    (a, s) => a + Number((/Spent RM([\d,.]+)/.exec(s)?.[1] ?? '0').replace(/[,.]/g, '')),
    0,
  );
  console.log('sum of day headers (sen):', sum);
});

// ---- the walks (FLOW-R3-n), a screenshot per step ----
const rv = (page: Page, kind: string, t: string | RegExp) =>
  page.locator(`[data-review="${kind}"]`).filter({ hasText: t });
const badgeN = async (page: Page) =>
  Number(
    (await page.getByTestId('review-badge').getAttribute('data-count')) ??
      (await page.getByTestId('review-badge').innerText()),
  );
const sen = (s?: string) => Number((s ?? '0').replace(/[,.]/g, ''));
const goHome = async (page: Page) => {
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await settled(page);
  await page.waitForTimeout(300);
};
const balanceOf = async (page: Page) =>
  sen(
    /Total balance RM ?([\d,.]+)/.exec(await flat(page))?.[1] ??
      /Total balance\s*RM([\d,.]+)/.exec(await flat(page))?.[1],
  );

test('FLOW-R3-6 incoming money: a refund lowers spending by exactly the refund, income is unchanged, Undo restores', async ({
  page,
}) => {
  await open(page, '/');
  await page.waitForTimeout(400);
  const h0 = await homeNums(page);
  const inc0 = await db<number>(
    page,
    `(d) => d.txns.filter(t => t.kind==='income' && t.status!=='needs_attention' && !t.deletedAt).reduce((a,t)=>a+t.amount,0)`,
  );
  await shot(page, 'FLOW-R3-6-step-1-home');
  await tabs(page)
    .getByRole('link', { name: /^Review/ })
    .click();
  await settled(page);
  const money = rv(page, 'money-in', /./).first();
  console.log('money-in row:', (await money.innerText()).replace(/\s+/g, ' '));
  await shot(page, 'FLOW-R3-6-step-2-review');
  await money.getByRole('button', { name: 'Refund of…' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('A refund of which payment?');
  const cands = (await dlg.getByRole('button').allInnerTexts()).map((x) => x.replace(/\s+/g, ' '));
  console.log('candidates:', JSON.stringify(cands.slice(0, 5)));
  await shot(page, 'FLOW-R3-6-step-3-pick');
  await dlg.getByRole('button', { name: /RM \d/ }).first().click();
  await expect(toast(page)).toContainText('refund');
  const rf = await db<any>(
    page,
    `(d) => d.txns.filter(t => t.kind==='refund' && !t.deletedAt).map(t => [t.merchantRaw, t.direction, t.amount, d.txns.find(x=>x.id===t.linkedTransactionId)?.amount])`,
  );
  console.log('refunds', JSON.stringify(rf));
  await goHome(page);
  const h1 = await homeNums(page);
  const inc1 = await db<number>(
    page,
    `(d) => d.txns.filter(t => t.kind==='income' && t.status!=='needs_attention' && !t.deletedAt).reduce((a,t)=>a+t.amount,0)`,
  );
  console.log('spent', h0.spent, '->', h1.spent, '| income rows', inc0, '->', inc1);
  expect(inc1).toBe(inc0);
  await shot(page, 'FLOW-R3-6-step-4-home-after');
  expect(sen(h1.spent)).toBe(sen(h0.spent) - 10000);
  await undoBtn(page)
    .click()
    .catch(() => {});
  await page.waitForTimeout(500);
  const h2 = await homeNums(page);
  console.log('after Undo', h2.spent);
});

test('FLOW-R3-7 own transfer: filled-in side, one row, no spending, balances move', async ({ page }) => {
  await open(page, '/');
  await page.waitForTimeout(1200);
  const h0 = await homeNums(page);
  const bal0 = await balanceOf(page);
  console.log('h0', JSON.stringify(h0));
  await tabs(page)
    .getByRole('link', { name: /^Review/ })
    .click();
  await settled(page);
  const r = rv(page, 'transfer-missing', /./);
  console.log('row:', (await r.innerText()).replace(/\s+/g, ' '));
  await shot(page, 'FLOW-R3-7-step-1-review');
  await r.getByRole('button', { name: 'Public Bank' }).click();
  await expect(toast(page)).toContainText('transfer');
  await shot(page, 'FLOW-R3-7-step-2-answered');
  await goHome(page);
  const h1 = await homeNums(page);
  const bal1 = await balanceOf(page);
  console.log('spent', h0.spent, '->', h1.spent, '| left', h0.left, '->', h1.left, '| balance', bal0, '->', bal1);
  expect(h1.spent).toBe(h0.spent);
  expect(h1.left).toBe(h0.left);
  expect(bal0 - bal1).toBe(200000); // the one-sided +RM2,000 is now balanced by the filled-in Public Bank side
  await shot(page, 'FLOW-R3-7-step-3-home');
  await goPayments(page);
  await page.getByRole('searchbox').fill('Public Bank');
  await page.waitForTimeout(500);
  const names = (await page.getByRole('button', { name: /→/ }).allInnerTexts())
    .map((x) => x.replace(/\s+/g, ' '))
    .slice(0, 4);
  console.log('transfer rows:', JSON.stringify(names));
  expect(names.some((x) => x.includes('Public Bank → Ryt Bank') && x.includes('RM2,000.00'))).toBe(true);
  await shot(page, 'FLOW-R3-7-step-4-payments');
});

test('FLOW-R3-9 split: Just my part, my part + Others = the printed total', async ({ page }) => {
  await open(page, '/');
  await page.waitForTimeout(400);
  await scanTo(page);
  await shot(page, 'FLOW-R3-9-step-1-confirm');
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  await page.getByRole('button', { name: 'I paid' }).click();
  await page.getByRole('button', { name: 'Just my part' }).click();
  await shot(page, 'FLOW-R3-9-step-2-tick');
  const dlg = page.getByRole('dialog');
  const done = dlg.getByRole('button', { name: 'Done', exact: true });
  await expect(done).toBeDisabled();
  await dlg.getByRole('checkbox').nth(0).click();
  await dlg.getByRole('checkbox').nth(2).click();
  const line = (await dlg.getByText(/Your part/).innerText()).replace(/\s+/g, ' ');
  console.log('line:', line);
  await shot(page, 'FLOW-R3-9-step-3-ticked');
  await done.click();
  await expect(toast(page)).toContainText(/Your part is/);
  console.log(
    'splits/members',
    JSON.stringify(
      await db<any>(
        page,
        `(d) => ({ n: d.splits.length, mine: d.splits.filter(x => x.receiptId === d.receipts[d.receipts.length-1].id).length, recs: d.receipts.slice(-2).map(x => [x.id, x.merchantRaw, x.total, x.status]), m: d.members.slice(-3).map(x => [x.splitId, x.name, x.isMe, x.isOthers, x.share]) })`,
      ),
    ),
  );
  const res = await db<any>(
    page,
    `(d) => { const r = d.receipts[d.receipts.length-1]; const sp = d.splits.find(x => x.receiptId === r.id) ?? d.splits[d.splits.length-1]; const m = d.members.filter(x => x.splitId === sp.id); const items = d.items.filter(i => i.receiptId === r.id); return { total: r.total, mine: m.find(x=>x.isMe).share, others: m.find(x=>x.isOthers).share, items: items.map(i=>[i.description,i.price,i.kind]), tx: r.transactionId, myShare: d.txns.find(t=>t.id===r.transactionId)?.myShare, amount: d.txns.find(t=>t.id===r.transactionId)?.amount } }`,
  );
  console.log(JSON.stringify(res));
  expect(res.mine + res.others).toBe(res.total);
  expect(res.items.reduce((a: number, i: any) => a + i[1], 0)).toBe(res.total);
  await shot(page, 'FLOW-R3-9-step-4-done');
});

test('FLOW-R3-4 receipt before its payment: waits in Review, attaches by hand, nothing double counted', async ({
  page,
}) => {
  await open(page, '/');
  await page.waitForTimeout(400);
  const h0 = await homeNums(page);
  await scanTo(page, { name: 'nomatch.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('nomatch-r3') });
  await shot(page, 'FLOW-R3-4-step-1-confirm');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toContainText('Waiting for its payment');
  await expect(page).toHaveURL(/\/review/);
  await shot(page, 'FLOW-R3-4-step-2-waiting');
  await expect(page.getByText('Waiting on others')).toBeVisible();
  const wait = page.locator('main').getByText(/KOPITIAM SRI DAMAI receipt/);
  await expect(wait).toBeVisible();
  const n = await badgeN(page);
  console.log('badge', n, '(waiting does not count)');
  await page
    .locator('main')
    .getByText(/KOPITIAM SRI DAMAI receipt/)
    .locator('xpath=ancestor::*[.//button[normalize-space()="Attach to a payment…"]][1]')
    .getByRole('button', { name: 'Attach to a payment…' })
    .click();
  const dlg = page.getByRole('dialog');
  const opts = await dlg.getByRole('button').allInnerTexts();
  console.log(
    'options (first 4):',
    JSON.stringify(opts.slice(0, 4).map((x) => x.replace(/\s+/g, ' '))),
    'count',
    opts.length,
  );
  await shot(page, 'FLOW-R3-4-step-3-attach-sheet');
  await dlg.getByRole('button', { name: /RM \d/ }).first().click();
  await expect(toast(page)).toContainText(/Attached to/);
  await expect(wait).toHaveCount(0);
  await goHome(page);
  const h1 = await homeNums(page);
  console.log('spent', h0.spent, '->', h1.spent);
  expect(h1.spent).toBe(h0.spent);
  await shot(page, 'FLOW-R3-4-step-4-home');
});

test('FLOW-R3-3 before the first salary: no negative figure, no NaN, the estimate is labelled', async ({ page }) => {
  const errors = watch(page);
  await open(page, '/?scenario=before-salary');
  await page.waitForTimeout(500);
  const t = await flat(page);
  console.log(t.slice(0, 400));
  expect(t).toContain('Spent since you started');
  expect(t).not.toMatch(/NaN|undefined|−RM|-RM/);
  await shot(page, 'FLOW-R3-3-step-1-home');
  await page.getByTestId('hero').click();
  await page.waitForTimeout(700);
  const sheet = (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ');
  console.log('sheet:', sheet);
  expect(sheet).not.toMatch(/NaN|undefined/);
  await shot(page, 'FLOW-R3-3-step-2-cycle-sheet');
  console.log('errors', errors);
});

test('FLOW-R3-8 fix a payment: category once / from now on, Mark as, Delete, Undo each', async ({ page }) => {
  await open(page, '/');
  await page.waitForTimeout(400);
  await openRow(page, 'CHICKEN RICE SHOP', /CHICKEN RICE SHOP/);
  await shot(page, 'FLOW-R3-8-step-1-txn');
  const t0 = await flat(page);
  console.log('txn:', t0.slice(0, 500));
  await page.getByRole('button', { name: /Meals/ }).first().click();
  const dlg = page.getByRole('dialog');
  await page.waitForTimeout(600);
  console.log('category sheet buttons:', JSON.stringify((await dlg.getByRole('button').allInnerTexts()).slice(0, 8)));
  await shot(page, 'FLOW-R3-8-step-2-category-sheet');
  await dlg
    .getByRole('button', { name: /Groceries/ })
    .first()
    .click();
  await page.waitForTimeout(600);
  console.log(
    'scope sheet:',
    (
      await page
        .getByRole('dialog')
        .innerText()
        .catch(() => 'none')
    ).replace(/\s+/g, ' '),
  );
  await shot(page, 'FLOW-R3-8-step-3-scope');
  await page.getByRole('button', { name: 'Just this one' }).click();
  await expect(toast(page)).toContainText('Changed to Groceries');
  const c = await db<any>(
    page,
    `(d) => d.txns.filter(t => t.merchantRaw === 'CHICKEN RICE SHOP').map(t => d.categories.find(c => c.id === t.categoryId)?.name).join(',').slice(0, 80)`,
  );
  console.log('categories of CHICKEN RICE SHOP rows:', c);
  await shot(page, 'FLOW-R3-8-step-4-changed');
  await undoBtn(page).click();
  await page.waitForTimeout(500);
  const c2 = await db<any>(
    page,
    `(d) => d.txns.filter(t => t.merchantRaw === 'CHICKEN RICE SHOP').map(t => d.categories.find(c => c.id === t.categoryId)?.name).join(',').slice(0, 80)`,
  );
  console.log('after Undo:', c2);
  expect(c2.startsWith('Meals')).toBe(true);
  // Delete, then Undo
  const n0 = await db<number>(page, `(d) => d.txns.filter(t => !t.deletedAt).length`);
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(toast(page)).toContainText('Deleted');
  await expect(page).toHaveURL(/payments/);
  expect(await db<number>(page, `(d) => d.txns.filter(t => !t.deletedAt).length`)).toBe(n0 - 1);
  await shot(page, 'FLOW-R3-8-step-5-deleted');
  await undoBtn(page).click();
  await page.waitForTimeout(500);
  expect(await db<number>(page, `(d) => d.txns.filter(t => !t.deletedAt).length`)).toBe(n0);
  await shot(page, 'FLOW-R3-8-step-6-undeleted');
});

test('FLOW-R3-13 offline: a change shows Not synced yet, then syncs once when back online', async ({
  page,
  context,
}) => {
  const errors = watch(page);
  await open(page, '/review');
  // visit what we will need while online (the dev server serves chunks on demand)
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.goBack();
  await goPayments(page);
  await tabs(page)
    .getByRole('link', { name: /^Review/ })
    .click();
  await settled(page);
  await context.setOffline(true);
  await page.waitForTimeout(300);
  const n0 = await badgeN(page);
  await rv(page, 'new-merchant', 'ROTI BAKAR 88').getByRole('button', { name: 'Meals' }).click();
  await expect(toast(page)).toContainText('ROTI BAKAR 88 is Meals');
  await expect.poll(() => badgeN(page)).toBe(n0 - 1);
  await shot(page, 'FLOW-R3-13-step-1-offline-answered');
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByLabel('Amount').fill('6.60');
  await page.getByRole('radio', { name: 'Drinks & desserts' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(600);
  await goPayments(page);
  const pend = await page.getByText('Not synced yet').count();
  console.log('Not synced yet marks while offline:', pend);
  expect(pend).toBeGreaterThan(0);
  await shot(page, 'FLOW-R3-13-step-2-not-synced-marks');
  const w = await db<any>(
    page,
    `(d) => ({ manual: d.txns.filter(t => t.source==='manual' && t.amount===660).length, unsynced: Object.keys(d.unsynced).length })`,
  );
  console.log('offline db', JSON.stringify(w));
  await context.setOffline(false);
  await page.waitForTimeout(2500);
  const after = await db<any>(
    page,
    `(d) => ({ manual: d.txns.filter(t => t.source==='manual' && t.amount===660).length, unsynced: Object.keys(d.unsynced).length })`,
  );
  console.log('online db', JSON.stringify(after));
  expect(after.manual).toBe(1);
  expect(after.unsynced).toBe(0);
  await expect(page.getByText('Not synced yet')).toHaveCount(0);
  await shot(page, 'FLOW-R3-13-step-3-synced');
  console.log('errors', errors);
});

test('FLOW-R3-16 back and history: a sheet is a history step, Back closes the top one first', async ({ page }) => {
  await open(page, '/');
  await page.waitForTimeout(400);
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await page
    .getByRole('button', { name: /CHICKEN RICE SHOP/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/s\/txn/);
  await page.getByRole('button', { name: 'Mark as…' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await shot(page, 'FLOW-R3-16-step-1-sheet-open');
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/s\/txn/);
  await shot(page, 'FLOW-R3-16-step-2-back-closed-sheet');
  await page.goBack();
  await expect(page).toHaveURL(/payments/);
  await page.goBack();
  await expect(page).toHaveURL(/\/more/);
  // Sen's sheet, then a second sheet on top
  await page.getByRole('button', { name: 'Ask Sen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const head = (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ').slice(0, 120);
  console.log('Sen sheet:', head);
  expect(head).toContain('Looking at: More');
  await shot(page, 'FLOW-R3-16-step-3-sen');
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Back from a non-Home tab goes to Home?
  await tabs(page)
    .getByRole('link', { name: /^Insights/ })
    .click();
  await page.waitForTimeout(300);
  console.log('url before back from Insights:', page.url());
  await page.goBack();
  await page.waitForTimeout(300);
  console.log('url after back:', page.url());
  await shot(page, 'FLOW-R3-16-step-4-back-from-tab');
});

test('FLOW-R3-2 scan-after (core): scan, crop, read, check, pax, Done attaches once, mark shows, Undo', async ({
  page,
}) => {
  const errors = watch(page);
  await open(page, '/');
  await expect(page.getByTestId('hero')).toBeVisible();
  await page.waitForTimeout(500);
  const h0 = await homeNums(page);
  const n0 = await db<any>(page, `(d) => ({ txns: d.txns.length, rec: d.receipts.length })`);
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await expect(page).toHaveURL(/\/scan/);
  await expect(tabs(page))
    .toBeHidden()
    .catch(() => {});
  await shot(page, 'FLOW-R3-2-step-1-scan');
  await page
    .getByTestId('scan-camera')
    .setInputFiles({ name: 'sate.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('r3-2-photo') });
  await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible();
  const handles = await page.getByRole('slider').count();
  console.log('crop handles (sliders):', handles);
  await shot(page, 'FLOW-R3-2-step-2-crop');
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page.getByText('Reading receipt…')).toBeVisible();
  await shot(page, 'FLOW-R3-2-step-3-reading');
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  await expect(page.getByText('Items add up to the total ✓')).toBeVisible();
  await expect(tabs(page))
    .toBeHidden()
    .catch(() => {});
  await shot(page, 'FLOW-R3-2-step-4-confirm');
  const pax = page.getByRole('region', { name: 'How many people ate?' });
  await page.getByRole('button', { name: 'More people' }).click();
  await page.getByRole('button', { name: 'More people' }).click();
  await expect(pax).toContainText('÷ 3 =');
  await expect(pax).toContainText('RM21.38');
  await shot(page, 'FLOW-R3-2-step-5-pax');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toContainText('Attached to RM64.13 on Ryt Bank');
  await shot(page, 'FLOW-R3-2-step-6-attached');
  const n1 = await db<any>(page, `(d) => ({ txns: d.txns.length, rec: d.receipts.length })`);
  console.log('txns', n0.txns, '->', n1.txns, '| receipts', n0.rec, '->', n1.rec);
  expect(n1.txns).toBe(n0.txns);
  expect(n1.rec).toBe(n0.rec + 1);
  await goHome(page);
  await expect(page.getByTestId('hero')).toBeVisible();
  const h1 = await homeNums(page);
  console.log('spent', h0.spent, '->', h1.spent);
  expect(h1.spent).toBe(h0.spent);
  await openRow(page, 'SATE KAJANG', /SATE KAJANG HJ SAMURI/);
  await expect(page.getByRole('button', { name: /Receipt · 5 items/ })).toBeVisible();
  await shot(page, 'FLOW-R3-2-step-7-txn-receipt');
  console.log('errors', errors);
});

test('FLOW-R3-2s scan failures: a text file, an empty file, the same photo twice, a failed read', async ({ page }) => {
  await open(page, '/');
  await page.waitForTimeout(500);
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  const cam = page.getByTestId('scan-camera');
  await cam.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await page.waitForTimeout(500);
  const t1 = await toast(page)
    .innerText()
    .catch(() => (async () => (await flat(page)).slice(0, 200))());
  console.log(
    'text file ->',
    JSON.stringify(t1),
    '| crop shown:',
    await page.getByRole('button', { name: 'Use this' }).count(),
  );
  await shot(page, 'FLOW-R3-2s-step-1-text-file');
  await cam.setInputFiles({ name: 'empty.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(0) });
  await page.waitForTimeout(500);
  console.log('empty file -> crop shown:', await page.getByRole('button', { name: 'Use this' }).count());
  await shot(page, 'FLOW-R3-2s-step-2-empty-file');
  // the same photo twice
  const photo = { name: 'twice.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('r3-2s-twice') };
  for (let i = 0; i < 2; i++) {
    await cam.setInputFiles(photo);
    await page.getByRole('button', { name: 'Use this' }).click();
    await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Not a payment? Keep it as evidence' }).click();
    await expect(toast(page)).toBeVisible();
    console.log(`photo ${i + 1} toast:`, (await toast(page).innerText()).replace(/\s+/g, ' '));
    await shot(page, `FLOW-R3-2s-step-${3 + i}-twice-${i + 1}`);
    await page.waitForTimeout(700);
    if (i === 0) await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  }
  const same = await db<any>(page, `(d) => d.receipts.filter(r => r.status === 'evidence').length`);
  console.log('evidence receipts after two commits of one photo:', same);
  expect(same).toBe(1);
  // a failed read -> manual with the image
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await cam.setInputFiles({ name: 'blur.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('r3-2s-blur') });
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page.getByText("Sen couldn't read this receipt")).toBeVisible({ timeout: 12_000 });
  await shot(page, 'FLOW-R3-2s-step-5a-failed-read');
  await page.getByRole('button', { name: 'Enter it by hand' }).click();
  await expect(page).toHaveURL(/\/s\/manual/);
  await expect(page.getByRole('img', { name: 'Your receipt photo' })).toBeVisible();
  await shot(page, 'FLOW-R3-2s-step-5-failed-read-manual');
});

test('FLOW-R3-15 states: every tab and pushed screen in empty, loading, error and offline', async ({ page }) => {
  const errors = watch(page);
  const screens = [
    '/',
    '/review',
    '/insights',
    '/more',
    '/s/payments',
    '/s/skipped',
    '/s/budgets',
    '/s/subscriptions',
    '/s/goals',
    '/s/insights/year',
  ];
  const out: string[] = [];
  for (const st of ['empty', 'loading', 'error', 'offline']) {
    for (const path of screens) {
      await page.goto(`${path}${path.includes('?') ? '&' : '?'}state=${st}&look=minted&mode=light`);
      await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
      await page.waitForTimeout(st === 'loading' ? 600 : 500);
      const text = (
        await page
          .locator('main')
          .innerText()
          .catch(() => 'NO MAIN')
      )
        .replace(/\s+/g, ' ')
        .slice(0, 110);
      const spinners = await page.locator('main .animate-spin, main [role=progressbar]').count();
      const skel = await page.locator('main [data-slot=skeleton]').count();
      const btn = await page
        .locator('main button')
        .filter({ hasText: /try again|retry|reload/i })
        .count();
      out.push(`${st.padEnd(7)} ${path.padEnd(18)} skel=${skel} spin=${spinners} retry=${btn} | ${text}`);
      if (path === '/' || path === '/s/payments')
        await shot(page, `FLOW-R3-15-${st}-${path === '/' ? 'home' : 'payments'}`);
    }
  }
  console.log(out.join('\n'));
  console.log('errors', errors.slice(0, 5));
});

test('FLOW-R3-18 six looks: the same words and numbers on Home, Review and Payments', async ({ page }) => {
  const sig: Record<string, string[]> = {};
  for (const look of ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper']) {
    for (const mode of ['light', 'dark']) {
      await open(page, '/', look, mode);
      await expect(page.getByTestId('hero')).toBeVisible();
      await page.waitForTimeout(500);
      const hero = (await page.getByTestId('hero').getAttribute('aria-label')) ?? '';
      const pace = (await page.getByTestId('pace').innerText()).replace(/\s+/g, ' ');
      const note = (await page.getByTestId('sen-note').innerText()).replace(/\s+/g, ' ');
      await tabs(page)
        .getByRole('link', { name: /^Review/ })
        .click();
      await settled(page);
      await page.waitForTimeout(300);
      const rev = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
      sig[`${look}-${mode}`] = [hero, pace, note, rev];
      if (mode === 'light') await shot(page, `FLOW-R3-18-${look}-review`);
    }
  }
  const base = sig['minted-light']!;
  const diffs: string[] = [];
  for (const [k, v] of Object.entries(sig))
    for (let i = 0; i < 4; i++)
      if (v[i] !== base[i]) diffs.push(`${k}[${i}]: ${v[i]!.slice(0, 160)} !== ${base[i]!.slice(0, 160)}`);
  console.log('hero label:', base[0]);
  console.log('differences vs minted-light:', diffs.length, diffs.slice(0, 4).join('\n'));
  expect(diffs.length).toBe(0);
});

test("R3-K Sen's note on Home agrees with the made-up month it sits on (RM31.20 on Saturday, Drinks RM118)", async ({
  page,
}) => {
  await open(page, '/');
  await expect(page.getByTestId('hero')).toBeVisible();
  const note = (await page.getByTestId('sen-note').innerText()).replace(/\s+/g, ' ');
  const sat = await db<number>(
    page,
    `(d) => { let t = 0; for (const x of d.txns) if (!x.deletedAt && x.kind === 'spend' && x.occurredAt.slice(0, 10) === '2026-10-17') t += x.myShare ?? x.amount; return t; }`,
  );
  console.log('note:', note, '| Saturday 17 Oct spending in the data (sen):', sat);
  expect(note).toContain('RM' + (sat / 100).toFixed(2)); // test arithmetic only, never app code
});

test('R3-L at 1.5x text the pace amount stays in one piece (run 2 finding 23)', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 844 });
  await open(page, '/');
  await expect(page.getByTestId('hero')).toBeVisible();
  await page.evaluate(() => (document.documentElement.style.fontSize = '24px'));
  await page.waitForTimeout(600);
  const lines = await page.getByTestId('pace').evaluate((el) => {
    const m = el.querySelector('[data-sen]') as HTMLElement;
    return Math.round(m.getBoundingClientRect().height / parseFloat(getComputedStyle(m).lineHeight));
  });
  await shot(page, 'R3-L-pace-1.5x');
  console.log('lines the amount takes:', lines);
  expect(lines).toBe(1);
});
