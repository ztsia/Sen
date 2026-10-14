import { expect, test } from '@playwright/test';
import { open, settled } from './b04r-helpers';
import { uid } from '../../apps/web/src/data/fake/ids';
import { note, step } from './b04r-r4-lib';

// Run 4 flows K: Back after a direct load, and Sen offline. Preview build (5292).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

test('R4-FLOW-17 a payment opened by its address: the app bar Back goes Home, not to a blank page', async ({
  page,
}) => {
  const F = 'R4-FLOW-17';
  await open(page, `/s/txn?id=${uid('txn:roti-bakar')}`);
  await settled(page);
  await page.getByRole('button', { name: 'Back', exact: true }).first().click();
  await page.waitForTimeout(700);
  const path = new URL(page.url()).pathname;
  note(F, `after Back: ${page.url()}`);
  await step(page, F, 1, 'back', 'open a payment by address, tap Back', 'lands on Home with the tab bar', async () => {
    expect(path).toBe('/');
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeVisible();
  });
});

test('R4-FLOW-18 Sen offline says it needs a connection, in place', async ({ page, context }) => {
  const F = 'R4-FLOW-18';
  await open(page, '/');
  await settled(page);
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message to Sen' })).toBeVisible();
  await page.keyboard.press('Escape');
  await context.setOffline(true);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  await page.waitForTimeout(800);
  const t = (await page.locator('[role="dialog"]').innerText()).replace(/\n+/g, ' | ');
  note(F, `offline Sen sheet: ${t.slice(0, 300)}`);
  await step(page, F, 1, 'offline-sen', 'go offline, open Sen', 'the sheet says Sen needs a connection', async () => {
    expect(t).toMatch(/needs a connection/i);
  });
  await context.setOffline(false);
});
