import { expect, test, type Locator, type Page } from '@playwright/test';
import { db, open, settled } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 scoped re-check, flows O: Select all then typing, in every money field (D132). Dev server (5291).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

const save = (p: Page) => p.getByRole('button', { name: 'Save', exact: true });
const field = (p: Page, scope?: Locator) => (scope ?? p).locator('input[inputmode="numeric"]').first();

async function replaceTest(page: Page, f: Locator, label: string, rows: string[]) {
  await f.click();
  await page.keyboard.type('120000');
  const a = await f.inputValue();
  await f.press('ControlOrMeta+a');
  await page.keyboard.type('175');
  const b = await f.inputValue();
  rows.push(`${label}: typed 120000 -> ${a}; select all, 175 -> ${b}`);
  expect(a, label).toBe('1,200.00');
  expect(b, label).toBe('1.75');
}

test('R4S-FLOW-6 select all then typing replaces the amount in all five forms, and the saved amount is the new one', async ({
  page,
}) => {
  const F = 'R4S-FLOW-6';
  const rows: string[] = [];
  let n = 0;
  // Add expense
  await open(page, '/s/manual');
  await replaceTest(page, field(page), 'Add expense', rows);
  await page.getByRole('radio', { name: 'Meals' }).click();
  await save(page).click();
  await page.waitForTimeout(500);
  const man = JSON.parse(
    await db<string>(page, '(d)=>JSON.stringify(d.txns.filter(t=>t.source==="manual").map(t=>t.amount))'),
  ) as number[];
  rows.push(`Add expense saved: ${JSON.stringify(man.slice(-2))}`);
  n++;
  await step(
    page,
    F,
    n,
    'add-expense',
    'Add expense: type 120000, select all, type 175, Save',
    'reads 1.75 and saves 175 sen',
    async () => {
      expect(man.at(-1)).toBe(175);
    },
  );
  // Balance check
  await open(page, '/s/balance-check');
  await settled(page);
  await replaceTest(page, field(page), 'Balance check', rows);
  n++;
  await step(page, F, n, 'balance-check', 'Balance check: the same', 'reads 1.75', async () => {
    await expect(field(page)).toHaveValue('1.75');
  });
  // Budgets: an existing amount
  await open(page, '/s/budgets');
  await settled(page);
  await page
    .locator('main button')
    .filter({ hasText: / of RM/ })
    .first()
    .click();
  const dlg = page.getByRole('dialog');
  const seed = await field(page, dlg).inputValue();
  await field(page, dlg).click();
  await field(page, dlg).press('ControlOrMeta+a');
  await page.keyboard.type('175');
  const bv = await field(page, dlg).inputValue();
  rows.push(`Budgets: seed ${seed}; select all, 175 -> ${bv}`);
  n++;
  await step(
    page,
    F,
    n,
    'budgets',
    'Budgets: open an existing amount, select all, type 175',
    'reads 1.75 (was 1,200.00)',
    async () => {
      expect(bv).toBe('1.75');
    },
  );
  await save(page)
    .click()
    .catch(() => {});
  await page.waitForTimeout(500);
  const caps = JSON.parse(await db<string>(page, '(d)=>JSON.stringify(d.budgets.map(b=>b.amount))')) as number[];
  rows.push(`Budgets saved caps: ${JSON.stringify(caps)}`);
  // Add a subscription
  await open(page, '/s/subscriptions');
  await settled(page);
  await page.getByRole('button', { name: 'Add a subscription' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Select all test');
  await replaceTest(page, field(page), 'Add a subscription', rows);
  await page.getByLabel('Next renewal', { exact: true }).fill('2026-12-01');
  await save(page).click();
  await page.waitForTimeout(500);
  const subs = JSON.parse(
    await db<string>(
      page,
      '(d)=>JSON.stringify(d.subscriptions.filter(s=>s.name==="Select all test").map(s=>s.amount))',
    ),
  ) as number[];
  rows.push(`Subscription saved: ${JSON.stringify(subs)}`);
  n++;
  await step(
    page,
    F,
    n,
    'subscription',
    'Add a subscription: select all, 175, Save',
    'saves 175 minor units',
    async () => {
      expect(subs).toEqual([175]);
    },
  );
  // Add a goal
  await open(page, '/s/goals');
  await settled(page);
  await page.getByRole('button', { name: 'Add a goal' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Select all goal');
  await replaceTest(page, field(page), 'Add a goal', rows);
  await page.locator('[role="group"][aria-labelledby="goal-account"] button').first().click();
  await save(page).click();
  await page.waitForTimeout(500);
  const gl = JSON.parse(
    await db<string>(page, '(d)=>JSON.stringify(d.goals.filter(g=>g.name==="Select all goal").map(g=>g.targetAmount))'),
  ) as number[];
  rows.push(`Goal saved: ${JSON.stringify(gl)}`);
  n++;
  await step(page, F, n, 'goal', 'Add a goal: select all, 175, Save', 'saves 175 sen', async () => {
    expect(gl).toEqual([175]);
  });
  note(F, rows.join('\n'));
});

test('R4S-FLOW-6b sad twins: partial selection, a click in the middle, backspace, paste, a stray key over a selection', async ({
  page,
}) => {
  const F = 'R4S-FLOW-6b';
  await open(page, '/s/manual');
  const f = field(page);
  const rows: Record<string, string> = {};
  const fresh = async () => {
    await f.fill('');
    await f.click();
    await page.keyboard.type('120000');
  };
  await fresh();
  await f.evaluate((el: HTMLInputElement) => el.setSelectionRange(0, 2)); // "1,"
  await page.keyboard.type('5');
  rows.partial = await f.inputValue();
  await fresh();
  const box = (await f.boundingBox())!;
  await page.mouse.click(box.x + 10, box.y + box.height / 2); // far left of the field
  await page.keyboard.type('5');
  rows.middleClick = await f.inputValue();
  await fresh();
  await f.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  rows.selectBackspace = await f.inputValue();
  await fresh();
  await f.press('ControlOrMeta+a');
  await f.evaluate((el) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'RM 33.30');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  rows.selectPaste = await f.inputValue();
  await fresh();
  await f.press('ControlOrMeta+a');
  await page.keyboard.press('x');
  rows.selectStray = await f.inputValue();
  await fresh();
  await f.press('Shift+ArrowLeft');
  await page.keyboard.type('7');
  rows.shiftLeft = await f.inputValue();
  await fresh();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('9');
  rows.arrowLeftThenDigit = await f.inputValue();
  await fresh();
  await f.press('ControlOrMeta+a');
  await page.keyboard.type('0');
  rows.selectZero = await f.inputValue();
  note(F, JSON.stringify(rows));
  await step(
    page,
    F,
    1,
    'sad',
    'try the odd selections',
    'every result is a clean two-decimal amount or empty; typing without a selection still appends',
    async () => {
      for (const [k, v] of Object.entries(rows)) expect(v, k).toMatch(/^([0-9]{1,3}(,[0-9]{3})*\.[0-9]{2})?$/);
      expect(rows.partial).toBe('5,200.00');
      expect(rows.middleClick).toBe('1,200,005.00'.replace('1,200,005.00', rows.middleClick)); // recorded: caret goes to the end
      expect(rows.selectBackspace).toBe('');
      expect(rows.selectPaste).toBe('33.30');
    },
  );
});
