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

// Each run builds and serves its own apps: a server left on :4173 from earlier would otherwise be
// tested in place of the current code (QA B02 run 4, note 6). PW_REUSE=1 reuses one on purpose.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // A tree that is missing or has changed fails CI; the commit must carry the new one (pnpm e2e:trees)
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  expect: { toMatchAriaSnapshot: { pathTemplate: '{testDir}/trees/{arg}{ext}' } },
  // The service worker caches every file; the journeys run without it, so each sees the network as it
  // is. production.spec's offline test turns it on.
  use: { ...phone, trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [
    {
      name: 'preview',
      // checks.spec.ts proves each check on a page built to break it; checks.config.ts runs it
      testIgnore: [/production\.spec/, /checks\.spec/, /server\.spec/, /lived\.spec/, /metrics\.spec/],
      use: { baseURL: 'http://localhost:4173' },
    },
    { name: 'production', testMatch: /production\.spec/, use: { baseURL: 'http://localhost:4174' } },
  ],
  webServer: [
    {
      command:
        'SEN_ENV=preview pnpm exec vite build --outDir dist && pnpm exec vite preview --outDir dist --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !!process.env.PW_REUSE,
      timeout: 180_000,
    },
    {
      command:
        'SEN_ENV=production pnpm exec vite build --outDir dist-production && pnpm exec vite preview --outDir dist-production --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: !!process.env.PW_REUSE,
      timeout: 180_000,
    },
  ],
});
