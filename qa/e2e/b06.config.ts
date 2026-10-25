import { defineConfig } from '@playwright/test';

// QA B06 run 1: live updates, Settings → Data and its checks, in Chromium at 390×844, against QA's own
// database `sen_qa` (never sen_dev or sen_test). Started by hand before a run, each on its own port:
//   the Worker:  (apps/worker) pnpm exec wrangler dev --ip 127.0.0.1 --port 8792 --test-scheduled
//                --var API_ORIGIN:http://127.0.0.1:8791 --var SCHEDULER_SECRET:<s> --var RELAY_SECRET:<r>
//   the API:     (apps/api) SEN_LOCAL_DATABASE=postgres://127.0.0.1:5432/sen_qa SEN_API_PORT=8791
//                SCHEDULER_SECRET=<s> RELAY_SECRET=<r> RELAY_URL=http://127.0.0.1:8792 pnpm exec tsx src/local.ts
//   the web app: (apps/web) SEN_BACKEND=api SEN_API_PORT=8791 pnpm exec vite --port 4185 --host 127.0.0.1
// `vite dev`, not `vite preview`: preview serves vercel.json's CSP, whose connect-src names only the
// deployed relays, so a local relay can't be reached under it (the CSP is checked on its own).
// sen_qa is made as qa/e2e/b05.config.ts says; b06-setup.ts seeds the QA people.
// Then, from qa/e2e: ./node_modules/.bin/playwright test -c b06.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: /b06-.*\.spec\.ts/,
  timeout: 120_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  globalSetup: './b06-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:4185',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
});
