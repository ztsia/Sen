import { defineConfig } from '@playwright/test';

// Phase 3 probe: the branch's own capture.spec.ts against a server of ours (BASE, default :4312), so a
// source probe built into its own dist is what's tested. 390x844 as the branch's own config.
export default defineConfig({
  testDir: '../../../../apps/web/e2e',
  testMatch: /capture\.spec\.ts/,
  timeout: 60_000,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE ?? 'http://localhost:4312',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  },
});
