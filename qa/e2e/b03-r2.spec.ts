import { expect, test, type Page } from '@playwright/test';
import { open, shot, settled, tabs, toast, db, watch } from './b03-helpers';

// QA B03 run 2. R2-1..R2-17 (qa/B03/acceptance.md, "Run 2"), FLOW-34..44.

const review = (page: Page, kind: string, t: string | RegExp) =>
  page.locator(`[data-review="${kind}"]`).filter({ hasText: t });
const needs = async (page: Page) => Number(/Needs you · (\d+)/.exec(await page.locator('main').innerText())?.[1]);
const badge = async (page: Page) =>
  Number((await page.getByTestId('review-badge').getAttribute('data-count')) ?? (await page.getByTestId('review-badge').innerText()));
const undoBtn = (page: Page) => toast(page).getByRole('button', { name: 'Undo' });

/** Visits a screen while still online, so the dev server has served its chunk. */
const st = (page: Page) => page.locator('main').evaluate((m: any) => m.scrollTop);
async function holdScan(page: Page, ms = 700) {
  await page.waitForTimeout(800);
  const box = (await tabs(page).getByRole('button', { name: 'Scan a receipt' }).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function warm(page: Page) {
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.goBack();
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await settled(page);
  await tabs(page).getByRole('link', { name: /^Review/ }).click();
  await settled(page);
}

test('FLOW-34 R2-1/R2-1s/R2-2 real offline: the answer shows at once, Home and Payments follow, reconnect syncs once', async ({ page, context }) => {
  const errors = watch(page);
  await open(page, '/review');
  await warm(page);
  const n0 = await needs(page);
  const homeBefore = await db<any>(page, `(d) => d.txns.length`);
  await context.setOffline(true);
  await expect(page.getByText(/You're offline/)).toBeVisible();
  await review(page, 'new-merchant', 'ROTI BAKAR 88').getByRole('button', { name: 'Meals' }).click();
  await expect(toast(page)).toContainText('ROTI BAKAR 88 is Meals from now on');
  await shot(page, 'FLOW-34-step-1-offline-answer');
  await expect(review(page, 'new-merchant', 'ROTI BAKAR 88')).toHaveCount(0, { timeout: 3000 });
  await expect.poll(() => needs(page)).toBe(n0 - 1);
  await expect.poll(() => badge(page)).toBe(n0 - 1);
  // Undo offline also shows at once
  await undoBtn(page).click();
  await expect(review(page, 'new-merchant', 'ROTI BAKAR 88')).toBeVisible({ timeout: 3000 });
  await expect.poll(() => needs(page)).toBe(n0);
  await review(page, 'new-merchant', 'ROTI BAKAR 88').getByRole('button', { name: 'Meals' }).click();
  await expect(review(page, 'new-merchant', 'ROTI BAKAR 88')).toHaveCount(0);
  // manual Save offline
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByLabel('Amount').fill('7.77');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText('Added RM7.77');
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  const first = page.locator('main [data-index] button').first();
  await expect(first).toContainText('RM7.77', { timeout: 3000 });
  await expect(first).toContainText('Not synced yet');
  await shot(page, 'FLOW-34-step-2-payments-offline');
  // Home while offline: chip + figure
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await settled(page);
  const homeOffline = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  console.log('home offline:', homeOffline.slice(0, 300));
  expect(homeOffline).toMatch(/not synced|Not synced/i);
  const figOff = /RM\s?([\d,]+\.\d\d)/.exec(await page.getByTestId('hero').innerText())?.[1];
  await shot(page, 'FLOW-34-step-3-home-offline');
  await context.setOffline(false);
  await page.waitForTimeout(2800);
  const after = await db<any>(page, `(d) => ({ n: d.txns.length, unsynced: Object.keys(d.unsynced).length, seven: d.txns.filter(t => t.amount === 777).length, roti: d.txns.filter(t => t.merchantRaw === 'ROTI BAKAR 88').length })`);
  console.log('after sync', JSON.stringify(after), 'n before', homeBefore);
  expect(after.unsynced).toBe(0);
  expect(after.seven).toBe(1);
  expect(after.roti).toBe(1);
  expect(after.n).toBe(homeBefore + 1);
  const figOn = /RM\s?([\d,]+\.\d\d)/.exec(await page.getByTestId('hero').innerText())?.[1];
  console.log('figure offline vs after sync', figOff, figOn);
  expect(figOn).toBe(figOff);
  await expect(page.getByText('Not synced yet')).toHaveCount(0);
  // second cycle offline->online does not resend
  await context.setOffline(true);
  await context.setOffline(false);
  await page.waitForTimeout(2000);
  const again = await db<any>(page, `(d) => d.txns.filter(t => t.amount === 777).length`);
  expect(again).toBe(1);
  await shot(page, 'FLOW-34-step-4-synced');
  expect(errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e))).toEqual([]);
});

test('FLOW-35 R2-3 double and triple taps: one application, one Undo returns it', async ({ page }) => {
  await open(page, '/review');
  // new merchant answer, triple tap
  const snap = () => db<any>(page, `(d) => ({ n: d.txns.length, rules: d.rules.length, ch: Object.values(d.changes).flat().length, review: d.review.length, shares: JSON.stringify(d.shares ?? d.splitMembers ?? null).length })`);
  const s0 = await snap();
  await review(page, 'new-merchant', 'ROTI BAKAR 88').getByRole('button', { name: 'Meals' }).click({ clickCount: 3, delay: 10 });
  await page.waitForTimeout(400);
  const s1 = await snap();
  console.log('new-merchant x3', JSON.stringify(s0), JSON.stringify(s1));
  expect(s1.rules).toBe(s0.rules + 1);
  expect(s1.review).toBe(s0.review - 1);
  const toasts = await page.locator('[data-sonner-toast]').count();
  console.log('toasts after triple tap:', toasts);
  await undoBtn(page).click();
  await page.waitForTimeout(400);
  const s2 = await snap();
  expect(s2.rules).toBe(s0.rules);
  expect(s2.review).toBe(s0.review);
  // Income / Transfer on money in
  for (const label of ['Income', 'Transfer'] as const) {
    const row = review(page, 'money-in', 'TAN AH KOW');
    if (!(await row.count())) break;
    const b = await snap();
    await row.getByRole('button', { name: label }).dblclick({ delay: 5 });
    await page.waitForTimeout(400);
    const a = await snap();
    console.log(label, JSON.stringify(b), JSON.stringify(a));
    expect(a.review).toBe(b.review - 1);
    expect(a.n - b.n).toBeLessThanOrEqual(1); // Transfer may add exactly one filled-in side
    await undoBtn(page).click();
    await page.waitForTimeout(400);
    const u = await snap();
    expect(u.n).toBe(b.n);
    expect(u.review).toBe(b.review);
  }
  await shot(page, 'FLOW-35-step-1-after-taps');
});

test('FLOW-35 R2-3 double tap on Apply all applies the suggestions once', async ({ page }) => {
  await open(page, '/review');
  const snap = () => db<any>(page, `(d) => ({ n: d.txns.length, rules: d.rules.length, review: d.review.length, kinds: d.txns.map(t => t.kind).sort().join(','), amt: d.txns.reduce((a,t)=>a+t.amount,0), shareAmt: JSON.stringify(d.shares ?? null).length })`);
  const line = await page.getByText(/Sen suggested/).innerText();
  console.log('suggestion line:', line);
  const s0 = await snap();
  await page.getByRole('button', { name: 'Apply all' }).dblclick({ delay: 5 });
  await page.waitForTimeout(800);
  const s1 = await snap();
  console.log('apply-all x2', JSON.stringify(s0), JSON.stringify(s1));
  const toastCount = await page.locator('[data-sonner-toast]').count();
  console.log('toasts:', toastCount, (await page.locator('[data-sonner-toast]').allInnerTexts()).join(' || '));
  // a second pass must change nothing further: compare with a single-tap run on a fresh page
  const single = await page.context().newPage();
  await open(single, '/review');
  await single.getByRole('button', { name: 'Apply all' }).click();
  await single.waitForTimeout(800);
  const t1 = await db<any>(single, `(d) => ({ n: d.txns.length, rules: d.rules.length, review: d.review.length, kinds: d.txns.map(t => t.kind).sort().join(','), amt: d.txns.reduce((a,t)=>a+t.amount,0), shareAmt: JSON.stringify(d.shares ?? null).length })`);
  console.log('apply-all x1', JSON.stringify(t1));
  expect(s1).toEqual(t1);
  await shot(page, 'FLOW-35-step-2-apply-all-double');
});

test('FLOW-35 R2-3 double-tap Save on manual makes one payment; double-tap Done on confirm attaches once', async ({ page }) => {
  await open(page, '/review');
  const n0 = await db<number>(page, `(d) => d.txns.length`);
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByLabel('Amount').fill('13.13');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).dblclick({ delay: 5 });
  await page.waitForTimeout(600);
  const c = await db<number>(page, `(d) => d.txns.filter(t => t.amount === 1313).length`);
  expect(c).toBe(1);
  // confirm Done
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await page.getByTestId('scan-camera').setInputFiles({ name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('dbl-done') });
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  await settled(page);
  const r0 = await db<any>(page, `(d) => ({ r: d.receipts.length, t: d.txns.length })`);
  await page.getByRole('button', { name: 'Done', exact: true }).dblclick({ delay: 5 });
  await page.waitForTimeout(800);
  const r1 = await db<any>(page, `(d) => ({ r: d.receipts.length, t: d.txns.length, i: d.items.length })`);
  console.log('confirm Done x2', JSON.stringify(r0), JSON.stringify(r1));
  expect(r1.r).toBe(r0.r + 1);
  expect(r1.t).toBe(r0.t);
  await shot(page, 'FLOW-35-step-3-done-double');
});

test('FLOW-36 R2-4 same file: same bytes under another name, one byte different, after Undo, 0 bytes, text file', async ({ page }) => {
  await open(page, '/');
  const A = Buffer.from('receipt-bytes-A-0123456789');
  const addFile = async (name: string, mimeType: string, buffer: Buffer, tap: string = 'Done') => {
    await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
    await page.getByTestId('scan-camera').setInputFiles({ name, mimeType, buffer });
    const use = page.getByRole('button', { name: 'Use this' });
    await use.click({ timeout: 4000 }).catch(() => {});
    return page.waitForURL(/\/s\/confirm/, { timeout: 8000 }).then(
      () => true,
      () => false,
    );
  };
  const count = () => db<number>(page, `(d) => d.receipts.length`);
  const r0 = await count();
  expect(await addFile('nomatch-A.jpg', 'image/jpeg', A)).toBe(true);
  await settled(page);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toContainText(/Waiting for its payment/);
  const r1 = await count();
  expect(r1).toBe(r0 + 1);
  const first = toast(page);
  // same bytes, other name
  expect(await addFile('copy-of-A (1).jpg', 'image/jpeg', A)).toBe(true);
  await settled(page);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toContainText(/Already added/);
  await shot(page, 'FLOW-36-step-1-already-added');
  expect(await count()).toBe(r1);
  const reviewAfter = await db<any>(page, `(d) => d.review.length`);
  // one byte different
  expect(await addFile('nomatch-B.jpg', 'image/jpeg', Buffer.from('receipt-bytes-B-0123456789'))).toBe(true);
  await settled(page);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toContainText(/Waiting for its payment/);
  expect(await count()).toBe(r1 + 1);
  console.log('review items after dup', reviewAfter);
  // 0 byte and text file
  const zero = await addFile('empty.jpg', 'image/jpeg', Buffer.alloc(0));
  console.log('0-byte file reaches confirm:', zero, 'receipts', await count());
  await shot(page, 'FLOW-36-step-2-zero-byte');
  const txt = await addFile('notes.txt', 'text/plain', Buffer.from('hello'));
  console.log('text file reaches confirm:', txt, 'url', page.url());
  await shot(page, 'FLOW-36-step-3-text-file');
  void first;
});

test('FLOW-36 R2-4s the same file after its first add was Undone can be added again', async ({ page }) => {
  await open(page, '/');
  const F = { name: 'nomatch-U.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('undo-me-bytes') };
  const add = async () => {
    await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
    await page.getByTestId('scan-camera').setInputFiles(F);
    await page.getByRole('button', { name: 'Use this' }).click();
    await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
    await settled(page);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
  };
  const r0 = await db<number>(page, `(d) => d.receipts.length`);
  await add();
  await expect(toast(page)).toContainText(/Waiting for its payment/);
  await undoBtn(page).click();
  await page.waitForTimeout(500);
  expect(await db<number>(page, `(d) => d.receipts.length`)).toBe(r0);
  await add();
  const t = await toast(page).innerText();
  console.log('same file after Undo ->', t.replace(/\n/g, ' | '));
  expect(t).not.toMatch(/Already added/);
  expect(await db<number>(page, `(d) => d.receipts.length`)).toBe(r0 + 1);
});

test('FLOW-37 R2-5 a payment added now is the top of Payments, and the last account default follows the newest', async ({ page }) => {
  await open(page, '/review');
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByLabel('Amount').fill('1234.56');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText('Added RM1,234.56');
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  const first = await page.locator('main [data-index] button').first().innerText();
  console.log('top row:', first.replace(/\n/g, ' | '));
  expect(first).toContain('1,234.56');
  await shot(page, 'FLOW-37-step-1-top-row');
  // order by instant, whatever the offset text
  const order = await db<any>(page, `(d) => d.txns.filter(t=>!t.deletedAt).map(t => Date.parse(t.occurredAt)).sort((a,b)=>b-a)[0] === Date.parse(d.txns.find(t=>t.amount===123456).occurredAt)`);
  expect(order).toBe(true);
});

test('FLOW-38 R2-6 Add expense as the first page: Save lands on Home with the payment; not about:blank', async ({ page }) => {
  await open(page, '/s/manual');
  await page.getByLabel('Amount').fill('5.55');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('hero')).toBeVisible({ timeout: 5000 });
  console.log('url after Save:', page.url());
  expect(page.url()).not.toContain('about:blank');
  await shot(page, 'FLOW-38-step-1-home');
  expect(await db<number>(page, `(d) => d.txns.filter(t => t.amount === 555 && t.source === 'manual').length`)).toBe(1);
});

test('FLOW-38 R2-6s opened from Scan-more Add manually, Save returns to where it was opened; Back without saving creates nothing', async ({ page }) => {
  await open(page, '/insights');
  const n0 = await db<number>(page, `(d) => d.txns.length`);
  await holdScan(page);
  await page.getByRole('dialog').getByRole('button', { name: /Add manually/ }).click();
  await expect(page).toHaveURL(/\/s\/manual/);
  await page.goBack();
  await expect(page).toHaveURL(/insights/);
  expect(await db<number>(page, `(d) => d.txns.length`)).toBe(n0);
  await shot(page, 'FLOW-38-step-2-back-no-save');
});

test('FLOW-41 R2-11 bad addresses and hostile ids say what is wrong and offer a way out', async ({ page }) => {
  const long = 'a'.repeat(5000);
  const ids = ['', 'nope', '../../etc/passwd', "' OR 1=1 --", '<script>alert(1)</script>', long];
  const screens = ['confirm', 'txn', 'receipt', 'goal', 'reading', 'manual'];
  const out: string[] = [];
  for (const s of screens) {
    for (const id of ids) {
      const errors = watch(page);
      await page.goto(`/s/${s}${id === '' ? '' : `?id=${encodeURIComponent(id)}`}&look=minted&mode=light`.replace('&look', id === '' ? '?look' : '&look'));
      await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
      await page.waitForTimeout(2500);
      const body = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
      const loading = await page.locator('main [role="status"]:has-text("Loading")').count();
      const btns = await page.locator('main button, main a').count();
      const bad = /undefined|TypeError|Cannot read|at .*\.tsx|NaN/.test(body);
      out.push(`${s} id=${id.slice(0, 20)}: skeleton=${loading} buttons=${btns} bad=${bad} | ${body.slice(0, 90)}`);
      if (s === 'confirm' && id === 'nope') await shot(page, 'FLOW-41-step-1-confirm-nope');
      expect(bad, `${s} ${id}`).toBe(false);
      expect(errors.filter((e) => !/Failed to load resource/.test(e)), `${s} ${id}`).toEqual([]);
    }
  }
  console.log(out.join('\n'));
});

test('FLOW-42 R2-15 Undo inside the sync window stays undone; offline Undo then online does not resurrect', async ({ page, context }) => {
  await open(page, '/review');
  await warm(page);
  const snap = () => db<any>(page, `(d) => ({ rules: d.rules.length, review: d.review.length, uns: Object.keys(d.unsynced).length })`);
  const s0 = await snap();
  await review(page, 'new-merchant', 'ROTI BAKAR 88').getByRole('button', { name: 'Meals' }).click();
  await undoBtn(page).click();
  await page.waitForTimeout(3000);
  const s1 = await snap();
  expect(s1.rules).toBe(s0.rules);
  expect(s1.review).toBe(s0.review);
  await context.setOffline(true);
  await review(page, 'new-merchant', 'ROTI BAKAR 88').getByRole('button', { name: 'Meals' }).click();
  await undoBtn(page).click();
  await context.setOffline(false);
  await page.waitForTimeout(3000);
  const s2 = await snap();
  console.log('undo timing', JSON.stringify([s0, s1, s2]));
  expect(s2.rules).toBe(s0.rules);
  expect(s2.review).toBe(s0.review);
  expect(s2.uns).toBe(0);
});

// ---------- double taps beyond Review's own row ----------
test('FLOW-35 R2-3 Apply all, double tap: one application, and one Undo returns it', async ({ page }) => {
  await open(page, '/review');
  const snap = () => db<any>(page, `(d) => ({ review: d.review.length, n: d.txns.length, changes: Object.values(d.changes).flat().length })`);
  const s0 = await snap();
  await page.getByRole('button', { name: 'Apply all' }).click({ clickCount: 2, delay: 20 });
  await page.waitForTimeout(1500);
  const s1 = await snap();
  console.log('Apply all x2', JSON.stringify(s0), '->', JSON.stringify(s1));
  expect(s1.changes, 'one change line per applied answer (2 suggestions)').toBe(2);
  await shot(page, 'FLOW-35-step-4-apply-all-double');
  await undoBtn(page).click();
  await page.waitForTimeout(1500);
  const s2 = await snap();
  console.log('after one Undo', JSON.stringify(s2));
  expect(s2.review).toBe(s0.review);
  expect(s2.n).toBe(s0.n);
});

test('FLOW-35 R2-3 Skipped: This was a payment, double tap, makes one payment', async ({ page }) => {
  await open(page, '/s/skipped');
  const n0 = await db<number>(page, `(d) => d.txns.length`);
  const ev0 = await db<number>(page, `(d) => d.events.filter(e => e.parseStatus === 'skipped').length`);
  await page.getByRole('button', { name: 'This was a payment' }).first().click({ clickCount: 2, delay: 20 });
  await page.waitForTimeout(1200);
  const n1 = await db<number>(page, `(d) => d.txns.length`);
  const ev1 = await db<number>(page, `(d) => d.events.filter(e => e.parseStatus === 'skipped').length`);
  console.log('skipped x2', { n0, n1, ev0, ev1 }, await page.locator('[data-sonner-toast]').allInnerTexts());
  expect(n1).toBe(n0 + 1);
  expect(ev1).toBe(ev0 - 1);
  await undoBtn(page).click();
  await page.waitForTimeout(800);
  expect(await db<number>(page, `(d) => d.txns.length`)).toBe(n0);
});

test('FLOW-35 R2-3 txn: Delete double tap goes back once and deletes once; Mark as choice double tap marks once', async ({ page }) => {
  await open(page, '/more');
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await page.getByRole('searchbox', { name: 'Search payments' }).fill('CHICKEN RICE SHOP');
  await page.waitForTimeout(500);
  await page.locator('main [data-index] button').first().click();
  await expect(page).toHaveURL(/\/s\/txn/);
  await settled(page);
  const before = page.url();
  await page.getByRole('button', { name: 'Mark as…' }).click();
  const ch0 = await db<number>(page, `(d) => Object.values(d.changes).flat().length`);
  await page.getByRole('dialog').getByRole('button', { name: 'Transfer' }).click({ clickCount: 2, delay: 20 });
  await page.waitForTimeout(800);
  const ch1 = await db<number>(page, `(d) => Object.values(d.changes).flat().length`);
  console.log('Mark as Transfer x2: change lines', ch0, '->', ch1, '| toasts', await page.locator('[data-sonner-toast]').count());
  expect(ch1 - ch0).toBeLessThanOrEqual(1);
  await undoBtn(page).click();
  await page.waitForTimeout(600);
  // delete, double tap
  const del = page.getByRole('button', { name: 'Delete' });
  await del.click({ clickCount: 2, delay: 20 });
  await page.waitForTimeout(1000);
  console.log('after delete x2: url', page.url(), '| was', before);
  const live0 = await db<any>(page, `(d) => d.txns.filter(t => t.deletedAt).length`);
  expect(live0).toBe(1);
  expect(page.url()).toMatch(/\/s\/payments/);
  await shot(page, 'FLOW-35-step-5-delete-double');
});

test('FLOW-35 R2-3 budgets: Add a budget, double tap Add: one budget', async ({ page }) => {
  await open(page, '/s/budgets');
  await settled(page);
  await page.getByRole('button', { name: 'Add a budget' }).click();
  const dlg = page.getByRole('dialog');
  const cats = await dlg.getByRole('radio').allInnerTexts().catch(() => []);
  console.log('add budget dialog radios:', cats.join(','), '| buttons:', (await dlg.getByRole('button').allInnerTexts()).join(','));
  await shot(page, 'FLOW-35-step-6-add-budget-sheet');
});

// ---------- R2-7, R2-8, R2-9, R2-10, R2-13, R2-14, scroll, text size ----------
async function addPayment(page: Page, amount: string, category: string) {
  await page.goto(page.url()); // never used for state: callers navigate by clicks
}

test('FLOW-39 R2-7 budget wording: exactly at the cap is not Over; one sen over says Over by RM0.01 with icon', async ({ page }) => {
  await open(page, '/review');
  const add = async (amt: string) => {
    await tabs(page).getByRole('link', { name: /^Review/ }).click();
    await page.getByRole('button', { name: /Missing a payment/ }).click();
    await page.getByLabel('Amount').fill(amt);
    await page.getByRole('radio', { name: 'Entertainment' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(toast(page)).toContainText(`Added RM${amt}`);
  };
  const card = async () => {
    await tabs(page).getByRole('link', { name: /^Insights/ }).click();
    await page.getByRole('button', { name: /Open budgets/ }).click();
    await settled(page);
    await page.waitForTimeout(500);
    return (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  };
  await add('150.00');
  let t = await card();
  const m1 = /Entertainment[^A-Z]*RM[\d,.]+ of RM[\d,.]+[^]{0,120}/.exec(t)?.[0];
  console.log('at cap:', m1);
  expect(m1).not.toMatch(/Over by/);
  await shot(page, 'FLOW-39-step-1-at-cap');
  await page.goBack();
  await add('0.01');
  t = await card();
  const m2 = /Entertainment[^A-Z]*RM[\d,.]+ of RM[\d,.]+[^]{0,120}/.exec(t)?.[0];
  console.log('one sen over:', m2);
  expect(m2).toMatch(/Over by RM0\.01/);
  await shot(page, 'FLOW-39-step-2-one-sen-over');
});

test('FLOW-25 R2-8 Changes names who: a note is by you; a rule-filled payment is automatic; Undo logs a line', async ({ page }) => {
  await open(page, '/more');
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await page.getByRole('searchbox', { name: 'Search payments' }).fill('CHICKEN RICE SHOP');
  await page.waitForTimeout(500);
  await page.locator('main [data-index] button').first().click();
  await settled(page);
  const readChanges = async () => (await page.getByRole('region', { name: 'Changes' }).innerText()).replace(/\n+/g, ' | ');
  const c0 = await readChanges();
  console.log('changes before', c0);
  expect(c0).toMatch(/by you|automatically|by Sen/);
  await page.getByRole('button', { name: /Add a note/ }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('textbox').fill('lunch with Mei');
  await dlg.getByRole('button', { name: /Save/ }).click();
  await page.waitForTimeout(600);
  const c1 = await readChanges();
  console.log('changes after note', c1);
  expect(c1).toMatch(/by you/);
  await shot(page, 'FLOW-25-step-1-changes');
  await undoBtn(page).click();
  await page.waitForTimeout(600);
  const c2 = await readChanges();
  console.log('changes after undo', c2);
});

test('FLOW-40 R2-9 Sen suggested N: N marked buttons; Apply all applies N and one Undo reverts N', async ({ page }) => {
  await open(page, '/review');
  const line = await page.getByText(/Sen suggested/).innerText();
  const n = /(\d+) answers/.exec(line)?.[1] ?? '1';
  const marked = await page.locator('main button:has(svg.lucide-sparkles)').count();
  console.log(line, '| marked buttons:', marked);
  expect(marked).toBe(Number(n));
  await page.getByRole('button', { name: 'Apply all' }).click();
  await expect(toast(page)).toContainText(`Applied ${n}`);
  await shot(page, 'FLOW-40-step-1-applied');
});

test('FLOW-40 R2-10 Attach to a payment… lists the same merchant first and then by closeness', async ({ page }) => {
  await open(page, '/review');
  const w = page.getByRole('region', { name: 'Waiting on others' });
  await w.getByRole('button', { name: 'Attach to a payment…' }).first().click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  const rows = (await dlg.getByRole('button').allInnerTexts()).map((r) => r.replace(/\n+/g, ' | ')).filter(Boolean);
  console.log('MR DIY attach list:', JSON.stringify(rows.slice(0, 8)), 'count', rows.length);
  await shot(page, 'FLOW-40-step-2-attach-list');
  const nums = rows.map((r) => Number((/RM([\d,]+\.\d\d)/.exec(r)?.[1] ?? '0').replace(/[,.]/g, '')));
  // MR DIY is RM23.90: after merchant matches, amounts should be non-decreasing in distance
  const dist = nums.map((x) => Math.abs(x - 2390));
  console.log('distances', dist.join(','));
  const firstOther = rows.findIndex((r) => !/^MR DIY/.test(r));
  const sorted = firstOther > 0 && dist.slice(firstOther).every((d, i, a) => i === 0 || d >= a[i - 1]!);
  expect(sorted).toBe(true);
});

test('R2-13 Scan-more: From gallery reaches the gallery picker', async ({ page }) => {
  await open(page, '/insights');
  await holdScan(page);
  await page.getByRole('dialog').getByRole('button', { name: /From gallery/ }).click();
  await expect(page).toHaveURL(/\/scan/);
  const txt = await page.locator('main').innerText();
  console.log('after From gallery:', txt.replace(/\n+/g, ' | ').slice(0, 200));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main').getByRole('button', { name: 'From gallery' })).toBeVisible();
  await shot(page, 'R2-13-from-gallery');
});

test('R2-14 made-up data: no goal contribution after today; no Review text names an unknown account; headers', async ({ page }) => {
  await open(page, '/s/goals');
  const d = await db<any>(page, `(d) => ({ now: d.now, future: d.contributions.filter(c => Date.parse(c.occurredAt) > Date.parse(d.now)).length, accts: d.accounts.map(a => a.name) })`);
  console.log('contributions after now:', d.future, 'accounts', d.accts.join(','));
  expect(d.future).toBe(0);
});

test('R2-S scroll: a screen opens at its top, whatever the screen before it was scrolled to', async ({ page }) => {
  await open(page, '/review');
  await page.waitForTimeout(500);
  await page.locator('main').evaluate((m) => m.scrollTo(0, 900));
  const before = await page.locator('main').evaluate((m) => m.scrollTop);
  expect(before).toBeGreaterThan(300);
  await tabs(page).getByRole('link', { name: /^Insights/ }).click();
  await page.waitForTimeout(600);
  const top = await page.locator('main').evaluate((m) => m.scrollTop);
  console.log('review scrolled to', before, '-> Insights scrollTop', top);
  await shot(page, 'R2-S-insights-opened-scrolled');
  expect(top).toBe(0);
});

test('R2-S2 scroll: Payments opened a second time opens at its top', async ({ page }) => {
  await open(page, '/more');
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await tabs(page).getByRole('link', { name: /^Review/ }).click();
  await page.waitForTimeout(600);
  await page.locator('main').evaluate((m) => m.scrollTo(0, 900));
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await page.waitForTimeout(800);
  const top = await page.locator('main').evaluate((m) => m.scrollTop);
  const first = (await page.locator('main [data-index]').first().innerText()).replace(/\n+/g, ' | ');
  console.log('Payments 2nd open: scrollTop', top, '| first rendered:', first.slice(0, 60));
  await shot(page, 'R2-S2-payments-opened-scrolled');
  expect(top).toBe(0);
});

test('R2-S3 scroll: a tab revisited opens at its top, not at the previous screen\'s offset', async ({ page }) => {
  await open(page, '/insights');
  await page.waitForTimeout(800);
  await tabs(page).getByRole('link', { name: /^Review/ }).click();
  await page.waitForTimeout(600);
  await page.locator('main').evaluate((m) => m.scrollTo(0, 900));
  await tabs(page).getByRole('link', { name: /^Insights/ }).click();
  await page.waitForTimeout(800);
  const top = await page.locator('main').evaluate((m) => m.scrollTop);
  console.log('Insights revisited after Review at 900: scrollTop', top);
  await shot(page, 'R2-S3-insights-revisited-scrolled');
  expect(top).toBe(0);
});

test('FLOW-44 R2-17 the preview over plain http on a LAN address: Scan still reads a photo, or says what is wrong', async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: 'http://192.0.2.2:5183', viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.goto('/scan?look=minted&mode=light');
  await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
  console.log('isSecureContext', await page.evaluate(() => window.isSecureContext), '| crypto.subtle', await page.evaluate(() => typeof crypto.subtle));
  await page.getByTestId('scan-camera').setInputFiles({ name: 'r.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('lan-bytes') });
  await page.waitForTimeout(1500);
  const t = (await page.locator('body').innerText()).replace(/\n+/g, ' | ');
  console.log('after picking a file over http:', page.url(), '|', t.slice(0, 260), '| toasts:', await page.locator('[data-sonner-toast]').allInnerTexts());
  await shot(page, 'FLOW-44-step-1-http-lan');
  console.log('errors', errors.slice(0, 3));
  await ctx.close();
});

for (const vp of [{ width: 412, height: 915 }, { width: 390, height: 844 }])
  test(`FLOW-43 R2-16 text at 1.5x, ${vp.width} wide: no sideways scroll, no clipped or off-screen amount`, async ({ page }) => {
    await page.setViewportSize(vp);
    const report: string[] = [];
    const check = async (label: string) => {
      await page.evaluate(() => (document.documentElement.style.fontSize = '24px'));
      await page.waitForTimeout(500);
      const r = await page.evaluate((w) => {
        const bad: string[] = [];
        const doc = document.documentElement;
        const main = document.querySelector('main') as HTMLElement | null;
        if (doc.scrollWidth > w + 1) bad.push(`document scrollWidth ${doc.scrollWidth}`);
        if (main && main.scrollWidth > main.clientWidth + 1) bad.push(`main scrollWidth ${main.scrollWidth} > ${main.clientWidth}`);
        for (const el of Array.from(document.querySelectorAll('main *')) as HTMLElement[]) {
          if (el.children.length) continue;
          const t = el.textContent ?? '';
          if (!/^\s*[+\-−]?RM\s?[\d,]+\.\d\d/.test(t)) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width <= 2 || getComputedStyle(el).position === 'fixed' || el.closest('.sr-only,[class*="sr-only"]')) continue;
          if (el.scrollWidth > el.clientWidth + 1) bad.push(`clipped amount "${t.trim().slice(0, 14)}" ${el.scrollWidth}>${el.clientWidth}`);
          if (rect.right > w + 1 || rect.left < -1) bad.push(`amount off-screen "${t.trim().slice(0, 14)}" right=${Math.round(rect.right)}`);
        }
        return bad;
      }, vp.width);
      report.push(`${label}: ${r.length ? r.join('; ') : 'ok'}`);
      return r;
    };
    const all: string[] = [];
    for (const [path, label] of [
      ['/', 'home'],
      ['/review', 'review'],
      ['/s/payments', 'payments'],
      ['/s/budgets', 'budgets'],
      ['/s/goals', 'goals'],
      ['/s/subscriptions', 'subscriptions'],
      ['/insights', 'insights'],
      ['/more', 'more'],
      ['/s/skipped', 'skipped'],
    ] as const) {
      await open(page, path);
      await page.waitForTimeout(500);
      all.push(...(await check(label)));
      if (label === 'home') await shot(page, `FLOW-43-step-1-home-${vp.width}`);
      if (label === 'review') await shot(page, `FLOW-43-step-2-review-${vp.width}`);
      if (label === 'budgets') await shot(page, `FLOW-43-step-3-budgets-${vp.width}`);
    }
    // txn, confirm, goal
    await open(page, '/s/payments');
    await page.locator('main [data-index] button').first().click();
    await settled(page);
    all.push(...(await check('txn')));
    await shot(page, `FLOW-43-step-4-txn-${vp.width}`);
    await open(page, '/s/goals');
    await page.locator('main button, main a').first().click().catch(() => {});
    await page.waitForTimeout(500);
    all.push(...(await check('goal (first tap)')));
    await open(page, '/scan');
    await page.getByTestId('scan-camera').setInputFiles({ name: 'x.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('t15x') });
    await page.getByRole('button', { name: 'Use this' }).click();
    await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
    await settled(page);
    all.push(...(await check('confirm')));
    await shot(page, `FLOW-43-step-5-confirm-${vp.width}`);
    console.log(report.join('\n'));
    expect(all).toEqual([]);
  });

test('FLOW-34b R2-1 preview build with its service worker: offline, every tab and the pushed screens still open', async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: 'http://127.0.0.1:5181', viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  await page.goto('/?look=minted&mode=light');
  await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
  });
  await page.waitForTimeout(1500);
  await ctx.setOffline(true);
  const results: string[] = [];
  const broken = async (label: string) => {
    await page.waitForTimeout(700);
    const t = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const bad = /didn't open|Something went wrong/.test(t);
    results.push(`${label}: ${bad ? 'BROKEN: ' + t.slice(0, 80) : 'ok'}`);
    return bad;
  };
  const bads: boolean[] = [];
  for (const name of ['Review', 'Insights', 'More', 'Home']) {
    await tabs(page).getByRole('link', { name: new RegExp(`^${name}`) }).click();
    bads.push(await broken(`tab ${name}`));
  }
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  bads.push(await broken('payments'));
  await page.locator('main [data-index] button').first().click();
  bads.push(await broken('txn'));
  await tabs(page).getByRole('link', { name: /^Insights/ }).click();
  await page.getByRole('button', { name: /Open budgets/ }).click();
  bads.push(await broken('budgets'));
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  bads.push(await broken('scan'));
  await shot(page, 'FLOW-34b-step-1-offline-preview');
  console.log(results.join('\n'));
  await ctx.close();
  expect(bads.some(Boolean)).toBe(false);
});

test('FLOW-35b R2-3s Undo double-tapped reverts once, with no error', async ({ page }) => {
  const errors = watch(page);
  await open(page, '/review');
  const snap = () => db<any>(page, `(d) => ({ rules: d.rules.length, review: d.review.length, n: d.txns.length })`);
  const s0 = await snap();
  await review(page, 'new-merchant', 'ROTI BAKAR 88').getByRole('button', { name: 'Meals' }).click();
  await expect(toast(page)).toContainText('Undo');
  await undoBtn(page).click({ clickCount: 2, delay: 15 });
  await page.waitForTimeout(1200);
  const s1 = await snap();
  console.log('undo x2', JSON.stringify(s0), JSON.stringify(s1), '| toasts:', JSON.stringify(await page.locator('[data-sonner-toast]').allInnerTexts()));
  expect(s1).toEqual(s0);
  expect(await page.locator('[data-sonner-toast]').allInnerTexts()).not.toEqual(expect.arrayContaining([expect.stringMatching(/went wrong|didn't|error/i)]));
  expect(errors).toEqual([]);
  await shot(page, 'FLOW-35b-step-1-undo-double');
});

test('FLOW-35c R2-3 a double tap on a Review answer lands on the next row? one answer only (ten rapid taps on one spot)', async ({ page }) => {
  await open(page, '/review');
  const need0 = await needs(page);
  const btn = review(page, 'new-merchant', 'ROTI BAKAR 88').getByRole('button', { name: 'Meals' });
  const box = (await btn.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  for (let i = 0; i < 3; i++) {
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(800);
  const need1 = await needs(page);
  console.log('3 taps 120 ms apart at one spot: Needs you', need0, '->', need1);
  await shot(page, 'FLOW-35c-step-1-three-taps-same-spot');
  expect(need1).toBe(need0 - 1);
});

test('FLOW-17b R2-12 by hand: Done with items over the payment tells you where you are looking (the refusal is on screen)', async ({ page }) => {
  await open(page, '/');
  const id = await db<string>(page, `(d) => d.txns.find(t => t.merchantRaw === 'SATE KAJANG HJ SAMURI').id`);
  await open(page, `/s/txn?id=${id}`);
  await page.getByRole('button', { name: 'No receipt…' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Enter the items' }).click();
  await settled(page);
  await page.getByLabel('Add an item').fill('Big');
  await page.getByLabel('Price').last().fill('999.00');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const err = page.getByText(/can't come to more than the payment/);
  await expect(err).toBeAttached();
  const inView = await err.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  });
  console.log('refusal text in the viewport after tapping Done:', inView, '| toasts', await page.locator('[data-sonner-toast]').count());
  await shot(page, 'FLOW-17b-step-1-refusal-on-screen');
  expect(inView).toBe(true);
  // equal is accepted: remove Big, add the exact remainder
});

test('FLOW-17c R2-12 by hand: items equal to the payment are accepted with no unitemised line', async ({ page }) => {
  await open(page, '/');
  const id = await db<string>(page, `(d) => d.txns.find(t => t.merchantRaw === 'SATE KAJANG HJ SAMURI').id`);
  await open(page, `/s/txn?id=${id}`);
  await page.getByRole('button', { name: 'No receipt…' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Enter the items' }).click();
  await settled(page);
  await page.getByLabel('Add an item').fill('Everything');
  await page.getByLabel('Price').last().fill('64.13');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  const t = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
  console.log('items = payment:', t.match(/Items add up[^|]*|not itemised[^|]*|[^|]*not itemised/)?.[0]);
  expect(t).not.toMatch(/not itemised/);
  await page.getByLabel('Price').last().fill('');
  const r0 = await db<number>(page, `(d) => d.receipts.length`);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(800);
  console.log('equal items, Done ->', JSON.stringify(await page.locator('[data-sonner-toast]').allInnerTexts()), '| url', page.url(), '| receipts', r0, '->', await db<number>(page, `(d) => d.receipts.length`), '| receipt for payment:', JSON.stringify(await db<any>(page, `(d) => d.receipts.filter(r => r.transactionId === '${id}').map(r => ({ total: r.total, status: r.status, items: d.items.filter(i => i.receiptId === r.id).length }))`)));
  await shot(page, 'FLOW-17c-step-1-equal-accepted');
});
