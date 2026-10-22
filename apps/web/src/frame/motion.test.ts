import { describe, expect, it } from 'vitest';
import { screenChange } from './motion';

// The direction rule (patterns.md §8, D140): which motion each navigation gets.
const at = (pathname: string, i: number, search = '') => ({
  pathname,
  href: pathname + search,
  state: { __TSR_index: i },
});

describe('screenChange', () => {
  it('moves nothing on the first load', () => {
    expect(screenChange(undefined, at('/', 0))).toBeNull();
  });
  it("moves nothing for a sheet's own history step, at the same address", () => {
    expect(screenChange(at('/review', 3), at('/review', 4))).toBeNull();
    expect(screenChange(at('/review', 4), at('/review', 3))).toBeNull();
  });
  it('crossfades a tab to a tab, whichever way history went', () => {
    expect(screenChange(at('/', 0), at('/review', 1))).toBe('tab');
    expect(screenChange(at('/review', 1), at('/', 0))).toBe('tab');
  });
  it('pushes a step on, and pops a step back', () => {
    expect(screenChange(at('/more', 1), at('/s/payments', 2))).toBe('forward');
    expect(screenChange(at('/s/payments', 2), at('/s/txn', 3, '?id=a'))).toBe('forward');
    expect(screenChange(at('/s/txn', 3, '?id=a'), at('/s/payments', 2))).toBe('back');
  });
  it('crossfades a screen replaced by another, and keeps still for a filter on one screen', () => {
    expect(screenChange(at('/s/payments', 2), at('/', 2))).toBe('tab');
    expect(screenChange(at('/s/payments', 2), at('/s/payments', 2, '?cycle=x'))).toBeNull();
  });
});
