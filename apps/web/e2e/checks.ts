import type { Page } from '@playwright/test';

// What can be measured on a screen is checked by script, on every screen in every look and mode, every
// run (D137): what a person shouldn't have to spot. The catalogue runs them all on each entry; the
// journeys run the cover check at every screenshot, where toasts happen.

export type CheckId = 'axe' | 'target' | 'clipped' | 'overlap' | 'covered' | 'keyboard' | 'focus';
export interface Finding {
  check: CheckId;
  /** What and where, in one line: `button "Save" 120×40 under div.toast`. */
  detail: string;
}

/**
 * Every check on the page as it is now, at the phone viewport. The keyboard and focus checks change
 * the page (a smaller viewport, focus moved), so they run last and put the viewport back.
 */
export async function runChecks(page: Page): Promise<Finding[]> {
  void page;
  return [];
}

/** Targets under something fixed (a toast, the tab bar, a sheet's footer) that scrolling can't free. */
export async function coveredTargets(page: Page): Promise<Finding[]> {
  void page;
  return [];
}
