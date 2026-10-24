import { describe, expect, it } from 'vitest';
import { formatBytes, scheduleTestJob, sendTestPush } from './checks';

describe('storage, in words', () => {
  it('uses decimal GB with two decimals under 10 GB', () => {
    expect(formatBytes(1_240_000_000)).toBe('1.24 GB');
    expect(formatBytes(1_000_000_000)).toBe('1.00 GB');
    expect(formatBytes(9_996_000_000)).toBe('10 GB');
    expect(formatBytes(10_000_000_000)).toBe('10 GB');
  });
  it('uses MB under a GB', () => {
    expect(formatBytes(0)).toBe('0 MB');
    expect(formatBytes(120_400_000)).toBe('120 MB');
  });
});

describe('the checks in a build without the server', () => {
  it('call nothing and say so', async () => {
    expect(await sendTestPush()).toBe('Not in this preview');
    expect(await scheduleTestJob()).toBe('Not in this preview');
  });
});
