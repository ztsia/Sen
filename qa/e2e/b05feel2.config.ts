import { defineConfig } from '@playwright/test';

// QA B05 · Feel run 2: motion, interruptions, fallbacks, haptics, looks, at 412x915 in Chromium.
// Serve a preview build on :4181 and a production build on :4182 first (own build folders):
//   (cd apps/web && SEN_ENV=preview pnpm exec vite build --outDir dist-qa-feel && \
//     pnpm exec vite preview --outDir dist-qa-feel --port 4181 --strictPort)
//   (cd apps/web && SEN_ENV=production pnpm exec vite build --outDir dist-qa-feel-prod && \
//     pnpm exec vite preview --outDir dist-qa-feel-prod --port 4182 --strictPort)
// then, from qa/e2e (node_modules linked to apps/web's, as playwright.config.ts says):
//   QA_SCREENS=$PWD/../../qa-artifacts/B05-feel/screens ./node_modules/.bin/playwright test -c b05feel2.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: /b05feel2-.*\.spec\.ts/,
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
