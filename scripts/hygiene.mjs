#!/usr/bin/env node
// The repo hygiene check (spec §17, B01). It fails a PR when:
//   1. any tracked path is under private/ (git add -f gets past .gitignore), or
//   2. any tracked file holds a string from the DENYLIST Actions secret, one string per line,
//      matched without regard to case. The denylist is never printed: a hit names the file and line.
// Without DENYLIST it still checks private/, and says plainly that the denylist part was skipped.
//   node scripts/hygiene.mjs [repo-dir]
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

export function trackedPrivate(cwd) {
  return git(cwd, ['ls-files', '-z', '--', 'private', ':(glob)**/private/**']).split('\0').filter(Boolean);
}

export function denylistHits(cwd, denylist) {
  const terms = denylist
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  if (terms.length === 0) return [];
  const args = ['grep', '-n', '-I', '-i', '-F', '--no-color'];
  for (const t of terms) args.push('-e', t);
  try {
    // only "file:line", never the matching text, so a hit doesn't print the secret into the log
    return git(cwd, args)
      .split('\n')
      .filter(Boolean)
      .map((l) => l.split(':').slice(0, 2).join(':'));
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
}

export function check(cwd, denylist) {
  const problems = [];
  const notes = [];
  for (const p of trackedPrivate(cwd)) problems.push(`Tracked under private/: ${p}`);
  if (denylist === undefined || denylist.trim() === '') {
    notes.push('The DENYLIST secret is not set, so the denylist part was skipped. Only private/ was checked.');
  } else {
    for (const at of denylistHits(cwd, denylist)) problems.push(`A denylisted string is in ${at}`);
  }
  return { problems, notes };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { problems, notes } = check(process.argv[2] ?? process.cwd(), process.env.DENYLIST);
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
