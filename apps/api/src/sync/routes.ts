import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Topic } from '@sen/core/realtime';
import {
  CAPTURE_OFF,
  SYNC_LIMITS,
  SyncCaptureApp,
  SyncCommand,
  SyncEdit,
  SyncEvent,
  SyncHeartbeat,
  type CapturedView,
  type SyncChanges,
  type SyncResult,
} from '@sen/core/sync';
import { schema } from '@sen/db';
import type { Env } from '../context';
import { ApiError, parse, readJson } from '../errors';
import { runCommand } from '../routes';
import { captureHealth, morningAt } from './health';
import { dedupeKey, eventId } from './ids';

/**
 * The envelope is checked as a whole and each item on its own (§16 `/sync`), so one malformed item
 * is refused alone and never blocks the outbox behind it.
 */
const Envelope = z
  .object({
    events: z.array(z.unknown()).max(SYNC_LIMITS.events).default([]),
    edits: z.array(z.unknown()).max(SYNC_LIMITS.edits).default([]),
    captureApps: z.array(z.unknown()).max(SYNC_LIMITS.captureApps).default([]),
    commands: z.array(z.unknown()).max(SYNC_LIMITS.commands).default([]),
    heartbeat: SyncHeartbeat.nullable().default(null),
  })
  .strict();

/** An item's id for a refusal, when it has one. */
const idOf = (x: unknown) =>
  typeof x === 'object' && x && 'id' in x && typeof x.id === 'string' ? x.id.slice(0, 64) : '?';

const CHANGES_PAGE = 500;
const CAPTURED_PAGE = 50;

/**
 * The outbox's routes (B07, spec §5, §16): `/sync` from the shell, the offline copy it pulls down,
 * `/match` (an empty frame until B11), and what Home and *Captured on this phone* read. Every one
 * runs as its person under RLS; every write goes through migration 0012's functions.
 */
export function syncRoutes() {
  const r = new Hono<Env>();

  r.post('/sync', async (c) => {
    const v = c.var;
    const me = v.person.id;
    // the shell is a switch of its own (D98); a browser has no outbox to sync
    if (!v.access.features.shell) throw new ApiError(403, 'shell_off', 'The Sen app is off for you. Ask the admin.');
    const body = parse(Envelope, await readJson(c));
    // with *Capture* off, no notification is kept (§9.6): refused whole, so the shell unbinds
    if (body.events.length && !v.access.features.capture)
      throw new ApiError(403, CAPTURE_OFF, 'Capture is off for you, so Sen keeps no notifications.');

    const result: SyncResult = {
      synced: { events: [], edits: [], captureApps: [], commands: [] },
      refused: { events: [], edits: [], captureApps: [] },
      capture: v.access.features.capture,
      morningAt: null,
      now: new Date().toISOString(),
    };

    const events: SyncEvent[] = [];
    for (const raw of body.events) {
      const p = SyncEvent.safeParse(raw);
      if (!p.success) {
        result.refused.events.push({ id: idOf(raw), reason: 'malformed' });
        continue;
      }
      const e = p.data;
      const key = dedupeKey(e.package, e.notificationKey, Date.parse(e.notifiedAt), e.title, e.text, e.bigText);
      if (key !== e.dedupeKey) result.refused.events.push({ id: e.id, reason: 'dedupe_key' });
      else if (eventId(me, key) !== e.id) result.refused.events.push({ id: e.id, reason: 'id' });
      else events.push(e);
    }
    const apps: SyncCaptureApp[] = [];
    for (const raw of body.captureApps) {
      const p = SyncCaptureApp.safeParse(raw);
      if (p.success) apps.push(p.data);
      else result.refused.captureApps.push({ id: idOf(raw), reason: 'malformed' });
    }
    const edits: SyncEdit[] = [];
    for (const raw of body.edits) {
      const p = SyncEdit.safeParse(raw);
      if (p.success) edits.push(p.data);
      else result.refused.edits.push({ id: idOf(raw), reason: 'malformed' });
    }

    let addedEvents = 0;
    let appsChanged = false;
    // events first, so an edit in the same batch finds its event; one transaction for the rows
    await v.db(async (db) => {
      for (const e of events) {
        const r = await db.execute<{ added: boolean }>(
          sql`select sync_bank_event(${e.id}, ${e.package}, ${e.channelId}, ${e.notificationKey}, ${e.postedAt},
            ${e.notifiedAt}, ${e.title}, ${e.text}, ${e.bigText}, ${e.maybeOtp}, ${e.dedupeKey}) as added`,
        );
        if (r.rows[0]?.added) addedEvents++;
        result.synced.events.push(e.id);
      }
      for (const a of apps) {
        const r = await db.execute<{ outcome: string }>(
          sql`select sync_capture_app(${a.id}, ${a.package}, ${a.label}, ${a.chosenAt}, ${a.deletedAt}) as outcome`,
        );
        if (r.rows[0]?.outcome !== 'kept' && r.rows[0]?.outcome !== 'stale') appsChanged = true;
        result.synced.captureApps.push(a.id);
      }
      for (const ed of edits) {
        const [row] = await db
          .select({ id: schema.bankEvents.id })
          .from(schema.bankEvents)
          .where(eq(schema.bankEvents.id, ed.rowId));
        if (!row) {
          result.refused.edits.push({ id: ed.id, reason: 'not_found' });
          continue;
        }
        // an edit applies once: a retry after a lost answer can't undo what changed since (§5)
        const claimed = await db
          .insert(schema.outboxApplied)
          .values({ userId: me, id: ed.id, kind: 'edit' })
          .onConflictDoNothing()
          .returning({ id: schema.outboxApplied.id });
        if (claimed.length)
          await db.execute(sql`select sync_edit_bank_event(${ed.rowId}, ${JSON.stringify(ed.fields)}::jsonb)`);
        result.synced.edits.push(ed.id);
      }
      if (body.heartbeat) {
        const h = body.heartbeat;
        await db
          .insert(schema.deviceHeartbeats)
          .values({
            userId: me,
            id: h.id,
            listenerConnected: h.listenerConnected,
            access: h.access,
            lastBankEventAt: h.lastBankEventAt ? new Date(h.lastBankEventAt) : null,
            appVersion: h.appVersion,
          })
          .onConflictDoNothing();
      }
    });

    // commands in order, each in its own transaction with its id, so one refused leaves the rest
    let commandsApplied = false;
    for (const raw of body.commands) {
      const p = SyncCommand.safeParse(raw);
      if (!p.success) {
        const id = idOf(raw);
        // an id the shell can match, or the item can't be told apart and is dropped by the shell
        if (z.uuid().safeParse(id).success)
          result.synced.commands.push({ id, status: 'refused', said: 'Sen couldn’t read that change.' });
        continue;
      }
      const { id, command } = p.data;
      try {
        const outcome = await v.db(async (db) => {
          const claimed = await db
            .insert(schema.outboxApplied)
            .values({ userId: me, id, kind: 'command' })
            .onConflictDoNothing()
            .returning({ id: schema.outboxApplied.id });
          if (!claimed.length) return { id, status: 'already' as const, said: '' };
          // the command runs in this same transaction, so its id and its change commit together
          const res = await runCommand({ ...v, db: (fn) => fn(db) }, command);
          return { id, status: 'applied' as const, said: res.said };
        });
        if (outcome.status === 'applied') commandsApplied = true;
        result.synced.commands.push(outcome);
      } catch (e) {
        // refused for good: invalid, not allowed, or not built yet; a server failure is retried
        if (!(e instanceof ApiError) || (e.status >= 500 && e.code !== 'not_built')) throw e;
        result.synced.commands.push({ id, status: 'refused', said: e.message });
      }
    }

    const morning = await v.db((db) => morningAt(db, me));
    result.morningAt = morning?.toISOString() ?? null;
    const topics: Topic[] = [];
    if (addedEvents || appsChanged || body.heartbeat) topics.push('capture');
    if (commandsApplied) topics.push('settings');
    if (topics.length) await v.svc.relay.hint(me, topics);
    return c.json(result);
  });

  /** What the phone keeps offline, changed since a version (§5). Today, the chosen apps. */
  r.get('/sync/changes', async (c) => {
    if (!c.var.access.features.shell)
      throw new ApiError(403, 'shell_off', 'The Sen app is off for you. Ask the admin.');
    const since = parse(
      z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      c.req.query('since') ?? '0',
    );
    const t = schema.captureApps;
    const rows = await c.var.db((db) =>
      db
        .select()
        .from(t)
        .where(and(eq(t.userId, c.var.person.id), gt(t.version, since)))
        .orderBy(asc(t.version))
        .limit(CHANGES_PAGE + 1),
    );
    const page = rows.slice(0, CHANGES_PAGE);
    const out: SyncChanges = {
      version: page.at(-1)?.version ?? since,
      more: rows.length > CHANGES_PAGE,
      captureApps: page.map((a) => ({
        id: a.id,
        package: a.package,
        label: a.label,
        chosenAt: a.chosenAt.toISOString(),
        deletedAt: a.deletedAt?.toISOString() ?? null,
      })),
    };
    return c.json(out);
  });

  /** Matching after each sync (§5): receipts, transfer sides, repayments. An empty frame until B11. */
  r.post('/match', async (c) => {
    parse(z.object({}).strict(), await readJson(c));
    return c.json({ matched: 0 });
  });

  /** Capture's health, for Home's warnings (§6.2, §18). */
  r.get('/capture/health', async (c) => {
    const v = c.var;
    return c.json(await v.db((db) => captureHealth(db, v.person.id, v.access.features.capture, new Date())));
  });

  /** *Captured on this phone* (B07): the server's events, raw and masked, newest first. */
  r.get('/captured', async (c) => {
    const before = c.req.query('before');
    const at = before === undefined ? null : new Date(parse(z.iso.datetime({ offset: true }), before));
    const e = schema.bankEvents;
    const rows = await c.var.db((db) =>
      db
        .select()
        .from(e)
        .where(and(eq(e.userId, c.var.person.id), at ? lt(e.postedAt, at) : undefined))
        .orderBy(desc(e.postedAt))
        .limit(CAPTURED_PAGE + 1),
    );
    const page = rows.slice(0, CAPTURED_PAGE);
    const out: CapturedView = {
      events: page.map((r) => ({
        id: r.id,
        package: r.package,
        channelId: r.channelId,
        postedAt: r.postedAt.toISOString(),
        title: r.title,
        text: r.text,
        bigText: r.bigText,
        maybeOtp: r.maybeOtp,
        parseStatus: r.parseStatus,
        synced: true,
      })),
      next: rows.length > CAPTURED_PAGE ? (page.at(-1)?.postedAt.toISOString() ?? null) : null,
    };
    return c.json(out);
  });

  return r;
}
