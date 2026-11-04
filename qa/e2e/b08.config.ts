import { defineConfig, devices } from '@playwright/test';

// QA B08 run 1: the flows in qa/B08/flows.md a browser can walk (b08-flows.spec.ts), at Sen's phone
// viewport, 390×844. Two apps: the preview build on the skeleton's fake (apps/web/dist-qa) on :4173, and
// the server stack (apps/web/dist-server) on :4179 against the local API on :8788 and sen_test, which
// `pnpm test:db` must have migrated. Build both first, from apps/web:
//   SEN_ENV=preview pnpm exec vite build --outDir dist-qa
//   SEN_ENV=preview SEN_BACKEND=api SEN_API_PORT=8788 pnpm exec vite build --outDir dist-server
// then from qa/e2e (node_modules linked as playwright.config.ts says):
//   ./node_modules/.bin/playwright test -c b08.config.ts
const phone = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: '.',
  testMatch: /b08-flows\.spec\.ts/,
  timeout: 120_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  globalSetup: './b08-setup.ts',
  use: { ...phone, baseURL: 'http://localhost:4179', timezoneId: 'Asia/Kuala_Lumpur', serviceWorkers: 'block' },
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
