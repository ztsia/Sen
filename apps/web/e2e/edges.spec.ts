import { expect, test, type Page } from '@playwright/test';
import { open, watchErrors } from './helpers';

// The frame at its edges, from QA B01's findings: a link that leads nowhere, a real finger's
// long-press on Scan, back after returning Home, a look that arrives slowly or not at all, and
// Review's count read out as it changes.

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });

/** A real touch: held for `ms`, then lifted, as a finger does (mouse events can't show what the lift clicks). */
async function touchHold(page: Page, x: number, y: number, ms: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

async function setFromPanel(page: Page, name: string) {
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.getByRole('radio', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Close' }).click();
}

test('an unknown screen id goes Home, and back does not return to it', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/');
  await page.goto('/s/does-not-exist');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('not-built')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a path that leads nowhere keeps the tab bar and offers the way Home', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/nope/nothing');
  await expect(page.getByText("There's nothing here")).toBeVisible();
  await expect(tabs(page)).toBeVisible();
  await expect(tabs(page).locator('[aria-current="page"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Go to Home' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('not-built')).toBeVisible();
  expect(errors).toEqual([]);
});

test("a finger's long-press on Scan opens the sheet, and lifting it chooses nothing", async ({ page }) => {
  await open(page, '/');
  const box = (await tabs(page).getByRole('button', { name: 'Scan a receipt' }).boundingBox())!;
  await touchHold(page, box.x + box.width / 2, box.y + box.height / 2, 650);
  const sheet = page.getByRole('dialog', { name: 'Add a payment' });
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(600);
  // still on Home, the sheet still open: the lift's click was swallowed
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await expect(sheet).toBeVisible();
  // and the next tap on a row works as normal
  await sheet.getByRole('button', { name: 'From gallery' }).tap();
  await expect(page).toHaveURL(/\/s\/crop/);
});

test("a finger's tap on Scan opens the scanner", async ({ page }) => {
  await open(page, '/');
  const box = (await tabs(page).getByRole('button', { name: 'Scan a receipt' }).boundingBox())!;
  await touchHold(page, box.x + box.width / 2, box.y + box.height / 2, 80);
  await expect(page).toHaveURL(/\/scan/);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('Home, Review, then Home again: back on Home leaves, never returns to Review', async ({ page }) => {
  await page.goto('about:blank');
  await open(page, '/');
  await tabs(page)
    .getByRole('link', { name: /^Review/ })
    .click();
  await expect(page).toHaveURL(/\/review$/);
  await tabs(page)
    .getByRole('link', { name: /^Insights/ })
    .click();
  await expect(page).toHaveURL(/\/insights$/);
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await page.goBack();
  await expect(page).toHaveURL('about:blank');
});

test('a look that loads slowly keeps the last look whole until it arrives', async ({ page }) => {
  await page.route(/\/assets\/copper-[\w-]+\.js$/, async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });
  await open(page, '/');
  const before = (await tabs(page).boundingBox())!.height;
  await setFromPanel(page, 'Copper');
  await page.waitForTimeout(500);
  await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
  expect(Math.abs((await tabs(page).boundingBox())!.height - before)).toBeLessThan(4);
  await expect(page.locator('html')).toHaveAttribute('data-look', 'copper', { timeout: 5000 });
});

test('a look that cannot load (offline) leaves the look on show as it was', async ({ page, context }) => {
  const errors = watchErrors(page);
  await open(page, '/');
  const before = (await tabs(page).boundingBox())!.height;
  await context.setOffline(true);
  await setFromPanel(page, 'Copper');
  await page.waitForTimeout(800);
  await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
  expect(Math.abs((await tabs(page).boundingBox())!.height - before)).toBeLessThan(4);
  // the dev panel goes back to the look on show
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await expect(page.getByRole('radio', { name: 'Minted', exact: true })).toBeChecked();
  await context.setOffline(false);
  expect(errors.filter((e) => !/Failed to fetch|net::ERR_INTERNET_DISCONNECTED/.test(e))).toEqual([]);
});

test("Review's count is in a polite live region, so a change is announced", async ({ page }) => {
  await open(page, '/');
  const live = tabs(page).getByTestId('review-count-live');
  await expect(live).toHaveAttribute('aria-live', 'polite');
  await expect(live).toHaveText(', 5 to review');
  await setFromPanel(page, '0');
  await expect(live).toHaveText('');
  await setFromPanel(page, '120');
  await expect(live).toHaveText(', More than 99 to review');
});

test('losing the connection shows the offline banner, and it goes when the connection is back', async ({
  page,
  context,
}) => {
  await open(page, '/');
  const banner = page.getByText("You're offline. What you add is kept and syncs when you're back.");
  await expect(banner).toHaveCount(0);
  await context.setOffline(true);
  await expect(banner).toBeVisible();
  // a banner, not an error: the tabs still work
  await tabs(page)
    .getByRole('link', { name: /^Review/ })
    .click();
  await expect(page).toHaveURL(/\/review$/);
  await expect(banner).toBeVisible();
  await context.setOffline(false);
  await expect(banner).toHaveCount(0);
});
