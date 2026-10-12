import type { Command, WriteResult } from '@sen/core/commands';
import type {
  AccountsView,
  AccountView,
  BalanceCheckView,
  ClaimsView,
  ClaimView,
  MemoryView,
  PaydayView,
  ResearchView,
  SenView,
  SettingsView,
  SharedView,
  SplitView,
  UsageView,
  BudgetsView,
  CycleView,
  GoalsView,
  GoalView,
  HomeView,
  InsightsView,
  MeView,
  PaymentFilters,
  PaymentsView,
  ReceiptDraft,
  ReceiptView,
  ReviewView,
  SkippedView,
  SubscriptionsView,
  TxnView,
  YearView,
} from '@sen/core/views';

/** A choice in a picker: a category or an account. */
export interface Choice {
  id: string;
  label: string;
}

/** A payment a receipt could attach to (§6.4 matching): same amount, within 3 hours. */
export interface MatchChoice {
  id: string;
  label: string;
}

/**
 * The one interface every screen reads and writes through (B03). Three backends sit behind it: the
 * skeleton's `fake`, in memory; `api`, the browser's, from B05 and B07 (each read a route or view of
 * §16, each command a route's body); and `outbox`, the shell's, from B07, which writes to SQLite first
 * and syncs. Screens never know which one they have.
 */
export interface Backend {
  home(): Promise<HomeView>;
  cycle(id?: string): Promise<CycleView>;
  review(): Promise<ReviewView>;
  skipped(): Promise<SkippedView>;
  payments(filters: PaymentFilters): Promise<PaymentsView>;
  txn(id: string): Promise<TxnView | null>;
  receipt(id: string): Promise<ReceiptView | null>;
  insights(cycle?: string): Promise<InsightsView>;
  budgets(cycle?: string): Promise<BudgetsView>;
  subscriptions(): Promise<SubscriptionsView>;
  goals(): Promise<GoalsView>;
  goal(id: string): Promise<GoalView | null>;
  year(year?: number): Promise<YearView>;
  me(): Promise<MeView>;
  /** Most used first (§6.8). */
  categories(kind: 'spend' | 'income'): Promise<Choice[]>;
  /** Tracked accounts, and the one used last (§6.8). */
  accounts(): Promise<{ accounts: Choice[]; last: string | null }>;

  // B04
  split(id: string): Promise<SplitView | null>;
  shared(): Promise<SharedView>;
  /** `accounts`: balances, elsewhere accounts and the gap (capture only). */
  accountList(): Promise<AccountsView>;
  account(id: string): Promise<AccountView | null>;
  balanceCheck(): Promise<BalanceCheckView>;
  claimList(): Promise<ClaimsView>;
  claim(id: string): Promise<ClaimView | null>;
  /** The one conversation, with suggestions for the screen it was opened from. */
  sen(from: string): Promise<SenView>;
  memory(): Promise<MemoryView>;
  research(): Promise<ResearchView>;
  usage(): Promise<UsageView>;
  settings(): Promise<SettingsView>;
  payday(): Promise<PaydayView | null>;

  /** A file to read as a receipt (`POST /receipts/upload-url`, then `/extract`): returns its draft's id. */
  upload(file: File | null, forTxnId: string | null): Promise<string>;
  /** Enter the items by hand (D90): a draft with no photo, for a payment or none. */
  byHand(forTxnId: string | null): Promise<string>;
  draft(id: string): Promise<ReceiptDraft | null>;
  /** Unlinked payments a receipt could be (§6.4). */
  matches(total: number, at: string): Promise<MatchChoice[]>;
  /** A captured payment that looks like this one: a warning that doesn't block (§6.5). */
  nearDuplicate(amount: number, at: string): Promise<string | null>;

  /** Every change, at once; the result says what happened and how to undo it (§6.7). */
  run(command: Command): Promise<WriteResult>;
  /** "Something changed" (D100): the screens refetch. Returns how to stop listening. */
  subscribe(onChange: () => void): () => void;
}
