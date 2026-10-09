import { expect, test, type Page } from '@playwright/test';
import { shot, sim, toCapture } from './b02-helpers';

// QA run 4: FLOW-14 (qa/B02/flows.md), the drop log spec §6.2 and D115 added since run 3, at 412×915 in the
// preview build with the shell simulated. Runs 2–3's flows stay in b02-r3-flows.spec.ts and are re-run.
const back = (page: Page) => page.getByRole('button', { name: 'Back' }).click();
const rows = (page: Page) => page.getByRole('main').locator('ul > li');

async function chosen(page: Page, label: string, on: boolean) {
  await page.getByRole('button', { name: /Your apps/ }).click();
  const sw = page.getByRole('switch', { name: label });
  if ((await sw.isChecked()) !== on) await sw.click();
  if (on) await expect(sw).toBeChecked();
  else await expect(sw).not.toBeChecked();
  await back(page);
  await expect(page.getByRole('heading', { name: 'Capture' })).toBeVisible();
}

async function heartbeatLog(page: Page) {
  await page.getByRole('button', { name: 'Heartbeat' }).click();
  const sheet = page.getByRole('dialog', { name: 'Heartbeat' });
  await expect(sheet).toBeVisible();
  return sheet;
}

test('FLOW-14 a dropped OTP is visible on the phone, without its text', async ({ page }) => {
  await toCapture(page);
  await chosen(page, 'Ryt Bank', true);
  await sim(page, 'Grant access');
  // step 1: an OTP from a chosen app
  await sim(page, 'Post an OTP');
  await expect(page.getByText('Simulated: an OTP, dropped before anything was stored')).toBeVisible();
  await shot(page, 'FLOW-14-step-1-otp-posted');
  // step 2: no event row, one drop line naming the app, none of the OTP's words or digits
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await expect(page.getByText('0 notifications', { exact: false })).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
  let sheet = await heartbeatLog(page);
  await expect(sheet.getByText(/^Dropped a one-time code from Ryt Bank$/)).toHaveCount(1);
  await expect(sheet.getByText(/482910|TAC|Do not share/)).toHaveCount(0);
  const logText = await sheet.innerText();
  expect(logText).not.toMatch(/482910|Your TAC/);
  await shot(page, 'FLOW-14-step-2-log-entry');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  // step 3: the same OTP from an app that isn't chosen
  await back(page);
  await chosen(page, 'Ryt Bank', false);
  await sim(page, 'Post an OTP');
  await expect(page.getByText('Simulated: not stored, its app isn’t chosen or access is off')).toBeVisible();
  await shot(page, 'FLOW-14-step-3-unchosen-otp');
  // step 4: the log is unchanged, still one drop line
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  sheet = await heartbeatLog(page);
  await expect(sheet.getByText(/^Dropped a one-time code/)).toHaveCount(1);
  await shot(page, 'FLOW-14-step-4-log-unchanged');
});
