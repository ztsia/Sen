import { defineConfig } from '@playwright/test';

// B03's QA walk (qa-reviewer phase 5), at 412x915. From qa/e2e, after `ln -sfn ../../apps/web/node_modules node_modules`:
//   ./node_modules/.bin/playwright test -c b03.config.ts
// Expects `vite` (the dev server, with the fake backend reachable as a module) on :5180 and a
// preview build (SEN_ENV=preview) on :5181. Uses the preinstalled Chromium; never `playwright install`.
export default defineConfig({
  testDir: '.',
  testMatch: /b03-.*\.spec\.ts/,
  timeout: 120_000,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5180',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
});
