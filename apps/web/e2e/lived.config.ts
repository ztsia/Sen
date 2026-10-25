import { defineConfig, devices } from '@playwright/test';

// The lived-in journeys (D139, B05's QA tooling): Sen across time and real conditions, which the other
// journeys never span. Each of those starts a fresh browser on one build, with the service worker blocked,
// so none could meet a deploy, a resume or a slow network. Here the service worker is on, the phone is the
// same Pixel 7 at 390×844 as playwright.config.ts has it, motion is reduced, and the ports are its own:
// :4178 serves the preview build in dist-lived-a, as `vite preview` does under the real content security
// policy; :4177 is the deploy journey's, started by the spec, which serves that build and then another.
// Run it with `pnpm --filter @sen/web e2e:lived`, never alongside another run on these ports.
const phone = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: '.',
  testMatch: /lived\.spec\.ts/,
  timeout: 90_000,
  // the deploy journeys share one server that changes what it serves, so the journeys run one by one
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // inside playwright-report/, which CI uploads; the main run's report sits beside it
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: '../playwright-report/lived' }]]
    : 'list',
  outputDir: '../test-results/lived',
  use: {
    ...phone,
    baseURL: 'http://localhost:4178',
    contextOptions: { reducedMotion: 'reduce' },
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'lived' }],
  webServer: {
    cwd: '..',
    command:
      'pnpm exec vite build --outDir dist-lived-a && pnpm exec vite preview --outDir dist-lived-a --port 4178 --strictPort',
    // in env, not a `VAR=` prefix, so the command runs in Windows' shell too (B06)
    env: { SEN_ENV: 'preview' },
    url: 'http://localhost:4178',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
