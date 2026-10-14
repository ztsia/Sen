import fs from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { OUT, shot } from './b04r-helpers';

export const STEPS = new URL('../../qa-artifacts/B04-redesign/text/r3-steps.jsonl', import.meta.url).pathname;

/**
 * One flow step: assertions first, then the screenshot named for the flow and step, then the row
 * for results.json. A failed assertion is logged as a fail, then rethrown so the test is red.
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
    err = String(e).slice(0, 400);
  }
  await page.waitForTimeout(350);
  await shot(page, file);
  fs.appendFileSync(
    STEPS,
    JSON.stringify({ flow, n, action, assertion, status, screenshot: `${file}.png`, err }) + '\n',
  );
  if (status === 'fail') throw new Error(`${flow} step ${n} (${action}): ${err}`);
}

/** Free-form evidence lines for the report (finding output, counts). */
export const note = (flow: string, text: string) =>
  fs.appendFileSync(
    new URL('../../qa-artifacts/B04-redesign/text/r3-notes.txt', import.meta.url).pathname,
    `${flow}: ${text}\n`,
  );

export const fitOver = (page: Page) =>
  page.evaluate(() => {
    const s = document.scrollingElement!;
    const m = document.querySelector('main')!;
    return Math.max(s.scrollHeight - s.clientHeight, m.scrollHeight - m.clientHeight);
  });

export const font = (page: Page, sel: string) =>
  page
    .locator(sel)
    .first()
    .evaluate((el) => {
      const c = getComputedStyle(el);
      return { px: parseFloat(c.fontSize), weight: Number(c.fontWeight) };
    });

export { expect, OUT };

/** A real touch swipe along y (dx < 0 moves to the next page). CDP's synthesized scroll gesture does nothing here. */
export async function swipe(page: Page, y: number, from: number, dx: number) {
  const cdp = await page.context().newCDPSession(page);
  const t = (type: string, x: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await t('touchStart', from);
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await t('touchMove', from + (dx * i) / steps);
    await page.waitForTimeout(16);
  }
  await t('touchEnd', from + dx);
  await page.waitForTimeout(900);
}
