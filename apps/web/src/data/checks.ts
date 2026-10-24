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
    const { runAt } = await apiCall<{ runAt: string }>('/jobs/test', { body: {} });
    return `Test job set for ${timeLabel(new Date(runAt))}. Its push arrives then.`;
  } catch (e) {
    return e instanceof ApiFailure ? e.message : 'The test job didn’t go. Try again.';
  }
}

/**
 * Bytes as decimal MB or GB, for storage: `120 MB`, `1.24 GB`, `12 GB`. Whole numbers of bytes in,
 * words out, with no floating-point text: hundredths are worked out in integers.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1_000_000_000) return `${Math.round(bytes / 1_000_000)} MB`;
  const hundredths = Math.round(bytes / 10_000_000);
  if (hundredths >= 1000) return `${Math.round(bytes / 1_000_000_000)} GB`;
  const digits = String(hundredths).padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)} GB`;
}
