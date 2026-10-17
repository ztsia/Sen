import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// qa-diff.mjs (D137) shoots the catalogue twice: against main's build, served from its worktree on
// :4175, and against this branch's, on :4176. Only the catalogue runs; the specs are this checkout's
// in both, so an entry unknown to main shows up as one main could not open. Never :4173 and :4174
// (`pnpm e2e`'s), :4177 (checks.config.ts's). QA_SERVE says which build to serve, QA_BASE_WEB where
// main's apps/web is, QA_RESULTS where Playwright keeps its traces.
//
// The metrics projects (D139) run metrics.spec.ts and the journeys against the same two builds, with
// QA_METRICS naming where the numbers go (qa-diff.mjs says how many workers: the throttling is per page).
// The service worker is allowed, because a phone has it: each spec warms it up before it measures. The
// motion is left on as a person sees it, and the waits are longer, because the specs run under
// metrics.ts's slow phone.
const phone = {
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce' as const,
};

const serve = (port: number, cwd: string) => ({
  // the build is made beforehand; its own `vite preview` runs from its own apps/web, so it sends its own headers
  command: `pnpm exec vite preview --outDir dist-qa --port ${port} --strictPort`,
  cwd,
  url: `http://localhost:${port}`,
  reuseExistingServer: false,
  timeout: 60_000,
});

export default defineConfig({
  testDir: '.',
  testMatch: /catalogue\.spec/,
  timeout: 60_000,
  fullyParallel: true,
  // nothing else runs beside it, so all four cores
  workers: 4,
  retries: 0,
  reporter: [['list'], ['json']],
  outputDir: process.env.QA_RESULTS ?? join('..', 'test-results-diff'),
  expect: {
    toMatchAriaSnapshot: { pathTemplate: '{testDir}/trees/{arg}{ext}' },
    ...(process.env.QA_METRICS ? { timeout: 20_000 } : {}),
  },
  // QA_FILMSTRIP: each journey is also recorded as video
  use: { ...phone, trace: 'off', serviceWorkers: 'block', video: process.env.QA_FILMSTRIP ? 'on' : 'off' },
  projects: [
    { name: 'base', use: { baseURL: 'http://localhost:4175' } },
    { name: 'head', use: { baseURL: 'http://localhost:4176' } },
    {
      name: 'metrics-base',
      testMatch: /(metrics|journeys)\.spec/,
      use: {
        baseURL: 'http://localhost:4175',
        contextOptions: { reducedMotion: 'no-preference' },
        serviceWorkers: 'allow',
      },
    },
    {
      name: 'metrics-head',
      testMatch: /(metrics|journeys)\.spec/,
      use: {
        baseURL: 'http://localhost:4176',
        contextOptions: { reducedMotion: 'no-preference' },
        serviceWorkers: 'allow',
      },
    },
  ],
  webServer:
    process.env.QA_SERVE === 'base'
      ? serve(4175, process.env.QA_BASE_WEB ?? '.')
      : process.env.QA_SERVE === 'head'
        ? serve(4176, process.cwd())
        : [],
});
