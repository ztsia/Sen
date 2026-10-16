/**
 * Breakage checks (D139): dangerous edits a later change could make by accident, each with the suite
 * that must turn red when it's made. `node scripts/mutants.mjs` applies each in a temporary git worktree
 * (never this checkout) and reports any that survive: a survivor is a finding, a guard no test holds.
 *
 * Each slice adds its own, for what it guards: an edit is `find` (which must occur exactly once in
 * `file`, or the check is stale and fails) replaced by `replace`.
 */

export interface Mutant {
  id: string;
  /** What breaks, as a person or the data would suffer it. */
  breaks: string;
  file: string;
  find: string;
  replace: string;
  suite: SuiteId;
}

/** The suites a mutant can be judged by, as commands run in the worktree's root. */
export const SUITES = {
  // pgTAP over every migration, then the API's tests and the route sweep, on a fresh sen_test
  db: ['pnpm', 'test:db'],
  // the web app's data layer: sign-in, the kept reads, the fake
  web: ['pnpm', 'exec', 'vitest', 'run', '--project', 'web', 'apps/web/src/data'],
  // the lived-in deploy journeys (apps/web/e2e/lived.spec.ts): two builds, a service worker
  deploy: ['pnpm', '--filter', '@sen/web', 'exec', 'playwright', 'test', '-c', 'e2e/lived.config.ts', '-g', 'deploy'],
} as const;
export type SuiteId = keyof typeof SUITES;

const ME = `(select nullif(current_setting('app.user_id', true), '')::uuid)`;

export const MUTANTS: Mutant[] = [
  {
    id: 'for-update-you',
    breaks: 'two identical writes of You sent at once log two changes (QA B05 run 2, 22)',
    file: 'apps/api/src/routes.ts',
    find: `.where(eq(t.userId, person)).for('update');`,
    replace: `.where(eq(t.userId, person));`,
    suite: 'db',
  },
  {
    id: 'for-update-resource',
    breaks: 'two identical upserts of one row sent at once log two changes',
    file: 'apps/api/src/resource.ts',
    find: `.where(eq(t.id, id)).for('update');`,
    replace: `.where(eq(t.id, id));`,
    suite: 'db',
  },
  {
    id: 'with-check-settings',
    breaks: 'a person can move their settings row to someone else (RLS, D52)',
    file: 'packages/db/migrations/0001_b05_tables.sql',
    find: `USING ("user_settings"."user_id" = ${ME}) WITH CHECK ("user_settings"."user_id" = ${ME})`,
    replace: `USING ("user_settings"."user_id" = ${ME}) WITH CHECK (true)`,
    suite: 'db',
  },
  {
    id: 'user-id-session-wide',
    breaks: 'a pooled connection carries one person’s id into the next request (spec §5)',
    file: 'apps/api/src/db.ts',
    find: `set_config('app.user_id', $1, true)`,
    replace: `set_config('app.user_id', $1, false)`,
    suite: 'db',
  },
  {
    id: 'fixed-code-in-production',
    breaks: 'production signs anyone in with the previews’ code 123456 (QA B05 run 1, 1)',
    file: 'apps/api/src/auth.ts',
    find: `const fixedCode = opts.target !== 'production';`,
    replace: `const fixedCode = true;`,
    suite: 'db',
  },
  {
    id: 'body-any-depth',
    breaks: 'a deeply nested body is walked, and can take the function down (QA B05 run 4, 37)',
    file: 'apps/api/src/errors.ts',
    find: `if (depth >= MAX_DEPTH)`,
    replace: `if (depth < 0)`,
    suite: 'db',
  },
  {
    id: 'body-keeps-nul',
    breaks: 'a NUL reaches Postgres, which answers with a 500 (QA B05 run 2, 20)',
    file: 'apps/api/src/errors.ts',
    find: `if (v.includes('\\0'))`,
    replace: `if (v.includes('\\0') && false)`,
    suite: 'db',
  },
  {
    id: 'body-any-size',
    breaks: 'a body of any size is read whole',
    file: 'apps/api/src/app.ts',
    find: `maxSize: MAX_BODY,`,
    replace: `maxSize: Number.MAX_SAFE_INTEGER,`,
    suite: 'db',
  },
  {
    id: 'any-origin',
    breaks: 'another site’s page can write to Sen as the signed-in person (QA B05 run 2, 26)',
    file: 'apps/api/src/errors.ts',
    find: `  if (origin === undefined) return true;`,
    replace: `  if (origin !== '') return true;`,
    suite: 'db',
  },
  {
    id: 'offline-looks-signed-out',
    breaks: 'a signed-in person offline is sent to the sign-in screen (QA B05 run 1, 3)',
    file: 'apps/web/src/data/auth.ts',
    find: `return 'unknown' as const;`,
    replace: `return null;`,
    suite: 'web',
  },
  {
    id: 'kept-after-sign-out',
    breaks: 'the next person on the device sees the last one’s settings offline (QA B05 run 3, 30)',
    file: 'apps/web/src/data/api/backend.ts',
    find: `  writeStored(KEPT, null);\n}`,
    replace: `}`,
    suite: 'web',
  },
  {
    id: 'update-never-switches',
    breaks: 'a deploy never reaches an open app until every page is closed (E3, D138)',
    file: 'apps/web/sw/sw.template.js',
    find: `if (event.data === 'sen:update') self.skipWaiting();`,
    replace: `if (event.data === 'sen:update') void 0;`,
    suite: 'deploy',
  },
  {
    id: 'update-downloads-everything',
    breaks: 'every deploy downloads all of Sen again over mobile data (E3, D138)',
    file: 'apps/web/sw/sw.template.js',
    find: `const kept = f.startsWith('/assets/') ? await caches.match(f) : undefined;`,
    replace: `const kept = undefined;`,
    suite: 'deploy',
  },
];
