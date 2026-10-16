import { and, eq, isNull, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { Hono } from 'hono';
import { z } from 'zod';
import { Id } from '@sen/core/schema';
import { audit } from './audit';
import type { Env } from './context';
import { ApiError, notFound, parse, readJson } from './errors';

/** A table the pattern serves: an id the client made, its person, and maybe a tombstone. */
type Columns = { id: PgColumn; userId: PgColumn; updatedAt?: PgColumn; deletedAt?: PgColumn };
type ResourceTable = PgTable & Columns;

export interface ResourceOptions<S extends z.ZodObject> {
  /** Its path under /api/r, and its name in the audit log. */
  name: string;
  table: ResourceTable;
  /** What the client may write: every column but `id`, `user_id` and the timestamps. */
  fields: S;
}

/**
 * The generic resource routes (spec §16): plain reads and writes of your own rows, for every table
 * that has no logic of its own. Later slices mount one per table:
 * - `GET /` lists your rows, `GET /:id` one of them
 * - `PUT /:id` upserts by the id the client made, so a retry is a no-op (every input has a dedupe key)
 * - `PATCH /:id` writes only the fields sent: the outbox sends changed fields (§5)
 * - `DELETE /:id` leaves a tombstone (`deleted_at`) where the table has one, so a sync can tell
 *
 * RLS decides whose rows these reach. The routes still set `user_id` to the signed-in person, and an
 * id that's someone else's fails RLS's check (403), never touches their row. Every write is audited
 * in its own transaction.
 */
export function resource<S extends z.ZodObject>(o: ResourceOptions<S>) {
  const t = o.table;
  const live = (...w: SQL[]) => and(...w, ...(t.deletedAt ? [isNull(t.deletedAt)] : []));
  const r = new Hono<Env>();

  r.get('/', async (c) => {
    const rows = await c.var.db((db) => db.select().from(t).where(live()));
    return c.json(rows);
  });

  r.get('/:id', async (c) => {
    const id = parse(Id, c.req.param('id'));
    const [row] = await c.var.db((db) =>
      db
        .select()
        .from(t)
        .where(live(eq(t.id, id))),
    );
    if (!row) throw notFound();
    return c.json(row);
  });

  r.put('/:id', async (c) => {
    const id = parse(Id, c.req.param('id'));
    const fields = parse(o.fields.strict(), await readJson(c));
    const person = c.var.person.id;
    const row = await c.var.db(async (db) => {
      const [before] = await db.select().from(t).where(eq(t.id, id)).for('update');
      // the same row again (a retried sync) is a no-op: no write, no audit entry (QA B05 run 1, 7)
      if (
        before &&
        Object.entries(fields).every(
          ([k, v]) => JSON.stringify((before as Record<string, unknown>)[k]) === JSON.stringify(v),
        )
      )
        return before;
      const values = { ...fields, id, userId: person, ...(t.updatedAt ? { updatedAt: new Date() } : {}) };
      const [after] = await db
        .insert(t)
        .values(values as never)
        .onConflictDoUpdate({ target: t.id, set: values as never })
        .returning();
      await audit(db, {
        userId: person,
        entity: o.name,
        entityId: id,
        action: before ? 'update' : 'create',
        before,
        after,
        actor: 'user',
      });
      return after;
    });
    return c.json(row);
  });

  r.patch('/:id', async (c) => {
    const id = parse(Id, c.req.param('id'));
    const fields = parse(o.fields.partial().strict(), await readJson(c));
    if (!Object.keys(fields).length) throw new ApiError(400, 'invalid', 'Nothing to change.');
    const person = c.var.person.id;
    const row = await c.var.db(async (db) => {
      const [before] = await db
        .select()
        .from(t)
        .where(live(eq(t.id, id)));
      if (!before) throw notFound();
      const [after] = await db
        .update(t)
        .set({ ...fields, ...(t.updatedAt ? { updatedAt: new Date() } : {}) } as never)
        .where(eq(t.id, id))
        .returning();
      await audit(db, { userId: person, entity: o.name, entityId: id, action: 'update', before, after, actor: 'user' });
      return after;
    });
    return c.json(row);
  });

  r.delete('/:id', async (c) => {
    const id = parse(Id, c.req.param('id'));
    const person = c.var.person.id;
    await c.var.db(async (db) => {
      const [before] = await db
        .select()
        .from(t)
        .where(live(eq(t.id, id)));
      if (!before) throw notFound();
      if (t.deletedAt)
        await db
          .update(t)
          .set({ deletedAt: new Date() } as never)
          .where(eq(t.id, id));
      else await db.delete(t).where(eq(t.id, id));
      await audit(db, { userId: person, entity: o.name, entityId: id, action: 'delete', before, actor: 'user' });
    });
    return c.body(null, 204);
  });

  return r;
}
