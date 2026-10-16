import { schema } from '@sen/db';
import type { Db } from './db';

export type Actor = 'user' | 'agent' | 'system';

export interface AuditEntry {
  userId: string;
  entity: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  actor: Actor;
}

/**
 * The audit log's one writer (§15): what changed, before and after, and who changed it. Append-only:
 * `app_user` may insert and read it, never update or delete (grants). Called in the same transaction
 * as the change it records, so a change is never kept without its entry.
 */
export async function audit(db: Db, e: AuditEntry): Promise<void> {
  await db.insert(schema.auditLog).values({
    userId: e.userId,
    entity: e.entity,
    entityId: e.entityId,
    action: e.action,
    before: e.before ?? null,
    after: e.after ?? null,
    actor: e.actor,
  });
}
