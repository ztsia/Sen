import { test } from '@playwright/test';
import { db, open, shot, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const L = async (p: import('@playwright/test').Page, n = 24) =>
  (await text(p))
    .split('\n')
    .filter((l) => l && !/EVERY SEN|^Home$|^Review$|^Scan$|^Insights$|^More$|to review|^\d+$/.test(l))
    .slice(0, n)
    .join(' | ');
const toasts = (p: import('@playwright/test').Page) => p.locator('[data-sonner-toast]').allInnerTexts();

test('PAY on split you owe (HAIDILAO) and on split-public final', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const hd = await db<string>(page, `(d) => d.splits.find(s=>s.paidBy==='other').id`);
  await open(page, `/s/split?id=${hd}`);
  const grp = page.getByRole('group', { name: 'Pay from this phone' });
  console.log('split buttons:', JSON.stringify(await grp.getByRole('button').allInnerTexts()));
  await shot(page, 'R3-PAY-step-1-split-owe');
  for (const b of ['Pay with TNG', 'Other app…', 'Save QR']) {
    await grp.getByRole('button', { name: b }).click();
    await page.waitForTimeout(500);
    console.log(
      b,
      '=> toast',
      JSON.stringify(await toasts(page)),
      '| clipboard',
      JSON.stringify(await page.evaluate(() => navigator.clipboard.readText())),
    );
    await page.waitForTimeout(600);
  }
  await grp.getByRole('button', { name: 'Pay with TNG' }).dblclick();
  await page.waitForTimeout(500);
  console.log('dbl toasts', JSON.stringify(await toasts(page)));
  // after I've paid, hidden
  await page.getByRole('button', { name: "I've paid" }).click();
  await page.waitForTimeout(700);
  console.log("after I've paid, pay buttons:", await page.getByRole('group', { name: 'Pay from this phone' }).count());
  // public final
  await open(page, '/s/split-public?id=demo-final');
  const g2 = page.getByRole('group', { name: 'Pay from this phone' });
  console.log('public buttons:', JSON.stringify(await g2.getByRole('button').allInnerTexts()));
  for (const b of ['Pay with an app', 'Save QR']) {
    await g2.getByRole('button', { name: b }).click();
    await page.waitForTimeout(500);
    console.log(
      b,
      '=> toast',
      JSON.stringify(await toasts(page)),
      '| clipboard',
      JSON.stringify(await page.evaluate(() => navigator.clipboard.readText())),
    );
    await page.waitForTimeout(600);
  }
  await shot(page, 'R3-PAY-step-2-public-final');
  // still changing / not final -> none
  await open(page, '/s/split-public?id=demo');
  console.log(
    'public still changing pay group:',
    await page.getByRole('group', { name: 'Pay from this phone' }).count(),
  );
  // payer's own split (BBQ): none
  await open(page, '/s/shared');
  await page.getByRole('button', { name: /^BBQ PLACE/ }).click();
  await page.waitForTimeout(600);
  console.log('payer view pay group:', await page.getByRole('group', { name: 'Pay from this phone' }).count());
});
test('PAY: split you owe with no payer QR', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(800);
  await open(page, '/s/split-public?id=demo-final');
  console.log('public final text tail:', (await L(page, 60)).slice(-200));
});
