import { addDays, daysBetween, klDay, monthCycles, monthEnd, monthName, payCycles, type Cycle } from '@sen/core/cycles';
import { formatSen, fxApprox, medianSen, scaleSen } from '@sen/core/money';
import type { Transaction } from '@sen/core/schema';
import type {
  BudgetsView,
  CycleRef,
  CycleView,
  GoalSummary,
  GoalsView,
  GoalView,
  HomeView,
  InsightsView,
  MeView,
  PaymentFilters,
  PaymentRow,
  PaymentsView,
  ReceiptView,
  ReviewView,
  RowMarkKind,
  SkippedView,
  SubscriptionsView,
  TxnView,
  YearView,
} from '@sen/core/views';
import type { Db } from './db';

// The fake's read side: each screen's shape, computed from the rows the way B05's SQL views will
// (spec §15 *SQL views and functions*). Spending follows §7: a bill's spending is the smaller of your
// share and what's left after repayments (D19); a refund lowers its purchase, in the purchase's cycle
// (D21); the balance check's adjustments net into Unaccounted. Every figure is code's.

export interface FakeEnv {
  /** Offline: rows written stay in the outbox, marked Not synced yet (§5). */
  offline: boolean;
}

const today = (db: Db) => klDay(db.now);
const live = (db: Db) => db.txns.filter((t) => !t.deletedAt);
const dayOf = (t: Transaction) => klDay(t.occurredAt);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));

// --- time ---

export function cycles(db: Db): CycleRef[] {
  const t = today(db);
  const raw: Cycle[] = db.capture
    ? payCycles(
        live(db)
          .filter(
            (x) =>
              x.kind === 'income' &&
              x.categoryId &&
              db.categories.find((c) => c.id === x.categoryId)?.systemKey === 'salary',
          )
          .map(dayOf),
        db.openingDay,
        t,
      )
    : monthCycles(db.openingDay, t);
  return raw.map((c) => ({
    id: c.start,
    label: c.label,
    start: c.start,
    end: c.end,
    basis: db.capture ? 'pay' : 'month',
    expectedPayday: c.expectedPayday,
    current: c.start <= t && t <= c.end,
  }));
}

function cycleById(db: Db, id?: string): { cycle: CycleRef; all: CycleRef[]; index: number } {
  const all = cycles(db);
  let index = id ? all.findIndex((c) => c.id === id) : -1;
  if (index < 0) index = all.length - 1;
  return { cycle: all[index]!, all, index };
}

const inRange = (t: Transaction, c: { start: string; end: string }) => {
  const d = dayOf(t);
  return c.start <= d && d <= c.end;
};

// --- money rules (§7) ---

/** What a payment adds to spending, after its repayments and refunds (D19, D21); netted adjustments. */
export function spendingOf(db: Db, t: Transaction): number {
  if (t.deletedAt) return 0;
  if (t.kind === 'adjustment') return t.direction === 'out' ? t.amount : -t.amount;
  if (t.kind !== 'spend') return 0;
  const linked = live(db).filter((x) => x.linkedTransactionId === t.id);
  const repaid = sum(linked.filter((x) => x.kind === 'repayment').map((x) => x.amount));
  const refunded = sum(linked.filter((x) => x.kind === 'refund').map((x) => x.amount));
  const share = t.myShare ?? t.amount;
  return Math.max(0, Math.min(share, t.amount - repaid) - refunded);
}

const isIncome = (t: Transaction) => t.kind === 'income' && t.status !== 'needs_attention';

function spentIn(db: Db, c: { start: string; end: string }) {
  return sum(
    live(db)
      .filter((t) => inRange(t, c))
      .map((t) => spendingOf(db, t)),
  );
}
function incomeIn(db: Db, c: { start: string; end: string }) {
  return sum(
    live(db)
      .filter((t) => inRange(t, c) && isIncome(t))
      .map((t) => t.amount),
  );
}

/** Spent by the end of each day of the cycle, from its first day to `upto`. */
function cumulative(db: Db, c: { start: string; end: string }, upto: string): number[] {
  const perDay = new Map<string, number>();
  for (const t of live(db)) if (inRange(t, c)) perDay.set(dayOf(t), (perDay.get(dayOf(t)) ?? 0) + spendingOf(db, t));
  const out: number[] = [];
  let run = 0;
  for (let d = c.start; d <= upto && d <= c.end; d = addDays(d, 1)) {
    run += perDay.get(d) ?? 0;
    out.push(run);
  }
  return out;
}

export function balances(db: Db): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of db.accounts) if (a.kind === 'tracked') m.set(a.id, a.openingBalance);
  for (const t of live(db)) {
    if (!t.accountId || !m.has(t.accountId)) continue;
    const a = db.accounts.find((x) => x.id === t.accountId)!;
    if (t.occurredAt < a.openingAt) continue;
    m.set(t.accountId, m.get(t.accountId)! + (t.direction === 'in' ? t.amount : -t.amount));
  }
  return m;
}

/**
 * Spending projected to the cycle's last day (`project_cycle_end`, §12.3, until B30 makes it Sen's):
 * fixed costs once, everything else at this cycle's daily pace so far. An estimate, labelled as one.
 */
function projectSpending(db: Db, c: { start: string; end: string }, upto: string): number {
  const fixed = new Set(['Home & bills', 'Phone & internet', 'Subscriptions', 'Family'].map((n) => db.categories.find((x) => x.name === n)?.id));
  const txns = live(db).filter((t) => inRange(t, { start: c.start, end: upto }));
  const fixedSpent = sum(txns.filter((t) => fixed.has(t.categoryId ?? undefined)).map((t) => spendingOf(db, t)));
  const rest = sum(txns.map((t) => spendingOf(db, t))) - fixedSpent;
  const day = daysBetween(c.start, upto) + 1;
  const days = daysBetween(c.start, c.end) + 1;
  return fixedSpent + scaleSen(rest, days, day);
}

// --- Home ---

export function home(db: Db): HomeView {
  const { cycle, all, index } = cycleById(db);
  const t = today(db);
  const day = daysBetween(cycle.start, t) + 1;
  const days = daysBetween(cycle.start, cycle.end) + 1;
  const spentByDay = cumulative(db, cycle, t);
  const spent = spentByDay[spentByDay.length - 1] ?? 0;
  const income = incomeIn(db, cycle);
  const salaryId = db.categories.find((c) => c.systemKey === 'salary')?.id;
  const hasSalary = live(db).some((x) => x.categoryId === salaryId && x.kind === 'income' && inRange(x, cycle));
  const kind = !db.capture ? 'month' : hasSalary ? 'left' : 'since-start';
  const sen = kind === 'left' ? income - spent : spent;
  const last = index > 0 ? all[index - 1]! : null;
  const lastCycle = last ? cumulative(db, last, last.end) : null;
  const lastByToday = lastCycle?.length ? lastCycle[Math.min(day, lastCycle.length) - 1]! : null;
  const bal = balances(db);
  const lastCheck = [...db.checks].sort((a, b) => b.asOf.localeCompare(a.asOf))[0];
  const gapTxn = lastCheck?.adjustmentTransactionId
    ? db.txns.find((x) => x.id === lastCheck.adjustmentTransactionId)
    : undefined;
  return {
    cycle,
    capture: db.capture,
    health: db.health,
    payday: db.payday,
    figure: {
      kind,
      sen,
      over: kind === 'left' && sen < 0,
      daysToGo: Math.max(
        0,
        daysBetween(t, db.capture ? (cycle.expectedPayday ?? addDays(cycle.end, 1)) : addDays(cycle.end, 1)),
      ),
      day,
      days,
      spent,
      income,
      spentByDay,
    },
    pace: { spent, delta: lastByToday === null ? null : spent - lastByToday, thisCycle: spentByDay, lastCycle },
    note: db.agent ? db.note : null,
    quiet: db.capture
      ? {
          balance: sum([...bal.values()]),
          gap:
            gapTxn && lastCheck
              ? { sen: gapTxn.direction === 'out' ? gapTxn.amount : -gapTxn.amount, on: klDay(lastCheck.asOf) }
              : null,
        }
      : null,
    unsynced: Object.keys(db.unsynced).length,
  };
}

export function cycleSheet(db: Db, id?: string): CycleView {
  const { cycle, all, index } = cycleById(db, id);
  const t = today(db);
  const spending = spentIn(db, cycle);
  const income = incomeIn(db, cycle);
  const last = index > 0 ? all[index - 1]! : null;
  return {
    cycle,
    income,
    spending,
    result: income - spending,
    // project_cycle_end (§12.3), a straight line at this cycle's pace: an estimate, labelled as one
    estimate: db.capture && cycle.current ? income - projectSpending(db, cycle, t) : null,
    lastSpending: !db.capture && last ? spentIn(db, last) : null,
  };
}

// --- Review ---

export function review(db: Db): ReviewView {
  const txns = byId(db.txns);
  const splits = db.splits
    .filter((s) => s.paidBy === 'me' && s.status === 'open')
    .flatMap((s) => {
      const others = db.members.filter((m) => m.splitId === s.id && !m.isMe);
      const paid = others.filter((m) => m.paidAt);
      if (paid.length === others.length) return [];
      return [
        {
          splitId: s.id,
          bill: (s.transactionId && txns.get(s.transactionId)?.merchantRaw) || 'A shared bill',
          back: sum(paid.map((m) => m.share)),
          of: sum(others.map((m) => m.share)),
          people: `${paid.length} of ${others.length} paid you back`,
        },
      ];
    });
  return {
    needsYou: [...db.review].sort((a, b) => b.at.localeCompare(a.at)),
    waiting: {
      splits,
      receipts: db.receipts
        .filter((r) => r.status === 'awaiting_payment')
        .map((r) => ({
          receiptId: r.id,
          merchant: r.merchantRaw ?? 'A receipt',
          total: r.total,
          at: r.occurredAt ?? r.createdAt,
        })),
      refunds: db.promises
        .filter((p) => p.status === 'waiting')
        .map((p) => ({ id: p.id, counterparty: p.counterparty, amount: p.expectedAmount, by: p.expectedBy })),
    },
    skipped: db.events.filter((e) => e.parseStatus === 'skipped').length,
    capture: db.capture,
  };
}

const APP_NAMES: Record<string, string> = {
  'my.rytbank.app': 'Ryt Bank',
  'my.com.tngdigital.ewallet': 'TNG eWallet',
  'com.pbb.mypb': 'MyPB',
  'com.grabtaxi.passenger': 'Grab',
};

export function skipped(db: Db): SkippedView {
  return {
    events: db.events
      .filter((e) => e.parseStatus === 'skipped')
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
      .map((e) => ({ id: e.id, app: APP_NAMES[e.package] ?? e.package, at: e.postedAt, title: e.title, text: e.text })),
  };
}

// --- Payments ---

/** A row is Not synced yet only while offline, or after 5 seconds, so a normal sync never flickers (patterns.md §7). */
function pending(db: Db, env: FakeEnv, id: string): boolean {
  const since = db.unsynced[id];
  if (!since) return false;
  return env.offline || Date.now() - Date.parse(since) > 5000;
}

function marksOf(db: Db, env: FakeEnv, t: Transaction, ids: string[]): RowMarkKind[] {
  const marks: RowMarkKind[] = [];
  if (db.receipts.some((r) => r.transactionId === t.id)) marks.push('receipt');
  if (db.splits.some((s) => s.transactionId === t.id)) marks.push('split');
  if (t.status === 'needs_attention' || db.review.some((r) => 'txnId' in r && r.txnId === t.id)) marks.push('review');
  if (ids.some((id) => pending(db, env, id))) marks.push('pending');
  if (t.source === 'inferred') marks.push('filled');
  return marks;
}

const acctName = (db: Db, id: string | null) => (id ? (db.accounts.find((a) => a.id === id)?.name ?? null) : null);
const catName = (db: Db, id: string | null) => (id ? (db.categories.find((c) => c.id === id)?.name ?? null) : null);

function rowOf(db: Db, env: FakeEnv, t: Transaction): PaymentRow | null {
  if (t.kind === 'transfer' && t.transferGroupId) {
    const sides = db.txns.filter((x) => x.transferGroupId === t.transferGroupId && !x.deletedAt);
    const out = sides.find((x) => x.direction === 'out');
    const inn = sides.find((x) => x.direction === 'in');
    // one row per transfer, from its money-out side when it has one (screens.md `payments`)
    if (t.direction === 'in' && out) return null;
    const row = rowBase(
      db,
      env,
      out ?? t,
      sides.map((x) => x.id),
    );
    return {
      ...row,
      title: `${acctName(db, out?.accountId ?? null) ?? 'Elsewhere'} → ${acctName(db, inn?.accountId ?? null) ?? 'Elsewhere'}`,
      account: null,
      category: 'Transfer',
    };
  }
  return rowBase(db, env, t, [t.id]);
}

function rowBase(db: Db, env: FakeEnv, t: Transaction, ids: string[]): PaymentRow {
  const title =
    t.kind === 'adjustment'
      ? 'Balance check difference'
      : t.kind === 'transfer' && !t.transferGroupId
        ? `${t.merchantRaw ?? 'Elsewhere'} → ${acctName(db, t.accountId) ?? ''}`
        : (t.merchantRaw ?? 'Payment');
  const category =
    catName(db, t.categoryId) ??
    (t.kind === 'repayment'
      ? 'Paid back'
      : t.kind === 'refund'
        ? 'Refund'
        : t.kind === 'transfer'
          ? 'Transfer'
          : t.direction === 'in'
            ? 'Money in'
            : 'No category yet');
  return {
    id: t.id,
    at: t.occurredAt,
    title,
    category,
    account: acctName(db, t.accountId),
    direction: t.direction,
    kind: t.kind,
    amount: t.amount,
    spending: spendingOf(db, t),
    marks: marksOf(db, env, t, ids),
    note: t.note,
  };
}

export function payments(db: Db, env: FakeEnv, f: PaymentFilters = {}): PaymentsView {
  const all = cycles(db);
  const range = !f.cycle || f.cycle === 'all' ? null : all.find((c) => c.id === f.cycle);
  const q = f.q?.trim().toLowerCase();
  const rows: PaymentRow[] = [];
  for (const t of live(db)) {
    if (range && !inRange(t, range)) continue;
    if (
      f.accountId &&
      t.accountId !== f.accountId &&
      !(
        t.transferGroupId && db.txns.some((x) => x.transferGroupId === t.transferGroupId && x.accountId === f.accountId)
      )
    )
      continue;
    if (f.categoryId && t.categoryId !== f.categoryId) continue;
    if (f.shared && !db.splits.some((s) => s.transactionId === t.id) && t.kind !== 'repayment') continue;
    const row = rowOf(db, env, t);
    if (!row) continue;
    if (q) {
      const items = db.receipts
        .filter((r) => r.transactionId === t.id)
        .flatMap((r) => db.items.filter((i) => i.receiptId === r.id).map((i) => i.description));
      const hay = [row.title, row.category, row.account, t.note, ...items].join(' ').toLowerCase();
      if (!hay.includes(q)) continue;
    }
    rows.push(row);
  }
  rows.sort((a, b) => b.at.localeCompare(a.at));
  return { rows };
}

// --- one payment ---

/** The raw notification, in the app's own words (notifications.md), with every digit outside an amount masked as stored (D121). */
function bankText(db: Db, t: Transaction): { app: string; title: string; text: string } | null {
  if (t.source !== 'notification' && t.source !== 'inferred') return null;
  if (t.bankEventId) {
    const e = db.events.find((x) => x.id === t.bankEventId);
    if (e) return { app: APP_NAMES[e.package] ?? e.package, title: e.title, text: e.text };
  }
  const a = db.accounts.find((x) => x.id === t.accountId);
  if (!a?.notifierPackage || t.source === 'inferred') return null;
  const amt = formatSen(t.amount);
  const name = t.merchantRaw ?? '';
  const app = APP_NAMES[a.notifierPackage] ?? a.name;
  switch (a.notifierPackage) {
    case 'my.rytbank.app':
      if (t.direction === 'in')
        return {
          app,
          title: 'Your money is in!',
          text: `You've received ${amt} from ${name} on ••/••/••••, •:•• PM (GMT+•).`,
        };
      if (/^[A-Z ]+$/.test(name) && !/[a-z]/.test(name) && t.kind !== 'spend')
        return {
          app,
          title: 'Nice! Transfer settled!',
          text: `You've sent ${amt} to ${name} on ••/••/••••, •:•• PM (GMT+•) using your Main Account.`,
        };
      return { app, title: 'Card payment completed 👍', text: `${amt} paid at ${name} using your Main Account.` };
    case 'my.com.tngdigital.ewallet':
      if (a.notifierLabel === 'GO+')
        return {
          app,
          title: 'Cash In Successful',
          text: `You have successfully cashed in ${amt} into your GO+ account.`,
        };
      if (t.direction === 'in')
        return {
          app,
          title: 'You’ve received money!',
          text: `${name} has transferred ${amt.replace('RM', 'RM ')} to you. Tap here to check the transaction details.`,
        };
      return {
        app,
        title: 'DuitNow Transfer is successful!',
        text: `You have successfully transferred ${amt.replace('RM', 'RM ')} to ${name}.`,
      };
    case 'com.pbb.mypb':
      return {
        app,
        title: 'Money Received',
        text: `PBB. You have received a DuitNow Transfer of ${amt} from ${name}.`,
      };
    case 'com.grabtaxi.passenger':
      return {
        app,
        title: '',
        text: `Your GrabPay Wallet has been charged ${amt.replace('RM', 'MYR ')} for booking •••••••••••-•••••••••••••-G-•.`,
      };
    default:
      return null;
  }
}

export function txnView(db: Db, env: FakeEnv, id: string): TxnView | null {
  const t = db.txns.find((x) => x.id === id);
  if (!t) return null;
  const a = acctName(db, t.accountId);
  const other = t.transferGroupId
    ? db.txns.find((x) => x.transferGroupId === t.transferGroupId && x.id !== t.id)
    : undefined;
  const rule = db.rules.find((r) => r.merchantKey === t.merchantKey);
  const event = t.bankEventId ? db.events.find((e) => e.id === t.bankEventId) : undefined;
  const tmpl = event?.parsedBy ? db.templates.find((x) => x.id === event.parsedBy) : undefined;
  const receipt = db.receipts.find((r) => r.transactionId === t.id);
  const split = db.splits.find((s) => s.transactionId === t.id);
  const row = rowOf(db, env, t) ?? rowBase(db, env, t, [t.id]);
  const SOURCE: Record<Transaction['source'], string> = {
    notification: `From ${a ?? 'the bank'}'s notification`,
    manual: 'Added by you',
    receipt: 'From a receipt',
    inferred: 'Filled in from your transfer rule',
    adjustment: 'From your balance check',
  };
  let splitView: TxnView['split'] = null;
  if (split) {
    const others = db.members.filter((m) => m.splitId === split.id && !m.isMe);
    const paid = others.filter((m) => m.paidAt);
    splitView = {
      id: split.id,
      state: split.lockedAt ? 'Final' : 'Still changing',
      detail: `${paid.length} of ${others.length} paid you back · ${formatSen(sum(paid.map((m) => m.share)))} of ${formatSen(sum(others.map((m) => m.share)))}`,
    };
  }
  return {
    txn: t,
    title: row.title,
    account: a,
    otherAccount: other ? acctName(db, other.accountId) : null,
    category: catName(db, t.categoryId),
    // every category in the scenario's history came from its merchant's rule
    fromRule: !!t.categoryId && t.source === 'notification' && (!!rule || t.status === 'done'),
    sourceLabel: SOURCE[t.source],
    provisional: tmpl?.status === 'provisional',
    spending: spendingOf(db, t),
    synced: !pending(db, env, t.id),
    receipt: receipt
      ? {
          id: receipt.id,
          items: db.items.filter((i) => i.receiptId === receipt.id).length,
          merchant: receipt.merchantRaw,
        }
      : null,
    split: splitView,
    bank: bankText(db, t),
    changes: db.changes[t.id] ?? [{ at: t.createdAt, what: t.source === 'manual' ? 'Added by you' : 'Captured' }],
  };
}

export function receiptView(db: Db, id: string): ReceiptView | null {
  const r = db.receipts.find((x) => x.id === id);
  if (!r) return null;
  const t = r.transactionId ? db.txns.find((x) => x.id === r.transactionId) : undefined;
  return {
    receipt: r,
    items: db.items
      .filter((i) => i.receiptId === r.id)
      .map((i) => ({
        id: i.id,
        description: i.description,
        qty: i.qty,
        price: i.price,
        category: catName(db, i.categoryId),
        who: db.picks[i.id] ?? null,
        kind: i.kind,
      })),
    hasPhoto: r.source !== 'manual',
    payment: t ? { id: t.id, label: `${formatSen(t.amount)} on ${acctName(db, t.accountId) ?? 'a payment'}` } : null,
  };
}

// --- Insights (§9.3) ---

/** A category's spending by the same day of each past cycle: its typical level by now is their median. */
function typicalByDay(db: Db, past: CycleRef[], catId: string, day: number): number {
  const values = past.slice(-12).map((c) => {
    const upto = addDays(c.start, day - 1);
    return sum(
      live(db)
        .filter((t) => t.categoryId === catId && inRange(t, { start: c.start, end: upto < c.end ? upto : c.end }))
        .map((t) => spendingOf(db, t)),
    );
  });
  return medianSen(values) ?? 0;
}

export function insights(db: Db, id?: string): InsightsView {
  const { cycle, all, index } = cycleById(db, id);
  const t = today(db);
  const upto = cycle.current ? t : cycle.end;
  const day = daysBetween(cycle.start, upto) + 1;
  const days = daysBetween(cycle.start, cycle.end) + 1;
  const txns = live(db).filter((x) => inRange(x, { start: cycle.start, end: upto }));
  const past = all.slice(0, index);
  const last = past[past.length - 1];
  const cats = db.categories.filter((c) => c.kind === 'spend' && c.systemKey !== 'unaccounted');
  const spendByCat = new Map<string, number>();
  for (const x of txns)
    if (x.categoryId) spendByCat.set(x.categoryId, (spendByCat.get(x.categoryId) ?? 0) + spendingOf(db, x));
  const thisCycle = cumulative(db, cycle, upto);
  const spent = thisCycle[thisCycle.length - 1] ?? 0;
  const income = incomeIn(db, cycle);
  if (!txns.length)
    return {
      cycle,
      cycles: all,
      capture: db.capture,
      onTrack: null,
      budgets: null,
      whereWent: null,
      leak: null,
      smallThings: null,
      meal: null,
      experiment: null,
      eatOut: null,
      spokenFor: null,
      renews: null,
      saving: null,
      goals: null,
      trust: null,
      topMerchants: null,
    };

  const catOf = (name: string) => db.categories.find((c) => c.name === name)?.id;
  const whereWent = cats
    .map((c) => ({
      id: c.id,
      label: c.name,
      sen: spendByCat.get(c.id) ?? 0,
      typical: typicalByDay(db, past, c.id, day),
    }))
    .filter((r) => r.sen > 0)
    .sort((a, b) => b.sen - a.sen)
    .slice(0, 8);

  const disc = new Set(db.categories.filter((c) => c.isDiscretionary).map((c) => c.id));
  const leak: (number | null)[] = Array.from({ length: days }, (_, i) => (addDays(cycle.start, i) > upto ? null : 0));
  for (const x of txns)
    if (x.categoryId && disc.has(x.categoryId))
      leak[daysBetween(cycle.start, dayOf(x))] = (leak[daysBetween(cycle.start, dayOf(x))] ?? 0) + spendingOf(db, x);

  const UNDER = 1500;
  const small = txns.filter((x) => x.kind === 'spend' && x.amount < UNDER);

  // the meal average: a bill ÷ the people who ate it, or your share on a split (D66)
  const meals = new Set(db.categories.filter((c) => c.isMeal).map((c) => c.id));
  const mealCost = (c: { start: string; end: string }) => {
    const per = live(db)
      .filter((x) => x.kind === 'spend' && x.categoryId && meals.has(x.categoryId) && inRange(x, c))
      .map((x) => {
        const r = db.receipts.find((y) => y.transactionId === x.id);
        const onSplit = db.splits.some((s) => s.transactionId === x.id);
        return onSplit || !r ? spendingOf(db, x) : scaleSen(spendingOf(db, x), 1, r.pax);
      });
    return per.length ? { average: scaleSen(sum(per), 1, per.length), meals: per.length } : null;
  };
  const meal = mealCost({ start: cycle.start, end: upto });

  const budgets = db.budgets
    .map((b) => ({
      id: b.id,
      label: catName(db, b.categoryId) ?? '',
      sen: spendByCat.get(b.categoryId) ?? 0,
      cap: b.amount,
    }))
    .filter((b) => b.cap > 0);

  const exp = db.experiment;
  const weeks = exp
    ? Array.from({ length: Math.ceil(day / 7) }, (_, w) => {
        const s = addDays(cycle.start, w * 7);
        const e = addDays(s, 6);
        return {
          label: `Week ${w + 1}`,
          count: txns.filter((x) => x.merchantKey === exp.merchantKey && inRange(x, { start: s, end: e })).length,
        };
      })
    : [];

  const FIXED = ['Home & bills', 'Phone & internet', 'Subscriptions', 'Family'].map(catOf);
  const fixedLast = last
    ? sum(
        live(db)
          .filter((x) => inRange(x, last) && FIXED.includes(x.categoryId ?? undefined))
          .map((x) => spendingOf(db, x)),
      )
    : 0;
  const fixedNow = sum(txns.filter((x) => FIXED.includes(x.categoryId ?? undefined)).map((x) => spendingOf(db, x)));
  const fixed = Math.max(fixedLast, fixedNow);

  const subs = subscriptions(db);
  const saving = past.slice(-6).map((c) => ({ label: c.label, sen: incomeIn(db, c) - spentIn(db, c) }));
  const unacc = catOf('Unaccounted');
  const trust = past
    .slice(-6)
    .concat([cycle])
    .map((c) => ({
      label: c.label,
      sen: sum(
        live(db)
          .filter((x) => x.categoryId === unacc && inRange(x, c))
          .map((x) => spendingOf(db, x)),
      ),
    }));
  const merchants = new Map<string, { count: number; sen: number }>();
  for (const x of txns)
    if (x.kind === 'spend' && x.merchantRaw) {
      const m = merchants.get(x.merchantRaw) ?? { count: 0, sen: 0 };
      merchants.set(x.merchantRaw, { count: m.count + 1, sen: m.sen + spendingOf(db, x) });
    }
  const goals = goalsView(db).goals;

  return {
    cycle,
    cycles: all,
    capture: db.capture,
    onTrack: {
      thisCycle,
      lastCycle: last ? cumulative(db, last, last.end) : null,
      days,
      income: db.capture && income ? income : null,
      estimate: cycle.current ? projectSpending(db, cycle, upto) : null,
    },
    budgets: budgets.length ? { cycleShare: day / days, rows: budgets } : null,
    whereWent: whereWent.length ? whereWent : null,
    leak: { spent: leak, days },
    smallThings: small.length
      ? { count: small.length, total: sum(small.map((x) => spendingOf(db, x))), under: UNDER }
      : null,
    meal: meal
      ? {
          ...meal,
          history: past
            .slice(-5)
            .concat([cycle])
            .map((c) => ({ label: c.label, sen: mealCost(c)?.average ?? 0 })),
        }
      : null,
    experiment: exp && weeks.length ? { label: exp.label, limit: exp.perWeek, weeks } : null,
    eatOut: (() => {
      const eatingOut = sum(txns.filter((x) => x.categoryId && meals.has(x.categoryId)).map((x) => spendingOf(db, x)));
      const groceries = spendByCat.get(catOf('Groceries') ?? '') ?? 0;
      return eatingOut || groceries ? { eatingOut, groceries } : null;
    })(),
    spokenFor:
      db.capture && income
        ? { fixed, spent: Math.max(0, spent - fixedNow), left: income - fixed - Math.max(0, spent - fixedNow) }
        : null,
    renews: subs.rows.length
      ? {
          monthly: subs.monthly,
          next: subs.rows.slice(0, 3).map((r) => ({ id: r.id, name: r.name, on: r.next, sen: r.approx })),
        }
      : null,
    saving:
      db.capture && saving.length >= 2 ? { cycles: saving, median: medianSen(saving.map((s) => s.sen)) ?? 0 } : null,
    goals: goals.length ? goals.map((g) => ({ id: g.id, name: g.name, saved: g.saved, target: g.target })) : null,
    trust: db.capture && past.length ? { cycles: trust } : null,
    topMerchants: merchants.size
      ? [...merchants]
          .map(([label, m]) => ({ label, ...m }))
          .sort((a, b) => b.count - a.count || b.sen - a.sen)
          .slice(0, 5)
      : null,
  };
}

export function budgets(db: Db, id?: string): BudgetsView {
  const { cycle } = cycleById(db, id);
  const t = today(db);
  const upto = cycle.current ? t : cycle.end;
  const day = daysBetween(cycle.start, upto) + 1;
  const days = daysBetween(cycle.start, cycle.end) + 1;
  const rows = db.budgets
    .filter((b) => b.amount > 0)
    .map((b) => ({
      id: b.id,
      categoryId: b.categoryId,
      label: catName(db, b.categoryId) ?? '',
      sen: sum(
        live(db)
          .filter((x) => x.categoryId === b.categoryId && inRange(x, { start: cycle.start, end: upto }))
          .map((x) => spendingOf(db, x)),
      ),
      cap: b.amount,
    }));
  const used = new Set(rows.map((r) => r.categoryId));
  return {
    cycle,
    cycleShare: day / days,
    rows,
    others: db.categories
      .filter((c) => c.kind === 'spend' && !c.systemKey && !used.has(c.id))
      .map((c) => ({ id: c.id, label: c.name })),
  };
}

export function subscriptions(db: Db): SubscriptionsView {
  const rows = db.subscriptions
    .filter((s) => s.status === 'active')
    .map((s) => {
      const approx = s.currency === 'MYR' ? s.amount : s.displayFxRate ? fxApprox(s.amount, s.displayFxRate) : 0;
      const history = db.charges
        .filter((c) => c.subscriptionId === s.id)
        .sort((a, b) => b.expectedDate.localeCompare(a.expectedDate))
        .map((c) => ({
          on: c.expectedDate,
          expected: s.currency === 'MYR' ? c.expectedAmount : approx,
          actual: c.matchedTransactionId
            ? (db.txns.find((x) => x.id === c.matchedTransactionId)?.amount ?? null)
            : null,
          status: c.status,
        }));
      return {
        id: s.id,
        name: s.name,
        cadence: s.cadence,
        amount: s.amount,
        currency: s.currency,
        approx,
        rate: s.displayFxRate,
        next: s.nextRenewalDate,
        history,
      };
    })
    .sort((a, b) => a.next.localeCompare(b.next));
  return { monthly: sum(rows.map((r) => (r.cadence === 'monthly' ? r.approx : scaleSen(r.approx, 1, 12)))), rows };
}

function surplus(db: Db): { median: number; sample: number } {
  const { all, index } = cycleById(db);
  const past = all.slice(0, index).slice(-6);
  const values = past.map((c) => incomeIn(db, c) - spentIn(db, c));
  return { median: medianSen(values) ?? 0, sample: values.length };
}

function summary(db: Db, g: Db['goals'][number]): GoalSummary {
  const saved = sum(db.contributions.filter((c) => c.goalId === g.id).map((c) => c.amount));
  const left = Math.max(0, g.targetAmount - saved);
  const cyclesLeft = g.targetDate ? Math.max(1, Math.round(daysBetween(today(db), g.targetDate) / 30)) : 12;
  return {
    id: g.id,
    name: g.name,
    kind: g.kind,
    saved,
    target: g.targetAmount,
    targetDate: g.targetDate,
    perCycle: scaleSen(left, 1, cyclesLeft),
  };
}

export function goalsView(db: Db): GoalsView {
  const s = surplus(db);
  return {
    goals: db.goals.filter((g) => g.status === 'active').map((g) => summary(db, g)),
    medianSurplus: s.median,
    sample: s.sample,
  };
}

export function goalView(db: Db, id: string): GoalView | null {
  const g = db.goals.find((x) => x.id === id);
  if (!g) return null;
  const goal = summary(db, g);
  const s = surplus(db);
  const contributions = db.contributions
    .filter((c) => c.goalId === g.id)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const perCycleNow = contributions.length ? scaleSen(goal.saved, 1, contributions.length) : 0;
  const left = Math.max(0, goal.target - goal.saved);
  return {
    goal,
    feasible: goal.perCycle <= s.median,
    medianSurplus: s.median,
    sample: s.sample,
    projectedFinish: perCycleNow > 0 ? addDays(today(db), Math.ceil(left / perCycleNow) * 30) : null,
    contributions: contributions.map((c) => ({ at: c.occurredAt, sen: c.amount })),
  };
}

export function year(db: Db, y?: number): YearView {
  const yr = y ?? parseYear(today(db));
  const months = Array.from({ length: 12 }, (_, i) => `${yr}-${String(i + 1).padStart(2, '0')}-01`).filter(
    (m) => m <= today(db),
  );
  const rows = months.map((m) => {
    const c = { start: m, end: monthEnd(m) };
    return { label: monthName(m).slice(0, 3), spent: spentIn(db, c), income: incomeIn(db, c) };
  });
  const inc = sum(rows.map((r) => r.income));
  const out = sum(rows.map((r) => r.spent));
  const reliefs = new Map<string, number>();
  for (const [id, code] of Object.entries(db.reliefs)) {
    const t = db.txns.find((x) => x.id === id);
    if (t && !t.deletedAt && dayOf(t).startsWith(String(yr)))
      reliefs.set(code, (reliefs.get(code) ?? 0) + spendingOf(db, t));
  }
  return {
    year: yr,
    months: rows,
    savingsRate: inc > 0 ? (inc - out) / inc : null,
    reliefs: [...reliefs].map(([label, sen]) => ({ label, sen })),
  };
}

const parseYear = (day: string) => [...day.slice(0, 4)].reduce((n, ch) => n * 10 + (ch.charCodeAt(0) - 48), 0);

export const me = (db: Db): MeView => ({
  capture: db.capture,
  claims: db.claims,
  agent: db.agent,
  aiPausedUntil: db.aiPausedUntil,
});

/** Categories for a picker, most used first over the last 90 days (§6.8). */
export function categoryChoices(db: Db, kind: 'spend' | 'income' = 'spend') {
  const since = addDays(today(db), -90);
  const counts = new Map<string, number>();
  for (const t of live(db))
    if (t.categoryId && dayOf(t) >= since) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  return db.categories
    .filter((c) => c.kind === kind && !c.archivedAt && c.systemKey !== 'unaccounted')
    .map((c) => ({ id: c.id, label: c.name, uses: counts.get(c.id) ?? 0 }))
    .sort((a, b) => b.uses - a.uses);
}

export function accountChoices(db: Db) {
  const lastManual = [...live(db)]
    .filter((t) => t.direction === 'out' && t.accountId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  return {
    accounts: db.accounts
      .filter((a) => a.kind === 'tracked' && !a.archivedAt)
      .map((a) => ({ id: a.id, label: a.name })),
    last: lastManual?.accountId ?? null,
  };
}
