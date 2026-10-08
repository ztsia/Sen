// The hygiene check must fail on a planted private/ file and on a planted denylist string (B01, done-when 7).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { check } from './hygiene.mjs';

let dir;
const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
const put = (rel, body) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), body);
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sen-hygiene-'));
  git('init', '-q');
  put('.gitignore', 'private/\n');
  put('fixtures/notification.txt', 'Payment of RM12.90 to KOPI KAWAN\n');
  git('add', '.');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('the hygiene check', () => {
  it('passes a clean repo, and says the denylist was skipped when unset', () => {
    const r = check(dir, undefined);
    expect(r.problems).toEqual([]);
    expect(r.notes.join(' ')).toMatch(/denylist part was skipped/);
  });

  it('fails on a private/ file forced past .gitignore', () => {
    put('private/ess/notes.md', 'anything');
    git('add', '-f', 'private/ess/notes.md');
    expect(check(dir, undefined).problems).toEqual(['Tracked under private/: private/ess/notes.md']);
  });

  it('fails on a nested private/ folder too', () => {
    put('apps/web/private/x.json', '{}');
    git('add', '-f', 'apps/web/private/x.json');
    expect(check(dir, undefined).problems).toHaveLength(1);
  });

  it('fails on a planted denylist string, in any case, and never prints it', () => {
    put('fixtures/ess.json', '{ "host": "Ess.Example-Employer.test" }\n');
    git('add', '.');
    const r = check(dir, 'example-employer\nsomething else\n');
    expect(r.problems).toEqual(['A denylisted string is in fixtures/ess.json:1']);
    expect(r.problems.join(' ')).not.toMatch(/employer/i);
  });

  // QA B01, finding 8: a name in a file's path, or only in an earlier commit of the PR, is just as public.
  it('fails on a denylist string in a file path, and never prints it', () => {
    put('qa/Example-Employer/a.txt', 'nothing here\n');
    git('add', '.');
    const r = check(dir, 'example-employer');
    expect(r.problems).toEqual(['A denylisted string is in the path qa/***/a.txt']);
    expect(r.problems.join(' ')).not.toMatch(/employer/i);
  });

  it("fails on a denylist string or private/ file in an earlier commit of the PR's range, since deleted", () => {
    git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'base');
    const base = git('rev-parse', 'HEAD').trim();
    put('fixtures/ess.json', '{ "host": "ess.example-employer.test" }\n');
    put('private/x.txt', 'x');
    put('notes/example-employer.md', 'x');
    git('add', '.');
    git('add', '-f', 'private/x.txt');
    git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'oops');
    const oops = git('rev-parse', '--short', 'HEAD').trim();
    git('rm', '-q', '-r', '--cached', 'fixtures/ess.json', 'private/x.txt', 'notes');
    git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'tidy');
    // the tree at HEAD is clean
    expect(check(dir, 'example-employer').problems).toEqual([]);
    // but the range still holds it
    const r = check(dir, 'example-employer', { base, head: 'HEAD' });
    expect(r.problems).toEqual([
      `Tracked under private/: private/x.txt (in ${oops})`,
      `A denylisted string is in fixtures/ess.json:1 (in ${oops})`,
      `A denylisted string is in the path notes/***.md (in ${oops})`,
    ]);
    expect(r.problems.join(' ')).not.toMatch(/employer/i);
  });

  // QA B01 run 2, finding 2: a commit message, a binary file and a UTF-16 file are just as public.
  it('fails on a denylist string in a binary or UTF-16 file, and never prints it', () => {
    fs.writeFileSync(
      path.join(dir, 'shot.png'),
      Buffer.from('PNG\0\x01binary-ish Example-Employer inside\0', 'latin1'),
    );
    fs.writeFileSync(path.join(dir, 'notes.txt'), Buffer.from('\ufeffhost: ess.example-employer.test\n', 'utf16le'));
    git('add', '.');
    const r = check(dir, 'example-employer');
    expect(r.problems).toEqual([
      'A denylisted string is in notes.txt (UTF-16)',
      'A denylisted string is in shot.png (binary)',
    ]);
    expect(r.problems.join(' ')).not.toMatch(/employer/i);
  });

  it("fails on a denylist string in a commit message in the PR's range", () => {
    const commit = (m) => git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', m);
    commit('base');
    const base = git('rev-parse', 'HEAD').trim();
    commit('Fix the claim for Example-Employer travel');
    const bad = git('rev-parse', '--short', 'HEAD').trim();
    commit('tidy');
    const r = check(dir, 'example-employer', { base, head: 'HEAD' });
    expect(r.problems).toEqual([`A denylisted string is in the message of ${bad}`]);
    expect(r.problems.join(' ')).not.toMatch(/employer/i);
  });

  it('says so when a denylist term is too short to check, rather than that the secret is unset', () => {
    const r = check(dir, 'MY\nnot-in-the-repo');
    expect(r.notes.join(' ')).toMatch(/1 denylist term is under 3 characters and was ignored/);
    expect(r.notes.join(' ')).not.toMatch(/not set/);
  });

  it('passes when the denylist is set and nothing matches', () => {
    expect(check(dir, 'not-in-the-repo').problems).toEqual([]);
  });
});
