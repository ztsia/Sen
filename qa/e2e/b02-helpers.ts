import fs from 'node:fs';
import { expect, type Page } from '@playwright/test';

export const OUT = new URL('../../qa-artifacts/B02-shell-listener/screens/', import.meta.url).pathname;
export const PROD = 'http://localhost:4176';
fs.mkdirSync(OUT, { recursive: true });

/** Assert first, then call this: a screenshot is evidence for a person, not the test. */
export const shot = (page: Page, name: string) => page.screenshot({ path: `${OUT}${name}.png` });

export function watch(page: Page, origin: string) {
  const out = {
    external: [] as string[],
    errors: [] as string[],
    requests: [] as { url: string; body: string | null }[],
  };
  page.on('request', (r) => {
    out.requests.push({ url: r.url(), body: r.postData() });
    if (!r.url().startsWith(origin) && !r.url().startsWith('data:') && !r.url().startsWith('blob:'))
      out.external.push(r.url());
  });
  page.on('pageerror', (e) => out.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') out.errors.push(`console: ${m.text()}`);
  });
  void page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      console.error(`CSP: ${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  return out;
}

export async function ready(page: Page) {
  await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
}

/** The dev panel's capture simulator: Grant access, Post a notification, Reset. */
export async function sim(page: Page, button: string, times = 1) {
  await page.getByRole('button', { name: 'Dev panel' }).click();
  const panel = page.getByRole('dialog', { name: 'Dev panel' });
  await expect(panel).toBeVisible();
  for (let i = 0; i < times; i++) await panel.getByRole('button', { name: button }).click();
  await panel.getByRole('button', { name: 'Close' }).click();
  await expect(panel).toBeHidden();
}

/** A real touch hold through CDP. */
export async function touchHold(page: Page, x: number, y: number, ms: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/** Capture's screen, More → Settings → Capture, by in-app navigation (the simulator lives in the page). */
export async function toCapture(page: Page) {
  await page.goto('/more');
  await ready(page);
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Capture' }).click();
  await expect(page.getByRole('heading', { name: 'Capture' })).toBeVisible();
}
