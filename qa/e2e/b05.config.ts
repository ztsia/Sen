import { defineConfig } from '@playwright/test';

// QA B05 run 1: the server journeys in Chromium at 390×844, against QA's own database `sen_qa`
// (never sen_dev or sen_test), through the local API on :8791 and two builds of the web app with the
// `api` backend: a preview build on :4177 (dev panel, the skeleton's fake around the server) and a
// production build on :4178 (no dev tools, no fake). Before a run:
//   scripts/local-db.sh start
//   psql postgres://sen_owner@127.0.0.1:5432/postgres -c 'create database sen_qa'
//   (cd packages/db && npx tsx src/migrate-cli.ts postgres://sen_owner@127.0.0.1:5432/sen_qa)
//   psql postgres://sen_owner@127.0.0.1:5432/sen_qa -c 'grant app_user, sen_auth to current_user'
// then, from qa/e2e (node_modules linked to apps/web's, as playwright.config.ts says):
//   ./node_modules/.bin/playwright test -c b05.config.ts
// b05-setup.ts seeds the QA people. Uses the preinstalled Chromium; never `playwright install`.
const WEB = '../../apps/web';
const API = 8791;

export default defineConfig({
  testDir: '.',
  testMatch: /b05-.*\.spec\.ts/,
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  globalSetup: './b05-setup.ts',
  use: {
    baseURL: 'http://localhost:4177',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
  webServer: [
    {
      cwd: '../../apps/api',
      command: 'pnpm exec tsx src/local.ts',
      env: { SEN_LOCAL_DATABASE: 'postgres://127.0.0.1:5432/sen_qa', SEN_API_PORT: String(API) },
      url: `http://127.0.0.1:${API}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      cwd: WEB,
      command: `SEN_ENV=preview SEN_BACKEND=api SEN_API_PORT=${API} pnpm exec vite build --outDir dist-qa && SEN_BACKEND=api SEN_API_PORT=${API} pnpm exec vite preview --outDir dist-qa --port 4177 --strictPort`,
      url: 'http://localhost:4177',
      reuseExistingServer: false,
      timeout: 240_000,
    },
    {
      cwd: WEB,
      command: `SEN_ENV=production SEN_BACKEND=api SEN_API_PORT=${API} pnpm exec vite build --outDir dist-qa-prod && SEN_BACKEND=api SEN_API_PORT=${API} pnpm exec vite preview --outDir dist-qa-prod --port 4178 --strictPort`,
      url: 'http://localhost:4178',
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
