import { expect, test } from '@playwright/test';
import { db, open, shot, toast } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const paidCount = (page: import('@playwright/test').Page) =>
  db<number>(page, `(d) => d.members.filter(m => m.isMe && m.paidAt && d.splits.find(s=>s.id===m.splitId)?.paidBy==='other').length`);
test('double tap I have paid then Undo', async ({ page }) => {
  await page.goto('/');
  const hd = await db<string>(page, `(d) => d.splits.find(s=>s.paidBy==='other').id`);
  await open(page, `/s/split?id=${hd}`);
  expect(await paidCount(page)).toBe(0);
  await page.getByRole('button', { name: "I've paid" }).dblclick();
  await page.waitForTimeout(800);
  console.log('toast after dbl:', JSON.stringify(await toast(page).innerText()));
  expect(await paidCount(page)).toBe(1);
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(800);
  console.log('paid after Undo:', await paidCount(page));
  await shot(page, 'FLOW-3-step-3-after-dbl-undo');
});
test('single tap then Undo works', async ({ page }) => {
  await page.goto('/');
  const hd = await db<string>(page, `(d) => d.splits.find(s=>s.paidBy==='other').id`);
  await open(page, `/s/split?id=${hd}`);
  await page.getByRole('button', { name: "I've paid" }).click();
  await page.waitForTimeout(800);
  console.log('toast single:', JSON.stringify(await toast(page).innerText()));
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(800);
  console.log('paid after single Undo:', await paidCount(page));
});
