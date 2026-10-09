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

test('outside the shell, production says capture lives in the Android app', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/s/settings/capture');
  await expect(page.getByText("Capture works in Sen's Android app", { exact: false })).toBeVisible();
  await page.goto('/s/settings/account');
  await expect(page.getByRole('button', { name: 'Version Web app' })).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe('the service worker', () => {
  test.use({ serviceWorkers: 'allow' });

  test('caches every file once, so the app opens offline, every look included', async ({ page, context }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await expect(page.getByTestId('not-built')).toBeVisible();
    // installed and in control of the page
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    });
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      const c = await caches.open(keys.find((k) => k.startsWith('sen-'))!);
      return (await c.keys()).map((r) => new URL(r.url).pathname);
    });
    // the app shell, and all six looks' chunks
    expect(cached).toContain('/index.html');
    for (const look of ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'])
      expect(
        cached.some((p) => new RegExp(`/assets/${look}-[\\w-]+\\.js$`).test(p)),
        look,
      ).toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('not-built')).toBeVisible();
    await page.goto('/s/settings/capture');
    await expect(page.getByText("Capture works in Sen's Android app", { exact: false })).toBeVisible();
    await context.setOffline(false);
    expect(errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(e))).toEqual([]);
  });

  test('the worker is served fresh and never caches the API', async ({ request }) => {
    const sw = await request.get('/sw.js');
    expect(sw.headers()['content-type']).toMatch(/javascript/);
    const body = await sw.text();
    expect(body).toContain("'/api/'");
    expect(body).not.toContain('__SEN_FILES__ =');
  });
});
