import { expect, test } from '@playwright/test';
import { open, settled } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 flows L: run 3's finding 12 (small things), re-checked. Preview build (5292).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

test('R4-FLOW-19 run 3 finding 12: 1,151 payments; the hawker switch is named; the first-cycle strip (finding 11)', async ({ page }) => {
  const F = 'R4-FLOW-19';
  await open(page, '/s/payments');
  await settled(page);
  const pay = await page.locator('main').innerText();
  await open(page, '/s/settings/categories');
  await settled(page);
  await page.getByRole('radio', { name: 'Rules' }).click();
  const names = await page.getByRole('switch').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  await open(page, '/?scenario=first-cycle');
  await settled(page);
  const strip = await page.getByRole('button', { name: /Payday plan/ }).count();
  note(F, `payments status: ${/[\d,]+ payments/.exec(pay)?.[0]}; rule switches: ${JSON.stringify(names)}; first-cycle strips: ${strip}`);
  await step(page, F, 1, 'small-things', 'read the Payments status, the rule switches and first-cycle Home', 'status has a comma; a hawker rule is named so', async () => {
    expect(/[\d,]+ payments/.exec(pay)?.[0]).toMatch(/1,151 payments/);
    expect(names.some((n) => /hawker/i.test(n ?? ''))).toBe(true);
  });
});
