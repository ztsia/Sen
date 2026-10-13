import { expect, test } from '@playwright/test';
import { LOOKS, open, settled, watchErrors } from './helpers';

// The redesign's the redesign's behaviours that the suite had no test for (QA: each could be broken with every
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

test('review: an answer row does not scroll up and down', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/review');
  await settled(page);

  const strips = page.locator('[data-review="new-merchant"] div.overflow-x-auto');
  await expect(strips.first()).toBeVisible();
  const sizes = await strips.evaluateAll((els) =>
    els.map((el) => ({ scroll: el.scrollHeight, client: el.clientHeight })),
  );

  expect(sizes.length, 'at least one answer row was measured').toBeGreaterThan(0);
  const vertical = sizes.filter((s) => s.scroll > s.client);
  expect(vertical, `answer rows that scroll up and down: ${JSON.stringify(vertical)}`).toEqual([]);
  expect(errors).toEqual([]);
});

test('progress bars announce their value', async ({ page }) => {
  const errors = watchErrors(page);

  await open(page, '/s/claims');
  await settled(page);
  const claimed = page.getByRole('progressbar', { name: 'September 2026: claimed against caps' });
  await expect(claimed).toBeVisible();
  expect(await claimed.getAttribute('aria-valuenow'), 'aria-valuenow on the claims bar').not.toBeNull();

  await open(page, '/s/settings/members');
  await settled(page);
  await expect(page.getByRole('progressbar', { name: 'Shell seats in use' })).toHaveAttribute('aria-valuenow', '10');

  expect(errors).toEqual([]);
});

test('empty states: each says what is missing and offers Ask Sen; Ask Sen opens Sen', async ({ page }) => {
  const errors = watchErrors(page);
  const EMPTY: [path: string, title: string][] = [
    ['/s/subscriptions', 'No subscriptions yet'],
    ['/s/goals', 'No goals yet'],
    ['/s/agent/memory', 'No notes yet'],
    ['/s/agent/research', 'No research yet'],
  ];
  for (const [path, title] of EMPTY) {
    await test.step(`${path} says "${title}" and offers Ask Sen`, async () => {
      await open(page, `${path}?state=empty`);
      const main = page.locator('main');
      await expect(main.getByText(title, { exact: true })).toBeVisible();
      const ask = main.getByRole('button', { name: 'Ask Sen', exact: true });
      await expect(ask).toBeVisible();
      if (path === '/s/subscriptions') {
        await ask.click();
        await expect(page.getByRole('dialog').first()).toBeVisible();
      }
    });
  }
  expect(errors).toEqual([]);
});

test('the year with no spending shows an empty state, and names no heaviest month', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/s/insights/year?state=empty');
  await settled(page);

  const main = page.locator('main');
  await expect(main.getByText('No year yet', { exact: true })).toBeVisible();
  await expect(main).not.toContainText(/heaviest month/i);
  expect(errors).toEqual([]);
});

test('categories: each rule says where it came from, and whether it is a hawker', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/s/settings/categories');
  await settled(page);

  await page.getByRole('radio', { name: 'Rules' }).click();
  const rule = (merchant: string) => page.locator('[data-slot="item"]').filter({ hasText: merchant });

  await expect(rule('Warung Pak Hamid')).toHaveCount(1);
  await expect(rule('Warung Pak Hamid')).toContainText('From your answer · A hawker');
  await expect(rule('Dapur Bibi Delivery')).toHaveCount(1);
  await expect(rule('Dapur Bibi Delivery')).toContainText("Sen's suggestion, confirmed · Not a hawker");
  expect(errors).toEqual([]);
});

test('chart text is at least 12 px on On track and on the year', async ({ page }) => {
  const errors = watchErrors(page);
  for (const path of ['/insights', '/s/insights/year']) {
    await test.step(path, async () => {
      await open(page, path);
      await settled(page);
      const text = page.locator('main svg text');
      await expect(text.first()).toBeAttached();
      const px = await text.evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
      expect(px.length, `${path}: svg text measured`).toBeGreaterThan(0);
      expect(
        px.filter((n) => n < 12),
        `${path}: svg text under 12 px`,
      ).toEqual([]);
    });
  }
  expect(errors).toEqual([]);
});

// Nine more pins, one per behaviour QA found broken on purpose (a-d) or fixed since (e-i). Each fails
// when its behaviour breaks.

test('review: one tap answers one question, even when a second tap lands on the row that slid up', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/review');
  await settled(page);

  const needs = page.getByRole('heading', { name: /Needs you/ });
  const readCount = async () => Number((await needs.textContent())?.match(/Needs you · (\d+)/)?.[1]);
  const before = await readCount();
  expect(before, 'the Needs you count is read').toBeGreaterThan(1);

  // the first answer chip of the first new-merchant row, by its screen position: the row after it slides
  // under the same point, so the second tap lands on it
  const chip = page.locator('[data-review="new-merchant"]').first().getByRole('button').first();
  await expect(chip).toBeVisible();
  const box = (await chip.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  await page.waitForTimeout(150);
  await page.mouse.click(x, y);
  await page.waitForTimeout(800);

  expect(await readCount(), 'one answer, not two').toBe(before - 1);
  expect(errors).toEqual([]);
});

test('add expense: a zero amount and a missing category are refused, and the form stays open', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/s/manual');

  await page.getByLabel('Amount').fill('0');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/above zero/)).toBeVisible();

  await page.getByLabel('Amount').fill('12.50');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Pick a category.')).toBeVisible();

  await expect(page).toHaveURL(/\/s\/manual/);
  expect(errors).toEqual([]);
});

test('insights: the pager hides every page but the one shown, from screen readers and taps', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/insights');
  await settled(page);

  const panels = page.locator('[role="tabpanel"]');
  await expect(panels).toHaveCount(5);
  const state = () =>
    panels.evaluateAll((els) =>
      els.map((e) => ({ inert: e.hasAttribute('inert'), hidden: e.getAttribute('aria-hidden') === 'true' })),
    );
  // on the page shown, the flags are off; on every other page, both are on
  const showing = (on: number) => Array.from({ length: 5 }, (_, i) => ({ inert: i !== on, hidden: i !== on }));

  await expect.poll(state).toEqual(showing(0));

  await page.getByRole('tab', { name: 'Budgets' }).click();
  await expect.poll(state).toEqual(showing(1));

  expect(errors).toEqual([]);
});

test('skipped: This was a payment, tapped twice quickly, restores one payment', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/s/skipped');
  await settled(page);

  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(3);

  const restore = page.getByRole('button', { name: 'This was a payment' }).first();
  await restore.click({ clickCount: 1 });
  await page.waitForTimeout(50);
  await restore.click({ clickCount: 1 });
  await page.waitForTimeout(800);

  // one card restored: the one that slid into its place was not
  await expect(cards).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('review: the Apply all button is drawn with 14 px labels', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/review');
  await settled(page);

  const apply = page.getByRole('button', { name: 'Apply all', exact: true });
  await expect(apply).toBeVisible();
  expect(await apply.evaluate((el) => getComputedStyle(el).fontSize)).toBe('14px');
  expect(errors).toEqual([]);
});

test('payments: the search input is drawn with 16 px text, so no phone zooms on focus', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/s/payments');
  await settled(page);

  const search = page.getByRole('searchbox');
  await expect(search).toBeVisible();
  expect(await search.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
  expect(errors).toEqual([]);
});

test('tab bar: every tab label is at least 12 px, in every look', async ({ page }) => {
  const errors = watchErrors(page);
  for (const look of LOOKS) {
    await test.step(look, async () => {
      await open(page, '/', look);
      await settled(page);
      const labels = page.locator('.tab .tl');
      await expect(labels.first()).toBeAttached();
      const px = await labels.evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
      expect(px.length, `${look}: tab labels measured`).toBeGreaterThan(0);
      expect(
        px.filter((n) => n < 12),
        `${look}: tab labels under 12 px`,
      ).toEqual([]);
    });
  }
  expect(errors).toEqual([]);
});

test('appearance: a chosen look is kept after a reload, and the quarterly switch stays off', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/s/settings/appearance');
  await settled(page);

  await page.getByRole('radio', { name: 'Copper' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-look', 'copper');
  await expect(page.getByRole('switch', { name: 'Change each quarter' })).not.toBeChecked();

  // reload with no look in the address: the look chosen on this phone is the one shown
  await page.goto('/s/settings/appearance');
  await settled(page);
  await expect(page.locator('html')).toHaveAttribute('data-look', 'copper');
  await expect(page.getByRole('switch', { name: 'Change each quarter' })).not.toBeChecked();
  await expect(page.getByRole('radio', { name: 'Copper' })).toHaveAttribute('aria-checked', 'true');
  expect(errors).toEqual([]);
});

test('insights: under reduced motion the pager jumps to its step at once', async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/insights');
  await settled(page);

  await page.getByRole('tab', { name: 'Year' }).click();
  // on the next animation frame the track is already at the Year step: 4 pages in, to within 2 px
  const at = await page.locator('[aria-label^="Insights: "]').evaluate(async (el) => {
    const track = el as HTMLElement;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return { left: track.scrollLeft, width: track.clientWidth };
  });
  expect(Math.abs(at.left - 4 * at.width), `scrollLeft ${at.left}, page width ${at.width}`).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});
