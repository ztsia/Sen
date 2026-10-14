import { defineConfig, devices } from '@playwright/test';

// checks.spec.ts builds its pages with setContent, so it needs no server: `pnpm exec playwright test -c
// e2e/checks.config.ts`. playwright.config.ts leaves it out (testIgnore) so a run there doesn't start it
// twice. Cloud sessions use the preinstalled Chromium; never run `playwright install` (docs/cloud.md §1).
const phone = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: '.',
  testMatch: /checks\.spec/,
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { ...phone, trace: 'retain-on-failure', serviceWorkers: 'block' },
});
