import { timeLabel } from '@/lib/dates';
import { ApiFailure, apiCall } from './api/client';

// The two checks the admin runs from Settings → Data, and the dev panel too (B06): they double as
// production's test menu. Each answers with the sentence its toast says.

const NOT_HERE = 'Not in this preview';

/** A test push to every phone registered for this person. Resolves to what to tell them; never throws. */
export async function sendTestPush(): Promise<string> {
  if (__SEN_BACKEND__ !== 'api') return NOT_HERE;
  try {
    const { sent } = await apiCall<{ sent: number }>('/push/test', { body: {} });
    if (sent === 0) return 'No phone is registered for push';
    return `Sent to ${sent} ${sent === 1 ? 'phone' : 'phones'}`;
  } catch (e) {
    return e instanceof ApiFailure ? e.message : 'The test push didn’t go. Try again.';
  }
}

/** A one-off test job a minute or so ahead, whose push arrives when it runs. */
export async function scheduleTestJob(): Promise<string> {
  if (__SEN_BACKEND__ !== 'api') return NOT_HERE;
  try {
    const { runAt, push } = await apiCall<{ runAt: string; push: boolean }>('/jobs/test', { body: {} });
    const at = timeLabel(new Date(runAt));
    return push
      ? `Test job set for ${at}. When it runs, each phone registered for push gets one.`
      : `Test job set for ${at}. Push isn’t set up here, so it only runs.`;
  } catch (e) {
    return e instanceof ApiFailure ? e.message : 'The test job didn’t go. Try again.';
  }
}

/** R2's storage in Settings → Data; past the warning (half, D142 (3)) it says so in words (patterns.md §3). */
export const storageWords = ({ used, allowance, warnAt }: { used: number; allowance: number; warnAt: number }) =>
  `${formatBytes(used)} of ${formatBytes(allowance)}${used >= warnAt ? ', over half' : ''}`;

/**
 * Bytes as decimal MB or GB, for storage: `120 MB`, `1.24 GB`, `12 GB`. Whole numbers of bytes in,
 * words out, with no floating-point text: hundredths are worked out in integers.
 */
export function formatBytes(bytes: number): string {
  // from 999.5 MB, which would round to 1000 MB, it says GB (QA B06 run 3, note 9)
  if (bytes < 999_500_000) return `${Math.round(bytes / 1_000_000)} MB`;
  const hundredths = Math.round(bytes / 10_000_000);
  if (hundredths >= 1000) return `${Math.round(bytes / 1_000_000_000)} GB`;
  const digits = String(hundredths).padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)} GB`;
}
