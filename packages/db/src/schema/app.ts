import { sql } from 'drizzle-orm';
import { bigint, boolean, check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { MemberSwitches } from '@sen/core/views';
import { authUser } from './auth';
import { ownRows } from './rls';

/**
 * §15's tables that B05 brings: who may use what (D52, D98), invitations, your settings and the
 * audit log. Every later table follows the same shape: `user_id` referencing `auth_user` with
 * `ON DELETE CASCADE`, RLS through `ownRows`, and its grants in the same migration.
 */
const at = (name: string) => timestamp(name, { withTimezone: true });
/** Integer sen: BIGINT in Postgres, a JS number in the app (CLAUDE.md, never a float). */
const sen = (name: string) => bigint(name, { mode: 'number' });
const person = () =>
  uuid('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' });

/**
 * Who may use what (D52, D98). Read-only to its person; written only by the admin's
 * `SECURITY DEFINER` functions (B38) and the seed. Every switch off until the admin turns it on;
 * the owner's seed turns them all on.
 */
export const userAccess = pgTable(
  'user_access',
  {
    userId: person().primaryKey(),
    isAdmin: boolean('is_admin').notNull().default(false),
    features: jsonb('features').$type<MemberSwitches>().notNull().default(sql`'{}'::jsonb`),
    /** The free monthly allowance (D98): RM2 unless the admin sets another. */
    aiFreeMonthly: sen('ai_free_monthly').notNull().default(200),
    aiUnlimited: boolean('ai_unlimited').notNull().default(false),
    /** The daily safety ceiling everyone has (D98); null until B38 sets a default for it. */
    aiDailyCeiling: sen('ai_daily_ceiling'),
    suspendedAt: at('suspended_at'),
    updatedBy: uuid('updated_by').references(() => authUser.id, { onDelete: 'set null' }),
    updatedAt: at('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('user_access_updated_by_idx').on(t.updatedBy),
    check('user_access_ai_free_monthly_check', sql`${t.aiFreeMonthly} >= 0`),
    check('user_access_ai_daily_ceiling_check', sql`${t.aiDailyCeiling} >= 0`),
    ...ownRows('user_access', t.userId, ['select']),
  ],
).enableRLS();

/**
 * An invitation (D52): its token is stored hashed, and one open invitation per email. Its owner is
 * the admin who sent it (`invited_by`); accepting goes through a narrow `SECURITY DEFINER` function
 * (B38), never `app_user`.
 */
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    features: jsonb('features').$type<MemberSwitches>().notNull().default(sql`'{}'::jsonb`),
    /** RM10 to start (D98). */
    aiWelcomeCredit: sen('ai_welcome_credit').notNull().default(1000),
    aiFreeMonthly: sen('ai_free_monthly').notNull().default(200),
    aiUnlimited: boolean('ai_unlimited').notNull().default(false),
    expiresAt: at('expires_at').notNull(),
    acceptedAt: at('accepted_at'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('invitations_open_email_key').on(t.email).where(sql`${t.acceptedAt} is null`),
    index('invitations_invited_by_idx').on(t.invitedBy),
    check('invitations_ai_check', sql`${t.aiWelcomeCredit} >= 0 and ${t.aiFreeMonthly} >= 0`),
    ...ownRows('invitations', t.invitedBy, ['select']),
  ],
).enableRLS();

/**
 * Your settings (§15). B05 brings the first columns; later slices add their own. `expected_payday`
 * is `last-working`, a day of the month (`1`–`31`), or null for none (D79).
 */
export const userSettings = pgTable(
  'user_settings',
  {
    userId: person().primaryKey(),
    /** Your name as banks print it (D17). */
    ownNames: text('own_names').array().notNull().default(sql`'{}'::text[]`),
    expectedPayday: text('expected_payday'),
    updatedAt: at('updated_at').notNull().defaultNow(),
  },
  (t) => [
    check('user_settings_expected_payday_check', sql`${t.expectedPayday} ~ '^(last-working|[1-9]|[12][0-9]|3[01])$'`),
    ...ownRows('user_settings', t.userId, ['select', 'insert', 'update']),
  ],
).enableRLS();

/** What changed and who changed it (§15): append-only, so `app_user` may insert and read, never update or delete. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: person(),
    entity: text('entity').notNull(),
    entityId: uuid('entity_id').notNull(),
    action: text('action').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    actor: text('actor', { enum: ['user', 'agent', 'system'] }).notNull(),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('audit_log_entity_idx').on(t.userId, t.entity, t.entityId, t.createdAt),
    check('audit_log_actor_check', sql`${t.actor} in ('user', 'agent', 'system')`),
    ...ownRows('audit_log', t.userId, ['select', 'insert']),
  ],
).enableRLS();
