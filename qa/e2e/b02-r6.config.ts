import { defineConfig } from '@playwright/test';

// QA B02 run 6: the capture path (D116, D119), at 412×915. From qa/e2e (node_modules linked to apps/web's):
//   R6_PORT=4196 ./node_modules/.bin/playwright test -c b02-r6.config.ts
// Expects QA's own preview build (SEN_ENV=preview, the capture simulator) served by `vite preview` on
// R6_PORT (default 4196), so it never tests another session's server. Never `playwright install`.
const port = process.env.R6_PORT ?? '4196';
export default defineConfig({
  testDir: '.',
  testMatch: /b02-r6-.*\.spec\.ts/,
  timeout: 90_000,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
});
