import fs from 'node:fs';
import { expect, type Page } from '@playwright/test';

export const OUT = new URL('../../qa-artifacts/B05_server/screens/', import.meta.url).pathname;
const TXT = new URL('../../qa-artifacts/B05_server/text/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TXT, { recursive: true });
export const STEPS = `${TXT}steps.jsonl`;
const NOTES = `${TXT}notes.txt`;

export const shot = (page: Page, name: string) =>
  page
    .screenshot({ path: `${OUT}${name}.png`, timeout: 15000 })
    .catch((e) => console.log('SHOT FAILED', name, String(e).slice(0, 80)));

/** Before an action: the screen as it is, named for the step it precedes. */
export const before = (page: Page, flow: string, n: number, slug: string) => shot(page, `${flow}-step-${n}-${slug}-before`);

/**
 * One flow step: assertions first, then the screenshot named for the flow and step, then the row for
 * results.json. A failed assertion is logged as a fail and rethrown, so the test is red.
 */
export async function step(
  page: Page,
  flow: string,
  n: number,
  slug: string,
  action: string,
  assertion: string,
  check: () => Promise<void>,
) {
  const file = `${flow}-step-${n}-${slug}`;
  let status = 'pass';
  let err = '';
  try {
    await check();
  } catch (e) {
    status = 'fail';
    err = String(e).slice(0, 500);
  }
  await page.waitForTimeout(250);
  await shot(page, file);
  fs.appendFileSync(STEPS, JSON.stringify({ flow, n, action, assertion, status, screenshot: `${file}.png`, err }) + '\n');
  if (status === 'fail') throw new Error(`${flow} step ${n} (${action}): ${err}`);
}

export const note = (flow: string, text: string) => fs.appendFileSync(NOTES, `${flow}: ${text}\n`);

export function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  return errors;
}

export const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });
export const toast = (page: Page) => page.locator('[data-sonner-toast]').first();

/** Signs in through the screen, from wherever the app sent us. */
export async function signIn(page: Page, email: string, code = '123456') {
  await page.goto('/');
  await expect(page).toHaveURL(/\/s\/sign-in/);
  await page.getByLabel('Your email').fill(email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await expect(page.getByRole('heading', { name: 'Type the code' })).toBeVisible();
  await page.getByLabel('6-digit code').fill(code);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}

export { expect };
