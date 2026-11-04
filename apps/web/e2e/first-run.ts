import { expect, type Page } from '@playwright/test';

// First run's walk (B08), shared by the catalogue (each step's screen), the journey and first-run.spec.ts
// (the walk in every look). On the made-up backend: `?scenario=new`, signed in by the made-up code, the
// shell's steps answered by the dev simulator.

export const FIRST_RUN = ['code', 'apps', 'access', 'running', 'accounts', 'name', 'payday'] as const;
export type FirstRunStep = (typeof FIRST_RUN)[number];

/** The made-up balances typed at step 5, one per suggested app, and their total. */
export const BALANCES = {
  'TNG eWallet': '85.00',
  'Ryt Bank': '3,200.50',
  'Public Bank': '6,400.00',
  'GrabPay Wallet': '40.00',
};
export const TOTAL = 'RM9,725.50';

/** The step count's text, once the step has slid in. */
export async function atStep(page: Page, n: number) {
  await expect(page.getByText(`Step ${n} of 7`)).toBeVisible();
  // each step slides in; the next tap waits for it
  await page.waitForTimeout(300);
}

/** Walks first run from its email to `stop`, which it leaves on screen; without one, to Home. */
export async function walkFirstRun(page: Page, stop?: FirstRunStep) {
  await page.getByLabel('Your email').fill('wei.ming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  if (stop === 'code') return expect(page.getByLabel('6-digit code')).toBeVisible();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await atStep(page, 2);
  await page.getByRole('button', { name: /^Choose these \d$/ }).click();
  if (stop === 'apps') return;
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 3);
  if (stop === 'access') return;
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 4);
  if (stop === 'running') return;
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 5);
  for (const [name, text] of Object.entries(BALANCES)) await page.getByLabel(name, { exact: true }).fill(text);
  if (stop === 'accounts') return;
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 6);
  await page.getByLabel('Your name').fill('tan wei ming');
  if (stop === 'name') return;
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 7);
  if (stop === 'payday') return;
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
}
