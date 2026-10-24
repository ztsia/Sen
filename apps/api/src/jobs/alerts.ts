import { and, eq } from 'drizzle-orm';
import { schema } from '@sen/db';
import type { Db } from '../db';

type RunAs = <T>(fn: (db: Db) => Promise<T>) => Promise<T>;

/**
 * Sends a reminder once per key (spec §15 `alerts_sent`): the key is claimed in its own short
 * transaction, then `send` runs outside it (a push is a network call), and a send that throws
 * releases the claim so the next run tries again. Answers whether it sent. A job run twice, or two
 * ticks at once, send it once.
 */
export async function once(db: RunAs, userId: string, key: string, send: () => Promise<unknown>): Promise<boolean> {
  const t = schema.alertsSent;
  const claimed = await db((tx) =>
    tx.insert(t).values({ userId, alertKey: key }).onConflictDoNothing().returning({ id: t.id }),
  );
  if (!claimed.length) return false;
  try {
    await send();
  } catch (e) {
    await db((tx) => tx.delete(t).where(and(eq(t.userId, userId), eq(t.alertKey, key))));
    throw e;
  }
  return true;
}
