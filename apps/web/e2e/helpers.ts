import { expect, type Page } from '@playwright/test';

export const ALL_LOOKS = ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'] as const;
export type LookId = (typeof ALL_LOOKS)[number];
/**
 * The looks a run covers: all six, or those named in E2E_LOOKS (`minted,copper`). CI runs two on each
 * PR push and all six nightly; the session runs all six before a PR (owner, 12 Oct).
 */
const want = process.env.E2E_LOOKS;
const only = want && want !== 'all' ? want.split(',').map((s) => s.trim()) : undefined;
export const LOOKS: readonly LookId[] = only ? ALL_LOOKS.filter((l) => only.includes(l)) : ALL_LOOKS;
export const MODES = ['light', 'dark'] as const;
export type ModeId = (typeof MODES)[number];
/**
 * Where behaviour runs: the journeys, once each, in this pair. The looks share the screens, so the
 * catalogue's pixels and checks (catalogue.spec.ts) cover them, and E2E_LOOKS limits only the catalogue (D137).
 */
export const BEHAVIOUR = { look: 'minted', mode: 'light' } as const;

/** Opens a page in a look and mode (the dev tools read ?look= and ?mode=), and waits for the look to load. */
export async function open(page: Page, path: string, look: LookId = 'minted', mode: ModeId = 'light') {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${sep}look=${look}&mode=${mode}`);
  await expect(page.locator('html')).toHaveAttribute('data-look', look);
  await expect(page.locator('html')).toHaveAttribute('data-mode', mode);
  // the look's module has loaded when its tab bar or wordmark is drawn; a page with neither (a closed
  // split link says one line) is ready when its text is
  await page.waitForFunction(
    () =>
      document.querySelectorAll('svg').length > 0 || (document.querySelector('main')?.textContent?.length ?? 0) > 10,
  );
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

// moved to checks.ts with the other scripted checks (D137); the specs still import it from here
export { smallTargets } from './checks';

/** Waits until the screen has its data: no skeleton saying Loading is left. */
export async function settled(page: Page) {
  await expect(page.locator('main [role="status"]:has-text("Loading")')).toHaveCount(0, { timeout: 10_000 });
}
