import { defineConfig } from '@playwright/test';

// QA B02 run 7: the capture path (spec §6.2, D86, D115, D116, D119), at 412×915. From qa/e2e:
//   R7_PORT=4300 ./node_modules/.bin/playwright test -c b02-r7.config.ts
// Expects `vite` (dev, so the capture simulator and dev panel are present, and the page can import the
// simulator's store to seed events) on R7_PORT. Never `playwright install`.
const port = process.env.R7_PORT ?? '4300';
export default defineConfig({
  testDir: '.',
  testMatch: /b02-r7-.*\.spec\.ts/,
  timeout: 90_000,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
});
