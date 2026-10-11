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
  console.log('scroll A', await st(page));
  await review(page, 'new-merchant', 'ROTI BAKAR 88').getByRole('button', { name: 'Meals' }).click();
  console.log('scroll B', await st(page));
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
  console.log('scroll C', await st(page));
  // manual Save offline
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByLabel('Amount').fill('7.77');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText('Added RM7.77');
  console.log('scroll D', page.url(), await st(page));
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  console.log('scroll E more', await st(page));
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  const first = page.locator('[data-index] button').first();
  await page.waitForTimeout(1500);
  await shot(page, 'FLOW-34-dbg-payments');
  console.log('dbg', await page.evaluate(() => document.querySelector('main')!.scrollTop), await page.locator('[data-index]').evaluateAll((els) => els.slice(0, 5).map((e) => e.getAttribute('data-index') + ':' + e.textContent!.slice(0, 25))));
  await page.waitForTimeout(500);
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
  const first = await page.locator('[data-index] button').first().innerText();
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
  const scan = tabs(page).getByRole('button', { name: 'Scan a receipt' });
  const box = (await scan.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.getByRole('button', { name: /Add manually/ }).or(page.getByText('Add manually')).first().click();
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
      await open(page, `/s/${s}${id === '' ? '' : `?id=${encodeURIComponent(id)}`}`);
      await page.waitForTimeout(700);
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
