import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { shot, sim } from './b02-helpers';

const axe = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
const small = (page: Page) =>
  page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        'main a[href], main button, main [role="switch"], main [role="checkbox"], [role="dialog"] button',
      ),
    ]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 47.5 || r.height < 47.5);
      })
      .map(
        (el) =>
          `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`,
      ),
  );

for (const [look, mode] of [
  ['minted', 'light'],
  ['copper', 'dark'],
] as const) {
  test(`Captured on this phone and Account: axe and 48 px, ${look} ${mode}`, async ({ page }) => {
    await page.goto(`/more?look=${look}&mode=${mode}`);
    await expect(page.locator('html')).toHaveAttribute('data-look', look);
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Capture' }).click();
    await page.getByRole('button', { name: /Your apps/ }).click();
    await page.getByRole('button', { name: 'Choose these 4' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await sim(page, 'Grant access');
    await sim(page, 'Post a notification', 4);
    await page.getByRole('button', { name: /Captured on this phone/ }).click();
    await expect(page.getByText('4 notifications', { exact: false })).toBeVisible();
    const r1 = { axe: await axe(page), small: await small(page) };
    await shot(page, `A11Y-captured-${look}-${mode}`);
    await page.getByRole('button', { name: 'Share samples' }).click();
    const r2 = { axe: await axe(page), small: await small(page) };
    await shot(page, `A11Y-captured-picking-${look}-${mode}`);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Heartbeat' }).click();
    await expect(page.getByText('Listener connected', { exact: true })).toBeVisible();
    const r3 = { axe: await axe(page), small: await small(page) };
    await shot(page, `A11Y-heartbeat-${look}-${mode}`);
    await page.goto(`/s/settings/account?look=${look}&mode=${mode}`);
    await expect(page.getByRole('button', { name: /Version/ })).toBeVisible();
    const r4 = { axe: await axe(page), small: await small(page) };
    console.log(JSON.stringify({ look, mode, captured: r1, picking: r2, heartbeat: r3, account: r4 }));
    // picking rows: the checkbox is 20 px but the label covers the row (b02-rowtap), so only axe is asserted there
    expect([r1, { ...r2, small: [] }, r3, r4]).toEqual([
      { axe: [], small: [] },
      { axe: [], small: [] },
      { axe: [], small: [] },
      { axe: [], small: [] },
    ]);
  });
}
