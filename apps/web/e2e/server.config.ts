import { defineConfig, devices } from '@playwright/test';

// The server journey (B05): the built web app on :4175, proxying /api to the local API on :8788, which
// uses the migrated sen_test database (`pnpm test:db` recreates and migrates it). Not part of `pnpm e2e`.
const phone = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: '.',
  testMatch: /server\.spec\.ts/,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './server.setup.ts',
  use: { ...phone, baseURL: 'http://localhost:4175', trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [{ name: 'server' }],
  webServer: [
    {
      cwd: '..',
      command: 'pnpm --dir ../api exec tsx src/local.ts',
      env: { SEN_LOCAL_DATABASE: 'postgres://127.0.0.1:5432/sen_test', SEN_API_PORT: '8788' },
      url: 'http://127.0.0.1:8788/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      cwd: '..',
      command:
        'SEN_ENV=preview SEN_BACKEND=api SEN_API_PORT=8788 pnpm exec vite build --outDir dist-server && SEN_BACKEND=api SEN_API_PORT=8788 pnpm exec vite preview --outDir dist-server --port 4175 --strictPort',
      url: 'http://localhost:4175',
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
