import { klDay } from '@sen/core/cycles';
import { uid } from './ids';
import type { Db } from './db';
import { at, catId, rm, TODAY, txn, weiMing } from './scenario';

/**
 * The scenario's edge states (B03): each is Wei Ming's month, changed the one way it needs. The dev
 * panel switches between them; every *Varies* state in screens.md for the five tabs is one of these,
 * or one of the screen states (empty, loading, error, offline).
 */
export const SCENARIOS = ['wei-ming', 'payday', 'before-salary', 'first-cycle', 'month', 'capture-off', 'cap'] as const;
export type ScenarioId = (typeof SCENARIOS)[number];
export const SCENARIO_NAMES: Record<ScenarioId, string> = {
  'wei-ming': "Wei Ming's month",
  payday: 'Payday',
  'before-salary': 'Before the first salary',
  'first-cycle': 'The first cycle',
  month: 'Without capture (by month)',
  'capture-off': 'Capture is off',
  cap: 'AI credit used up',
};

/** Keeps only what happened on or after the opening day, as if the app had just been set up then. */
function openedOn(db: Db, day: string): Db {
  const from = at(day, '08:00');
  const keep = new Set(db.txns.filter((t) => t.occurredAt >= from).map((t) => t.id));
  db.openingDay = day;
  db.accounts = db.accounts.map((a) => ({ ...a, openingAt: from }));
  db.txns = db.txns.filter((t) => keep.has(t.id));
  db.receipts = db.receipts.filter((r) => !r.transactionId || keep.has(r.transactionId));
  db.items = db.items.filter((i) => db.receipts.some((r) => r.id === i.receiptId));
  db.contributions = db.contributions.filter((c) => c.occurredAt >= from);
  db.charges = db.charges.filter((c) => c.expectedDate >= day);
  db.checks = db.checks.filter((c) => c.asOf >= from);
  db.review = db.review.filter((r) => !('txnId' in r) || keep.has(r.txnId));
  return db;
}

export function buildScenario(id: ScenarioId, empty: boolean): Db {
  if (empty) return emptyDb();
  const db = weiMing();
  switch (id) {
    case 'wei-ming':
      return db;
    case 'payday':
      return payday(db);
    case 'before-salary': {
      // set up on 5 Oct, after September's salary: no salary seen yet (screens.md Varies)
      openedOn(db, '2026-10-05');
      db.payday = null;
      db.review = db.review.filter((r) => r.kind !== 'payday-step');
      return db;
    }
    case 'first-cycle': {
      // set up on payday morning, before the salary landed: this is the first cycle, with no last cycle
      openedOn(db, '2026-09-30');
      db.review = db.review.filter((r) => r.kind !== 'payday-step');
      return db;
    }
    case 'month':
      return withoutCapture(db);
    case 'capture-off':
      db.health = [
        {
          key: 'capture-off',
          title: 'Capture may be off',
          detail: 'No notification from your apps since Thursday, 9:12 am.',
          fix: 'Fix',
        },
      ];
      return db;
    case 'cap':
      db.aiPausedUntil = '2026-11-01';
      return db;
  }
}

/** Payday, 30 Oct at 9:20 am: the salary has just landed and the Payday card is up (D60). */
function payday(db: Db): Db {
  db.now = '2026-10-30T09:20:00+08:00';
  db.txns.push(
    txn({
      key: 'salary-oct',
      day: '2026-10-30',
      time: '09:12',
      merchant: 'SYARIKAT CONTOH SDN BHD',
      amount: rm('5,800.00'),
      acct: 'ryt',
      kind: 'income',
      cat: 'Salary',
    }),
  );
  db.payday = { stage: 'card' };
  db.note = { text: 'Payday. October ended RM1,240 ahead, your best in four cycles.', at: '2026-10-30T09:15:00+08:00' };
  return db;
}

/**
 * A friend in a browser (D52, D79): no capture, so no accounts, balances or gap; time runs by calendar
 * month; receipts and what's typed in are the whole ledger, and a receipt read and waiting creates its
 * payment when confirmed.
 */
function withoutCapture(db: Db): Db {
  const keepCats = new Set(['Meals', 'Groceries', 'Shopping', 'Entertainment', 'Health'].map(catId));
  const since = '2026-09-01';
  db.capture = false;
  db.claims = false;
  db.openingDay = '2026-09-01';
  db.accounts = [];
  db.txns = db.txns
    .filter(
      (t) =>
        t.kind === 'spend' &&
        t.categoryId &&
        keepCats.has(t.categoryId) &&
        klDay(t.occurredAt) >= since &&
        t.merchantKey !== 'GRABFOOD',
    )
    .filter((t, i) => i % 3 === 0 || db.receipts.some((r) => r.transactionId === t.id))
    .map((t) => ({
      ...t,
      accountId: null,
      myShare: null,
      source: db.receipts.some((r) => r.transactionId === t.id) ? ('receipt' as const) : ('manual' as const),
      status: 'done' as const,
    }));
  const ids = new Set(db.txns.map((t) => t.id));
  db.receipts = db.receipts.filter((r) => (r.transactionId ? ids.has(r.transactionId) : true));
  db.items = db.items.filter((i) => db.receipts.some((r) => r.id === i.receiptId));
  db.splits = db.splits.filter((s) => s.paidBy === 'other');
  db.members = db.members.filter((m) => db.splits.some((s) => s.id === m.splitId));
  db.checks = [];
  db.events = [];
  db.promises = [];
  db.payday = null;
  db.experiment = null;
  // the MR DIY receipt was read and waits for you to confirm it, which creates its payment (§6.4)
  const diy = db.receipts.find((r) => r.id === uid('receipt:mrdiy'));
  if (diy) diy.status = 'needs_review';
  db.review = [
    {
      kind: 'receipt-waiting',
      id: 'r:diy',
      at: at(TODAY, '15:24'),
      suggested: null,
      receiptId: uid('receipt:mrdiy'),
      merchant: 'MR DIY',
      total: rm('23.90'),
    },
    ...db.review.filter((r) => r.kind === 'owe-share' || r.kind === 'receipt-unread' || r.kind === 'proposal'),
  ];
  db.note = {
    text: 'Groceries are RM96 under last month by this date. Meals are about the same.',
    at: at('2026-10-17', '21:00'),
  };
  return db;
}

/** Just set up this morning: accounts, and nothing else yet. */
function emptyDb(): Db {
  const db = weiMing();
  const day = TODAY;
  const from = at(day, '08:00');
  return {
    ...db,
    openingDay: day,
    accounts: db.accounts.map((a) => ({ ...a, openingAt: from })),
    txns: [],
    receipts: [],
    items: [],
    picks: {},
    splits: [],
    members: [],
    bills: {},
    budgets: [],
    goals: [],
    contributions: [],
    subscriptions: [],
    charges: [],
    promises: [],
    checks: [],
    events: [],
    templates: [],
    experiment: null,
    review: [],
    note: null,
    payday: null,
    reliefs: {},
  };
}

/** Offline (§5): two payments typed in this evening wait in the outbox, marked Not synced yet. */
export function withOffline(db: Db): Db {
  const now = new Date(Date.now() - 60_000).toISOString();
  for (const [k, merchant, amount, time] of [
    ['offline-1', 'Teh tarik', '2.80', '20:20'],
    ['offline-2', 'Kuih', '3.00', '20:31'],
  ] as const) {
    const t = txn({
      key: k,
      day: klDay(db.now),
      time,
      merchant,
      amount: rm(amount),
      acct: 'tng',
      cat: 'Meals',
      source: 'manual',
    });
    db.txns.push(t);
    db.unsynced[t.id] = now;
  }
  return db;
}
