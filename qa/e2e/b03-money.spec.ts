import { expect, test } from '@playwright/test';
import { open } from './b03-helpers';

// Phase 4 against the fake's read functions with synthetic rows: D19's table, D21 refunds, and the spending kinds.
test('D19 / D21: spendingOf on the spec table, a retried repayment, a refund, and non-spend kinds', async ({
  page,
}) => {
  await open(page, '/');
  const res = await page.evaluate(async () => {
    const v = await import(/* @vite-ignore */ '/src/data/fake/views.ts');
    const mk = (o: Record<string, unknown>) => ({
      id: 'x',
      kind: 'spend',
      direction: 'out',
      amount: 12000,
      myShare: null,
      deletedAt: null,
      linkedTransactionId: null,
      ...o,
    });
    const run = (rows: any[], i = 0) => v.spendingOf({ txns: rows } as any, rows[i]);
    const dinner = mk({ id: 'dinner', myShare: 4000 });
    const rep = (id: string, a: number, kind = 'repayment') =>
      mk({ id, kind, direction: 'in', amount: a, linkedTransactionId: 'dinner' });
    return {
      split_only: run([dinner]),
      ali_repays: run([dinner, rep('ali', 4000)]),
      ben_repays: run([dinner, rep('ali', 4000), rep('ben', 4000)]),
      overpaid: run([dinner, rep('ali', 4000), rep('ben', 4000), rep('cat', 4000)]),
      no_share_repay_4000: run([mk({ id: 'dinner' }), rep('ali', 4000)]),
      no_share_repay_all: run([mk({ id: 'dinner' }), rep('ali', 12000)]),
      refund_3000: run([mk({ id: 'dinner' }), rep('r', 3000, 'refund')]),
      refund_more_than_all: run([mk({ id: 'dinner' }), rep('r', 99999, 'refund')]),
      refund_after_split: run([dinner, rep('ali', 4000), rep('r', 1000, 'refund')]),
      transfer: run([mk({ id: 't', kind: 'transfer' })]),
      income: run([mk({ id: 'i', kind: 'income', direction: 'in' })]),
      deleted: run([mk({ id: 'd', deletedAt: 'x' })]),
      adjustment_out: run([mk({ id: 'a', kind: 'adjustment', amount: 4210 })]),
      adjustment_in: run([mk({ id: 'a', kind: 'adjustment', direction: 'in', amount: 4210 })]),
      share_bigger_than_amount: run([mk({ id: 's', myShare: 99999 })]),
    };
  });
  console.log(JSON.stringify(res, null, 1));
  expect(res.split_only).toBe(4000);
  expect(res.ali_repays).toBe(4000);
  expect(res.ben_repays).toBe(4000);
  expect(res.no_share_repay_4000).toBe(8000); // D19: falls by exactly the repayment
  expect(res.transfer).toBe(0);
  expect(res.income).toBe(0);
  expect(res.deleted).toBe(0);
  expect(res.refund_3000).toBe(9000);
  expect(res.refund_more_than_all).toBe(0);
  expect(res.share_bigger_than_amount).toBe(12000);
  expect(res.adjustment_out).toBe(4210);
  expect(res.adjustment_in).toBe(-4210);
});
