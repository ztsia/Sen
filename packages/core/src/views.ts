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
  payday: z
    .discriminatedUnion('stage', [
      z.object({ stage: z.literal('card') }),
      z.object({ stage: z.literal('progress'), done: z.int(), of: z.int() }),
    ])
    .nullable(),
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
  /** A salary landed in it. Before one, it's spending since you started, never "over" (screens.md Home). */
  salary: z.boolean(),
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
  z.object({
    ...reviewBase,
    kind: z.literal('claim-due'),
    claimId: Id,
    name: z.string(),
    amount: Amount,
    deadline: Day,
  }),
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
  /** `audit_log`, newest last, with who made each change: you, Sen, or the system (§6.7). */
  changes: z.array(z.object({ at: Instant, what: z.string(), by: z.enum(['user', 'agent', 'system']) })),
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
  /** The file's SHA-256 (§6.5); none by hand. */
  contentHash: z.string().nullable(),
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
  budgets: z
    .object({
      cycleShare: z.number(),
      rows: z.array(z.object({ id: Id, label: z.string(), sen: Amount, cap: Amount })),
    })
    .nullable(),
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
        z.object({
          on: Day,
          expected: Amount,
          actual: Amount.nullable(),
          status: z.enum(['expected', 'matched', 'missed']),
        }),
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

// ============================================================================================
// B04: the rest of the skeleton. Shared bills, Sen, accounts, claims, Settings and payday.
// ============================================================================================

// --- Shared bills (screens.md, spec §7, D47, D64–D66, D71) ---

export const SplitPerson = z.object({
  id: Id,
  /** *You* for the person signed in. */
  name: z.string(),
  isMe: z.boolean(),
  /** Tapped *I've ticked everything I had*, or ticked for by the payer. */
  done: z.boolean(),
  share: Amount,
  /** On the payer's tick list (D65). */
  paid: z.boolean(),
  /** How it was ticked: *matched: Ryt, today 11:58*, or *ticked by you*. */
  paidHow: z.string().nullable(),
});
export type SplitPerson = z.infer<typeof SplitPerson>;

export const SplitItem = z.object({
  id: Id,
  description: z.string(),
  /** Tax and service included (§6.4). */
  price: Amount,
  takers: z.array(z.object({ id: Id, name: z.string() })),
  /** Ticked by the person signed in. */
  mine: z.boolean(),
  /** Their part of it, by largest remainder when shared. */
  myPart: Amount.nullable(),
});
export type SplitItem = z.infer<typeof SplitItem>;

export const SplitView = z.object({
  id: Id,
  merchant: z.string(),
  total: Amount,
  at: Instant,
  paidBy: z.enum(['me', 'other']),
  /** *You*, or the friend's name. */
  payer: z.string(),
  /** *Still changing* until everyone is done and every item is claimed; then *Final* (D71). */
  state: z.enum(['changing', 'final']),
  /** The link: open, closing a day after the last tick, or closed (D47). */
  link: z.enum(['open', 'closing', 'closed']),
  closesOn: Day.nullable(),
  people: z.array(SplitPerson),
  /** None for a split started from a payment: shared evenly (§7). */
  items: z.array(SplitItem),
  /** Who isn't done yet, while it's still changing. */
  waitingOn: z.array(z.string()),
  /** Items nobody has ticked. */
  unclaimed: z.int().min(0),
  /** Every item claimed and someone left: *Lock without waiting for Ali*. */
  lockWithout: z.string().nullable(),
  meDone: z.boolean(),
  myShare: Amount,
  /** The bill's spending for you (D19). */
  mySpending: Sen,
  /** A friend paid: *You owe Mei RM24.40*. */
  owe: z.object({ to: z.string(), sen: Amount, paid: z.boolean() }).nullable(),
  /** The payer's DuitNow QR is set (Settings → You). */
  payerQr: z.boolean(),
  /** You paid and wrote off what was still owed (*Write off*): that part is your spending now. */
  writtenOff: Amount,
  txnId: Id.nullable(),
});
export type SplitView = z.infer<typeof SplitView>;

export const SharedView = z.object({
  rows: z.array(
    z.object({
      id: Id,
      merchant: z.string(),
      at: Instant,
      paidBy: z.enum(['me', 'other']),
      /** The bill's total. */
      sen: Amount,
      /** *You paid · 1 of 2 paid you back*, or *Mei paid · you owe RM24.40*. */
      line: z.string(),
      open: z.boolean(),
    }),
  ),
});
export type SharedView = z.infer<typeof SharedView>;

/**
 * `split-public`: one split as a friend's browser sees it, with no login (D47, D71). It carries only
 * that bill: the merchant, items, shares, first names and whether the payer's QR is there. Nothing
 * else from the app ever reaches it (B04's note; B18 serves it from its own route).
 */
export const PublicSplitView = z.object({
  merchant: z.string(),
  total: Amount,
  /** None once it's closed: a closed link shows nothing of the bill. */
  at: Instant.nullable(),
  payer: z.string(),
  state: z.enum(['changing', 'final', 'closed']),
  /** The friend this browser remembers, or none: the name box. */
  you: z.string().nullable(),
  people: z.array(z.object({ name: z.string(), done: z.boolean() })),
  items: z.array(
    z.object({
      id: Id,
      description: z.string(),
      price: Amount,
      takers: z.array(z.string()),
      mine: z.boolean(),
      myPart: Amount.nullable(),
    }),
  ),
  yourShare: Amount,
  youDone: z.boolean(),
  /** Only once it's final: what to pay, and whether the payer's QR is there. */
  pay: z.object({ sen: Amount, qr: z.boolean() }).nullable(),
});
export type PublicSplitView = z.infer<typeof PublicSplitView>;

// --- Accounts (screens.md, spec §7, D16, D18, D93) ---

export const AccountRow = z.object({
  id: Id,
  name: z.string(),
  kind: z.enum(['tracked', 'elsewhere']),
  /** Computed (§7); none for an elsewhere account. */
  balance: Sen.nullable(),
  checkedAt: Instant.nullable(),
  /** The app that feeds it: *Ryt Bank*. */
  app: z.string().nullable(),
});
export type AccountRow = z.infer<typeof AccountRow>;

export const AccountsView = z.object({
  total: Sen,
  tracked: z.array(AccountRow),
  elsewhere: z.array(AccountRow),
  /** What the last check found (§7). */
  gap: Sen.nullable(),
});
export type AccountsView = z.infer<typeof AccountsView>;

export const AccountView = z.object({
  account: AccountRow,
  opening: Sen,
  openingAt: Instant,
  recent: z.array(PaymentRow),
  checks: z.array(z.object({ at: Instant, balance: Sen, difference: Sen })),
});
export type AccountView = z.infer<typeof AccountView>;

/** Each tracked account's computed balance, beside a box for the bank's figure (D18). */
export const BalanceCheckView = z.object({
  rows: z.array(z.object({ id: Id, name: z.string(), computed: Sen })),
});
export type BalanceCheckView = z.infer<typeof BalanceCheckView>;

// --- Claims (screens.md, spec §13; made-up schemes only, CLAUDE.md) ---

export const ClaimStatus = z.enum(['to_submit', 'submitted', 'approved', 'paid', 'rejected']);
export type ClaimStatus = z.infer<typeof ClaimStatus>;

export const ClaimRow = z.object({
  id: Id,
  scheme: z.string(),
  /** The calendar month it's for: *September 2026*. */
  period: z.string(),
  /** Computed by code from the scheme's source, capped. */
  amount: Amount,
  cap: Amount,
  status: ClaimStatus,
  deadline: Day,
  evidence: z.int().min(0),
  /** What's missing, in words: *My50 receipt not added yet*. */
  missing: z.array(z.string()),
  approvedAmount: Amount.nullable(),
  essRef: z.string().nullable(),
  reason: z.string().nullable(),
});
export type ClaimRow = z.infer<typeof ClaimRow>;

export const ClaimsView = z.object({
  period: z.string(),
  claims: z.array(ClaimRow),
  /** The ESS adapter is set up and this is the shell: *Send to ESS* (D96). */
  ess: z.boolean(),
});
export type ClaimsView = z.infer<typeof ClaimsView>;

/** The submission kit: each value in ESS's order, each file, what's missing (§13). */
export const ClaimView = z.object({
  claim: ClaimRow,
  fields: z.array(z.object({ label: z.string(), value: z.string() })),
  files: z.array(z.object({ id: Id, name: z.string(), kind: z.enum(['pdf', 'image']) })),
  missing: z.array(z.object({ what: z.string(), how: z.string() })),
  ess: z.boolean(),
});
export type ClaimView = z.infer<typeof ClaimView>;

// --- Sen (screens.md, spec §12.2–§12.5, D94, D108, D109) ---

/** A run of Sen's text. A figure code couldn't trace is *not checked*; one read from your file is *from your file* (D108, D109). */
export const SenRun = z.object({ text: z.string(), mark: z.enum(['unchecked', 'file']).nullable() });
export type SenRun = z.infer<typeof SenRun>;

export const SenPart = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), runs: z.array(SenRun) }),
  /** A file you sent (D109). */
  z.object({ type: z.literal('file'), name: z.string(), kind: z.enum(['pdf', 'image']) }),
  /** `propose` (§12.3): *Apply* or *Dismiss*, also in Review. */
  z.object({
    type: z.literal('proposal'),
    id: z.string(),
    title: z.string(),
    why: z.string(),
    status: z.enum(['open', 'applied', 'dismissed']),
  }),
  /** `research`: the findings, unedited, with numbered sources (§12.2 rule 6). Drafts until confirmed. */
  z.object({
    type: z.literal('research'),
    question: z.string(),
    findings: z.array(z.object({ text: z.string(), source: z.int().min(1) })),
    sources: z.array(
      z.object({ n: z.int().min(1), title: z.string(), site: z.string(), url: z.string(), checkedOn: Day }),
    ),
    confirmed: z.boolean(),
  }),
  /** `ask_user`: 2–4 options, the recommended one first and marked. */
  z.object({
    type: z.literal('ask'),
    id: z.string(),
    question: z.string(),
    options: z.array(z.object({ label: z.string(), tradeoff: z.string(), recommended: z.boolean() })),
    answer: z.string().nullable(),
  }),
  /** `open_screen` or `link_record`: a button to a screen, never with an amount filled in. */
  z.object({ type: z.literal('open'), label: z.string(), screen: z.string(), id: z.string().nullable() }),
]);
export type SenPart = z.infer<typeof SenPart>;

export const SenMessage = z.object({
  id: z.string(),
  role: z.enum(['you', 'sen']),
  at: Instant,
  /** A check-in note, posted by a background run (§12.4). */
  checkin: z.boolean(),
  parts: z.array(SenPart),
  /** Still arriving. */
  streaming: z.boolean(),
});
export type SenMessage = z.infer<typeof SenMessage>;

export const SenView = z.object({
  messages: z.array(SenMessage),
  /** *Sen needs a connection*; *Sen is paused until 1 Nov* (§9.6). */
  state: z.enum(['ready', 'offline', 'paused']),
  pausedUntil: Day.nullable(),
  /** Questions that fit the screen Sen was opened from. */
  suggestions: z.array(z.string()),
});
export type SenView = z.infer<typeof SenView>;

export const MemoryView = z.object({ notes: z.array(z.object({ id: z.string(), text: z.string(), at: Instant })) });
export type MemoryView = z.infer<typeof MemoryView>;

export const ResearchView = z.object({
  briefs: z.array(
    z.object({ id: z.string(), question: z.string(), at: Instant, findings: z.int().min(0), confirmed: z.boolean() }),
  ),
});
export type ResearchView = z.infer<typeof ResearchView>;

/** AI credit (D98): computed from the ledger, never stored. The owner has no ledger: tokens, with an estimate. */
export const UsageView = z.object({
  owner: z.boolean(),
  unlimited: z.boolean(),
  balance: Sen,
  allowance: Amount,
  allowanceLeft: Amount,
  pausedUntil: Day.nullable(),
  /** This month by what used it: *Chat*, *Receipts*, *Evening notes*. */
  byUse: z.array(Labelled),
  /** The owner's estimate this month, labelled as one. */
  estimate: Amount.nullable(),
});
export type UsageView = z.infer<typeof UsageView>;

// --- Settings (screens.md's table, D52, D98) ---

export const MemberSwitches = z.object({
  shell: z.boolean(),
  capture: z.boolean(),
  agent: z.boolean(),
  splits: z.boolean(),
  email: z.boolean(),
  calendar: z.boolean(),
  claims: z.boolean(),
});
export type MemberSwitches = z.infer<typeof MemberSwitches>;

export const SettingsView = z.object({
  email: z.string(),
  admin: z.boolean(),
  switches: MemberSwitches,
  you: z.object({
    /** As banks print them (D17). */
    bankNames: z.array(z.string()),
    payday: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('last-working') }),
      z.object({ kind: z.literal('day'), day: z.int().min(1).max(31) }),
      z.object({ kind: z.literal('none') }),
    ]),
    qr: z.boolean(),
  }),
  categories: z.array(z.object({ id: Id, name: z.string(), kind: z.enum(['spend', 'income']), rules: z.int() })),
  rules: z.array(
    z.object({
      id: Id,
      merchant: z.string(),
      category: z.string(),
      hawker: z.boolean(),
      /** Where the rule came from (merchant_rules.set_by): your answer, or Sen's suggestion you confirmed. */
      setBy: z.enum(['user', 'agent']),
    }),
  ),
  receiptsByEmail: z.object({ address: z.string(), code: z.string().nullable(), received: z.int() }),
  claims: z.object({
    schemes: z.array(
      z.object({
        id: Id,
        name: z.string(),
        period: z.enum(['monthly']),
        cap: Amount,
        deadlineDay: z.int().min(1).max(28),
        source: z.enum(['tagged', 'evidence']),
      }),
    ),
    essSender: z.string().nullable(),
    ess: z.object({
      signedIn: z.boolean(),
      capabilities: z.array(z.object({ name: z.string(), recorded: z.boolean() })),
      lastPayslip: Day.nullable(),
    }),
  }),
  sen: z.object({ calendar: z.boolean(), memories: z.int(), credit: UsageView }),
  members: z.array(
    z.object({
      id: Id,
      name: z.string(),
      email: z.string(),
      status: z.enum(['active', 'invited', 'suspended']),
      switches: MemberSwitches,
      balance: Sen,
      allowance: Amount,
      allowanceLeft: Amount,
      unlimited: z.boolean(),
      dailyCeiling: Amount,
      shellVersion: z.string().nullable(),
      captureConnected: z.boolean(),
    }),
  ),
  seats: z.object({ used: z.int(), of: z.int() }),
  data: z.object({ lastBackup: Instant.nullable(), exportReady: z.boolean() }),
});
export type SettingsView = z.infer<typeof SettingsView>;

// --- Payday (screens.md, spec §9.7, D60, D104) ---

export const PaydayStep = z.enum(['claims', 'balance', 'look-back', 'plan']);
export type PaydayStep = z.infer<typeof PaydayStep>;

export const PaydayView = z.object({
  salary: Amount,
  /** The steps this person can use (D52), in order. */
  steps: z.array(PaydayStep),
  claims: z
    .object({
      /** The payslip matched: code split the salary, shown done with *Undo* (D104). */
      answered: z.boolean(),
      claims: z.array(Labelled),
    })
    .nullable(),
  lookBack: z.object({ reasons: z.array(Labelled), experiment: z.string() }).nullable(),
  plan: z
    .object({ lines: z.array(z.object({ label: z.string(), sen: Sen, kind: z.enum(['due', 'aside', 'spend']) })) })
    .nullable(),
});
export type PaydayView = z.infer<typeof PaydayView>;
