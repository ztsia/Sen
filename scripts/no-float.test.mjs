// The no-float rule (eslint.config.js) must catch every way text could become a float near money.
// Each case plants one into a money file and expects ESLint to fail on it (B01, done-when 6).
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: new URL('..', import.meta.url).pathname });
const lint = async (code, filePath) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.severity === 2).map((m) => m.ruleId);
};

describe('the no-float rule', () => {
  it.each([
    ['parseFloat', 'export const sen = parseFloat("12.50") * 100;', 'no-restricted-globals'],
    ['Number.parseFloat', 'export const sen = Number.parseFloat("12.50") * 100;', 'no-restricted-properties'],
    ['toFixed', 'export const text = (1250 / 100).toFixed(2);', 'no-restricted-syntax'],
    ['Number()', 'export const sen = Math.round(Number("12.50") * 100);', 'no-restricted-syntax'],
    ['a unary +', 'const typed = "12.50"; export const sen = +typed * 100;', 'no-restricted-syntax'],
  ])('fails on a planted %s in the money module', async (_name, code, rule) => {
    expect(await lint(code, 'packages/core/src/money.ts')).toContain(rule);
  });

  it('fails on a planted parseFloat anywhere in the app', async () => {
    expect(await lint('export const x = parseFloat("1.5");', 'apps/web/src/components/row.tsx')).toContain(
      'no-restricted-globals',
    );
  });

  it('fails on a planted Number() in a money component', async () => {
    expect(await lint('export const sen = Number("12.50");', 'apps/web/src/components/money-input.tsx')).toContain(
      'no-restricted-syntax',
    );
  });

  // QA B01 finding 3: amounts flow through the blocks, the frame and the screens, not only files
  // named for money, so Number(), a unary + and parseInt are banned there too.
  it.each([
    ['Number()', 'export const sen = (typed: string) => Math.round(Number(typed) * 100);'],
    ['a unary +', 'export const sen = (typed: string) => Math.round(+typed * 100);'],
    ['parseInt', 'export const sen = (typed: string) => parseInt(typed, 10) * 100;'],
  ])('fails on a planted %s where amounts flow', async (_name, code) => {
    for (const file of [
      'apps/web/src/blocks/rows.tsx',
      'apps/web/src/blocks/detail.tsx',
      'apps/web/src/blocks/hero.tsx',
      'apps/web/src/frame/app-bar.tsx',
      'apps/web/src/screens/home.tsx',
      'apps/web/src/features/ledger/list.tsx',
      'apps/api/src/routes/transactions.ts',
      'packages/core/src/cycles.ts',
    ])
      expect(await lint(code, file), file).toContain('no-restricted-syntax');
  });

  // QA B01 run 2, finding 4: the rule bans routes, not only names.
  it.each([
    ['Number.parseInt', 'export const sen = (t: string) => Number.parseInt(t, 10) * 100;'],
    ['window.parseFloat', 'export const sen = (t: string) => window.parseFloat(t) * 100;'],
    ['globalThis.parseFloat', 'export const sen = (t: string) => globalThis.parseFloat(t) * 100;'],
    ['globalThis.Number()', 'export const sen = (t: string) => globalThis.Number(t);'],
    ['new Number()', 'export const sen = (t: string) => new Number(t).valueOf();'],
    ['valueAsNumber', 'export const sen = (el: HTMLInputElement) => el.valueAsNumber;'],
    ['sen / 100 for display', 'export const text = (sen: number) => `RM${sen / 100}`;'],
    ['Intl.NumberFormat', "export const text = (sen: number) => new Intl.NumberFormat('en-MY').format(sen);"],
    ['toLocaleString', 'export const text = (sen: number) => sen.toLocaleString();'],
    ['Math.round(x * 100)', 'export const sen = (rm: number) => Math.round(rm * 100);'],
  ])('fails on a planted %s, in a block and in core', async (_name, code) => {
    for (const file of ['apps/web/src/blocks/rows.tsx', 'packages/core/src/cycles.ts'])
      expect(await lint(code, file), file).toContain('no-restricted-syntax');
  });

  it.each([
    ['Number.parseInt', 'export const sen = (t: string) => Number.parseInt(t, 10) * 100;'],
    ['new Number()', 'export const sen = (t: string) => new Number(t).valueOf();'],
  ])('fails on a planted %s in the money module itself', async (_name, code) => {
    expect(await lint(code, 'packages/core/src/money.ts')).toContain('no-restricted-syntax');
  });

  it('passes the money module as it is', async () => {
    const [result] = await eslint.lintFiles(['packages/core/src/money.ts']);
    expect(result.messages).toEqual([]);
  });
});
