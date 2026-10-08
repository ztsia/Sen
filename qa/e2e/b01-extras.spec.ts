import { expect, test } from '@playwright/test';
import { closePanel, openPanel, shot } from './helpers';

// QA B01: the criteria the flows don't reach on their own (AC-20, AC-27, AC-29, AC-30, AC-34 to
// AC-36), at 412×915.

test('AC-20 System follows the phone live, and a choice survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
  await shot(page, 'AC-20-step-1-system-follows-live');
  const p = await openPanel(page);
  await p.getByRole('radio', { name: 'Dark', exact: true }).click();
  await closePanel(page);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  await shot(page, 'AC-20-step-2-dark-kept-after-reload');
});

test('AC-27 the app bar back on a pushed screen goes back one', async ({ page }) => {
  await page.goto('/more');
  await page.getByRole('link', { name: 'Payments' }).tap();
  await expect(page).toHaveURL(/\/s\/payments$/);
  await shot(page, 'AC-27-step-1-payments');
  await page.getByRole('banner').getByRole('button').first().tap();
  await expect(page).toHaveURL(/\/more$/);
  await shot(page, 'AC-27-step-2-app-bar-back');
});

test('AC-29, AC-30 rows: 64 px, amounts whole, money colours with words', async ({ page }) => {
  await page.goto('/dev/gallery');
  const rows = page.getByTestId('gallery-rows');
  await rows.scrollIntoViewIfNeeded();
  const got = await rows.evaluate((root) => {
    const css = (n: string) => {
      const d = document.createElement('span');
      d.style.color = `var(${n})`;
      document.body.appendChild(d);
      const c = getComputedStyle(d).color;
      d.remove();
      return c;
    };
    const rowHeights = [...root.querySelectorAll<HTMLElement>('[data-slot="item"]')]
      .filter((e) => e.querySelector('[data-sen]'))
      .map((e) => Math.round(e.getBoundingClientRect().height));
    const amounts = [...root.querySelectorAll<HTMLElement>('[data-sen]')].map((e) => ({
      text: e.querySelector('[aria-hidden="true"]')?.textContent,
      spoken: e.querySelector('.sr-only')?.textContent,
      color: getComputedStyle(e).color,
      cls: e.className,
    }));
    return { rowHeights, amounts, moneyIn: css('--money-in'), moneyOut: css('--money-out') };
  });
  test.info().annotations.push({ type: 'rows', description: JSON.stringify(got).slice(0, 900) });
  expect(got.rowHeights.length).toBeGreaterThan(2);
  for (const h of got.rowHeights) expect(h).toBeGreaterThanOrEqual(64);
  const salary = got.amounts.find((a) => a.text === '+RM4,200.00')!;
  expect(salary, 'money in carries a plus').toBeTruthy();
  expect(salary.color).toBe(got.moneyIn);
  expect(salary.spoken).toBe('plus RM 4,200.00');
  const kopi = got.amounts.find((a) => a.text === 'RM12.90')!;
  expect(kopi.color).toBe(got.moneyOut);
  await expect(rows.getByText('Not synced yet').first()).toBeVisible();
  await shot(page, 'AC-29-step-1-rows');
});

test('AC-34, AC-35 the dialog is destructive; loading is a skeleton; empty is one line and one action', async ({
  page,
}) => {
  await page.goto('/dev/gallery');
  const overlays = page.getByTestId('gallery-overlays');
  await overlays.getByRole('button', { name: 'Delete forever' }).scrollIntoViewIfNeeded();
  await overlays.getByRole('button', { name: 'Delete forever' }).tap();
  const dialog = page.getByRole('alertdialog', { name: 'Delete this payment forever?' });
  await expect(dialog).toBeVisible();
  const btns = await dialog
    .getByRole('button')
    .evaluateAll((bs) => bs.map((b) => ({ text: b.textContent?.trim(), bg: getComputedStyle(b).backgroundColor })));
  const destructive = await page.evaluate(() => {
    const d = document.createElement('span');
    d.style.color = 'var(--destructive)';
    document.body.appendChild(d);
    const c = getComputedStyle(d).color;
    d.remove();
    return c;
  });
  test.info().annotations.push({ type: 'dialog buttons', description: JSON.stringify({ btns, destructive }) });
  expect(btns.some((b) => b.bg === destructive)).toBe(true);
  await shot(page, 'AC-34-step-1-destructive-dialog');
  await dialog.getByRole('button', { name: 'Keep it' }).tap();

  const states = page.getByTestId('gallery-states');
  await states.scrollIntoViewIfNeeded();
  await expect(states.getByRole('status').filter({ hasText: 'Loading' })).toHaveCount(1);
  await expect(states.locator('[data-slot="skeleton"]').first()).toBeVisible();
  await expect(states.getByText('Payments you make appear here.')).toBeVisible();
  await expect(states.getByRole('button', { name: 'Add expense' })).toBeVisible();
  await expect(states.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(states.getByText('Updated 2 min ago')).toBeVisible();
  await shot(page, 'AC-35-step-1-states');
});

test('AC-36 charts: a legend for series, and a tap shows values', async ({ page }) => {
  await page.goto('/dev/gallery');
  const charts = page.getByTestId('gallery-charts');
  await charts.scrollIntoViewIfNeeded();
  await expect(charts.getByText('Am I on track?')).toBeVisible();
  await expect(charts.getByText('RM140.00 more than last cycle by this day.')).toBeVisible();
  await expect(charts.getByRole('button', { name: /Ask Sen about this/ }).first()).toBeVisible();
  await expect(charts.getByText('Other').first()).toBeVisible();
  await shot(page, 'AC-36-step-1-charts');
  const surface = charts.locator('.recharts-wrapper').first();
  await surface.scrollIntoViewIfNeeded();
  const box = (await surface.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width * 0.6, box.y + box.height / 2);
  await page.waitForTimeout(400);
  const tip = surface.locator('.recharts-tooltip-wrapper').first();
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('RM');
  await shot(page, 'AC-36-step-2-tap-tooltip');
});
