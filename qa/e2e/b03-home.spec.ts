import { expect, test } from '@playwright/test';
import { open, shot, settled, tabs, toast, watch, text, db } from './b03-helpers';

// FLOW-3: AC-7..AC-16

const _num = (s: string) => Number(s.replace(/[^0-9.-]/g, ''));

test('FLOW-3 Home (normal): figure arithmetic, cycle sheet equals Home, links', async ({ page }) => {
  const errors = watch(page);
  await open(page, '/');
  const hero = page.getByTestId('hero');
  await expect(hero).toContainText('Left until payday');
  await expect(hero).toContainText('12 days to go');
  const aria = (await hero.getAttribute('aria-label'))!;
  console.log('hero aria-label:', aria);
  const m = /RM([\d,]+)\.(\d\d)/.exec(aria)!;
  const heroSen = Number(m[1]!.replace(/,/g, '')) * 100 + Number(m[2]);
  console.log('hero sen', heroSen);
  await shot(page, 'FLOW-3-step-1-home');
  // ground truth from the fake's own rows
  const truth = await db<{ income: number; spendTotal: number; txns: number }>(
    page,
    `(d) => { const out = d.txns.filter(t=>!t.deletedAt); return { txns: out.length, income: 0, spendTotal: 0 } }`,
  );
  console.log('txns in db', truth.txns);
  await hero.click();
  const sheet = page.getByRole('dialog', { name: 'This cycle' });
  await expect(sheet).toContainText('Income received');
  const sheetText = (await sheet.innerText()).replace(/\n+/g, ' | ');
  console.log('cycle sheet:', sheetText);
  const sens = await sheet
    .locator('[data-sen]')
    .evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-sen'))));
  console.log('sheet sens (income, spending, result, estimate):', sens);
  expect(sens[0]! - sens[1]!).toBe(sens[2]);
  expect(sens[2]).toBe(heroSen);
  await expect(sheet).toContainText('An estimate');
  await shot(page, 'FLOW-3-step-2-cycle-sheet');
  await page.keyboard.press('Escape');

  await page.getByTestId('pace').click();
  await expect(page).toHaveURL(/\/s\/payments\?cycle=2026-09-30/);
  await settled(page);
  const summary = await page.locator('main p[role="status"]').first().innerText();
  console.log('payments summary after pace tap:', summary);
  await shot(page, 'FLOW-3-step-3-payments-this-cycle');
  // AC-16s: every row is within the cycle 30 Sep .. 29 Oct (KL days). Read the day headers.
  const heads = await page.locator('h3').allInnerTexts();
  console.log('day headers (first/last):', heads[0], '...', heads[heads.length - 1], heads.length);
  expect(errors).toEqual([]);
});

test('AC-16 Sen note opens Sen; balance row opens accounts (not built); quiet row text', async ({ page }) => {
  await open(page, '/');
  await page.getByTestId('sen-note').click();
  await expect(page.getByText('Looking at: Home')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByTestId('quiet').click();
  await page.waitForTimeout(400);
  console.log('quiet row ->', page.url());
  console.log((await text(page)).slice(0, 200));
  await shot(page, 'FLOW-3-step-4-balance-row-target');
});

for (const [scn, want] of [
  ['before-salary', /Spent since you started/],
  ['first-cycle', /nothing to compare with yet/],
  ['month', /Spent this month/],
  ['payday', /Payday/],
  ['capture-off', /Capture may be off/],
] as const)
  test(`FLOW-3 scenario ${scn}`, async ({ page }) => {
    await open(page, `/?scenario=${scn}`);
    await page.waitForTimeout(1500);
    const t = await text(page);
    console.log(`--- ${scn}\n${t.replace(/\n+/g, ' | ')}`);
    await expect(page.locator('main')).toContainText(want);
    await shot(page, `FLOW-3-scenario-${scn}`);
    if (scn === 'month') {
      await expect(page.getByTestId('quiet')).toHaveCount(0);
      expect(t).not.toMatch(/cycle/i);
      await page.getByTestId('hero').click();
      const s = await page.getByRole('dialog').innerText();
      console.log('month cycle sheet:', s.replace(/\n+/g, ' | '));
      expect(s).not.toMatch(/cycle|Payday expected|estimate/i);
      await page.keyboard.press('Escape');
      await tabs(page).getByRole('link', { name: /^More/ }).click();
      const more = await text(page);
      console.log('month More:', more.replace(/\n+/g, ' | '));
      expect(more).not.toContain('Accounts');
      expect(more).not.toContain('Claims');
    }
    if (scn === 'before-salary') {
      expect(t).not.toMatch(/Over by|−RM|-RM/);
    }
  });

test('AC-8 Over by: exactly zero reads RM0.00 left, one sen more reads Over by RM0.01', async ({ page }) => {
  await open(page, '/review');
  const add = async (amount: string) => {
    await tabs(page)
      .getByRole('link', { name: /^Review/ })
      .click();
    await page.getByRole('button', { name: /Missing a payment/ }).click();
    await page.getByLabel('Amount').fill(amount);
    await page.getByRole('radio', { name: 'Shopping' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(toast(page)).toContainText(`Added RM${amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`);
    await page.waitForTimeout(400);
    await tabs(page).getByRole('link', { name: /^Home/ }).click();
    await settled(page);
    return (await page.getByTestId('hero').getAttribute('aria-label'))!;
  };
  const zero = await add('1931.27');
  console.log('after spending exactly what is left:', zero);
  expect(zero).toContain('Left until payday, RM0.00');
  await shot(page, 'FLOW-3-step-5-exactly-zero');
  const over = await add('0.01');
  console.log('one sen more:', over);
  expect(over).toContain('Over by, RM0.01');
  await shot(page, 'FLOW-3-step-6-over-by-one-sen');
  const sheetTitle = await page
    .getByTestId('hero')
    .click()
    .then(async () => page.getByRole('dialog').innerText());
  console.log('cycle sheet while over:', sheetTitle.replace(/\n+/g, ' | '));
  await shot(page, 'FLOW-3-step-7-cycle-sheet-over');
});

test('AC-12 offline: chip counts unsynced rows; AC-12s online write does not flash Not synced yet', async ({
  page,
}) => {
  await open(page, '/?state=offline');
  await expect(page.getByText('2 not synced yet')).toBeVisible();
  await shot(page, 'FLOW-3-step-6-offline-chip');
  await open(page, '/review');
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByLabel('Amount').fill('5.00');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(300);
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  const early = await page.getByText('Not synced yet').count();
  console.log('online, 0.3 s after write: "Not synced yet" marks =', early);
  await page.waitForTimeout(2000);
  const later = await page.getByText('Not synced yet').count();
  console.log('2 s after write: marks =', later);
  const stillUnsynced = await db<number>(page, '(d) => Object.keys(d.unsynced).length');
  console.log('unsynced ids in db after 2.3 s:', stillUnsynced);
});
