import { z } from 'zod';
import { Amount, Day, Id, Instant, Receipt, Sen, Transaction, TxnKind } from './schema';

/**
 * What each screen reads (B03): one shape per query hook, worked out by code from the rows in
 * schema.ts. The skeleton's fake computes them in the browser; B05's API returns the same shapes from
 * its SQL views and routes (spec §15, §16), so a screen never changes when its data becomes real.
 *
 * Every figure here is computed, never a model's (CLAUDE.md, *Models draft… code computes*), and every
 * amount is integer sen. A prediction (an estimate to payday) is labelled as one where it's shown, and
 * never stored beside a fact.
 */

// --- time (§7 Pay cycles, D14, D79) ---

export const CycleRef = z.object({
  /** Its first day: a cycle's id. */
  id: Day,
  /** Called by the month most of it falls in: `October`. */
  label: z.string(),
  start: Day,
  /** Its last day, inclusive: the day before the next payday, or the month's last day. */
  end: Day,
  /** By pay cycle, or by calendar month without capture (D79). */
  basis: z.enum(['pay', 'month']),
  /** Used only for estimates (D14). */
  expectedPayday: Day.nullable(),
  current: z.boolean(),
});
export type CycleRef = z.infer<typeof CycleRef>;

// --- Home (screens.md, D59, D68, §9.2) ---

export const Health = z.object({
  key: z.enum(['capture-off', 'jobs-stopped']),
  title: z.string(),
  detail: z.string(),
  fix: z.string(),
});
export type Health = z.infer<typeof Health>;

export const HomeView = z.object({
  cycle: CycleRef,
  /** Capture on: balances, the gap and *left until payday* exist (§9.6). */
  capture: z.boolean(),
  health: z.array(Health),
  /** On payday, the card; after it, the plan's progress until every move is done (D60). */
  payday: z.discriminatedUnion('stage', [
    z.object({ stage: z.literal('card') }),
    z.object({ stage: z.literal('progress'), done: z.int(), of: z.int() }),
  ]).nullable(),
  figure: z.object({
    /** left: left until payday; since-start: before the first salary; month: this month's spending (D79). */
    kind: z.enum(['left', 'since-start', 'month']),
    sen: Sen,
    over: z.boolean(),
    /** Days to payday, or to the month's end. */
    daysToGo: z.int().min(0),
    day: z.int().min(1),
    days: z.int().min(1),
    spent: Amount,
    income: Amount,
    /** Spent by the end of each day so far (Copper's strip). */
    spentByDay: z.array(Amount),
  }),
  pace: z.object({
    spent: Amount,
    /** This cycle by today minus last cycle by the same day; none in the first cycle. */
    delta: Sen.nullable(),
    thisCycle: z.array(Amount),
    lastCycle: z.array(Amount).nullable(),
  }),
  note: z.object({ text: z.string(), at: Instant }).nullable(),
  /** Capture only: total balance, and the gap the last balance check found. */
  quiet: z.object({ balance: Sen, gap: z.object({ sen: Sen, on: Day }).nullable() }).nullable(),
  /** Rows still in the outbox, counted in the figures (§5). */
  unsynced: z.int().min(0),
});
export type HomeView = z.infer<typeof HomeView>;

/** The `cycle` sheet: how *left until payday* is worked out, and where it will end. */
export const CycleView = z.object({
  cycle: CycleRef,
  income: Amount,
  spending: Amount,
  result: Sen,
  /** `project_cycle_end` (§12.3): an estimate, labelled as one. None counting by month. */
  estimate: Sen.nullable(),
  /** Counting by month: last month's spending, to compare. */
  lastSpending: Amount.nullable(),
});
export type CycleView = z.infer<typeof CycleView>;

// --- Review (§6.6, D72, screens.md's table) ---

const Choice = z.object({ id: Id, label: z.string() });
const reviewBase = {
  id: z.string(),
  at: Instant,
  /** Sen's suggested answer, marked on its button (§12.1). */
  suggested: z.string().nullable(),
};

export const ReviewItem = z.discriminatedUnion('kind', [
  z.object({
    ...reviewBase,
    kind: z.literal('new-merchant'),
    txnId: Id,
    amount: Amount,
    merchant: z.string(),
    account: z.string(),
    /** The two best guesses (D112). */
    guesses: z.array(Choice).max(2),
  }),
  z.object({
    ...reviewBase,
    kind: z.literal('money-in-share'),
    txnId: Id,
    amount: Amount,
    from: z.string(),
    shares: z.array(z.object({ memberId: Id, splitId: Id, name: z.string(), bill: z.string(), amount: Amount })),
  }),
  z.object({
    ...reviewBase,
    kind: z.literal('money-in'),
    txnId: Id,
    amount: Amount,
    from: z.string(),
    account: z.string(),
    /** Recent payments it could be a refund of. */
    refundOf: z.array(Choice),
  }),
  z.object({
    ...reviewBase,
    kind: z.literal('owe-share'),
    splitId: Id,
    memberId: Id,
    to: z.string(),
    bill: z.string(),
    amount: Amount,
  }),
  z.object({ ...reviewBase, kind: z.literal('receipt-waiting'), receiptId: Id, merchant: z.string(), total: Amount }),
  z.object({ ...reviewBase, kind: z.literal('receipt-unread'), receiptId: Id }),
  z.object({
    ...reviewBase,
    kind: z.literal('new-wording'),
    txnId: Id,
    templateId: Id,
    /** What Sen read, as a question: `Paid RM6.50 to KEDAI MAJU. Right?` */
    said: z.string(),
    app: z.string(),
  }),
  z.object({
    ...reviewBase,
    kind: z.literal('transfer-missing'),
    txnId: Id,
    amount: Amount,
    to: z.string(),
    accounts: z.array(Choice),
  }),
  z.object({ ...reviewBase, kind: z.literal('balance-check'), lastOn: Day.nullable() }),
  z.object({ ...reviewBase, kind: z.literal('claim-due'), name: z.string(), amount: Amount, deadline: Day }),
  z.object({ ...reviewBase, kind: z.literal('payday-step'), step: z.string() }),
  z.object({ ...reviewBase, kind: z.literal('proposal'), title: z.string(), detail: z.string() }),
]);
export type ReviewItem = z.infer<typeof ReviewItem>;
export type ReviewKind = ReviewItem['kind'];

export const ReviewView = z.object({
  needsYou: z.array(ReviewItem),
  waiting: z.object({
    splits: z.array(z.object({ splitId: Id, bill: z.string(), back: Amount, of: Amount, people: z.string() })),
    receipts: z.array(z.object({ receiptId: Id, merchant: z.string(), total: Amount, at: Instant })),
    refunds: z.array(z.object({ id: Id, counterparty: z.string(), amount: Amount, by: Day })),
  }),
  skipped: z.int().min(0),
  capture: z.boolean(),
});
export type ReviewView = z.infer<typeof ReviewView>;

export const SkippedView = z.object({
  events: z.array(z.object({ id: Id, app: z.string(), at: Instant, title: z.string(), text: z.string() })),
});
export type SkippedView = z.infer<typeof SkippedView>;

// --- Payments (screens.md `payments`, `txn`, `receipt`) ---

export const RowMark = z.enum(['receipt', 'split', 'review', 'pending', 'filled']);
export type RowMarkKind = z.infer<typeof RowMark>;

export const PaymentRow = z.object({
  id: Id,
  at: Instant,
  /** The merchant, or `Ryt → TNG eWallet` for a transfer. */
  title: z.string(),
  category: z.string().nullable(),
  account: z.string().nullable(),
  direction: z.enum(['out', 'in']),
  kind: TxnKind,
  amount: Amount,
  /** What it adds to the day's spending: the share you bore, 0 for a transfer or money in. */
  spending: Sen,
  marks: z.array(RowMark),
  note: z.string().nullable(),
});
export type PaymentRow = z.infer<typeof PaymentRow>;

export const PaymentFilters = z.object({
  /** A cycle's id, or every cycle. */
  cycle: z.union([Day, z.literal('all')]).optional(),
  accountId: Id.optional(),
  categoryId: Id.optional(),
  shared: z.boolean().optional(),
  q: z.string().optional(),
});
export type PaymentFilters = z.infer<typeof PaymentFilters>;

export const PaymentsView = z.object({ rows: z.array(PaymentRow) });
export type PaymentsView = z.infer<typeof PaymentsView>;

export const TxnView = z.object({
  txn: Transaction,
  title: z.string(),
  account: z.string().nullable(),
  /** For a transfer, the other side. */
  otherAccount: z.string().nullable(),
  category: z.string().nullable(),
  /** The category came from a merchant rule: changing it asks *Just this one* or *From now on* (D25). */
  fromRule: z.boolean(),
  /** Where it came from, in words (patterns.md §7). */
  sourceLabel: z.string(),
  /** Its template is provisional: *New wording: right?* (D87). */
  provisional: z.boolean(),
  spending: Sen,
  synced: z.boolean(),
  receipt: z.object({ id: Id, items: z.int(), merchant: z.string().nullable() }).nullable(),
  split: z.object({ id: Id, state: z.string(), detail: z.string() }).nullable(),
  /** The raw notification, as stored (D121's masking happens before it's stored). */
  bank: z.object({ app: z.string(), title: z.string(), text: z.string() }).nullable(),
  changes: z.array(z.object({ at: Instant, what: z.string() })),
});
export type TxnView = z.infer<typeof TxnView>;

export const ReceiptView = z.object({
  receipt: Receipt,
  items: z.array(
    z.object({
      id: Id,
      description: z.string(),
      qty: z.int(),
      price: Amount,
      category: z.string().nullable(),
      /** On a split, who had it. */
      who: z.string().nullable(),
      kind: z.enum(['item', 'others']),
    }),
  ),
  hasPhoto: z.boolean(),
  payment: z.object({ id: Id, label: z.string() }).nullable(),
});
export type ReceiptView = z.infer<typeof ReceiptView>;

/** A receipt being read, then checked on `confirm` (§6.4). Prices include tax and service (D66). */
export const ReceiptDraft = z.object({
  id: Id,
  status: z.enum(['reading', 'read', 'failed']),
  /** By hand (D90): typed in, checked against a payment's amount. */
  byHand: z.boolean(),
  merchant: z.string(),
  occurredAt: Instant,
  items: z.array(
    z.object({
      id: Id,
      description: z.string(),
      qty: z.int().min(1),
      amount: Amount,
      price: Amount,
      categoryId: Id.nullable(),
      /** A doubtful value, marked in place to fix there. */
      doubtful: z.boolean(),
    }),
  ),
  subtotal: Amount,
  tax: Amount,
  service: Amount,
  total: Amount,
  pax: z.int().min(1),
  note: z.string().nullable(),
  /** The payment it's for, when opened from one (Scan receipt, Enter the items). */
  forTxnId: Id.nullable(),
});
export type ReceiptDraft = z.infer<typeof ReceiptDraft>;

// --- Insights (§9.3, D73) ---

const Labelled = z.object({ label: z.string(), sen: Sen });

/** Each card is null when it has no data, and then isn't shown (screens.md). */
export const InsightsView = z.object({
  cycle: CycleRef,
  cycles: z.array(CycleRef),
  capture: z.boolean(),
  onTrack: z
    .object({
      thisCycle: z.array(Amount),
      lastCycle: z.array(Amount).nullable(),
      days: z.int(),
      income: Amount.nullable(),
      /** The estimate at payday, from `project_cycle_end`: labelled as one. */
      estimate: Amount.nullable(),
    })
    .nullable(),
  budgets: z.object({ cycleShare: z.number(), rows: z.array(z.object({ id: Id, label: z.string(), sen: Amount, cap: Amount })) }).nullable(),
  whereWent: z.array(z.object({ id: Id, label: z.string(), sen: Amount, typical: Amount })).nullable(),
  leak: z.object({ spent: z.array(Amount.nullable()), days: z.int() }).nullable(),
  smallThings: z.object({ count: z.int(), total: Amount, under: Amount }).nullable(),
  meal: z.object({ average: Amount, meals: z.int(), history: z.array(Labelled) }).nullable(),
  experiment: z
    .object({ label: z.string(), limit: z.int(), weeks: z.array(z.object({ label: z.string(), count: z.int() })) })
    .nullable(),
  eatOut: z.object({ eatingOut: Amount, groceries: Amount }).nullable(),
  spokenFor: z.object({ fixed: Amount, spent: Amount, left: Sen }).nullable(),
  renews: z
    .object({ monthly: Amount, next: z.array(z.object({ id: Id, name: z.string(), on: Day, sen: Amount })) })
    .nullable(),
  saving: z.object({ cycles: z.array(Labelled), median: Sen }).nullable(),
  goals: z.array(z.object({ id: Id, name: z.string(), saved: Amount, target: Amount })).nullable(),
  trust: z.object({ cycles: z.array(Labelled) }).nullable(),
  topMerchants: z.array(z.object({ label: z.string(), count: z.int(), sen: Amount })).nullable(),
});
export type InsightsView = z.infer<typeof InsightsView>;

export const BudgetsView = z.object({
  cycle: CycleRef,
  cycleShare: z.number(),
  rows: z.array(z.object({ id: Id, categoryId: Id, label: z.string(), sen: Amount, cap: Amount })),
  /** Categories without a budget, to add one. */
  others: z.array(z.object({ id: Id, label: z.string() })),
});
export type BudgetsView = z.infer<typeof BudgetsView>;

export const SubscriptionsView = z.object({
  monthly: Amount,
  rows: z.array(
    z.object({
      id: Id,
      name: z.string(),
      cadence: z.enum(['monthly', 'yearly']),
      /** In its billing currency's smallest unit; `MYR` needs no rate. */
      amount: Amount,
      currency: z.string(),
      /** ≈ in ringgit, for display only, from the rate shown (D99). */
      approx: Amount,
      rate: z.string().nullable(),
      next: Day,
      history: z.array(
        z.object({ on: Day, expected: Amount, actual: Amount.nullable(), status: z.enum(['expected', 'matched', 'missed']) }),
      ),
    }),
  ),
});
export type SubscriptionsView = z.infer<typeof SubscriptionsView>;

export const GoalSummary = z.object({
  id: Id,
  name: z.string(),
  kind: z.enum(['goal', 'bucket']),
  saved: Amount,
  target: Amount,
  targetDate: Day.nullable(),
  /** What it needs each cycle to make its date. */
  perCycle: Amount,
});
export type GoalSummary = z.infer<typeof GoalSummary>;

export const GoalsView = z.object({ goals: z.array(GoalSummary), medianSurplus: Sen, sample: z.int() });
export type GoalsView = z.infer<typeof GoalsView>;

export const GoalView = z.object({
  goal: GoalSummary,
  /** Against the median surplus, with its sample size (§10). */
  feasible: z.boolean(),
  medianSurplus: Sen,
  sample: z.int(),
  /** At the current rate; none when nothing's been put in. */
  projectedFinish: Day.nullable(),
  contributions: z.array(z.object({ at: Instant, sen: Sen })),
});
export type GoalView = z.infer<typeof GoalView>;

export const YearView = z.object({
  year: z.int(),
  months: z.array(z.object({ label: z.string(), spent: Amount, income: Amount })),
  /** The year's savings rate, as a share of income, worked out by code. */
  savingsRate: z.number().nullable(),
  reliefs: z.array(Labelled),
});
export type YearView = z.infer<typeof YearView>;

/** More: what this person can see (D52). */
export const MeView = z.object({
  capture: z.boolean(),
  claims: z.boolean(),
  agent: z.boolean(),
  /** AI credit at zero: Sen and reading pause, everything else works (§9.6). */
  aiPausedUntil: Day.nullable(),
});
export type MeView = z.infer<typeof MeView>;
