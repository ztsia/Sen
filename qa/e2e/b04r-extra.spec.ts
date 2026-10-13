import { expect, test } from '@playwright/test';
import { db, open, shot } from './b04r-helpers';

test.use({ baseURL: 'http://127.0.0.1:5291' });

test('EXTRA progress bars expose a value', async ({ page }) => {
  const out: string[] = [];
  for (const p of ['/s/claims', '/s/budgets', '/s/settings/members', '/s/goals', '/s/payday', '/s/insights']) {
    await open(page, p);
    await page.waitForTimeout(300);
    const v = await page.getByRole('progressbar').evaluateAll((bs) => bs.map((b) => `${b.getAttribute('aria-label')}=${b.getAttribute('aria-valuenow')}/${b.getAttribute('aria-valuemax')}`));
    out.push(`${p}: ${v.join(' ; ')}`);
  }
  console.log(out.join('\n'));
});

test('EXTRA cycle sheet and rules origin', async ({ page }) => {
  await open(page, '/');
  await page.getByTestId('hero').click();
  await page.waitForTimeout(500);
  const d = page.getByRole('dialog');
  console.log('cycle sheet:', (await d.innerText()).replace(/\n+/g, ' / ').slice(0, 500));
  await shot(page, 'FLOW-1-step-5-cycle-sheet');
  await open(page, '/s/settings/categories');
  await page.getByRole('radio', { name: 'Rules' }).click();
  await page.waitForTimeout(300);
  await shot(page, 'FLOW-12-step-4-rules-origin');
});

test('EXTRA forget ESS password, then split-public done with nothing', async ({ page }) => {
  await open(page, '/s/settings/claims');
  await page.getByRole('button', { name: 'More about ESS' }).click();
  await page.getByRole('menuitem', { name: 'Forget password' }).click();
  await page.waitForTimeout(500);
  await shot(page, 'FLOW-10-step-5c-forget');
  console.log('after forget click:', (await page.locator('body').innerText()).replace(/\n+/g, ' / ').slice(0, 500));
  const dlg = await page.getByRole('alertdialog').count();
  console.log('alertdialog', dlg);
  await open(page, '/s/split-public?id=demo-new');
  await page.getByRole('textbox').fill('Mei');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /ticked everything/ }).click();
  await page.waitForTimeout(600);
  console.log('done nothing:', (await page.locator('body').innerText()).replace(/\n+/g, ' / ').slice(0, 300));
  const st = await db<string>(page, '(db)=>1').catch(() => 'n/a');
  void st;
  expect(true).toBe(true);
});
