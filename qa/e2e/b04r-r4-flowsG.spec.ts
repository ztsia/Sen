import { expect, test } from '@playwright/test';
import { open, settled } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 flows G: editing an existing amount under D132. Preview build (5292).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

test('R4-FLOW-15 editing an existing budget: what the person gets by typing a new amount', async ({ page }) => {
  const F = 'R4-FLOW-15';
  await open(page, '/s/budgets');
  await settled(page);
  const first = page.locator('main [data-slot="card"] button, main button').filter({ hasText: /of RM/ }).first();
  await first.click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  const field = dlg.locator('input[inputmode="numeric"]');
  const seed = await field.inputValue();
  await field.click();
  await page.keyboard.type('175');
  const typed = await field.inputValue();
  // select all and type
  await field.press('Control+a');
  await page.keyboard.type('175');
  const replaced = await field.inputValue();
  note(F, `seed ${seed}; typing 175 after it -> ${typed}; select-all then 175 -> ${replaced}`);
  await step(
    page,
    F,
    1,
    'edit',
    'open a budget, type 175 after its amount; then select all and type 175',
    'records both results (a new amount typed after the old digits is a bigger number)',
    async () => {
      expect(seed).toMatch(/^[0-9,]+\.[0-9]{2}$/);
      expect(replaced).toBe('1.75');
    },
  );
});
