import fs from 'node:fs';
import { expect, type Page } from '@playwright/test';

export const OUT = new URL('../../qa-artifacts/B04-redesign/screens/', import.meta.url).pathname;
export const TXT = new URL('../../qa-artifacts/B04-redesign/text/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TXT, { recursive: true });

/** Assert first, then call this: a screenshot is evidence for a person, not the test. */
export const shot = (page: Page, name: string) =>
  page
    .screenshot({ path: `${OUT}${name}.png`, timeout: 15000 })
    .catch((e) => console.log('SHOT FAILED', name, String(e).slice(0, 80)));

export function watch(page: Page) {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('request', (r) => {
    const u = r.url();
    if (!/^(http:\/\/(127\.0\.0\.1|localhost):\d+|data:|blob:)/.test(u)) external.push(u);
  });
  return { errors, external };
}

export const LOOKS = ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'] as const;

export async function open(page: Page, path: string, look = 'minted', mode = 'light') {
  // the resource-timing buffer holds 250 entries by default; db() finds the app's module URL in it
  await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${sep}look=${look}&mode=${mode}`);
  await expect(page.locator('html')).toHaveAttribute('data-look', look);
  await page.waitForFunction(
    () =>
      document.querySelectorAll('svg').length > 0 || (document.querySelector('main')?.textContent?.length ?? 0) > 10,
  );
  await settled(page);
}

export async function settled(page: Page) {
  await expect(page.locator('main [role="status"]:has-text("Loading")')).toHaveCount(0, { timeout: 10_000 });
}

export const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });
export const toast = (page: Page) => page.locator('[data-sonner-toast]').first();
export const dialog = (page: Page, name: string | RegExp) => page.getByRole('dialog', { name });
export const text = (page: Page) => page.locator('body').innerText();
export const dump = async (page: Page, name: string) => fs.writeFileSync(`${TXT}${name}.txt`, await text(page));

export async function db<T>(page: Page, fn: string): Promise<T> {
  return page.evaluate(async (src) => {
    // the app may hold a HMR-stamped module (`?t=`), so import the very URL it loaded: a second instance is a second db
    const loaded = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((n) => /\/src\/data\/index\.ts/.test(n));
    // eslint-disable-next-line no-unsanitized/method -- QA probe inside page.evaluate: imports the app's own already-loaded module by its dev-server URL
    const mod = await import(
      /* @vite-ignore */ new URL(loaded.length ? loaded[loaded.length - 1]! : '/src/data/index.ts', location.href).href
    );
    const b = (await mod.backend()) as unknown as { db(): unknown };
    return new Function('db', `return (${src})(db)`)(b.db());
  }, fn) as Promise<T>;
}
