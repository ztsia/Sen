import { test } from '@playwright/test';
import { db, open, shot, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const tt = async (page: import('@playwright/test').Page) =>
  await page
    .locator('[data-sonner-toast]')
    .first()
    .innerText({ timeout: 1500 })
    .catch(() => 'none');
test('manual save in simulated offline', async ({ page }) => {
  test.setTimeout(90000);
  await open(page, '/s/manual?state=offline');
  const count = () => db<number>(page, `(d) => d.txns.filter(t=>!t.deletedAt).length`);
  const before = await count();
  await page.getByRole('textbox').first().fill('3.50');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(800);
  console.log(
    'Save with no category: count',
    before,
    '->',
    await count(),
    '| toast',
    await tt(page),
    '|',
    (await text(page))
      .split('\n')
      .filter((l) => /Pick|choose|categor/i.test(l))
      .slice(0, 3)
      .join(' / '),
  );
  await page.getByRole('button', { name: 'Meals', exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(1200);
  console.log('Save with category: count', before, '->', await count(), '| toast', await tt(page), '| url', page.url());
  console.log(
    'row',
    await db<string>(
      page,
      `(d) => JSON.stringify(d.txns.filter(t=>!t.deletedAt).slice(-1).map(t=>({a:t.amount,s:t.source,st:t.status,k:t.kind,d:t.direction})))`,
    ),
  );
  await shot(page, 'FLOW-16-step-5-manual-saved-offline');
});
