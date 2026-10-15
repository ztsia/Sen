#!/usr/bin/env node
/**
 * Diff-driven QA's machinery (D137): shoots the catalogue (apps/web/e2e/catalogue.ts) from main's build
 * and from this checkout's, in every look and mode, and writes what changed.
 *
 *   node scripts/qa-diff.mjs [--base <ref>] [--looks all|<list>] [--out <dir>]
 *
 * Defaults: base origin/main, every look, out qa-artifacts/<branch, / as _>/diff. Output:
 *   index.md, index.json   what a reviewer reads first: trees changed, pixels changed, what's new or gone,
 *                          the screens never explored, and every scripted check's findings
 *   base/, head/           each pair's whole-screen PNG (unchanged ones are deleted, bar Minted, light)
 *   diff/                  the diff image of every pair that changed
 *   checks.jsonl           the checks' findings, one per line
 *   logs/                  Playwright's output for each run
 *
 * Main's build is made in a git worktree under the temp folder, kept for the next run. The specs are this
 * checkout's in both runs (e2e/diff.config.ts): only the app differs. A failing test never stops the
 * script; it still writes the report, and exits 1 at the end if a test failed.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { stripVTControlCharacters } from 'node:util';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
const unknown = argv.filter((a) => a.startsWith('--') && !['--base', '--looks', '--out', '--help'].includes(a));
if (unknown.length || argv.includes('--help')) {
  console.error('usage: node scripts/qa-diff.mjs [--base <ref>] [--looks all|<list>] [--out <dir>]');
  process.exit(argv.includes('--help') ? 0 : 2);
}
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const baseRef = arg('--base', 'origin/main');
const looksArg = arg('--looks', 'all');
const out = resolve(arg('--out', join(root, 'qa-artifacts', branch.replace(/\//g, '_'), 'diff')));
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

rmSync(out, { recursive: true, force: true });
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

const baseTests = run('base');
const headTests = run('head');

/* ---------- pixels --------------------------------------------------------------- */

const requireWeb = createRequire(join(web, 'package.json'));
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

writeFileSync(join(out, 'index.md'), md.join('\n'));

console.log(`\n${md[2]}\nreport: ${join(out, 'index.md')}\nmain's worktree, kept for the next run: ${worktree}`);
process.exit(failures.head.length || failures.base.length ? 1 : 0);
