import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BEHAVIOUR, open, settled, watchErrors, type LookId, type ModeId } from './helpers';
import { coveredTargets } from './checks';
import { SETTLE_MS } from '../src/lib/tap-guard';
import { stepMetrics } from './metrics';
import { uid } from '../src/data/fake/ids';
import { JOURNEYS as GUIDED } from '../src/dev/journeys';

// B03 done-when 1: each journey the five tabs carry (docs/flows.md) clicks through on the made-up
// data, at 390×844, with a screenshot per step. Each is walked once, in Minted, light (helpers.ts's
// BEHAVIOUR): the looks share the screens, and the catalogue covers them. Each journey starts from a
// fresh load, so the scenario is Wei Ming's month as scenario.ts writes it.

type Journey = (
  page: Page,
  shot: (step: string) => Promise<void>,
  go: (path: string) => Promise<void>,
) => Promise<void>;

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });
const toast = (page: Page) => page.locator('[data-sonner-toast]').first();
const reviewRow = (page: Page, kind: string, text: string | RegExp) =>
  page.locator(`[data-review="${kind}"]`).filter({ hasText: text });

const dialog = (page: Page, name: string | RegExp) => page.getByRole('dialog', { name });
const senSheet = (page: Page) => dialog(page, 'Sen');
const SCAN_FILE = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };

/** A native stand-in, as the dev panel draws it (screens.md's Native surfaces): the sheet of them, scrolled to one. */
async function standIn(page: Page, id: string) {
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.getByRole('button', { name: 'Surfaces' }).click();
  await expect(dialog(page, 'Native stand-ins')).toBeVisible();
  const s = page.getByTestId(`surface-${id}`);
  await s.scrollIntoViewIfNeeded();
  return s;
}

/** The scanned receipt, from /scan to its confirm screen (the made-up SATE KAJANG HJ SAMURI, RM64.13). */
async function scanToConfirm(page: Page) {
  // the scanner screen's own camera input: the app shell has one too, outside the screen
  await page.locator('main').getByTestId('scan-camera').setInputFiles(SCAN_FILE);
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  await expect(page.getByText('SATE KAJANG HJ SAMURI')).toBeVisible();
}

/** The email and code steps, with the made-up code that signs in (sign-in's fake: 123456). */
async function signIn(page: Page, email?: string) {
  if (email) await page.getByLabel('Your email').fill(email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

// QA_METRICS (qa-diff.mjs, D139): every tap in a journey is timed under the slow phone; without it, nothing
stepMetrics(test);

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
    await expect(toast(page)).toContainText(/ROTI BAKAR 88 is Meals from now on/i);
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
    const sheet = page.getByRole('dialog', { name: /SITI AMINAH BT YUSOF: which category/i });
    await expect(sheet).toBeVisible();
    await shot('category sheet');
    await sheet.getByRole('button', { name: 'Groceries' }).click();
    await expect(toast(page)).toContainText(/SITI AMINAH BT YUSOF is Groceries from now on/i);
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
    await expect(page.getByRole('region', { name: 'Waiting on others' })).not.toContainText(/BBQ PLACE/i);
    await shot('share ticked');
    const gift = reviewRow(page, 'money-in', 'TAN AH KOW');
    await expect(gift.getByRole('button', { name: /^Income.*Sen suggests this$/ })).toBeVisible();
    // a tap within the settle after a change is taken for a double tap and ignored (patterns.md §7),
    // so the next answer waits it out, as a person's would
    await page.waitForTimeout(SETTLE_MS);
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
    // the search runs 200 ms after typing stops, and this row is in the unfiltered list too: wait for the
    // search itself, or the step reads the list as it swaps (QA B05 Feel runs 1-3)
    await expect(page.getByRole('status').filter({ hasText: /payments? match/ })).toBeVisible();
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
    await sheet.getByRole('button').filter({ hasText: 'TAN AH KOW' }).first().click();
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

  // a known merchant files itself, with no review (D24): it's in Payments, filed by its rule
  'pay-known': async (page, shot, go) => {
    await go('/more');
    await page.getByText('Payments', { exact: true }).click();
    await settled(page);
    await page.getByRole('searchbox', { name: 'Search payments' }).fill('NASI KANDAR ABC');
    const row = page.getByRole('button', { name: /^NASI KANDAR ABC/i }).first();
    await expect(row).toContainText('Meals');
    await expect(row).not.toContainText('In Review');
    await shot('in payments');
    await row.click();
    await expect(page.getByText("From Ryt Bank's notification")).toBeVisible();
    await expect(page.getByText('What the bank said')).toBeVisible();
    await shot('the payment');
  },

  // fixing a payment: change its category from now on, then undo it (§6.7, D25)
  fix: async (page, shot, go) => {
    await go('/more');
    await page.getByText('Payments', { exact: true }).click();
    await settled(page);
    await page.getByRole('searchbox', { name: 'Search payments' }).fill('NASI KANDAR ABC');
    await page
      .getByRole('button', { name: /^NASI KANDAR ABC/i })
      .first()
      .click();
    await shot('the payment');
    await page.getByRole('button', { name: 'Meals' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: 'Drinks & desserts' }).click();
    await expect(page.getByRole('dialog')).toContainText('just this one?');
    await shot('just this one, or from now on');
    await page.getByRole('button', { name: 'From now on' }).click();
    await expect(toast(page)).toContainText(/NASI KANDAR ABC is Drinks & desserts from now on/i);
    await expect(page.getByRole('button', { name: 'Drinks & desserts' })).toBeVisible();
    await shot('changed');
    await toast(page).getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('button', { name: 'Meals' })).toBeVisible();
    await shot('undone');
  },

  // Insights: question cards, a category to its payments, and Ask Sen about this
  insights: async (page, shot, go) => {
    await go('/insights');
    await settled(page);
    await expect(page.getByText('Am I on track?')).toBeVisible();
    await shot('insights');
    await page.getByRole('button', { name: 'Ask Sen about this' }).first().click();
    await expect(page.getByText('Looking at: Insights')).toBeVisible();
    await shot("Sen's sheet");
    await page.keyboard.press('Escape');
    await page.getByText('Where did it go, and what changed?').scrollIntoViewIfNeeded();
    await shot('where did it go');
  },

  // a budget: from its card to Budgets, and a new amount, with Undo
  budget: async (page, shot, go) => {
    await go('/insights');
    await settled(page);
    await page.getByRole('tab', { name: 'Budgets' }).click();
    await page.getByRole('button', { name: /Open budgets/ }).click();
    await expect(page).toHaveURL(/\/s\/budgets/);
    await shot('budgets');
    await page
      .getByRole('button', { name: /Shopping/ })
      .first()
      .click();
    // the amount is typed as digits from the right: 400.00 is what reads as RM400.00 (D132)
    await page.getByLabel('Budget each cycle').fill('400.00');
    await shot('new amount');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('RM320.30 of RM400.00')).toBeVisible();
    await shot('saved');
  },

  // a goal: Goals, then one goal with its per-cycle amount and feasibility (§10)
  goal: async (page, shot, go) => {
    await go('/s/goals');
    await settled(page);
    await shot('goals');
    await page.getByRole('button', { name: /Japan in spring/ }).click();
    await expect(page).toHaveURL(/\/s\/goal\?id=/);
    await settled(page);
    await expect(page.getByText(/median surplus/i).first()).toBeVisible();
    await shot('the goal');
  },

  // subscriptions: declared, with forecasts against actual charges (§11)
  subscription: async (page, shot, go) => {
    await go('/insights');
    await settled(page);
    await page.getByRole('tab', { name: 'Subscriptions' }).click();
    await page.getByRole('button', { name: /Open subscriptions/ }).click();
    await settled(page);
    await expect(page.getByText('Claude Pro')).toBeVisible();
    await expect(page.getByText(/rate 4\.2550/)).toBeVisible();
    await shot('subscriptions');
  },

  // scan-after (core): Scan reads the receipt, you check it, and Done attaches it to its payment
  'scan-after': async (page, shot, go) => {
    await go('/');
    // a tap on Scan opens the camera's chooser straight away, from Home (no scanner screen first)
    const [camera] = await Promise.all([
      page.waitForEvent('filechooser'),
      tabs(page).getByRole('button', { name: 'Scan a receipt' }).click(),
    ]);
    await camera.setFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
    await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible();
    await shot('crop');
    await page.getByRole('button', { name: 'Use this' }).click();
    await expect(page.getByText('Reading receipt…')).toBeVisible();
    await shot('reading');
    await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
    await expect(page.getByText('SATE KAJANG HJ SAMURI')).toBeVisible();
    await expect(page.getByText('Check this price')).toBeVisible();
    await shot('confirm');
    await page.getByRole('button', { name: 'More people' }).click();
    await page.getByRole('button', { name: 'More people' }).click();
    await expect(page.getByRole('region', { name: 'How many people ate?' })).toContainText('÷ 3 =');
    await expect(page.getByRole('region', { name: 'How many people ate?' })).toContainText('RM21.38');
    await shot('three people ate');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(toast(page)).toContainText('Attached to RM64.13 on Ryt Bank');
    await shot('attached, with Undo');
  },

  // receipt-first: a receipt with no payment yet waits in Review's Waiting on others
  'receipt-first': async (page, shot, go) => {
    await go('/scan');
    await page
      .locator('main')
      .getByTestId('scan-camera')
      .setInputFiles({ name: 'receipt-nomatch.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
    await page.getByRole('button', { name: 'Use this' }).click();
    await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
    await shot('confirm');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(toast(page)).toContainText('Waiting for its payment');
    await expect(page).toHaveURL(/\/review/);
    await expect(page.getByRole('region', { name: 'Waiting on others' })).toContainText(/KOPITIAM SRI DAMAI/i);
    await shot('waiting in Review');
  },

  // manual: a payment Sen didn't see, typed as text into sen, saved with Undo (§6.8)
  manual: async (page, shot, go) => {
    await go('/review');
    await page.getByRole('button', { name: /Missing a payment/ }).click();
    await expect(page).toHaveURL(/\/s\/manual/);
    await shot('add expense');
    await page.getByLabel('Amount').fill('12.50');
    await page.getByRole('radio', { name: 'Meals' }).click();
    await shot('typed');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(toast(page)).toContainText('Added RM12.50 · Meals');
    await expect(page).toHaveURL(/\/review/);
    await shot('added');
  },

  // ---- B04 (flows.md): the journeys whose screens B04 built ----

  // first-run (core, D124): the shell's seven steps, from the email to Home, before any salary
  'first-run': async (page, shot, go) => {
    await go('/s/first-run?scenario=before-salary');
    await expect(page.getByRole('heading', { name: 'Sign in to Sen' })).toBeVisible();
    await shot('email');
    await page.getByLabel('Your email').fill('wei.ming@example.com');
    await page.getByRole('button', { name: 'Send the code' }).click();
    await expect(page.getByText('Sen sent a 6-digit code to')).toContainText('wei.ming@example.com');
    // the made-up code that has expired says so, and offers a new one
    await page.getByLabel('6-digit code').fill('000000');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByText('That code has expired.')).toBeVisible();
    await shot('code expired');
    await page.getByLabel('6-digit code').fill('123456');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByText('Step 2 of 7')).toBeVisible();
    await expect(page.getByText('Sen found 4 banks and e-wallets on this phone.')).toBeVisible();
    await shot('your apps');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 3 of 7')).toBeVisible();
    await expect(page.getByText('Sen can’t read your bank notifications yet.')).toBeVisible();
    await shot('notification access');
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await expect(page.getByText('Step 4 of 7')).toBeVisible();
    await shot('keep Sen running');
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await expect(page.getByText('Step 5 of 7')).toBeVisible();
    // an amount is typed as digits only (D132): the dot and the second one are ignored, so 12.3.4 reads 12.34
    await page.getByLabel('Ryt Bank').fill('12.3.4');
    await expect(page.getByLabel('Ryt Bank')).toHaveValue('12.34');
    await page.getByLabel('Ryt Bank').fill('1,200.50');
    await shot('your accounts');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 6 of 7')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Type your name as your bank prints it.')).toBeVisible();
    await page.getByLabel('Your name').fill('tan wei  ming');
    await expect(page.getByText('Sen will look for TAN WEI MING.')).toBeVisible();
    await shot('your name');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 7 of 7')).toBeVisible();
    await page.getByRole('radio', { name: 'A day number' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByText('Type a day from 1 to 31.')).toBeVisible();
    await page.getByLabel('Day of the month').fill('28');
    await shot('expected payday');
    // back keeps the steps' order
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Step 6 of 7')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page.getByTestId('hero')).toContainText('Spent since you started');
    await shot('home, before the first salary');
  },

  // invited: the invitation's link opens sign-in with the email filled in; the short first run follows
  invited: async (page, shot, go) => {
    await go('/s/sign-in?scenario=month&email=hui.min@example.com');
    await expect(page.getByLabel('Your email')).toHaveValue('hui.min@example.com');
    await shot('sign-in, email filled in');
    await page.getByRole('button', { name: 'Send the code' }).click();
    await page.getByLabel('6-digit code').fill('654321');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByText('That’s not the right code.')).toBeVisible();
    await shot('wrong code');
    await go('/s/first-run?scenario=month&email=hui.min@example.com');
    await signIn(page);
    // no capture: sign-in and the categories, two steps, and no payday (D79)
    await expect(page.getByText('Step 2 of 2')).toBeVisible();
    await expect(page.getByText('You count by calendar month, and can set a payday later.')).toBeVisible();
    await shot('the categories');
    const start = page.getByRole('button', { name: 'Start using Sen' });
    await page.getByRole('switch').first().click();
    await expect(page.getByRole('switch').first()).not.toBeChecked();
    await start.click();
    await expect(page.getByTestId('hero')).toContainText('Spent this month');
    await expect(page.getByText('Total balance')).toHaveCount(0);
    await shot('home, this month');
  },

  // split-mine (core): confirm → Split → I paid → Share a link; the table ticks; a friend opens the link
  'split-mine': async (page, shot, go) => {
    await go('/scan');
    await scanToConfirm(page);
    await shot('confirm');
    await page.getByRole('button', { name: 'Split', exact: true }).click();
    await expect(dialog(page, 'Who paid?')).toBeVisible();
    await shot('who paid');
    await page.getByRole('button', { name: 'I paid' }).click();
    await expect(dialog(page, 'How do you split it?')).toBeVisible();
    await page.getByRole('button', { name: 'Share a link' }).click();
    await expect(page).toHaveURL(/\/s\/split\?id=/);
    await expect(page.getByText('Still changing')).toBeVisible();
    await expect(page.getByText('Paid by You')).toBeVisible();
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await expect(page.getByRole('img', { name: 'QR code for the table' })).toBeVisible();
    await shot('still changing, with a QR for the table');
    await page.keyboard.press('Escape');
    await expect(dialog(page, 'Share this bill')).toBeHidden();
    await expect(page.getByText('Nobody has ticked this')).toHaveCount(5);
    await page.getByText('Sate ayam (20)', { exact: true }).click();
    await page.getByText('Teh o ais (3)', { exact: true }).click();
    await expect(page.getByText('Your share so far').locator('..')).toContainText('RM39.32');
    await page.getByRole('button', { name: 'Everyone' }).first().click();
    await expect(page.getByText('Nobody has ticked this')).toHaveCount(2);
    await shot('ticked');
    await page.getByRole('button', { name: "I've ticked everything I had" }).click();
    await expect(page.getByText("You're done ✓")).toBeVisible();
    await shot('done');
    // the link opens in a friend's browser, with no login: it asks her name first (D64)
    await go('/s/split-public?id=demo-new');
    await expect(page.getByText('Pay RM', { exact: false })).toHaveCount(0);
    await shot('the link, asking her name');
    await page.getByLabel("What's your name?").fill('Mei');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Hi Mei. Sen remembers this browser.')).toBeVisible();
    // her kuey teow was the one item nobody had; the shared dishes are split three ways
    await page.getByText('Kuey teow goreng', { exact: true }).click();
    await page.getByText('Ayam goreng (to share)', { exact: true }).click();
    await page.getByText('Teh ais (3)', { exact: true }).click();
    await expect(page.getByText('Shared ÷3: Wei Ming, Ali, You')).toHaveCount(2);
    await shot('Mei ticks hers');
    await page.getByRole('button', { name: "I've ticked everything I had" }).click();
    await expect(page.getByText('Final', { exact: true })).toBeVisible();
    await expect(page.getByText('To change a tick, ask Wei Ming.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Pay' })).toContainText('Pay RM22.14');
    // read-only after the lock
    await expect(page.getByRole('checkbox').first()).toBeDisabled();
    await shot('locked, with what she owes');
  },

  // paid-back: money in from a name Sen hasn't seen; the share it fits ticks itself on the split
  'paid-back': async (page, shot, go) => {
    await go('/review');
    const share = reviewRow(page, 'money-in-share', 'LIM K H');
    await expect(share).toContainText('Whose split share is it?');
    await share.getByRole('button', { name: 'Kah Hoe · BBQ PLACE' }).click();
    await expect(toast(page)).toContainText('Kah Hoe paid back RM48.80');
    await shot('answered in Review');
    await tabs(page).getByRole('link', { name: /^More/ }).click();
    await page.getByText('Shared bills', { exact: true }).click();
    await settled(page);
    await shot('shared bills');
    // the bill is settled now, so it sits under the Settled segment (its name is the avatar, then Bbq Place)
    await page.getByRole('radio', { name: /^Settled/ }).click();
    await page.getByRole('button', { name: /Bbq Place/i }).click();
    await settled(page);
    await expect(page.getByText('Final', { exact: true })).toBeVisible();
    const back = page.getByRole('region', { name: 'Who has paid you back' });
    await expect(back).toContainText('matched: Ryt Bank');
    await expect(back).not.toContainText('Not paid yet');
    // everyone is back, so the link closes a day later (D47)
    await expect(page.getByText(/The link closes on/)).toBeVisible();
    await shot('both paid back');
  },

  // split-theirs: a bill Mei paid; the reminder, her read-only list, and the paying-back prompt (D65)
  'split-theirs': async (page, shot, go) => {
    await go('/review');
    const owe = page
      .getByText('You owe Mei')
      .locator('xpath=ancestor::*[.//button[normalize-space()="Open the split"]][1]');
    await expect(owe).toContainText('RM24.40');
    await shot('review');
    await owe.getByRole('button', { name: 'Open the split' }).click();
    await expect(page).toHaveURL(/\/s\/split\?id=/);
    await expect(page.getByText('Paid by Mei')).toBeVisible();
    await expect(page.getByRole('region', { name: "Mei's tick list" })).toContainText('Not paid yet');
    // Mei's list is read-only to you
    await expect(page.getByRole('checkbox').first()).toBeDisabled();
    await expect(page.getByRole('img', { name: "Mei's DuitNow QR" })).toBeVisible();
    await shot('you owe Mei');
    // the paying-back prompt (Android draws it): its first button ticks your share, even offline
    const prompt = await standIn(page, 'prompt-payback');
    await shot('the prompt');
    await prompt.getByRole('button', { name: 'Paying back: HAIDILAO' }).click();
    await expect(dialog(page, 'Native stand-ins')).toHaveCount(0);
    await expect(page.getByText('You owe')).toHaveCount(0);
    await expect(page.getByText('Paid', { exact: true })).toBeVisible();
    await shot('paid');
  },

  // split-stuck: an item nobody ticked, and a friend who hasn't opened the link (D71)
  'split-stuck': async (page, shot, go) => {
    await go(`/s/split?id=${uid('split:nk')}`);
    await expect(page.getByText('Still changing')).toBeVisible();
    await expect(page.getByText('Waiting for You, Kah Hoe · 1 item nobody has ticked')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Lock without waiting/ })).toHaveCount(0);
    await shot('stuck');
    // a friend without a phone has it, so the item is claimed
    await page.getByRole('button', { name: 'Someone else…' }).click();
    await dialog(page, 'Who had this?').getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText("Type your friend's name.")).toBeVisible();
    await dialog(page, 'Who had this?').getByLabel("Friend's name").fill('Zul');
    await shot('who had it');
    await dialog(page, 'Who had this?').getByRole('button', { name: 'Add' }).click();
    await expect(toast(page)).toBeVisible();
    await expect(page.getByText('Nobody has ticked this')).toHaveCount(0);
    await page.getByRole('button', { name: "I've ticked everything I had" }).click();
    await expect(page.getByText("You're done ✓")).toBeVisible();
    // every item is claimed and only Kah Hoe is missing: the payer can lock without waiting
    const lock = page.getByRole('button', { name: 'Lock without waiting for Kah Hoe' });
    await expect(lock).toBeVisible();
    await shot('lock without waiting');
    await lock.click();
    await expect(page.getByText('Final', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Who has paid you back' })).toBeVisible();
    await shot('locked');
  },

  // lend (D70): a payment's split, and the friend's repayment ticking it like any share
  lend: async (page, shot, go) => {
    await go('/more');
    await page.getByText('Payments', { exact: true }).click();
    await settled(page);
    await page.getByRole('searchbox', { name: 'Search payments' }).fill('BBQ PLACE');
    await page
      .getByRole('button', { name: /^BBQ PLACE/i })
      .first()
      .click();
    await shot('the payment');
    await page.getByRole('button', { name: /^Split · / }).click();
    await expect(page).toHaveURL(/\/s\/split\?id=/);
    await expect(page.getByRole('region', { name: 'Who has paid you back' })).toContainText('matched: TNG eWallet');
    await shot("Ali's repayment ticked it");
  },

  // balance-check: type what each bank app shows; the difference is booked as Unaccounted (D18)
  'balance-check': async (page, shot, go) => {
    await go('/more');
    await page.getByText('Accounts', { exact: true }).click();
    await settled(page);
    await expect(page.getByText('In 5 accounts')).toBeVisible();
    await shot('accounts');
    await page.getByRole('button', { name: 'Check balances' }).click();
    await expect(page).toHaveURL(/\/s\/balance-check/);
    await shot('balance check');
    // nothing typed: it says what to do
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('at least one account');
    await page.getByRole('group', { name: 'Ryt Bank' }).getByLabel('What the bank app shows').fill('14,600.87');
    await page.getByRole('button', { name: 'TNG eWallet matches' }).click();
    await expect(page.getByRole('group', { name: 'TNG eWallet' }).getByLabel('What the bank app shows')).toHaveValue(
      '262.30',
    );
    await shot('typed');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(toast(page)).toBeVisible();
    await expect(page).toHaveURL(/\/s\/accounts/);
    await expect(page.getByText(/The last check found/)).toContainText('RM50.00');
    await shot('saved: the gap shows');
  },

  // payday: the card on Home, then the four steps; step 1 was answered by the payslip (D104)
  payday: async (page, shot, go) => {
    await go('/?scenario=payday');
    await expect(page.getByText('Your salary landed.')).toBeVisible();
    await shot('home, the payday card');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page).toHaveURL(/\/s\/payday/);
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your claims' })).toBeVisible();
    await expect(page.getByText(/Your payslip matched, so Sen split/)).toContainText('RM152.00');
    await shot('claims, answered by the payslip');
    // undo turns it into a question
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('Did this salary include your claims?')).toBeVisible();
    await shot('claims, asked');
    await page.getByRole('radio', { name: 'No' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Check your balances' })).toBeVisible();
    await expect(page.getByText('Step 2 of 4')).toBeVisible();
    await page.getByRole('button', { name: 'Ryt Bank matches' }).click();
    await shot('balances');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Last cycle' })).toBeVisible();
    await expect(page.getByText("Sen's three reasons it went the way it did")).toBeVisible();
    await shot('last cycle');
    // a skipped step waits in Review
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('heading', { name: "This cycle's plan" })).toBeVisible();
    await expect(page.getByText('Step 4 of 4')).toBeVisible();
    await shot('the plan');
    await page.getByRole('button', { name: 'Use this plan' }).click();
    await expect(page.getByTestId('payday-strip')).toContainText('Payday plan · 0 of 5');
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(0);
    await shot('home, the plan in progress');
    await tabs(page)
      .getByRole('link', { name: /^Review/ })
      .click();
    await expect(page.getByText('look-back, skipped on payday')).toHaveCount(2);
    await expect(page.getByText(/^October's look-back, skipped on payday$/)).toBeVisible();
    await shot('review, the skipped step');
  },

  // claims: the month's drafts, evidence missing on one, and a claim copied into ESS by hand (§13)
  claims: async (page, shot, go) => {
    await go('/more');
    await page.getByText('Claims', { exact: true }).click();
    await settled(page);
    await expect(page.getByText('September 2026')).toBeVisible();
    await expect(page.getByText('Receipt for 21 Sep not added yet')).toBeVisible();
    await shot('claims');
    // the reminder's push opens the claim (Android draws it)
    const push = await standIn(page, 'push-claim');
    await shot('the reminder');
    await push.getByRole('button', { name: /^Open the claim/ }).click();
    await expect(dialog(page, 'Native stand-ins')).toHaveCount(0);
    await expect(page).toHaveURL(/\/s\/claim/);
    await go(`/s/claim?id=${uid('claim:phone:2026-09')}`);
    await expect(page.getByText('Phone bill · September 2026')).toBeVisible();
    await expect(page.getByText('To submit · evidence complete')).toBeVisible();
    await shot('the claim');
    await page.getByRole('button', { name: 'Copy Amount' }).click();
    await expect(toast(page)).toBeVisible();
    await page.getByRole('button', { name: 'Submitted' }).click();
    await expect(page.getByText('Submitted · waiting for ESS')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submitted' })).toHaveCount(0);
    await shot('submitted');
  },

  // email-setup: More → Settings → Receipts by email (D56)
  'email-setup': async (page, shot, go) => {
    await go('/more');
    await page.getByText('Settings', { exact: true }).click();
    await page.getByRole('button', { name: /^Receipts by email/ }).click();
    await expect(page.getByText('weiming.7f3k@in.sen-my.app')).toBeVisible();
    await expect(page.getByText('Set up Gmail')).toBeVisible();
    await shot('your address');
    await page.getByRole('button', { name: 'Copy address' }).click();
    await expect(toast(page)).toBeVisible();
    await expect(page.getByText('428913')).toBeVisible();
    await page.getByRole('button', { name: 'Copy code' }).click();
    await shot("Gmail's code");
  },

  // ask (core to Sen): the button on any tab; Sen knows the screen it opened over (§12.5)
  ask: async (page, shot, go) => {
    await go('/');
    await page.getByRole('button', { name: 'Ask Sen' }).click();
    const sen = senSheet(page);
    await expect(sen).toContainText('Looking at: Home');
    await expect(sen.getByRole('group', { name: 'Suggested questions' })).toBeVisible();
    await shot("Sen's sheet");
    await sen.getByRole('button', { name: 'How am I doing this cycle?' }).click();
    // the words arrive first, then the finished message
    await expect(sen.getByRole('list', { name: 'Conversation' })).toContainText('How am I doing this cycle?');
    await expect(sen.getByText("That's a made-up answer")).toBeVisible({ timeout: 6000 });
    await expect(sen.getByRole('button', { name: 'Send' })).toBeDisabled();
    await shot('the answer');
    // a figure it could not check says so
    await expect(sen.getByText('not checked').first()).toBeVisible();
    await expect(sen.getByText('from your file').first()).toBeVisible();
    // the same sheet from another tab knows where it is
    await page.keyboard.press('Escape');
    await expect(sen).toHaveCount(0);
    await tabs(page)
      .getByRole('link', { name: /^Insights/ })
      .click();
    await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
    await expect(senSheet(page)).toContainText('Looking at: Insights');
    // memory and usage hang off its menu
    await senSheet(page).getByRole('button', { name: 'More about Sen' }).click();
    await page.getByRole('menuitem', { name: 'What Sen remembers' }).click();
    await expect(page).toHaveURL(/\/s\/agent\/memory/);
    await expect(page.getByText('Saturday dinners are usually split with Mei.')).toBeVisible();
    await shot('what Sen remembers');
    await page.getByRole('button', { name: /^Forget: Saturday/ }).click();
    await expect(toast(page)).toContainText('Forgotten');
    await expect(page.getByText('Saturday dinners are usually split with Mei.')).toHaveCount(0);
    await shot('forgotten, with Undo');
    await toast(page).getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('Saturday dinners are usually split with Mei.')).toBeVisible();
  },

  // proposal: a card in Sen's sheet and the same one in Review; answering either answers both (§12.3)
  proposal: async (page, shot, go) => {
    await go('/review');
    const row = page.getByText('ZUS COFFEE, CHAGEE → Drinks & desserts, from now on');
    await expect(row.first()).toBeVisible();
    await shot('the card in Review');
    await page.getByRole('button', { name: 'Ask Sen' }).click();
    const sen = senSheet(page);
    await expect(sen.getByText('Sen suggests', { exact: true })).toBeVisible();
    await shot('the card in the chat');
    await sen.getByRole('button', { name: 'Apply' }).click();
    await expect(toast(page)).toContainText('Applied');
    await expect(sen.getByText('Applied', { exact: true })).toBeVisible();
    await shot('applied');
    await toast(page).getByRole('button', { name: 'Undo' }).click();
    await expect(sen.getByRole('button', { name: 'Apply' })).toBeVisible();
    await sen.getByRole('button', { name: 'Dismiss' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByText('ZUS COFFEE, CHAGEE → Drinks & desserts, from now on')).toHaveCount(0);
    await shot('gone from Review too');
  },

  // research: a draft with its sources, confirmed by you (§12.2 rule 6)
  research: async (page, shot, go) => {
    await go('/');
    await page.getByRole('button', { name: 'Ask Sen' }).click();
    const sen = senSheet(page);
    await expect(sen.getByText('Draft, not confirmed')).toBeVisible();
    await expect(sen.getByRole('list', { name: 'Sources' })).toContainText('Pelita Everyday card: rates and fees');
    await sen.getByText('Cashback cards for groceries in Malaysia').scrollIntoViewIfNeeded();
    await shot('the draft');
    await sen.getByRole('button', { name: 'Confirm these figures' }).click();
    await expect(sen.getByText('Confirmed', { exact: true })).toBeVisible();
    await expect(sen.getByRole('button', { name: 'Confirm these figures' })).toHaveCount(0);
    await shot('confirmed');
    await sen.getByRole('button', { name: 'More about Sen' }).click();
    await page.getByRole('menuitem', { name: 'Research' }).click();
    await expect(page).toHaveURL(/\/s\/agent\/research/);
    const brief = page.locator('[data-slot="card"]', { hasText: 'Cashback cards for groceries in Malaysia' });
    await expect(brief).toContainText('Confirmed');
    await expect(page.locator('[data-slot="card"]', { hasText: 'Savings accounts with daily interest' })).toContainText(
      'Draft',
    );
    await shot('research');
  },

  // gap: Sen asks about a day with nothing captured; the answer opens Add expense (flows.md)
  gap: async (page, shot, go) => {
    await go('/');
    await page.getByRole('button', { name: 'Ask Sen' }).click();
    const sen = senSheet(page);
    await expect(sen.getByText('Did you pay for something on Sun 4 Oct?')).toBeVisible();
    await sen.getByText('Did you pay for something on Sun 4 Oct?').scrollIntoViewIfNeeded();
    await shot('the question');
    // answering Yes opens Add expense on the day the ask is about (D128)
    await sen.getByRole('button', { name: /^Yes, I did/ }).click();
    await expect(sen).toHaveCount(0);
    await expect(page).toHaveURL(/\/s\/manual\?.*day=2026-10-04/);
    await expect(page.getByText(/4 Oct/)).toBeVisible();
    await expect(page.getByLabel('Amount')).toBeVisible();
    await shot('add expense');
  },

  // capture-off: the watchdog's push, Home's warning, the dark widgets, and Fix (D32)
  'capture-off': async (page, shot, go) => {
    await go('/');
    await expect(page.getByText('Capture may be off')).toHaveCount(0);
    const push = await standIn(page, 'push-health');
    await shot('the push');
    await push.getByRole('button', { name: /^Open Home/ }).click();
    await expect(dialog(page, 'Native stand-ins')).toHaveCount(0);
    await expect(page.getByText('Capture may be off')).toBeVisible();
    await shot('home, capture is off');
    // every widget goes dark with Fix
    await page.getByRole('button', { name: 'Dev panel' }).click();
    await page.getByRole('button', { name: 'Widgets', exact: true }).click();
    const dark = dialog(page, 'Widgets').getByRole('region', { name: 'Dark · Capture is off' });
    await expect(dark.getByRole('button', { name: 'Fix' })).toBeVisible();
    await shot('the widgets');
    await dark.getByRole('button', { name: 'Fix' }).click();
    await expect(dialog(page, 'Widgets')).toHaveCount(0);
    await expect(page).toHaveURL(/\/s\/settings\/capture\/access/);
    await shot('notification access');
  },

  // offline: capture, Review and scanning still work; Sen and splitting say they need a connection
  offline: async (page, shot, go) => {
    await go('/?state=offline');
    await expect(page.getByText(/You're offline/)).toBeVisible();
    await expect(page.getByText('2 not synced yet')).toBeVisible();
    await shot('home');
    await tabs(page)
      .getByRole('link', { name: /^Review/ })
      .click();
    const row = reviewRow(page, 'new-merchant', 'ROTI BAKAR 88');
    await row.getByRole('button', { name: 'Meals' }).click();
    await expect(toast(page)).toContainText(/ROTI BAKAR 88 is Meals from now on/i);
    await shot('review still answers');
    await page.waitForTimeout(SETTLE_MS);
    await page.getByRole('button', { name: 'Ask Sen' }).click();
    const sen = senSheet(page);
    await expect(sen.getByText('Sen needs a connection.')).toBeVisible();
    await expect(sen.getByLabel('Message to Sen')).toBeDisabled();
    await expect(sen.getByRole('button', { name: 'Send' })).toBeDisabled();
    await shot('Sen says so');
  },

  // lost-phone: from any browser, sign in; Settings → Account is where the sessions end (§17, B05)
  'lost-phone': async (page, shot, go) => {
    await go('/s/sign-in');
    await expect(page.getByRole('heading', { name: 'Sign in to Sen' })).toBeVisible();
    // an email nobody invited is refused in words
    await page.getByLabel('Your email').fill('stranger@example.com');
    await page.getByRole('button', { name: 'Send the code' }).click();
    await shot('an email not invited');
    await page.getByLabel('Your email').fill('wei.ming@example.com');
    await page.getByRole('button', { name: 'Send the code' }).click();
    await page.getByLabel('6-digit code').fill('123456');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByTestId('hero')).toBeVisible();
    await go('/s/settings/account');
    await expect(page.getByText('About')).toBeVisible();
    await shot('account');
  },

  // invite: the admin's Members screen: an invitation with switches and a monthly AI cap (D52)
  invite: async (page, shot, go) => {
    await go('/s/settings/members');
    await expect(page.getByText('2 of 20')).toBeVisible();
    await page.getByRole('button', { name: 'Invite', exact: true }).click();
    const sheet = dialog(page, 'Invite someone');
    await expect(sheet).toContainText("You'll see their AI usage and credit, never their money.");
    await shot('the invitation');
    await sheet.getByRole('button', { name: 'Send invitation' }).click();
    await expect(sheet.getByText(/email/i).first()).toBeVisible();
    await sheet.getByLabel('Their email').fill('farida@example.com');
    await sheet.getByRole('radio', { name: 'Browser' }).click();
    await expect(sheet.getByText('A browser has no capture')).toBeVisible();
    await shot('filled in');
    await sheet.getByRole('button', { name: 'Send invitation' }).click();
    await expect(sheet).toHaveCount(0);
    const row = page.getByRole('button', { name: /^Farida/ });
    await expect(row).toContainText('Invited');
    await expect(page.getByText(/RM\\d.*\\bmoney\\b/)).toHaveCount(0);
    await shot('Members shows the invitation');
    await row.click();
    await shot('her row');
  },

  // calendar: Settings → Sen → Connect; Google's sign-in is a stand-in here (D41)
  calendar: async (page, shot, go) => {
    await go('/s/settings/sen');
    await expect(
      page.getByText('Not connected. Without it, Review and pushes still remind you.', { exact: true }),
    ).toBeVisible();
    await shot('not connected');
    await page.getByRole('button', { name: 'Connect' }).click();
    await expect(dialog(page, 'Connect Google Calendar')).toBeVisible();
    await shot("Google's sign-in");
    await page.getByRole('button', { name: 'Continue to Google' }).click();
    await expect(
      page.getByText('Connected. Sen puts claim deadlines and bills on your calendar.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible();
    await shot('connected');
  },

  // export: Settings → Data → Export everything; a push says when the link is ready (D49)
  export: async (page, shot, go) => {
    await go('/s/settings/data');
    await expect(page.getByText('Last backup')).toBeVisible();
    await shot('data');
    await page.getByRole('button', { name: 'Export everything' }).click();
    await expect(toast(page)).toContainText('Export isn’t ready yet');
    const push = await standIn(page, 'push-export');
    await expect(push).toContainText('The link works for 24 hours.');
    await shot('export ready');
    await push.getByRole('button', { name: /^Download/ }).click();
    await expect(toast(page)).toContainText('Simulated: the download opens');
  },
};

export async function walk(page: Page, info: TestInfo, look: LookId, mode: ModeId, name: string) {
  const errors = watchErrors(page);
  let n = 0;
  const shot = async (step: string) => {
    n += 1;
    await page.waitForTimeout(150);
    const name_ = `${String(n).padStart(2, '0')} ${step}`;
    // a toast or a bar over a button is caught where toasts happen: at each step
    expect.soft(await coveredTargets(page), `${name} step ${n}, ${step}`).toEqual([]);
    const body = await page.screenshot();
    await info.attach(name_, { body, contentType: 'image/png' });
    // E2E_SHOTS=<dir> also writes each one as a file, for QA's sweep: the list reporter keeps no
    // attachments (the qa skill, step 2)
    const dir = process.env.E2E_SHOTS;
    if (dir) {
      const file = `${name}--${look}-${mode}--${name_}`.replace(/[^\w.-]+/g, '_');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${file}.png`), body);
    }
  };
  await JOURNEYS[name]!(page, shot, (path) => open(page, path, look, mode));
  expect(errors).toEqual([]);
}

for (const name of Object.keys(JOURNEYS))
  test(name, async ({ page }, info) => {
    await walk(page, info, BEHAVIOUR.look, BEHAVIOUR.mode, name);
  });

// Every journey in docs/flows.md (dev/journeys.ts holds all 37) is walked above, by the id the guided
// list uses; a journey added to the list without a walk fails here.
test('every flows.md journey has a walk', () => {
  expect(GUIDED.map((j) => j.id).filter((id) => !(id in JOURNEYS))).toEqual([]);
});

// ---- B04, D128: the pieces QA found missing (Minted is enough: the looks share the screens) ----

test.describe('D128', () => {
  test('write off: the payer stops waiting, spending grows, Undo puts it back', async ({ page }) => {
    await open(page, `/s/split?id=${uid('split:bbq')}`);
    await expect(page.getByText('Final', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Write off', exact: true }).click();
    await expect(toast(page)).toContainText('Wrote off');
    await expect(page.getByText('Written off', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Write off', exact: true })).toHaveCount(0);
    await toast(page).getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('button', { name: 'Write off', exact: true })).toBeVisible();
  });

  test('pay from the same phone: stand-ins on the split and the friend’s page', async ({ page }) => {
    await open(page, `/s/split?id=${uid('split:haidilao')}`);
    await expect(page.getByRole('button', { name: 'Pay with TNG' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Other app…' })).toBeVisible();
    await page.getByRole('button', { name: 'Save QR' }).click();
    await expect(toast(page)).toContainText('Simulated: Saves the QR');
    await open(page, '/s/split-public?id=demo-final');
    await expect(page.getByRole('button', { name: 'Pay with an app' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save QR' })).toBeVisible();
  });

  test('sign-in: an expired invitation says who to ask', async ({ page }) => {
    await open(page, '/s/sign-in?state=expired');
    await expect(page.getByRole('heading', { name: 'This invitation has expired' })).toBeVisible();
    await page.getByRole('button', { name: 'Ask for a new invitation' }).click();
    await expect(toast(page)).toContainText('Ask whoever runs your Sen');
  });

  test('members: unlimited at invite, resend and revoke, remove with an export', async ({ page }) => {
    await open(page, '/s/settings/members');
    await page.getByRole('button', { name: 'Invite', exact: true }).click();
    const invite = dialog(page, 'Invite someone');
    await expect(invite.getByLabel('Monthly allowance')).toBeVisible();
    await invite.getByRole('switch', { name: /Unlimited/ }).click();
    await expect(invite.getByLabel('Monthly allowance')).toHaveCount(0);
    await invite.getByLabel('Their email').fill('a..b@x.co');
    await invite.getByRole('button', { name: 'Send invitation' }).click();
    await expect(invite.getByText('Type their email')).toBeVisible();
    await invite.getByLabel('Their email').fill('free@example.com');
    await invite.getByRole('button', { name: 'Send invitation' }).click();
    await expect(page.getByRole('button', { name: /^Free/ })).toBeVisible();

    await page.getByRole('button', { name: /^Farid/ }).click();
    await page.getByRole('button', { name: 'Resend', exact: true }).click();
    await expect(toast(page)).toContainText('Invitation sent again');
    await page.getByRole('button', { name: 'Revoke', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Farid/ })).toHaveCount(0);
    await toast(page).getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('button', { name: /^Farid/ })).toBeVisible();

    await page.getByRole('button', { name: /^Hui Min/ }).click();
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await dialog(page, 'Remove Hui Min?').getByRole('button', { name: 'Export their data first' }).click();
    await expect(toast(page)).toContainText('export goes to');
    await expect(page.getByRole('button', { name: /^Hui Min/ })).toHaveCount(0);
  });
});
