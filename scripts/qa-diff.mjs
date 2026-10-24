#!/usr/bin/env node
/**
 * Diff-driven QA's machinery (D137): shoots the catalogue (apps/web/e2e/catalogue.ts) from main's build
 * and from this checkout's, in every look and mode, and writes what changed.
 *
 *   node scripts/qa-diff.mjs [--base <ref>] [--looks all|<list>] [--out <dir>] [--metrics-only]
 *
 * Defaults: base origin/main, every look, out qa-artifacts/<branch, / as _>/diff. Output:
 *   index.md, index.json   what a reviewer reads first: trees changed, pixels changed, what's new or gone,
 *                          the screens never explored, and every scripted check's findings
 *   base/, head/           each pair's whole-screen PNG (unchanged ones are deleted, bar Minted, light)
 *   diff/                  the diff image of every pair that changed
 *   checks.jsonl           the checks' findings, one per line
 *   logs/                  Playwright's output for each run
 *
 * It then measures what each screen, each journey tap, each API route and the build cost a person and a
 * phone (D139), on main and on this branch, side by side. Nothing there names a cause: qa/limits.ts judges
 * the numbers against human limits and against main, and only the flagged ones reach the reviewer.
 *   - screens and journeys open as a phone opens Sen after the first time (the service worker holds the
 *     build), with the CPU 4x slower on a mobile network; each is measured once per side, three at a time
 *   - what that flags is measured twice more on both sides, and a flag stays only if the median of the
 *     three still flags; the rest are listed as dropped noise
 *   ../metrics/index.json  { base, head, flags, dropped, standing, ok, ... }: every number, and how each was judged
 *   ../metrics/<side>/     what each run wrote: screens.jsonl, steps.jsonl, api.jsonl (and <side>-confirm/)
 *   ../metrics/film/       a PNG per journey tap (this branch's): the frames from the tap to a second after
 *   ../metrics/logs/       the metrics runs' output
 *   index.md               gains a `## Metrics` section: the flags, those dropped, the standing ones by metric
 * A flag never changes the exit code, because timings vary. --metrics-only skips the catalogue runs and does
 * only this, and swaps the Metrics section into an index.md that is already there.
 *
 * Main's build is made in a git worktree under the temp folder, kept for the next run. The specs are this
 * checkout's in both runs (e2e/diff.config.ts): only the app differs. A failing test never stops the
 * script; it still writes the report, and exits 1 at the end if a test failed.
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { stripVTControlCharacters } from 'node:util';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { apiMetrics, judgeAll, median, METRICS } from '../qa/limits.ts';
import { buildMetrics } from './build-metrics.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'apps/web');
const TREES = 'apps/web/e2e/trees';
const MODES = ['light', 'dark'];

/* ---------- arguments ---------------------------------------------------------- */

const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 }).trim();
const sh = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`);
};

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const unknown = argv.filter(
  (a) => a.startsWith('--') && !['--base', '--looks', '--out', '--metrics-only', '--help'].includes(a),
);
if (unknown.length || argv.includes('--help')) {
  console.error('usage: node scripts/qa-diff.mjs [--base <ref>] [--looks all|<list>] [--out <dir>] [--metrics-only]');
  process.exit(argv.includes('--help') ? 0 : 2);
}
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const baseRef = arg('--base', 'origin/main');
const looksArg = arg('--looks', 'all');
const metricsOnly = argv.includes('--metrics-only');
const out = resolve(arg('--out', join(root, 'qa-artifacts', branch.replace(/\//g, '_'), 'diff')));
const metricsDir = resolve(out, '..', 'metrics');
const ALL_LOOKS = ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'];
const looks = looksArg === 'all' ? ALL_LOOKS : looksArg.split(',').map((s) => s.trim());
for (const l of looks) if (!ALL_LOOKS.includes(l)) throw new Error(`unknown look "${l}"`);

let baseSha;
try {
  baseSha = git(['rev-parse', '--verify', `${baseRef}^{commit}`]);
} catch {
  throw new Error(`can't find "${baseRef}"; fetch it first (git fetch origin)`);
}
const headSha = git(['rev-parse', 'HEAD']);
const dirty = git(['status', '--porcelain', '--', ':!qa-artifacts']) !== '';

/* ---------- main's worktree and the two builds ----------------------------------- */

const worktree = join(tmpdir(), `sen-base-${baseSha.slice(0, 8)}`);
if (!existsSync(join(worktree, '.git'))) {
  git(['worktree', 'prune']);
  rmSync(worktree, { recursive: true, force: true });
  git(['worktree', 'add', '--detach', worktree, baseSha]);
}
const baseWeb = join(worktree, 'apps/web');
console.log(`base ${baseRef} (${baseSha.slice(0, 8)}) in ${worktree}`);

sh('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], { cwd: worktree });
const build = (cwd) =>
  sh('pnpm', ['exec', 'vite', 'build', '--outDir', 'dist-qa'], { cwd, env: { ...process.env, SEN_ENV: 'preview' } });
// the worktree is a fixed commit, so its build is good for as long as it stays
if (!existsSync(join(baseWeb, 'dist-qa/index.html'))) build(baseWeb);
build(web);

/* ---------- the two runs --------------------------------------------------------- */

// --metrics-only keeps the report that is there
if (!metricsOnly) rmSync(out, { recursive: true, force: true });
for (const d of ['base', 'head', 'diff', 'logs']) mkdirSync(join(out, d), { recursive: true });

function run(project) {
  const log = openSync(join(out, 'logs', `${project}.log`), 'w');
  const json = join(out, 'logs', `${project}.json`);
  const base = project === 'base';
  const env = {
    ...process.env,
    QA_SERVE: project,
    QA_BASE_WEB: baseWeb,
    QA_RESULTS: join(out, 'logs', `${project}-results`),
    E2E_LOOKS: looks.join(','),
    E2E_SHOTS: join(out, project),
    PLAYWRIGHT_JSON_OUTPUT_NAME: json,
    // main's pages are only photographed: the trees and checks are this branch's to answer for
    ...(base ? { E2E_CATALOGUE: 'shots' } : { E2E_CHECKS: join(out, 'checks.jsonl') }),
  };
  delete env.CI;
  const args = ['exec', 'playwright', 'test', '-c', 'e2e/diff.config.ts', '--project', project];
  // every tree in the folder is rewritten in place, so comparing it with the base commit's shows what
  // the branch changed
  if (!base) args.push('--update-snapshots=all');
  console.log(`running the catalogue on ${project} (${looks.join(', ')}) ...`);
  const t0 = Date.now();
  const r = spawnSync('pnpm', args, { cwd: web, env, stdio: ['ignore', log, log] });
  closeSync(log);
  console.log(
    `  ${project}: exit ${r.status}, ${Math.round((Date.now() - t0) / 1000)} s, log ${relative(root, join(out, 'logs', `${project}.log`))}`,
  );
  return readTests(json);
}

/** Every test in a Playwright JSON report: its title, whether it passed and its first error line. */
function readTests(file) {
  if (!existsSync(file)) return [];
  const tests = [];
  const walk = (suite) => {
    for (const s of suite.suites ?? []) walk(s);
    for (const spec of suite.specs ?? [])
      for (const t of spec.tests ?? []) {
        const res = t.results?.at(-1);
        const msg = stripVTControlCharacters(res?.error?.message ?? res?.errors?.[0]?.message ?? '');
        tests.push({
          title: spec.title,
          ok: t.status === 'expected' || t.status === 'skipped',
          error: msg.split('\n')[0],
        });
      }
  };
  for (const s of JSON.parse(readFileSync(file, 'utf8')).suites ?? []) walk(s);
  return tests;
}

const baseTests = metricsOnly ? [] : run('base');
const headTests = metricsOnly ? [] : run('head');

/* ---------- metrics (D139) ---------------------------------------------------------- */

// Each screen and journey is measured once per side, three at a time (the CPU throttling is per page, so
// the runs don't slow one another). Only what that flags is measured twice more, one at a time, on both
// sides; a flag stays if the median of the three still flags and the samples agree (see metricsPass), else it is dropped as noise.
const WORKERS = 3;
const CONFIRM_RUNS = 2;
const MS = (t0) => Math.round((Date.now() - t0) / 1000);
const metricsLogs = join(metricsDir, 'logs');
const metricsNotes = new Set();
const metricsRuns = {};
const metricsPhases = [];

const readJsonl = (file) =>
  existsSync(file)
    ? readFileSync(file, 'utf8')
        .split('\n')
        .filter(Boolean)
        .flatMap((l) => {
          try {
            return [JSON.parse(l)];
          } catch {
            return [];
          }
        })
    : [];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * One Playwright run of the metrics specs on one side's build, writing to `dir`. Each spec warms the
 * service worker up before it measures, as a phone has it (e2e/metrics.ts).
 */
async function metricsPlaywright(
  side,
  name,
  files,
  { dir = join(metricsDir, side), workers, env = {}, grep, repeat } = {},
) {
  const log = openSync(join(metricsLogs, `${name}.log`), 'w');
  const runEnv = {
    ...process.env,
    QA_SERVE: side,
    QA_BASE_WEB: baseWeb,
    QA_RESULTS: join(metricsLogs, `${name}-results`),
    QA_METRICS: dir,
    PLAYWRIGHT_JSON_OUTPUT_NAME: join(metricsLogs, `${name}.json`),
    ...env,
  };
  delete runEnv.CI;
  const args = ['exec', 'playwright', 'test', '-c', 'e2e/diff.config.ts', '--project', `metrics-${side}`];
  args.push('--workers', String(workers));
  if (repeat) args.push('--repeat-each', String(repeat));
  if (grep) args.push('-g', grep);
  console.log(`measuring ${name} (${files.join(', ')}; ${workers} worker${workers > 1 ? 's' : ''}) ...`);
  const t0 = Date.now();
  const r = await new Promise((done) => {
    const child = spawn('pnpm', [...args, ...files], { cwd: web, env: runEnv, stdio: ['ignore', log, log] });
    child.on('close', (status) => done({ status }));
  });
  closeSync(log);
  const tests = readTests(join(metricsLogs, `${name}.json`));
  const failed = tests.filter((t) => !t.ok).length;
  metricsRuns[name] = { exit: r.status, seconds: MS(t0), tests: tests.length, failed };
  console.log(
    `  ${name}: exit ${r.status}, ${MS(t0)} s, ${tests.length} tests (${failed} failed), log ${relative(root, join(metricsLogs, `${name}.log`))}`,
  );
}

/** The API's tests on the local Postgres, each request recorded (apps/api/test/metrics.setup.ts). */
function metricsApi(side, cwd, name, dir = join(metricsDir, side)) {
  if (!existsSync(join(cwd, 'apps/api/test/metrics.setup.ts'))) {
    metricsNotes.add(
      `${side === 'base' ? baseRef : 'head'} has no QA_METRICS setup in its API tests, so it has no API numbers.`,
    );
    return;
  }
  if (spawnSync('pg_isready', ['-h', '127.0.0.1'], { stdio: 'ignore' }).status !== 0)
    spawnSync('bash', [join(root, 'scripts/local-db.sh'), 'start'], { stdio: 'inherit' });
  const log = openSync(join(metricsLogs, `${name}.log`), 'w');
  console.log(`measuring ${name} (pnpm test:db) ...`);
  const t0 = Date.now();
  const r = spawnSync('pnpm', ['test:db'], {
    cwd,
    env: { ...process.env, QA_METRICS: dir },
    stdio: ['ignore', log, log],
  });
  closeSync(log);
  metricsRuns[name] = { exit: r.status, seconds: MS(t0) };
  console.log(`  ${name}: exit ${r.status}, ${MS(t0)} s, log ${relative(root, join(metricsLogs, `${name}.log`))}`);
}

/** Samples of one key and metric become one number, their median. */
function aggregate(lines) {
  const by = new Map();
  for (const m of lines) {
    const k = `${m.key}\u0000${m.metric}`;
    by.set(k, [...(by.get(k) ?? []), m]);
  }
  return [...by.values()].map((ms) => ({
    key: ms[0].key,
    metric: ms[0].metric,
    value: Math.round(median(ms.map((m) => m.value)) * 1000) / 1000,
    n: ms.length,
  }));
}

/** Every sample of each screen and step number on a side, by key and metric: what the medians are made of. */
function sideSamples(dirs) {
  const by = new Map();
  for (const m of dirs.flatMap((d) => ['screens.jsonl', 'steps.jsonl'].flatMap((f) => readJsonl(join(d, f))))) {
    const k = `${m.key}|${m.metric}`;
    by.set(k, [...(by.get(k) ?? []), m.value]);
  }
  return by;
}

/** A side's numbers from every folder its runs wrote to (the first pass, and the confirming one). */
const sideMetrics = (side, distDir, dirs) => [
  ...aggregate(dirs.flatMap((d) => ['screens.jsonl', 'steps.jsonl'].flatMap((f) => readJsonl(join(d, f))))),
  ...apiMetrics(dirs.flatMap((d) => readJsonl(join(d, 'api.jsonl')))),
  ...buildMetrics(distDir),
];

/**
 * Measures what flagged twice more, two workers on each side. The two sides run together, so a drift in
 * the machine reaches both alike.
 */
async function confirmRuns(flags) {
  const screens = [...new Set(flags.filter((j) => j.key.startsWith('screen:')).map((j) => j.key.slice(7)))];
  const titles = [
    ...new Set(flags.filter((j) => j.key.startsWith('step:')).map((j) => j.key.match(/^step:(.*)\/\d+$/)[1])),
  ];
  const api = flags.some((j) => j.key.startsWith('api:'));
  await Promise.all(
    ['base', 'head'].map(async (side) => {
      const o = { dir: join(metricsDir, `${side}-confirm`), workers: 2 };
      if (screens.length)
        await metricsPlaywright(side, `confirm-screens-${side}`, ['metrics.spec'], {
          ...o,
          env: { QA_ONLY: JSON.stringify(screens), QA_RUNS: String(CONFIRM_RUNS) },
        });
      if (titles.length)
        await metricsPlaywright(side, `confirm-steps-${side}`, ['journeys.spec'], {
          ...o,
          repeat: CONFIRM_RUNS,
          grep: titles.map((t) => `\\s${escapeRe(t)}$`).join('|'),
        });
    }),
  );
  // the API's tests share one database, so they take turns
  if (api)
    for (const side of ['base', 'head'])
      for (let i = 1; i <= CONFIRM_RUNS; i++)
        metricsApi(
          side,
          side === 'base' ? worktree : root,
          `confirm-api-${side}-${i}`,
          join(metricsDir, `${side}-confirm`),
        );
}

const SLUG = (title) => title.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
const unitOf = (metric) => METRICS[metric].unit;
const fmt = (metric, v) => {
  switch (unitOf(metric)) {
    case 'ms':
      return `${Math.round(v)} ms`;
    case 'bytes':
      return v >= 1e6 ? `${(v / 1e6).toFixed(2)} MB` : v >= 1e3 ? `${(v / 1e3).toFixed(1)} kB` : `${Math.round(v)} B`;
    case 'score':
      return v.toFixed(3);
    default:
      return String(Math.round(v * 10) / 10);
  }
};
const cell = (s) => s.replace(/\|/g, '\\|');

/** The `## Metrics` section: the confirmed flags, those dropped as noise, the standing ones by metric, a count. */
function metricsSection(m) {
  const L = ['## Metrics', ''];
  L.push(
    `${m.head.length} numbers on this branch, ${m.base.length} on ${baseRef}: **${m.flags.length} flagged**, ` +
      `${m.dropped.length} more dropped as noise, ${m.standing.length} standing. A flag is a number past a human ` +
      `limit that ${baseRef} keeps by a real step, or worse than ${baseRef}'s by more than a ratio (timings 50%, bytes and counts 25%) and a floor (qa/limits.ts). ` +
      `Screens open as a phone opens Sen after the first time (the build cached by the service worker), and ` +
      `screens and taps are measured with the CPU 4× slower on a mobile network. Every screen and journey ` +
      `was measured once on each side; a number that flagged was measured twice more on both, and a flag ` +
      `stays only if the median of the three still flags and the three samples are all worse than main's. The reviewer explains each flag in the ledger.`,
    '',
  );
  for (const n of m.notes) L.push(`- ${n}`);
  for (const [name, r] of Object.entries(m.runs))
    if (r.exit !== 0)
      L.push(
        `- ${name} exited ${r.exit}${r.failed ? ` with ${r.failed} of ${r.tests} tests failed` : ''}: see ${relative(out, join(metricsLogs, `${name}.log`))}`,
      );
  L.push(`- Took ${m.phases.map(([n, s]) => `${n} ${s} s`).join(', ')}.`, '');
  const keyCell = (j) => {
    const step = j.key.match(/^step:(.*)\/(\d+)$/);
    const film = step && join(metricsDir, 'film', SLUG(step[1]), `${step[2]}.png`);
    const text = `\`${cell(j.key)}\``;
    return film && existsSync(film) ? `[${text}](${relative(out, film)})` : text;
  };
  const baseCell = (j) => (j.base === undefined ? 'none' : fmt(j.metric, j.base));
  const verdict = (j) =>
    j.verdict.kind === 'over'
      ? `over ${fmt(j.metric, j.verdict.limit)}${j.base === undefined ? ` (${baseRef} has no number)` : ''}`
      : `worse than ${baseRef} by ${Math.round((j.value / j.verdict.base - 1) * 100)}%`;
  L.push('### Flags', '');
  if (m.flags.length) {
    L.push('| Key | Metric | What it says | Head | Main | Verdict |', '|---|---|---|---|---|---|');
    for (const j of m.flags)
      L.push(
        `| ${keyCell(j)} | ${j.metric} | ${METRICS[j.metric].says} | ${fmt(j.metric, j.value)}${j.n > 1 ? ` (median of ${j.n})` : ''} | ${baseCell(j)} | ${verdict(j)} |`,
      );
    L.push('');
  } else L.push('None.', '');
  if (m.dropped.length) {
    L.push(
      '### Dropped as noise',
      '',
      `Flagged on the first measurement, then not confirmed: the median of three no longer flags, or it still does but the three samples overlap ${baseRef}'s three.`,
      '',
    );
    L.push('| Key | Metric | First | Median of three | Main | Why |', '|---|---|---|---|---|---|');
    for (const d of m.dropped)
      L.push(
        `| ${keyCell(d)} | ${d.metric} | ${fmt(d.metric, d.first)} | ${d.now === undefined ? 'gone' : fmt(d.metric, d.now)} | ${d.base === undefined ? 'none' : fmt(d.metric, d.base)} | ${d.why} |`,
      );
    L.push('');
  }
  L.push('### Standing', '');
  if (m.standing.length) {
    L.push(
      `Over a human limit on ${baseRef} too: not flags. One row per metric, with its five worst; every one is in metrics/index.json.`,
      '',
    );
    L.push('| Metric | What it says | Limit | Count | Five worst |', '|---|---|---|---|---|');
    for (const [metric, list] of Map.groupBy(m.standing, (j) => j.metric)) {
      const worst = [...list]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((j) => `\`${cell(j.key)}\` ${fmt(metric, j.value)}`)
        .join('; ');
      L.push(
        `| ${metric} | ${METRICS[metric].says} | ${fmt(metric, list[0].verdict.limit)} | ${list.length} | ${worst} |`,
      );
    }
    L.push('');
  } else L.push('None.', '');
  if (m.lateFlags.length)
    L.push(
      `${m.lateFlags.length} numbers flagged only on the median of three, not on their first measurement: not counted (see lateFlags in metrics/index.json).`,
      '',
    );
  const onBase = new Set(m.base.map((x) => `${x.key}|${x.metric}`));
  const noBase = m.head.filter((x) => !onBase.has(`${x.key}|${x.metric}`)).length;
  L.push(
    `${m.ok} other numbers are within the limits and within noise of ${baseRef}'s` +
      `${noBase ? ` (${noBase} numbers have none on ${baseRef}: only human limits apply to them)` : ''}.`,
    '',
  );
  return L;
}

async function metricsPass() {
  rmSync(metricsDir, { recursive: true, force: true });
  for (const d of ['base', 'head', 'film', 'logs']) mkdirSync(join(metricsDir, d), { recursive: true });
  const t0 = Date.now();
  const phase = async (name, fn) => {
    const t = Date.now();
    await fn();
    metricsPhases.push([name, MS(t)]);
  };
  const first = { workers: WORKERS };
  await phase('main', () => metricsPlaywright('base', 'metrics-base', ['metrics.spec', 'journeys.spec'], first));
  await phase('head', () => metricsPlaywright('head', 'metrics-head', ['metrics.spec', 'journeys.spec'], first));
  // the film records video and frames, which would slow the very taps being timed, so it is a run of its own
  await phase('film', async () => {
    await metricsPlaywright('head', 'film-head', ['journeys.spec'], {
      ...first,
      dir: join(metricsDir, 'film-scratch'),
      env: { QA_FILMSTRIP: join(metricsDir, 'film') },
    });
    rmSync(join(metricsDir, 'film-scratch'), { recursive: true, force: true });
    // the videos Playwright kept, beside the filmstrips
    const vids = join(metricsLogs, 'film-head-results');
    if (existsSync(vids))
      for (const d of readdirSync(vids)) {
        const v = join(vids, d, 'video.webm');
        if (existsSync(v)) copyFileSync(v, join(metricsDir, 'film', `${d}.webm`));
      }
  });
  await phase('API', () => {
    metricsApi('base', worktree, 'api-base');
    metricsApi('head', root, 'api-head');
  });
  const dirs = (side, ...more) => [join(metricsDir, side), ...more.map((s) => join(metricsDir, `${side}-${s}`))];
  const baseDist = join(baseWeb, 'dist-qa');
  const headDist = join(web, 'dist-qa');
  const once = judgeAll(sideMetrics('head', headDist, dirs('head')), sideMetrics('base', baseDist, dirs('base')));
  if (once.flags.length) await phase('confirm', () => confirmRuns(once.flags));
  const base = sideMetrics('base', baseDist, dirs('base', 'confirm'));
  const head = sideMetrics('head', headDist, dirs('head', 'confirm'));
  const judged = judgeAll(head, base);
  const id = (j) => `${j.key}|${j.metric}`;
  const stays = new Set(judged.flags.map(id));
  // A flag that the median of three still shows is confirmed only if the samples agree with it: each of
  // head's is worse than each of main's (than the limit, where main has no number). Three samples a side
  // that overlap say the two builds are not told apart, however the medians fall; on the same code that
  // is what noise does around a limit or a ratio line. Numbers with fewer samples than that (the API's,
  // the build's) stand on their median.
  const headSamples = sideSamples(dirs('head', 'confirm'));
  const baseSamples = sideSamples(dirs('base', 'confirm'));
  const separated = (j) => {
    const h = headSamples.get(id(j));
    if (!h || h.length < 3) return true;
    const b = baseSamples.get(id(j));
    if (b && b.length >= 3) return Math.min(...h) > Math.max(...b);
    return j.verdict.kind !== 'over' || Math.min(...h) > j.verdict.limit;
  };
  const flags = [];
  const overlapping = new Set();
  for (const j of judged.flags) {
    if (!once.flags.some((f) => id(f) === id(j))) continue;
    if (separated(j)) flags.push(j);
    else overlapping.add(id(j));
  }
  const nowOf = new Map(head.map((x) => [id(x), x.value]));
  const baseNow = new Map(base.map((x) => [id(x), x.value]));
  const dropped = once.flags
    .filter((f) => !stays.has(id(f)) || overlapping.has(id(f)))
    .map((f) => ({
      key: f.key,
      metric: f.metric,
      first: f.value,
      now: nowOf.get(id(f)),
      base: baseNow.get(id(f)),
      why: overlapping.has(id(f)) ? 'samples overlap main' : 'median no longer flags',
    }));
  // a flag only the median showed: not counted, but not lost
  const lateFlags = judged.flags.filter((j) => !once.flags.some((f) => id(f) === id(j)));
  const result = {
    base,
    head,
    flags,
    dropped,
    lateFlags,
    standing: judged.standing,
    ok: judged.ok,
    firstPassFlags: once.flags.length,
    notes: [...metricsNotes],
    phases: metricsPhases,
    runs: metricsRuns,
  };
  writeFileSync(join(metricsDir, 'index.json'), JSON.stringify(result, null, 2));
  console.log(
    `metrics: ${MS(t0)} s (${metricsPhases.map(([n, s]) => `${n} ${s} s`).join(', ')}); ` +
      `${head.length} head numbers, ${base.length} on ${baseRef}; first pass ${once.flags.length} flags -> ` +
      `${flags.length} confirmed, ${dropped.length} dropped as noise, ${judged.standing.length} standing, ` +
      `${result.ok} ok -> ${join(metricsDir, 'index.json')}`,
  );
  return metricsSection(result);
}

const metricsMd = await metricsPass();

if (metricsOnly) {
  // the section goes into the report that is there, in place of the last one; without a report, into a new one
  const file = join(out, 'index.md');
  const had = existsSync(file) ? readFileSync(file, 'utf8') : `# QA metrics: ${branch} against ${baseRef}\n\n`;
  const at = had.indexOf('## Metrics');
  const next = at < 0 ? -1 : had.indexOf('\n## ', at + 1);
  const kept = at < 0 ? had.trimEnd() + '\n\n' : had.slice(0, at) + (next < 0 ? '' : had.slice(next + 1));
  writeFileSync(file, kept.trimEnd() + '\n\n' + metricsMd.join('\n'));
  console.log(`report: ${file}`);
  process.exit(0);
}

/* ---------- pixels --------------------------------------------------------------- */

const requireWeb = createRequire(join(web, 'package.json'));
// eslint-disable-next-line no-unsanitized/method -- a dev script importing pixelmatch resolved from the web app's own node_modules
const { default: pixelmatch } = await import(pathToFileURL(requireWeb.resolve('pixelmatch')).href);
const { PNG } = requireWeb('pngjs');

// head's run writes the catalogue; if it died before that, base's (the same specs) stands in
const listed = ['head', 'base'].map((side) => join(out, side, 'catalogue.json')).find((f) => existsSync(f));
if (!listed) throw new Error(`neither run wrote catalogue.json; see ${join(out, 'logs')}`);
const catalogue = JSON.parse(readFileSync(listed, 'utf8'));
const entries = catalogue.entries;
const pngName = (e, look, mode) => `${e.file}--${look}-${mode}.png`;
const shotDir = (side) => join(out, side, 'catalogue');
const exists = (side, name) => existsSync(join(shotDir(side), name));

/** `img` on a w×h canvas of magenta, so two sizes can still be compared and the difference seen. */
function pad(img, w, h) {
  if (img.width === w && img.height === h) return img;
  const p = new PNG({ width: w, height: h });
  for (let i = 0; i < p.data.length; i += 4) p.data.set([255, 0, 255, 255], i);
  PNG.bitblt(img, p, 0, 0, img.width, img.height, 0, 0);
  return p;
}

function comparePair(name) {
  const a = PNG.sync.read(readFileSync(join(shotDir('base'), name)));
  const b = PNG.sync.read(readFileSync(join(shotDir('head'), name)));
  const w = Math.max(a.width, b.width);
  const h = Math.max(a.height, b.height);
  const diff = new PNG({ width: w, height: h });
  const pixels = pixelmatch(pad(a, w, h).data, pad(b, w, h).data, diff.data, w, h, {
    threshold: 0.1,
    includeAA: false,
  });
  const sized = a.width !== b.width || a.height !== b.height;
  if (pixels || sized) writeFileSync(join(out, 'diff', name), PNG.sync.write(diff));
  return {
    changed: pixels > 0 || sized,
    pixels,
    sized: sized ? `${a.width}×${a.height} → ${b.width}×${b.height}` : undefined,
  };
}

const rel = (p) => relative(out, p);
const pairsOf = (e) =>
  looks.flatMap((look) =>
    MODES.map((mode) => {
      const name = pngName(e, look, mode);
      const inBase = exists('base', name);
      const inHead = exists('head', name);
      const pair = { look, mode, name, state: 'same' };
      if (inBase && inHead) {
        const c = comparePair(name);
        pair.state = c.changed ? 'changed' : 'same';
        pair.pixels = c.pixels;
        pair.sized = c.sized;
      } else pair.state = inHead ? 'missing-base' : inBase ? 'missing-head' : 'missing-both';
      return pair;
    }),
  );

/* ---------- screens main has --------------------------------------------------- */

const registryIds = (file) =>
  existsSync(file)
    ? new Set([...readFileSync(file, 'utf8').matchAll(/^\s*s\('([^']+)'/gm)].map((m) => m[1]))
    : new Set();
const baseScreens = registryIds(join(baseWeb, 'src/screens/registry.ts'));
const headScreens = registryIds(join(web, 'src/screens/registry.ts'));

/* ---------- trees ----------------------------------------------------------------- */

const treesRecorded = looks.includes('minted');
const treeFile = (e) => `${TREES}/${e.tree}.aria.yml`;
const gitSafe = (args) => {
  try {
    return git(args);
  } catch {
    return '';
  }
};
// Each tree as the base commit has it against the file in the working tree, once head's run has
// rewritten them. Not `git diff <base>`, which leaves out files the index doesn't know yet (a branch's
// first run, before its trees are committed).
const baseTrees = new Set(gitSafe(['ls-tree', '-r', '--name-only', baseSha, '--', TREES]).split('\n').filter(Boolean));
const headFiles = new Set(entries.map(treeFile));
const readBase = (f) => {
  try {
    return execFileSync('git', ['show', `${baseSha}:${f}`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch {
    return undefined;
  }
};
const treeState = (f) => {
  const before = baseTrees.has(f) ? readBase(f) : undefined;
  const after = existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : undefined;
  if (after === undefined) return { state: before === undefined ? 'unrecorded' : 'removed' };
  if (before === undefined) return { state: 'new', text: after };
  if (before === after) return { state: 'unchanged' };
  const tmp = join(out, 'logs', 'tree-before.yml');
  writeFileSync(tmp, before);
  const d = spawnSync('git', ['diff', '--no-index', '--no-color', '--unified=2', tmp, join(root, f)], {
    encoding: 'utf8',
  });
  return { state: 'changed', text: d.stdout.slice(d.stdout.indexOf('@@')).trimEnd() };
};
// a tree with no entry any more is gone, even though head's run never touched it
const goneTrees = [...baseTrees].filter((f) => !headFiles.has(f));

/* ---------- checks ----------------------------------------------------------------- */

const findings = existsSync(join(out, 'checks.jsonl'))
  ? readFileSync(join(out, 'checks.jsonl'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l))
  : [];

/* ---------- the report --------------------------------------------------------------- */

const report = [];
for (const e of entries) {
  const pairs = pairsOf(e);
  const t = treesRecorded ? treeState(treeFile(e)) : { state: 'unrecorded' };
  const tree = t.state;
  const noBase = pairs.every((p) => p.state === 'missing-base');
  // new: main has no such screen, took no picture of it, or has trees but none for it
  const isNew = !baseScreens.has(e.screen) || noBase || (tree === 'new' && baseTrees.size > 0);
  const changed = pairs.filter((p) => p.state === 'changed');
  report.push({
    id: e.id,
    screen: e.screen,
    path: e.path,
    status: isNew ? 'new' : changed.length || tree === 'changed' || tree === 'new' ? 'changed' : 'unchanged',
    tree,
    treeDiff: t.text,
    pairs: pairs.map((p) => ({
      ...p,
      base: p.state === 'changed' || p.state === 'missing-head' ? rel(join(shotDir('base'), p.name)) : undefined,
      head: p.state === 'changed' || p.state === 'missing-base' ? rel(join(shotDir('head'), p.name)) : undefined,
      diff: p.state === 'changed' ? rel(join(out, 'diff', p.name)) : undefined,
    })),
    findings: findings.filter((f) => f.entry === e.id),
  });
}
const goneScreens = [...baseScreens].filter((id) => !headScreens.has(id));

// base and head PNGs of what hasn't changed go; Minted, light stays, and a changed entry keeps all of its own
const entryChanged = new Set(report.filter((r) => r.pairs.some((p) => p.state !== 'same')).map((r) => r.id));
for (const r of report)
  for (const p of r.pairs) {
    if (p.state !== 'same' || entryChanged.has(r.id) || (p.look === 'minted' && p.mode === 'light')) continue;
    for (const side of ['base', 'head']) if (exists(side, p.name)) unlinkSync(join(shotDir(side), p.name));
  }

const sum = {
  entries: report.length,
  treesChanged: report.filter((r) => r.tree === 'changed').length,
  treesNew: report.filter((r) => r.tree === 'new').length,
  treesRemoved: goneTrees.length,
  entriesWithPixelsChanged: report.filter((r) => r.pairs.some((p) => p.state === 'changed')).length,
  pairsChanged: report.reduce((n, r) => n + r.pairs.filter((p) => p.state === 'changed').length, 0),
  entriesNew: report.filter((r) => r.status === 'new').length,
  screensRemoved: goneScreens.length,
  unexplored: Object.keys(catalogue.unexplored).length,
  findings: findings.length,
};

// a head test that failed always counts; a base one only when main has the screen to open
const failed = (tests, side) =>
  tests.filter((t) => {
    if (t.ok) return false;
    if (side === 'head') return true;
    const entry = report.find((r) => t.title.startsWith(`${r.id} in `));
    return !entry || entry.status !== 'new';
  });
const failures = { base: failed(baseTests, 'base'), head: failed(headTests, 'head') };

writeFileSync(
  join(out, 'index.json'),
  JSON.stringify(
    {
      base: { ref: baseRef, sha: baseSha, worktree },
      head: { branch, sha: headSha, uncommitted: dirty },
      looks,
      treesRecorded,
      summary: sum,
      entries: report,
      screensRemoved: goneScreens,
      treesRemoved: goneTrees,
      unexplored: catalogue.unexplored,
      findings,
      failures,
    },
    null,
    2,
  ),
);

const NEW_TREES_SHOWN = 10;
const md = [];
md.push(`# QA diff: ${branch} against ${baseRef}`, '');
md.push(
  `${sum.entries} entries; ${sum.treesChanged} trees changed, ${sum.treesNew} new, ${sum.treesRemoved} removed; ` +
    `${sum.entriesWithPixelsChanged} entries with pixels changed (${sum.pairsChanged} pairs); ` +
    `${sum.entriesNew} entries new, ${sum.screensRemoved} screens removed; ${sum.unexplored} unexplored; ` +
    `${sum.findings} check findings.`,
  '',
);
md.push(
  `Base ${baseRef} at ${baseSha.slice(0, 8)}; head ${branch} at ${headSha.slice(0, 8)}${dirty ? ' with uncommitted changes' : ''}. ` +
    `Looks: ${looks.join(', ')}.${treesRecorded ? '' : ' Minted is not among them, so no tree was recorded or compared.'}`,
  '',
);
if (failures.base.length || failures.head.length) {
  md.push(
    `Tests that failed: ${failures.head.length} on head (a check finding fails its test), ${failures.base.length} on base. See logs/.`,
    '',
  );
}

const showTree = (r) => {
  md.push('```diff', r.treeDiff.trimEnd(), '```', '');
};
const pairTable = (r) => {
  const rows = r.pairs.filter((p) => p.state !== 'same');
  if (!rows.length) return;
  md.push('| Pair | Pixels | Base | Head | Diff |', '|---|---|---|---|---|');
  for (const p of rows) {
    const cell = (path) => (path ? `[png](${path})` : p.state.startsWith('missing') ? 'not taken' : '');
    const note = p.sized ? `size ${p.sized}` : p.state === 'changed' ? String(p.pixels) : p.state;
    md.push(`| ${p.look}, ${p.mode} | ${note} | ${cell(p.base)} | ${cell(p.head)} | ${cell(p.diff)} |`);
  }
  md.push('');
};

// a tree recorded for the first time on a screen whose pixels match main's (main had no trees yet) is
// news only in bulk: those are listed, not shown, unless there are few
const firstTreeOnly = (r) => r.status === 'changed' && r.tree === 'new' && r.pairs.every((p) => p.state === 'same');
const changedEntries = report.filter((r) => r.status === 'changed' && !firstTreeOnly(r));
const firstTrees = report.filter(firstTreeOnly);
const newEntries = report.filter((r) => r.status === 'new');
/** A section of entries: each in full when there are few, else one line each. */
const section = (title, list, many) => {
  if (!list.length) return;
  md.push(`## ${title}`, '');
  const full = list.length <= NEW_TREES_SHOWN;
  if (!full) md.push(many(list.length), '');
  for (const r of list) {
    if (full) {
      md.push(`### ${r.id}`, '', `\`${r.path}\`; tree ${r.tree}.`, '');
      if (r.treeDiff) showTree(r);
      pairTable(r);
    } else md.push(`- ${r.id} (\`${r.path}\`): tree ${r.tree}`);
  }
  md.push('');
};
if (changedEntries.length) {
  md.push('## Changed', '');
  for (const r of changedEntries) {
    md.push(`### ${r.id}`, '', `\`${r.path}\`; tree ${r.tree}.`, '');
    if (r.treeDiff) showTree(r);
    pairTable(r);
  }
}
section(
  'New',
  newEntries,
  (n) => `${n} entries are new, so their trees are listed, not shown (they are in ${TREES}/).`,
);
section(
  'Trees recorded for the first time',
  firstTrees,
  (n) => `${n} screens look as they do on ${baseRef} and have their first tree, in ${TREES}/.`,
);
if (goneScreens.length || goneTrees.length) {
  md.push('## Removed', '');
  for (const id of goneScreens) md.push(`- screen \`${id}\` is gone from the registry`);
  for (const f of goneTrees) md.push(`- tree \`${f}\` has no entry any more`);
  md.push('');
}

md.push('## Unexplored', '');
const un = Object.entries(catalogue.unexplored);
if (un.length) for (const [id, why] of un) md.push(`- \`${id}\`: ${why}`);
else md.push('None.');
md.push('');

md.push('## Check findings', '');
if (!findings.length) md.push('None.', '');
else {
  const allPairs = looks.length * MODES.length;
  const byEntry = Map.groupBy(findings, (f) => f.entry);
  for (const [entry, list] of byEntry) {
    md.push(`### ${entry}`, '');
    for (const [check, ofCheck] of Map.groupBy(list, (f) => f.check)) {
      md.push(`**${check}**`, '');
      for (const [detail, ofDetail] of Map.groupBy(ofCheck, (f) => f.detail)) {
        const where = [...new Set(ofDetail.map((f) => `${f.look}-${f.mode}`))];
        md.push(`- ${detail}: ${where.length === allPairs ? 'all pairs' : where.join(', ')}`);
      }
      md.push('');
    }
  }
}

md.push(...metricsMd);

writeFileSync(join(out, 'index.md'), md.join('\n'));

console.log(`\n${md[2]}\nreport: ${join(out, 'index.md')}\nmain's worktree, kept for the next run: ${worktree}`);
process.exit(failures.head.length || failures.base.length ? 1 : 0);
