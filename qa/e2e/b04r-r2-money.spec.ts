import { expect, test } from '@playwright/test';
import { db, open, settled, shot, toast, watch } from './b04r-helpers';

// R2-FLOW-9 / R2-FLOW-10 (R2-AC-14, 20, 44). Dev server (5291): the fake backend must be reachable as a module.
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

const MANUAL = '(db)=>JSON.stringify(db.txns.filter(t=>t.source==="manual").map(t=>t.amount))';
// the made-up month already holds one manual payment (RM5.00): compare with the amounts before the form is used
const SEED = '[500]';

test('R2-FLOW-10 manual: every bad amount is refused in words and nothing is saved', async ({ page }) => {
  const w = watch(page);
  await open(page, '/s/manual');
  const amount = page.getByLabel('Amount');
  const BAD: [string, RegExp][] = [
    ['', /Type the amount/],
    ['abc', /Type the amount in ringgit/],
    ['12.345', /Two decimals at most/],
    ['-5', /Type the amount in ringgit/],
    ['1e3', /Type the amount in ringgit/],
    ['12.5.5', /Type the amount in ringgit/],
    ['0', /above zero/],
    ['0.00', /above zero/],
    ['99999999999999999999', /too large/],
  ];
  await page.getByRole('radio', { name: 'Meals' }).click();
  let n = 0;
  for (const [text, msg] of BAD) {
    await amount.fill(text);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('main').locator('[data-slot="field-error"]').first(), `"${text}"`).toContainText(msg);
    expect(await db<string>(page, MANUAL), `nothing saved after "${text}"`).toBe(SEED);
    expect(page.url()).toContain('/s/manual');
    if (++n === 3) await shot(page, 'R2-FLOW-10-step-3-bad-amount-refused');
  }
  // no category is a refusal of its own
  await open(page, '/s/manual');
  await page.getByLabel('Amount').fill('12.50');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Pick a category.')).toBeVisible();
  expect(await db<string>(page, MANUAL)).toBe(SEED);
  await shot(page, 'R2-FLOW-10-step-4-no-category');
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-9 manual: amounts are exact sen, with Undo', async ({ page }) => {
  const w = watch(page);
  const CASES: [string, number][] = [
    ['19.99', 1999],
    ['0.10', 10],
    ['0.1', 10],
    ['1,284.50', 128450],
    ['0.29', 29],
    ['4.35', 435],
    ['1.15', 115],
  ];
  for (const [text, sen] of CASES) {
    await open(page, '/s/manual');
    await page.getByLabel('Amount').fill(text);
    await page.getByRole('radio', { name: 'Meals' }).click();
    await page.getByRole('button', { name: 'More details' }).click();
    await page.getByLabel('Merchant').fill('QA kedai');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(toast(page)).toContainText('Added');
    expect(JSON.parse(await db<string>(page, MANUAL)), `"${text}"`).toEqual([500, sen]);
    if (text === '19.99') await shot(page, 'R2-FLOW-9-step-4-saved-1999');
    await toast(page).getByRole('button', { name: 'Undo' }).click();
    await expect.poll(() => db<string>(page, MANUAL), `Undo after "${text}"`).toBe(SEED);
    if (text === '19.99') await shot(page, 'R2-FLOW-9-step-5-undone');
  }
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-10b balance check: bad figures refused; exact differences', async ({ page }) => {
  const w = watch(page);
  await open(page, '/s/balance-check');
  await settled(page);
  const ryt = page.getByRole('group', { name: 'Ryt Bank' });
  const bank = ryt.getByLabel('What the bank app shows');
  const BOOK = '(db)=>JSON.stringify(db.checks ?? db.balanceChecks ?? null)';
  void BOOK;
  for (const bad of ['abc', '12.345', '-5', '1e3', '1,2,3', '0.1.1']) {
    await bank.fill(bad);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(ryt.locator('[data-slot="field-error"]'), `"${bad}"`).toBeVisible();
    expect(page.url()).toContain('/s/balance-check');
  }
  const shown = () =>
    ryt.evaluate((el) => {
      const c = el.cloneNode(true) as HTMLElement;
      c.querySelectorAll('.sr-only').forEach((n) => n.remove());
      return (c.textContent ?? '').replace(/\s+/g, ' ');
    });
  await bank.fill('14650.87');
  await expect.poll(shown).toContain('No difference');
  await bank.fill('14650.88');
  await expect.poll(shown).toContain('RM0.01 more than Sen has');
  await bank.fill('14649.87');
  await expect.poll(shown).toContain('RM1.00 less than Sen has');
  await shot(page, 'R2-FLOW-11-step-5-difference-live');
  expect(w.errors).toEqual([]);
});
