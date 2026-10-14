import { expect, test, type Page } from '@playwright/test';
import { db, open, settled, toast, watch } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 flows A: amount entry (D132). Dev server (5291): the fake db is read as a module.
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

const MANUAL = '(db)=>JSON.stringify(db.txns.filter(t=>t.source==="manual").map(t=>t.amount).sort((a,b)=>a-b))';
const manual = async (page: Page) => JSON.parse(await db<string>(page, MANUAL)) as number[];

const paste = (page: Page, label: string, text: string) =>
  page.getByLabel(label, { exact: true }).evaluate((el, t) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', t);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, text);

test('R4-FLOW-1 typing an amount like a bank app', async ({ page }) => {
  const w = watch(page);
  const F = 'R4-FLOW-1';
  await open(page, '/s/manual');
  const amount = page.getByLabel('Amount', { exact: true });
  await expect(amount).toBeVisible();
  let n = 0;

  await amount.click();
  const seen: string[] = [];
  for (const d of ['1', '2', '5', '0']) {
    await page.keyboard.press(d);
    seen.push(await amount.inputValue());
  }
  note(F, `after 1,2,5,0: ${JSON.stringify(seen)}`);
  n++;
  await step(page, F, n, 'digits', 'type 1, 2, 5, 0', 'reads 0.01, 0.12, 1.25, 12.50', async () => {
    expect(seen).toEqual(['0.01', '0.12', '1.25', '12.50']);
    await expect(amount).toHaveAttribute('inputmode', /numeric|decimal/);
  });

  const strays: string[] = [];
  for (const k of ['.', ',', 'e', '-', 'a', '+', ' ', '٣', '１']) {
    if (k.charCodeAt(0) > 127) await page.keyboard.insertText(k);
    else await page.keyboard.press(k);
    strays.push(await amount.inputValue());
  }
  note(F, `after strays . , e - a + space arabic fullwidth: ${JSON.stringify(strays)}`);
  n++;
  await step(page, F, n, 'strays', 'type . , e - a + space and non-latin digits', 'the value stays 12.50', async () => {
    // the full-width and Arabic digits are digits to a human; the field either ignores them or reads them as digits
    expect(strays.slice(0, 7)).toEqual(Array(7).fill('12.50'));
    for (const s of strays.slice(7)) expect(s).toMatch(/^[0-9,.]*$/);
  });

  const backs: string[] = [];
  await page.keyboard.press('Home');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Backspace');
    backs.push(await amount.inputValue());
  }
  note(F, `backspaces: ${JSON.stringify(backs)}`);
  n++;
  await step(
    page,
    F,
    n,
    'backspace',
    'type 12.50 fresh then backspace',
    'drops the last digit each time, ends empty',
    async () => {
      // after the strays the value may carry digits typed above; backspace must shrink by one digit each time
      const digits = (s: string) => s.replace(/\D/g, '').replace(/^0+/, '').length;
      for (let i = 1; i < backs.length; i++) expect(digits(backs[i]!)).toBeLessThanOrEqual(digits(backs[i - 1]!));
      expect(backs.at(-1)).toBe('');
    },
  );

  const pasted: Record<string, string> = {};
  for (const t of [
    'RM 1,234.50',
    'abc12def',
    '1e3',
    '0.1+0.2',
    '-5',
    '12.5',
    '１２３',
    'NaN',
    '99999999999999999999',
    '0',
  ]) {
    await paste(page, 'Amount', t);
    pasted[t] = await amount.inputValue();
  }
  note(F, `pastes: ${JSON.stringify(pasted)}`);
  n++;
  await step(
    page,
    F,
    n,
    'paste',
    'paste hostile and formatted text',
    'kept as it reads, or its digits only; never a float',
    async () => {
      expect(pasted['RM 1,234.50']).toBe('1,234.50');
      expect(pasted['abc12def']).toBe('0.12');
      expect(pasted['12.5']).toBe('12.50');
      for (const v of Object.values(pasted)) expect(v).toMatch(/^([0-9]{1,3}(,[0-9]{3})*\.[0-9]{2})?$/);
      expect(pasted['99999999999999999999']).toBe('99,999,999,999.99');
    },
  );

  // long runs by typing, not paste
  await amount.fill('');
  await amount.click();
  await page.keyboard.type('9'.repeat(25));
  const long = await amount.inputValue();
  note(F, `25 nines typed: ${long}`);
  n++;
  await step(
    page,
    F,
    n,
    'long',
    'type 25 nines',
    'clamped to 99,999,999,999.99 or refused in words, no exponent',
    async () => {
      expect(long).toMatch(/^99,999,999,999\.99$/);
    },
  );

  // exact save
  await amount.fill('');
  await amount.click();
  await page.keyboard.type('199999');
  await expect(amount).toHaveValue('1,999.99');
  await page.getByRole('radio', { name: 'Meals' }).click();
  const before = await manual(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(async () => (await manual(page)).length).toBe(before.length + 1);
  const after = await manual(page);
  n++;
  await step(page, F, n, 'saved', 'Save 1,999.99', 'one manual row of 199999 sen', async () => {
    expect(after).toContain(199999);
    expect(after.length).toBe(before.length + 1);
    await expect(toast(page)).toContainText('RM1,999.99');
  });
  expect(w.errors).toEqual([]);
});

test('R4-FLOW-1b zero and empty amounts are refused in words, nothing saved', async ({ page }) => {
  const F = 'R4-FLOW-1b';
  await open(page, '/s/manual');
  const before = await manual(page);
  const amount = page.getByLabel('Amount', { exact: true });
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  let n = 1;
  await step(page, F, n, 'empty', 'Save with no digits', 'message names the amount; no row', async () => {
    await expect(page.getByText('Type the amount.', { exact: true })).toBeVisible();
    expect(await manual(page)).toEqual(before);
  });
  await amount.click();
  await page.keyboard.type('000');
  n++;
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await step(page, F, n, 'zeros', 'type 000 and Save', 'still refused; no row', async () => {
    await expect(amount).toHaveValue('');
    expect(await manual(page)).toEqual(before);
  });
});

test('R4-FLOW-1c every money field takes digits from the right', async ({ page }) => {
  const F = 'R4-FLOW-1c';
  const forms: [string, string, string][] = [
    ['/s/balance-check', 'balance check', ''],
    ['/s/budgets', 'budgets', ''],
    ['/s/subscriptions', 'subscription', 'Add a subscription'],
    ['/s/goals', 'goal', 'Add a goal'],
  ];
  let n = 0;
  for (const [path, slug, opener] of forms) {
    await open(page, path);
    await settled(page);
    if (opener) await page.getByRole('button', { name: opener }).click();
    if (slug === 'budgets') {
      const add = page.getByRole('button', { name: /Add a budget|Add/ }).first();
      await add.click();
    }
    const field = page.locator('input[inputmode="numeric"], input[inputmode="decimal"]').first();
    await expect(field).toBeVisible();
    await field.click();
    await page.keyboard.type('1250');
    n++;
    await step(page, F, n, slug, `type 1250 in ${slug}`, 'reads 12.50', async () => {
      await expect(field).toHaveValue('12.50');
      const h = await field.evaluate((el) => ({
        fs: getComputedStyle(el).fontSize,
        h: el.getBoundingClientRect().height,
      }));
      note(F, `${slug}: input ${JSON.stringify(h)}`);
    });
  }
});
