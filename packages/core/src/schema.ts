import { z } from 'zod';
import { MAX_SEN } from './money';

/**
 * The rows of spec_v2.md §15, as zod schemas: the one module of types the app, the API and the worker
 * share (B03). The skeleton's fake fills them now; B05's API reads and writes the same shapes, with
 * Drizzle's columns named after these fields (camelCase here, snake_case in Postgres).
 *
 * Only what a slice uses is here: a table's later columns arrive with the slice that needs them
 * (modules.md, *Tables arrive with their slice*). Money is always integer sen (CLAUDE.md): `Sen` is a
 * signed amount, `Amount` one that's never below zero. Times are ISO 8601 instants (`timestamptz`,
 * stored in UTC); a calendar day is `YYYY-MM-DD` in Kuala Lumpur.
 */

/** A whole number of sen, either sign. */
export const Sen = z.int().min(-MAX_SEN).max(MAX_SEN);
/** A whole number of sen, never below zero: what moved, a budget, a target. */
export const Amount = z.int().min(0).max(MAX_SEN);
export const Id = z.uuid();
/** An instant, as ISO 8601 with its offset. */
export const Instant = z.iso.datetime({ offset: true });
/** A calendar day in Kuala Lumpur, `2026-10-18`. */
export const Day = z.iso.date();
export const Currency = z.string().length(3);

const owned = { id: Id, userId: Id };

// --- accounts and categories (§7, §8) ---

export const Account = z.object({
  ...owned,
  name: z.string().min(1),
  kind: z.enum(['tracked', 'elsewhere']),
  /** The app that feeds it (D86), and how its notifications name it. */
  notifierPackage: z.string().nullable(),
  notifierLabel: z.string().nullable(),
  openingBalance: Sen,
  openingAt: Instant,
  currency: Currency,
  archivedAt: Instant.nullable(),
});
export type Account = z.infer<typeof Account>;

export const Category = z.object({
  ...owned,
  name: z.string().min(1),
  isDiscretionary: z.boolean(),
  isMeal: z.boolean(),
  isBeverage: z.boolean(),
  kind: z.enum(['spend', 'income']),
  /** The few categories code relies on, so renaming one breaks nothing (§15). */
  systemKey: z.enum(['salary', 'cash', 'unaccounted']).nullable(),
  archivedAt: Instant.nullable(),
});
export type Category = z.infer<typeof Category>;

// --- the ledger (§6, §7) ---

export const TxnKind = z.enum(['spend', 'income', 'transfer', 'repayment', 'refund', 'adjustment']);
export type TxnKind = z.infer<typeof TxnKind>;
export const TxnSource = z.enum(['notification', 'receipt', 'manual', 'inferred', 'adjustment']);
export type TxnSource = z.infer<typeof TxnSource>;

export const Transaction = z.object({
  ...owned,
  accountId: Id.nullable(),
  bankEventId: Id.nullable(),
  occurredAt: Instant,
  direction: z.enum(['out', 'in']),
  /** What actually moved: balances use it (§7). */
  amount: Amount,
  currency: Currency,
  kind: TxnKind,
  merchantRaw: z.string().nullable(),
  merchantKey: z.string().nullable(),
  categoryId: Id.nullable(),
  /** What you bore, spending only; defaults to the amount (§7, D19). */
  myShare: Amount.nullable(),
  note: z.string().nullable(),
  noReceipt: z.boolean(),
  source: TxnSource,
  status: z.enum(['needs_attention', 'done', 'pending']),
  transferGroupId: Id.nullable(),
  /** A refund's purchase, a repayment's bill. */
  linkedTransactionId: Id.nullable(),
  createdAt: Instant,
  updatedAt: Instant,
  deletedAt: Instant.nullable(),
});
export type Transaction = z.infer<typeof Transaction>;

export const BankEvent = z.object({
  ...owned,
  package: z.string(),
  postedAt: Instant,
  title: z.string(),
  text: z.string(),
  parseStatus: z.enum(['parsed', 'ignored', 'skipped', 'unparsed', 'dismissed']),
  /** The template that read it; a provisional one is *New wording: right?* (D87). */
  parsedBy: Id.nullable(),
});
export type BankEvent = z.infer<typeof BankEvent>;

export const ParseTemplate = z.object({
  ...owned,
  package: z.string(),
  kind: z.enum(['out', 'in', 'internal', 'hold', 'context', 'ignore']),
  status: z.enum(['provisional', 'active', 'rejected']),
});
export type ParseTemplate = z.infer<typeof ParseTemplate>;

export const MerchantRule = z.object({
  ...owned,
  merchantKey: z.string(),
  categoryId: Id.nullable(),
  categoryMode: z.enum(['single', 'by_item']),
  kind: TxnKind.nullable(),
  setBy: z.enum(['user', 'agent']),
  confirmedCount: z.int().min(0),
});
export type MerchantRule = z.infer<typeof MerchantRule>;

// --- receipts (§6.4) ---

export const Receipt = z.object({
  ...owned,
  /** The payment it's attached to; none while it waits, or kept as evidence. */
  transactionId: Id.nullable(),
  merchantRaw: z.string().nullable(),
  occurredAt: Instant.nullable(),
  total: Amount,
  tax: Amount,
  serviceCharge: Amount,
  /** How many people ate, for the meal average (D66). */
  pax: z.int().min(1),
  note: z.string().nullable(),
  source: z.enum(['scan', 'gallery', 'share', 'email', 'manual']),
  status: z.enum(['uploading', 'extracting', 'needs_review', 'awaiting_payment', 'committed', 'evidence', 'failed']),
  createdAt: Instant,
});
export type Receipt = z.infer<typeof Receipt>;

export const ReceiptItem = z.object({
  ...owned,
  receiptId: Id,
  description: z.string(),
  qty: z.int().min(1),
  /** As printed. */
  amount: Amount,
  /** With its share of tax and service (D66): the items add up to the total. */
  price: Amount,
  categoryId: Id.nullable(),
  /** `others` is the folded line of *Just my part* (D92). */
  kind: z.enum(['item', 'others']),
});
export type ReceiptItem = z.infer<typeof ReceiptItem>;

// --- splits (§7, D64–D71, D92) ---

export const Split = z.object({
  ...owned,
  transactionId: Id.nullable(),
  receiptId: Id.nullable(),
  paidBy: z.enum(['me', 'other']),
  payerMemberId: Id.nullable(),
  status: z.enum(['open', 'settled', 'expired']),
  lockedAt: Instant.nullable(),
  createdAt: Instant,
});
export type Split = z.infer<typeof Split>;

export const SplitMember = z.object({
  ...owned,
  splitId: Id,
  name: z.string(),
  isMe: z.boolean(),
  isOthers: z.boolean(),
  doneAt: Instant.nullable(),
  /** Their share, as worked out from their picks (a view in B17); stored here for the skeleton. */
  share: Amount,
  paidAt: Instant.nullable(),
  paidByTransactionId: Id.nullable(),
});
export type SplitMember = z.infer<typeof SplitMember>;

// --- plans: budgets, goals, subscriptions (§8, §10, §11) ---

export const Budget = z.object({
  ...owned,
  categoryId: Id,
  amount: Amount,
  effectiveFrom: Day,
  effectiveTo: Day.nullable(),
});
export type Budget = z.infer<typeof Budget>;

export const Goal = z.object({
  ...owned,
  name: z.string(),
  kind: z.enum(['goal', 'bucket']),
  targetAmount: Amount,
  targetDate: Day.nullable(),
  repeatsYearly: z.boolean(),
  status: z.enum(['active', 'done', 'archived']),
});
export type Goal = z.infer<typeof Goal>;

export const GoalContribution = z.object({ ...owned, goalId: Id, amount: Sen, occurredAt: Instant });
export type GoalContribution = z.infer<typeof GoalContribution>;

export const Subscription = z.object({
  ...owned,
  name: z.string(),
  merchantKey: z.string().nullable(),
  /** In its billing currency's smallest unit, such as US cents: a forecast (§11). */
  amount: Amount,
  currency: Currency,
  cadence: z.enum(['monthly', 'yearly']),
  nextRenewalDate: Day,
  status: z.enum(['active', 'cancelled']),
  /** For display only, never to compute money (D99): `4.0880`, as text. */
  displayFxRate: z.string().nullable(),
  displayFxOn: Day.nullable(),
  displayFxSource: z.enum(['bnm', 'ecb', 'charge']).nullable(),
});
export type Subscription = z.infer<typeof Subscription>;

export const SubscriptionCharge = z.object({
  ...owned,
  subscriptionId: Id,
  expectedDate: Day,
  expectedAmount: Amount,
  currency: Currency,
  status: z.enum(['expected', 'matched', 'missed']),
  matchedTransactionId: Id.nullable(),
});
export type SubscriptionCharge = z.infer<typeof SubscriptionCharge>;

// --- what Sen watches for (§12.1) ---

export const PromiseRow = z.object({
  ...owned,
  kind: z.enum(['refund', 'return', 'other']),
  counterparty: z.string(),
  expectedAmount: Amount,
  expectedBy: Day,
  matchedTransactionId: Id.nullable(),
  status: z.enum(['waiting', 'landed', 'chased', 'dropped']),
});
export type PromiseRow = z.infer<typeof PromiseRow>;

export const BalanceCheck = z.object({
  ...owned,
  accountId: Id,
  asOf: Instant,
  balance: Sen,
  adjustmentTransactionId: Id.nullable(),
});
export type BalanceCheck = z.infer<typeof BalanceCheck>;
