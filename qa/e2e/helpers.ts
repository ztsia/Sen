import fs from 'node:fs';
import { expect, type Page } from '@playwright/test';

export const OUT = new URL('../../qa-artifacts/B01-design-system/screens/', import.meta.url).pathname;
export const PROD = 'http://localhost:4176';
export const LOOKS = ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'] as const;
export const MODES = ['light', 'dark'] as const;
export const NAMES = {
  minted: 'Minted',
  instrument: 'Instrument',
  firefly: 'Firefly',
  line: 'Line',
  mercury: 'Mercury',
  copper: 'Copper',
} as const;
export type LookId = (typeof LOOKS)[number];

fs.mkdirSync(OUT, { recursive: true });

/** Assert first, then call this: a screenshot is evidence for a person, not the test. */
export async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${OUT}${name}.png` });
}

/** Every request that leaves the origin, every page error and every CSP violation. */
export function watch(page: Page, origin = 'http://localhost:4173') {
  const out = { external: [] as string[], errors: [] as string[], requests: [] as string[] };
  page.on('request', (r) => {
    out.requests.push(r.url());
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

/** The tokens a look's theme.css sets, light (`:root`) and dark (`.dark`). */
export function themeTokens(look: LookId) {
  const css = fs.readFileSync(
    new URL(`../../docs/ui/directions/assets/${look}/theme.css`, import.meta.url).pathname,
    'utf8',
  );
  const blocks = [...css.matchAll(/(:root|\.dark)\s*\{([^}]*)\}/g)];
  const read = (body: string) =>
    Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]!.trim()]));
  const base: Record<string, string> = {};
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};
  blocks.forEach((b, i) => Object.assign(b[1] === '.dark' ? dark : i === 0 ? base : light, read(b[2]!)));
  return { base, light: { ...base, ...light }, dark: { ...base, ...light, ...dark } };
}

export async function cssVar(page: Page, name: string) {
  return page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
}

export const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });

export async function openPanel(page: Page) {
  await page.getByRole('button', { name: 'Dev panel' }).click();
  const panel = page.getByRole('dialog', { name: 'Dev panel' });
  await expect(panel).toBeVisible();
  return panel;
}

export async function closePanel(page: Page) {
  await page.getByRole('dialog', { name: 'Dev panel' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog', { name: 'Dev panel' })).toBeHidden();
}

/** A real touch hold through CDP, the way a finger presses: touchStart, wait, touchEnd. */
export async function touchHold(page: Page, x: number, y: number, ms: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/** A canvas's pixels as a data URL, to compare frames. */
export const frameOf = (page: Page, testId: string) =>
  page
    .getByTestId(testId)
    .locator('canvas')
    .first()
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
