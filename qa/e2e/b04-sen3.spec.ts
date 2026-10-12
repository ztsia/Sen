import { expect, test } from '@playwright/test';
import { db, dialog, open, shot, text, toast } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const SEN = (p: import('@playwright/test').Page) => p.getByRole('button', { name: 'Ask Sen', exact: true });
const status = (p: import('@playwright/test').Page) =>
  db<string>(p, `(d) => d.sen.messages.flatMap(m=>m.parts).filter(x=>x.type==='proposal').map(x=>x.status).join(',')`);
const review = (p: import('@playwright/test').Page) => db<number>(p, `(d) => d.review.filter(r=>r.kind==='proposal').length`);

test('apply, Undo, dismiss; review parity', async ({ page }) => {
  await open(page, '/');
  await SEN(page).click();
  const d = dialog(page, 'Sen');
  console.log('initial', await status(page), 'review proposals', await review(page));
  await d.getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(700);
  console.log('after apply', await status(page), await review(page));
  await shot(page, 'FLOW-5-step-6-applied');
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(700);
  console.log('after undo', await status(page), await review(page));
  await expect(d.getByRole('button', { name: 'Apply' })).toBeVisible();
  await d.getByRole('button', { name: 'Dismiss' }).click();
  await page.waitForTimeout(700);
  console.log('after dismiss', await status(page), await review(page));
  await shot(page, 'FLOW-5-step-7-dismissed');
});

test('gap: Yes opens manual with the day?', async ({ page }) => {
  await open(page, '/');
  await SEN(page).click();
  const d = dialog(page, 'Sen');
  await d.getByRole('button', { name: 'Add a payment for Sat 4 Oct' }).click();
  await page.waitForTimeout(900);
  console.log('url after Add a payment:', page.url());
  console.log((await text(page)).split('\n').slice(0, 14).join(' | '));
  await shot(page, 'FLOW-5-step-8-gap-manual');
});
