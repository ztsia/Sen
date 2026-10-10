import { describe, expect, it } from 'vitest';
import { Command } from '@sen/core/commands';
import { Account, Category, Receipt, ReceiptItem, Transaction } from '@sen/core/schema';
import {
  BudgetsView,
  CycleView,
  GoalsView,
  GoalView,
  HomeView,
  InsightsView,
  PaymentsView,
  ReceiptView,
  ReviewView,
  SkippedView,
  SubscriptionsView,
  TxnView,
  YearView,
} from '@sen/core/views';
import { createFake } from './index';
import { uid } from './ids';
import { acctId, catId, rm } from './scenario';
import { buildScenario, SCENARIOS } from './variants';
import * as v from './views';

// The skeleton's data has to be the shapes B05 will return: every row and every view parses with its
// zod schema, in every scenario, and the money rules hold on the made-up numbers.

const env = { offline: false };

describe('every scenario parses with the shared schemas', () => {
  for (const id of SCENARIOS)
    for (const empty of [false, true]) {
      if (empty && id !== 'wei-ming') continue;
      it(`${id}${empty ? ', empty' : ''}`, () => {
        const db = buildScenario(id, empty);
        for (const a of db.accounts) Account.parse(a);
        for (const c of db.categories) Category.parse(c);
        for (const t of db.txns) Transaction.parse(t);
        for (const r of db.receipts) Receipt.parse(r);
        for (const i of db.items) ReceiptItem.parse(i);
        HomeView.parse(v.home(db));
        CycleView.parse(v.cycleSheet(db));
        ReviewView.parse(v.review(db));
        SkippedView.parse(v.skipped(db));
        const p = PaymentsView.parse(v.payments(db, env, {}));
        for (const row of p.rows.slice(0, 40)) TxnView.parse(v.txnView(db, env, row.id));
        for (const r of db.receipts.slice(0, 10)) ReceiptView.parse(v.receiptView(db, r.id));
        InsightsView.parse(v.insights(db));
        BudgetsView.parse(v.budgets(db));
        SubscriptionsView.parse(v.subscriptions(db));
        const g = GoalsView.parse(v.goalsView(db));
        for (const goal of g.goals) GoalView.parse(v.goalView(db, goal.id));
        YearView.parse(v.year(db));
      });
    }
});

describe("Wei Ming's month", () => {
  const db = buildScenario('wei-ming', false);
  const home = v.home(db);

  it('is day 19 of the October cycle, with 12 days to payday', () => {
    expect(home.cycle.label).toBe('October');
    expect(home.cycle.start).toBe('2026-09-30');
    expect(home.figure).toMatchObject({ kind: 'left', day: 19, days: 30, daysToGo: 12 });
  });

  it('works out left until payday as income received less spending (§9.2)', () => {
    expect(home.figure.sen).toBe(home.figure.income - home.figure.spent);
    expect(home.figure.income).toBe(
      rm('5,800.00') +
        db.txns
          .filter((t) => t.categoryId === catId('Interest & returns') && t.occurredAt >= '2026-09-30')
          .reduce((a, t) => a + t.amount, 0),
    );
    expect(home.pace.lastCycle).not.toBeNull();
  });

  it('counts a split bill as your share, after repayments (D19)', () => {
    const bbq = db.txns.find((t) => t.id === uid('txn:bbq'))!;
    expect(v.spendingOf(db, bbq)).toBe(rm('48.80'));
  });

  it('takes a refund off its purchase, never counting it as income (D21)', () => {
    const uniqlo = db.txns.find((t) => t.id === uid('txn:uniqlo'))!;
    expect(v.spendingOf(db, uniqlo)).toBe(rm('90.00'));
  });

  it('shows a transfer as one row, Ryt → GO+', () => {
    const rows = v.payments(db, env, { cycle: '2026-09-30' }).rows;
    expect(rows.filter((r) => r.title === 'Ryt Bank → GO+')).toHaveLength(1);
    expect(rows.some((r) => r.marks.includes('filled'))).toBe(true);
  });

  it('has one Review item of every kind in screens.md, newest first', () => {
    const r = v.review(db);
    const kinds = new Set(r.needsYou.map((i) => i.kind));
    for (const k of [
      'new-merchant',
      'money-in-share',
      'money-in',
      'owe-share',
      'receipt-unread',
      'new-wording',
      'transfer-missing',
      'balance-check',
      'claim-due',
      'payday-step',
      'proposal',
    ])
      expect(kinds).toContain(k);
    expect(r.waiting.splits[0]).toMatchObject({ bill: 'BBQ PLACE', people: '1 of 2 paid you back' });
    expect(r.waiting.receipts[0]).toMatchObject({ merchant: 'MR DIY' });
    expect(r.waiting.refunds[0]).toMatchObject({ counterparty: 'SHOPEE' });
  });

  it('is the same on every load', () => {
    expect(v.home(buildScenario('wei-ming', false))).toEqual(home);
  });
});

describe('edge states', () => {
  it('before the first salary, the figure is spent since you started', () => {
    const h = v.home(buildScenario('before-salary', false));
    expect(h.figure.kind).toBe('since-start');
    expect(h.figure.sen).toBe(h.figure.spent);
  });
  it('the first cycle has no last cycle', () => {
    expect(v.home(buildScenario('first-cycle', false)).pace.lastCycle).toBeNull();
  });
  it('without capture, counts by calendar month with no balances (D79)', () => {
    const h = v.home(buildScenario('month', false));
    expect(h.figure.kind).toBe('month');
    expect(h.cycle).toMatchObject({ start: '2026-10-01', end: '2026-10-31', basis: 'month' });
    expect(h.quiet).toBeNull();
  });
  it('empty has nothing to show and nothing to review', () => {
    const db = buildScenario('wei-ming', true);
    expect(v.review(db).needsYou).toEqual([]);
    expect(v.insights(db).onTrack).toBeNull();
  });
  it('on payday, the card is up', () => {
    expect(v.home(buildScenario('payday', false)).payday).toEqual({ stage: 'card' });
  });
});

describe('writes, with Undo (§6.7)', () => {
  it('answers a new merchant, makes its rule, and undoes it', async () => {
    const fake = createFake();
    const siti = uid('txn:siti');
    const before = (await fake.review()).needsYou.length;
    const cmd = Command.parse({ type: 'txn.category', id: siti, categoryId: catId('Meals'), scope: 'once' });
    const r = await fake.run(cmd);
    expect(r.said).toBe('SITI AMINAH BT YUSOF is Meals from now on');
    expect((await fake.review()).needsYou).toHaveLength(before - 1);
    expect(fake.db().rules.some((x) => x.merchantKey === 'SITI AMINAH BT YUSOF')).toBe(true);
    await fake.run(r.undo!);
    expect((await fake.review()).needsYou).toHaveLength(before);
    expect(fake.db().txns.find((t) => t.id === siti)!.categoryId).toBeNull();
  });

  it('adds a payment by hand once, however often the outbox retries it (§6.5)', async () => {
    const fake = createFake();
    const id = crypto.randomUUID();
    const cmd: Command = {
      type: 'txn.create',
      txn: {
        id,
        occurredAt: '2026-10-18T20:30:00+08:00',
        amount: rm('12.00'),
        categoryId: catId('Meals'),
        accountId: acctId('tng'),
        merchantRaw: null,
        note: null,
      },
    };
    await fake.run(cmd);
    await fake.run(cmd);
    expect(fake.db().txns.filter((t) => t.id === id)).toHaveLength(1);
  });

  it('marks what was written offline as Not synced yet', async () => {
    const fake = createFake();
    fake.reset('wei-ming', { empty: false, offline: true });
    const rows = (await fake.payments({})).rows;
    expect(rows.filter((r) => r.marks.includes('pending'))).toHaveLength(2);
    expect((await fake.home()).unsynced).toBe(2);
  });

  it('attaches a scanned receipt to the one payment it matches', async () => {
    const fake = createFake();
    const draft = await fake.upload(null, null);
    const d = (await fake.draft(draft))!;
    expect(d.items.reduce((a, i) => a + i.price, 0)).toBe(d.total);
    const r = await fake.run({
      type: 'receipt.commit',
      id: d.id,
      action: 'done',
      paidBy: 'me',
      merchant: d.merchant,
      occurredAt: '2026-10-18T20:30:00+08:00',
      items: d.items,
      mine: [],
      tax: d.tax,
      service: d.service,
      total: d.total,
      pax: 3,
      note: null,
      forTxnId: null,
    });
    expect(r.said).toBe('Attached to RM64.13 on Ryt Bank');
  });
});
