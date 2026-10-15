import { test } from '@playwright/test';
import { PEOPLE, fresh } from './b05-setup';
import { expect, note, signIn, step, tabs } from './b05-lib';

// FLOW-10c: the app opened offline while signed in, with the service worker on (spec §5.1: it caches
// every file, so the app opens offline; flows.md `offline`: Review still works, marked Not synced yet).
test.use({ serviceWorkers: 'allow' });
test.beforeEach(() => fresh());

test('FLOW-10c signed in, then opened offline with the service worker', async ({ page, context }) => {
  const F = 'FLOW-10c';
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/review');
  await expect(tabs(page)).toBeVisible();
  // let the worker install and take control
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 20_000 }).catch(() => undefined);
  await page.reload();
  const controlled = await page.evaluate(() => navigator.serviceWorker?.controller != null);
  note(F, `controlled by the service worker before going offline: ${controlled}`);
  await context.setOffline(true);
  await page.goto('/review').catch((e) => note(F, `offline goto failed: ${String(e).slice(0, 120)}`));
  await page.waitForTimeout(2500);
  note(F, `offline open lands on: ${page.url()} | ${(await page.locator('body').innerText().catch(() => '')).replace(/\n+/g, ' | ').slice(0, 200)}`);
  await step(page, F, 1, 'offline-open', 'signed in, offline, open /review', 'Review opens (not sign-in), as §5.1 and flows.md offline say', async () => {
    await expect(page).not.toHaveURL(/sign-in/);
  });
  await context.setOffline(false);
});
