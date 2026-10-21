import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { played, resetHaptics } from '@/lib/haptics';
import { FieldError } from './field';

// The error haptic (B05, QA Feel run 2, 7 and 9): felt when a refusal follows a tap or Enter, never
// while typing, nor for an error a screen shows on load.
const key = (k: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k }));

beforeEach(() => resetHaptics());

describe('FieldError', () => {
  it('plays reject when an error follows a tap', () => {
    const { rerender } = render(<FieldError />);
    act(() => void document.dispatchEvent(new Event('pointerdown')));
    rerender(<FieldError>Type an amount</FieldError>);
    expect(played).toEqual(['reject']);
  });
  it('plays reject when an error follows Enter in a field', () => {
    const { rerender } = render(<FieldError />);
    key('Enter');
    rerender(<FieldError>Type an amount</FieldError>);
    expect(played).toEqual(['reject']);
  });
  it('stays silent while typing', () => {
    const { rerender } = render(<FieldError />);
    act(() => void document.dispatchEvent(new Event('pointerdown')));
    key('1');
    rerender(<FieldError>Too many decimals</FieldError>);
    expect(played).toEqual([]);
  });
  it('stays silent for an error shown on load', () => {
    render(<FieldError>This receipt has no total</FieldError>);
    expect(played).toEqual([]);
  });
});
