import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUser } from './auth';
import { ownRows } from './rls';
import { bankEvents } from './sync';

/**
 * §15's ledger tables that B08 brings: accounts, the names apps print for them, categories, and
 * transactions with their core columns (later slices add their own). Ids are made on the phone, so
 * each table is keyed with its person (`PRIMARY KEY (user_id, id)`, D143), and every reference
 * between them carries `user_id` too: a row can only point at its own person's rows, and a foreign
 * key can't be used to learn whether someone else's id exists. Money is integer sen (`BIGINT`).
 * Migration 0014 holds their grants, triggers, the balance views and the categories' seed.
 */
const at = (name: string) => timestamp(name, { withTimezone: true });
/** Integer sen: BIGINT in Postgres, a JS number in the app (CLAUDE.md, never a float). */
const sen = (name: string) => bigint(name, { mode: 'number' });
const person = () =>
  uuid('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' });
/** The offline copy's order (§5): each insert or update takes the next `sync_version`. */
const version = () => bigint('version', { mode: 'number' }).notNull().default(0);
/** `@sen/core`'s MAX_SEN: the largest amount anywhere in Sen. */
const MAX_SEN = sql.raw('9999999999999');

export const ACCOUNT_KINDS = ['tracked', 'elsewhere'] as const;

/**
 * An account (§7, D16, D93, D145). A tracked one has an opening balance, counted from `opening_at`;
 * an *Elsewhere* one is watched by no app and shows no balance. One live account per app (D145):
 * `notifier_package` is the app that feeds it, `notifier_label` that app's name. The app never
 * changes once set; archiving frees it for a new account.
 */
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').notNull(),
    userId: person(),
    name: text('name').notNull(),
    kind: text('kind', { enum: ACCOUNT_KINDS }).notNull(),
    notifierPackage: text('notifier_package'),
    notifierLabel: text('notifier_label'),
    openingBalance: sen('opening_balance').notNull().default(0),
    openingAt: at('opening_at').notNull().defaultNow(),
    currency: text('currency').notNull().default('MYR'),
    archivedAt: at('archived_at'),
    createdAt: at('created_at').notNull().defaultNow(),
    updatedAt: at('updated_at').notNull().defaultNow(),
    version: version(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    uniqueIndex('accounts_one_per_app')
      .on(t.userId, t.notifierPackage)
      .where(sql`${t.archivedAt} is null and ${t.notifierPackage} is not null`),
    index('accounts_user_version_idx').on(t.userId, t.version),
    check('accounts_kind_check', sql`${t.kind} in ('tracked', 'elsewhere')`),
    check('accounts_name_check', sql`length(btrim(${t.name})) between 1 and 60`),
    // an Elsewhere account is watched by no app and holds no balance Sen counts (§7)
    check(
      'accounts_elsewhere_check',
      sql`${t.kind} = 'tracked' or (${t.notifierPackage} is null and ${t.openingBalance} = 0)`,
    ),
    check('accounts_app_check', sql`(${t.notifierPackage} is null) = (${t.notifierLabel} is null)`),
    check('accounts_opening_check', sql`abs(${t.openingBalance}) <= ${MAX_SEN}`),
    // multi-currency is out of scope (§20); the column is there so it can come without a migration of every row
    check('accounts_currency_check', sql`${t.currency} = 'MYR'`),
    ...ownRows('accounts', t.userId, ['select', 'insert', 'update']),
  ],
).enableRLS();

/**
 * An `{account}` name an app prints, mapped to one of your accounts (§6.2, §7). B09's templates
 * read it; with one account per app (D145) every name of an app maps to that app's account.
 */
export const accountNames = pgTable(
  'account_names',
  {
    id: uuid('id').notNull(),
    userId: person(),
    package: text('package').notNull(),
    label: text('label').notNull(),
    accountId: uuid('account_id').notNull(),
    createdAt: at('created_at').notNull().defaultNow(),
    version: version(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    uniqueIndex('account_names_label').on(t.userId, t.package, t.label),
    index('account_names_user_version_idx').on(t.userId, t.version),
    foreignKey({ columns: [t.userId, t.accountId], foreignColumns: [accounts.userId, accounts.id] }),
    check('account_names_label_check', sql`length(${t.label}) between 1 and 200`),
    ...ownRows('account_names', t.userId, ['select', 'insert', 'update']),
  ],
).enableRLS();

export const CATEGORY_KINDS = ['spend', 'income'] as const;
export const SYSTEM_KEYS = ['salary', 'cash', 'unaccounted'] as const;

/**
 * One flat list (§8, D28, D33), seeded per person from the starting list (`seed_categories()`).
 * `system_key` marks the three code relies on, so renaming one breaks nothing; none of them can be
 * archived, and *Unaccounted* carries no flags and is only ever a balance check's (§7).
 */
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').notNull(),
    userId: person(),
    name: text('name').notNull(),
    isDiscretionary: boolean('is_discretionary').notNull().default(false),
    isMeal: boolean('is_meal').notNull().default(false),
    isBeverage: boolean('is_beverage').notNull().default(false),
    kind: text('kind', { enum: CATEGORY_KINDS }).notNull(),
    systemKey: text('system_key', { enum: SYSTEM_KEYS }),
    /** Where it sits in Settings' list: the starting list's order, then each one added. */
    position: integer('position').notNull().default(0),
    archivedAt: at('archived_at'),
    createdAt: at('created_at').notNull().defaultNow(),
    updatedAt: at('updated_at').notNull().defaultNow(),
    version: version(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    uniqueIndex('categories_system_key')
      .on(t.userId, t.systemKey)
      .where(sql`${t.systemKey} is not null`),
    // two live categories can't share a name: a picker couldn't tell them apart
    uniqueIndex('categories_live_name')
      .on(t.userId, sql`lower(${t.name})`)
      .where(sql`${t.archivedAt} is null`),
    index('categories_user_version_idx').on(t.userId, t.version),
    check('categories_kind_check', sql`${t.kind} in ('spend', 'income')`),
    check('categories_name_check', sql`length(btrim(${t.name})) between 1 and 40`),
    check(
      'categories_system_key_check',
      sql`${t.systemKey} is null or (${t.systemKey} = 'salary' and ${t.kind} = 'income') or (${t.systemKey} in ('cash', 'unaccounted') and ${t.kind} = 'spend')`,
    ),
    check('categories_system_kept_check', sql`${t.systemKey} is null or ${t.archivedAt} is null`),
    check(
      'categories_unaccounted_flags_check',
      sql`${t.systemKey} is distinct from 'unaccounted' or not (${t.isDiscretionary} or ${t.isMeal} or ${t.isBeverage})`,
    ),
    // the flags describe spending (v0.16 §7.14.4)
    check(
      'categories_income_flags_check',
      sql`${t.kind} = 'spend' or not (${t.isDiscretionary} or ${t.isMeal} or ${t.isBeverage})`,
    ),
    ...ownRows('categories', t.userId, ['select', 'insert', 'update']),
  ],
).enableRLS();

export const TXN_KINDS = ['spend', 'income', 'transfer', 'repayment', 'refund', 'adjustment'] as const;
export const TXN_SOURCES = ['notification', 'receipt', 'manual', 'inferred', 'adjustment'] as const;
export const TXN_STATUSES = ['needs_attention', 'done', 'pending'] as const;

/**
 * A money movement (§6, §7, §15): the ledger. `amount` is what moved, and balances use it; `my_share`
 * is what you bore, and spending uses it (D19). B08 brings the core columns; B09 books the first rows.
 * Never deleted: `deleted_at` is a tombstone the outbox can see.
 */
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').notNull(),
    userId: person(),
    accountId: uuid('account_id'),
    bankEventId: uuid('bank_event_id'),
    occurredAt: at('occurred_at').notNull(),
    direction: text('direction', { enum: ['out', 'in'] }).notNull(),
    amount: sen('amount').notNull(),
    currency: text('currency').notNull().default('MYR'),
    kind: text('kind', { enum: TXN_KINDS }).notNull(),
    merchantRaw: text('merchant_raw'),
    merchantKey: text('merchant_key'),
    categoryId: uuid('category_id'),
    myShare: sen('my_share'),
    source: text('source', { enum: TXN_SOURCES }).notNull(),
    status: text('status', { enum: TXN_STATUSES }).notNull().default('done'),
    createdAt: at('created_at').notNull().defaultNow(),
    updatedAt: at('updated_at').notNull().defaultNow(),
    deletedAt: at('deleted_at'),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    foreignKey({ columns: [t.userId, t.accountId], foreignColumns: [accounts.userId, accounts.id] }),
    foreignKey({ columns: [t.userId, t.categoryId], foreignColumns: [categories.userId, categories.id] }),
    foreignKey({ columns: [t.userId, t.bankEventId], foreignColumns: [bankEvents.userId, bankEvents.id] }),
    // the balance view: an account's movements after its opening
    index('transactions_account_idx')
      .on(t.userId, t.accountId, t.occurredAt)
      .where(sql`${t.deletedAt} is null`),
    index('transactions_user_occurred_idx').on(t.userId, t.occurredAt.desc()),
    index('transactions_event_idx')
      .on(t.userId, t.bankEventId)
      .where(sql`${t.bankEventId} is not null`),
    check('transactions_direction_check', sql`${t.direction} in ('out', 'in')`),
    check(
      'transactions_kind_check',
      sql`${t.kind} in ('spend', 'income', 'transfer', 'repayment', 'refund', 'adjustment')`,
    ),
    check(
      'transactions_source_check',
      sql`${t.source} in ('notification', 'receipt', 'manual', 'inferred', 'adjustment')`,
    ),
    check('transactions_status_check', sql`${t.status} in ('needs_attention', 'done', 'pending')`),
    check('transactions_amount_check', sql`${t.amount} between 0 and ${MAX_SEN}`),
    // what you bore, on spending only, and never more than what moved (D19)
    check(
      'transactions_my_share_check',
      sql`${t.myShare} is null or (${t.kind} = 'spend' and ${t.myShare} between 0 and ${t.amount})`,
    ),
    check('transactions_currency_check', sql`${t.currency} = 'MYR'`),
    ...ownRows('transactions', t.userId, ['select', 'insert', 'update']),
  ],
).enableRLS();
