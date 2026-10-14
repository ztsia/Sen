import { defineConfig } from '@playwright/test';

// B04 · Redesign QA walk (qa-reviewer phase 5). From qa/e2e:
//   ./node_modules/.bin/playwright test -c b04r.config.ts
// Expects `vite` dev (fake backend reachable as a module) on :5291, a preview build (SEN_ENV=preview) on :5292
// and a production build (SEN_ENV=production) on :5293. Uses the preinstalled Chromium; never `playwright install`.
export default defineConfig({
  testDir: '.',
  testMatch: /b04r-.*\.spec\.ts/,
  timeout: 120_000,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
});
