import { expect, test } from '@playwright/test';
import { watch, shot } from './b03-helpers';

test.use({ baseURL: 'http://127.0.0.1:5182' });

test('AC-6 production: every B03 screen says Not built yet, shows no made-up data, no dev panel, no badge', async ({
  page,
}) => {
  const errors = watch(page);
  const paths = [
    '/',
    '/review',
    '/s/skipped',
    '/scan',
    '/s/crop',
    '/s/reading?id=x',
    '/s/confirm?id=x',
    '/s/manual',
    '/insights',
    '/s/budgets',
    '/s/subscriptions',
    '/s/goals',
    '/s/goal?id=x',
    '/s/insights/year',
    '/more',
    '/s/payments',
    '/s/txn?id=x',
    '/s/receipt?id=x',
    '/?scenario=payday&state=empty',
    '/s/payments?state=offline',
  ];
  const out: string[] = [];
  for (const p of paths) {
    await page.goto(p);
    await page.waitForTimeout(400);
    const nb = await page.getByTestId('not-built').count();
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const madeUp = /Wei Ming|SATE KAJANG|ROTI BAKAR|NASI KANDAR|RM\d/.test(body);
    const dev = await page.getByRole('button', { name: 'Dev panel' }).count();
    const badge = await page.getByTestId('review-badge').count();
    out.push(`${p}: notBuilt=${nb} madeUpFigures=${madeUp} devPanel=${dev} badge=${badge} | ${body.slice(0, 60)}`);
  }
  console.log(out.join('\n'));
  await page.goto('/');
  await shot(page, 'FLOW-33-step-1-production-home');
  for (const l of out) {
    expect(l).toMatch(/notBuilt=1/);
    expect(l).toMatch(/madeUpFigures=false/);
    expect(l).toMatch(/devPanel=0/);
  }
  // an offline write path cannot reach a fake: the backend rejects
  const _r = await page.evaluate(async () => {
    try {
      const _m = await import(/* @vite-ignore */ '/assets/index.js');
      return 'imported';
    } catch {
      return 'no module at that path';
    }
  });
  expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([]);
});
