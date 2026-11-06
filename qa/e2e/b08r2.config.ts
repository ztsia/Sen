import { defineConfig, devices } from '@playwright/test';

// QA B08 run 2: the run-2 flows of qa/B08/flows.md (b08r2-flows.spec.ts), at 390×844, against the local API
// on :8789 and the database QA_DB names (default sen_test; run 2 used its own, sen_probe, migrated as
// packages/db/test/run.sh does), with the server build on :4181. Build it first, from apps/web:
//   SEN_ENV=preview SEN_BACKEND=api SEN_API_PORT=8789 pnpm exec vite build --outDir <dir>
// then from qa/e2e: QA_DB=sen_probe QA_DIST=<dir> ./node_modules/.bin/playwright test -c b08r2.config.ts
const DB = process.env.QA_DB ?? 'sen_test';
const phone = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: '.',
  testMatch: /b08r2-flows\.spec\.ts/,
  timeout: 150_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  globalSetup: './b08r2-setup.ts',
  use: { ...phone, baseURL: 'http://localhost:4181', timezoneId: 'Asia/Kuala_Lumpur', serviceWorkers: 'block' },
  webServer: [
    {
      cwd: '../../apps/api',
      command: 'pnpm exec tsx src/local.ts',
      env: { SEN_LOCAL_DATABASE: `postgres://127.0.0.1:5432/${DB}`, SEN_API_PORT: '8789' },
      url: 'http://127.0.0.1:8789/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      cwd: '../../apps/web',
      command: `pnpm exec vite preview --outDir ${process.env.QA_DIST ?? 'dist-server'} --port 4181 --strictPort`,
      env: { SEN_ENV: 'preview', SEN_BACKEND: 'api', SEN_API_PORT: '8789' },
      url: 'http://localhost:4181',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
