import { defineConfig, devices } from '@playwright/test';

// Journeys run against built apps served by `vite preview`, so they see the real content security
// policy (vercel.json's headers). Two builds: a preview, with the dev panel and gallery, and a
// production build, which must show neither. Cloud sessions use the preinstalled Chromium
// (PLAYWRIGHT_BROWSERS_PATH); never run `playwright install` there (docs/cloud.md §1).
const phone = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { ...phone, trace: 'retain-on-failure' },
  projects: [
    { name: 'preview', testIgnore: /production\.spec/, use: { baseURL: 'http://localhost:4173' } },
    { name: 'production', testMatch: /production\.spec/, use: { baseURL: 'http://localhost:4174' } },
  ],
  webServer: [
    {
      command: 'pnpm exec vite build --outDir dist && pnpm exec vite preview --outDir dist --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command:
        'SEN_ENV=production pnpm exec vite build --outDir dist-production && pnpm exec vite preview --outDir dist-production --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
