import { defineConfig } from '@playwright/test';

// QA B05 · Feel run 3: new angles (duplicate shared-amount names, scroll kept across a push, a stale
// tab tap, ripples under a scrolling finger, timezone), at 412x915 in Chromium, plus runs 1 and 2's specs.
// Serve head's preview build on :4181 and main's on :4183 (own build folders) first:
//   (cd apps/web && SEN_ENV=preview pnpm exec vite build --outDir dist-qa-feel && \
//     pnpm exec vite preview --outDir dist-qa-feel --port 4181 --strictPort)
//   main: a worktree of main, the same two commands with --outDir dist-qa-main and --port 4183
// then, from qa/e2e: QA_SCREENS=$PWD/../../qa-artifacts/B05-feel/screens ./node_modules/.bin/playwright test -c b05feel3.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: /b05feel3-.*\.spec\.ts/,
  timeout: 120_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4181',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Asia/Kuala_Lumpur',
    serviceWorkers: 'block',
    contextOptions: { reducedMotion: 'no-preference' },
  },
});
