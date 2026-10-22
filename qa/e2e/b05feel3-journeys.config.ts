import { defineConfig, devices } from '@playwright/test';
// The repo's journeys (core: first-run, pay-new, scan-after), but with motion ON, against head's preview on :4181.
export default defineConfig({
  testDir: '../../apps/web/e2e',
  testMatch: /journeys\.spec\.ts/,
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 },
    baseURL: 'http://localhost:4181',
    serviceWorkers: 'block',
    contextOptions: { reducedMotion: 'no-preference' },
  },
});
