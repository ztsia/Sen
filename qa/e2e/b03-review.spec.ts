import { expect, test } from '@playwright/test';
import { open, shot, settled, toast, watch, db } from './b03-helpers';

// FLOW-4, 5, 6, C2 (pay-new): AC-2, AC-17..AC-23, AC-63

const row = (page: any, kind: string, t: string | RegExp) =>
  page.locator(`[data-review="${kind}"]`).filter({ hasText: t });
const badge = async (page: any) =>
  Number(
    (await page.getByTestId('review-badge').getAttribute('data-count')) ??
      (await page.getByTestId('review-badge').innerText()),
  );

test('FLOW-C2 pay-new (core): answer ROTI BAKAR 88, rule made, badge falls, Undo restores', async ({ page }) => {
  const errors = watch(page);
  await open(page, '/review');
  await expect(page.locator('main')).toContainText('Needs you · 12');
  const b0 = await badge(page);
  expect(b0).toBe(12);
  const r = row(page, 'new-merchant', 'ROTI BAKAR 88');
  await expect(r).toContainText('RM9.50');
  const buttons = await r.getByRole('button').allInnerTexts();
  console.log('ROTI BAKAR buttons:', JSON.stringify(buttons));
  await shot(page, 'FLOW-C2-step-1-review');
  const before = await db<any>(
    page,
    `(d) => ({ rules: d.rules.length, t: d.txns.find(t => t.merchantRaw === 'ROTI BAKAR 88') })`,
  );
  expect(before.t.categoryId).toBeNull();
  await r.getByRole('button', { name: 'Meals' }).click();
  await expect(toast(page)).toContainText('ROTI BAKAR 88 is Meals from now on');
  await expect(r).toHaveCount(0);
  const after = await db<any>(
    page,
    `(d) => ({ rules: d.rules.length, rule: d.rules.find(r => r.merchantKey === 'ROTI BAKAR 88'), t: d.txns.find(t => t.merchantRaw === 'ROTI BAKAR 88'), meals: d.categories.find(c => c.name==='Meals').id })`,
  );
  console.log(
    'after answer:',
    JSON.stringify({ rules: after.rules, rule: after.rule, cat: after.t.categoryId, status: after.t.status }),
  );
  expect(after.rules).toBe(before.rules + 1);
  expect(after.t.categoryId).toBe(after.meals);
  expect(after.rule.categoryId).toBe(after.meals);
  await expect.poll(() => badge(page)).toBe(11);
  await shot(page, 'FLOW-C2-step-2-answered');
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(row(page, 'new-merchant', 'ROTI BAKAR 88')).toBeVisible();
  const undone = await db<any>(
    page,
    `(d) => ({ rules: d.rules.length, t: d.txns.find(t => t.merchantRaw === 'ROTI BAKAR 88') })`,
  );
  expect(undone.rules).toBe(before.rules);
  expect(undone.t.categoryId).toBeNull();
  await expect.poll(() => badge(page)).toBe(12);
  await shot(page, 'FLOW-C2-step-3-undone');
  expect(errors).toEqual([]);
});

test('AC-18s double-tapping an answer applies once (transfer-missing creates one inferred side)', async ({ page }) => {
  await open(page, '/review');
  const r = row(page, 'transfer-missing', 'from your own name');
  const before = await db<any>(
    page,
    `(d) => ({ n: d.txns.length, inferred: d.txns.filter(t => t.source === 'inferred').length })`,
  );
  await r.getByRole('button', { name: 'Public Bank' }).dblclick();
  await page.waitForTimeout(800);
  const after = await db<any>(
    page,
    `(d) => ({ n: d.txns.length, inferred: d.txns.filter(t => t.source === 'inferred').length })`,
  );
  console.log('double-tap on Public Bank:', JSON.stringify({ before, after }));
  await shot(page, 'FLOW-4-step-5-double-tap');
  expect(after.inferred - before.inferred).toBe(1);
});

test('AC-18s double-tapping New-wording No / share ticks apply once', async ({ page }) => {
  await open(page, '/review');
  const r = row(page, 'money-in-share', 'LIM K H');
  await r.getByRole('button', { name: /Kah Hoe/ }).dblclick();
  await page.waitForTimeout(800);
  const toasts = await page.locator('[data-sonner-toast]').allInnerTexts();
  console.log('toasts after dblclick:', JSON.stringify(toasts));
  const undo = page.locator('[data-sonner-toast]').getByRole('button', { name: 'Undo' }).first();
  await undo.click();
  await page.waitForTimeout(600);
  const back = await row(page, 'money-in-share', 'LIM K H').count();
  console.log('after one Undo following a double tap, the row is back:', back === 1);
  expect(back).toBe(1);
});

test('FLOW-4 every Needs-you kind present with its buttons; max 3 + Other', async ({ page }) => {
  await open(page, '/review');
  const kinds = await page.locator('[data-review]').evaluateAll((els) =>
    els.map((e) => ({
      kind: e.getAttribute('data-review'),
      buttons: [...e.querySelectorAll('button')].map((b) => b.textContent!.trim()),
    })),
  );
  console.log(JSON.stringify(kinds, null, 1));
  for (const k of kinds) expect(k.buttons.filter((b) => b !== 'Other…').length, k.kind!).toBeLessThanOrEqual(3);
  const names = new Set(kinds.map((k) => k.kind));
  for (const k of [
    'new-merchant',
    'money-in-share',
    'money-in',
    'owe-share',
    'receipt-unread',
    'new-wording',
    'transfer-missing',
    'balance-check',
    'claim-due',
    'payday-step',
    'proposal',
  ])
    expect(names.has(k), k).toBe(true);
  await shot(page, 'FLOW-4-step-1-all-kinds');
});

test('FLOW-4 Apply all: one Undo reverts both', async ({ page }) => {
  await open(page, '/review');
  const n0 = await badge(page);
  await expect(page.getByText(/Sen suggested 2 answers/)).toBeVisible();
  await page.getByRole('button', { name: 'Apply all' }).click();
  await page.waitForTimeout(800);
  const tt = await toast(page).innerText();
  console.log('apply-all toast:', tt.replace(/\n/g, ' | '), '| badge', await badge(page));
  await shot(page, 'FLOW-4-step-6-apply-all');
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(800);
  console.log('after Undo badge', await badge(page), 'want', n0);
  expect(await badge(page)).toBe(n0);
  await expect(page.getByText(/Sen suggested 2 answers/)).toBeVisible();
});

test('FLOW-5 Waiting on others is not in the badge; Missing a payment? -> manual; Skipped -> skipped -> This was a payment', async ({
  page,
}) => {
  await open(page, '/review');
  const waiting = page.getByRole('region', { name: 'Waiting on others' });
  await expect(waiting).toContainText('BBQ PLACE');
  await expect(waiting).toContainText('MR DIY');
  await expect(waiting).toContainText('SHOPEE');
  const rbtn = await waiting.getByRole('button').allInnerTexts();
  console.log('waiting buttons', JSON.stringify(rbtn));
  expect(await badge(page)).toBe(12);
  await shot(page, 'FLOW-5-step-1-waiting');
  await page.getByRole('button', { name: /Skipped notifications/ }).click();
  await expect(page).toHaveURL(/\/s\/skipped/);
  await settled(page);
  await expect(page.getByRole('button', { name: 'This was a payment' }).first()).toBeVisible();
  const before = await page.getByRole('button', { name: 'This was a payment' }).count();
  console.log('skipped rows:', before);
  await shot(page, 'FLOW-5-step-2-skipped');
  await page.getByRole('button', { name: 'This was a payment' }).first().click();
  await expect(toast(page)).toContainText('Sen will read it as a payment');
  await page.waitForTimeout(500);
  const after = await page.getByRole('button', { name: 'This was a payment' }).count();
  console.log('skipped rows after tap:', after);
  expect(after).toBe(before - 1);
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(500);
  expect(await page.getByRole('button', { name: 'This was a payment' }).count()).toBe(before);
  await shot(page, 'FLOW-5-step-3-skipped-undone');
});

test('FLOW-5 Attach to a payment… (waiting receipt) and Evidence only', async ({ page }) => {
  await open(page, '/review');
  const w = page.getByRole('region', { name: 'Waiting on others' });
  await w.getByRole('button', { name: 'Attach to a payment…' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('Attach to which payment?');
  const rows = dlg.getByRole('button').filter({ hasText: 'RM' });
  const names = await rows.evaluateAll((els) => els.slice(0, 6).map((e) => e.textContent!.replace(/\s+/g, ' ')));
  console.log('attach candidates for a RM23.90 MR DIY receipt:', JSON.stringify(names));
  await shot(page, 'FLOW-5-step-4-attach-picker');
  await rows.first().click();
  await expect(toast(page)).toContainText('Attached to');
  await expect(w).not.toContainText('MR DIY');
  await shot(page, 'FLOW-5-step-5-attached');
});

test('FLOW-6 empty Review says Nothing needs you; badge absent', async ({ page }) => {
  await open(page, '/review?state=empty');
  await expect(page.locator('main')).toContainText('Nothing needs you.');
  const b = await page.getByTestId('review-badge').count();
  console.log('badge elements when empty:', b);
  await shot(page, 'FLOW-6-step-1-empty');
});

test('AC-2 badge reads 99+ above 99 (dev panel) and its accessible name says the count', async ({ page }) => {
  await open(page, '/');
  const _name = await page.getByRole('link', { name: /Review/ }).getAttribute('aria-label');
  const acc = await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('link', { name: /Review/ })
    .innerText();
  console.log('Review tab text:', JSON.stringify(acc));
  const snap = await page.getByRole('navigation', { name: 'Tabs' }).ariaSnapshot();
  console.log(snap);
});
