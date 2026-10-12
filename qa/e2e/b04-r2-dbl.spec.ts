import { test } from '@playwright/test';
import { db, dialog, open, shot } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const tt = (p: import('@playwright/test').Page) => p.locator('[data-sonner-toast]').allInnerTexts();
const paid = (p: import('@playwright/test').Page) =>
  db<number>(
    p,
    `(d) => d.members.filter(m => m.isMe && m.paidAt && d.splits.find(s=>s.id===m.splitId)?.paidBy==='other').length`,
  );

test('F1: double tap is one change, Undo undoes it', async ({ page }) => {
  await page.goto('/');
  const hd = await db<string>(page, `(d) => d.splits.find(s=>s.paidBy==='other').id`);
  await open(page, `/s/split?id=${hd}`);
  await page.getByRole('button', { name: "I've paid" }).dblclick();
  await page.waitForTimeout(800);
  console.log("I've paid dbl: toasts", JSON.stringify(await tt(page)), 'paid', await paid(page));
  await page.locator('[data-sonner-toast]').first().getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(800);
  console.log(
    'after Undo: paid',
    await paid(page),
    '| UI shows owe again:',
    await page
      .getByText(/You owe/)
      .first()
      .isVisible(),
  );
  await shot(page, 'R2-F1-step-1-undo-after-dbl');
  // deliberate repeat after the settle time goes through
  await page.getByRole('button', { name: "I've paid" }).click();
  await page.waitForTimeout(700);
  await page
    .getByRole('button', { name: "I've paid" })
    .click({ timeout: 2000 })
    .catch(() => {});
  console.log('repeat: paid', await paid(page));
});

test('F1: claim Submitted double tap', async ({ page }) => {
  await open(page, '/s/claims');
  const ids = await db<string[]>(
    page,
    `(d) => d.claimState.claims.filter(c=>c.status==='to_submit' && !c.missing.length).map(c=>c.id)`,
  );
  await open(page, `/s/claim?id=${ids[0]}`);
  await page.getByRole('button', { name: 'Submitted', exact: true }).dblclick();
  await page.waitForTimeout(800);
  console.log('Submitted dbl toasts', JSON.stringify(await tt(page)));
  await page.locator('[data-sonner-toast]').first().getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(800);
  console.log(
    'status after Undo',
    await db<string>(page, `(d) => d.claimState.claims.find(c=>c.id==='${ids[0]}').status`),
  );
});

test('F1: lock without waiting, Everyone, Sen Apply: double taps', async ({ page }) => {
  await page.goto('/');
  const nk = await db<string>(page, `(d) => d.splits.find(s=>!s.lockedAt && s.paidBy==='me').id`);
  await open(page, `/s/split?id=${nk}`);
  await page.getByRole('button', { name: 'Everyone' }).dblclick();
  await page.waitForTimeout(800);
  console.log('Everyone dbl toasts', JSON.stringify(await tt(page)));
  await page.getByRole('button', { name: "I've ticked everything I had" }).click();
  await page.waitForTimeout(700);
  const lock = page.getByRole('button', { name: /^Lock without waiting/ });
  await lock.dblclick();
  await page.waitForTimeout(800);
  console.log('Lock dbl toasts', JSON.stringify(await tt(page)));
  await page
    .locator('[data-sonner-toast]')
    .first()
    .getByRole('button', { name: 'Undo' })
    .click()
    .catch(() => console.log('no undo button'));
  await page.waitForTimeout(800);
  console.log(
    'after Undo: Final visible?',
    await page
      .getByText('Final', { exact: true })
      .isVisible()
      .catch(() => false),
    '| still changing?',
    await page
      .getByText('Still changing')
      .isVisible()
      .catch(() => false),
  );
  await shot(page, 'R2-F1-step-2-lock-undo');
  await open(page, '/');
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  const d = dialog(page, 'Sen');
  await d.getByRole('button', { name: 'Apply' }).dblclick();
  await page.waitForTimeout(800);
  console.log('Apply dbl toasts', JSON.stringify(await tt(page)));
  await page.locator('[data-sonner-toast]').first().getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(700);
  console.log('Apply visible again after Undo:', await d.getByRole('button', { name: 'Apply' }).isVisible());
});
