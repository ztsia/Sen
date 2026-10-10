import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { uid } from '../src/data/fake/ids';
import { LOOKS, MODES, open, settled, smallTargets, watchErrors } from './helpers';

// B03 done-when 2 and 3: every screen under the five tabs, on the made-up data, passes axe in all six
// looks, light and dark, with every target at least 48 px and nothing thrown; and each screen's
// varying states (empty, loading, error, offline, without capture, and the scenario's edge states)
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

for (const look of LOOKS)
  for (const mode of MODES)
    test(`every B03 screen in ${look}, ${mode}: axe finds nothing, targets are 48 px, nothing throws`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      const errors = watchErrors(page);
      for (const [name, path] of SCREENS) {
        await open(page, path, look, mode);
        await settled(page);
        const report = await axe(page);
        expect(report, `${name}:\n${report.join('\n')}`).toEqual([]);
        const small = await smallTargets(page);
        expect(small, `${name}:\n${small.join('\n')}`).toEqual([]);
      }
      expect(errors).toEqual([]);
    });

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
