import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountsView, AccountView, BalanceCheckView, ClaimsView, ClaimView, PaydayView } from '@sen/core/views';
import { rm } from '../scenario';
import { buildScenario } from '../variants';
import { home as homeView } from '../views';
import { balances } from '../views';
import { createFake } from '../index';
import { acctId } from '../scenario';
import { accountsView, accountView, balanceCheckView, claimsView, claimView, paydayView } from './money';

// Accounts, claims and payday (B04): the views parse with their schemas, and the commands do what
// spec §7 (balance checks), §13 and §9.7 say.

afterEach(() => vi.useRealTimers());

describe('accounts', () => {
  const db = buildScenario('wei-ming', false);

  it('shows computed balances for tracked accounts and none for elsewhere', () => {
    const v = AccountsView.parse(accountsView(db));
    const bal = balances(db);
    expect(v.tracked.length).toBeGreaterThan(0);
    for (const a of v.tracked) expect(a.balance).toBe(bal.get(a.id));
    expect(v.total).toBe(v.tracked.reduce((s, a) => s + (a.balance ?? 0), 0));
    expect(v.elsewhere.every((a) => a.balance === null)).toBe(true);
    expect(v.gap).toBe(rm('42.10'));
  });

  it('shows one account with its recent payments and checks', () => {
    const v = AccountView.parse(accountView(db, acctId('ryt'))!);
    expect(v.recent.length).toBeGreaterThan(0);
    expect(v.checks[0]).toMatchObject({ balance: rm('4,812.35'), difference: -rm('42.10') });
  });

  it('has none without capture', () => {
    const d = buildScenario('month', false);
    expect(accountsView(d).tracked).toEqual([]);
    expect(balanceCheckView(d).rows).toEqual([]);
  });
});

describe('balance.check', () => {
  it('books each difference as Unaccounted, dated now, and records the check', async () => {
    const fake = createFake();
    const before = BalanceCheckView.parse(await fake.balanceCheck());
    const ryt = before.rows.find((r) => r.id === acctId('ryt'))!;
    const pbb = before.rows.find((r) => r.id === acctId('pbb'))!;
    const checks = fake.db().checks.length;
    const r = await fake.run({
      type: 'balance.check',
      checks: [
        { accountId: ryt.id, balance: ryt.computed - rm('12.40') },
        { accountId: pbb.id, balance: pbb.computed },
      ],
    });
    const db = fake.db();
    expect(r.said).toContain('RM12.40');
    expect(db.checks.length).toBe(checks + 2);
    const adj = db.txns.filter((t) => t.kind === 'adjustment' && t.amount === rm('12.40'));
    expect(adj).toHaveLength(1);
    expect(adj[0]).toMatchObject({ direction: 'out', accountId: ryt.id, source: 'adjustment' });
    expect(db.categories.find((c) => c.id === adj[0]!.categoryId)?.systemKey).toBe('unaccounted');
    // the account now matches what the bank said
    expect(balances(db).get(ryt.id)).toBe(ryt.computed - rm('12.40'));
    expect(db.checks.at(-1)!.adjustmentTransactionId).toBeNull();
    expect(db.review.some((i) => i.kind === 'balance-check')).toBe(false);
  });

  it('books money that came back as money in', async () => {
    const fake = createFake();
    const row = (await fake.balanceCheck()).rows[0]!;
    await fake.run({ type: 'balance.check', checks: [{ accountId: row.id, balance: row.computed + rm('5.00') }] });
    expect(fake.db().txns.find((t) => t.kind === 'adjustment' && t.amount === rm('5.00'))?.direction).toBe('in');
  });
});

describe('claims', () => {
  const db = buildScenario('wei-ming', false);

  it("has September's two to submit, one missing evidence, and August's approved and paid", () => {
    const v = ClaimsView.parse(claimsView(db));
    expect(v.period).toBe('September 2026');
    const sep = v.claims.filter((c) => c.period === 'September 2026');
    expect(sep.map((c) => c.status)).toEqual(['to_submit', 'to_submit']);
    expect(sep.filter((c) => c.missing.length)).toHaveLength(1);
    const aug = v.claims.filter((c) => c.period === 'August 2026').map((c) => c.status);
    expect(aug.sort()).toEqual(['approved', 'paid']);
    for (const c of v.claims) expect(c.amount).toBeLessThanOrEqual(c.cap);
  });

  it('builds the kit with what is missing and how to add it', () => {
    const missing = db.claimState.claims.find((c) => c.missing.length)!;
    const v = ClaimView.parse(claimView(db, missing.id)!);
    expect(v.missing[0]!.how).not.toBe('');
    expect(v.files).toHaveLength(missing.evidence);
    expect(v.fields.find((f) => f.label === 'Amount (RM)')?.value).toBe('64.00');
  });

  it('marks a claim submitted by hand, once', async () => {
    const fake = createFake();
    const id = fake.db().claimState.claims[0]!.id;
    await fake.run({ type: 'claim.submitted', id, essRef: null });
    expect(fake.db().claimState.claims[0]!.status).toBe('submitted');
    const again = await fake.run({ type: 'claim.submitted', id, essRef: null });
    expect(again.said).toBe('Already submitted');
  });

  it('sends to ESS a moment later, with a made-up reference', async () => {
    vi.useFakeTimers();
    const fake = createFake();
    const id = fake.db().claimState.claims[0]!.id;
    await fake.run({ type: 'claim.submitted', id, essRef: 'send' });
    expect(fake.db().claimState.claims[0]!.status).toBe('to_submit');
    vi.advanceTimersByTime(2000);
    const c = fake.db().claimState.claims[0]!;
    expect(c.status).toBe('submitted');
    expect(c.essRef).toMatch(/^ESS-26-\d+$/);
  });
});

describe('payday', () => {
  const db = buildScenario('payday', false);

  it("leaves the claims' part out of Home's income, as the payday card says (D45, QA B04 run 2, 21)", () => {
    const home = homeView(db);
    expect(home.figure.income).toBe(rm('5,800.00') - rm('152.00'));
    // and each approved claim has nothing missing, so nothing waits to be sent
    for (const c of claimsView(db).claims.filter((c) => c.period === 'September 2026'))
      expect(c).toMatchObject({ status: 'approved', missing: [] });
  });

  it('is the salary and four steps, step 1 already answered', () => {
    const v = PaydayView.parse(paydayView(db)!);
    expect(v.salary).toBe(rm('5,800.00'));
    expect(v.steps).toEqual(['claims', 'balance', 'look-back', 'plan']);
    expect(v.claims?.answered).toBe(true);
    // the plan's figures add up to the salary less its claims part (D45): code's arithmetic
    const total = v.plan!.lines.reduce((s, l) => s + l.sen, 0);
    const claims = v.claims!.claims.reduce((s, l) => s + l.sen, 0);
    expect(claims).toBe(rm('152.00'));
    expect(total + claims).toBe(v.salary);
  });

  it('asks the question after Undo', async () => {
    const fake = createFake('payday');
    await fake.run({ type: 'payday.claims', answer: 'undo' });
    expect(paydayView(fake.db())!.claims?.answered).toBe(false);
    await fake.run({ type: 'payday.claims', answer: 'yes' });
    expect(paydayView(fake.db())!.claims?.answered).toBe(true);
  });

  it('has no balance step or plan without capture, and no Sen steps without the agent', () => {
    const noCapture = buildScenario('payday', false);
    noCapture.capture = false;
    expect(paydayView(noCapture)!.steps).not.toContain('balance');
    expect(paydayView(noCapture)!.steps).not.toContain('plan');
    const noAgent = buildScenario('payday', false);
    noAgent.agent = false;
    const v = paydayView(noAgent)!;
    expect(v.steps).toEqual(['claims', 'balance']);
    expect(v.lookBack).toBeNull();
    expect(v.plan).toBeNull();
  });

  it('puts a skipped step in Review, once, and finishing starts the progress', async () => {
    const fake = createFake('payday');
    await fake.run({ type: 'payday.skip', step: 'balance' });
    await fake.run({ type: 'payday.skip', step: 'balance' });
    expect(fake.db().review.filter((r) => r.id === 'r:payday:balance')).toHaveLength(1);
    await fake.run({ type: 'payday.plan', use: true });
    expect(fake.db().payday).toMatchObject({ stage: 'progress', done: 0 });
    // the claims part stays out of income once the card is done (QA B04 run 3, 23)
    expect(homeView(fake.db()).figure.income).toBe(rm('5,800.00') - rm('152.00'));
    await fake.run({ type: 'payday.plan', use: false });
    expect(fake.db().payday).toBeNull();
    expect(homeView(fake.db()).figure.income).toBe(rm('5,800.00') - rm('152.00'));
    // a write that changes nothing offers no Undo (QA B04 run 3, 26)
    const again = await fake.run({ type: 'payday.skip', step: 'balance' });
    expect(again.undo).toBeNull();
  });
});
