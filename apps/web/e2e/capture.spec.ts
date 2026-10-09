import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { LOOKS, MODES, open, smallTargets, watchErrors } from './helpers';

// B02's web screens, walked in a preview with the shell simulated (dev/capture-sim.ts): Settings →
// Capture and its steps, Captured on this phone with Share samples, and the hidden tests behind a
// long-press on the version. The real bridge is tested on the emulator (apps/shell/android/app/src/androidTest).

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

async function simulate(page: Page, button: string, times = 1) {
  await page.getByRole('button', { name: 'Dev panel' }).click();
  for (let i = 0; i < times; i++) await page.getByRole('button', { name: button }).click();
  await page.getByRole('button', { name: 'Close' }).click();
}

test('Capture says what stops the listener, and each step fixes one thing', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, '/more');
  await page.getByRole('link', { name: 'Capture' }).click();
  await expect(page.getByText('Not listening')).toBeVisible();
  await expect(page.getByText('Sen needs notification access to read your bank apps.')).toBeVisible();

  // your apps: the suggestion chooses the installed banks and e-wallets; blocked apps can't be chosen
  await page.getByRole('button', { name: /Your apps/ }).click();
  await page.getByRole('button', { name: 'Choose these 5' }).click();
  await expect(page.getByRole('switch', { name: 'Ryt Bank' })).toBeChecked();
  await page.getByLabel('Search every app').fill('whats');
  await expect(page.getByRole('switch', { name: 'WhatsApp' })).toBeDisabled();
  await expect(page.getByText("A messaging app can't be chosen")).toBeVisible();
  await page.getByLabel('Search every app').fill('');
  await page.getByRole('switch', { name: 'Google Wallet' }).click();
  await expect(page.getByRole('switch', { name: 'Google Wallet' })).not.toBeChecked();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('button', { name: /Your apps/ })).toContainText('4 chosen');

  // notification access: Open settings (simulated) turns it on, and the listener starts
  await page.getByRole('button', { name: /Notification access/ }).click();
  await expect(page.getByText("If Sen's switch is greyed out")).toBeVisible();
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByText('Sen can read notifications.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByText('Listening')).toBeVisible();
  await expect(page.getByText('Reading 4 apps.')).toBeVisible();

  // keep Sen running: the battery step, then the brand's
  await page.getByRole('button', { name: /Keep Sen running/ }).click();
  await page.getByRole('button', { name: 'Allow' }).click();
  await expect(page.getByText('Done', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Autostart' })).toBeVisible();
  await page.getByRole('button', { name: 'The full guide' }).click();
  await expect(page.getByRole('heading', { name: 'The full guide for Xiaomi' })).toBeVisible();
  // back closes the sheet first, then the screen
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'The full guide for Xiaomi' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Keep Sen running' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Captured on this phone lists what arrived, and shares the ones ticked', async ({ page }) => {
  // in-app navigation throughout: the simulator lives in the page, as the shell lives on the phone
  await open(page, '/more');
  await page.getByRole('link', { name: 'Capture' }).click();
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await expect(page.getByText('Notifications from your chosen apps appear here as they arrive.')).toBeVisible();
  // access on, but no app chosen: nothing is stored
  await simulate(page, 'Grant access');
  await simulate(page, 'Post a notification');
  await expect(page.getByText('0 notifications', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Choose your apps' }).click();
  await page.getByRole('button', { name: 'Choose these 5' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await simulate(page, 'Post a notification', 3);
  await expect(page.getByText('3 notifications', { exact: false })).toBeVisible();
  await expect(page.getByText('RM38.15 paid at Petron using your Main Account.')).toBeVisible();
  await page.getByRole('button', { name: 'Share samples' }).click();
  await page.getByRole('checkbox').first().click();
  await page.getByRole('button', { name: 'Share 1 sample' }).click();
  await expect(page.getByText('Simulated: the share sheet with 1 sample')).toBeVisible();
  await page.getByRole('button', { name: 'Heartbeat' }).click();
  await expect(page.getByText('Listener connected', { exact: true })).toBeVisible();
});

test('a long-press on the version opens the hidden tests', async ({ page }) => {
  await open(page, '/s/settings/account');
  const version = page.getByRole('button', { name: /Version/ });
  await version.click();
  await expect(page.getByRole('heading', { name: 'Tests' })).toHaveCount(0);
  const box = (await version.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: 'Tests' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch icon' }).click();
  await expect(page.getByText('Now Instrument.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Test island' }).click();
  await expect(page.getByText('Posted as a Live Update.', { exact: false })).toBeVisible();
});

for (const look of [LOOKS[0], LOOKS[5]]) {
  for (const mode of MODES) {
    test(`capture's screens pass axe, with 48 px targets, in ${look} ${mode}`, async ({ page }) => {
      for (const id of [
        'settings/capture',
        'settings/capture/apps',
        'settings/capture/access',
        'settings/capture/running',
      ]) {
        await open(page, `/s/${id}`, look, mode);
        await expect(page.getByRole('main').locator('[data-slot="skeleton"]')).toHaveCount(0);
        expect(await axe(page), id).toEqual([]);
        expect(await smallTargets(page), id).toEqual([]);
      }
    });
  }
}
