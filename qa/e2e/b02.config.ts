import { defineConfig } from '@playwright/test';

// B02's journeys (qa-reviewer phase 5), at 412×915. From qa/e2e, after `ln -sfn ../../apps/web/node_modules node_modules`:
//   ./node_modules/.bin/playwright test -c b02.config.ts
// Expects a preview build (SEN_ENV=preview, the capture simulator) on :4173 and a production build on :4176,
// both `vite preview` of apps/web. Uses the preinstalled Chromium; never `playwright install`.
export default defineConfig({
  testDir: '.',
  testMatch: /b02-.*\.spec\.ts/,
  timeout: 90_000,
  workers: 3,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
});
