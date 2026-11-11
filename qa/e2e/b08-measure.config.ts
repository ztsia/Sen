import { defineConfig, devices } from '@playwright/test';

// QA B08 run 1: measurements behind the diff report's metrics flags (b08-measure.spec.ts). Serve
// origin/main's preview build on :4175 and this branch's on :4176 first, from each checkout's apps/web:
//   pnpm exec vite preview --outDir dist-qa --port 4175   (main's worktree)   and   --port 4176 (head)
export default defineConfig({
  testDir: '.',
  testMatch: /b08-measure\.spec\.ts/,
  timeout: 120_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
  },
});
