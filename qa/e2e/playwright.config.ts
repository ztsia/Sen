import { defineConfig } from '@playwright/test';

// The QA reviewer's own journeys (qa-reviewer phase 5), at the phone viewport the QA rules set:
// 412×915. Once per checkout, link the web app's packages so these specs resolve @playwright/test:
//   ln -sfn ../../apps/web/node_modules qa/e2e/node_modules
// then, from qa/e2e:
//   ./node_modules/.bin/playwright test -c playwright.config.ts
// Expects a preview build on :4173 (`vite preview` of apps/web) and a production build
// (SEN_ENV=production) on :4176. Uses the preinstalled Chromium; never `playwright install`.
export const OUT = process.env.QA_SCREENS ?? '../../qa-artifacts/B01-design-system/screens';

export default defineConfig({
  testDir: '.',
  timeout: 90_000,
  workers: 4,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
  },
});
