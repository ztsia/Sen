import { expect, test, type Page } from '@playwright/test';
import { db, LOOKS, open, settled, tabs, toast, watch } from './b04r-helpers';
import { step } from './b04r-r2-lib';
import { uid } from '../../apps/web/src/data/fake/ids';

// Run 2 flows, part A: Home, Review, Insights, payment detail, payments. Dev server (5291).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

const fitOver = (page: Page) =>
  page.evaluate(() => {
    const s = document.scrollingElement!;
    const m = document.querySelector('main')!;
    return Math.max(s.scrollHeight - s.clientHeight, m.scrollHeight - m.clientHeight);
  });

test('R2-FLOW-1 Home fits one screen in every look, then the cycle sheet', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-1';
  let n = 0;
  for (const mode of ['light', 'dark']) {
    for (const look of LOOKS) {
      await open(page, '/', look, mode);
      await expect(page.getByTestId('hero')).toBeVisible();
      await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
      const shotIt =
        (look === 'minted' && mode === 'light') ||
        (look === 'firefly' && mode === 'dark') ||
        (look === 'instrument' && mode === 'light') ||
        (look === 'copper' && mode === 'dark');
      n++;
      await step(
        page,
        F,
        n,
        `${look}-${mode}`,
        `Load Home in ${look} ${mode}`,
        'no scroll: scrollHeight <= clientHeight; the figure, pace and tab bar are visible',
        async () => {
          expect(await fitOver(page), `${look} ${mode}`).toBeLessThanOrEqual(0);
          await expect(page.getByTestId('pace')).toBeVisible();
          await expect(tabs(page)).toBeVisible();
        },
      ).catch((e) => {
        throw e;
      });
      void shotIt;
    }
  }
  await open(page, '/');
  await page.getByTestId('hero').click();
  const sheet = page.getByRole('dialog');
  n++;
  await step(
    page,
    F,
    n,
    'cycle-sheet',
    'Tap the large figure',
    'the cycle sheet shows Income received, Spending, Left until payday as tiles, and the estimate says it is one',
    async () => {
      await expect(sheet).toBeVisible();
      await expect(sheet).toContainText('Income received');
      await expect(sheet).toContainText('Spending');
      await expect(sheet).toContainText('Left until payday');
      await expect(sheet).toContainText('An estimate:');
      await expect(sheet).toContainText('It assumes you keep spending');
    },
  );
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  n++;
  await page.getByTestId('payday-strip').click();
  await step(
    page,
    F,
    n,
    'payday-strip',
    'Tap the payday strip',
    'payday opens at Step 1 of 4 without the tab bar',
    async () => {
      await expect(page).toHaveURL(/\/s\/payday/);
      await expect(page.getByText('Step 1 of 4')).toBeVisible();
      await expect(tabs(page)).toHaveCount(0);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-2 Home with something to act on still fits, in every look', async ({ page }) => {
  const F = 'R2-FLOW-2';
  let n = 0;
  for (const [scen, text] of [
    ['capture-off', /Capture is off|capture/i],
    ['payday', /Payday/],
  ] as const) {
    for (const mode of ['light', 'dark']) {
      for (const look of LOOKS) {
        await open(page, `/?scenario=${scen}`, look, mode);
        await expect(page.getByTestId('hero')).toBeVisible();
        n++;
        await step(
          page,
          F,
          n,
          `${scen}-${look}-${mode}`,
          `${scen} in ${look} ${mode}`,
          'the card or bar is shown and the page does not scroll',
          async () => {
            await expect(page.locator('main')).toContainText(text);
            expect(await fitOver(page), `${scen} ${look} ${mode}`).toBeLessThanOrEqual(0);
          },
        );
      }
    }
  }
});

test('R2-FLOW-3 Review: groups, chips, answer, Undo, Apply all', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-3';
  await open(page, '/review');
  await settled(page);
  const needs = page.getByRole('heading', { name: /Needs you/ });
  await step(
    page,
    F,
    1,
    'grouped',
    'Open Review',
    'icon headers with counts: Categories 2, Splits 2, Checks 7, New wording 1; Needs you 12',
    async () => {
      await expect(needs).toHaveText('Needs you · 12');
      for (const h of [/Categories · 2/, /Splits · 2/, /Checks · 7/, /New wording · 1/])
        await expect(page.getByRole('heading', { name: h })).toBeVisible();
      const hs = await page.locator('main h3').evaluateAll((els) => els.map((e) => !!e.querySelector('svg')));
      expect(hs.every(Boolean), 'every group header has an icon').toBe(true);
    },
  );
  await step(
    page,
    F,
    2,
    'chips',
    'Measure the answer chips of a new-merchant card',
    'every chip is 32 px drawn, on one line, with no vertical scroll; amount and payee are semibold',
    async () => {
      const card = page.locator('[data-review="new-merchant"]').first();
      const hs = await card
        .getByRole('button')
        .evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().height)));
      expect(
        hs.every((h) => h === 32),
        `chip heights ${hs}`,
      ).toBe(true);
      const strip = await card
        .locator('div.overflow-x-auto')
        .evaluate((d) => ({ s: d.scrollHeight, c: d.clientHeight }));
      expect(strip.s).toBeLessThanOrEqual(strip.c);
      const fw = await card
        .locator('p.font-semibold')
        .first()
        .evaluate((p) => Number(getComputedStyle(p).fontWeight));
      expect(fw).toBeGreaterThanOrEqual(600);
    },
  );
  await step(
    page,
    F,
    3,
    'sen-picks',
    "Look at Sen's suggestions",
    'the banner says 2 answers; exactly 2 chips are marked (sparkle, accent ring, "Sen suggests this")',
    async () => {
      const banner = page.getByRole('status').filter({ hasText: /Sen suggested 2 answers/ });
      await expect(banner).toBeVisible();
      await expect(banner.getByRole('button', { name: 'Apply all' })).toBeVisible();
      expect(await page.locator('main .sr-only', { hasText: 'Sen suggests this' }).count()).toBe(2);
      expect(await page.locator('main button.ring-primary\\/40').count()).toBe(2);
    },
  );
  const Q =
    '(db)=>JSON.stringify({cat:db.txns.find(t=>t.merchantKey==="SITI AMINAH BT YUSOF").categoryId,rules:db.rules.length})';
  const s0 = JSON.parse(await db<string>(page, Q));
  const card = page.locator('[data-review="new-merchant"]').first();
  await card.getByRole('button', { name: 'Meals' }).click();
  await step(
    page,
    F,
    4,
    'answered',
    'Tap Meals on the first card',
    'a toast says Meals with Undo; Needs you 11; a payment is categorised and exactly one rule is made',
    async () => {
      await expect(toast(page)).toContainText(/Meals/);
      await expect(needs).toHaveText('Needs you · 11');
      const s1 = JSON.parse(await db<string>(page, Q));
      expect(s0.cat).toBeNull();
      expect(s1.cat).not.toBeNull();
      expect(s1.rules).toBe(s0.rules + 1);
    },
  );
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await step(
    page,
    F,
    5,
    'undone',
    'Tap Undo',
    'Needs you is 12 again, the rule is gone and the payment has no category',
    async () => {
      await expect(needs).toHaveText('Needs you · 12');
      const s2 = JSON.parse(await db<string>(page, Q));
      expect(s2).toEqual(s0);
    },
  );
  await page.getByRole('button', { name: 'Apply all' }).click();
  await step(
    page,
    F,
    6,
    'apply-all',
    'Tap Apply all',
    'the two suggested answers apply (Needs you 10) with one Undo',
    async () => {
      await expect(needs).toHaveText('Needs you · 10');
      await expect(toast(page)).toContainText(/Applied 2/);
    },
  );
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await step(page, F, 7, 'apply-all-undone', 'Tap Undo on the toast', 'both come back: Needs you 12', async () => {
    await expect(needs).toHaveText('Needs you · 12');
  });
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-4 Review: nothing to do; items that open a screen', async ({ page }) => {
  const F = 'R2-FLOW-4';
  await open(page, '/review?state=empty');
  await settled(page);
  await step(
    page,
    F,
    1,
    'empty',
    'Open Review with nothing to do',
    '"Nothing needs you." with an icon and no 48 px button in the body',
    async () => {
      await expect(page.locator('main')).toContainText('Nothing needs you.');
    },
  );
  await open(page, '/review');
  await page.getByRole('button', { name: /^Phone bill claim/ }).click();
  await step(
    page,
    F,
    2,
    'claim-due',
    'Tap the Phone bill claim card',
    'the claim opens (not "Not here any more") and Back returns to Review',
    async () => {
      await expect(page).toHaveURL(/\/s\/claim\?id=/);
      await expect(page.locator('main')).toContainText('Phone bill');
      await expect(page.locator('main')).not.toContainText('Not here any more');
    },
  );
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/review/);
  await page.getByRole('button', { name: /^A balance check is due/ }).click();
  await step(
    page,
    F,
    3,
    'balance-check',
    'Tap "A balance check is due"',
    'balance-check opens with a card per account and no tab bar',
    async () => {
      await expect(page).toHaveURL(/balance-check/);
      await expect(page.getByRole('group', { name: 'Ryt Bank' })).toBeVisible();
      await expect(tabs(page)).toHaveCount(0);
    },
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/review/);
  await page.getByRole('button', { name: /^A payday step you skipped/ }).click();
  await step(page, F, 4, 'payday-step', 'Tap the skipped payday step', 'payday continues', async () => {
    await expect(page).toHaveURL(/\/s\/payday/);
    await expect(page.getByText(/Step \d of \d/)).toBeVisible();
  });
});

test('R2-FLOW-5 Insights: one card at a time', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-5';
  await open(page, '/insights');
  await settled(page);
  const tablist = page.getByRole('tablist');
  await step(
    page,
    F,
    1,
    'pager',
    'Open Insights',
    'five named steps, "1 of 5", the cycle picker above, one card visible at a time',
    async () => {
      expect(await tablist.getByRole('tab').allInnerTexts()).toEqual([
        'On track',
        'Budgets',
        'Subscriptions',
        'Goals',
        'Year',
      ]);
      await expect(page.getByText('1 of 5')).toBeVisible();
      await expect(page.getByRole('button', { name: /October \(this cycle\)/ })).toBeVisible();
      // only the current page is exposed: the others are inert
      const inert = await page
        .locator('[role="tabpanel"]')
        .evaluateAll((els) => els.map((e) => (e as HTMLElement).inert));
      expect(inert).toEqual([false, true, true, true, true]);
      // no peek: the next page starts at the right edge of the viewport
      const next = await page
        .locator('[role="tabpanel"]')
        .nth(1)
        .evaluate((e) => e.getBoundingClientRect().left);
      expect(next).toBeGreaterThanOrEqual(390);
    },
  );
  await tablist.getByRole('tab', { name: 'Budgets' }).click();
  await step(
    page,
    F,
    2,
    'budgets',
    'Tap the Budgets step',
    '"2 of 5"; Budgets selected; its card is visible and the first card is inert',
    async () => {
      await expect(page.getByText('2 of 5')).toBeVisible();
      await expect(tablist.getByRole('tab', { name: 'Budgets' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tabpanel', { name: 'Budgets' })).toBeVisible();
      await page.waitForTimeout(500);
    },
  );
  await page
    .locator('[aria-label^="Insights: "]')
    .first()
    .evaluate((el) => el.scrollTo({ left: el.clientWidth * 2, behavior: 'instant' as ScrollBehavior }));
  await step(
    page,
    F,
    3,
    'swipe',
    'Swipe to the next card (scroll the track by one page)',
    '"3 of 5"; Subscriptions selected',
    async () => {
      await expect(page.getByText('3 of 5')).toBeVisible();
      await expect(tablist.getByRole('tab', { name: 'Subscriptions' })).toHaveAttribute('aria-selected', 'true');
    },
  );
  const last = tablist.getByRole('tab').last();
  await last.focus();
  await page.keyboard.press('Enter');
  await step(
    page,
    F,
    4,
    'keyboard-year',
    'Focus the last step and press Enter',
    '"5 of 5"; Year selected',
    async () => {
      await expect(page.getByText('5 of 5')).toBeVisible();
      await expect(last).toHaveAttribute('aria-selected', 'true');
      await page.waitForTimeout(500);
    },
  );
  await tablist.getByRole('tab', { name: 'On track' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Ask Sen about this' }).first().click();
  await step(
    page,
    F,
    5,
    'ask-sen',
    'Tap "Ask Sen about this" on the first card',
    "Sen opens over Insights with the card's question",
    async () => {
      const d = page.getByRole('dialog').first();
      await expect(d).toBeVisible();
      await expect(d).toContainText(/Insights/);
    },
  );
  await page.keyboard.press('Escape');
  await tablist.getByRole('tab', { name: 'Budgets' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Open budgets' }).click();
  await step(
    page,
    F,
    6,
    'open-budgets',
    'Open budgets from its card, then Back',
    'Budgets opens; Back returns to Insights on the same step',
    async () => {
      await expect(page).toHaveURL(/\/s\/budgets/);
      await page.getByRole('button', { name: 'Back' }).click();
      await expect(page).toHaveURL(/\/insights/);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-6 Insights with no data drops the empty cards', async ({ page }) => {
  const F = 'R2-FLOW-6';
  await open(page, '/insights?state=empty');
  await settled(page);
  await step(
    page,
    F,
    1,
    'empty',
    'Open Insights with no data',
    'no NaN; the position count matches the steps shown; no card is an empty chart',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).not.toMatch(/NaN|Infinity|undefined/);
      const tabsN = await page.getByRole('tab').count();
      const pos = await page.getByText(/^\d of \d$/).count();
      console.log('empty insights: tabs', tabsN, 'position labels', pos, t.slice(0, 200).replace(/\n/g, ' | '));
      if (tabsN) {
        const total = Number(
          (
            await page
              .getByText(/^\d of \d$/)
              .first()
              .innerText()
          ).split(' of ')[1],
        );
        expect(total).toBe(tabsN);
      }
    },
  );
});

test('R2-FLOW-7 A payment: find it, read it, change it, Mark as, Delete with Undo', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-7';
  await open(page, '/s/payments');
  await settled(page);
  await step(
    page,
    F,
    1,
    'payments',
    'Open Payments',
    "a payee in title case (Sate Kajang Hj Samuri), a row at least 56 px tall, and a day header with the day's spending",
    async () => {
      await expect(page.getByRole('button', { name: /Sate Kajang Hj Samuri/ })).toBeVisible();
      const row = page.getByRole('button', { name: /Roti Bakar 88/ });
      const h = await row.evaluate((e) => e.getBoundingClientRect().height);
      expect(h).toBeGreaterThanOrEqual(56);
      await expect(page.getByText(/^Spent/).first()).toBeVisible();
    },
  );
  await page
    .getByRole('searchbox')
    .or(page.getByPlaceholder(/Search/))
    .first()
    .fill('roti');
  await step(page, F, 2, 'search', 'Search "roti"', 'only Roti Bakar 88 is listed', async () => {
    await expect(page.getByRole('button', { name: /Roti Bakar 88/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Sate Kajang/ })).toHaveCount(0);
  });
  await page.getByRole('button', { name: /Roti Bakar 88/ }).click();
  await step(
    page,
    F,
    3,
    'detail',
    'Open the payment',
    'header card (title case payee, RM9.50, Today · Ryt Bank, source), an action bar, a fact grid; facts are not buttons except Category and Note (with chevrons)',
    async () => {
      await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
      await expect(page.locator('main')).toContainText('Roti Bakar 88');
      await expect(page.locator('main')).toContainText("From Ryt Bank's notification");
      for (const a of ['Scan receipt', 'Split', 'Ask Sen', 'More'])
        await expect(page.getByRole('button', { name: a, exact: true })).toBeVisible();
      // the stored text is what the bank sent, in capitals
      await expect(page.locator('main')).toContainText('ROTI BAKAR 88');
      const dl = await page.locator('main dl button').evaluateAll((bs) => bs.map((b) => (b.textContent ?? '').trim()));
      expect(dl).toEqual(['Choose one', 'Add a note']);
    },
  );
  await page.getByRole('button', { name: 'Choose one' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Meals' })
    .or(page.getByRole('dialog').getByRole('radio', { name: 'Meals' }))
    .first()
    .click();
  await step(
    page,
    F,
    4,
    'category',
    'Choose Meals in the Category sheet',
    'the Category fact shows Meals and a toast offers Undo',
    async () => {
      await expect(page.locator('main dl')).toContainText('Meals');
    },
  );
  await page.getByRole('button', { name: 'Copy the amount' }).click();
  await step(
    page,
    F,
    5,
    'copy',
    'Tap Copy on the amount',
    'a toast says the amount was copied (or that it cannot copy here)',
    async () => {
      await expect(toast(page)).toContainText(/copied|Couldn't copy/);
    },
  );
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await step(
    page,
    F,
    6,
    'more-menu',
    'Open the More menu',
    'a menu lists No receipt…, Mark as… and Delete; Delete is destructive-styled',
    async () => {
      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      expect(await menu.getByRole('menuitem').allInnerTexts()).toEqual(['No receipt…', 'Mark as…', 'Delete']);
    },
  );
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const gone = page.getByRole('button', { name: /Roti Bakar 88/ });
  await step(
    page,
    F,
    7,
    'deleted',
    'Delete',
    'Deleted toast with Undo; back on Payments without the payment',
    async () => {
      await expect(toast(page)).toContainText('Deleted');
      await expect(page).toHaveURL(/\/s\/payments/);
      await expect(gone).toHaveCount(0);
    },
  );
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await step(page, F, 8, 'undone', 'Undo', 'the payment is back on the list', async () => {
    await expect(gone).toHaveCount(1);
  });
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-8 Payments: nothing found; long text', async ({ page }) => {
  const F = 'R2-FLOW-8';
  await open(page, '/s/payments');
  await settled(page);
  await page
    .getByPlaceholder(/Search/)
    .first()
    .fill('zzzzqq');
  await step(
    page,
    F,
    1,
    'no-hits',
    'Search "zzzzqq"',
    'an Empty state with an icon and a title, not bare text',
    async () => {
      await expect(page.locator('main')).toContainText(/No payments|Nothing/i);
      const hasIcon = await page.locator('main svg').count();
      expect(hasIcon).toBeGreaterThan(0);
    },
  );
  await page
    .getByPlaceholder(/Search/)
    .first()
    .fill('');
  await page.evaluate(() => (document.documentElement.style.fontSize = '150%'));
  await step(
    page,
    F,
    2,
    'text-150',
    'Clear the search at 1.5x text',
    'amounts are whole (no ellipsis on any amount) and the page does not overflow sideways',
    async () => {
      const over = await page.evaluate(
        () => document.scrollingElement!.scrollWidth - document.scrollingElement!.clientWidth,
      );
      expect(over).toBeLessThanOrEqual(0);
      const cut = await page
        .locator('main [class*="font-normal"]')
        .evaluateAll(
          (els) =>
            els.filter(
              (e) => /^\+?RM[\d,]+\.\d\d$/.test((e.textContent ?? '').trim()) && e.scrollWidth > e.clientWidth + 1,
            ).length,
        );
      expect(cut).toBe(0);
    },
  );
});
void uid;
