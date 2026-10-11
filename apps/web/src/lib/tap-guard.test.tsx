import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReviewRow } from '@/blocks/rows';
import { resetTapGuard, settleTap } from './tap-guard';

// QA B03 run 2, findings 2, 17 and 21: a double tap answers once. After a change, the next tap within
// the settle time is ignored, so the row that slides into place under the finger isn't answered too.
describe('one change per double tap', () => {
  beforeEach(resetTapGuard);
  afterEach(cleanup);
  it('lets the first tap through and ignores a second within the settle time', () => {
    let now = 1000;
    const clock = () => now;
    expect(settleTap(clock)).toBe(true);
    now += 40;
    expect(settleTap(clock)).toBe(false);
    now += 600;
    expect(settleTap(clock)).toBe(true);
  });

  it('a Review row answers once when tapped twice, 10 ms apart', () => {
    const onSelect = vi.fn(() => ({ said: 'Done', undo: () => {} }));
    render(<ReviewRow question="RM9.50 · ROTI BAKAR 88" knows="New" answers={[{ label: 'Meals', onSelect }]} />);
    const button = screen.getByRole('button', { name: 'Meals' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('a second tap that lands on the next row, which slid into place, answers nothing', () => {
    const first = vi.fn(() => ({ said: 'Done', undo: () => {} }));
    const second = vi.fn(() => ({ said: 'Done', undo: () => {} }));
    render(
      <>
        <ReviewRow question="RM9.50 · ROTI BAKAR 88" knows="New" answers={[{ label: 'Meals', onSelect: first }]} />
        <ReviewRow question="RM8.00 · SITI AMINAH" knows="New" answers={[{ label: 'Groceries', onSelect: second }]} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Meals' }));
    fireEvent.click(screen.getByRole('button', { name: 'Groceries' }));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});
