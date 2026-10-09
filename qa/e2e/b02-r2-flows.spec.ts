import { expect, test, type Page } from '@playwright/test';
import { shot, sim, touchHold, watch, ready, PROD } from './b02-helpers';

// QA run 2's walk of qa/B02/flows.md, at 412×915 (b02.config.ts), in a preview build with the shell
// simulated (dev/capture-sim.ts), and a production build on :4176. Every step asserts before its shot.
const ORIGIN = 'http://localhost:4173';

/** More → Settings → Capture, by in-app navigation (the simulator lives in the page's memory). */
async function toCapture(page: Page) {
  await page.goto('/more');
  await ready(page);
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('link', { name: 'Capture' }).click();
  await expect(page.getByRole('heading', { name: 'Capture' })).toBeVisible();
}
const back = (page: Page) => page.getByRole('button', { name: 'Back' }).click();
const rows = (page: Page) => page.getByRole('main').locator('ul > li');

async function chooseOnly(page: Page, labels: string[]) {
  await page.getByRole('button', { name: /Your apps/ }).click();
  await expect(page.getByRole('heading', { name: 'Your apps' })).toBeVisible();
  for (const l of labels) {
    await page.getByRole('switch', { name: l }).click();
    await expect(page.getByRole('switch', { name: l })).toBeChecked();
  }
  await back(page);
  await expect(page.getByRole('heading', { name: 'Capture' })).toBeVisible();
}

test('FLOW-1 choosing your apps', async ({ page }) => {
  const w = watch(page, ORIGIN);
  await toCapture(page);
  await expect(page.getByRole('button', { name: /Your apps/ })).toContainText('None yet');
  await shot(page, 'FLOW-1-step-0-capture');
  await page.getByRole('button', { name: /Your apps/ }).click();
  await expect(page.getByText(/stores what they say/)).toBeVisible();
  await expect(page.getByText(/goes to Google once, with long numbers masked/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose these 4' })).toBeVisible();
  await shot(page, 'FLOW-1-step-1-suggested');
  await page.getByRole('button', { name: 'Choose these 4' }).click();
  for (const n of ["Touch 'n Go eWallet", 'Ryt Bank', 'MyPB by Public Bank', 'Grab'])
    await expect(page.getByRole('switch', { name: n })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Google Wallet' })).not.toBeChecked();
  await shot(page, 'FLOW-1-step-2-chosen');
  await back(page);
  await expect(page.getByRole('button', { name: /Your apps/ })).toContainText('4 chosen');
  await page.getByRole('button', { name: /Your apps/ }).click();
  await expect(page.getByRole('switch', { name: 'Ryt Bank' })).toBeChecked();
  await expect(page.getByRole('button', { name: /Choose these/ })).toHaveCount(0);
  await shot(page, 'FLOW-1-step-3-kept');
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('FLOW-2 a messaging app cannot be chosen', async ({ page }) => {
  await toCapture(page);
  await chooseOnly(page, ['Ryt Bank']);
  await page.getByRole('button', { name: /Your apps/ }).click();
  const search = page.getByLabel('Search every app');
  await search.fill('whats');
  const sw = page.getByRole('switch', { name: 'WhatsApp' });
  await expect(sw).toBeDisabled();
  await expect(page.getByText("A messaging app can't be chosen")).toBeVisible();
  await expect(sw).toHaveAttribute('aria-describedby', /.+/);
  await shot(page, 'FLOW-2-step-1-search-whatsapp');
  await sw.click({ force: true });
  await page.getByText('WhatsApp', { exact: true }).click({ force: true });
  await expect(sw).not.toBeChecked();
  await search.fill('messages');
  await expect(page.getByRole('switch', { name: 'Messages' })).toBeDisabled();
  await expect(page.getByText("Your SMS app can't be chosen: it carries TACs")).toBeVisible();
  await shot(page, 'FLOW-2-step-2-tap-refused');
  await search.fill('');
  await back(page);
  await expect(page.getByRole('button', { name: /Your apps/ })).toContainText('1 chosen');
});

test('FLOW-3 notification access, with the restricted-settings route', async ({ page }) => {
  await toCapture(page);
  await page.getByRole('button', { name: /Notification access/ }).click();
  await expect(page.getByText('Off', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open settings' })).toBeVisible();
  await shot(page, 'FLOW-3-step-1-off');
  await expect(page.getByText("If Sen's switch is greyed out")).toBeVisible();
  await page.getByRole('button', { name: "Open Sen's app info" }).click();
  await expect(page.getByText('Simulated: the app’s info page')).toBeVisible();
  await shot(page, 'FLOW-3-step-2-app-info');
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByText('On', { exact: true })).toBeVisible();
  await expect(page.getByText("If Sen's switch is greyed out")).toHaveCount(0);
  await shot(page, 'FLOW-3-step-3-on');
});

test('FLOW-4 keep Sen running, on a Xiaomi and on a brand with no steps', async ({ page }) => {
  const w = watch(page, ORIGIN);
  await toCapture(page);
  await page.getByRole('button', { name: /Keep Sen running/ }).click();
  const every = page.getByRole('region', { name: 'Every phone' });
  const brand = page.getByRole('region', { name: 'Your Xiaomi' });
  await expect(every).toBeVisible();
  await expect(brand).toContainText('Autostart');
  await expect(brand).toContainText('No restrictions');
  await expect(brand).toContainText('Lock Sen in recent apps');
  expect((await every.boundingBox())!.y).toBeLessThan((await brand.boundingBox())!.y);
  await shot(page, 'FLOW-4-step-1-battery-first');
  await expect(brand.getByRole('button', { name: 'Open Autostart' })).toBeVisible();
  await brand.getByRole('button', { name: 'Open Autostart' }).click();
  await expect(page.getByText('Simulated: Autostart')).toBeVisible();
  await shot(page, 'FLOW-4-step-2-xiaomi-steps');
  await page.getByRole('button', { name: 'Dev panel' }).click();
  const panel = page.getByRole('dialog', { name: 'Dev panel' });
  await panel.getByText('A brand with no steps').click();
  await expect(panel.getByText('A brand with no steps')).toHaveAttribute('data-state', 'on');
  await panel.getByRole('button', { name: 'Close' }).click();
  await expect(panel).toBeHidden();
  await back(page);
  await page.getByRole('button', { name: /Keep Sen running/ }).click();
  await expect(page.getByRole('region', { name: 'Your Fairphone' })).toContainText('Sen has no extra steps');
  await expect(page.getByRole('region', { name: 'Every phone' })).toBeVisible();
  await shot(page, 'FLOW-4-step-3-no-brand');
  expect(w.errors).toEqual([]);
});

test('FLOW-5 a payment captured, replayed, then a second identical one', async ({ page }) => {
  await toCapture(page);
  await chooseOnly(page, ["Touch 'n Go eWallet", 'Ryt Bank', 'MyPB by Public Bank']);
  await sim(page, 'Grant access');
  await expect(page.getByText('Listening')).toBeVisible();
  await sim(page, 'Post a notification'); // TNG, the sim's first sample
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await expect(page.getByText('1 notification,', { exact: false })).toBeVisible();
  await expect(rows(page).nth(0)).toContainText('DuitNow Transfer is successful!');
  await expect(rows(page).nth(0)).toContainText('You have successfully transferred RM 18.00 to LIM KAH HOE.');
  await expect(rows(page).nth(0)).toContainText(/Today, \d\d:\d\d/);
  await expect(rows(page).nth(0)).toContainText("Touch 'n Go eWallet");
  await shot(page, 'FLOW-5-step-1-captured');
  // step 2: the title and the text are both selectable (patterns.md §7, Raw notification row)
  const sel = await rows(page)
    .nth(0)
    .evaluate((li) => {
      const title = li.querySelector('[data-slot="item-title"]') as HTMLElement;
      const text = li.querySelector('p.selectable') as HTMLElement;
      return { title: getComputedStyle(title).userSelect, text: getComputedStyle(text).userSelect };
    });
  test.info().annotations.push({ type: 'user-select', description: JSON.stringify(sel) });
  await shot(page, 'FLOW-5-step-2-selectable');
  // step 3: the replay
  await sim(page, 'Post it again');
  await expect(page.getByText('1 notification,', { exact: false })).toBeVisible();
  await shot(page, 'FLOW-5-step-3-replay');
  // step 4: the sim cycles TNG, PBB, Ryt, Ryt: four more posts give TNG again with a new time
  await sim(page, 'Post a notification', 4);
  await expect(page.getByText('5 notifications,', { exact: false })).toBeVisible();
  await expect(page.getByText('You have successfully transferred RM 18.00 to LIM KAH HOE.')).toHaveCount(2);
  await shot(page, 'FLOW-5-step-4-second-payment');
  expect(sel.title, 'the title must be selectable as patterns.md §7 says').toBe('text');
  expect(sel.text).toBe('text');
});

test('FLOW-6 an OTP and an unchosen app never arrive', async ({ page }) => {
  const w = watch(page, ORIGIN);
  await toCapture(page);
  await chooseOnly(page, ['Ryt Bank']);
  await sim(page, 'Grant access');
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await expect(page.getByText('0 notifications', { exact: false })).toBeVisible();
  await sim(page, 'Post an OTP');
  await expect(page.getByText('0 notifications', { exact: false })).toBeVisible();
  await shot(page, 'FLOW-6-step-1-otp');
  await sim(page, 'Post a notification'); // TNG: not chosen
  await expect(page.getByText('0 notifications', { exact: false })).toBeVisible();
  await expect(page.getByText('LIM KAH HOE')).toHaveCount(0);
  await shot(page, 'FLOW-6-step-2-unchosen');
  // nothing about either left the page
  expect(w.requests.filter((r) => /LIM KAH HOE|OTP|TAC/.test(r.url + (r.body ?? '')))).toEqual([]);
});

test('FLOW-7 share samples', async ({ page }) => {
  await toCapture(page);
  await chooseOnly(page, ['Ryt Bank']);
  await sim(page, 'Grant access');
  await sim(page, 'Post a notification', 4); // TNG, PBB (dropped), Ryt, Ryt
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await expect(page.getByText('2 notifications', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Share samples' }).click();
  await page.getByRole('button', { name: 'Tick the ones to share' }).click();
  await expect(page.getByText('Tick the notifications to share first.')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(2);
  await shot(page, 'FLOW-7-step-1-none-ticked');
  // the whole row ticks it: tap the text, not the box
  await rows(page).nth(1).click(); // the middle of the row, where its text is: the label's overlay takes it
  await expect(page.getByRole('checkbox').nth(1)).toBeChecked();
  await expect(page.getByRole('checkbox').nth(0)).not.toBeChecked();
  await shot(page, 'FLOW-7-step-2-row-ticked');
  await page.getByRole('button', { name: 'Share 1 sample' }).click();
  await expect(page.getByText('Simulated: the share sheet with 1 sample')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await shot(page, 'FLOW-7-step-3-shared');
});

test('FLOW-8 the hidden tests', async ({ page }) => {
  await page.goto('/more');
  await ready(page);
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Account' }).click();
  const v = page.getByRole('button', { name: /Version/ });
  await expect(v).toContainText('simulated · sim');
  await v.tap();
  await page.waitForTimeout(400);
  await expect(page.getByRole('heading', { name: 'Tests' })).toHaveCount(0);
  await shot(page, 'FLOW-8-step-1-tap');
  const box = (await v.boundingBox())!;
  await touchHold(page, box.x + 40, box.y + box.height / 2, 800);
  await expect(page.getByRole('heading', { name: 'Tests' })).toBeVisible();
  for (const n of ['Test category prompt', 'Test island', 'Switch icon'])
    await expect(page.getByRole('button', { name: n })).toBeVisible();
  await shot(page, 'FLOW-8-step-2-long-press');
  await page.getByRole('button', { name: 'Test category prompt' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Pull down the notifications' })).toBeVisible();
  await page.getByRole('button', { name: 'Test island' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Posted as a Live Update' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch icon' }).click();
  await expect(page.getByText(/Now Instrument\./)).toBeVisible();
  await shot(page, 'FLOW-8-step-3-each-test');
});

test('FLOW-9 production in a browser', async ({ page }) => {
  const w = watch(page, PROD);
  await page.goto(`${PROD}/s/settings/capture`);
  await expect(page.getByText("Capture works in Sen's Android app", { exact: false })).toBeVisible();
  await shot(page, 'FLOW-9-step-1-capture');
  await expect(page.getByRole('button', { name: 'Dev panel' })).toHaveCount(0);
  for (const p of ['apps', 'access', 'running', 'captured']) {
    await page.goto(`${PROD}/s/settings/capture/${p}`);
    await expect(page.getByText("Capture works in Sen's Android app", { exact: false })).toBeVisible();
  }
  await shot(page, 'FLOW-9-step-2-no-dev-panel');
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test.describe('FLOW-10 opens offline', () => {
  test.use({ serviceWorkers: 'allow' });
  test('production, loaded once, then offline', async ({ page, context }) => {
    await page.goto(`${PROD}/`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 }).catch(
      async () => {
        await page.reload();
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 });
      },
    );
    const n = await page.evaluate(async () => {
      const ks = await caches.keys();
      let c = 0;
      for (const k of ks) c += (await (await caches.open(k)).keys()).length;
      return c;
    });
    expect(n).toBeGreaterThan(10);
    await shot(page, 'FLOW-10-step-1-worker');
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('not-built')).toBeVisible();
    await shot(page, 'FLOW-10-step-2-offline-home');
    await page.goto(`${PROD}/s/settings/capture`);
    await expect(page.getByText("Capture works in Sen's Android app", { exact: false })).toBeVisible();
    await shot(page, 'FLOW-10-step-3-offline-deep');
    const api = await page.evaluate(() =>
      fetch('/api/health').then(
        (r) => `answered ${r.status}`,
        () => 'failed',
      ),
    );
    expect(api).toBe('failed');
    await context.setOffline(false);
  });
});

test('FLOW-11 back closes the sheet first, then the screen', async ({ page }) => {
  await toCapture(page);
  await page.getByRole('button', { name: /Keep Sen running/ }).click();
  await page.getByRole('button', { name: 'The full guide' }).click();
  await expect(page.getByRole('heading', { name: 'The full guide for Xiaomi' })).toBeVisible();
  await shot(page, 'FLOW-11-step-1-sheet');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'The full guide for Xiaomi' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Keep Sen running' })).toBeVisible();
  await shot(page, 'FLOW-11-step-2-sheet-closed');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Capture' })).toBeVisible();
  await shot(page, 'FLOW-11-step-3-screen-back');
});

test.describe('FLOW-12 another timezone', () => {
  test.use({ timezoneId: 'America/New_York' });
  test('a payment at 23:30 KL on 31 Oct reads 23:30, and Yesterday once KL passes midnight', async ({ page }) => {
    // 15:30 UTC on 31 Oct is 23:30 in Kuala Lumpur, 11:30 in New York
    await page.clock.install({ time: new Date('2026-10-31T15:30:00Z') });
    await toCapture(page);
    await chooseOnly(page, ["Touch 'n Go eWallet"]);
    await sim(page, 'Grant access');
    await sim(page, 'Post a notification');
    await page.getByRole('button', { name: /Captured on this phone/ }).click();
    await expect(rows(page).nth(0)).toContainText('Today, 23:30');
    await expect(rows(page).nth(0)).not.toContainText('11:30');
    await shot(page, 'FLOW-12-step-1-kl-time');
    // 16:10 UTC: 00:10 on 1 Nov in Kuala Lumpur, still 31 Oct (12:10) in New York
    await page.clock.setSystemTime(new Date('2026-10-31T16:10:00Z'));
    await back(page);
    await page.getByRole('button', { name: /Captured on this phone/ }).click();
    await expect(rows(page).nth(0)).toContainText('Yesterday, 23:30');
    await shot(page, 'FLOW-12-step-2-after-kl-midnight');
  });
});
