import { createHash } from 'node:crypto';

/**
 * The ids the phone and the server both derive (spec §5, §6.5, §15 *Key decisions*), as UUIDv5
 * (RFC 9562) under namespaces fixed here and in the shell's `Ids.kt`. Neither may ever change once
 * events sync: a changed one would land a re-captured notification on a new row.
 *
 * - An event's id is of its person and its dedupe key, so the same notification captured again,
 *   after a reconnect, a reinstall or on a second phone, is the same row, and no two people's ids
 *   can collide.
 * - A transaction's is of its event's id and an index, because one notification can make two
 *   transactions (a salary split into income and repayments, D45).
 */
export const EVENT_NAMESPACE = 'e41973d7-5fe2-4c27-bace-b79fbaa03dc0';
export const TXN_NAMESPACE = '190709cc-cb32-4ded-b5e8-236da7755252';

export function uuidV5(namespace: string, name: string): string {
  const ns = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  if (ns.length !== 16) throw new Error('a namespace is a UUID');
  const h = createHash('sha1').update(ns).update(name, 'utf8').digest().subarray(0, 16);
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

export const eventId = (userId: string, dedupeKey: string) => uuidV5(EVENT_NAMESPACE, `${userId}:${dedupeKey}`);
export const txnId = (eventId: string, index: number) => uuidV5(TXN_NAMESPACE, `${eventId}:${index}`);
