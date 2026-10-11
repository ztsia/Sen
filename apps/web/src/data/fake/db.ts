import type {
  Account,
  BalanceCheck,
  BankEvent,
  Budget,
  Category,
  Goal,
  GoalContribution,
  MerchantRule,
  ParseTemplate,
  PromiseRow,
  Receipt,
  ReceiptItem,
  Split,
  SplitMember,
  Subscription,
  SubscriptionCharge,
  Transaction,
} from '@sen/core/schema';
import type { Health, ReceiptDraft, ReviewItem } from '@sen/core/views';

/**
 * The fake's whole state: the rows of spec §15 one person would have, plus what the server would
 * otherwise derive and the skeleton simply holds (Review's items, Sen's note, the health warnings).
 * One scenario fills it (scenario.ts); B05 turns the same scenario into the preview database's seed.
 */
export interface Db {
  /** The made-up moment the scenario is set at, so every screenshot is the same. */
  now: string;
  userId: string;
  /** What this person can see (D52): capture, claims and Sen. */
  capture: boolean;
  claims: boolean;
  agent: boolean;
  /** AI credit at zero: Sen and receipt reading pause until this day (§9.6). */
  aiPausedUntil: string | null;
  /** Without capture, a payday is optional; the skeleton's month scenario has none (D79). */
  openingDay: string;
  accounts: Account[];
  categories: Category[];
  rules: MerchantRule[];
  templates: ParseTemplate[];
  events: BankEvent[];
  txns: Transaction[];
  /** Relief tags (§14) by transaction: a column of `transactions` that arrives with B26. */
  reliefs: Record<string, string>;
  receipts: Receipt[];
  items: ReceiptItem[];
  /** Who had each item on a split (B17's `split_picks`), by item id. */
  picks: Record<string, string>;
  splits: Split[];
  members: SplitMember[];
  /** A split's bill, for one whose payment isn't yours (a friend paid). */
  bills: Record<string, { merchant: string; total: number; at: string }>;
  budgets: Budget[];
  goals: Goal[];
  contributions: GoalContribution[];
  subscriptions: Subscription[];
  charges: SubscriptionCharge[];
  promises: PromiseRow[];
  checks: BalanceCheck[];
  /** Sen's experiment this cycle (§12.1): what code counts, and the limit. */
  experiment: { label: string; merchantKey: string; perWeek: number } | null;
  review: ReviewItem[];
  note: { text: string; at: string } | null;
  health: Health[];
  payday: { stage: 'card' } | { stage: 'progress'; done: number; of: number } | null;
  /** Receipts being read, and read ones waiting on `confirm`. */
  drafts: ReceiptDraft[];
  /** Rows still in the outbox, by id, with when they were written (§5). */
  unsynced: Record<string, string>;
  /** What changed on each payment, newest last (`audit_log`). */
  changes: Record<string, { at: string; what: string; by: 'user' | 'agent' | 'system' }[]>;
}
