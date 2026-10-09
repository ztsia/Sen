import { defineConfig } from '@playwright/test';

// QA B02 "compare-sonnet": the capture path in the browser, at 412x915. Run from this folder:
//   ./node_modules/.bin/playwright test -c playwright.config.ts
// Expects a SEN_ENV=preview build on :4310 and a SEN_ENV=production build on :4311, both `vite preview`.
// Uses the preinstalled Chromium; never `playwright install`.
export default defineConfig({
  testDir: '.',
  testMatch: /cs-.*\.spec\.ts/,
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4310',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
});
