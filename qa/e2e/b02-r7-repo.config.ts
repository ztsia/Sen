import { defineConfig } from '@playwright/test';

// QA B02 run 7, phase 3: the repo's own capture journeys (apps/web/e2e/capture.spec.ts), pointed at QA's dev
// server on R7_PORT, so a deliberate defect in the source shows whether the suite notices.
const port = process.env.R7_PORT ?? '4300';
export default defineConfig({
  testDir: '../../apps/web/e2e',
  testMatch: /capture\.spec\.ts/,
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' },
});
