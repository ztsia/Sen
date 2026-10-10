import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { LOOKS, MODES, open, settled, watchErrors, type LookId, type ModeId } from './helpers';

// B03 done-when 1: each journey the five tabs carry (docs/flows.md) clicks through on the made-up
// data, at 390×844, in all six looks, light and dark, with a screenshot per step. Each journey starts
// from a fresh load, so the scenario is Wei Ming's month as scenario.ts writes it.

type Journey = (
  page: Page,
  shot: (step: string) => Promise<void>,
  go: (path: string) => Promise<void>,
) => Promise<void>;

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });
const toast = (page: Page) => page.locator('[data-sonner-toast]').first();
const reviewRow = (page: Page, kind: string, text: string | RegExp) =>
  page.locator(`[data-review="${kind}"]`).filter({ hasText: text });

export const JOURNEYS: Record<string, Journey> = {
  // the daily glance: Home's figure opens the cycle sheet; pace opens this cycle's payments
  daily: async (page, shot, go) => {
    await go('/');
    await expect(page.getByTestId('hero')).toContainText('Left until payday');
    await expect(page.getByTestId('hero')).toContainText('12 days to go');
    await shot('home');
    await page.getByTestId('hero').click();
    const sheet = page.getByRole('dialog', { name: 'This cycle' });
    await expect(sheet).toContainText('Income received');
    await expect(sheet).toContainText('An estimate');
    await shot('cycle sheet');
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await page.getByTestId('pace').click();
    await expect(page).toHaveURL(/\/s\/payments\?cycle=2026-09-30/);
    await settled(page);
    await shot('payments, this cycle');
  },

  // a payment at a new merchant waits in Review; a tap files it and makes the rule
  'pay-new': async (page, shot, go) => {
    await go('/review');
    const row = reviewRow(page, 'new-merchant', 'ROTI BAKAR 88');
    await expect(row).toBeVisible();
    await shot('review');
    await row.getByRole('button', { name: 'Meals' }).click();
    await expect(toast(page)).toContainText('ROTI BAKAR 88 is Meals from now on');
    await expect(row).toHaveCount(0);
    await shot('answered, with Undo');
    await toast(page).getByRole('button', { name: 'Undo' }).click();
    await expect(reviewRow(page, 'new-merchant', 'ROTI BAKAR 88')).toBeVisible();
    await shot('undone');
  },

  // a hawker is a merchant like any other (D70): Other… opens every category
  hawker: async (page, shot, go) => {
    await go('/review');
    const row = reviewRow(page, 'new-merchant', 'SITI AMINAH BT YUSOF');
    await row.getByRole('button', { name: 'Other…' }).click();
    const sheet = page.getByRole('dialog', { name: /SITI AMINAH BT YUSOF: which category/ });
    await expect(sheet).toBeVisible();
    await shot('category sheet');
    await sheet.getByRole('button', { name: 'Groceries' }).click();
    await expect(toast(page)).toContainText('SITI AMINAH BT YUSOF is Groceries from now on');
    await expect(row).toHaveCount(0);
    await shot('filed');
  },

  // money in: a name Sen hasn't seen that could be a split share, then a gift Sen suggests is income
  'money-in': async (page, shot, go) => {
    await go('/review');
    const share = reviewRow(page, 'money-in-share', 'LIM K H');
    await expect(share).toContainText('Whose split share is it?');
    await expect(page.getByRole('region', { name: 'Waiting on others' })).toContainText('1 of 2 paid you back');
    await shot('review');
    await share.getByRole('button', { name: 'Kah Hoe · BBQ PLACE' }).click();
    await expect(toast(page)).toContainText('Kah Hoe paid back RM48.80');
    // the split is paid back in full, so it's no longer waiting on anyone
    await expect(page.getByRole('region', { name: 'Waiting on others' })).not.toContainText('BBQ PLACE');
    await shot('share ticked');
    const gift = reviewRow(page, 'money-in', 'TAN AH KOW');
    await expect(gift.getByRole('button', { name: /^Income.*Sen suggests this$/ })).toBeVisible();
    await gift.getByRole('button', { name: /Income/ }).click();
    await expect(toast(page)).toContainText('is income');
    await shot('income');
  },

  // money from your own name is a transfer: where did it come from? (D17)
  'own-transfer': async (page, shot, go) => {
    await go('/review');
    const row = reviewRow(page, 'transfer-missing', 'from your own name');
    await shot('review');
    await row.getByRole('button', { name: /Public Bank/ }).click();
    await expect(toast(page)).toContainText('A transfer from Public Bank');
    // in the app, not a fresh load: the made-up data lives in this page's memory
    await tabs(page).getByRole('link', { name: /^More/ }).click();
    await page.getByText('Payments', { exact: true }).click();
    await settled(page);
    await page.getByRole('searchbox', { name: 'Search payments' }).fill('Public Bank');
    await expect(page.getByRole('button', { name: /^Public Bank → Ryt Bank/ }).first()).toBeVisible();
    await shot('one row, filled in');
  },

  // money in from a merchant can be a refund of one of your payments (D21)
  refund: async (page, shot, go) => {
    await go('/review');
    const row = reviewRow(page, 'money-in', 'TAN AH KOW');
    await row.getByRole('button', { name: 'Refund of…' }).click();
    const sheet = page.getByRole('dialog', { name: 'A refund of which payment?' });
    await expect(sheet).toBeVisible();
    await shot('which payment');
    await sheet.getByRole('button').filter({ hasText: 'UNIQLO' }).first().click();
    await expect(toast(page)).toContainText('Marked as a refund');
    await shot('refund');
  },

  // new wording: Sen booked it already, and asks whether it read it right (D87)
  'new-wording': async (page, shot, go) => {
    await go('/review');
    const row = reviewRow(page, 'new-wording', 'KEDAI MAJU');
    await expect(row).toContainText('Paid RM6.50 to KEDAI MAJU. Right?');
    await shot('review');
    await row.getByRole('button', { name: 'Yes' }).click();
    await expect(toast(page)).toContainText('Sen will read this wording from now on');
    await expect(row).toHaveCount(0);
    await shot('confirmed');
  },
};

export async function walk(page: Page, info: TestInfo, look: LookId, mode: ModeId, name: string) {
  const errors = watchErrors(page);
  let n = 0;
  const shot = async (step: string) => {
    n += 1;
    await page.waitForTimeout(150);
    await info.attach(`${String(n).padStart(2, '0')} ${step}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  };
  await JOURNEYS[name]!(page, shot, (path) => open(page, path, look, mode));
  expect(errors).toEqual([]);
}

for (const name of Object.keys(JOURNEYS))
  for (const look of LOOKS)
    for (const mode of MODES)
      test(`${name} in ${look}, ${mode}`, async ({ page }, info) => {
        await walk(page, info, look, mode, name);
      });
