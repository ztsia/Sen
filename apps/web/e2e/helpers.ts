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

/** Every visible interactive element under 48 px on either side, as "tag "name" w×h" (patterns.md §8). */
export const smallTargets = (page: Page) =>
  page.evaluate(() => {
    const sel =
      'a[href], button, input, select, textarea, [role="switch"], [role="radio"], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') return false;
        if (el.closest('.sr-only, [aria-hidden="true"]')) return false;
        // the dev panel's handle: previews only, a strip in the side gutter
        if (el.hasAttribute('data-dev-handle')) return false;
        // a checkbox in a row's <label> is tapped by the whole row (split's items, patterns.md §7): the
        // label's box is the target, as it is for a finger
        const box = el.closest('label')?.getBoundingClientRect() ?? r;
        // a control drawn smaller keeps a 48 px target through `tap`'s invisible extension (D129)
        const tap = getComputedStyle(el, '::after');
        const w = Math.max(box.width, tap.content !== 'none' ? parseFloat(tap.width) || 0 : 0);
        const h = Math.max(box.height, tap.content !== 'none' ? parseFloat(tap.height) || 0 : 0);
        return w < 47.5 || h < 47.5;
      })
      .map(
        (el) =>
          `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`,
      );
  });

/** Waits until the screen has its data: no skeleton saying Loading is left. */
export async function settled(page: Page) {
  await expect(page.locator('main [role="status"]:has-text("Loading")')).toHaveCount(0, { timeout: 10_000 });
}
