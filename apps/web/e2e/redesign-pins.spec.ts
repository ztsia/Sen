import { expect, test } from '@playwright/test';
import { open, settled, watchErrors } from './helpers';

// The redesign's four behaviours that the suite had no test for (QA: each could be broken with every
// test still green). Each test fails when its behaviour breaks, and says which one in its name:
//   1. Review's answer chips are drawn at 32 px (patterns.md §2, Sizes: chips are 32).
//   2. The balance check says which way the bank's figure differs from Sen's.
//   3. Deleting a payment offers Undo, and Undo restores it.
//   4. Settings' Appearance row names the look in use.

test('review: every answer chip in a new-merchant row is drawn at 32 px', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/review');
  await settled(page);

  const rows = page.locator('[data-review="new-merchant"]');
  await expect(rows.first()).toBeVisible();

  // every chip in the row's answer strip: the three answers and Other…, each a Button at size chip
  const chips = page.locator('[data-review="new-merchant"] div.overflow-x-auto button[data-slot="button"]');
  await expect(chips.first()).toBeVisible();
  const measured = await chips.evaluateAll((els) =>
    els.map((el) => ({ label: (el.textContent ?? '').trim(), h: el.getBoundingClientRect().height })),
  );

  expect(measured.length, 'at least one answer chip was measured').toBeGreaterThan(0);
  const off = measured.filter((c) => Math.abs(c.h - 32) > 1);
  expect(off, `chips not 32 px tall: ${JSON.stringify(off)}`).toEqual([]);
  expect(errors).toEqual([]);
});

test('balance check: the difference says more or less than Sen has, by its direction', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/s/balance-check');
  await settled(page);

  const ryt = page.getByRole('group', { name: 'Ryt Bank' });
  const bank = ryt.getByLabel('What the bank app shows');
  // the text a sighted person reads: a Money's screen-reader copy (its sr-only "RM 0.10") is left out
  const shown = () =>
    ryt.evaluate((el) => {
      const copy = el.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('.sr-only').forEach((n) => n.remove());
      return (copy.textContent ?? '').replace(/\s+/g, ' ');
    });

  await expect.poll(shown).toContain('Sen has RM14,650.87');

  // the bank shows ten sen more than Sen has
  await bank.fill('14650.97');
  await expect.poll(shown).toContain('RM0.10 more than Sen has');

  // the bank shows ten sen less than Sen has
  await bank.fill('14650.77');
  await expect.poll(shown).toContain('RM0.10 less than Sen has');
  expect(await shown()).not.toContain('more than Sen has');

  expect(errors).toEqual([]);
});

test('payments: Delete offers Undo, and Undo brings the payment back', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/s/payments');
  await settled(page);

  const row = page.getByRole('button', { name: /Roti Bakar 88/ });
  await expect(row).toHaveCount(1);
  await row.click();

  // the payment's detail: its action bar's More holds Delete
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();

  // the deletion says so, with Undo, and the app goes back to Payments without the payment
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: 'Deleted' });
  await expect(toast).toBeVisible();
  await expect(toast.getByRole('button', { name: 'Undo' })).toBeVisible();
  await expect(page).toHaveURL(/\/s\/payments/);
  await expect(page.getByRole('button', { name: /Roti Bakar 88/ })).toHaveCount(0);

  // Undo puts it back on the list
  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /Roti Bakar 88/ })).toHaveCount(1);

  expect(errors).toEqual([]);
});

test('settings: the Appearance row names the look in use', async ({ page }) => {
  const errors = watchErrors(page);

  await open(page, '/s/settings', 'copper');
  await settled(page);
  await expect(page.getByRole('button', { name: /Appearance/ })).toContainText('Copper');

  await open(page, '/s/settings', 'minted');
  await settled(page);
  await expect(page.getByRole('button', { name: /Appearance/ })).toContainText('Minted');

  expect(errors).toEqual([]);
});
