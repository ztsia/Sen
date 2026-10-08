#!/usr/bin/env node
// The repo hygiene check (spec §17, B01). It fails a PR when:
//   1. any tracked path is under private/ (git add -f gets past .gitignore), or
//   2. any tracked file, or any tracked file's path, holds a string from the DENYLIST Actions secret,
//      one string per line, matched without regard to case. The denylist is never printed: a hit
//      names the file and line, and a path has the string masked.
// Given a range (HYGIENE_BASE and HYGIENE_HEAD, as CI sets for a PR), it checks every commit in it too,
// so something added and then deleted within the PR still fails it: its commits stay public.
// Without DENYLIST it still checks private/, and says plainly that the denylist part was skipped.
//   node scripts/hygiene.mjs [repo-dir]
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const terms = (denylist) =>
  (denylist ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

/** Every tracked path: in the index, or in a commit's tree. */
const paths = (cwd, commit) =>
  (commit ? git(cwd, ['ls-tree', '-r', '-z', '--name-only', commit]) : git(cwd, ['ls-files', '-z']))
    .split('\0')
    .filter(Boolean);

const isPrivate = (p) => p === 'private' || p.startsWith('private/') || p.includes('/private/');

export function trackedPrivate(cwd, commit) {
  return paths(cwd, commit).filter(isPrivate);
}

export function denylistHits(cwd, denylist, commit) {
  const ts = terms(denylist);
  if (ts.length === 0) return [];
  const args = ['grep', '-n', '-I', '-i', '-F', '--no-color'];
  for (const t of ts) args.push('-e', t);
  if (commit) args.push(commit);
  try {
    // only "file:line", never the matching text, so a hit doesn't print the secret into the log
    return git(cwd, args)
      .split('\n')
      .filter(Boolean)
      .map((l) =>
        l
          .split(':')
          .slice(commit ? 1 : 0, commit ? 3 : 2)
          .join(':'),
      );
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
}

/** Tracked paths that hold a denylisted string, with the string masked. */
export function denylistPaths(cwd, denylist, commit) {
  const ts = terms(denylist);
  if (ts.length === 0) return [];
  const re = new RegExp(ts.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
  return paths(cwd, commit)
    .filter((p) => p.match(re))
    .map((p) => p.replace(re, '***'));
}

function problemsIn(cwd, denylist, commit) {
  const out = trackedPrivate(cwd, commit).map((p) => `Tracked under private/: ${p}`);
  for (const at of denylistHits(cwd, denylist, commit)) out.push(`A denylisted string is in ${at}`);
  for (const p of denylistPaths(cwd, denylist, commit)) out.push(`A denylisted string is in the path ${p}`);
  return out;
}

/**
 * Checks what's tracked now and, given a range, every commit in it. A problem is reported once, where
 * it first appears: now, or in the earliest commit that has it.
 */
export function check(cwd, denylist, range) {
  const notes = [];
  if (terms(denylist).length === 0)
    notes.push('The DENYLIST secret is not set, so the denylist part was skipped. Only private/ was checked.');
  const problems = problemsIn(cwd, denylist);
  if (range?.base) {
    const seen = new Set(problems);
    const commits = git(cwd, ['log', '--reverse', '--format=%h', `${range.base}..${range.head ?? 'HEAD'}`])
      .split('\n')
      .filter(Boolean);
    for (const c of commits)
      for (const p of problemsIn(cwd, denylist, c)) {
        if (seen.has(p)) continue;
        seen.add(p);
        problems.push(`${p} (in ${c})`);
      }
    notes.push(
      `Checked ${commits.length} commit(s) in ${range.base.slice(0, 7)}..${(range.head ?? 'HEAD').slice(0, 7)}.`,
    );
  }
  return { problems, notes };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const base = process.env.HYGIENE_BASE;
  // a push that opens a branch has no "before" (all zeros): then only the tree is checked
  const range = base && !/^0+$/.test(base) ? { base, head: process.env.HYGIENE_HEAD || 'HEAD' } : undefined;
  const { problems, notes } = check(process.argv[2] ?? process.cwd(), process.env.DENYLIST, range);
  for (const n of notes) console.log(n);
  for (const p of problems) console.error(p);
  if (problems.length) {
    console.error(
      `\nHygiene check failed: ${problems.length} problem(s). Real data never enters the repo (CLAUDE.md).`,
    );
    process.exit(1);
  }
  console.log('Hygiene check passed.');
}
