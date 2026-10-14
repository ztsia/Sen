import fs from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { OUT, shot } from './b04r-helpers';

export const STEPS = new URL('../../qa-artifacts/B04-redesign/text/r2-steps.jsonl', import.meta.url).pathname;

/**
 * One flow step: do the assertions first, then the screenshot named for the flow and step, then log the
 * row for results.json. A failing assertion is logged as a fail, and rethrown so the test is red.
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
    err = String(e).slice(0, 300);
  }
  await page.waitForTimeout(450);
  await shot(page, file);
  fs.appendFileSync(
    STEPS,
    JSON.stringify({ flow, n, action, assertion, status, screenshot: `${file}.png`, err }) + '\n',
  );
  if (status === 'fail') throw new Error(`${flow} step ${n} (${action}): ${err}`);
}

export const exists = (name: string) => fs.existsSync(`${OUT}${name}.png`);
export { expect };
