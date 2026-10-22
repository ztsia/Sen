import { defineConfig } from '@playwright/test';

// QA B05 · Feel run 1: motion, ripple, haptics and reduced motion, at 412x915 in Chromium.
// Serve a preview build on :4181 first (own build folder, so it never meets `pnpm e2e`'s):
//   (cd apps/web && SEN_ENV=preview pnpm exec vite build --outDir dist-qa-feel && \
//     pnpm exec vite preview --outDir dist-qa-feel --port 4181 --strictPort)
// then, from qa/e2e (node_modules linked to apps/web's, as playwright.config.ts says):
//   QA_SCREENS=$PWD/../../qa-artifacts/B05_feel/screens ./node_modules/.bin/playwright test -c b05feel.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: /b05feel-.*\.spec\.ts/,
  timeout: 90_000,
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
