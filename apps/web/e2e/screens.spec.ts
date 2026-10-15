import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { uid } from '../src/data/fake/ids';
import { acctId } from '../src/data/fake/scenario';
import { JOURNEYS } from '../src/dev/journeys';
import { BEHAVIOUR, MODES, open, settled, smallTargets, watchErrors } from './helpers';

// B03 done-when 2 and 3: each screen's varying states (empty, loading, error, offline, without capture, and the scenario's edge states)
// can be reached from the dev panel's switches, which ?state= and ?scenario= set on load.

const NK = uid('txn:nasi-kandar');
export const SCREENS: [name: string, path: string][] = [
  ['home', '/'],
  ['review', '/review'],
  ['skipped', '/s/skipped'],
  ['scan', '/scan'],
  ['manual', '/s/manual'],
  ['insights', '/insights'],
  ['budgets', '/s/budgets'],
  ['subscriptions', '/s/subscriptions'],
  ['goals', '/s/goals'],
  ['goal', `/s/goal?id=${uid('goal:japan')}`],
  ['insights/year', '/s/insights/year'],
  ['more', '/more'],
  ['payments', '/s/payments'],
  ['txn', `/s/txn?id=${NK}`],
  ['receipt', `/s/receipt?id=${uid('receipt:nasi-kandar')}`],
];

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

const STATES: [state: string, screen: string, path: string, expectText: RegExp][] = [
  ['empty', 'home', '/?state=empty', /Spent since you started|Left until payday/],
  ['empty', 'review', '/review?state=empty', /Nothing needs you/],
  ['empty', 'payments', '/s/payments?state=empty', /No payments/],
  ['empty', 'insights', '/insights?state=empty', /first insights/i],
  ['loading', 'home', '/?state=loading', /Loading/],
  ['loading', 'payments', '/s/payments?state=loading', /Loading/],
  ['error', 'home', '/?state=error', /Couldn't load/],
  ['error', 'review', '/review?state=error', /Couldn't load/],
  ['error', 'insights', '/insights?state=error', /Couldn't load/],
  ['offline', 'home', '/?state=offline', /2 not synced yet/],
  ['offline', 'payments', '/s/payments?state=offline', /Not synced yet/],
];

for (const [state, screen, path, text] of STATES)
  test(`${screen}, ${state}: reachable, and says so in words`, async ({ page }) => {
    await open(page, path);
    await expect(page.locator('main')).toContainText(text);
    if (state === 'offline') await expect(page.getByText(/You're offline/)).toBeVisible();
    if (state === 'error') {
      await expect(page.getByRole('button', { name: 'Try again' }).first()).toBeVisible();
      const report = await axe(page);
      expect(report, report.join('\n')).toEqual([]);
    }
  });

test('the scenario edge states change Home the way screens.md says', async ({ page }) => {
  await open(page, '/?scenario=before-salary');
  await expect(page.getByTestId('hero')).toContainText('Spent since you started');
  await open(page, '/?scenario=first-cycle');
  await expect(page.getByTestId('pace')).toContainText('nothing to compare with yet');
  await open(page, '/?scenario=month');
  await expect(page.getByTestId('hero')).toContainText('Spent this month');
  await expect(page.getByTestId('quiet')).toHaveCount(0);
  await open(page, '/?scenario=payday');
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await open(page, '/?scenario=capture-off');
  await expect(page.getByText('Capture may be off')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fix' })).toBeVisible();
});

test('a skeleton screen keeps working at text scale 1.5×: no amount is cut off', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sen.dev.textScale', '1.5'));
  for (const [name, path] of SCREENS) {
    await open(page, path);
    await settled(page);
    const cut = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-sen]')]
        .filter((el) => el.scrollWidth > el.clientWidth + 1 || getComputedStyle(el).textOverflow === 'ellipsis')
        .map((el) => el.textContent),
    );
    expect(cut, `${name}: ${cut.join(', ')}`).toEqual([]);
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(sideways, `${name} scrolls sideways`).toBe(false);
  }
});

// QA B03 runs 1 and 2: real offline, double taps and scroll, in the repo's own suite (finding 24)
const toastOf = (page: Page) => page.locator('[data-sonner-toast]').first();

test('really offline, an answer shows at once and the row is marked Not synced yet', async ({ page, context }) => {
  await open(page, '/review');
  await settled(page);
  await context.setOffline(true);
  const row = page.locator('[data-review="new-merchant"]').filter({ hasText: 'ROTI BAKAR 88' });
  await row.getByRole('button', { name: 'Meals' }).click();
  await expect(toastOf(page)).toContainText(/ROTI BAKAR 88 is Meals from now on/i);
  await expect(row).toHaveCount(0);
  await expect(page.getByRole('region', { name: /Needs you · 11/ })).toBeVisible();
  await context.setOffline(false);
});

test('a double tap answers one Review row, not the one that slides into its place', async ({ page }) => {
  await open(page, '/review');
  await settled(page);
  const needs = () => page.locator('[data-review]').count();
  await expect(page.locator('[data-review]').first()).toBeVisible();
  const before = await needs();
  await page
    .locator('[data-review="new-merchant"]')
    .first()
    .getByRole('button')
    .first()
    .click({ clickCount: 2, delay: 20 });
  await expect(toastOf(page)).toBeVisible();
  await page.waitForTimeout(600);
  expect(await needs()).toBe(before - 1);
});

test('Apply all, double-tapped, applies once; one Undo puts every answer back', async ({ page }) => {
  await open(page, '/review');
  await settled(page);
  const heading = page.getByRole('heading', { name: /Needs you/ });
  await expect(heading).toHaveText('Needs you · 12');
  await page.getByRole('button', { name: 'Apply all' }).click({ clickCount: 2, delay: 20 });
  await expect(heading).toHaveText('Needs you · 10');
  await toastOf(page).getByRole('button', { name: 'Undo' }).click();
  await expect(heading).toHaveText('Needs you · 12');
});

test('a screen opens at its top, not at the last screen’s scroll', async ({ page }) => {
  const tabs = page.getByRole('navigation', { name: 'Tabs' });
  const top = () => page.locator('main').evaluate((m) => m.scrollTop);
  // Payments, then Review scrolled down, then Payments again: it opens at its first rows
  await open(page, '/more');
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await tabs.getByRole('link', { name: /^Review/ }).click();
  await page.waitForTimeout(600);
  await page.locator('main').evaluate((m) => m.scrollTo(0, 900));
  await tabs.getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await page.waitForTimeout(800);
  expect(await top()).toBe(0);
  // a tab revisited, likewise
  await tabs.getByRole('link', { name: /^Review/ }).click();
  await page.waitForTimeout(600);
  await page.locator('main').evaluate((m) => m.scrollTo(0, 900));
  await tabs.getByRole('link', { name: /^Insights/ }).click();
  await page.waitForTimeout(800);
  expect(await top()).toBe(0);
});

// QA B03 run 3: the fixes that a screen shows, in the repo's own suite
test('money out is never offered as a refund or income (28)', async ({ page }) => {
  await open(page, `/s/txn?id=${NK}`);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Mark as…' }).click();
  await expect(page.getByRole('button', { name: 'Transfer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refund of…' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Income' })).toHaveCount(0);
});

test('at 1.5× text, the pace amount stays in one piece (23)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sen.dev.textScale', '1.5'));
  await open(page, '/');
  const amount = page.getByTestId('pace').locator('[data-sen]').first();
  const lines = await amount.evaluate((el) => el.getClientRects().length);
  expect(lines).toBe(1);
});

test('before the first salary, the cycle sheet says spent since you started, never over (34)', async ({ page }) => {
  await open(page, '/?scenario=before-salary');
  await page.getByTestId('hero').click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toContainText('Spent since you started');
  await expect(sheet).not.toContainText('Over by');
  await expect(sheet).not.toContainText('over on payday');
});

// ---- B04 done-when 2: the screens B04 built, in their states and sheets, in all six looks ----
// (every screen in each look, with axe and the 48 px targets, is the catalogue's: catalogue.spec.ts)

const BBQ = uid('split:bbq');
export const B04_SCREENS: [name: string, path: string][] = [
  // shared bills: a split as payer (changing, final) and as one who owes; a friend's page in each state
  ['shared', '/s/shared'],
  ['split, changing (you paid)', `/s/split?id=${uid('split:nk')}`],
  ['split, final (you paid)', `/s/split?id=${BBQ}`],
  ['split, final (a friend paid)', `/s/split?id=${uid('split:haidilao')}`],
  ['split, gone', '/s/split?id=nothing'],
  ['split-public, new', '/s/split-public?id=demo-new'],
  ['split-public, named', '/s/split-public?id=demo'],
  ['split-public, final', '/s/split-public?id=demo-final'],
  ['split-public, closed', '/s/split-public?id=demo-closed'],
  // Sen's pages
  ['agent/memory', '/s/agent/memory'],
  ['agent/research', '/s/agent/research'],
  ['agent/usage', '/s/agent/usage'],
  // money
  ['accounts', '/s/accounts'],
  ['account', `/s/account?id=${acctId('ryt')}`],
  ['balance-check', '/s/balance-check'],
  ['payday', '/s/payday?scenario=payday'],
  ['claims', '/s/claims'],
  ['claim', `/s/claim?id=${uid('claim:phone:2026-09')}`],
  ['claim, evidence missing', `/s/claim?id=${uid('claim:parking:2026-09')}`],
  // Settings
  ['settings', '/s/settings'],
  ['settings/appearance', '/s/settings/appearance'],
  ['settings/capture', '/s/settings/capture'],
  ['settings/capture/apps', '/s/settings/capture/apps'],
  ['settings/capture/access', '/s/settings/capture/access'],
  ['settings/capture/running', '/s/settings/capture/running'],
  ['settings/capture/captured', '/s/settings/capture/captured'],
  ['settings/you', '/s/settings/you'],
  ['settings/categories', '/s/settings/categories'],
  ['settings/email', '/s/settings/email'],
  ['settings/claims', '/s/settings/claims'],
  ['settings/sen', '/s/settings/sen'],
  ['settings/members', '/s/settings/members'],
  ['settings/data', '/s/settings/data'],
  ['settings/account', '/s/settings/account'],
  // outside the tabs
  ['sign-in', '/s/sign-in'],
  ['sign-in, invited', '/s/sign-in?email=hui.min@example.com'],
  ['first-run, with capture', '/s/first-run?scenario=before-salary'],
  ['first-run, without capture', '/s/first-run?scenario=month'],
  ['new-look', '/s/new-look'],
];

async function clean(page: Page, name: string) {
  const report = await axe(page);
  expect(report, `${name}:\n${report.join('\n')}`).toEqual([]);
  const small = await smallTargets(page);
  expect(small, `${name}:\n${small.join('\n')}`).toEqual([]);
}

// Every B04 screen's states, Sen's sheet and the stand-ins, in one look, light and dark: the looks share
// these blocks, and the catalogue checks how each look draws its screens in all twelve pairs (D137)
for (const look of [BEHAVIOUR.look])
  for (const mode of MODES) {
    for (const state of ['empty', 'loading', 'error', 'offline'] as const)
      test(`every B04 screen, ${state}, in ${look}, ${mode}: axe finds nothing, targets are 48 px, nothing throws`, async ({
        page,
      }) => {
        test.setTimeout(300_000);
        const errors = watchErrors(page);
        for (const [name, path] of B04_SCREENS) {
          // a public split reads its own fake, which has no states; sign-in and first run read none
          if (/^(split-public|sign-in|new-look)/.test(name)) continue;
          await open(page, `${path}${path.includes('?') ? '&' : '?'}state=${state}`, look, mode);
          if (state !== 'loading') await settled(page);
          await clean(page, `${name}, ${state}`);
        }
        expect(errors).toEqual([]);
      });

    test(`Sen's sheet in ${look}, ${mode}: open, answering, offline and paused pass axe`, async ({ page }) => {
      test.setTimeout(240_000);
      const errors = watchErrors(page);
      const sen = page.getByRole('dialog', { name: 'Sen' });
      const openSen = async (path: string) => {
        await open(page, path, look, mode);
        if (!path.includes('state=loading')) await settled(page);
        await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
        await expect(sen).toContainText('Looking at:');
        // loading and error show their own state in place of the composer
        if (!/state=(loading|error)/.test(path)) await expect(sen.getByLabel('Message to Sen')).toBeVisible();
        await page.waitForTimeout(500);
      };
      for (const [name, path] of [
        ['Home', '/'],
        ['Review', '/review'],
        ['Insights', '/insights'],
        ['More', '/more'],
        ['offline', '/?state=offline'],
        ['paused (AI credit at zero)', '/?scenario=cap'],
        ['loading', '/?state=loading'],
        ['error', '/?state=error'],
      ] as const) {
        await openSen(path);
        await clean(page, `Sen's sheet, ${name}`);
      }
      // streaming: the words arrive first, then the finished message
      await openSen('/');
      await sen.getByRole('button', { name: 'How am I doing this cycle?' }).click();
      await expect(sen.getByText('…').first()).toBeVisible({ timeout: 4000 });
      await clean(page, "Sen's sheet, streaming");
      await expect(sen.getByText("That's a made-up answer")).toBeVisible({ timeout: 6000 });
      await clean(page, "Sen's sheet, answered");
      // a file chosen to send
      await sen.locator('input[type="file"]').setInputFiles({
        name: 'bill.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4'),
      });
      await expect(sen.getByRole('button', { name: 'Remove bill.pdf' })).toBeVisible();
      await clean(page, "Sen's sheet, a file chosen");
      expect(errors).toEqual([]);
    });

    test(`the native stand-ins and widgets in ${look}, ${mode}: axe finds nothing`, async ({ page }) => {
      test.setTimeout(240_000);
      const errors = watchErrors(page);
      await open(page, '/', look, mode);
      await settled(page);
      const devPanel = async (button: string) => {
        await page.getByRole('button', { name: 'Dev panel' }).click();
        await page.getByRole('button', { name: button, exact: true }).click();
      };
      // every surface: prompts, pushes, the launcher and share target, the island
      await devPanel('Surfaces');
      const list = page.getByRole('dialog', { name: 'Native stand-ins' });
      await expect(list.getByTestId('surface-prompt-category')).toBeVisible();
      for (const group of ['Prompts', 'Pushes', 'Launcher and sharing', 'The island']) {
        await list.getByRole('region', { name: group }).scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
      }
      const report = await axe(page);
      expect(report, `stand-ins:\n${report.join('\n')}`).toEqual([]);
      const small = await smallTargets(page);
      expect(small, `stand-ins:\n${small.join('\n')}`).toEqual([]);
      await list.getByRole('button', { name: 'Close' }).click();
      await expect(list).toHaveCount(0);
      // widgets S, M and L, each in light, dark and dark with Capture is off
      await page.waitForTimeout(450);
      await devPanel('Widgets');
      const widgets = page.getByRole('dialog', { name: 'Widgets' });
      for (const size of ['Small', 'Medium', 'Large']) {
        await widgets.getByRole('radio', { name: size }).click();
        await expect(widgets.getByTestId(new RegExp(`^widget-${size[0]}-`)).first()).toBeVisible();
        await page.waitForTimeout(150);
        const w = await axe(page);
        expect(w, `widget ${size}:\n${w.join('\n')}`).toEqual([]);
        const ws = await smallTargets(page);
        expect(ws, `widget ${size}:\n${ws.join('\n')}`).toEqual([]);
      }
      expect(errors).toEqual([]);
    });
  }

// Each guided journey (the dev panel's list, dev/journeys.ts) plays to its end: its bar shows the caption
// of every step, and every screen it shows passes axe.
for (const j of JOURNEYS)
  test(`the guided journey ${j.id} plays to its end, and every step passes axe`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    // from Home: another journey can leave the app on a screen outside the frame, with no dev panel
    await open(page, '/');
    await settled(page);
    await page.getByRole('button', { name: 'Dev panel' }).click();
    await page.getByRole('button', { name: 'Choose a journey' }).click();
    const list = page.getByRole('dialog', { name: 'Guided journeys' });
    if (j.id === JOURNEYS[0]!.id) await clean(page, 'the journeys list');
    await list.getByTestId(`journey-${j.id}`).click();
    const bar = page.getByTestId('journey-bar');
    for (let i = 0; i < j.steps.length; i++) {
      await expect(bar).toContainText(`Step ${i + 1} of ${j.steps.length}`);
      await expect(page.getByTestId('journey-caption')).toHaveText(j.steps[i]!.caption);
      await settled(page);
      await page.waitForTimeout(250);
      const report = await axe(page);
      expect(report, `${j.id} step ${i + 1} (${j.steps[i]!.screen}):\n${report.join('\n')}`).toEqual([]);
      // by text: while Sen's sheet is open it hides the page behind it from assistive technology, the bar
      // included, but the bar sits above it and a tap reaches it
      const next = bar.locator('button', { hasText: i === j.steps.length - 1 ? 'Finish' : 'Next' });
      await expect(next, `${j.id} step ${i + 1}: the bar has its button`).toBeVisible();
      await next.click();
    }
    await expect(bar).toHaveCount(0);
    expect(errors).toEqual([]);
  });
