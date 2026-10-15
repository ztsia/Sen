import { defineConfig } from 'vitest/config';

// One run for every package's unit tests. Playwright's journeys run separately (pnpm e2e). The API's
// tests against the local Postgres run only in `pnpm test:db` (SEN_DB_TESTS=1), after the migrations.
const db = {
  test: { name: 'db', include: ['apps/api/test/**/*.test.ts'], environment: 'node' as const, fileParallelism: false },
};

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'core', include: ['packages/core/src/**/*.test.ts'], environment: 'node' } },
      { test: { name: 'looks', include: ['packages/looks/src/**/*.test.ts'], environment: 'node' } },
      { test: { name: 'repo', include: ['scripts/**/*.test.{ts,mjs}'], environment: 'node' } },
      {
        test: {
          name: 'api',
          include: ['apps/api/src/**/*.test.ts', 'packages/db/src/**/*.test.ts'],
          environment: 'node',
        },
      },
      './apps/web/vitest.config.ts',
      ...(process.env.SEN_DB_TESTS ? [db] : []),
    ],
  },
});
