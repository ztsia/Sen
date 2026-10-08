/**
 * Money is integer sen, never a float (CLAUDE.md, non-negotiables; spec §4 principle 2).
 *
 * Every function here takes or returns whole sen as a safe integer. Text typed by a person is parsed
 * digit by digit into sen, so no value ever passes through a float: there is no parseFloat, no
 * Number() of a decimal string and no toFixed anywhere in this file, and a lint rule keeps it so
 * (eslint.config.js, money files).
 */

/** The largest amount a person may type: RM99,999,999,999.99, well inside a safe integer. */
export const MAX_SEN = 9_999_999_999_999;

export type ParseResult =
  { ok: true; sen: number } | { ok: false; reason: 'empty' | 'format' | 'decimals' | 'too-large' };

const DIGIT = /^[0-9]$/;

/** Folds a run of ASCII digits into an integer, one digit at a time. */
function digitsToInt(digits: string): number {
  let n = 0;
  for (const ch of digits) n = n * 10 + (ch.charCodeAt(0) - 48);
  return n;
}

/**
 * Parses typed text into sen. Accepts `12`, `12.5`, `12.50` and `1,284.50`: digits, optionally
 * grouped by commas in threes, and at most two decimals. Rejects three decimals, any sign, a bare
 * or trailing point, misplaced commas, leading zeros and anything else. Spaces around the text are
 * ignored.
 */
export function parseSen(input: string): ParseResult {
  const text = input.trim();
  if (text === '') return { ok: false, reason: 'empty' };

  const point = text.indexOf('.');
  const whole = point === -1 ? text : text.slice(0, point);
  const frac = point === -1 ? '' : text.slice(point + 1);

  if (point !== -1) {
    if (frac.includes('.')) return { ok: false, reason: 'format' };
    if (frac === '') return { ok: false, reason: 'format' };
    for (const ch of frac) if (!DIGIT.test(ch)) return { ok: false, reason: 'format' };
    if (frac.length > 2) return { ok: false, reason: 'decimals' };
  }

  if (whole === '') return { ok: false, reason: 'format' };
  const groups = whole.split(',');
  if (groups.length > 1) {
    const [head, ...rest] = groups as [string, ...string[]];
    if (head.length < 1 || head.length > 3) return { ok: false, reason: 'format' };
    if (rest.some((g) => g.length !== 3)) return { ok: false, reason: 'format' };
  }
  const digits = groups.join('');
  for (const ch of digits) if (!DIGIT.test(ch)) return { ok: false, reason: 'format' };
  if (digits.length > 1 && digits.startsWith('0')) return { ok: false, reason: 'format' };
  if (digits.length > 11) return { ok: false, reason: 'too-large' };

  const sen = digitsToInt(digits) * 100 + digitsToInt(frac.padEnd(2, '0'));
  if (sen > MAX_SEN) return { ok: false, reason: 'too-large' };
  return { ok: true, sen };
}

function assertSen(sen: number): void {
  if (!Number.isSafeInteger(sen)) throw new RangeError(`Not a whole number of sen: ${String(sen)}`);
}

const MINUS = '−';

/** Thousands separators on a run of digits. */
function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export interface MoneyParts {
  /** `−` for a negative amount, `+` when asked to mark money in, otherwise empty. */
  sign: string;
  currency: 'RM';
  /** The ringgit, with thousands separators: `1,284`. */
  whole: string;
  /** Always two digits: `50`. */
  cents: string;
}

export interface FormatOptions {
  /** Money in carries a `+` (patterns.md §3). Money out has no sign. */
  plus?: boolean;
}

/** The parts of an amount, for a look that draws the large figure in its own material. */
export function moneyParts(sen: number, opts: FormatOptions = {}): MoneyParts {
  assertSen(sen);
  const abs = Math.abs(sen);
  const ringgit = Math.trunc(abs / 100);
  const cents = abs % 100;
  return {
    sign: sen < 0 ? MINUS : opts.plus && sen > 0 ? '+' : '',
    currency: 'RM',
    whole: group(String(ringgit)),
    cents: String(cents).padStart(2, '0'),
  };
}

/** `RM1,284.50`, `+RM4,200.00`, `−RM12.90`. */
export function formatSen(sen: number, opts: FormatOptions = {}): string {
  const p = moneyParts(sen, opts);
  return `${p.sign}${p.currency}${p.whole}.${p.cents}`;
}

/** How a screen reader says it: `RM 1,284.50`, `plus RM 4,200.00`, `minus RM 12.90`. */
export function spokenSen(sen: number, opts: FormatOptions = {}): string {
  const p = moneyParts(sen, opts);
  const sign = p.sign === MINUS ? 'minus ' : p.sign === '+' ? 'plus ' : '';
  return `${sign}RM ${p.whole}.${p.cents}`;
}

/**
 * Splits `total` sen into parts in proportion to `weights` (whole numbers, such as each person's
 * share in sen or a count of items), by largest remainder: each part gets its floor, and the sen
 * left over go one each to the largest remainders, earlier parts first on a tie. The parts always
 * add up to the total exactly. A negative total, such as a refund, is split the same way and
 * negated.
 */
export function apportion(total: number, weights: readonly number[]): number[] {
  assertSen(total);
  if (weights.length === 0) throw new RangeError('Nothing to apportion between');
  let sum = 0n;
  for (const w of weights) {
    if (!Number.isSafeInteger(w) || w < 0) throw new RangeError(`A weight must be a whole number ≥ 0: ${String(w)}`);
    sum += BigInt(w);
  }
  if (sum === 0n) throw new RangeError('The weights add up to nothing');

  const sign = total < 0 ? -1 : 1;
  const t = BigInt(Math.abs(total));
  const floors = weights.map((w) => (t * BigInt(w)) / sum);
  const rems = weights.map((w, i) => ({ i, r: (t * BigInt(w)) % sum }));
  let left = t - floors.reduce((a, b) => a + b, 0n);
  rems.sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  for (const { i } of rems) {
    if (left === 0n) break;
    floors[i] = (floors[i] ?? 0n) + 1n;
    left -= 1n;
  }
  // A BigInt part is a whole number no larger than the total, so it converts exactly; `|| 0` turns −0 into 0.
  // eslint-disable-next-line no-restricted-syntax -- BigInt to integer sen, never text or a float
  return floors.map((f) => sign * Number(f) || 0);
}

/** A share (0.42) as a whole percent (42), for words beside a chart. Never an amount. */
export const percent = (share: number): number => Math.round(share * 100);
