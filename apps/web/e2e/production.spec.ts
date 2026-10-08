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
  const directives = new Map(
    csp
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .filter((d) => d[0])
      .map(([name, ...sources]) => [name!, sources]),
  );
  // the shell loads only our own site: scripts from it alone, and no other host anywhere (spec §17)
  expect(directives.get('script-src')).toEqual(["'self'"]);
  expect(directives.get('default-src')).toEqual(["'self'"]);
  expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
  expect(directives.get('object-src')).toEqual(["'none'"]);
  const allowed = new Set(["'self'", "'none'", 'data:', 'blob:']);
  for (const [name, sources] of directives)
    for (const src of sources)
      expect(allowed.has(src) || (name === 'style-src' && src === "'unsafe-inline'"), `${name} allows ${src}`).toBe(
        true,
      );
  expect(r.headers()['referrer-policy']).toBe('no-referrer');
});
