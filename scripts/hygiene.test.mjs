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

  it('passes when the denylist is set and nothing matches', () => {
    expect(check(dir, 'not-in-the-repo').problems).toEqual([]);
  });
});
