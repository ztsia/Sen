import { klDay, monthName } from '@sen/core/cycles';
import { formatSen } from '@sen/core/money';
import type { BalanceCheck, Transaction } from '@sen/core/schema';
import type {
  AccountRow,
  AccountsView,
  AccountView,
  BalanceCheckView,
  ClaimRow,
  ClaimsView,
  ClaimView,
  PaydayStep,
  PaydayView,
} from '@sen/core/views';
import { nowIso } from '@/lib/clock';
import { newId } from '@/lib/uid';
import type { Db } from '../db';
import { uid } from '../ids';
import { balances, payments } from '../views';
import type { AreaApply } from './ctx';

// Accounts, claims and payday (B04), on made-up data: `accounts`, `account`, `balance-check`,
// `claims`, `claim` and `payday`, and the balance.check, claim.* and payday.* commands. Claims use
// made-up schemes only: real claim values never enter the repo (CLAUDE.md).

const rm = (ringgit: number, sen = 0) => ringgit * 100 + sen;

export interface ClaimState {
  claims: ClaimRow[];
  /** Payday's first step (D104): the payslip matched, you answered, or it's still asked. Unset: matched. */
  paydayClaims?: 'matched' | 'asked' | 'yes' | 'no';
}

/** Two invented schemes: what each one needs as evidence, and how to add what's missing (§13). */
const SCHEMES: Record<string, { name: string; evidence: 'pdf' | 'image'; how: string }> = {
  phone: {
    name: 'Phone bill',
    evidence: 'pdf',
    how: 'Forward the bill to your Sen address, or share the PDF to Sen and keep it as evidence only.',
  },
  parking: {
    name: 'Parking',
    evidence: 'image',
    how: 'Scan the receipt, or share its photo to Sen and keep it as evidence only.',
  },
};

const claim = (p: Partial<ClaimRow> & Pick<ClaimRow, 'id' | 'scheme' | 'period' | 'amount' | 'cap' | 'status'>) =>
  ({
    deadline: '2026-10-25',
    evidence: 0,
    missing: [],
    approvedAmount: null,
    essRef: null,
    reason: null,
    ...p,
  }) satisfies ClaimRow;

/**
 * September's two claims, still to submit (one with its evidence complete, one missing a receipt), and
 * August's: one approved and one paid. Amounts are code's, from the tagged payments and evidence (§13).
 */
export function seedClaims(db: Db): ClaimState {
  void db;
  return {
    claims: [
      claim({
        id: uid('claim:phone:2026-09'),
        scheme: SCHEMES.phone!.name,
        period: 'September 2026',
        amount: rm(88),
        cap: rm(100),
        status: 'to_submit',
        deadline: '2026-10-25',
        evidence: 1,
      }),
      claim({
        id: uid('claim:parking:2026-09'),
        scheme: SCHEMES.parking!.name,
        period: 'September 2026',
        amount: rm(64),
        cap: rm(100),
        status: 'to_submit',
        deadline: '2026-10-20',
        evidence: 4,
        missing: ['Receipt for 21 Sep not added yet'],
      }),
      claim({
        id: uid('claim:phone:2026-08'),
        scheme: SCHEMES.phone!.name,
        period: 'August 2026',
        amount: rm(88),
        cap: rm(100),
        status: 'paid',
        deadline: '2026-09-25',
        evidence: 1,
        approvedAmount: rm(88),
        essRef: 'ESS-26-04417',
      }),
      claim({
        id: uid('claim:parking:2026-08'),
        scheme: SCHEMES.parking!.name,
        period: 'August 2026',
        amount: rm(72),
        cap: rm(100),
        status: 'approved',
        deadline: '2026-09-20',
        evidence: 5,
        approvedAmount: rm(68),
        essRef: 'ESS-26-04412',
        reason: 'One receipt was over the scheme’s daily limit.',
      }),
    ],
  };
}

// --- accounts (§7, D16, D18, D93) ---

/** The app that feeds an account, as its owner knows it (D86). */
const APP: Record<string, string> = {
  'my.rytbank.app': 'Ryt Bank',
  'my.com.tngdigital.ewallet': 'TNG eWallet',
  'com.pbb.mypb': 'MyPB',
  'com.grabtaxi.passenger': 'Grab',
};

const live = (db: Db) => db.accounts.filter((a) => !a.archivedAt);
const checksOf = (db: Db, id: string) =>
  db.checks.filter((c) => c.accountId === id).sort((a, b) => Date.parse(b.asOf) - Date.parse(a.asOf));

/** What a check's adjustment found: positive is money that left unseen, as Home counts it. */
function leftUnseen(db: Db, c: BalanceCheck): number {
  const t = db.txns.find((x) => x.id === c.adjustmentTransactionId && !x.deletedAt);
  return t ? (t.direction === 'out' ? t.amount : -t.amount) : 0;
}

function accountRow(db: Db, a: Db['accounts'][number], bal: Map<string, number>): AccountRow {
  const tracked = a.kind === 'tracked';
  return {
    id: a.id,
    name: a.name,
    kind: a.kind,
    balance: tracked ? (bal.get(a.id) ?? 0) : null,
    checkedAt: tracked ? (checksOf(db, a.id)[0]?.asOf ?? null) : null,
    app: tracked && a.notifierPackage ? (APP[a.notifierPackage] ?? null) : null,
  };
}

export function accountsView(db: Db): AccountsView {
  // no capture, no accounts (D52, D79)
  if (!db.capture) return { total: 0, tracked: [], elsewhere: [], gap: null };
  const bal = balances(db);
  const tracked = live(db)
    .filter((a) => a.kind === 'tracked')
    .map((a) => accountRow(db, a, bal));
  const last = [...db.checks].sort((a, b) => Date.parse(b.asOf) - Date.parse(a.asOf))[0];
  return {
    total: tracked.reduce((s, a) => s + (a.balance ?? 0), 0),
    tracked,
    elsewhere: live(db)
      .filter((a) => a.kind === 'elsewhere')
      .map((a) => accountRow(db, a, bal)),
    gap: last ? leftUnseen(db, last) : null,
  };
}

export function accountView(db: Db, id: string): AccountView | null {
  const a = db.capture ? live(db).find((x) => x.id === id) : undefined;
  if (!a) return null;
  const bal = balances(db);
  return {
    account: accountRow(db, a, bal),
    opening: a.openingBalance,
    openingAt: a.openingAt,
    recent: payments(db, { offline: false }, { accountId: id }).rows.slice(0, 6),
    checks: checksOf(db, id).map((c) => ({
      at: c.asOf,
      balance: c.balance,
      // the bank's figure less what Sen had: negative when money left unseen
      difference: -leftUnseen(db, c),
    })),
  };
}

export function balanceCheckView(db: Db): BalanceCheckView {
  if (!db.capture) return { rows: [] };
  const bal = balances(db);
  return {
    rows: live(db)
      .filter((a) => a.kind === 'tracked')
      .map((a) => ({ id: a.id, name: a.name, computed: bal.get(a.id) ?? 0 })),
  };
}

// --- claims (§13) ---

/** *Send to ESS* shows once the adapter is signed in (Settings → Claims → ESS), in the shell (D96). */
const essReady = (db: Db) => db.settings.claims.ess.signedIn;

export function claimsView(db: Db): ClaimsView {
  const claims = db.claimState.claims;
  // this period is the newest one drafted (the 1st drafts the month before's, §13)
  const period =
    claims.find((c) => c.status === 'to_submit' || c.status === 'submitted')?.period ?? claims[0]?.period ?? '';
  return { period, claims, ess: essReady(db) };
}

export function claimView(db: Db, id: string): ClaimView | null {
  const c = db.claimState.claims.find((x) => x.id === id);
  if (!c) return null;
  const s = Object.values(SCHEMES).find((x) => x.name === c.scheme);
  const evidence = s?.evidence ?? 'pdf';
  const slug = c.scheme.toLowerCase().replace(/\s+/g, '-');
  const month = c.period.split(' ')[0]!.slice(0, 3).toLowerCase();
  return {
    claim: c,
    // in the order ESS asks for them
    fields: [
      { label: 'Claim type', value: c.scheme },
      { label: 'Claim month', value: c.period },
      { label: 'Amount', value: formatSen(c.amount) },
      { label: 'Remarks', value: `${c.scheme}, ${c.period}` },
    ],
    files: Array.from({ length: c.evidence }, (_, i) => ({
      id: uid(`claim-file:${c.id}:${i}`),
      name: evidence === 'pdf' ? `${slug}-${month}.pdf` : `${slug}-receipt-${i + 1}.jpg`,
      kind: evidence,
    })),
    missing: c.missing.map((what) => ({ what, how: s?.how ?? 'Share it to Sen and keep it as evidence only.' })),
    ess: essReady(db),
  };
}

// --- payday (§9.7, D60, D104) ---

/** Steps 3 and 4 are Sen's: they need the agent, and it must not be paused at its cap (§9.6). */
const senOn = (db: Db) => db.agent && !db.aiPausedUntil;

export function paydayView(db: Db): PaydayView | null {
  if (!db.payday) return null;
  const salaryCat = db.categories.find((c) => c.systemKey === 'salary')?.id;
  const salary = db.txns
    .filter((t) => !t.deletedAt && t.kind === 'income' && t.categoryId === salaryCat)
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))[0];
  const amount = salary?.amount ?? 0;
  // without capture there's no balance step or plan (D52)
  const steps: PaydayStep[] = [
    ...(db.claims ? (['claims'] as const) : []),
    ...(db.capture ? (['balance'] as const) : []),
    ...(senOn(db) ? (['look-back'] as const) : []),
    ...(senOn(db) && db.capture ? (['plan'] as const) : []),
  ];

  const state = db.claimState.paydayClaims ?? 'matched';
  const lines = db.claimState.claims
    .filter((c) => c.status !== 'rejected' && c.period === 'September 2026')
    .map((c) => ({ label: c.scheme, sen: c.approvedAmount ?? c.amount }));

  const due = [
    { label: 'Rent', sen: rm(1350), kind: 'due' as const },
    { label: 'Car loan', sen: rm(680), kind: 'due' as const },
    { label: 'Phone and internet', sen: rm(129), kind: 'due' as const },
  ];
  const aside = [
    { label: 'Emergency fund', sen: rm(400), kind: 'aside' as const },
    { label: 'Holiday bucket', sen: rm(250), kind: 'aside' as const },
  ];
  const left = amount - [...due, ...aside].reduce((s, l) => s + l.sen, 0);

  return {
    salary: amount,
    steps,
    claims: db.claims ? { answered: state !== 'asked', claims: state === 'no' ? [] : lines } : null,
    lookBack: senOn(db)
      ? {
          reasons: [
            { label: 'Eating out ran over its budget', sen: rm(96) },
            { label: 'Two one-off car costs', sen: rm(210) },
            { label: 'Weekend trips', sen: rm(140) },
          ],
          experiment: db.experiment?.label ?? 'GrabFood at most 3 times a week',
        }
      : null,
    plan:
      senOn(db) && db.capture
        ? { lines: [...due, ...aside, { label: 'Until your next payday', sen: left, kind: 'spend' as const }] }
        : null,
  };
}

/** How many moves the plan makes (due and set aside), which Home counts off as they arrive. */
const PLAN_MOVES = 5;

export const applyMoney: AreaApply = (db, cmd, ctx) => {
  switch (cmd.type) {
    case 'balance.check': {
      const bal = balances(db);
      const now = nowIso();
      const unaccounted = db.categories.find((c) => c.systemKey === 'unaccounted')?.id ?? null;
      let booked = 0;
      let found = 0;
      const touched: string[] = [];
      for (const c of cmd.checks) {
        const a = db.accounts.find((x) => x.id === c.accountId && x.kind === 'tracked');
        if (!a) throw new Error('That account is gone.');
        const diff = c.balance - (bal.get(a.id) ?? 0);
        let adj: Transaction | null = null;
        if (diff !== 0) {
          // money that left unseen is out, money that came back unseen is in (§7)
          adj = {
            id: newId(),
            userId: db.userId,
            accountId: a.id,
            bankEventId: null,
            occurredAt: now,
            direction: diff < 0 ? 'out' : 'in',
            amount: Math.abs(diff),
            currency: 'MYR',
            kind: 'adjustment',
            merchantRaw: null,
            merchantKey: null,
            categoryId: unaccounted,
            myShare: null,
            note: null,
            noReceipt: false,
            source: 'adjustment',
            status: 'done',
            transferGroupId: null,
            linkedTransactionId: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };
          db.txns.push(adj);
          touched.push(adj.id);
          booked += 1;
          found += diff < 0 ? -diff : diff;
        }
        db.checks.push({
          id: newId(),
          userId: db.userId,
          accountId: a.id,
          asOf: now,
          balance: c.balance,
          adjustmentTransactionId: adj?.id ?? null,
        });
      }
      // a check answers Review's ask for one
      db.review = db.review.filter((r) => r.kind !== 'balance-check');
      return {
        said: booked
          ? `Balances saved. ${formatSen(found)} booked as Unaccounted`
          : 'Balances saved. Everything matches',
        touched,
      };
    }
    case 'claim.submitted': {
      const c = db.claimState.claims.find((x) => x.id === cmd.id);
      if (!c) throw new Error('That claim is gone.');
      if (c.status !== 'to_submit') return { said: 'Already submitted', touched: [] };
      if (cmd.essRef !== null) {
        // *Send to ESS* (D96): the adapter is B25's, so this waits a moment and ESS "answers" (§13.1)
        ctx.later(1500, (d) => {
          const k = d.claimState.claims.find((x) => x.id === cmd.id);
          if (!k || k.status !== 'to_submit') return;
          k.status = 'submitted';
          k.essRef = `ESS-26-${String(5000 + Math.abs(k.amount % 900))}`;
        });
        return { said: 'Sending to ESS…', touched: [] };
      }
      c.status = 'submitted';
      return { said: `${c.scheme} marked as submitted`, touched: [c.id] };
    }
    case 'payday.claims': {
      db.claimState.paydayClaims = cmd.answer === 'undo' ? 'asked' : cmd.answer;
      return {
        said:
          cmd.answer === 'undo'
            ? 'Salary left as it landed'
            : cmd.answer === 'yes'
              ? 'Claims split from your salary'
              : 'Salary kept whole',
        touched: [],
      };
    }
    case 'payday.skip': {
      const names: Record<typeof cmd.step, string> = {
        claims: 'claims question',
        balance: 'balance check',
        'look-back': 'look-back',
        plan: 'plan',
      };
      const id = `r:payday:${cmd.step}`;
      // skipped twice is still one item (§6.6)
      if (!db.review.some((r) => r.id === id))
        db.review.unshift({
          kind: 'payday-step',
          id,
          at: nowIso(),
          suggested: null,
          step: `${monthName(klDay(db.now))}'s ${names[cmd.step]}, skipped on payday`,
        });
      return { said: 'Skipped. It waits in Review', touched: [] };
    }
    case 'payday.plan': {
      // finishing: with the plan, Home counts its moves off; without, the card is done (§9.7)
      db.payday = cmd.use ? { stage: 'progress', done: 0, of: PLAN_MOVES } : null;
      return { said: cmd.use ? 'Plan in use. Home counts the moves off' : 'Payday done', touched: [] };
    }
    default:
      return null;
  }
};
