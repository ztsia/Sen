import { defineConfig } from '@playwright/test';

// QA B02 run 5: the capture path (D116), at 412×915. From qa/e2e (node_modules linked to apps/web's):
//   ./node_modules/.bin/playwright test -c b02-r5.config.ts
// Expects QA's own preview build (SEN_ENV=preview, the capture simulator) served by `vite preview` on
// R5_PORT (default 4183), so it never tests another session's server. Never `playwright install`.
// R5_SPECS=app runs the branch's own capture.spec.ts against the same server (phase 3's probe).
const port = process.env.R5_PORT ?? '4183';
const app = process.env.R5_SPECS === 'app';
export default defineConfig({
  testDir: app ? '../../apps/web/e2e' : '.',
  testMatch: app ? /capture\.spec\.ts/ : /b02-r5-.*\.spec\.ts/,
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
