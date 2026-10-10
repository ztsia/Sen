import { apportion, parseSen } from '@sen/core/money';
import { addDays, klDay, lastWorkingDay, nextMonthStart, weekday } from '@sen/core/cycles';
import type { Account, Category, Receipt, ReceiptItem, Transaction, TxnKind, TxnSource } from '@sen/core/schema';
import type { ReviewItem } from '@sen/core/views';
import type { Db } from './db';
import { seeded, uid } from './ids';

// Wei Ming's month (D11): made-up names and amounts throughout, in the style of notifications.md.
// TAN WEI MING stands in for the owner. Twelve months of history come from a seeded generator, so they
// look lived-in and are the same on every load; this cycle's special cases are placed by hand on top.
// It's the one place the skeleton's data lives, and B05 turns it into the preview database's seed.

/** The made-up moment: Sunday 18 October 2026, 8:40 pm. Day 19 of the October cycle, 12 days to payday. */
export const TODAY = '2026-10-18';
export const NOW = `${TODAY}T20:40:00+08:00`;

/** `RM58.30` written as text, parsed into sen: no float anywhere, even in made-up data. */
export function rm(text: string): number {
  const r = parseSen(text);
  if (!r.ok) throw new Error(`Not an amount: ${text}`);
  return r.sen;
}
export const at = (day: string, hm: string) => `${day}T${hm}:00+08:00`;
/** Uppercase, spaces collapsed, punctuation and trailing references gone (§8). */
export const merchantKey = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+\d{4,}$/, '')
    .replace(/\s+/g, ' ')
    .trim();

const USER = uid('user:wei-ming');
const owned = (id: string) => ({ id, userId: USER });

// --- accounts (§7) ---

export type AcctKey = 'ryt' | 'pbb' | 'tng' | 'goplus' | 'grab' | 'maybank';
const ACCOUNTS: Record<AcctKey, [name: string, pkg: string | null, label: string | null, opening: string]> = {
  ryt: ['Ryt Bank', 'my.rytbank.app', 'Main Account', '3,200.00'],
  pbb: ['Public Bank', 'com.pbb.mypb', null, '6,400.00'],
  tng: ['TNG eWallet', 'my.com.tngdigital.ewallet', null, '85.00'],
  goplus: ['GO+', 'my.com.tngdigital.ewallet', 'GO+', '1,500.00'],
  grab: ['GrabPay Wallet', 'com.grabtaxi.passenger', null, '40.00'],
  maybank: ['Maybank', null, null, '0.00'],
};
export const acctId = (k: AcctKey) => uid(`account:${k}`);
export const OPENING_DAY = '2025-10-31';

function accounts(openingDay: string, keys: AcctKey[] = ['ryt', 'pbb', 'tng', 'goplus', 'grab', 'maybank']): Account[] {
  return keys.map((k) => {
    const [name, pkg, label, opening] = ACCOUNTS[k];
    return {
      ...owned(acctId(k)),
      name,
      kind: k === 'maybank' ? 'elsewhere' : 'tracked',
      notifierPackage: pkg,
      notifierLabel: label,
      openingBalance: rm(opening),
      openingAt: at(openingDay, '08:00'),
      currency: 'MYR',
      archivedAt: null,
    };
  });
}

// --- categories (§8, D33) ---

const SPEND: [name: string, meal: boolean, drink: boolean, disc: boolean][] = [
  ['Meals', true, false, false],
  ['Drinks & desserts', false, true, true],
  ['Groceries', false, false, false],
  ['Transport', false, false, false],
  ['Car', false, false, false],
  ['Phone & internet', false, false, false],
  ['Home & bills', false, false, false],
  ['Shopping', false, false, true],
  ['Entertainment', false, false, true],
  ['Subscriptions', false, false, false],
  ['Health', false, false, false],
  ['Personal care', false, false, false],
  ['Gifts & treats', false, false, true],
  ['Family', false, false, false],
  ['Travel', false, false, true],
  ['Fees & charges', false, false, false],
  ['Cash', false, false, false],
  ['Unaccounted', false, false, false],
];
const INCOME = ['Salary', 'Interest & returns', 'Other income'];
export const catId = (name: string) => uid(`category:${name}`);

function categories(): Category[] {
  const system = (n: string): Category['systemKey'] =>
    n === 'Salary' ? 'salary' : n === 'Cash' ? 'cash' : n === 'Unaccounted' ? 'unaccounted' : null;
  return [
    ...SPEND.map(([name, isMeal, isBeverage, isDiscretionary]) => ({
      ...owned(catId(name)),
      name,
      isMeal,
      isBeverage,
      isDiscretionary,
      kind: 'spend' as const,
      systemKey: system(name),
      archivedAt: null,
    })),
    ...INCOME.map((name) => ({
      ...owned(catId(name)),
      name,
      isMeal: false,
      isBeverage: false,
      isDiscretionary: false,
      kind: 'income' as const,
      systemKey: system(name),
      archivedAt: null,
    })),
  ];
}

// --- transactions ---

interface PayIn {
  key: string;
  day: string;
  time: string;
  merchant: string | null;
  amount: number;
  acct: AcctKey | null;
  cat?: string | null;
  kind?: TxnKind;
  direction?: 'out' | 'in';
  source?: TxnSource;
  status?: Transaction['status'];
  note?: string | null;
  myShare?: number | null;
  group?: string | null;
  linked?: string | null;
  event?: string | null;
}

export function txn(p: PayIn): Transaction {
  const occurredAt = at(p.day, p.time);
  const kind = p.kind ?? 'spend';
  return {
    ...owned(uid(`txn:${p.key}`)),
    accountId: p.acct ? acctId(p.acct) : null,
    bankEventId: p.event ?? null,
    occurredAt,
    direction: p.direction ?? (kind === 'income' || kind === 'repayment' || kind === 'refund' ? 'in' : 'out'),
    amount: p.amount,
    currency: 'MYR',
    kind,
    merchantRaw: p.merchant,
    merchantKey: p.merchant ? merchantKey(p.merchant) : null,
    categoryId: p.cat === undefined ? null : p.cat === null ? null : catId(p.cat),
    myShare: kind === 'spend' ? (p.myShare ?? null) : null,
    note: p.note ?? null,
    noReceipt: false,
    source: p.source ?? 'notification',
    status: p.status ?? 'done',
    transferGroupId: p.group ?? null,
    linkedTransactionId: p.linked ? uid(`txn:${p.linked}`) : null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    deletedAt: null,
  };
}

/** A transfer between your own accounts: both sides, one group (§7). A side no app notifies is filled in. */
function transfer(
  key: string,
  day: string,
  time: string,
  amount: number,
  from: AcctKey,
  to: AcctKey,
  inferredFrom = false,
) {
  const group = uid(`transfer:${key}`);
  return [
    txn({
      key: `${key}:out`,
      day,
      time,
      merchant: 'TAN WEI MING',
      amount,
      acct: from,
      kind: 'transfer',
      direction: 'out',
      group,
      source: inferredFrom ? 'inferred' : 'notification',
    }),
    txn({
      key: `${key}:in`,
      day,
      time,
      merchant: 'TAN WEI MING',
      amount,
      acct: to,
      kind: 'transfer',
      direction: 'in',
      group,
    }),
  ];
}

// --- the generator: an ordinary cycle, lived in ---

const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
/** A made-up amount between two, in 10-sen steps. */
const between = (r: () => number, lo: string, hi: string) => {
  const a = rm(lo);
  const steps = (rm(hi) - a) / 10;
  return a + Math.floor(r() * (steps + 1)) * 10;
};

const LUNCH = [
  'NASI KANDAR PELITA',
  'RESTORAN SRI MELAKA',
  'KEDAI MAKAN AH CHOY',
  'MEE KARI LAKSA 333',
  'CHICKEN RICE SHOP',
];
const BREAKFAST = ['KOPITIAM SRI DAMAI', 'ROTI CANAI MAMAK 24', 'DIM SUM WONG'];
const DRINKS = ['ZUS COFFEE', 'CHAGEE', 'TEALIVE', 'GIGI COFFEE'];
const DINNER = ['Sushi Mentai', "Marini's Pizza", "Nando's", 'Kenny Rogers', 'Sate Kajang Hj Samuri'];
const GROCER = ["LOTUS'S", 'JAYA GROCER', 'AEON BIG', 'MYDIN'];
const SHOP = ['SHOPEE', 'UNIQLO', 'MR DIY', 'DECATHLON', 'POPULAR BOOKSTORE'];
const PETROL = ['Petron', 'Shell', 'Petronas'];

const MENU: Record<string, string[]> = {
  Meals: [
    'Nasi lemak ayam',
    'Mee goreng mamak',
    'Roti canai',
    'Teh tarik',
    'Ayam goreng',
    'Sayur campur',
    'Nasi putih',
    'Fish head curry',
  ],
  Groceries: [
    'Eggs (30)',
    'Jasmine rice 5kg',
    'Milk 2L',
    'Bread',
    'Chicken breast',
    'Bananas',
    'Kangkung',
    'Dish soap',
  ],
  Shopping: ['T-shirt', 'Cable tie pack', 'USB-C cable', 'Notebook', 'Socks (3)'],
};

/** A receipt for a payment, with made-up items whose prices add up to its total exactly (D66). */
function receiptFor(t: Transaction, cat: string, r: () => number, pax = 1) {
  const names = MENU[cat] ?? MENU.Meals!;
  const n = 2 + Math.floor(r() * 3);
  const chosen = Array.from({ length: n }, (_, i) => names[(i * 3 + Math.floor(r() * names.length)) % names.length]!);
  const weights = chosen.map(() => 3 + Math.floor(r() * 9));
  const prices = apportion(t.amount, weights);
  const rid = uid(`receipt:${t.id}`);
  const receipt: Receipt = {
    ...owned(rid),
    transactionId: t.id,
    merchantRaw: t.merchantRaw,
    occurredAt: t.occurredAt,
    total: t.amount,
    tax: 0,
    serviceCharge: 0,
    pax,
    note: null,
    source: 'scan',
    status: 'committed',
    createdAt: t.occurredAt,
  };
  const items: ReceiptItem[] = chosen.map((description, i) => ({
    ...owned(uid(`item:${rid}:${i}`)),
    receiptId: rid,
    description,
    qty: 1,
    amount: prices[i]!,
    price: prices[i]!,
    categoryId: catId(cat),
    kind: 'item',
  }));
  return { receipt, items };
}

interface Gen {
  txns: Transaction[];
  receipts: Receipt[];
  items: ReceiptItem[];
}

/** One cycle's ordinary money, from its first day to the day before `until`, stopping at `cutoff`. */
function genCycle(
  start: string,
  until: string,
  cutoff: string,
  seed: number,
  out: Gen,
  opts: { salary: boolean; ownTransfers: boolean },
) {
  const r = seeded(seed);
  const k = (s: string) => `${start}:${s}`;
  const push = (t: Transaction) => {
    if (t.occurredAt <= cutoff) out.txns.push(t);
    return t;
  };
  let nextPetrol = 3 + Math.floor(r() * 4);
  for (let d = start, i = 0; d < until; d = addDays(d, 1), i++) {
    const wd = weekday(d);
    const dom = d.slice(8, 10);
    if (i === 0 && opts.salary)
      push(
        txn({
          key: k('salary'),
          day: d,
          time: '09:12',
          merchant: 'SYARIKAT CONTOH SDN BHD',
          amount: rm('5,800.00'),
          acct: 'ryt',
          kind: 'income',
          cat: 'Salary',
        }),
      );
    if (i === 1) {
      push(
        txn({
          key: k('rent'),
          day: d,
          time: '10:05',
          merchant: 'PERUMAHAN JAYA SDN BHD',
          amount: rm('1,200.00'),
          acct: 'ryt',
          cat: 'Home & bills',
        }),
      );
      push(
        txn({
          key: k('family'),
          day: d,
          time: '10:07',
          merchant: 'TAN AH KOW',
          amount: rm('500.00'),
          acct: 'ryt',
          cat: 'Family',
        }),
      );
      if (opts.ownTransfers) {
        transfer(k('goplus'), d, '10:10', rm('500.00'), 'ryt', 'goplus').forEach(push);
        transfer(k('tng'), d, '10:12', rm('450.00'), 'ryt', 'tng').forEach(push);
        transfer(k('pbb'), d, '10:14', rm('400.00'), 'ryt', 'pbb').forEach(push);
      }
    }
    if (i === 2 && opts.ownTransfers) transfer(k('grab'), d, '08:30', rm('300.00'), 'pbb', 'grab', true).forEach(push);
    if (dom === '05')
      push(
        txn({
          key: k('maxis'),
          day: d,
          time: '07:00',
          merchant: 'Maxis Broadband',
          amount: rm('88.00'),
          acct: 'ryt',
          cat: 'Phone & internet',
        }),
      );
    if (dom === '03')
      push(
        txn({
          key: k('icloud'),
          day: d,
          time: '06:12',
          merchant: 'APPLE.COM/BILL',
          amount: rm('4.90'),
          acct: 'ryt',
          cat: 'Subscriptions',
        }),
      );
    if (dom === '12')
      push(
        txn({
          key: k('spotify'),
          day: d,
          time: '06:40',
          merchant: 'Spotify',
          amount: rm('23.90'),
          acct: 'ryt',
          cat: 'Subscriptions',
        }),
      );
    if (dom === '22')
      push(
        txn({
          key: k('netflix'),
          day: d,
          time: '04:10',
          merchant: 'NETFLIX',
          amount: rm('28.00'),
          acct: 'ryt',
          cat: 'Subscriptions',
        }),
      );
    if (dom === '20')
      push(
        txn({
          key: k('claude'),
          day: d,
          time: '05:30',
          merchant: 'CLAUDE.AI SUBSCRIPTION',
          amount: rm('85.10'),
          acct: 'ryt',
          cat: 'Subscriptions',
        }),
      );
    if (dom === '15')
      push(
        txn({
          key: k('returns'),
          day: d,
          time: '06:00',
          merchant: 'GO+ DAILY EARNINGS',
          amount: between(r, '3.10', '5.90'),
          acct: 'goplus',
          kind: 'income',
          cat: 'Interest & returns',
        }),
      );
    if (i === 13)
      push(
        txn({
          key: k('atm'),
          day: d,
          time: '18:20',
          merchant: 'ATM WITHDRAWAL',
          amount: rm('100.00'),
          acct: 'ryt',
          cat: 'Cash',
        }),
      );

    const workday = wd <= 5;
    if (workday) {
      if (r() < 0.3)
        push(
          txn({
            key: k(`bf${i}`),
            day: d,
            time: '07:45',
            merchant: pick(r, BREAKFAST),
            amount: between(r, '4.50', '9.00'),
            acct: 'tng',
            cat: 'Meals',
          }),
        );
      if (r() < 0.85)
        push(
          txn({
            key: k(`lunch${i}`),
            day: d,
            time: '12:40',
            merchant: pick(r, LUNCH),
            amount: between(r, '9.00', '18.00'),
            acct: 'tng',
            cat: 'Meals',
          }),
        );
      if (r() < 0.4)
        push(
          txn({
            key: k(`drink${i}`),
            day: d,
            time: '15:10',
            merchant: pick(r, DRINKS),
            amount: between(r, '9.00', '15.90'),
            acct: 'tng',
            cat: 'Drinks & desserts',
          }),
        );
      if (r() < 0.5)
        push(
          txn({
            key: k(`toll${i}`),
            day: d,
            time: '08:20',
            merchant: 'PLUS MALAYSIA',
            amount: between(r, '2.10', '6.00'),
            acct: 'tng',
            cat: 'Car',
          }),
        );
      if (r() < 0.15)
        push(
          txn({
            key: k(`ride${i}`),
            day: d,
            time: '18:45',
            merchant: 'GRAB RIDE',
            amount: between(r, '12.00', '25.00'),
            acct: 'grab',
            cat: 'Transport',
          }),
        );
    }
    if (r() < 0.35)
      push(
        txn({
          key: k(`food${i}`),
          day: d,
          time: '19:50',
          merchant: 'GRABFOOD',
          amount: between(r, '15.00', '38.00'),
          acct: 'grab',
          cat: 'Meals',
        }),
      );
    else if (workday && r() < 0.3)
      push(
        txn({
          key: k(`dinner${i}`),
          day: d,
          time: '20:05',
          merchant: pick(r, LUNCH),
          amount: between(r, '12.00', '28.00'),
          acct: 'tng',
          cat: 'Meals',
        }),
      );
    if (!workday) {
      if (r() < 0.7) {
        const t = push(
          txn({
            key: k(`out${i}`),
            day: d,
            time: '19:30',
            merchant: pick(r, DINNER),
            amount: between(r, '30.00', '90.00'),
            acct: 'ryt',
            cat: 'Meals',
          }),
        );
        if (r() < 0.3 && t.occurredAt <= cutoff) {
          const { receipt, items } = receiptFor(t, 'Meals', r, 1 + Math.floor(r() * 3));
          out.receipts.push(receipt);
          out.items.push(...items);
        }
      }
      if (wd === 6 && r() < 0.85) {
        const t = push(
          txn({
            key: k(`groc${i}`),
            day: d,
            time: '11:15',
            merchant: pick(r, GROCER),
            amount: between(r, '60.00', '190.00'),
            acct: 'ryt',
            cat: 'Groceries',
          }),
        );
        if (r() < 0.4 && t.occurredAt <= cutoff) {
          const { receipt, items } = receiptFor(t, 'Groceries', r);
          out.receipts.push(receipt);
          out.items.push(...items);
        }
      }
      if (wd === 7 && r() < 0.2)
        push(
          txn({
            key: k(`gsc${i}`),
            day: d,
            time: '15:00',
            merchant: 'GSC MID VALLEY',
            amount: between(r, '25.00', '60.00'),
            acct: 'ryt',
            cat: 'Entertainment',
          }),
        );
      if (r() < 0.25)
        push(
          txn({
            key: k(`shop${i}`),
            day: d,
            time: '16:30',
            merchant: pick(r, SHOP),
            amount: between(r, '25.00', '180.00'),
            acct: 'ryt',
            cat: 'Shopping',
          }),
        );
    }
    if (--nextPetrol <= 0) {
      push(
        txn({
          key: k(`petrol${i}`),
          day: d,
          time: '08:05',
          merchant: pick(r, PETROL),
          amount: between(r, '55.00', '85.00'),
          acct: 'ryt',
          cat: 'Car',
        }),
      );
      nextPetrol = 8 + Math.floor(r() * 4);
    }
    if (r() < 0.03)
      push(
        txn({
          key: k(`clinic${i}`),
          day: d,
          time: '10:30',
          merchant: 'KLINIK MEDIVIRON',
          amount: between(r, '45.00', '120.00'),
          acct: 'ryt',
          cat: 'Health',
        }),
      );
    if (r() < 0.04)
      push(
        txn({
          key: k(`hair${i}`),
          day: d,
          time: '13:00',
          merchant: 'BARBER SAMY',
          amount: rm('25.00'),
          acct: 'tng',
          cat: 'Personal care',
        }),
      );
  }
}

/** The payday balance check's gap, booked as Unaccounted (§7, D18): money that left unseen, or came back. */
function gapAt(day: string, key: string, sen: number): Transaction {
  return txn({
    key: `gap:${key}`,
    day,
    time: '21:00',
    merchant: null,
    amount: Math.abs(sen),
    acct: 'ryt',
    kind: 'adjustment',
    direction: sen >= 0 ? 'out' : 'in',
    cat: 'Unaccounted',
    source: 'adjustment',
  });
}

/** Every salary day from the first to `today`: the last working day of each month. */
function paydays(first: string, today: string): string[] {
  const days: string[] = [];
  for (let m = first; m <= today; m = nextMonthStart(m)) {
    const d = lastWorkingDay(m);
    if (d <= today && d >= first) days.push(d);
  }
  return days;
}

/** The base scenario: twelve months of an ordinary life, and this cycle's special cases on top. */
export function weiMing(): Db {
  const gen: Gen = { txns: [], receipts: [], items: [] };
  const salaries = paydays(OPENING_DAY, TODAY);
  const r = seeded(7);
  salaries.forEach((s, i) => {
    const until = salaries[i + 1] ?? addDays(lastWorkingDay(nextMonthStart(s)), 0);
    genCycle(s, until, NOW, 1000 + i, gen, { salary: true, ownTransfers: true });
    // each payday's balance check found a gap, shrinking as capture settled in
    if (i > 0) gen.txns.push(gapAt(addDays(s, 1), s, rm('10.00') + (12 - i) * 900 - between(r, '0.00', '30.00')));
  });
  const db = base(gen);
  addThisCycle(db);
  return db;
}

function base(gen: Gen): Db {
  return {
    now: NOW,
    userId: USER,
    capture: true,
    claims: true,
    agent: true,
    aiPausedUntil: null,
    openingDay: OPENING_DAY,
    accounts: accounts(OPENING_DAY),
    categories: categories(),
    rules: [],
    templates: [],
    events: [],
    txns: gen.txns,
    reliefs: {},
    receipts: gen.receipts,
    items: gen.items,
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
    experiment: null,
    review: [],
    note: null,
    health: [],
    payday: null,
    drafts: [],
    unsynced: {},
    changes: {},
  };
}

// --- this cycle, by hand ---

function addThisCycle(db: Db) {
  const T = (p: PayIn) => {
    const t = txn(p);
    db.txns.push(t);
    return t;
  };

  // Nasi kandar for three, scanned at the table (scan-after, D66)
  const nk = T({
    key: 'nasi-kandar',
    day: '2026-10-16',
    time: '19:32',
    merchant: 'NASI KANDAR ABC',
    amount: rm('58.30'),
    acct: 'ryt',
    cat: 'Meals',
  });
  const nkr = uid('receipt:nasi-kandar');
  db.receipts.push({
    ...owned(nkr),
    transactionId: nk.id,
    merchantRaw: 'NASI KANDAR ABC',
    occurredAt: nk.occurredAt,
    total: rm('58.30'),
    tax: rm('3.00'),
    serviceCharge: rm('4.80'),
    pax: 3,
    note: 'Dinner with Ali and Kah Hoe',
    source: 'scan',
    status: 'committed',
    createdAt: nk.occurredAt,
  });
  const nkItems: [string, string][] = [
    ['Nasi kandar ayam', '18.50'],
    ['Nasi kandar ikan', '19.60'],
    ['Telur dadar', '6.20'],
    ['Teh o ais (3)', '14.00'],
  ];
  nkItems.forEach(([description, price], i) =>
    db.items.push({
      ...owned(uid(`item:nk:${i}`)),
      receiptId: nkr,
      description,
      qty: 1,
      amount: rm(price),
      price: rm(price),
      categoryId: catId('Meals'),
      kind: 'item',
    }),
  );

  // A BBQ split three ways: Ali paid back; Kah Hoe's money came from a name Sen hasn't seen (D64)
  const bbq = T({
    key: 'bbq',
    day: '2026-10-10',
    time: '20:15',
    merchant: 'BBQ PLACE',
    amount: rm('146.40'),
    acct: 'ryt',
    cat: 'Meals',
    myShare: rm('48.80'),
  });
  const split = uid('split:bbq');
  db.splits.push({
    ...owned(split),
    transactionId: bbq.id,
    receiptId: null,
    paidBy: 'me',
    payerMemberId: uid('member:bbq:me'),
    status: 'open',
    lockedAt: at('2026-10-10', '21:02'),
    createdAt: bbq.occurredAt,
  });
  const ali = T({
    key: 'ali-back',
    day: '2026-10-11',
    time: '09:41',
    merchant: 'ALI BIN ABU',
    amount: rm('48.80'),
    acct: 'tng',
    kind: 'repayment',
    linked: 'bbq',
  });
  db.members.push(
    {
      ...owned(uid('member:bbq:me')),
      splitId: split,
      name: 'You',
      isMe: true,
      isOthers: false,
      doneAt: at('2026-10-10', '20:40'),
      share: rm('48.80'),
      paidAt: bbq.occurredAt,
      paidByTransactionId: bbq.id,
    },
    {
      ...owned(uid('member:bbq:ali')),
      splitId: split,
      name: 'Ali',
      isMe: false,
      isOthers: false,
      doneAt: at('2026-10-10', '20:52'),
      share: rm('48.80'),
      paidAt: ali.occurredAt,
      paidByTransactionId: ali.id,
    },
    {
      ...owned(uid('member:bbq:kahhoe')),
      splitId: split,
      name: 'Kah Hoe',
      isMe: false,
      isOthers: false,
      doneAt: at('2026-10-10', '21:02'),
      share: rm('48.80'),
      paidAt: null,
      paidByTransactionId: null,
    },
  );
  const kh = T({
    key: 'kahhoe-in',
    day: '2026-10-17',
    time: '22:10',
    merchant: 'LIM K H',
    amount: rm('48.80'),
    acct: 'ryt',
    kind: 'income',
    status: 'needs_attention',
  });

  // Mei paid at Haidilao; Wei Ming owes RM24.40, unpaid an hour later (D65)
  const hd = uid('split:haidilao');
  db.splits.push({
    ...owned(hd),
    transactionId: null,
    receiptId: null,
    paidBy: 'other',
    payerMemberId: uid('member:hd:mei'),
    status: 'open',
    lockedAt: at('2026-10-14', '21:30'),
    createdAt: at('2026-10-14', '21:10'),
  });
  db.bills[hd] = { merchant: 'HAIDILAO', total: rm('97.60'), at: at('2026-10-14', '20:50') };
  db.members.push(
    {
      ...owned(uid('member:hd:me')),
      splitId: hd,
      name: 'You',
      isMe: true,
      isOthers: false,
      doneAt: at('2026-10-14', '21:20'),
      share: rm('24.40'),
      paidAt: null,
      paidByTransactionId: null,
    },
    {
      ...owned(uid('member:hd:mei')),
      splitId: hd,
      name: 'Mei',
      isMe: false,
      isOthers: false,
      doneAt: at('2026-10-14', '21:25'),
      share: rm('48.80'),
      paidAt: at('2026-10-14', '20:50'),
      paidByTransactionId: null,
    },
    {
      ...owned(uid('member:hd:ali')),
      splitId: hd,
      name: 'Ali',
      isMe: false,
      isOthers: false,
      doneAt: at('2026-10-14', '21:30'),
      share: rm('24.40'),
      paidAt: null,
      paidByTransactionId: null,
    },
  );

  // A refund already linked (D21), and one Sen is watching for (§12.1)
  T({
    key: 'uniqlo',
    day: '2026-10-04',
    time: '16:20',
    merchant: 'UNIQLO',
    amount: rm('129.90'),
    acct: 'ryt',
    cat: 'Shopping',
  });
  T({
    key: 'uniqlo-refund',
    day: '2026-10-08',
    time: '11:02',
    merchant: 'UNIQLO',
    amount: rm('39.90'),
    acct: 'ryt',
    kind: 'refund',
    linked: 'uniqlo',
  });
  T({
    key: 'shopee-headset',
    day: '2026-10-07',
    time: '22:30',
    merchant: 'SHOPEE',
    amount: rm('59.00'),
    acct: 'ryt',
    cat: 'Shopping',
  });
  db.promises.push({
    ...owned(uid('promise:shopee')),
    kind: 'refund',
    counterparty: 'SHOPEE',
    expectedAmount: rm('59.00'),
    expectedBy: '2026-10-25',
    matchedTransactionId: null,
    status: 'waiting',
  });

  // A hawker and a shop Sen hasn't seen (D70, §6.3): each waits for its category
  const siti = T({
    key: 'siti',
    day: TODAY,
    time: '12:31',
    merchant: 'SITI AMINAH BT YUSOF',
    amount: rm('8.00'),
    acct: 'tng',
    status: 'needs_attention',
  });
  const roti = T({
    key: 'roti-bakar',
    day: TODAY,
    time: '08:10',
    merchant: 'ROTI BAKAR 88',
    amount: rm('9.50'),
    acct: 'ryt',
    status: 'needs_attention',
  });

  // Money in from dad, with a note that lets Sen suggest the answer (D90)
  const dad = T({
    key: 'angpao',
    day: '2026-10-12',
    time: '10:15',
    merchant: 'TAN AH KOW',
    amount: rm('100.00'),
    acct: 'pbb',
    kind: 'income',
    status: 'needs_attention',
    note: 'Birthday angpao from dad',
  });

  // New wording from Ryt, already booked (D87)
  const tmpl = uid('template:ryt-qr');
  db.templates.push({ ...owned(tmpl), package: 'my.rytbank.app', kind: 'out', status: 'provisional' });
  const ev = uid('event:kedai-maju');
  db.events.push({
    ...owned(ev),
    package: 'my.rytbank.app',
    postedAt: at('2026-10-17', '13:05'),
    title: 'Payment successful 🎉',
    text: 'You paid RM6.50 to KEDAI MAJU via DuitNow QR using your Main Account.',
    parseStatus: 'parsed',
    parsedBy: tmpl,
  });
  const km = T({
    key: 'kedai-maju',
    day: '2026-10-17',
    time: '13:05',
    merchant: 'KEDAI MAJU',
    amount: rm('6.50'),
    acct: 'ryt',
    cat: 'Meals',
    event: ev,
  });

  // RM2,000 into Ryt from your own name: Public Bank doesn't notify money out, so where from? (D17)
  const own = T({
    key: 'own-2000',
    day: '2026-10-15',
    time: '21:47',
    merchant: 'TAN WEI MING',
    amount: rm('2,000.00'),
    acct: 'ryt',
    kind: 'transfer',
    direction: 'in',
    status: 'needs_attention',
  });

  // Tonight's dinner for three, paid on Ryt: its receipt is the one Scan reads (scan-after)
  T({
    key: 'sate',
    day: TODAY,
    time: '19:58',
    merchant: 'SATE KAJANG HJ SAMURI',
    amount: rm('64.13'),
    acct: 'ryt',
    cat: 'Meals',
  });

  // Entered by hand: a parking ticket the app didn't see (§6.8)
  T({
    key: 'parking',
    day: '2026-10-13',
    time: '18:02',
    merchant: 'Parking',
    amount: rm('5.00'),
    acct: 'tng',
    cat: 'Car',
    source: 'manual',
  });

  // October's balance check found RM42.10 nobody saw leave (D18)
  db.txns.push(gapAt('2026-10-01', 'oct', rm('42.10')));
  db.checks.push({
    ...owned(uid('check:oct')),
    accountId: acctId('ryt'),
    asOf: at('2026-10-01', '21:00'),
    balance: rm('4,812.35'),
    adjustmentTransactionId: uid('txn:gap:oct'),
  });

  // A receipt waiting for its payment, and one that couldn't be read (§6.4)
  const diy = uid('receipt:mrdiy');
  db.receipts.push({
    ...owned(diy),
    transactionId: null,
    merchantRaw: 'MR DIY',
    occurredAt: at(TODAY, '15:20'),
    total: rm('23.90'),
    tax: 0,
    serviceCharge: 0,
    pax: 1,
    note: null,
    source: 'scan',
    status: 'awaiting_payment',
    createdAt: at(TODAY, '15:24'),
  });
  const diyItems: [string, string][] = [
    ['Extension cord 3m', '15.90'],
    ['Cable ties (100)', '8.00'],
  ];
  diyItems.forEach(([description, price], i) =>
    db.items.push({
      ...owned(uid(`item:diy:${i}`)),
      receiptId: diy,
      description,
      qty: 1,
      amount: rm(price),
      price: rm(price),
      categoryId: catId('Shopping'),
      kind: 'item',
    }),
  );
  const blur = uid('receipt:blurry');
  db.receipts.push({
    ...owned(blur),
    transactionId: null,
    merchantRaw: null,
    occurredAt: null,
    total: 0,
    tax: 0,
    serviceCharge: 0,
    pax: 1,
    note: null,
    source: 'gallery',
    status: 'failed',
    createdAt: at('2026-10-17', '09:12'),
  });

  // The skipped notifications: no template read them, and they showed no sign of a payment (§6.2)
  const skip = (k: string, pkg: string, day: string, time: string, title: string, text: string) =>
    db.events.push({
      ...owned(uid(`event:${k}`)),
      package: pkg,
      postedAt: at(day, time),
      title,
      text,
      parseStatus: 'skipped',
      parsedBy: null,
    });
  skip(
    'tng-promo',
    'my.com.tngdigital.ewallet',
    '2026-10-18',
    '10:00',
    'Cashback is waiting 🎁',
    'Pay with eWallet at any participating merchant this weekend and enjoy up to RM5 cashback.',
  );
  skip(
    'grab-collected',
    'com.grabtaxi.passenger',
    '2026-10-16',
    '20:31',
    'Collected your food?',
    'Let the host know, so they can ensure everyone gets exactly what they ordered.',
  );
  skip(
    'ryt-statement',
    'my.rytbank.app',
    '2026-10-02',
    '08:00',
    'Your statement is ready',
    'Your September statement for Main Account is now available in the app.',
  );

  // Budgets (D29), goals and a bucket (§10), subscriptions (§11)
  const budget = (cat: string, amount: string) =>
    db.budgets.push({
      ...owned(uid(`budget:${cat}`)),
      categoryId: catId(cat),
      amount: rm(amount),
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
    });
  budget('Meals', '900.00');
  budget('Drinks & desserts', '150.00');
  budget('Shopping', '300.00');
  budget('Entertainment', '150.00');
  const goal = (
    k: string,
    name: string,
    kind: 'goal' | 'bucket',
    target: string,
    date: string | null,
    saved: string[],
  ) => {
    db.goals.push({
      ...owned(uid(`goal:${k}`)),
      name,
      kind,
      targetAmount: rm(target),
      targetDate: date,
      repeatsYearly: kind === 'bucket',
      status: 'active',
    });
    saved.forEach((s, i) =>
      db.contributions.push({
        ...owned(uid(`contrib:${k}:${i}`)),
        goalId: uid(`goal:${k}`),
        amount: rm(s),
        occurredAt: at(salaries(i), '10:20'),
      }),
    );
  };
  const salaries = (i: number) => lastWorkingDay(addDays('2026-05-01', i * 31));
  goal('japan', 'Japan in spring', 'goal', '6,000.00', '2027-03-15', [
    '500.00',
    '500.00',
    '400.00',
    '550.00',
    '500.00',
    '500.00',
  ]);
  goal('roadtax', 'Road tax and insurance', 'bucket', '1,400.00', '2027-02-01', [
    '200.00',
    '200.00',
    '200.00',
    '100.00',
  ]);
  goal('emergency', 'Emergency fund', 'goal', '15,000.00', null, [
    '1,500.00',
    '800.00',
    '0.00',
    '1,000.00',
    '700.00',
    '1,000.00',
  ]);

  const sub = (
    k: string,
    name: string,
    key: string,
    amount: number,
    currency: string,
    dom: string,
    rate: string | null,
    source: 'bnm' | 'charge' | null,
  ) => {
    const id = uid(`sub:${k}`);
    db.subscriptions.push({
      ...owned(id),
      name,
      merchantKey: key,
      amount,
      currency,
      cadence: 'monthly',
      nextRenewalDate: `2026-${dom < TODAY.slice(8) ? '11' : '10'}-${dom}`,
      status: 'active',
      displayFxRate: rate,
      displayFxOn: rate ? '2026-09-20' : null,
      displayFxSource: source,
    });
    for (const m of ['07', '08', '09', '10']) {
      const day = `2026-${m}-${dom}`;
      if (day > TODAY) {
        db.charges.push({
          ...owned(uid(`charge:${k}:${m}`)),
          subscriptionId: id,
          expectedDate: day,
          expectedAmount: amount,
          currency,
          status: 'expected',
          matchedTransactionId: null,
        });
        continue;
      }
      const t = db.txns.find((x) => x.merchantKey === key && klDay(x.occurredAt) === day);
      db.charges.push({
        ...owned(uid(`charge:${k}:${m}`)),
        subscriptionId: id,
        expectedDate: day,
        expectedAmount: amount,
        currency,
        status: t ? 'matched' : 'missed',
        matchedTransactionId: t?.id ?? null,
      });
    }
  };
  sub('spotify', 'Spotify Premium', 'SPOTIFY', rm('23.90'), 'MYR', '12', null, null);
  sub('icloud', 'iCloud+ 200 GB', 'APPLE COM BILL', rm('4.90'), 'MYR', '03', null, null);
  sub('claude', 'Claude Pro', 'CLAUDE AI SUBSCRIPTION', 2000, 'USD', '20', '4.2550', 'charge');
  sub('netflix', 'Netflix Basic', 'NETFLIX', rm('28.00'), 'MYR', '22', null, null);

  db.reliefs[uid('txn:uniqlo')] = 'Lifestyle';
  db.experiment = { label: 'GrabFood at most 3 times a week', merchantKey: 'GRABFOOD', perWeek: 3 };
  db.note = {
    text: 'Quiet Saturday: RM31.20 all day. Drinks are at RM118 of RM150 with 12 days to go, so maybe one less ZUS this week.',
    at: at('2026-10-17', '21:00'),
  };
  db.payday = { stage: 'progress', done: 2, of: 3 };

  db.review = review({ kh: kh.id, siti: siti.id, roti: roti.id, dad: dad.id, km: km.id, own: own.id, tmpl, blur });
}

/** Review's Needs you (§6.6), newest first: one of every kind in screens.md's table. */
function review(ids: Record<string, string>): ReviewItem[] {
  const cat = (n: string) => ({ id: catId(n), label: n });
  const items: ReviewItem[] = [
    {
      kind: 'new-merchant',
      id: 'r:siti',
      at: at(TODAY, '12:31'),
      suggested: null,
      txnId: ids.siti!,
      amount: rm('8.00'),
      merchant: 'SITI AMINAH BT YUSOF',
      account: 'TNG eWallet',
      guesses: [cat('Meals'), cat('Drinks & desserts')],
    },
    {
      kind: 'new-merchant',
      id: 'r:roti',
      at: at(TODAY, '08:10'),
      suggested: null,
      txnId: ids.roti!,
      amount: rm('9.50'),
      merchant: 'ROTI BAKAR 88',
      account: 'Ryt Bank',
      guesses: [cat('Meals'), cat('Groceries')],
    },
    {
      kind: 'money-in-share',
      id: 'r:kahhoe',
      at: at('2026-10-17', '22:10'),
      suggested: null,
      txnId: ids.kh!,
      amount: rm('48.80'),
      from: 'LIM K H',
      shares: [
        {
          memberId: uid('member:bbq:kahhoe'),
          splitId: uid('split:bbq'),
          name: 'Kah Hoe',
          bill: 'BBQ PLACE',
          amount: rm('48.80'),
        },
      ],
    },
    {
      kind: 'new-wording',
      id: 'r:kedai',
      at: at('2026-10-17', '13:05'),
      suggested: null,
      txnId: ids.km!,
      templateId: ids.tmpl!,
      said: 'Paid RM6.50 to KEDAI MAJU. Right?',
      app: 'Ryt Bank',
    },
    { kind: 'receipt-unread', id: 'r:blur', at: at('2026-10-17', '09:12'), suggested: null, receiptId: ids.blur! },
    {
      kind: 'transfer-missing',
      id: 'r:own',
      at: at('2026-10-15', '21:47'),
      suggested: 'pbb',
      txnId: ids.own!,
      amount: rm('2,000.00'),
      to: 'Ryt Bank',
      accounts: [
        { id: acctId('pbb'), label: 'Public Bank' },
        { id: acctId('maybank'), label: 'Maybank' },
      ],
    },
    {
      kind: 'owe-share',
      id: 'r:mei',
      at: at('2026-10-14', '22:10'),
      suggested: null,
      splitId: uid('split:haidilao'),
      memberId: uid('member:hd:me'),
      to: 'Mei',
      bill: 'HAIDILAO',
      amount: rm('24.40'),
    },
    {
      kind: 'money-in',
      id: 'r:dad',
      at: at('2026-10-12', '10:15'),
      suggested: 'income',
      txnId: ids.dad!,
      amount: rm('100.00'),
      from: 'TAN AH KOW',
      account: 'Public Bank',
      refundOf: [],
    },
    {
      kind: 'proposal',
      id: 'r:zus',
      at: at('2026-10-11', '21:00'),
      suggested: null,
      title: 'ZUS COFFEE, CHAGEE → Drinks & desserts, from now on',
      detail: '14 past payments stay as they are.',
    },
    {
      kind: 'claim-due',
      id: 'r:claim',
      at: at('2026-10-10', '07:30'),
      suggested: null,
      name: 'Phone bill',
      amount: rm('88.00'),
      deadline: '2026-10-25',
    },
    {
      kind: 'payday-step',
      id: 'r:payday',
      at: at('2026-09-30', '09:40'),
      suggested: null,
      step: "September's look-back, skipped on payday",
    },
    { kind: 'balance-check', id: 'r:check', at: at(TODAY, '07:00'), suggested: null, lastOn: '2026-10-01' },
  ];
  return items;
}
