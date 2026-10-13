import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  // QA B04 redesign run 2, 3: tailwind-merge took text-label for a colour and dropped it beside one
  it('keeps the label size beside a text colour, and lets a later size replace it', () => {
    expect(cn('text-label text-primary-foreground')).toBe('text-label text-primary-foreground');
    expect(cn('text-label', 'text-sm')).toBe('text-sm');
  });
});
