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
  // outside the shell the version is only information: no long-press, no hidden tests
  await expect(page.getByText('Web app')).toBeVisible();
  await expect(page.getByRole('button', { name: /Version/ })).toHaveCount(0);
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

  test('the worker is served fresh, and never caches the API, online or off', async ({ page, context }) => {
    const sw = await page.request.get('/sw.js');
    expect(sw.headers()['content-type']).toMatch(/javascript/);
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    });
    // two calls to the API through the worker, then: nothing of it in any cache
    const statuses = await page.evaluate(async () => [
      (await fetch('/api/health')).status,
      (await fetch('/api/x?y=1')).status,
    ]);
    expect(statuses).toHaveLength(2);
    const cached = await page.evaluate(async () => {
      const all: string[] = [];
      for (const k of await caches.keys())
        for (const r of await (await caches.open(k)).keys()) all.push(new URL(r.url).pathname);
      return all;
    });
    expect(cached.filter((p) => p.startsWith('/api/'))).toEqual([]);
    // offline, the API fails as the network does, rather than answering from a cache
    await context.setOffline(true);
    const offline = await page.evaluate(() =>
      fetch('/api/health').then(
        () => 'answered',
        () => 'failed',
      ),
    );
    expect(offline).toBe('failed');
    await context.setOffline(false);
  });
});

// B03 done-when 5: the walking skeleton's screens still say Not built yet in production, and no made-up
// figure reaches it: the fake backend and its scenario aren't even in the build (modules.md rule 6).
const B03 = [
  '/',
  '/review',
  '/insights',
  '/more',
  '/scan',
  '/s/skipped',
  '/s/manual',
  '/s/payments',
  '/s/txn',
  '/s/receipt',
  '/s/budgets',
  '/s/subscriptions',
  '/s/goals',
  '/s/goal',
  '/s/insights/year',
  '/s/crop',
  '/s/reading',
  '/s/confirm',
];

test("B03's screens say Not built yet in production, with nothing made up", async ({ page }) => {
  const errors = watchErrors(page);
  for (const path of B03) {
    await page.goto(path);
    await expect(page.getByTestId('not-built'), path).toBeVisible();
    await expect(page.getByText(/RM\d/)).toHaveCount(0);
    await expect(page.getByText(/SITI AMINAH|NASI KANDAR|Wei Ming/)).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('the production build holds none of the made-up scenario', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const dir = join(import.meta.dirname, '..', 'dist-production', 'assets');
  const js = readdirSync(dir).filter((f) => f.endsWith('.js'));
  for (const f of js) {
    const text = readFileSync(join(dir, f), 'utf8');
    expect(/SYARIKAT CONTOH|SITI AMINAH|Wei Ming's month/.test(text), f).toBe(false);
  }
});
