import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLive } from '@/data/realtime';
import { updatedAgo } from '@/lib/dates';
import { LiveStamp } from './live-stamp';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  useLive.setState({ status: 'off', updatedAt: null, forced: null });
});

describe('the stamp’s wording', () => {
  const at = new Date('2026-10-24T10:00:00Z');
  const later = (ms: number) => new Date(at.getTime() + ms);
  it('counts up from just now to hours', () => {
    expect(updatedAgo(at, later(20_000))).toBe('Updated just now');
    expect(updatedAgo(at, later(60_000))).toBe('Updated 1 min ago');
    expect(updatedAgo(at, later(2 * 60_000 + 5000))).toBe('Updated 2 min ago');
    expect(updatedAgo(at, later(59 * 60_000))).toBe('Updated 59 min ago');
    expect(updatedAgo(at, later(60 * 60_000))).toBe('Updated 1 h ago');
  });
});

describe('the stamp', () => {
  it('shows only while the relay is down', () => {
    render(<LiveStamp />);
    expect(screen.queryByText(/Updated/)).toBeNull();
    act(() => useLive.setState({ status: 'live', updatedAt: new Date() }));
    expect(screen.queryByText(/Updated/)).toBeNull();
    act(() => useLive.setState({ status: 'down' }));
    expect(screen.getByText('Updated just now')).toBeTruthy();
    act(() => useLive.setState({ status: 'live' }));
    expect(screen.queryByText(/Updated/)).toBeNull();
  });

  it('follows the clock, each 30 s', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T10:00:00Z'));
    render(<LiveStamp />);
    act(() => useLive.setState({ status: 'down', updatedAt: new Date() }));
    expect(screen.getByText('Updated just now')).toBeTruthy();
    act(() => void vi.advanceTimersByTime(60_000));
    expect(screen.getByText('Updated 1 min ago')).toBeTruthy();
    act(() => void vi.advanceTimersByTime(60_000));
    expect(screen.getByText('Updated 2 min ago')).toBeTruthy();
  });

  it('shows when the dev panel forces it', () => {
    render(<LiveStamp />);
    act(() => useLive.setState({ forced: { updatedAt: new Date(Date.now() - 120_000) } }));
    expect(screen.getByText('Updated 2 min ago')).toBeTruthy();
  });
});
