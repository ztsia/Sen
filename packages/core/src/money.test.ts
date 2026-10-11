import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  MAX_SEN,
  apportion,
  formatSen,
  fxApprox,
  medianSen,
  moneyParts,
  parseSen,
  percent,
  scaleSen,
  spokenSen,
} from './money';

const ok = (sen: number) => ({ ok: true, sen });

describe('parseSen', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['1,284.50', 128450],
    ['0', 0],
    ['0.01', 1],
    ['0.5', 50],
    ['  9.90 ', 990],
    ['1234', 123400],
    ['12,345,678.90', 1234567890],
    ['99,999,999,999.99', MAX_SEN],
  ])('accepts %j as %i sen', (text, sen) => {
    expect(parseSen(text)).toEqual(ok(sen));
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['12.345', 'decimals'],
    ['0.001', 'decimals'],
    ['-12', 'format'],
    ['+12', 'format'],
    ['12-3', 'format'],
    ['1-2.50', 'format'],
    ['12.', 'format'],
    ['.5', 'format'],
    ['1.2.3', 'format'],
    ['12,84', 'format'],
    ['1,2845', 'format'],
    [',284', 'format'],
    ['1284,', 'format'],
    ['1,,284', 'format'],
    ['1234,567', 'format'],
    ['012', 'format'],
    ['RM12', 'format'],
    ['12 50', 'format'],
    ['1e3', 'format'],
    ['١٢', 'format'],
    ['NaN', 'format'],
    ['Infinity', 'format'],
    ['0x10', 'format'],
    ['100,000,000,000.00', 'too-large'],
    ['123456789012', 'too-large'],
  ])('rejects %j (%s)', (text, reason) => {
    expect(parseSen(text)).toEqual({ ok: false, reason });
  });
});

describe('formatSen and spokenSen', () => {
  it.each([
    [0, 'RM0.00', 'RM 0.00'],
    [1, 'RM0.01', 'RM 0.01'],
    [990, 'RM9.90', 'RM 9.90'],
    [128450, 'RM1,284.50', 'RM 1,284.50'],
    [420000, 'RM4,200.00', 'RM 4,200.00'],
    [-1290, '−RM12.90', 'minus RM 12.90'],
    [123456789, 'RM1,234,567.89', 'RM 1,234,567.89'],
  ])('%i sen is %s, read as %s', (sen, text, spoken) => {
    expect(formatSen(sen)).toBe(text);
    expect(spokenSen(sen)).toBe(spoken);
  });

  it('marks money in with a plus, and never zero', () => {
    expect(formatSen(420000, { plus: true })).toBe('+RM4,200.00');
    expect(spokenSen(420000, { plus: true })).toBe('plus RM 4,200.00');
    expect(formatSen(0, { plus: true })).toBe('RM0.00');
  });

  it('gives the parts a look draws', () => {
    expect(moneyParts(128450)).toEqual({ sign: '', currency: 'RM', whole: '1,284', cents: '50' });
  });

  it('refuses anything that is not whole sen', () => {
    expect(() => formatSen(12.5)).toThrow(RangeError);
    expect(() => formatSen(Number.NaN)).toThrow(RangeError);
    expect(() => formatSen(2 ** 53)).toThrow(RangeError);
  });
});

describe('apportion', () => {
  it('splits by largest remainder', () => {
    expect(apportion(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(apportion(1000, [1, 2, 3])).toEqual([167, 333, 500]);
    expect(apportion(5, [0, 1])).toEqual([0, 5]);
    expect(apportion(-100, [1, 1, 1])).toEqual([-34, -33, -33]);
    expect(apportion(0, [3, 4])).toEqual([0, 0]);
  });

  it('refuses nothing to split between', () => {
    expect(() => apportion(100, [])).toThrow(RangeError);
    expect(() => apportion(100, [0, 0])).toThrow(RangeError);
    expect(() => apportion(100, [1, -1])).toThrow(RangeError);
    expect(() => apportion(100, [0.5, 1])).toThrow(RangeError);
  });
});

const senArb = fc.integer({ min: 0, max: MAX_SEN });

describe('properties', () => {
  it('format, then parse, gives the same value', () => {
    fc.assert(
      fc.property(senArb, (sen) => {
        expect(parseSen(formatSen(sen).replace('RM', ''))).toEqual(ok(sen));
      }),
      { numRuns: 2000 },
    );
  });

  it('parses its own two-decimal text without grouping too', () => {
    fc.assert(
      fc.property(senArb, (sen) => {
        const p = moneyParts(sen);
        expect(parseSen(`${p.whole.replaceAll(',', '')}.${p.cents}`)).toEqual(ok(sen));
      }),
    );
  });

  it('apportioned parts always add up to the total, each within one sen of its share', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -MAX_SEN, max: MAX_SEN }),
        fc
          .array(fc.integer({ min: 0, max: 10_000_000_000 }), { minLength: 1, maxLength: 12 })
          .filter((w) => w.some((x) => x > 0)),
        (total, weights) => {
          const parts = apportion(total, weights);
          expect(parts).toHaveLength(weights.length);
          expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
          const sum = weights.reduce((a, b) => a + BigInt(b), 0n);
          parts.forEach((part, i) => {
            expect(Number.isSafeInteger(part)).toBe(true);
            // |part| is the floor or the ceiling of |total| × weight / sum
            const exact = BigInt(Math.abs(total)) * BigInt(weights[i] ?? 0);
            const floor = exact / sum;
            const abs = BigInt(Math.abs(part));
            expect(abs === floor || abs === floor + 1n).toBe(true);
          });
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('rejects any text with three or more decimals', () => {
    fc.assert(
      fc.property(fc.nat({ max: 999_999 }), fc.stringMatching(/^[0-9]{3,6}$/), (whole, frac) => {
        expect(parseSen(`${whole}.${frac}`)).toEqual({ ok: false, reason: 'decimals' });
      }),
    );
  });

  it('never accepts a sign anywhere in the text', () => {
    fc.assert(
      fc.property(senArb, fc.constantFrom('-', '+', '−'), fc.nat(), (sen, sign, at) => {
        const text = formatSen(sen).replace('RM', '');
        const i = at % (text.length + 1);
        expect(parseSen(text.slice(0, i) + sign + text.slice(i)).ok).toBe(false);
      }),
    );
  });
});

describe('percent', () => {
  it('shows a share as a whole percent, rounded', () => {
    expect(percent(0.42)).toBe(42);
    expect(percent(0.875)).toBe(88);
    expect(percent(1.2)).toBe(120);
    expect(percent(0)).toBe(0);
  });
});

describe('scaleSen, medianSen and fxApprox', () => {
  it('scales exactly, rounding half away from zero', () => {
    expect(scaleSen(100, 1, 3)).toBe(33);
    expect(scaleSen(5, 1, 2)).toBe(3);
    expect(scaleSen(-5, 1, 2)).toBe(-3);
    expect(scaleSen(291550, 30, 19)).toBe(460342);
  });
  it('takes the median of sen', () => {
    expect(medianSen([])).toBeNull();
    expect(medianSen([300, 100, 200])).toBe(200);
    expect(medianSen([100, 201])).toBe(151);
  });
  it('shows another currency in ringgit at a rate given as text', () => {
    expect(fxApprox(2000, '4.2550')).toBe(8510);
    expect(fxApprox(999, '4.2')).toBe(4196);
    expect(() => fxApprox(100, '4.25501')).toThrow();
  });
});
