#!/usr/bin/env node
/**
 * Breakage checks (D139): makes each dangerous edit in qa/mutants.ts and runs the suite that must
 * catch it. A mutant the suite doesn't catch survives, and a survivor is a finding: a guard no test
 * holds. Every edit is made in a temporary git worktree of HEAD, never in this checkout (B05's
 * `git checkout` lost work), and the worktree is kept for the next run.
 *
 *   node scripts/mutants.mjs [--only <id,id>] [--suite db|web|deploy] [--out <dir>]
 *
 * Defaults: every mutant, out qa-artifacts/<branch, / as _>/mutants. Output: index.md and index.json
 * (each mutant killed, survived or stale), and logs/<id>.log. Each suite first runs unmutated and must
 * pass, or nothing it judges can be trusted. Exits 1 if any mutant survived or is stale.
 *
 * Runs HEAD as committed: commit first. The db suite resets the local sen_test, so never run this
 * while another `pnpm test:db` runs; the deploy suite uses lived.config.ts' ports.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// eslint-disable-next-line no-unsanitized/method -- a dev script importing a file from this repo (root-relative join), never external input
const { MUTANTS, SUITES } = await import(pathToFileURL(join(root, 'qa/mutants.ts')).href);

const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
// Windows runs pnpm (a .cmd) only through its shell, which needs spaced arguments quoted, as
// security.mjs does (QA B06 run 1, finding 5)
const WIN = process.platform === 'win32';
const winArgs = (args) => (WIN ? args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)) : args);

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const unknown = argv.filter((a) => a.startsWith('--') && !['--only', '--suite', '--out', '--help'].includes(a));
if (unknown.length || argv.includes('--help')) {
  console.error('usage: node scripts/mutants.mjs [--only <id,id>] [--suite db|web|deploy] [--out <dir>]');
  process.exit(argv.includes('--help') ? 0 : 2);
}
const only = arg('--only')?.split(',');
const suiteArg = arg('--suite');
const chosen = MUTANTS.filter((m) => (!only || only.includes(m.id)) && (!suiteArg || m.suite === suiteArg));
if (!chosen.length) throw new Error('no mutant matches');
for (const id of only ?? []) if (!MUTANTS.some((m) => m.id === id)) throw new Error(`unknown mutant "${id}"`);

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const out = resolve(arg('--out') ?? join(root, 'qa-artifacts', branch.replace(/\//g, '_'), 'mutants'));
const head = git(['rev-parse', 'HEAD']);
if (git(['status', '--porcelain', '--', ':!qa-artifacts']) !== '')
  console.warn('note: uncommitted changes are not in HEAD, so these checks don’t see them');

/* ---------- the worktree ------------------------------------------------------- */

const tree = join(tmpdir(), 'sen-mutants');
if (existsSync(join(tree, '.git'))) {
  git(['checkout', '--force', '--detach', head], tree);
  git(['clean', '-fdq', '-e', 'node_modules', '-e', 'dist*'], tree);
} else {
  git(['worktree', 'prune']);
  rmSync(tree, { recursive: true, force: true });
  git(['worktree', 'add', '--detach', tree, head]);
}
console.log(`HEAD ${head.slice(0, 8)} in ${tree}`);
const install = spawnSync('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], {
  shell: WIN,
  cwd: tree,
  stdio: 'inherit',
});
if (install.status !== 0) throw new Error('pnpm install failed in the worktree');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'logs'), { recursive: true });

/** Runs a suite in the worktree; true when it passed. */
function run(suite, name) {
  const [cmd, ...args] = SUITES[suite];
  const log = openSync(join(out, 'logs', `${name}.log`), 'w');
  const t0 = Date.now();
  const env = { ...process.env };
  delete env.CI;
  const r = spawnSync(cmd, winArgs(args), { cwd: tree, env, stdio: ['ignore', log, log], shell: WIN });
  closeSync(log);
  return { passed: r.status === 0, seconds: Math.round((Date.now() - t0) / 1000) };
}

/* ---------- each suite clean, then each mutant ------------------------------------ */

const suites = [...new Set(chosen.map((m) => m.suite))];
const clean = {};
for (const s of suites) {
  console.log(`suite ${s}, unmutated ...`);
  clean[s] = run(s, `clean-${s}`);
  console.log(`  ${clean[s].passed ? 'passes' : 'FAILS'} (${clean[s].seconds} s)`);
}

const results = [];
for (const m of chosen) {
  const file = join(tree, m.file);
  const original = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const count = original.split(m.find).length - 1;
  let verdict;
  let seconds = 0;
  if (count !== 1) verdict = `stale (found ${count} times)`;
  else if (!clean[m.suite].passed) verdict = 'not judged (the suite fails unmutated)';
  else {
    writeFileSync(file, original.replace(m.find, m.replace));
    try {
      const r = run(m.suite, m.id);
      seconds = r.seconds;
      verdict = r.passed ? 'SURVIVED' : 'killed';
    } finally {
      writeFileSync(file, original);
    }
  }
  results.push({ ...m, verdict, seconds });
  console.log(`${m.id}: ${verdict}${seconds ? ` (${seconds} s)` : ''}`);
}

/* ---------- the report ------------------------------------------------------------- */

const bad = results.filter((r) => r.verdict !== 'killed');
const md = [
  `# Breakage checks: ${branch} (${head.slice(0, 8)})`,
  '',
  `${results.length - bad.length} of ${results.length} killed. A survivor is a finding: a guard no test holds (D139).`,
  '',
  '| Mutant | Suite | Verdict | What breaks | Log |',
  '|---|---|---|---|---|',
  ...results.map(
    (r) =>
      `| \`${r.id}\` | ${r.suite} | ${r.verdict === 'killed' ? 'killed' : `**${r.verdict}**`} | ${r.breaks} | [log](logs/${r.id}.log) |`,
  ),
  '',
  ...suites.map(
    (s) => `Suite \`${s}\` unmutated: ${clean[s].passed ? 'passes' : '**fails**'} in ${clean[s].seconds} s.`,
  ),
];
writeFileSync(join(out, 'index.md'), md.join('\n') + '\n');
writeFileSync(join(out, 'index.json'), JSON.stringify({ branch, head, clean, results }, null, 2));
console.log(`\n${relative(root, join(out, 'index.md'))}: ${results.length - bad.length}/${results.length} killed`);
process.exit(bad.length ? 1 : 0);
