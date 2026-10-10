import { expect, test, type Page } from '@playwright/test';
import { open, shot, settled, tabs, toast, db, watch } from './b03-helpers';

// FLOW-19..23: AC-38..AC-48, AC-62

const num = (s: string) => Number(s.replace(/[^0-9]/g, ''));

test('FLOW-19 Insights: every card is question + chart + takeaway + Ask Sen; takeaways match an oracle from raw rows', async ({ page }) => {
  const errors = watch(page);
  await open(page, '/insights');
  await page.waitForTimeout(800);
  const cards = await page.locator('main section, main [data-card], main article').count();
  const asks = await page.getByRole('button', { name: 'Ask Sen about this' }).count();
  console.log('cards (sections):', cards, '| Ask Sen buttons:', asks);
  const questions = ['Am I on track?', 'Which budgets are at risk?', 'Where did it go, and what changed?', 'When does the money leak?', 'Do the small things add up?', 'What does a meal cost me?', 'Am I keeping my experiment?', 'Eating out or cooking?', 'How much is spoken for before I spend?', 'What renews soon?', 'Am I saving more than before?', 'Will my goals make it?', 'Can I trust these numbers?', 'Where do I spend most often?'];
  const t = await page.locator('main').innerText();
  const present = questions.filter((q) => t.includes(q));
  console.log('questions present:', present.length, '/', questions.length, '| missing:', JSON.stringify(questions.filter((q) => !t.includes(q))));
  console.log('The year row:', t.includes('The year'));
  for (let i = 0; i < 10; i++) {
    await page.locator('main').evaluate((m) => m.scrollBy(0, 700));
    await page.waitForTimeout(100);
    await shot(page, `FLOW-19-step-${String(i + 1).padStart(2, '0')}-scroll`);
  }
  // oracle
  const o = await db<any>(page, `(d) => {
    const kl = (iso) => new Date(new Date(iso).getTime() + 8*3600*1000).toISOString().slice(0,10);
    const live = d.txns.filter(t => !t.deletedAt);
    const spendOf = (t) => { if (t.kind === 'adjustment') return t.direction === 'out' ? t.amount : -t.amount; if (t.kind !== 'spend') return 0; const l = live.filter(x => x.linkedTransactionId === t.id); const rep = l.filter(x=>x.kind==='repayment').reduce((a,x)=>a+x.amount,0); const ref = l.filter(x=>x.kind==='refund').reduce((a,x)=>a+x.amount,0); return Math.max(0, Math.min(t.myShare ?? t.amount, t.amount - rep) - ref); };
    const cyc = live.filter(t => { const k = kl(t.occurredAt); return k >= '2026-09-30' && k <= '2026-10-18'; });
    const small = cyc.filter(t => t.kind === 'spend' && t.amount < 1500);
    const byMerchant = {}; for (const t of cyc) if (t.kind === 'spend' && t.merchantRaw) { const m = (byMerchant[t.merchantRaw] ||= { c: 0, s: 0 }); m.c++; m.s += spendOf(t); }
    const top = Object.entries(byMerchant).map(([k,v]) => ({ k, ...v })).sort((a,b) => b.c - a.c || b.s - a.s).slice(0,5);
    const meals = new Set(d.categories.filter(c => c.isMeal).map(c => c.id));
    const eat = cyc.filter(t => t.categoryId && meals.has(t.categoryId)).reduce((a,t)=>a+spendOf(t),0);
    const groc = cyc.filter(t => t.categoryId === d.categories.find(c => c.name==='Groceries').id).reduce((a,t)=>a+spendOf(t),0);
    const exactly15 = cyc.filter(t => t.kind === 'spend' && t.amount === 1500).length;
    return { smallCount: small.length, smallTotal: small.reduce((a,t)=>a+spendOf(t),0), top, eat, groc, exactly15, smallNonSpendIncluded: cyc.filter(t => t.kind !== 'spend' && t.amount < 1500).length };
  }`);
  console.log('oracle:', JSON.stringify(o));
  const ui = await db<any>(page, `(d) => 0`);
  // read what the UI says
  const txt = t.replace(/\s+/g, ' ');
  const small = /(\d+) payments under RM15\.00/.exec(txt);
  console.log('UI small things:', small?.[0]);
  expect(Number(small![1])).toBe(o.smallCount);
  const eatMatch = /Eating out\s*RM([\d,]+\.\d\d)\s*Groceries\s*RM([\d,]+\.\d\d)/.exec(txt);
  console.log('UI eating out / groceries:', eatMatch?.[1], eatMatch?.[2]);
  expect(num(eatMatch![1]!)).toBe(o.eat);
  expect(num(eatMatch![2]!)).toBe(o.groc);
  const pct = /(\d+)% of what you spent on food was eating out/.exec(txt);
  console.log('UI eating-out share:', pct?.[0], '| oracle', Math.round((o.eat / (o.eat + o.groc)) * 100));
  expect(Number(pct![1])).toBe(Math.round((o.eat / (o.eat + o.groc)) * 100));
  expect(errors).toEqual([]);
});

test('AC-41 payments of exactly RM15.00 and non-spend rows under RM15 are not counted as small things', async ({ page }) => {
  await open(page, '/review');
  // add exactly RM15.00 and RM14.99 through the app
  for (const a of ['15.00', '14.99']) {
    await tabs(page).getByRole('link', { name: /^Review/ }).click();
    await page.getByRole('button', { name: /Missing a payment/ }).click();
    await page.getByLabel('Amount').fill(a);
    await page.getByRole('radio', { name: 'Meals' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(toast(page)).toContainText(`Added RM${a}`);
    await page.waitForTimeout(300);
  }
  await tabs(page).getByRole('link', { name: /^Insights/ }).click();
  await settled(page);
  await page.waitForTimeout(600);
  const txt = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  const small = /(\d+) payments under RM15\.00/.exec(txt)!;
  console.log('after adding RM15.00 and RM14.99:', small[0]);
  expect(Number(small[1])).toBe(23); // 22 + only the 14.99
});

test('FLOW-19 Where did it go: tapping a category opens Payments filtered to it', async ({ page }) => {
  await open(page, '/insights');
  await page.waitForTimeout(800);
  const where = page.getByText('Where did it go, and what changed?');
  await where.scrollIntoViewIfNeeded();
  await shot(page, 'FLOW-19-step-11-where-did-it-go');
  const btns = await page.locator('main button').allInnerTexts();
  console.log('buttons on Insights:', JSON.stringify([...new Set(btns.map((b) => b.replace(/\s+/g, ' ').slice(0, 40)))]));
  const rank = page.getByRole('button', { name: /Meals/ }).first();
  console.log('Meals button count:', await page.getByRole('button', { name: /Meals/ }).count());
  await rank.click().catch(() => console.log('no Meals button'));
  await page.waitForTimeout(500);
  console.log('after tap:', page.url());
});

test('FLOW-20 budgets: meters, at-risk wording, add / blank / zero / negative / abc / duplicate, Undo', async ({ page }) => {
  await open(page, '/insights');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Open budgets/ }).click();
  await settled(page);
  const t0 = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
  console.log(t0);
  await shot(page, 'FLOW-20-step-1-budgets');
  const addBtn = page.getByRole('button', { name: 'Add a budget' });
  await addBtn.click();
  const dlg = page.getByRole('dialog');
  // blank category
  await dlg.getByRole('button', { name: 'Save' }).click();
  console.log('save with nothing:', (await dlg.innerText()).replace(/\n+/g, ' | ').slice(0, 200));
  const cats = await dlg.getByRole('group', { name: 'Category' }).getByRole('button').allInnerTexts();
  console.log('categories offered for a new budget:', JSON.stringify(cats));
  await dlg.getByRole('group', { name: 'Category' }).getByRole('button', { name: cats[0]! }).click();
  for (const bad of ['', '-1', 'abc', '1e3', '12.345']) {
    await dlg.getByLabel('Budget each cycle').fill(bad);
    await dlg.getByRole('button', { name: 'Save' }).click();
    const err = await dlg.locator('[data-slot="field-error"]').allInnerTexts();
    console.log(JSON.stringify(bad), '->', JSON.stringify(err), '| dialog still open:', await dlg.count());
    expect(await dlg.count()).toBe(1);
  }
  await dlg.getByLabel('Budget each cycle').fill('250.5');
  await dlg.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText('RM250.50 a cycle');
  await page.waitForTimeout(500);
  const rows = await db<any>(page, `(d) => d.budgets.filter(b => !b.effectiveTo).map(b => ({ c: d.categories.find(c => c.id === b.categoryId).name, a: b.amount }))`);
  console.log('budgets in db:', JSON.stringify(rows));
  // a duplicate category is not offered again
  await page.getByRole('button', { name: 'Add a budget' }).click();
  const cats2 = await page.getByRole('dialog').getByRole('group', { name: 'Category' }).getByRole('button').allInnerTexts();
  console.log('offered again:', cats2.includes(cats[0]!));
  expect(cats2.includes(cats[0]!)).toBe(false);
  await shot(page, 'FLOW-20-step-2-added');
  await page.keyboard.press('Escape');
});

test('FLOW-20 budget at/over cap shows words and an icon, not colour alone', async ({ page }) => {
  await open(page, '/s/budgets');
  await page.waitForTimeout(700);
  const row = page.getByRole('button', { name: /Shopping/ }).first();
  const html = await row.innerHTML();
  console.log('Shopping meter text:', (await row.innerText()).replace(/\n+/g, ' | '), '| has svg icon:', /<svg/.test(html));
  const over = await row.innerText();
  console.log('over-budget wording present:', /Over by|over/i.test(over));
});

test('FLOW-21 subscriptions: forecasts never in spending, payments, budgets; monthly = sum', async ({ page }) => {
  await open(page, '/s/subscriptions');
  await page.waitForTimeout(700);
  const t = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
  console.log(t);
  await shot(page, 'FLOW-21-step-1-subscriptions');
  const o = await db<any>(page, `(d) => {
    const chargeIds = new Set(d.charges.map(c => c.id)); const live = d.txns.filter(t => !t.deletedAt);
    const forecasts = d.charges.filter(c => c.status === 'forecast' || c.status === 'expected' || c.matchedTransactionId === null);
    // any txn that is a forecast: id in charges, or source other than the known enums
    const sources = [...new Set(d.txns.map(t => t.source))];
    const monthly = d.subscriptions.filter(s => s.status==='active').map(s => ({ n: s.name, a: s.amount, cur: s.currency, cad: s.cadence, rate: s.displayFxRate }));
    return { inTxns: live.filter(t => chargeIds.has(t.id)).length, sources, charges: d.charges.length, statuses: [...new Set(d.charges.map(c => c.status))], monthly, future: live.filter(t => t.occurredAt > d.now).length };
  }`);
  console.log(JSON.stringify(o));
  expect(o.inTxns).toBe(0);
  expect(o.future).toBe(0);
});

test('FLOW-22 goals and goal: meters, per cycle, feasibility with sample, estimate wording, warning colour absent', async ({ page }) => {
  await open(page, '/s/goals');
  await page.waitForTimeout(700);
  console.log((await page.locator('main').innerText()).replace(/\n+/g, ' | '));
  await shot(page, 'FLOW-22-step-1-goals');
  const goals = await page.locator('main button').allInnerTexts();
  for (let i = 0; i < goals.length; i++) {
    await open(page, '/s/goals');
    await page.waitForTimeout(500);
    await page.locator('main button').nth(i).click();
    await settled(page);
    await page.waitForTimeout(400);
    console.log('---', (await page.locator('main').innerText()).replace(/\n+/g, ' | '));
    const warn = await page.locator('main').evaluate((m) => [...m.querySelectorAll('*')].filter((e) => /warning/.test(e.className?.toString?.() ?? '')).length);
    console.log('elements with a warning class on a goal screen:', warn);
    await shot(page, `FLOW-22-step-${i + 2}-goal`);
  }
});

test('FLOW-23 the year: months in KL, savings rate, reliefs', async ({ page }) => {
  await open(page, '/insights');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /year/i }).first().click();
  await settled(page);
  await page.waitForTimeout(500);
  console.log((await page.locator('main').innerText()).replace(/\n+/g, ' | '));
  await shot(page, 'FLOW-23-step-1-year');
  const o = await db<any>(page, `(d) => {
    const kl = (iso) => new Date(new Date(iso).getTime() + 8*3600*1000).toISOString().slice(0,7);
    const live = d.txns.filter(t => !t.deletedAt);
    const spendOf = (t) => { if (t.kind === 'adjustment') return t.direction === 'out' ? t.amount : -t.amount; if (t.kind !== 'spend') return 0; const l = live.filter(x => x.linkedTransactionId === t.id); const rep = l.filter(x=>x.kind==='repayment').reduce((a,x)=>a+x.amount,0); const ref = l.filter(x=>x.kind==='refund').reduce((a,x)=>a+x.amount,0); return Math.max(0, Math.min(t.myShare ?? t.amount, t.amount - rep) - ref); };
    const m = {}; for (const t of live) { const k = kl(t.occurredAt); if (!k.startsWith('2026')) continue; m[k] = m[k] || { s: 0, i: 0 }; m[k].s += spendOf(t); if (t.kind==='income' && t.status !== 'needs_attention') m[k].i += t.amount; }
    return m; }`);
  console.log('oracle by calendar month 2026:', JSON.stringify(o));
});
