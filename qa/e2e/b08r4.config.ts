import { defineConfig, devices } from '@playwright/test';

// QA B08 run 4: the run-4 flows of qa/B08/flows.md (b08r4-flows.spec.ts), at 390×844, against servers
// already running: the API on :8791 on QA's own database `sen_qa4` (migrated as packages/db/test/run.sh
// does), and the web app's dev server on :5191 with SEN_BACKEND=api SEN_API_PORT=8791:
//   cd apps/api && SEN_LOCAL_DATABASE=postgres://127.0.0.1:5432/sen_qa4 SEN_API_PORT=8791 npx tsx src/local.ts
//   cd apps/web && SEN_BACKEND=api SEN_API_PORT=8791 npx vite --port 5191 --strictPort --host 127.0.0.1
// and, for the core journeys on the made-up backend, `npx vite --port 5192 --strictPort --host 127.0.0.1`;
// then from qa/e2e: ./node_modules/.bin/playwright test -c b08r4.config.ts
const phone = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: '.',
  testMatch: /b08r4-flows\.spec\.ts/,
  timeout: 120_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: { ...phone, baseURL: 'http://127.0.0.1:5191', timezoneId: 'Asia/Kuala_Lumpur', serviceWorkers: 'block' },
});
