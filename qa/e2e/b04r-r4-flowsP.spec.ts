import { expect, test, type Page } from '@playwright/test';
import { uid } from '../../apps/web/src/data/fake/ids';
import { open, settled } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 scoped re-check, flows P: the other consumers of the money field. Preview build (5292).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

const money = (p: Page) => p.locator('input[inputmode="numeric"]');

test("R4S-FLOW-7 the other money fields (first-run balances and a member's allowance) take select all too", async ({
  page,
}) => {
  const F = 'R4S-FLOW-7';
  const rows: string[] = [];
  // first-run: the balances step
  await open(page, '/s/first-run');
  await page.getByRole('textbox').first().fill('weiming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Choose these 4' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  const f1 = money(page).first();
  await f1.click();
  await page.keyboard.type('120000');
  const a1 = await f1.inputValue();
  await f1.press('ControlOrMeta+a');
  await page.keyboard.type('175');
  const b1 = await f1.inputValue();
  rows.push(`first-run: ${a1} -> ${b1}`);
  await step(
    page,
    F,
    1,
    'first-run',
    'first-run balances: 120000, select all, 175',
    'reads 1,200.00 then 1.75',
    async () => {
      expect([a1, b1]).toEqual(['1,200.00', '1.75']);
    },
  );
  // member allowance (seeded, two decimals)
  await open(page, `/s/settings/member?id=${uid('member:hui-min')}`);
  await settled(page);
  const f2 = money(page).first();
  const seed = await f2.inputValue();
  await f2.click();
  await f2.press('ControlOrMeta+a');
  await page.keyboard.type('175');
  const b2 = await f2.inputValue();
  rows.push(`member allowance: seed ${seed} -> ${b2}`);
  await step(page, F, 2, 'member', "a member's allowance: select all, 175", 'reads 1.75', async () => {
    expect(b2).toBe('1.75');
  });
  note(F, rows.join('\n'));
});
