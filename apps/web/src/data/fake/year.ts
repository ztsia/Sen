import type { Db } from './db';
import { catId, genCycle, NOW, weiMing, type Gen } from './scenario';

/**
 * *A heavy year*: Wei Ming's twelve months at the density of someone whose every payment is captured,
 * about twelve a day, so QA can measure lists, Insights and search at the size a year of real use
 * reaches. It is `weiMing()` plus extra passes of the same generator over each cycle, seeded apart and
 * keyed apart, keeping only the everyday spending (the salary, rent and bills happen once a cycle).
 */
const PASSES = [1, 1, 1, 3, 0, 0]; // keep every nth everyday payment of each pass; 0 keeps only the receipted ones

const EVERYDAY = new Set(
  [
    'Meals',
    'Drinks & desserts',
    'Car',
    'Transport',
    'Groceries',
    'Shopping',
    'Entertainment',
    'Health',
    'Personal care',
  ].map(catId),
);

/** Extra everyday spending for one cycle, appended to `out`. */
function densePass(start: string, until: string, i: number, out: Gen) {
  for (const [n, nth] of PASSES.entries()) {
    const p = n + 1;
    const pass: Gen = { txns: [], receipts: [], items: [] };
    genCycle(start, until, NOW, 50_000 + i * 10 + p, pass, { salary: false, ownTransfers: false, tag: `#y${p}` });
    const receipted = new Set(pass.receipts.map((r) => r.transactionId));
    const txns = pass.txns.filter(
      (t, j) =>
        t.kind === 'spend' &&
        t.categoryId &&
        EVERYDAY.has(t.categoryId) &&
        (receipted.has(t.id) || (nth > 0 && j % nth === 0)),
    );
    const keep = new Set(txns.map((t) => t.id));
    const receipts = pass.receipts.filter((r) => r.transactionId && keep.has(r.transactionId));
    const ids = new Set(receipts.map((r) => r.id));
    out.txns.push(...txns);
    out.receipts.push(...receipts);
    out.items.push(...pass.items.filter((it) => ids.has(it.receiptId)));
  }
}

export function heavyYear(): Db {
  return weiMing(({ start, until, i }, gen) => densePass(start, until, i, gen));
}
