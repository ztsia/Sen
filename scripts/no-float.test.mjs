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

  it('passes the money module as it is', async () => {
    const [result] = await eslint.lintFiles(['packages/core/src/money.ts']);
    expect(result.messages).toEqual([]);
  });
});
