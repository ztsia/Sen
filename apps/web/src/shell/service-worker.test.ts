import { describe, expect, it } from 'vitest';
import { OPEN_MS, whenReady } from './service-worker';

describe('a new version that is ready (D138)', () => {
  it('takes over when Sen was only just opened and nothing was touched', () => {
    expect(whenReady({ sinceOpen: 2_000, touched: false, formOpen: false })).toBe('switch');
  });
  it('is offered once the person has touched the screen', () => {
    expect(whenReady({ sinceOpen: 2_000, touched: true, formOpen: false })).toBe('offer');
  });
  it('is offered while a form or sheet is open', () => {
    expect(whenReady({ sinceOpen: 2_000, touched: false, formOpen: true })).toBe('offer');
  });
  it('is offered once Sen has been open a while', () => {
    expect(whenReady({ sinceOpen: OPEN_MS, touched: false, formOpen: false })).toBe('offer');
  });
});
