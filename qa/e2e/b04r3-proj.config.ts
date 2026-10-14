import { defineConfig, devices } from '@playwright/test';

// B04 · Redesign QA run 3, phase 3: runs the project's own specs (apps/web/e2e) against a dev server,
// so a deliberate break in the source shows at once. From qa/e2e:
//   ./node_modules/.bin/playwright test -c b04r3-proj.config.ts -g "<test name>"
export default defineConfig({
  testDir: '../../apps/web/e2e',
  timeout: 60_000,
  workers: 2,
  retries: 0,
  reporter: 'line',
  use: {
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    baseURL: process.env.B04R3_BASE ?? 'http://127.0.0.1:5391',
    serviceWorkers: 'block',
  },
});
