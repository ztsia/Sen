import { test } from '@playwright/test';
import { db, dialog, open, shot, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const L = async (p: import('@playwright/test').Page, n = 24) => (await text(p)).split('\n').filter((l) => l && !/EVERY SEN|^Home$|^Review$|^Scan$|^Insights$|^More$|to review|^\d+$/.test(l)).slice(0, n).join(' | ');
const toasts = (p: import('@playwright/test').Page) => p.locator('[data-sonner-toast]').allInnerTexts();

test('gap: Yes, I did opens manual on the day; save lands on that day', async ({ page }) => {
  await open(page, '/');
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  const d = dialog(page, 'Sen');
  console.log('gap text:', (await d.innerText()).split('\n').filter((l) => /Oct|gap|pay for/.test(l)).slice(0, 5).join(' | '));
  await d.getByRole('button', { name: /^Yes, I did/ }).click();
  await page.waitForTimeout(1200);
  console.log('url:', page.url());
  console.log('MANUAL:', (await L(page, 30)).slice(0, 420));
  await shot(page, 'R3-GAP-step-1-manual-on-day');
  await page.getByRole('textbox').first().fill('12.50');
  await page.getByRole('radio', { name: 'Meals' }).click({ timeout: 2000 }).catch(async () => page.getByText('Meals', { exact: true }).first().click());
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(1200);
  console.log('after save url', page.url(), '| toasts', JSON.stringify(await toasts(page)));
  const row = await db<string>(page, `(d) => JSON.stringify(d.txns.filter(t=>t.source==='manual').slice(-1).map(t=>({a:t.amount,at:t.occurredAt})))`);
  console.log('last manual txn:', row);
  // Sen: answered state, reopen sheet
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  await page.waitForTimeout(600);
  console.log('Sen after answer:', (await dialog(page, 'Sen').innerText()).split('\n').filter((l) => /You chose|Yes, I did|Add a payment/.test(l)).join(' | '));
});
test('gap: the other buttons, and hostile day params', async ({ page }) => {
  await open(page, '/');
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  const d = dialog(page, 'Sen');
  await d.getByRole('button', { name: 'Add a payment for Sun 4 Oct' }).click({ timeout: 3000 }).catch(async () => { console.log('buttons:', (await d.getByRole('button').allInnerTexts()).filter((s) => /Add a payment/.test(s)).join('|')); });
  await page.waitForTimeout(900);
  console.log('Add a payment url:', page.url());
  for (const day of ['2026-10-04', '2026-13-45', '2026-02-30', '2027-01-01', '1999-01-01', '9999-12-31', '2026-10-4', '<script>', '0000-00-00']) {
    const errs: string[] = [];
    page.removeAllListeners('pageerror');
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(`/s/manual?day=${day}&look=minted&mode=light`);
    await page.waitForTimeout(900);
    const t = await L(page, 14);
    console.log('day', JSON.stringify(day).padEnd(14), /Add expense/.test(t) ? 'form ' : 'NO FORM', '|', (t.match(/Mon|Tue|Wed|Thu|Fri|Sat|Sun[^|]*|Now/g) ?? []).slice(-1).join(), '| pageerrors', JSON.stringify(errs).slice(0, 120), '|', t.slice(0, 60));
  }
});
