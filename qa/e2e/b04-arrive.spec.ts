import { test } from '@playwright/test';
import { db, open, shot, toast } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
test('simulator arrival twice', async ({ page }) => {
  await open(page, '/');
  const state = () =>
    db<string>(
      page,
      `(d) => JSON.stringify({ rules: d.rules.map(r=>r.merchantKey), roti: d.review.filter(r=>/ROTI/.test(r.merchant||'')).length, cat: d.txns.find(t=>/ROTI/.test(t.merchantRaw||''))?.categoryId })`,
    );
  console.log('before', await state());
  for (let n = 1; n <= 2; n++) {
    await page.getByRole('button', { name: 'Dev panel' }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'A notification arrives' }).click();
    await page.waitForTimeout(1200);
    const shade = page
      .getByText('A new merchant. Pick a category, or scan the receipt.')
      .locator('xpath=ancestor::div[.//button[normalize-space()="Meals"]][1]');
    console.log(`arrival ${n}: prompt visible`, await shade.isVisible().catch(() => false));
    await shot(page, `FLOW-C2-step-${n + 3}-arrival`);
    if (!(await shade.isVisible().catch(() => false))) break;
    await shade.getByRole('button', { name: 'Meals', exact: true }).click();
    await page.waitForTimeout(900);
    console.log(
      `after answer ${n}:`,
      await state(),
      JSON.stringify(
        await toast(page)
          .innerText()
          .catch(() => 'none'),
      ),
    );
  }
});
