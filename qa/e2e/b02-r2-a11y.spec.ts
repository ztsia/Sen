import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ready, shot, sim } from './b02-helpers';

// QA run 2, AC-40: Capture's screens and Account, axe (WCAG 2.1 AA) and 48 px targets (patterns.md §8),
// in Minted light and Copper dark, at 412×915.
const axe = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
// controls under 48 px that aren't full-width rows (rows are their own target, patterns.md §8)
const small = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('main button, main a[href], main [role="switch"], [role="dialog"] button')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        const row = r.width >= window.innerWidth - 2;
        const insideRow = !!el.closest('[data-slot="item"]');
        return !row && !insideRow && (r.width < 47.5 || r.height < 47.5);
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`;
      }),
  );

for (const [look, mode] of [
  ['minted', 'light'],
  ['copper', 'dark'],
] as const) {
  test(`AC-40 capture screens, ${look} ${mode}`, async ({ page }) => {
    await page.goto(`/more?look=${look}&mode=${mode}`);
    await ready(page);
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Capture' }).click();
    await expect(page.getByRole('heading', { name: 'Capture' })).toBeVisible();
    const out: Record<string, { axe: string[]; small: string[] }> = {};
    const check = async (name: string) => {
      await page.waitForTimeout(400);
      out[name] = { axe: await axe(page), small: await small(page) };
    };
    await check('capture');
    for (const [row, heading] of [
      [/Your apps/, 'Your apps'],
      [/Notification access/, 'Notification access'],
      [/Keep Sen running/, 'Keep Sen running'],
    ] as const) {
      await page.getByRole('button', { name: row }).click();
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await check(heading);
      if (heading === 'Your apps') {
        await page.getByRole('button', { name: 'Choose these 4' }).click();
        await expect(page.getByRole('switch', { name: 'Ryt Bank' })).toBeChecked();
      }
      await page.getByRole('button', { name: 'Back' }).click();
    }
    await sim(page, 'Grant access');
    await sim(page, 'Post a notification', 3);
    await page.getByRole('button', { name: /Captured on this phone/ }).click();
    await expect(page.getByText('3 notifications', { exact: false })).toBeVisible();
    await check('captured');
    await page.getByRole('button', { name: 'Share samples' }).click();
    await expect(page.getByRole('checkbox')).toHaveCount(3);
    await check('captured, picking');
    await shot(page, `AC-40-${look}-${mode}-picking`);
    test.info().annotations.push({ type: 'a11y', description: JSON.stringify(out) });
    for (const [k, v] of Object.entries(out)) {
      expect(v.axe, `${k}: axe`).toEqual([]);
      expect(v.small, `${k}: under 48 px`).toEqual([]);
    }
  });
}
