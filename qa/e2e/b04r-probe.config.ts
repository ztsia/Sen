import { defineConfig, devices } from '@playwright/test';

// Runs the PROJECT's own e2e (apps/web/e2e) against QA's dev server on :5291 (HMR, so a deliberate defect
// shows at once), for phase 3's probes. Never touches :4173/:4174. Run from qa/e2e:
//   ./node_modules/.bin/playwright test -c b04r-probe.config.ts <file> -g "<title>"
export default defineConfig({
  testDir: '../../apps/web/e2e',
  timeout: 120_000,
  workers: 2,
  retries: 0,
  reporter: 'line',
  use: {
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
    baseURL: 'http://127.0.0.1:5291',
  },
});
