import type { Command } from '@sen/core/commands';
import { klDay } from '@sen/core/cycles';
import { apportion, formatSen } from '@sen/core/money';
import type { Transaction } from '@sen/core/schema';
import type { ReviewItem } from '@sen/core/views';
import type { Db } from './db';
import { merchantKey } from './scenario';

// The fake's write side: each command changes the rows the way B05's route will, and says what
// happened in words (patterns.md §7). Undo is the backend's own business: here, a snapshot.

export interface Applied {
  said: string;
  /** Rows written, to keep in the outbox until they sync (§5). */
  touched: string[];
}

import { nowIso } from '@/lib/clock';

const uuid = () => crypto.randomUUID();

function log(db: Db, id: string, what: string) {
  (db.changes[id] ??= []).push({ at: nowIso(), what });
}
const dropReview = (db: Db, keep: (r: ReviewItem) => boolean) => {
  db.review = db.review.filter(keep);
};
const catName = (db: Db, id: string | null) => db.categories.find((c) => c.id === id)?.name ?? 'a category';
const acctName = (db: Db, id: string | null) => db.accounts.find((a) => a.id === id)?.name ?? 'a payment';

function mustTxn(db: Db, id: string): Transaction {
  const t = db.txns.find((x) => x.id === id);
  if (!t) throw new Error('That payment is gone.');
  return t;
}

export function apply(db: Db, cmd: Exclude<Command, { type: 'undo' }>): Applied {
  switch (cmd.type) {
    case 'txn.category': {
      const t = mustTxn(db, cmd.id);
      const name = catName(db, cmd.categoryId);
      const first = t.status === 'needs_attention';
      t.categoryId = cmd.categoryId;
      t.status = 'done';
      t.updatedAt = nowIso();
      log(db, t.id, `Category: ${name}`);
      // a first answer makes the merchant's rule; *From now on* updates it (D25, D89)
      if ((first || cmd.scope === 'rule') && t.merchantKey) {
        const rule = db.rules.find((r) => r.merchantKey === t.merchantKey);
        if (rule) rule.categoryId = cmd.categoryId;
        else
          db.rules.push({
            id: uuid(),
            userId: db.userId,
            merchantKey: t.merchantKey,
            categoryId: cmd.categoryId,
            categoryMode: 'single',
            kind: null,
            setBy: 'user',
            confirmedCount: 1,
          });
      }
      dropReview(db, (r) => !(r.kind === 'new-merchant' && r.txnId === t.id));
      const said = first
        ? `${t.merchantRaw ?? 'It'} is ${name} from now on`
        : cmd.scope === 'rule'
          ? `${t.merchantRaw ?? 'It'} is ${name} from now on`
          : `Changed to ${name}`;
      return { said, touched: [t.id] };
    }
    case 'txn.kind': {
      const t = mustTxn(db, cmd.id);
      t.status = 'done';
      t.updatedAt = nowIso();
      dropReview(db, (r) => !('txnId' in r && r.txnId === t.id));
      if (cmd.kind === 'income') {
        t.kind = 'income';
        t.categoryId = db.categories.find((c) => c.name === 'Other income')?.id ?? null;
        log(db, t.id, 'Marked as income');
        return { said: `${formatSen(t.amount)} from ${t.merchantRaw ?? 'them'} is income`, touched: [t.id] };
      }
      if (cmd.kind === 'refund') {
        t.kind = 'refund';
        t.linkedTransactionId = cmd.linkedTransactionId;
        log(db, t.id, 'Marked as a refund');
        return { said: 'Marked as a refund', touched: [t.id] };
      }
      if (cmd.kind === 'transfer') {
        t.kind = 'transfer';
        t.categoryId = null;
        const group = t.transferGroupId ?? uuid();
        t.transferGroupId = group;
        const touched = [t.id];
        if (cmd.otherAccountId) {
          // the missing side, filled in and marked so; a real one replaces it if it arrives (§7)
          const side: Transaction = {
            ...t,
            id: uuid(),
            accountId: cmd.otherAccountId,
            direction: t.direction === 'in' ? 'out' : 'in',
            source: 'inferred',
            bankEventId: null,
            note: null,
          };
          db.txns.push(side);
          touched.push(side.id);
        }
        log(db, t.id, 'Marked as a transfer');
        return { said: `A transfer from ${acctName(db, cmd.otherAccountId)}. Sen will remember`, touched };
      }
      t.kind = 'spend';
      return { said: 'Marked as spending', touched: [t.id] };
    }
    case 'txn.note': {
      const t = mustTxn(db, cmd.id);
      t.note = cmd.note;
      log(db, t.id, cmd.note ? 'Note added' : 'Note removed');
      return { said: cmd.note ? 'Note saved' : 'Note removed', touched: [t.id] };
    }
    case 'txn.delete': {
      const t = mustTxn(db, cmd.id);
      t.deletedAt = nowIso();
      dropReview(db, (r) => !('txnId' in r && r.txnId === t.id));
      return { said: `Deleted ${formatSen(t.amount)} · ${t.merchantRaw ?? 'payment'}`, touched: [t.id] };
    }
    case 'txn.create': {
      const p = cmd.txn;
      const existing = db.txns.find((x) => x.id === p.id);
      if (existing) return { said: 'Already added', touched: [] }; // a retried write is a no-op (§6.5)
      const t: Transaction = {
        id: p.id,
        userId: db.userId,
        accountId: p.accountId,
        bankEventId: null,
        occurredAt: p.occurredAt,
        direction: 'out',
        amount: p.amount,
        currency: 'MYR',
        kind: 'spend',
        merchantRaw: p.merchantRaw,
        merchantKey: p.merchantRaw ? merchantKey(p.merchantRaw) : null,
        categoryId: p.categoryId,
        myShare: null,
        note: p.note,
        noReceipt: false,
        source: 'manual',
        status: 'done',
        transferGroupId: null,
        linkedTransactionId: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        deletedAt: null,
      };
      db.txns.push(t);
      return { said: `Added ${formatSen(t.amount)} · ${catName(db, t.categoryId)}`, touched: [t.id] };
    }
    case 'txn.no-receipt': {
      const t = mustTxn(db, cmd.id);
      t.noReceipt = true;
      log(db, t.id, 'No receipt');
      return { said: 'Marked no receipt. Sen won’t ask about it', touched: [t.id] };
    }
    case 'template.answer': {
      const tmpl = db.templates.find((x) => x.id === cmd.templateId);
      if (tmpl) tmpl.status = cmd.answer === 'yes' ? 'active' : 'rejected';
      const events = db.events.filter((e) => e.parsedBy === cmd.templateId);
      const txns = db.txns.filter((t) => t.bankEventId && events.some((e) => e.id === t.bankEventId));
      dropReview(db, (r) => !(r.kind === 'new-wording' && r.templateId === cmd.templateId));
      if (cmd.answer === 'yes')
        return { said: 'Sen will read this wording from now on', touched: txns.map((t) => t.id) };
      // No dismisses its payments and returns their events to unparsed (D87)
      for (const e of events) e.parseStatus = 'unparsed';
      for (const t of txns) t.deletedAt = nowIso();
      return { said: 'Removed. Missing a payment? Enter it by hand', touched: txns.map((t) => t.id) };
    }
    case 'share.paid': {
      const m = db.members.find((x) => x.id === cmd.memberId);
      if (!m) throw new Error('That share is gone.');
      m.paidAt = nowIso();
      const split = db.splits.find((s) => s.id === m.splitId);
      const touched = [m.id];
      if (cmd.byTransactionId) {
        const t = mustTxn(db, cmd.byTransactionId);
        t.kind = 'repayment';
        t.status = 'done';
        t.linkedTransactionId = split?.transactionId ?? null;
        m.paidByTransactionId = t.id;
        log(db, t.id, `Paid back by ${m.name}`);
        touched.push(t.id);
      }
      dropReview(
        db,
        (r) =>
          !(
            (r.kind === 'owe-share' && r.memberId === m.id) ||
            (r.kind === 'money-in-share' && r.txnId === cmd.byTransactionId)
          ),
      );
      const bill = split?.transactionId
        ? db.txns.find((t) => t.id === split.transactionId)?.merchantRaw
        : split
          ? db.bills[split.id]?.merchant
          : undefined;
      return {
        said: m.isMe
          ? `Ticked: you paid ${formatSen(m.share)} for ${bill ?? 'the bill'}`
          : `${m.name} paid back ${formatSen(m.share)}`,
        touched,
      };
    }
    case 'share.not-a-split': {
      const t = mustTxn(db, cmd.txnId);
      const item = db.review.find((r) => r.kind === 'money-in-share' && r.txnId === t.id);
      if (item && item.kind === 'money-in-share') {
        db.review = db.review.map((r) =>
          r === item
            ? {
                kind: 'money-in',
                id: item.id,
                at: item.at,
                suggested: null,
                txnId: t.id,
                amount: t.amount,
                from: t.merchantRaw ?? '',
                account: acctName(db, t.accountId),
                refundOf: [],
              }
            : r,
        );
      }
      return { said: `${t.merchantRaw ?? 'They'} isn't paying a split. Sen will remember`, touched: [t.id] };
    }
    case 'event.restore': {
      const e = db.events.find((x) => x.id === cmd.eventId);
      if (e) e.parseStatus = 'unparsed';
      return { said: 'Sen will read it as a payment', touched: e ? [e.id] : [] };
    }
    case 'receipt.commit':
      return commitReceipt(db, cmd);
    case 'receipt.attach': {
      const r = db.receipts.find((x) => x.id === cmd.receiptId);
      const t = mustTxn(db, cmd.txnId);
      if (r) {
        r.transactionId = t.id;
        r.status = 'committed';
      }
      dropReview(db, (x) => !(x.kind === 'receipt-waiting' && x.receiptId === cmd.receiptId));
      return { said: `Attached to ${formatSen(t.amount)} on ${acctName(db, t.accountId)}`, touched: [t.id] };
    }
    case 'receipt.evidence': {
      const r = db.receipts.find((x) => x.id === cmd.receiptId);
      if (r) r.status = 'evidence';
      dropReview(db, (x) => !(x.kind === 'receipt-waiting' && x.receiptId === cmd.receiptId));
      return { said: 'Kept as evidence only', touched: r ? [r.id] : [] };
    }
    case 'receipt.note': {
      const r = db.receipts.find((x) => x.id === cmd.receiptId);
      if (r) r.note = cmd.note;
      return { said: cmd.note ? 'Note saved' : 'Note removed', touched: r ? [r.id] : [] };
    }
    case 'review.answer': {
      const item = db.review.find((r) => r.id === cmd.itemId);
      dropReview(db, (r) => r.id !== cmd.itemId);
      const said =
        item?.kind === 'proposal'
          ? cmd.answer === 'apply'
            ? 'Applied. 14 past payments stay as they are'
            : 'Dismissed'
          : 'Done';
      return { said, touched: [] };
    }
    case 'budget.set': {
      const b = db.budgets.find((x) => x.categoryId === cmd.categoryId && !x.effectiveTo);
      if (b) b.amount = cmd.amount;
      else
        db.budgets.push({
          id: uuid(),
          userId: db.userId,
          categoryId: cmd.categoryId,
          amount: cmd.amount,
          effectiveFrom: klDay(db.now),
          effectiveTo: null,
        });
      return {
        said: cmd.amount ? `${catName(db, cmd.categoryId)}: ${formatSen(cmd.amount)} a cycle` : 'Budget removed',
        touched: [],
      };
    }
  }
}

/** §6.4: Done attaches to the one payment that matches, or waits for it; without capture it creates one. */
function commitReceipt(db: Db, c: Extract<Command, { type: 'receipt.commit' }>): Applied {
  if (db.receipts.some((r) => r.id === c.id)) return { said: 'Already added', touched: [] };
  const mine = new Set(c.mine);
  const ours = c.action === 'mine' ? c.items.filter((i) => mine.has(i.id)) : c.items;
  const others = c.action === 'mine' ? c.items.filter((i) => !mine.has(i.id)) : [];
  const myPart = ours.reduce((a, i) => a + i.price, 0);
  const othersPart = others.reduce((a, i) => a + i.price, 0);

  let target = c.forTxnId ? db.txns.find((t) => t.id === c.forTxnId) : undefined;
  if (!target && c.paidBy === 'me' && c.action !== 'evidence' && db.capture) {
    const found = matchesFor(db, c.total, c.occurredAt);
    if (found.length === 1) target = db.txns.find((t) => t.id === found[0]!.id);
  }
  const touched: string[] = [c.id];
  if (!target && !db.capture && c.paidBy === 'me' && c.action !== 'evidence') {
    // without capture, confirming a receipt creates its payment (§6.4, D52)
    target = {
      id: crypto.randomUUID(),
      userId: db.userId,
      accountId: null,
      bankEventId: null,
      occurredAt: c.occurredAt,
      direction: 'out',
      amount: c.total,
      currency: 'MYR',
      kind: 'spend',
      merchantRaw: c.merchant,
      merchantKey: merchantKey(c.merchant),
      categoryId: largestCategory(c.items),
      myShare: null,
      note: c.note,
      noReceipt: false,
      source: 'receipt',
      status: 'done',
      transferGroupId: null,
      linkedTransactionId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    };
    db.txns.push(target);
  }
  const attach = c.paidBy === 'me' && c.action !== 'evidence' ? target : undefined;
  db.receipts.push({
    id: c.id,
    userId: db.userId,
    transactionId: attach?.id ?? null,
    merchantRaw: c.merchant,
    occurredAt: c.occurredAt,
    total: c.total,
    tax: c.tax,
    serviceCharge: c.service,
    pax: c.pax,
    note: c.note,
    source: 'scan',
    status: c.action === 'evidence' ? 'evidence' : attach || c.paidBy === 'other' ? 'committed' : 'awaiting_payment',
    createdAt: nowIso(),
  });
  for (const i of ours)
    db.items.push({
      id: i.id,
      userId: db.userId,
      receiptId: c.id,
      description: i.description,
      qty: i.qty,
      amount: i.amount,
      price: i.price,
      categoryId: i.categoryId,
      kind: 'item',
    });
  if (others.length)
    db.items.push({
      id: crypto.randomUUID(),
      userId: db.userId,
      receiptId: c.id,
      description: "Others' items",
      qty: 1,
      amount: othersPart,
      price: othersPart,
      categoryId: null,
      kind: 'others',
    });
  db.drafts = db.drafts.filter((d) => d.id !== c.id);

  if (attach) {
    touched.push(attach.id);
    // the items become the payment's breakdown when the totals agree; its category is the largest (D89)
    if (attach.amount === c.total)
      attach.categoryId = largestCategory(ours.length ? ours : c.items) ?? attach.categoryId;
    if (c.note && !attach.note) attach.note = c.note;
    log(db, attach.id, 'Receipt attached');
  }
  if (c.action === 'mine') {
    // Just my part (D92): an unnamed Others, done at once, so the split locks at once
    const split = crypto.randomUUID();
    const now = nowIso();
    db.splits.push({
      id: split,
      userId: db.userId,
      transactionId: attach?.id ?? null,
      receiptId: c.id,
      paidBy: c.paidBy,
      payerMemberId: null,
      status: 'open',
      lockedAt: now,
      createdAt: now,
    });
    db.members.push(
      {
        id: crypto.randomUUID(),
        userId: db.userId,
        splitId: split,
        name: 'You',
        isMe: true,
        isOthers: false,
        doneAt: now,
        share: myPart,
        paidAt: c.paidBy === 'me' ? now : null,
        paidByTransactionId: c.paidBy === 'me' ? (attach?.id ?? null) : null,
      },
      {
        id: crypto.randomUUID(),
        userId: db.userId,
        splitId: split,
        name: 'Others',
        isMe: false,
        isOthers: true,
        doneAt: now,
        share: othersPart,
        paidAt: c.paidBy === 'other' ? now : null,
        paidByTransactionId: null,
      },
    );
    if (attach) attach.myShare = myPart;
    if (c.paidBy === 'other') db.bills[split] = { merchant: c.merchant, total: c.total, at: c.occurredAt };
    if (c.paidBy === 'other') return { said: `You owe ${formatSen(myPart)} for ${c.merchant}`, touched };
    if (attach) return { said: `Your part is ${formatSen(myPart)}. Others owe ${formatSen(othersPart)}`, touched };
  }
  if (c.action === 'evidence') return { said: 'Kept as evidence only', touched };
  if (attach)
    return {
      said:
        attach.source === 'receipt'
          ? `Added ${formatSen(attach.amount)} · ${catName(db, attach.categoryId)}`
          : `Attached to ${formatSen(attach.amount)} on ${acctName(db, attach.accountId)}`,
      touched,
    };
  return { said: 'Waiting for its payment. It’s in Review', touched };
}

function largestCategory(items: { price: number; categoryId: string | null }[]): string | null {
  const by = new Map<string, number>();
  for (const i of items) if (i.categoryId) by.set(i.categoryId, (by.get(i.categoryId) ?? 0) + i.price);
  return [...by].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Unlinked payments of the same amount within 3 hours (§6.4). */
export function matchesFor(db: Db, total: number, at: string) {
  const t0 = Date.parse(at);
  return db.txns
    .filter(
      (t) =>
        !t.deletedAt &&
        t.direction === 'out' &&
        t.kind === 'spend' &&
        t.amount === total &&
        Math.abs(Date.parse(t.occurredAt) - t0) <= 3 * 3_600_000 &&
        !db.receipts.some((r) => r.transactionId === t.id),
    )
    .map((t) => ({
      id: t.id,
      label: `${formatSen(t.amount)} · ${t.merchantRaw ?? 'Payment'} · ${acctName(db, t.accountId)}`,
    }));
}

/** Spreads tax and service into each item's price, by largest remainder, so the items add up to the total exactly (D66). */
export function spread(amounts: number[], total: number): number[] {
  return amounts.some((a) => a > 0) ? apportion(total, amounts) : amounts.map(() => 0);
}
