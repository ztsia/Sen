import { expect, type Locator, type Page } from '@playwright/test';
import { uid } from '../src/data/fake/ids';
import { acctId } from '../src/data/fake/scenario';

// The catalogue (D137): every screen in screens/registry.ts, opened on Wei Ming's month at the
// scenario's NOW, by a path or, for a sheet, a path and the taps that open it; plus the states and
// scenario variants that change what a screen shows. An entry's accessibility tree is committed, its
// pixels are compared against main's, and the scripted checks run on it (catalogue.spec.ts).

export interface Entry {
  /** The registry id, or `<id>@<state>` for a state or variant of it. */
  id: string;
  /** The registry id it is a view of. */
  screen: string;
  path: string;
  /** Taps after the page has loaded and settled: a sheet's opening, or a step of a walk-through. */
  open?: (page: Page) => Promise<void>;
  /** The screen moves to another look itself (the quarterly reveal), so it isn't held to the one it opened in. */
  ownLook?: boolean;
}

const NK = uid('txn:nasi-kandar');
const BBQ = uid('split:bbq');
const RECEIPT_FILE = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };

const entry = (id: string, path: string, open?: Entry['open']): Entry => ({
  id,
  screen: id.split('@')[0]!,
  path,
  open,
});

/** Waits until a sheet has stopped sliding in: its box is where it was a moment ago. */
async function still(target: Locator) {
  let last = '';
  await expect
    .poll(async () => {
      const b = await target.boundingBox();
      const now = JSON.stringify(b);
      const same = now === last;
      last = now;
      return same;
    })
    .toBe(true);
}

const cycleSheet = async (page: Page) => {
  await page.getByTestId('hero').click();
  const sheet = page.getByRole('dialog', { name: 'This cycle' });
  await expect(sheet).toContainText('Income received');
  await still(sheet);
};

const senSheet = async (page: Page) => {
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Sen' });
  await expect(sheet).toContainText('Looking at:');
  await expect(sheet.getByLabel('Message to Sen')).toBeVisible();
  await still(sheet);
};

/**
 * Scan's long-press (500 ms, frame.spec.ts): the tab bar's button opens the sheet of other ways in. A
 * press that a busy machine let through as a tap is tried again.
 */
const scanMoreSheet = async (page: Page) => {
  const scan = page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Scan a receipt' });
  const sheet = page.getByRole('dialog', { name: 'Add a payment' });
  await expect(async () => {
    const box = (await scan.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
    await expect(sheet).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });
  await still(sheet);
};

/** The reveal has arrived when the new look is on and Keep it has the focus (new-look.tsx). */
const newLookArrived = async (page: Page) => {
  await expect(page.getByRole('button', { name: 'Keep it' })).toBeFocused({ timeout: 10_000 });
};

/** Confirm needs a draft, which only the scanner makes: a photo chosen on Scan, read by the made-up reader. */
const confirmScreen = async (page: Page) => {
  await page.locator('main').getByTestId('scan-camera').setInputFiles(RECEIPT_FILE);
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  await expect(page.getByText('SATE KAJANG HJ SAMURI')).toBeVisible();
};

/** First run's seven steps are not in the address: each is reached by completing the one before. */
const FIRST_RUN = ['code', 'apps', 'access', 'running', 'accounts', 'name', 'payday'] as const;
const firstRunAt = (step: (typeof FIRST_RUN)[number]) => async (page: Page) => {
  await page.getByLabel('Your email').fill('wei.ming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  if (step === 'code') {
    await expect(page.getByLabel('6-digit code')).toBeVisible();
    return;
  }
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  for (const s of FIRST_RUN.slice(1)) {
    await expect(page.getByText(/^Step \d of 7$/)).toBeVisible();
    // each step slides in; the next tap waits for it
    await page.waitForTimeout(300);
    if (s === step) return;
    if (s === 'name') await page.getByLabel('Your name').fill('wei ming');
    await page.getByRole('button', { name: s === 'payday' ? 'Finish' : /^Next$/ }).click();
  }
};

export const CATALOGUE: Entry[] = [
  // the five tabs (D68)
  entry('home', '/'),
  entry('review', '/review'),
  entry('insights', '/insights'),
  entry('more', '/more'),
  entry('scan', '/scan'),
  // sheets, opened over the screen they belong to
  entry('cycle', '/', cycleSheet),
  entry('sen', '/', senSheet),
  entry('scan-more', '/', scanMoreSheet),
  // Home and Review
  entry('payday', '/s/payday?scenario=payday'),
  entry('skipped', '/s/skipped'),
  entry('manual', '/s/manual'),
  // Scan's steps: crop reads a made-up photo, confirm needs the draft the scanner makes
  entry('crop', `/s/crop?id=${NK}`),
  entry('confirm', '/scan', confirmScreen),
  // shared bills
  entry('shared', '/s/shared'),
  entry('split', `/s/split?id=${uid('split:nk')}`),
  entry('split-public', '/s/split-public?id=demo'),
  // Insights
  entry('budgets', '/s/budgets'),
  entry('subscriptions', '/s/subscriptions'),
  entry('goals', '/s/goals'),
  entry('goal', `/s/goal?id=${uid('goal:japan')}`),
  entry('insights/year', '/s/insights/year'),
  // Sen's pages
  entry('agent/memory', '/s/agent/memory'),
  entry('agent/research', '/s/agent/research'),
  entry('agent/usage', '/s/agent/usage'),
  // More: money
  entry('payments', '/s/payments'),
  entry('txn', `/s/txn?id=${NK}`),
  entry('receipt', `/s/receipt?id=${uid('receipt:nasi-kandar')}`),
  entry('accounts', '/s/accounts'),
  entry('account', `/s/account?id=${acctId('ryt')}`),
  entry('balance-check', '/s/balance-check'),
  entry('claims', '/s/claims'),
  entry('claim', `/s/claim?id=${uid('claim:phone:2026-09')}`),
  // Settings
  entry('settings', '/s/settings'),
  entry('settings/appearance', '/s/settings/appearance'),
  entry('settings/capture', '/s/settings/capture'),
  entry('settings/capture/apps', '/s/settings/capture/apps'),
  entry('settings/capture/access', '/s/settings/capture/access'),
  entry('settings/capture/running', '/s/settings/capture/running'),
  entry('settings/capture/captured', '/s/settings/capture/captured'),
  entry('settings/you', '/s/settings/you'),
  entry('settings/categories', '/s/settings/categories'),
  entry('settings/email', '/s/settings/email'),
  entry('settings/claims', '/s/settings/claims'),
  entry('settings/sen', '/s/settings/sen'),
  entry('settings/members', '/s/settings/members'),
  entry('settings/member', `/s/settings/member?id=${uid('member:hui-min')}`),
  entry('settings/data', '/s/settings/data'),
  entry('settings/account', '/s/settings/account'),
  // outside the tabs
  entry('sign-in', '/s/sign-in'),
  entry('first-run', '/s/first-run'),
  { ...entry('new-look', '/s/new-look', newLookArrived), ownLook: true },

  // ---- states (screens.spec.ts's STATES; loading animates, so it is not recorded) ----
  entry('home@empty', '/?state=empty'),
  entry('review@empty', '/review?state=empty'),
  entry('payments@empty', '/s/payments?state=empty'),
  entry('insights@empty', '/insights?state=empty'),
  entry('home@error', '/?state=error'),
  entry('review@error', '/review?state=error'),
  entry('insights@error', '/insights?state=error'),
  entry('home@offline', '/?state=offline'),
  entry('payments@offline', '/s/payments?state=offline'),

  // ---- variants the two per-look loops used to visit: another record, another scenario, another step ----
  entry('split@final', `/s/split?id=${BBQ}`),
  entry('split@friend-paid', `/s/split?id=${uid('split:haidilao')}`),
  entry('split@gone', '/s/split?id=nothing'),
  entry('split-public@new', '/s/split-public?id=demo-new'),
  entry('split-public@final', '/s/split-public?id=demo-final'),
  entry('split-public@closed', '/s/split-public?id=demo-closed'),
  entry('claim@evidence-missing', `/s/claim?id=${uid('claim:parking:2026-09')}`),
  entry('sign-in@invited', '/s/sign-in?email=hui.min@example.com'),
  entry('first-run@without-capture', '/s/first-run?scenario=month'),
  ...FIRST_RUN.map((step) => entry(`first-run@${step}`, '/s/first-run?scenario=before-salary', firstRunAt(step))),
  entry('shared@month', '/s/shared?scenario=month'),
  entry('accounts@month', '/s/accounts?scenario=month'),
  entry('accounts@capture-off', '/s/accounts?scenario=capture-off'),
  entry('claims@month', '/s/claims?scenario=month'),
  entry('settings@month', '/s/settings?scenario=month'),
  entry('settings/sen@cap', '/s/settings/sen?scenario=cap'),
  entry('agent/usage@cap', '/s/agent/usage?scenario=cap'),
  entry('settings/members@month', '/s/settings/members?scenario=month'),
  entry('settings/capture/access@capture-off', '/s/settings/capture/access?scenario=capture-off'),
  entry('payday@before-salary', '/s/payday?scenario=before-salary'),
  entry('payday@month', '/s/payday?scenario=month'),
];

/** Registry screens that cannot be recorded without a device or a change to the app, each with why. */
export const UNEXPLORED: Record<string, string> = {
  reading:
    'Shown only while the made-up reader works on a draft, a second or two before it moves on to Confirm; with no draft it says "No receipt here". There is no address or state that holds it still.',
};
