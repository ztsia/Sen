import { defineConfig } from 'vitest/config';

// One run for every package's unit tests. Playwright's journeys run separately (pnpm e2e).
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'core', include: ['packages/core/src/**/*.test.ts'], environment: 'node' } },
      { test: { name: 'looks', include: ['packages/looks/src/**/*.test.ts'], environment: 'node' } },
      { test: { name: 'repo', include: ['scripts/**/*.test.{ts,mjs}'], environment: 'node' } },
      './apps/web/vitest.config.ts',
    ],
  },
});
