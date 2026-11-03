// QA B07's own probes (api-probes.probe.ts), run against sen_test after `pnpm test:db`:
//   pnpm exec vitest run --config qa/B07/vitest.probe.config.ts
// Not a suite: the file's name keeps it out of `pnpm test`.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@sen\/core\/(.*)$/, replacement: at('../../packages/core/src/$1.ts') },
      { find: /^@sen\/db$/, replacement: at('../../packages/db/src/index.ts') },
      { find: /^pg$/, replacement: at('../../apps/api/node_modules/pg/lib/index.js') },
    ],
  },
  test: {
    root: at('../..'),
    include: ['qa/B07/api-probes.probe.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
