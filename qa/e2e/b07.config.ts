import { defineConfig, devices } from '@playwright/test';

// QA B07 run 1: the flows in qa/B07/flows.md that a browser can walk (b07-flows.spec.ts), at Sen's
// phone viewport, 390×844. Two apps: the preview build with the skeleton's fake (apps/web/dist-qa, as
// `node scripts/qa-diff.mjs` builds it) on :4173, and the server stack (apps/web/dist-server, as
// `pnpm --filter @sen/web e2e:server` builds it) on :4179 against the local API on :8788 and sen_test,
// which `pnpm test:db` must have migrated. Run from qa/e2e, after linking node_modules (playwright.config.ts):
//   PLAYWRIGHT_BROWSERS_PATH=<the shim> ./node_modules/.bin/playwright test -c b07.config.ts
const phone = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: '.',
  testMatch: /b07-flows\.spec\.ts/,
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  globalSetup: '../../apps/web/e2e/server.setup.ts',
  use: { ...phone, baseURL: 'http://localhost:4173', timezoneId: 'Asia/Kuala_Lumpur', serviceWorkers: 'block' },
  webServer: [
    {
      cwd: '../../apps/api',
      command: 'pnpm exec tsx src/local.ts',
      env: { SEN_LOCAL_DATABASE: 'postgres://127.0.0.1:5432/sen_test', SEN_API_PORT: '8788' },
      url: 'http://127.0.0.1:8788/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      cwd: '../../apps/web',
      command: 'pnpm exec vite preview --outDir dist-server --port 4179 --strictPort',
      env: { SEN_ENV: 'preview', SEN_BACKEND: 'api', SEN_API_PORT: '8788' },
      url: 'http://localhost:4179',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      cwd: '../../apps/web',
      command: 'pnpm exec vite preview --outDir dist-qa --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
