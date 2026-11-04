import { expect, test, type Page, type Route } from '@playwright/test';
import type { AccountsView } from '@sen/core/views';
import { FIRST_RUN, ownerSql } from './server.setup';

// First run against the API and sen_test (B08, D146), where what it saves is real: who is held at it,
// an empty account's RM0.00, and a save whose answer is lost (QA B08 run 1, findings 1, 2 and 4).

// each sign-in asks for a code, and codes are rate-limited; the journeys after these start from none
test.afterEach(() => ownerSql('truncate auth_rate_limit'));

async function signIn(page: Page, email: string) {
  await page.goto('/s/sign-in');
  await page.getByLabel('Your email').fill(email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 15_000 });
}

const atStep = (page: Page, n: number, of = 7) =>
  expect(page.getByText(`Step ${n} of ${of}`)).toBeVisible({ timeout: 10_000 });

/** From the apps step to the accounts step: the suggested apps chosen, access and Keep running skipped. */
async function toAccounts(page: Page) {
  await atStep(page, 2);
  // a fresh browser: nothing chosen yet, so the suggestion is always offered
  await page.getByRole('button', { name: /^Choose these \d+$/ }).click();
  await expect(page.getByRole('switch', { name: /Ryt Bank/ })).toBeChecked();
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 3);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 4);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 5);
}

const accounts = async (page: Page) => (await (await page.request.get('/api/accounts')).json()) as AccountsView;

test('without capture, an unfinished person is held at first run, in a browser too (D146 (2))', async ({ page }) => {
  await signIn(page, FIRST_RUN.noCapture.email);
  await expect(page).toHaveURL(/\/s\/first-run/);
  // anywhere else they go, they're brought back until it's finished
  await page.goto('/s/settings');
  await expect(page).toHaveURL(/\/s\/first-run/);
  // Cash is Sen's own: shown, kept on, and finishing works (QA B08 run 1, 6)
  await expect(page.getByRole('switch', { name: 'Cash' })).toBeDisabled();
  await page.getByRole('switch', { name: 'Travel' }).click();
  await page.getByRole('button', { name: 'Start using Sen' }).click();
  await expect(page).not.toHaveURL(/first-run/, { timeout: 10_000 });
  await page.goto('/s/settings');
  await expect(page).toHaveURL(/\/s\/settings/);
});

test('with capture, a browser isn’t held at first run, and its accounts step takes RM0.00 and a lost answer', async ({
  page,
}) => {
  await signIn(page, FIRST_RUN.capture.email);
  // the phone's steps are the shell's: a plain browser goes about its business (D146 (2))
  await page.goto('/s/settings');
  await expect(page).toHaveURL(/\/s\/settings/);

  await page.goto('/s/first-run');
  await toAccounts(page);
  // an empty account: typing 0 is RM0.00, not an empty field (finding 1)
  const grab = page.getByLabel('GrabPay Wallet', { exact: true });
  await grab.click();
  await page.keyboard.type('0');
  await expect(grab).toHaveValue('0.00');
  for (const [name, text] of [
    ['TNG eWallet', '84.50'],
    ['Ryt Bank', '3,200.50'],
    ['Public Bank', '6,400.00'],
  ])
    await page.getByLabel(name, { exact: true }).fill(text);

  // the second account's save reaches the server, but its answer never comes back (finding 2)
  let adds = 0;
  const lose = async (route: Route) => {
    if ((route.request().postData() ?? '').includes('"account.add"') && ++adds === 2) {
      await route.fetch();
      return route.abort('connectionreset');
    }
    return route.continue();
  };
  await page.route('**/api/commands', lose);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled({ timeout: 10_000 });
  await atStep(page, 5);
  await page.unroute('**/api/commands', lose);
  expect((await accounts(page)).tracked).toHaveLength(2);

  // Next again saves the rest: no *already has an account*, one account per app
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 6);
  const v = await accounts(page);
  expect(v.tracked.map((a) => [a.name, a.opening]).sort()).toEqual([
    ['GrabPay Wallet', 0],
    ['Public Bank', 640000],
    ['Ryt Bank', 320050],
    ['TNG eWallet', 8450],
  ]);
});
