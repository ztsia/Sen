import { defineConfig } from '@playwright/test';

// B04's QA walk (qa-reviewer phase 5), at 412x915. From qa/e2e, after `ln -sfn ../../apps/web/node_modules node_modules`:
//   ./node_modules/.bin/playwright test -c b04.config.ts
// Expects `vite` (dev server, fake backend reachable as a module) on :5180, a preview build (SEN_ENV=preview) on
// :5181 and a production build (SEN_ENV=production) on :5182. Uses the preinstalled Chromium; never `playwright install`.
export default defineConfig({
  testDir: '.',
  testMatch: /b04-.*\.spec\.ts/,
  timeout: 120_000,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.B04_BASE ?? 'http://127.0.0.1:5181',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
});
