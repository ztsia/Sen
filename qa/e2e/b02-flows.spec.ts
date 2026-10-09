import { expect, test } from '@playwright/test';
import { shot, sim, toCapture, touchHold, watch, ready } from './b02-helpers';

// B02's flows (qa/B02/flows.md), in a preview build with the shell simulated (dev/capture-sim.ts).
const ORIGIN = 'http://localhost:4173';

test('FLOW-1 choosing your apps, and FLOW-2 messaging, email and social apps refused', async ({ page }) => {
  const w = watch(page, ORIGIN);
  await toCapture(page);
  await expect(page.getByText('Not listening')).toBeVisible();
  await shot(page, 'FLOW-1-step-0-capture');

  await page.getByRole('button', { name: /Your apps/ }).click();
  await expect(page.getByRole('heading', { name: 'Your apps' })).toBeVisible();
  // the picker's own wording (spec §6.2)
  await expect(page.getByText(/stores what they say/)).toBeVisible();
  await expect(page.getByText(/goes to Google once, with long numbers masked/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose these 4' })).toBeVisible();
  await shot(page, 'FLOW-1-step-1-suggested');

  await page.getByRole('button', { name: 'Choose these 4' }).click();
  for (const n of ["Touch 'n Go eWallet", 'Ryt Bank', 'MyPB by Public Bank', 'Grab'])
    await expect(page.getByRole('switch', { name: n })).toBeChecked();
  await shot(page, 'FLOW-1-step-2-chosen');

  // FLOW-2: WhatsApp, Gmail, Messages and Instagram can't be ticked, and say why
  const search = page.getByLabel('Search every app');
  for (const [q, label, why] of [
    ['whats', 'WhatsApp', "A messaging app can't be chosen"],
    ['gmail', 'Gmail', "An email app can't be chosen"],
    ['messages', 'Messages', "Your SMS app can't be chosen: it carries TACs"],
    ['insta', 'Instagram', "A social app can't be chosen"],
  ] as const) {
    await search.fill(q);
    const sw = page.getByRole('switch', { name: label });
    await expect(sw).toBeDisabled();
    await expect(page.getByText(why)).toBeVisible();
    await sw.click({ force: true });
    await expect(sw).not.toBeChecked();
    if (q === 'whats') await shot(page, 'FLOW-2-step-1-whatsapp-refused');
  }
  await search.fill('');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('button', { name: /Your apps/ })).toContainText('4 chosen');
  await shot(page, 'FLOW-1-step-3-four-chosen');
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('FLOW-3 a chosen app is captured; FLOW-4 an unchosen app leaves nothing; FLOW-9 share samples', async ({
  page,
}) => {
  const w = watch(page, ORIGIN);
  await toCapture(page);
  // only Ryt chosen
  await page.getByRole('button', { name: /Your apps/ }).click();
  await page.getByRole('switch', { name: 'Ryt Bank' }).click();
  await expect(page.getByRole('switch', { name: 'Ryt Bank' })).toBeChecked();
  await page.getByRole('button', { name: 'Back' }).click();
  await sim(page, 'Grant access');
  await expect(page.getByText('Listening')).toBeVisible();
  await expect(page.getByText('Reading 1 app.')).toBeVisible();
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await expect(page.getByText('0 notifications', { exact: false })).toBeVisible();
  await shot(page, 'FLOW-4-step-0-empty');

  // the simulator cycles TNG, Public Bank, Ryt, Ryt: two unchosen, two chosen
  await sim(page, 'Post a notification', 2);
  await expect(page.getByText('0 notifications', { exact: false })).toBeVisible();
  await expect(page.getByText('LIM KAH HOE')).toHaveCount(0);
  await shot(page, 'FLOW-4-step-1-unchosen-not-stored');

  await sim(page, 'Post a notification', 2);
  await expect(page.getByText('2 notifications', { exact: false })).toBeVisible();
  // newest first, raw text, emoji kept
  const items = page.getByRole('main').locator('li');
  await expect(items.nth(0)).toContainText('Card payment completed 👍');
  await expect(items.nth(0)).toContainText('RM38.15 paid at Petron using your Main Account.');
  await expect(items.nth(1)).toContainText("You've received RM42.50 from TAN WEI MING on 12/9/2026, 9:48 PM (GMT+8).");
  await expect(items.nth(0)).toContainText(/Today, \d\d:\d\d/);
  await shot(page, 'FLOW-3-step-1-captured');

  // FLOW-9: share with none ticked, then two
  await page.getByRole('button', { name: 'Share samples' }).click();
  await expect(page.getByRole('button', { name: 'Tick the ones to share' })).toBeVisible();
  await shot(page, 'FLOW-9-step-1-none-ticked');
  await page.getByRole('button', { name: 'Tick the ones to share' }).click();
  await page.waitForTimeout(300);
  // expected (patterns.md §7 Forms): nothing acts, picking stays open, the button keeps saying what's missing
  const stillPicking = await page.getByRole('checkbox').count();
  await shot(page, 'FLOW-9-step-2-share-none');
  test.info().annotations.push({
    type: 'share-with-none',
    description: `checkboxes still shown after tapping with none ticked: ${stillPicking}`,
  });
  if (!stillPicking) await page.getByRole('button', { name: 'Share samples' }).click();
  const zeroShared = stillPicking === 0;
  await page.getByRole('checkbox').nth(0).click();
  await page.getByRole('checkbox').nth(1).click();
  await page.getByRole('button', { name: 'Share 2 samples' }).click();
  await expect(page.getByText('Simulated: the share sheet with 2 samples')).toBeVisible();
  await shot(page, 'FLOW-9-step-3-shared-two');

  // the heartbeat sheet
  await page.getByRole('button', { name: 'Heartbeat' }).click();
  await expect(page.getByText('Listener connected', { exact: true })).toBeVisible();
  await expect(page.getByText('Phone started', { exact: true })).toBeVisible();
  await shot(page, 'FLOW-3-step-2-heartbeat');

  // never synced: no request carried event text, and nothing left the origin
  const leaked = w.requests.filter((r) => /Petron|TAN WEI MING|RM38\.15/.test(r.url + (r.body ?? '')));
  expect(leaked).toEqual([]);
  expect(w.requests.filter((r) => r.body !== null)).toEqual([]);
  expect(w.external).toEqual([]);
  expect(w.errors).toEqual([]);
  if (zeroShared)
    throw new Error(
      'With nothing ticked, tapping the share button acted: picking mode closed as if 0 samples were shared (the native shell rejects EMPTY instead)',
    );
});

test('FLOW-6 notification access, with the restricted-settings route', async ({ page }) => {
  await toCapture(page);
  await page.getByRole('button', { name: /Notification access/ }).click();
  await expect(page.getByText('Off', { exact: true })).toBeVisible();
  await expect(page.getByText("If Sen's switch is greyed out")).toBeVisible();
  await expect(page.getByText('Allow restricted settings')).toBeVisible();
  await shot(page, 'FLOW-6-step-1-greyed-route');
  await page.getByRole('button', { name: "Open Sen's app info" }).click();
  await expect(page.getByText('Simulated: the app’s info page')).toBeVisible();
  await shot(page, 'FLOW-6-step-2-app-info');
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByText('On', { exact: true })).toBeVisible();
  await expect(page.getByText("If Sen's switch is greyed out")).toHaveCount(0);
  await shot(page, 'FLOW-6-step-3-access-on');
});

test('FLOW-7 keep Sen running on a Xiaomi: the battery step first, then its steps', async ({ page }) => {
  await toCapture(page);
  await page.getByRole('button', { name: /Keep Sen running/ }).click();
  const every = page.getByRole('region', { name: 'Every phone' });
  const brand = page.getByRole('region', { name: 'Your Xiaomi' });
  await expect(every).toBeVisible();
  await expect(brand).toBeVisible();
  // the battery step comes before the brand's
  const [a, b] = [await every.boundingBox(), await brand.boundingBox()];
  expect(a!.y).toBeLessThan(b!.y);
  await expect(brand).toContainText('Autostart');
  await expect(brand).toContainText('No restrictions');
  await expect(brand).toContainText('Lock Sen in recent apps');
  await shot(page, 'FLOW-7-step-1-xiaomi');
  await page.getByRole('button', { name: 'Allow' }).click();
  await expect(every.getByText('Done', { exact: true })).toBeVisible();
  await shot(page, 'FLOW-7-step-2-battery-done');
});

test('FLOW-8 the hidden tests: a tap does nothing, a long-press opens three', async ({ page }) => {
  await page.goto('/s/settings/account');
  await ready(page);
  const v = page.getByRole('button', { name: /Version/ });
  await expect(v).toContainText('simulated · sim');
  await v.tap();
  await page.waitForTimeout(400);
  await expect(page.getByRole('heading', { name: 'Tests' })).toHaveCount(0);
  await shot(page, 'FLOW-8-step-1-tap-nothing');
  const box = (await v.boundingBox())!;
  await touchHold(page, box.x + 40, box.y + box.height / 2, 800);
  await expect(page.getByRole('heading', { name: 'Tests' })).toBeVisible();
  for (const n of ['Test category prompt', 'Test island', 'Switch icon'])
    await expect(page.getByRole('button', { name: n })).toBeVisible();
  await shot(page, 'FLOW-8-step-2-tests');
  await page.getByRole('button', { name: 'Test category prompt' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Pull down the notifications' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch icon' }).click();
  await expect(page.getByText(/Now Instrument\./)).toBeVisible();
  await shot(page, 'FLOW-8-step-3-ran');
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
  await shot(page, 'FLOW-11-step-3-capture');
});
