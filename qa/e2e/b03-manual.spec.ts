import { expect, test, type Page } from '@playwright/test';
import { open, shot, toast, db } from './b03-helpers';

// FLOW-7, 8, 9: AC-35, AC-35s, AC-36, AC-36s, AC-37, AC-60s, AC-63

async function toManual(page: Page) {
  await open(page, '/review');
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await expect(page).toHaveURL(/\/s\/manual/);
}
const lastManual = (page: Page) =>
  db<any>(
    page,
    `(d) => { const m = d.txns.filter(t => t.source === 'manual' && !t.deletedAt && t.createdAt >= '2026-10-10'); const t = m[m.length-1]; return { n: d.txns.length, amount: t?.amount, cat: t?.categoryId, acct: t?.accountId, at: t?.occurredAt, merchant: t?.merchantRaw, note: t?.note, status: t?.status } }`,
  );

test('FLOW-7 manual entry: 12.5 -> RM12.50, category order, account default, time now, Undo removes it', async ({
  page,
}) => {
  await toManual(page);
  await expect(page.getByRole('radio').first()).toBeVisible();
  const radios = await page.getByRole('radio').allInnerTexts();
  console.log('category order:', JSON.stringify(radios));
  const cats = await db<any>(
    page,
    `(d) => { const since = '2026-07-20'; const c = {}; for (const t of d.txns) if (t.categoryId && !t.deletedAt && t.occurredAt.slice(0,10) >= since) c[t.categoryId] = (c[t.categoryId]||0)+1; return d.categories.filter(x => x.kind==='spend' && !x.archivedAt && x.systemKey !== 'unaccounted').map(x => ({ name: x.name, n: c[x.id]||0 })).sort((a,b) => b.n - a.n) }`,
  );
  console.log('90-day usage (approx):', JSON.stringify(cats.slice(0, 6)));
  expect(radios[0]).toBe(cats[0].name);
  await shot(page, 'FLOW-7-step-1-manual');
  const amount = page.getByLabel('Amount');
  await amount.fill('12.5');
  await page.getByRole('radio', { name: 'Meals' }).click();
  console.log('account line:', await page.getByText(/Paid from/).innerText());
  console.log('time line:', await page.getByText('Now').innerText());
  const before = await lastManual(page);
  await shot(page, 'FLOW-7-step-2-typed');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText('Added RM12.50 · Meals');
  const after = await lastManual(page);
  console.log('saved row:', JSON.stringify(after));
  expect(after.n).toBe(before.n + 1);
  expect(after.amount).toBe(1250);
  expect(after.at.startsWith('2026-10-18T12:4')).toBe(true); // 20:4x KL = 12:4x UTC, the app clock
  await shot(page, 'FLOW-7-step-3-saved');
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(300);
  const undone = await lastManual(page);
  expect(undone.n).toBe(before.n);
});

test('FLOW-7 Enter in the amount saves once', async ({ page }) => {
  await toManual(page);
  const before = await lastManual(page);
  await page.getByLabel('Amount').fill('7.70');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByLabel('Amount').press('Enter');
  await page.waitForTimeout(800);
  const after = await lastManual(page);
  console.log('Enter once:', before.n, '->', after.n);
  expect(after.n).toBe(before.n + 1);
});

test('FLOW-8 double-tap Save creates one payment', async ({ page }) => {
  await toManual(page);
  const before = await lastManual(page);
  await page.getByLabel('Amount').fill('8.80');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).dblclick();
  await page.waitForTimeout(800);
  const after = await lastManual(page);
  console.log('dblclick Save:', before.n, '->', after.n);
  expect(after.n).toBe(before.n + 1);
});

const CASES: [string, string, number | null][] = [
  ['', 'Type the amount', null],
  ['0', 'above zero', null],
  ['0.00', 'above zero', null],
  ['.', 'ringgit', null],
  ['1.234', 'Two decimals', null],
  ['-5', 'ringgit', null],
  ['1e5', 'ringgit', null],
  ['abc', 'ringgit', null],
  ['99999999999999999999', 'too large', null],
  ['100000000000.00', 'too large', null],
  ['19.99', '', 1999],
  ['4.35', '', 435],
  ['1.005', 'Two decimals', null],
  ['1,284.5', '', 128450],
  ['1284.50', '', 128450],
  ['0.1', '', 10],
  ['0.01', '', 1],
  ['  9.90  ', '', 990],
  ['RM12', 'ringgit', null],
  ['12,5', 'ringgit', null],
  ['१२', 'ringgit', null],
  ["1'; DROP TABLE transactions;--", 'ringgit', null],
  ['../../etc/passwd', 'ringgit', null],
  ['9'.repeat(5000), 'too large', null],
];
for (const [text_, msg, want] of CASES)
  test(`FLOW-8 amount ${JSON.stringify(text_.length > 30 ? text_.slice(0, 12) + '…(' + text_.length + ')' : text_)}`, async ({
    page,
  }) => {
    await toManual(page);
    const before = await lastManual(page);
    await page.getByLabel('Amount').fill(text_);
    await page.getByRole('radio', { name: 'Meals' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);
    const after = await lastManual(page);
    const err = await page.locator('[data-slot="field-error"], [role="alert"]').allInnerTexts();
    const url = page.url();
    console.log(
      JSON.stringify(text_.slice(0, 20)),
      '-> rows',
      after.n - before.n,
      'amount',
      after.n > before.n ? after.amount : '-',
      '| error:',
      JSON.stringify(err).slice(0, 120),
      '| url',
      url.replace(/\?.*/, ''),
    );
    if (want === null) {
      expect(after.n).toBe(before.n);
      expect(err.join(' ').toLowerCase()).toContain(msg.toLowerCase());
    } else {
      expect(after.n).toBe(before.n + 1);
      expect(after.amount).toBe(want);
    }
  });

test('AC-35s validation message appears on blur and the form keeps what was typed; no category -> message', async ({
  page,
}) => {
  await toManual(page);
  await page.getByLabel('Amount').fill('12.345');
  await page.getByLabel('Amount').blur();
  await expect(page.locator('[data-slot="field-error"]').first()).toContainText('Two decimals');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByLabel('Amount').fill('5');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Pick a category.')).toBeVisible();
  await shot(page, 'FLOW-8-step-1-no-category');
  // More: merchant and note, kept
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByLabel('Merchant').fill('Kedai Test <script>alert(1)</script> ' + 'x'.repeat(300));
  await page.getByLabel('Note').fill('a note');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText('Added RM5.00');
  const r = await lastManual(page);
  console.log('merchant stored length', r.merchant.length, 'note', r.note);
  await shot(page, 'FLOW-8-step-2-hostile-merchant');
});

test('FLOW-9 near-duplicate warns but does not block', async ({ page }) => {
  await toManual(page);
  await page.getByLabel('Amount').fill('64.13');
  await page.waitForTimeout(800);
  const warn = await page
    .getByRole('status')
    .filter({ hasText: /Looks like/ })
    .innerText()
    .catch(() => '(none)');
  console.log('near-duplicate warning:', warn);
  await shot(page, 'FLOW-9-step-1-warning');
  await page.getByRole('radio', { name: 'Meals' }).click();
  const before = await lastManual(page);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText('Added RM64.13');
  const after = await lastManual(page);
  expect(after.n).toBe(before.n + 1);
  expect(warn).toContain('Looks like');
});

test('AC-36 Save from a deep link / launcher shortcut (manual is the first page) -> where does the app go?', async ({
  page,
}) => {
  await open(page, '/s/manual');
  await page.getByLabel('Amount').fill('3.30');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(1000);
  console.log('after Save when manual was the first page:', page.url());
  await shot(page, 'FLOW-7-step-4-save-from-shortcut');
  expect(page.url()).toContain('127.0.0.1:5180');
});
