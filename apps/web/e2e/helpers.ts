import { expect, type Page } from '@playwright/test';

export const LOOKS = ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'] as const;
export const MODES = ['light', 'dark'] as const;
export type LookId = (typeof LOOKS)[number];
export type ModeId = (typeof MODES)[number];

/** Opens a page in a look and mode (the dev tools read ?look= and ?mode=), and waits for the look to load. */
export async function open(page: Page, path: string, look: LookId = 'minted', mode: ModeId = 'light') {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${sep}look=${look}&mode=${mode}`);
  await expect(page.locator('html')).toHaveAttribute('data-look', look);
  await expect(page.locator('html')).toHaveAttribute('data-mode', mode);
  // the look's module has loaded when its tab bar or wordmark is drawn
  await page.waitForFunction(() => document.querySelectorAll('svg').length > 0);
}

/** Collects content security policy violations and page errors, to assert there are none. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  void page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      console.error(`CSP: ${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  return errors;
}
