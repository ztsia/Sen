import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  index,
  jsonb,
  primaryKey,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUser } from './auth';
import { ownRows } from './rls';

/**
 * §15's tables that B07 brings: what the phone's outbox syncs (spec §5, §6.2, §6.5). Ids are made on
 * the phone: an event's is a UUIDv5 of its person and dedupe key (apps/api/src/sync/ids.ts), so a
 * notification captured again, after a reconnect, a reinstall or on a second phone, lands on the same
 * row. Every write goes through migration 0012's `sync_*` functions, which hold the rules: raw text
 * never changes, an edit sets only the fields it names, and a tombstone stays.
 */
const at = (name: string) => timestamp(name, { withTimezone: true });
const person = () =>
  uuid('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' });

export const PARSE_STATUSES = ['parsed', 'ignored', 'skipped', 'unparsed', 'dismissed'] as const;

/**
 * One captured notification, as the listener stored it (§6.2 *Raw text is stored first*): masked
 * digits and all (D121), with `maybe_otp` when it might have held a code (D116). The raw columns are
 * immutable (a trigger, migration 0012); the status columns are what B09 and B10 write. `parsed_by`
 * gains its reference to `parse_templates` with B09.
 */
export const bankEvents = pgTable(
  'bank_events',
  {
    id: uuid('id').primaryKey(),
    userId: person(),
    package: text('package').notNull(),
    channelId: text('channel_id'),
    notificationKey: text('notification_key').notNull(),
    postedAt: at('posted_at').notNull(),
    /** The app's own `when` on the notification. */
    notifiedAt: at('notified_at').notNull(),
    title: text('title'),
    text: text('text'),
    bigText: text('big_text'),
    maybeOtp: boolean('maybe_otp').notNull().default(false),
    dedupeKey: text('dedupe_key').notNull(),
    parsedBy: uuid('parsed_by'),
    parseStatus: text('parse_status', { enum: PARSE_STATUSES }).notNull().default('unparsed'),
    parsed: jsonb('parsed').$type<Record<string, unknown>>(),
    linkedEventId: uuid('linked_event_id').references((): AnyPgColumn => bankEvents.id),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('bank_events_dedupe_key').on(t.userId, t.dedupeKey),
    // Captured on this phone, newest first; the watchdog's last event
    index('bank_events_user_posted_idx').on(t.userId, t.postedAt.desc()),
    check(
      'bank_events_status_check',
      sql`${t.parseStatus} in ('parsed', 'ignored', 'skipped', 'unparsed', 'dismissed')`,
    ),
    check('bank_events_dedupe_key_check', sql`${t.dedupeKey} ~ '^[0-9a-f]{64}$'`),
    // the phone never deletes an event: dismissing one is a status (§6.7)
    ...ownRows('bank_events', t.userId, ['select', 'insert', 'update']),
  ],
).enableRLS();

/**
 * The apps a person chose to capture from (D86), so a reinstall restores the choice. A choice's id is
 * made on the phone; removing it leaves a tombstone, which a stale phone can't bring back. Choosing
 * the app again is a new row. `version` orders the changes the phone pulls down (`sync_changes`).
 */
export const captureApps = pgTable(
  'capture_apps',
  {
    id: uuid('id').notNull(),
    userId: person(),
    package: text('package').notNull(),
    label: text('label').notNull(),
    chosenAt: at('chosen_at').notNull(),
    deletedAt: at('deleted_at'),
    version: bigint('version', { mode: 'number' }).notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    uniqueIndex('capture_apps_live')
      .on(t.userId, t.package)
      .where(sql`${t.deletedAt} is null`),
    index('capture_apps_user_version_idx').on(t.userId, t.version),
    ...ownRows('capture_apps', t.userId, ['select', 'insert', 'update']),
  ],
).enableRLS();

/**
 * The shell's heartbeat (§6.2 *Health*), on every sync and once a day: whether the listener was
 * connected, and when it last saw a bank event. `created_at` is the server's clock, which the
 * morning job's watchdog compares, so a phone's wrong clock can't hide a dead listener.
 */
export const deviceHeartbeats = pgTable(
  'device_heartbeats',
  {
    id: uuid('id').notNull(),
    userId: person(),
    listenerConnected: boolean('listener_connected').notNull(),
    /** Notification access is granted (the listener can't connect without it). */
    access: boolean('access').notNull(),
    lastBankEventAt: at('last_bank_event_at'),
    appVersion: text('app_version').notNull(),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index('device_heartbeats_user_created_idx').on(t.userId, t.createdAt.desc()),
    ...ownRows('device_heartbeats', t.userId, ['select', 'insert']),
  ],
).enableRLS();

/**
 * Each outbox write the server has applied, by its id (§5 *Sync can't duplicate or undo*): a command
 * from the web app in the shell is applied once, so a retried sync can't apply it again over a change
 * made since on another device.
 */
export const outboxApplied = pgTable(
  'outbox_applied',
  {
    id: uuid('id').notNull(),
    userId: person(),
    kind: text('kind').notNull(),
    appliedAt: at('applied_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index('outbox_applied_user_idx').on(t.userId, t.appliedAt),
    ...ownRows('outbox_applied', t.userId, ['select', 'insert']),
  ],
).enableRLS();
