import { addDays, klDay } from '@sen/core/cycles';
import { apportion, formatSen } from '@sen/core/money';
import type { Receipt, ReceiptItem, Split, SplitMember, Transaction } from '@sen/core/schema';
import type { SharedView, SplitItem, SplitPerson, SplitView } from '@sen/core/views';
import { momentLabel } from '@/lib/dates';
import { nowIso } from '@/lib/clock';
import { newId } from '@/lib/uid';
import type { Db } from '../db';
import { uid } from '../ids';
import { at, catId, rm } from '../scenario';
import { spendingOf } from '../views';
import type { AreaApply } from './ctx';

// Shared bills (B04): `split` and `shared` on the person's own rows (db.splits, db.members, db.items,
// db.picks, db.bills), and the split.* commands (spec §7, D47, D64–D66, D71). `split-public` is not
// here: it never reads the person's state (public-split.ts).
//
// db.picks maps an item to who had it. B03 typed it as one member per item, but D71 lets several
// people share an item, so the value is the member ids joined by commas, in the members' order (which
// decides who gets the odd sen of a shared item).

/** A friend's share the payer wrote off is marked paid, by this instead of a payment (§7, *Write off*). */
const WRITTEN_OFF = 'written-off';
const writtenOffOf = (db: Db, s: Split) =>
  membersOf(db, s)
    .filter((m) => m.paidByTransactionId === WRITTEN_OFF)
    .reduce((a, m) => a + m.share, 0);

// --- the rows ---

const takerIds = (db: Db, itemId: string): string[] => (db.picks[itemId] ? db.picks[itemId]!.split(',') : []);

function setTakers(db: Db, members: SplitMember[], itemId: string, ids: string[]) {
  const ordered = members.filter((m) => ids.includes(m.id)).map((m) => m.id);
  if (ordered.length) db.picks[itemId] = ordered.join(',');
  else delete db.picks[itemId];
}

const membersOf = (db: Db, s: Split) => db.members.filter((m) => m.splitId === s.id);
const itemsOf = (db: Db, s: Split): ReceiptItem[] =>
  s.receiptId ? db.items.filter((i) => i.receiptId === s.receiptId) : [];
const mustSplit = (db: Db, id: string): Split => {
  const s = db.splits.find((x) => x.id === id);
  if (!s) throw new Error('That split is gone.');
  return s;
};
const payerOf = (db: Db, s: Split) => db.members.find((m) => m.id === s.payerMemberId);
const nameOf = (m: SplitMember) => (m.isMe ? 'You' : m.name);
/** Others' items always count as done (D92). */
const isDone = (m: SplitMember) => m.isOthers || m.doneAt !== null;

/** What each member owes: the sum of their items, a shared one divided by largest remainder (D71). */
function sharesOf(db: Db, s: Split): Map<string, number> {
  const out = new Map(membersOf(db, s).map((m) => [m.id, 0]));
  for (const item of itemsOf(db, s)) {
    const ids = takerIds(db, item.id).filter((id) => out.has(id));
    if (!ids.length) continue;
    apportion(
      item.price,
      ids.map(() => 1),
    ).forEach((part, i) => out.set(ids[i]!, (out.get(ids[i]!) ?? 0) + part));
  }
  return out;
}

/** The shares follow the ticks while the split has items; a split from a payment keeps its even shares. */
function recompute(db: Db, s: Split) {
  if (!itemsOf(db, s).length) return;
  const shares = sharesOf(db, s);
  for (const m of membersOf(db, s)) m.share = shares.get(m.id) ?? 0;
}

const unclaimedOf = (db: Db, s: Split) => itemsOf(db, s).filter((i) => !takerIds(db, i.id).length);

function lock(db: Db, s: Split) {
  const now = nowIso();
  s.lockedAt = now;
  for (const m of membersOf(db, s)) m.doneAt ??= now;
  recompute(db, s);
  afterChange(db, s);
}

/** Once it's locked, the payer's bill counts as their share (D19), and their own part is paid. */
function afterChange(db: Db, s: Split) {
  if (!s.lockedAt || s.paidBy !== 'me') return;
  const t = db.txns.find((x) => x.id === s.transactionId);
  const me = membersOf(db, s).find((m) => m.isMe);
  if (t && me) {
    t.myShare = me.share + writtenOffOf(db, s);
    t.updatedAt = nowIso();
    me.paidAt ??= t.occurredAt;
    me.paidByTransactionId ??= t.id;
  }
}

/** The lock happens by itself when everyone is done and every item is claimed (D71). */
function maybeLock(db: Db, s: Split) {
  if (s.lockedAt || s.status !== 'open') return;
  if (membersOf(db, s).every(isDone) && !unclaimedOf(db, s).length) lock(db, s);
}

// --- the made-up splits ---

function addReceipt(
  db: Db,
  key: string,
  p: { txnId: string | null; merchant: string; occurredAt: string; items: [string, string][] },
): Receipt {
  const rid = uid(`receipt:${key}`);
  const lines = p.items.map(([description, price]) => [description, rm(price)] as const);
  const receipt: Receipt = {
    id: rid,
    userId: db.userId,
    transactionId: p.txnId,
    contentHash: null,
    merchantRaw: p.merchant,
    occurredAt: p.occurredAt,
    total: lines.reduce((a, [, price]) => a + price, 0),
    tax: 0,
    serviceCharge: 0,
    pax: 3,
    note: null,
    source: 'scan',
    status: 'committed',
    createdAt: p.occurredAt,
  };
  db.receipts.push(receipt);
  lines.forEach(([description, price], i) =>
    db.items.push({
      id: uid(`item:${key}:${i}`),
      userId: db.userId,
      receiptId: rid,
      description,
      qty: 1,
      amount: price,
      price,
      categoryId: catId('Meals'),
      kind: 'item',
    }),
  );
  return receipt;
}

/** Items and ticks for B03's two splits, and a third that's still changing (a stuck one, D71). */
export function seedSplits(db: Db): void {
  const pick = (key: string, i: number, who: string[]) => {
    db.picks[uid(`item:${key}:${i}`)] = who.join(',');
  };
  const m = (split: string, who: string) => uid(`member:${split}:${who}`);

  // BBQ PLACE: you paid; Set A, B and C are one each, the platter shared ÷3. Locked: RM48.80 each
  const bbqSplit = db.splits.find((s) => s.id === uid('split:bbq'));
  const bbqTxn = db.txns.find((t) => t.id === uid('txn:bbq'));
  if (bbqSplit && bbqTxn) {
    const r = addReceipt(db, 'bbq', {
      txnId: bbqTxn.id,
      merchant: 'BBQ PLACE',
      occurredAt: bbqTxn.occurredAt,
      items: [
        ['Set A', '30.00'],
        ['Set B', '30.00'],
        ['Set C', '30.00'],
        ['BBQ platter (to share)', '56.40'],
      ],
    });
    bbqSplit.receiptId = r.id;
    pick('bbq', 0, [m('bbq', 'me')]);
    pick('bbq', 1, [m('bbq', 'ali')]);
    pick('bbq', 2, [m('bbq', 'kahhoe')]);
    pick('bbq', 3, [m('bbq', 'me'), m('bbq', 'ali'), m('bbq', 'kahhoe')]);
  }

  // HAIDILAO: Mei paid; a soup base shared ÷3, the rest one each. You owe RM24.40
  const hd = db.splits.find((s) => s.id === uid('split:haidilao'));
  const bill = hd && db.bills[hd.id];
  if (hd && bill) {
    const r = addReceipt(db, 'hd', {
      txnId: null,
      merchant: bill.merchant,
      occurredAt: bill.at,
      items: [
        ['Mala soup base (to share)', '30.00'],
        ['Beef platter', '14.40'],
        ['Lamb platter', '14.40'],
        ['Prawn paste', '20.00'],
        ['Seafood platter', '18.80'],
      ],
    });
    hd.receiptId = r.id;
    pick('hd', 0, [m('hd', 'me'), m('hd', 'mei'), m('hd', 'ali')]);
    pick('hd', 1, [m('hd', 'me')]);
    pick('hd', 2, [m('hd', 'ali')]);
    pick('hd', 3, [m('hd', 'mei')]);
    pick('hd', 4, [m('hd', 'mei')]);
  }

  // NASI KANDAR ABC, which you paid: Ali is done, Kah Hoe isn't, you haven't tapped Done, and the
  // telur dadar has nobody yet, so it can't lock
  const nk = db.txns.find((t) => t.id === uid('txn:nasi-kandar'));
  const nkReceipt = db.receipts.find((r) => r.id === uid('receipt:nasi-kandar'));
  if (nk && nkReceipt) {
    const id = uid('split:nk');
    const base = { userId: db.userId, splitId: id, isOthers: false, paidAt: null, paidByTransactionId: null };
    db.splits.push({
      id,
      userId: db.userId,
      transactionId: nk.id,
      receiptId: nkReceipt.id,
      paidBy: 'me',
      payerMemberId: m('nk', 'me'),
      status: 'open',
      lockedAt: null,
      createdAt: at('2026-10-16', '20:30'),
    });
    db.members.push(
      {
        ...base,
        id: m('nk', 'me'),
        name: 'You',
        isMe: true,
        doneAt: null,
        share: 0,
        paidAt: nk.occurredAt,
        paidByTransactionId: nk.id,
      },
      { ...base, id: m('nk', 'ali'), name: 'Ali', isMe: false, doneAt: at('2026-10-16', '20:41'), share: 0 },
      { ...base, id: m('nk', 'kahhoe'), name: 'Kah Hoe', isMe: false, doneAt: null, share: 0 },
    );
    pick('nk', 0, [m('nk', 'me')]);
    pick('nk', 1, [m('nk', 'ali')]);
    pick('nk', 3, [m('nk', 'me'), m('nk', 'ali'), m('nk', 'kahhoe')]);
    recompute(db, db.splits[db.splits.length - 1]!);
  }
}

// --- reads ---

interface Bill {
  merchant: string;
  total: number;
  at: string;
  txn: Transaction | null;
}

function billOf(db: Db, s: Split): Bill | null {
  const t = s.transactionId ? db.txns.find((x) => x.id === s.transactionId && !x.deletedAt) : undefined;
  if (t) return { merchant: t.merchantRaw ?? 'A payment', total: t.amount, at: t.occurredAt, txn: t };
  const b = db.bills[s.id];
  return b ? { ...b, txn: null } : null;
}

/** The split an id names: a split's own id, or a payment's or receipt's, as *Split* and *Share a link* pass it. */
function findSplit(db: Db, id: string): Split | undefined {
  return (
    db.splits.find((s) => s.id === id) ??
    db.splits.find((s) => s.transactionId === id) ??
    db.splits.find((s) => s.receiptId === id)
  );
}

/** The people who must pay the payer: everyone but the payer and the Others pool (D92). */
const owers = (db: Db, s: Split) => membersOf(db, s).filter((m) => m.id !== s.payerMemberId && !m.isOthers);

function paidHow(db: Db, m: SplitMember): string | null {
  if (!m.paidAt) return null;
  if (m.paidByTransactionId === WRITTEN_OFF) return 'written off';
  const t = m.paidByTransactionId ? db.txns.find((x) => x.id === m.paidByTransactionId) : undefined;
  if (!t) return 'ticked by you';
  const acct = db.accounts.find((a) => a.id === t.accountId)?.name;
  return `matched: ${acct ?? 'a payment'}, ${momentLabel(new Date(t.occurredAt), new Date(db.now))}`;
}

export function splitView(db: Db, id: string): SplitView | null {
  const s = findSplit(db, id);
  const bill = s && billOf(db, s);
  if (!s || !bill) return null;
  const members = membersOf(db, s);
  const me = members.find((m) => m.isMe);
  if (!me) return null;
  const payer = payerOf(db, s);
  const final = s.lockedAt !== null;
  const shares = itemsOf(db, s).length ? sharesOf(db, s) : new Map(members.map((m) => [m.id, m.share]));
  const share = (m: SplitMember) => shares.get(m.id) ?? 0;

  const people: SplitPerson[] = members
    .filter((m) => !m.isOthers)
    .map((m) => ({
      id: m.id,
      name: nameOf(m),
      isMe: m.isMe,
      done: isDone(m),
      share: share(m),
      paid: m.id === s.payerMemberId || m.paidAt !== null,
      paidHow: m.id === s.payerMemberId ? null : paidHow(db, m),
    }));

  const items: SplitItem[] = itemsOf(db, s).map((item) => {
    const ids = takerIds(db, item.id);
    const takers = members.filter((m) => ids.includes(m.id));
    const mine = ids.includes(me.id);
    const parts = takers.length
      ? apportion(
          item.price,
          takers.map(() => 1),
        )
      : [];
    return {
      id: item.id,
      description: item.description,
      price: item.price,
      takers: takers.map((m) => ({ id: m.id, name: nameOf(m) })),
      mine,
      myPart: mine ? (parts[takers.findIndex((m) => m.id === me.id)] ?? null) : null,
    };
  });

  const waiting = final ? [] : members.filter((m) => !isDone(m));
  const unclaimed = unclaimedOf(db, s).length;
  const othersWaiting = waiting.filter((m) => !m.isMe).map((m) => m.name);
  const mine = s.paidBy === 'me';

  // the link stops a day after the last payment is ticked, so a wrong tick can be undone (D47)
  const paidDates = owers(db, s)
    .map((m) => m.paidAt)
    .filter((x): x is string => !!x);
  const allPaid = final && owers(db, s).every((m) => m.paidAt) && paidDates.length > 0;
  const closesOn = mine && allPaid ? addDays(klDay(paidDates.sort().at(-1)!), 1) : null;
  const link: SplitView['link'] =
    s.status !== 'open' || (closesOn && closesOn < klDay(db.now)) ? 'closed' : closesOn ? 'closing' : 'open';

  const myShare = share(me);
  return {
    id: s.id,
    merchant: bill.merchant,
    total: bill.total,
    at: bill.at,
    paidBy: s.paidBy,
    payer: payer ? nameOf(payer) : 'You',
    state: final ? 'final' : 'changing',
    link,
    closesOn: link === 'closing' ? closesOn : null,
    people,
    items,
    waitingOn: waiting.map(nameOf),
    unclaimed,
    lockWithout:
      mine && !final && items.length > 0 && unclaimed === 0 && othersWaiting.length ? joinNames(othersWaiting) : null,
    meDone: isDone(me),
    myShare,
    mySpending: final && bill.txn ? spendingOf(db, bill.txn) : myShare,
    owe: !mine && final && payer ? { to: payer.name, sen: myShare, paid: me.paidAt !== null } : null,
    payerQr: mine ? db.settings.you.qr : true,
    writtenOff: mine ? writtenOffOf(db, s) : 0,
    txnId: s.transactionId,
  };
}

const joinNames = (names: string[]) =>
  names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '');

export function sharedView(db: Db): SharedView {
  const rows = db.splits.flatMap((s) => {
    const bill = billOf(db, s);
    const members = membersOf(db, s);
    const me = members.find((m) => m.isMe);
    const payer = payerOf(db, s);
    if (!bill || !me) return [];
    let line: string;
    let open: boolean;
    if (s.paidBy === 'me') {
      const others = owers(db, s);
      const settled = others.filter((m) => m.paidAt).length;
      // a written-off share is settled, but nobody paid it back (QA B04 run 3, 24)
      const off = others.filter((m) => m.paidByTransactionId === WRITTEN_OFF).length;
      const back = settled - off;
      open = s.status === 'open' && (!s.lockedAt || settled < others.length);
      line = s.lockedAt
        ? `You paid · ${back} of ${others.length} paid you back${off ? ` · ${off} written off` : ''}`
        : 'You paid · still changing';
    } else {
      const who = payer?.name ?? 'A friend';
      const owes = sharesOf(db, s).get(me.id) ?? me.share;
      open = s.status === 'open' && (!s.lockedAt || !me.paidAt);
      line = !s.lockedAt
        ? `${who} paid · still changing`
        : me.paidAt
          ? `${who} paid · you paid ${formatSen(owes)}`
          : `${who} paid · you owe ${formatSen(owes)}`;
    }
    return [{ id: s.id, merchant: bill.merchant, at: bill.at, paidBy: s.paidBy, sen: bill.total, line, open }];
  });
  // open ones first, newest first within each
  return { rows: rows.sort((a, b) => (a.open === b.open ? (a.at < b.at ? 1 : -1) : a.open ? -1 : 1)) };
}

// --- writes ---

export const applySplits: AreaApply = (db, cmd) => {
  const c = cmd;
  switch (c.type) {
    case 'split.tick': {
      const s = mustSplit(db, c.splitId);
      const members = membersOf(db, s);
      const m = members.find((x) => x.id === c.memberId);
      const item = itemsOf(db, s).find((i) => i.id === c.itemId);
      if (!m || !item) throw new Error('That item is gone.');
      // after the lock only the payer changes a tick (D71)
      if (s.lockedAt && s.paidBy === 'other')
        throw new Error(`It's locked. To change a tick, ask ${payerOf(db, s)?.name ?? 'the payer'}.`);
      const ids = takerIds(db, item.id).filter((id) => id !== m.id);
      if (c.on) ids.push(m.id);
      setTakers(db, members, item.id, ids);
      if (!s.lockedAt) {
        // ticking again undoes your Done; a friend the payer ticked for counts as done
        m.doneAt = !m.isMe && s.paidBy === 'me' ? nowIso() : null;
      }
      recompute(db, s);
      afterChange(db, s);
      maybeLock(db, s);
      return {
        said: `${c.on ? 'Ticked' : 'Unticked'} ${item.description}${m.isMe ? '' : ` for ${m.name}`}`,
        touched: [item.id, m.id],
      };
    }
    case 'split.assign': {
      const s = mustSplit(db, c.splitId);
      if (s.paidBy !== 'me') throw new Error(`Only ${payerOf(db, s)?.name ?? 'the payer'} can settle an item.`);
      const item = itemsOf(db, s).find((i) => i.id === c.itemId);
      if (!item) throw new Error('That item is gone.');
      if (takerIds(db, item.id).length) return { said: 'Someone has ticked it already', touched: [] };
      const touched = [item.id];
      if (c.to === 'everyone') {
        setTakers(
          db,
          membersOf(db, s),
          item.id,
          membersOf(db, s)
            .filter((m) => !m.isOthers)
            .map((m) => m.id),
        );
      } else {
        const name = c.to.trim();
        let friend = membersOf(db, s).find((m) => !m.isMe && m.name.toLowerCase() === name.toLowerCase());
        if (!friend) {
          // a friend without a phone: added by name, and counted as done (spec §7, split-stuck)
          friend = {
            id: newId(),
            userId: db.userId,
            splitId: s.id,
            name,
            isMe: false,
            isOthers: false,
            doneAt: nowIso(),
            share: 0,
            paidAt: null,
            paidByTransactionId: null,
          };
          db.members.push(friend);
          touched.push(friend.id);
        }
        setTakers(db, membersOf(db, s), item.id, [friend.id]);
      }
      recompute(db, s);
      afterChange(db, s);
      maybeLock(db, s);
      return {
        said:
          c.to === 'everyone' ? `${item.description} is shared by everyone` : `${item.description} is ${c.to.trim()}'s`,
        touched,
      };
    }
    case 'split.done': {
      const s = mustSplit(db, c.splitId);
      const m = membersOf(db, s).find((x) => x.id === c.memberId);
      if (!m) throw new Error('That person is gone.');
      if (c.done) {
        if (m.doneAt) return { said: 'Already done', touched: [] };
        m.doneAt = nowIso();
        maybeLock(db, s);
        return { said: m.isMe ? "You're done" : `${m.name} is done`, touched: [m.id] };
      }
      if (s.lockedAt) throw new Error("It's locked. A Done can be undone only until then.");
      m.doneAt = null;
      return { said: m.isMe ? 'Still ticking' : `${m.name} is still ticking`, touched: [m.id] };
    }
    case 'split.start': {
      // a retried start, or a payment already split, is a no-op (§6.5)
      if (db.splits.some((x) => x.id === c.splitId || x.transactionId === c.txnId))
        return { said: 'Already split', touched: [] };
      const t = db.txns.find((x) => x.id === c.txnId);
      if (!t) throw new Error('That payment is gone.');
      const me = newId();
      db.splits.push({
        id: c.splitId,
        userId: db.userId,
        transactionId: t.id,
        receiptId: null,
        paidBy: 'me',
        payerMemberId: me,
        status: 'open',
        lockedAt: null,
        createdAt: nowIso(),
      });
      db.members.push({
        id: me,
        userId: db.userId,
        splitId: c.splitId,
        name: 'You',
        isMe: true,
        isOthers: false,
        doneAt: null,
        share: t.amount,
        paidAt: t.occurredAt,
        paidByTransactionId: t.id,
      });
      return { said: 'Split started. Share the link', touched: [c.splitId] };
    }
    case 'split.lock': {
      const s = mustSplit(db, c.splitId);
      if (s.paidBy !== 'me') throw new Error(`Only ${payerOf(db, s)?.name ?? 'the payer'} can lock it.`);
      if (s.lockedAt) return { said: 'Already locked', touched: [] };
      if (unclaimedOf(db, s).length) throw new Error('An item has nobody yet. Settle it first.');
      lock(db, s);
      return { said: 'Locked. The shares are final', touched: [s.id] };
    }
    case 'split.paid': {
      const s = mustSplit(db, c.splitId);
      const m = membersOf(db, s).find((x) => x.id === c.memberId);
      if (!m || s.paidBy !== 'me' || m.id === s.payerMemberId) throw new Error('That is not on your list.');
      if (c.paid) {
        m.paidAt ??= nowIso();
        return { said: `${m.name} paid you back`, touched: [m.id] };
      }
      if (m.paidByTransactionId === WRITTEN_OFF) throw new Error('That was written off. Undo it to change it.');
      if (m.paidByTransactionId) throw new Error('Sen matched that payment. Delete the payment to undo it.');
      m.paidAt = null;
      return { said: `${m.name} hasn't paid yet`, touched: [m.id] };
    }
    case 'split.write-off': {
      const s = mustSplit(db, c.splitId);
      if (s.paidBy !== 'me') throw new Error('Only the one who paid can write off.');
      const unpaid = owers(db, s).filter((m) => !m.paidAt);
      if (!s.lockedAt || !unpaid.length) throw new Error('Nothing is owed on this bill.');
      const now = nowIso();
      for (const m of unpaid) {
        m.paidAt = now;
        m.paidByTransactionId = WRITTEN_OFF;
      }
      afterChange(db, s);
      const sum = unpaid.reduce((a, m) => a + m.share, 0);
      return { said: `Wrote off ${formatSen(sum)}. It counts as your spending`, touched: unpaid.map((m) => m.id) };
    }
    case 'split.paid-them': {
      const s = mustSplit(db, c.splitId);
      const me = membersOf(db, s).find((m) => m.isMe);
      if (s.paidBy !== 'other' || !me) throw new Error('You paid this one.');
      if (me.paidAt) return { said: 'Already marked as paid', touched: [] };
      me.paidAt = nowIso();
      return { said: `Marked as paid to ${payerOf(db, s)?.name ?? 'them'}`, touched: [me.id] };
    }
    default:
      return null;
  }
};
