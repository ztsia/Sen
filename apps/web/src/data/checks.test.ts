import { describe, expect, it } from 'vitest';
import { formatBytes, scheduleTestJob, sendTestPush, storageWords } from './checks';

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
    // never 1000 MB: it rounds up to a GB (QA B06 run 3, note 9)
    expect(formatBytes(999_499_999)).toBe('999 MB');
    expect(formatBytes(999_500_000)).toBe('1.00 GB');
    expect(formatBytes(999_999_999)).toBe('1.00 GB');
  });
  // a warning says what's wrong in words, not only by colour and icon (patterns.md §3; run 3, finding 6)
  it('says when backups pass half of R2', () => {
    const r2 = { allowance: 10_000_000_000, warnAt: 5_000_000_000 };
    expect(storageWords({ ...r2, used: 1_500_000_000 })).toBe('1.50 GB of 10 GB');
    expect(storageWords({ ...r2, used: 5_700_000_000 })).toBe('5.70 GB of 10 GB, over half');
  });
});

describe('the checks in a build without the server', () => {
  it('call nothing and say so', async () => {
    expect(await sendTestPush()).toBe('Not in this preview');
    expect(await scheduleTestJob()).toBe('Not in this preview');
  });
});
