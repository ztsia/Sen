import { expect, test } from '@playwright/test';
import { open, shot, settled, tabs, toast, watch, text, db } from './b03-helpers';

// Phase 4 on the fake "views": an independent oracle for spending, income, balances, owed, from raw rows, per spec §7 / D19 / D21.
// Money is BigInt-free integer sen here too.

const ORACLE = `(d) => {
  const kl = (iso) => new Date(new Date(iso).getTime() + 8*3600*1000).toISOString().slice(0,10);
  const live = d.txns.filter(t => !t.deletedAt);
  const by = (f) => live.filter(f);
  const spendOf = (t) => {
    if (t.kind === 'adjustment') return t.direction === 'out' ? t.amount : -t.amount;
    if (t.kind !== 'spend') return 0;
    const linked = live.filter(x => x.linkedTransactionId === t.id);
    const repaid = linked.filter(x => x.kind === 'repayment').reduce((a,x)=>a+x.amount,0);
    const refunded = linked.filter(x => x.kind === 'refund').reduce((a,x)=>a+x.amount,0);
    const share = t.myShare ?? t.amount;
    return Math.max(0, Math.min(share, t.amount - repaid) - refunded);
  };
  const cycle = { start: '2026-09-30', end: '2026-10-29' };
  const inC = (t) => { const k = kl(t.occurredAt); return k >= cycle.start && k <= cycle.end; };
  const spent = live.filter(inC).reduce((a,t)=>a+spendOf(t),0);
  const salaryCat = d.categories.find(c => c.systemKey === 'salary').id;
  const income = live.filter(inC).filter(t => t.kind === 'income' && t.status !== 'needs_attention').reduce((a,t)=>a+t.amount,0);
  // balance per tracked account
  const bal = {};
  for (const a of d.accounts) if (a.kind === 'tracked') bal[a.id] = a.openingBalance;
  for (const t of live) { if (!t.accountId || !(t.accountId in bal)) continue; const a = d.accounts.find(x => x.id === t.accountId); if (t.occurredAt < a.openingAt) continue; bal[t.accountId] += t.direction === 'in' ? t.amount : -t.amount; }
  const totalBal = Object.values(bal).reduce((a,b)=>a+b,0);
  // transfers: every transfer group has exactly one out and one in, equal amounts
  const groups = {};
  for (const t of live) if (t.transferGroupId) (groups[t.transferGroupId] ||= []).push(t);
  const badGroups = Object.entries(groups).filter(([g, ts]) => !(ts.length === 2 && ts.some(x=>x.direction==='out') && ts.some(x=>x.direction==='in') && ts[0].amount === ts[1].amount)).map(([g,ts]) => ({ g, n: ts.length, dirs: ts.map(t=>t.direction+':'+t.amount+':'+t.source+':'+t.kind).join(',') }));
  const nonSpendKindsWithSpending = live.filter(t => t.kind !== 'spend' && t.kind !== 'adjustment' && spendOf(t) !== 0).length;
  const incomeNotSalaryButInIncome = live.filter(inC).filter(t => t.kind === 'income').map(t => ({ m: t.merchantRaw, a: t.amount, cat: d.categories.find(c=>c.id===t.categoryId)?.name }));
  // forecasts never in txns: subscription charges are separate; check no txn id equals a charge id
  const chargeIds = new Set(d.charges.map(c => c.id));
  const forecastInTxns = live.filter(t => chargeIds.has(t.id)).length;
  // sums of float-ness
  const nonInt = d.txns.filter(t => !Number.isSafeInteger(t.amount) || (t.myShare !== null && !Number.isSafeInteger(t.myShare))).length;
  const kinds = {}; for (const t of live) kinds[t.kind] = (kinds[t.kind]||0)+1;
  return { spent, income, totalBal, badGroups, nonSpendKindsWithSpending, incomeNotSalaryButInIncome, forecastInTxns, nonInt, kinds, nTx: live.length };
}`;

test('oracle: Home figures equal an independent computation from raw rows', async ({ page }) => {
  await open(page, '/');
  const o = await db<any>(page, ORACLE);
  console.log(JSON.stringify(o, null, 1));
  const hero = (await page.getByTestId('hero').getAttribute('aria-label'))!;
  const m = /RM([\d,]+)\.(\d\d)/.exec(hero)!;
  const left = Number(m[1]!.replace(/,/g, '')) * 100 + Number(m[2]);
  expect(left).toBe(o.income - o.spent);
  const bal = (await page.getByTestId('quiet').innerText()).match(/RM([\d,]+)\.(\d\d)/)!;
  expect(Number(bal[1]!.replace(/,/g, '')) * 100 + Number(bal[2])).toBe(o.totalBal);
  expect(o.badGroups).toEqual([]);
  expect(o.nonSpendKindsWithSpending).toBe(0);
  expect(o.forecastInTxns).toBe(0);
  expect(o.nonInt).toBe(0);
});
