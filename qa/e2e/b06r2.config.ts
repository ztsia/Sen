import { defineConfig } from '@playwright/test';

// QA B06 run 2: the flows in qa/B06/flows.md (Run 2) in Chromium at 390×844, against QA's own database
// `sen_qa` (never sen_dev or sen_test), with the real Worker (relay and scheduler) and the real API.
// Ports of its own, so it never meets the sweep's (4173–4179, 8788) or run 1's (4185, 8791, 8792).
// Started by hand before a run (secrets are made up, QA's only):
//   the Worker:  (apps/worker) npx wrangler dev --ip 127.0.0.1 --port 8793 --test-scheduled
//                --var API_ORIGIN:http://127.0.0.1:8794 --var SCHEDULER_SECRET:<s> --var RELAY_SECRET:<r>
//   the API:     (apps/api) SEN_LOCAL_DATABASE=postgres://127.0.0.1:5432/sen_qa SEN_API_PORT=8794
//                SCHEDULER_SECRET=<s> RELAY_SECRET=<r> RELAY_URL=http://127.0.0.1:8793 npx tsx src/local.ts
//   the web app: (apps/web) SEN_BACKEND=api SEN_API_PORT=8794 npx vite --port 4186 --strictPort --host 127.0.0.1
// with <s> = qa-sched-secret-0123456789abcdef0123456789 and <r> = qa-relay-secret-0123456789abcdef0123456789.
// sen_qa is made as qa/e2e/b05.config.ts says; b06-setup.ts seeds the QA people.
// Then, from qa/e2e: ./node_modules/.bin/playwright test -c b06r2.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: /b06r2-.*\.spec\.ts/,
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  globalSetup: './b06-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:4186',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
});
