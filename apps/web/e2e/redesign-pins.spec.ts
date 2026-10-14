import { expect, test } from '@playwright/test';
import { uid } from '../src/data/fake/ids';
import { LOOKS, open, settled, watchErrors } from './helpers';

// The redesign's behaviours that the suite had no test for (QA: each could be broken with every
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

  // a zero cannot be typed (D132: the digits read from the right, and leading zeros are not kept), so the
  // field is empty and says so: the zero is still refused and the form stays open
  await page.getByLabel('Amount').fill('0');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Type the amount.', { exact: true })).toBeVisible();

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

// QA run 3 and the owner's list (13 Oct): one pin per behaviour changed in this run. Each passes on the
// code as it is and fails when its break (named in the report) is made; its name says the behaviour.
test.describe("QA run 3 and the owner's list (13 Oct)", () => {
  test('task screens hide the tab bar, and Home shows one', async ({ page }) => {
    const errors = watchErrors(page);
    const bar = page.getByRole('navigation', { name: 'Tabs' });
    for (const path of ['/s/payday?scenario=payday', '/s/manual', '/s/balance-check']) {
      await test.step(path, async () => {
        await open(page, path);
        await settled(page);
        await expect(bar).toBeHidden();
      });
    }
    await open(page, '/');
    await settled(page);
    await expect(bar).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("estimates are worded as estimates: Insights' card and Sen's usage", async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/insights');
    await settled(page);
    const card = page.locator('[data-slot="card"]').filter({ hasText: 'Am I on track?' });
    await expect(card).toContainText('An estimate for payday:');

    await open(page, '/s/agent/usage');
    await settled(page);
    const main = page.locator('main');
    await expect(main).toContainText('Estimated cost');
    await expect(main.getByText(/^About RM/).first()).toBeVisible();
    await expect(main).toContainText('The cost is an estimate');
    expect(errors).toEqual([]);
  });

  test('money in carries a plus sign on Payments', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/s/payments');
    await settled(page);
    await expect(page.getByText(/^\+RM\d/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('the Insights pager moves its own names row, never the frame or the tab bar', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/insights');
    await settled(page);

    // a click dispatched on the tab, not a tap: Playwright's own scroll into view would move the frame
    // before the app did, and this pin is about what the app does
    await page.getByRole('tab', { name: 'Goals' }).dispatchEvent('click');
    await page.getByRole('tab', { name: 'Year' }).dispatchEvent('click');
    // the smooth scroll of the pages and of the names row settles
    await page.waitForTimeout(800);

    const frame = await page.evaluate(() => {
      // the pager's own rows: its names (a tab list) and its track of pages
      const inPager = (el: Element) => !!el.closest('[role="tablist"], [aria-label^="Insights: "]');
      const offenders: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>('*')) {
        if (inPager(el)) continue;
        if (el.scrollLeft !== 0 || el.scrollTop !== 0) {
          offenders.push(
            `${el.tagName.toLowerCase()}[${el.getAttribute('class')?.slice(0, 90)}] ${el.scrollLeft},${el.scrollTop}`,
          );
        }
      }
      return {
        offenders,
        tabBarLeft: document.querySelector('.tabbar')?.getBoundingClientRect().left ?? null,
        windowX: window.scrollX,
      };
    });
    expect(frame.offenders, 'elements scrolled outside the pager').toEqual([]);
    expect(frame.windowX, 'the window scrolled sideways').toBe(0);
    expect(frame.tabBarLeft, 'the tab bar left edge').toBe(0);
    expect(errors).toEqual([]);
  });

  test('memory: Forget takes one note per double tap, not two', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/s/agent/memory');
    await settled(page);

    const forget = page.getByRole('button', { name: /^Forget:/ });
    const before = await forget.count();
    expect(before, 'notes listed').toBeGreaterThan(1);

    // two taps 150 ms apart on the same spot: the note under it goes, and the one that closes up into it stays
    const box = (await forget.first().boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.click(x, y);
    await page.waitForTimeout(150);
    await page.mouse.click(x, y);
    await page.waitForTimeout(800);

    await expect(forget, 'one note forgotten, not two').toHaveCount(before - 1);
    expect(errors).toEqual([]);
  });

  test("a toast never covers a task screen's main button", async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/s/payday?scenario=payday');
    await settled(page);

    // the first step has Skip, and so does the second; the third (Last cycle) ends in Next
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(page.getByText('Step 2 of 4')).toBeVisible();
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(page.getByText('Step 3 of 4')).toBeVisible();
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible();
    // the toast slides up into its place: the check waits until it has stopped moving
    await expect
      .poll(async () => {
        const a = await toast.boundingBox();
        await page.waitForTimeout(150);
        const b = await toast.boundingBox();
        return JSON.stringify(a) === JSON.stringify(b);
      }, 'the toast has settled')
      .toBe(true);

    const next = page.getByRole('button', { name: 'Next', exact: true });
    await expect(next).toBeVisible();
    // the element on top at the centre of Next is Next itself, not the toast over it
    const onTop = () =>
      next.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit !== null && (hit === el || el.contains(hit));
      });
    await expect.poll(onTop, 'Next is the element at its own centre').toBe(true);
    expect(errors).toEqual([]);
  });

  test('Delete on a payment opened by its address goes Home, not to a blank page', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, `/s/txn?id=${uid('txn:roti-bakar')}`);
    await settled(page);

    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    await expect.poll(() => new URL(page.url()).pathname).toBe('/');
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('money entry types digits from the right, with the dot and letters ignored (D132)', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/s/manual');
    const amount = page.getByLabel('Amount', { exact: true });
    await expect(amount).toBeVisible();
    await expect(amount).toHaveAttribute('inputmode', 'numeric');

    await amount.click();
    // the dot and the letter do nothing: the digits 1, 2, 5, 0 make 12.50
    await amount.pressSequentially('12.5a0');
    await expect(amount).toHaveValue('12.50');

    await page.keyboard.press('Backspace');
    await expect(amount).toHaveValue('1.25');
    await page.keyboard.press('0');
    await expect(amount).toHaveValue('12.50');

    // the value that is saved is the digits' amount, not the text the field shows: 12.50 is saved as RM12.50
    await page.getByRole('radio', { name: 'Meals' }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Added RM12.50 · Meals' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a tap on Scan opens the camera chooser, not the scanner screen', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/');
    await settled(page);
    const scan = page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Scan a receipt' });

    const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5_000 }), scan.click()]);
    expect(await chooser.element().getAttribute('data-testid')).toBe('scan-camera');
    await expect.poll(() => new URL(page.url()).pathname).toBe('/');
    expect(errors).toEqual([]);
  });

  test("Sen opens with the message started: Add a scheme, and Insights' Ask Sen about this", async ({ page }) => {
    const errors = watchErrors(page);
    const message = () => page.getByRole('textbox', { name: 'Message to Sen' });

    await open(page, '/s/settings/claims');
    await settled(page);
    await page.getByRole('button', { name: 'Add a scheme' }).click();
    await expect(message()).toHaveValue('I want to add a claim scheme: ');
    await page.keyboard.press('Escape');
    await expect(message()).toHaveCount(0);

    await open(page, '/insights');
    await settled(page);
    await page
      .locator('[data-slot="card"]')
      .filter({ hasText: 'Am I on track?' })
      .getByRole('button', { name: 'Ask Sen about this' })
      .click();
    await expect(message()).toHaveValue('Am I on track?');
    expect(errors).toEqual([]);
  });

  test('add forms: a subscription and a goal are added by hand, and Save names what is missing (D134)', async ({
    page,
  }) => {
    const errors = watchErrors(page);

    await open(page, '/s/subscriptions');
    await settled(page);
    await page.getByRole('button', { name: 'Add a subscription' }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Type its name.')).toBeVisible();

    await page.getByLabel('Name', { exact: true }).fill('Canva Pro');
    await page.getByRole('button', { name: 'USD', exact: true }).click();
    await page.getByLabel('Amount each time', { exact: true }).pressSequentially('1299');
    await page.getByRole('radio', { name: 'Yearly', exact: true }).click();
    await page.getByLabel('Next renewal', { exact: true }).fill('2027-03-01');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Canva Pro').first()).toBeVisible();

    await open(page, '/s/goals');
    await settled(page);
    await page.getByRole('button', { name: 'Add a goal' }).click();
    await page.getByLabel('Name', { exact: true }).fill('New laptop');
    await page.getByLabel('Target', { exact: true }).pressSequentially('450000');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText("Pick the account it's kept in.")).toBeVisible();

    await page.locator('[role="group"][aria-labelledby="goal-account"] button').first().click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('New laptop').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("the cycle sheet's stat tiles keep each figure on one line", async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/');
    await settled(page);
    await page.getByTestId('hero').click();
    const sheet = page.getByRole('dialog', { name: 'This cycle' });
    await expect(sheet).toBeVisible();

    const figures = sheet.locator('div.grid > div > span.text-lg');
    await expect(figures.first()).toBeVisible();
    // a figure is one line when its box is one line high (its sr-only copy is taken out of the flow)
    const tall = await figures.evaluateAll((els) =>
      els.map((el) => {
        const line = parseFloat(getComputedStyle(el).lineHeight);
        return { text: el.textContent, height: el.getBoundingClientRect().height, line };
      }),
    );
    expect(tall.length, 'stat figures measured').toBeGreaterThan(0);
    expect(
      tall.filter((t) => t.height > t.line + 1),
      'figures on more than one line',
    ).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('large text on a 360 px phone: budget figures and settings values stay on screen', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.addInitScript(() => localStorage.setItem('sen.dev.textScale', '1.5'));

    const fits = (sel: string) =>
      page.locator(sel).evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return {
            text: (el.textContent ?? '').trim().slice(0, 40),
            onScreen: r.left >= -0.5 && r.right <= window.innerWidth + 0.5,
            cut: el.scrollWidth > el.clientWidth + 1,
          };
        }),
      );

    await open(page, '/s/budgets');
    await settled(page);
    const figures = page.locator('span.num').filter({ hasText: / of RM/ });
    await expect(figures.first()).toBeVisible();
    const budgets = await fits('span.num');
    const figs = budgets.filter((b) => / of RM/.test(b.text));
    expect(figs.length, 'budget figures measured').toBeGreaterThan(0);
    expect(
      figs.filter((b) => !b.onScreen || b.cut),
      'budget figures cut off or past the edge',
    ).toEqual([]);
    // at this size the label and the figure don't fit side by side, so each figure drops under its label
    // (the row wraps); beside it, the figure is squeezed into what is left of the row
    const under = await page
      .locator('span.num')
      .filter({ hasText: / of RM/ })
      .evaluateAll((els) =>
        els.map((el) => {
          const label = el.parentElement?.firstElementChild as HTMLElement | null;
          return {
            text: el.textContent,
            dropped: !!label && el.getBoundingClientRect().top >= label.getBoundingClientRect().bottom - 1,
          };
        }),
      );
    expect(
      under.filter((u) => !u.dropped),
      'budget figures beside their labels, not under them',
    ).toEqual([]);

    await open(page, '/s/settings');
    await settled(page);
    const rows = await fits('main [data-slot="item"]');
    expect(rows.length, 'settings rows measured').toBeGreaterThan(0);
    expect(
      rows.filter((b) => !b.onScreen || b.cut),
      'settings rows cut off or past the edge',
    ).toEqual([]);

    const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(sideways, 'the page scrolls sideways').toBe(false);
    expect(errors).toEqual([]);
  });

  test("Ask Sen about this shows Sen's avatar, not an icon", async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/insights');
    await settled(page);
    const ask = page.getByRole('button', { name: 'Ask Sen about this' }).first();
    await expect(ask).toBeVisible();
    await expect(ask.locator('canvas.av')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('every button on Claims that opens Sen shows its avatar: Add, Edit, Teach Sen (D135)', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '/s/settings/claims');
    await settled(page);
    const buttons = [
      page.getByRole('button', { name: 'Add a scheme' }),
      page.getByRole('button', { name: /^Edit / }).first(),
      page.getByRole('button', { name: 'Teach Sen' }).first(),
    ];
    for (const b of buttons) {
      await expect(b).toBeVisible();
      await expect(b.locator('canvas.av')).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });

  test("a group's label is a caption: smaller than the title and than the rows it heads, in every look (D136)", async ({
    page,
  }) => {
    for (const look of LOOKS) {
      await open(page, '/s/settings', look);
      await settled(page);
      const sizes = await page.evaluate(() => {
        const px = (el: Element | null) => (el ? parseFloat(getComputedStyle(el).fontSize) : NaN);
        const label = document.querySelector('section[aria-label] h2');
        const row = label?.closest('section')?.querySelector('[data-slot="item-title"]') ?? null;
        return { label: px(label), title: px(document.querySelector('h1')), row: px(row) };
      });
      expect(sizes.label, `${look}: a group label was measured`).toBeGreaterThan(0);
      expect(sizes.label, `${look}: label ${sizes.label}px vs title ${sizes.title}px`).toBeLessThan(sizes.title);
      expect(sizes.label, `${look}: label ${sizes.label}px vs row ${sizes.row}px`).toBeLessThan(sizes.row);
    }
  });

  test('app bar titles are never cut short by their action, in every look and mode', async ({ page }) => {
    for (const look of LOOKS)
      for (const mode of ['light', 'dark'] as const)
        for (const path of ['/s/subscriptions', '/s/goals', '/s/budgets', '/s/settings/claims']) {
          await open(page, path, look, mode);
          await settled(page);
          const cut = await page
            .locator('h1')
            .first()
            .evaluate((el) => el.scrollWidth > el.clientWidth);
          expect(cut, `${look} ${mode} ${path}: the title is cut`).toBe(false);
        }
  });

  test('a money field: Select all, then typing, replaces the amount (QA B04 redesign run 4, 5)', async ({ page }) => {
    await open(page, '/s/subscriptions');
    await settled(page);
    await page.getByRole('button', { name: 'Add a subscription' }).click();
    const amount = page.getByRole('textbox', { name: /Amount/ });
    await amount.pressSequentially('120000');
    await expect(amount).toHaveValue('1,200.00');
    await amount.press('ControlOrMeta+a');
    await amount.pressSequentially('175');
    await expect(amount).toHaveValue('1.75');
  });

  test('Teach Sen starts its message from the ESS task, not as a claim scheme (QA B04 redesign run 4, 12)', async ({
    page,
  }) => {
    await open(page, '/s/settings/claims');
    await settled(page);
    await page.getByRole('button', { name: 'Teach Sen' }).first().click();
    await expect(page.getByRole('textbox', { name: 'Message to Sen' })).toHaveValue(
      /^Learn the steps to [a-z][^:]* on ESS: $/,
    );
  });

  test("a goal's date must be after today (QA B04 redesign run 4, 10)", async ({ page }) => {
    await open(page, '/s/goals');
    await settled(page);
    await page.getByRole('button', { name: 'Add a goal' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Old trip');
    await page.getByRole('textbox', { name: /Target/ }).pressSequentially('100000');
    await page.getByLabel('By when (optional)').fill('2026-10-18');
    await page.getByRole('group', { name: 'Kept in' }).getByRole('button', { name: 'Ryt Bank' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Pick a day after today.')).toBeVisible();
  });

  test('large text on a 360 px phone: no app bar title is cut', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.addInitScript(() => localStorage.setItem('sen.dev.textScale', '1.5'));
    for (const look of LOOKS)
      for (const path of ['/s/subscriptions', '/s/settings/members', '/s/budgets', '/s/goals', '/s/settings/claims']) {
        await open(page, path, look);
        await settled(page);
        const cut = await page
          .locator('h1')
          .first()
          .evaluate((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
        expect(cut, `${look} ${path}: the title is cut`).toBe(false);
      }
  });

  test('a letter typed over a selected amount is ignored, not a wipe (QA B04 redesign run 4, 16)', async ({ page }) => {
    await open(page, '/s/manual');
    await settled(page);
    const amount = page.getByRole('textbox', { name: /Amount/ });
    await amount.pressSequentially('120000');
    await amount.press('ControlOrMeta+a');
    await amount.press('x');
    await expect(amount).toHaveValue('1,200.00');
  });
});
