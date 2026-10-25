import { defineConfig } from '@playwright/test';

// QA B06 run 3: the flows in qa/B06/flows.md (Run 3) in Chromium at 390×844, against QA's own database
// `sen_qa` (never sen_dev or sen_test), with the real Worker (relay and scheduler) and the real API.
// Ports of its own (Worker 8795, API 8796, web 4187), so it never meets the sweep's or runs 1–2's.
// Started by hand before a run (secrets are made up, QA's only):
//   the Worker:  (apps/worker) npx wrangler dev --ip 127.0.0.1 --port 8795 --test-scheduled
//                --persist-to <scratch> --var API_ORIGIN:http://127.0.0.1:8796
//                --var SCHEDULER_SECRET:<s> --var RELAY_SECRET:<r>
//   the API:     (apps/api) SEN_LOCAL_DATABASE=postgres://127.0.0.1:5432/sen_qa SEN_API_PORT=8796
//                SCHEDULER_SECRET=<s> RELAY_SECRET=<r> RELAY_URL=http://127.0.0.1:8795 npx tsx src/local.ts
//   the web app: (apps/web) SEN_BACKEND=api SEN_API_PORT=8796 npx vite --port 4187 --strictPort --host 127.0.0.1
// with <s> = qa-sched-secret-0123456789abcdef0123456789 and <r> = qa-relay-secret-0123456789abcdef0123456789.
// sen_qa is made as qa/e2e/b05.config.ts says; b06-setup.ts seeds the QA people.
// Then, from qa/e2e: ./node_modules/.bin/playwright test -c b06r3.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: /b06r3-.*\.spec\.ts/,
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  globalSetup: './b06-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:4187',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
});
