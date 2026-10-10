import fs from 'node:fs';
import { expect, type Page } from '@playwright/test';

export const OUT = new URL('../../qa-artifacts/B03-skeleton-tabs/screens/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

/** Assert first, then call this: a screenshot is evidence for a person, not the test. */
export const shot = (page: Page, name: string) => page.screenshot({ path: `${OUT}${name}.png` });

export function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

export const LOOKS = ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'] as const;

/** Opens a path in a look and mode and waits for the look and the first paint. */
export async function open(page: Page, path: string, look = 'minted', mode = 'light') {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${sep}look=${look}&mode=${mode}`);
  await expect(page.locator('html')).toHaveAttribute('data-look', look);
  await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
  await settled(page);
}

export async function settled(page: Page) {
  await expect(page.locator('main [role="status"]:has-text("Loading")')).toHaveCount(0, { timeout: 10_000 });
}

/** The fake backend's real state, from inside the page (dev server only: the module is the app's own instance). */
export async function db<T>(page: Page, fn: string): Promise<T> {
  return page.evaluate(async (src) => {
    const mod = await import(/* @vite-ignore */ '/src/data/index.ts');
    const b = (await mod.backend()) as unknown as { db(): unknown };
    // eslint-disable-next-line no-new-func
    return new Function('db', `return (${src})(db)`)(b.db());
  }, fn) as Promise<T>;
}

export const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });
export const toast = (page: Page) => page.locator('[data-sonner-toast]').first();
export const text = (page: Page) => page.locator('main').innerText();
