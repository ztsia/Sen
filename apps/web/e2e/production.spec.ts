import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

// B01 done-when 8 and the screen registry: production shows "Not built yet" on every skeleton screen,
// with no data, no dev panel and no gallery, in the one pinned look, under the content security policy.

test('production shows Not built yet, the pinned look, and no dev tools', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?look=copper&mode=dark');
  await expect(page.getByTestId('not-built')).toHaveText('Not built yet');
  // the dev tools' ?look= is ignored: production shows the first look in the pool
  await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
  await expect(page.getByRole('button', { name: 'Dev panel' })).toHaveCount(0);
  await expect(page.getByText(/is a skeleton/)).toHaveCount(0);
  // nothing made up: no badge count
  await expect(page.getByTestId('review-badge')).toHaveCount(0);
  await page.goto('/dev/gallery');
  await expect(page).not.toHaveURL(/gallery/);
  await page.goto('/s/payments');
  await expect(page.getByTestId('not-built')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the site sends a strict content security policy and no referrer', async ({ request }) => {
  const r = await request.get('/');
  const csp = r.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toMatch(/script-src[^;]*unsafe/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(r.headers()['referrer-policy']).toBe('no-referrer');
});
