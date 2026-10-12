import { test } from '@playwright/test';
import { db, open, shot, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const L = async (p: import('@playwright/test').Page, n = 40) =>
  (await text(p))
    .split('\n')
    .filter((l) => l && !/EVERY SEN|^Home$|^Review$|^Scan$|^Insights$|^More$|to review|^RM \d|^\d+$/.test(l))
    .slice(0, n)
    .join(' | ');
const toasts = (p: import('@playwright/test').Page) => p.locator('[data-sonner-toast]').allInnerTexts();
const spent = async (p: import('@playwright/test').Page) =>
  (await text(p)).split('\n').find((l) => /^Spent RM/.test(l)) ?? 'n/a';

test('write off on a split you paid: view, Home, shared list, Undo', async ({ page }) => {
  await open(page, '/');
  console.log('HOME before:', await spent(page));
  await page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Shared bills', { exact: true }).click();
  await page.waitForTimeout(600);
  console.log('SHARED before:', (await L(page, 14)).slice(0, 300));
  await page.getByRole('button', { name: /^BBQ PLACE/ }).click();
  await page.waitForTimeout(700);
  const before = await L(page, 80);
  console.log(
    'SPLIT before:',
    before.slice(before.indexOf('Who has paid you back') > 0 ? before.indexOf('Who has paid you back') : 0, 700),
  );
  console.log('Write off buttons:', await page.getByRole('button', { name: 'Write off' }).count());
  await shot(page, 'R3-WO-step-1-split-before');
  await page.getByRole('button', { name: 'Write off' }).dblclick();
  await page.waitForTimeout(900);
  console.log('toasts after dbl:', JSON.stringify(await toasts(page)));
  const after = await L(page, 90);
  console.log(
    'SPLIT after:',
    after.slice(after.indexOf('Who has paid you back') > 0 ? after.indexOf('Who has paid you back') : 0, 800),
  );
  console.log('Write off buttons after:', await page.getByRole('button', { name: 'Write off' }).count());
  await shot(page, 'R3-WO-step-2-written-off');
  // untick a written-off share
  const boxes = page.getByRole('region', { name: 'Who has paid you back' }).getByRole('checkbox');
  console.log(
    'checkboxes',
    await boxes.count(),
    'disabled:',
    await Promise.all((await boxes.all()).map((b) => b.isDisabled())),
  );
  await boxes
    .last()
    .click({ timeout: 3000 })
    .catch(() => console.log('click failed'));
  await page.waitForTimeout(600);
  console.log('toast after untick written-off:', JSON.stringify(await toasts(page)));
  // Undo
  await page.waitForTimeout(600);
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('link', { name: /^Home/ })
    .click()
    .catch(() => {});
  await page.waitForTimeout(700);
  console.log('HOME after write-off:', await spent(page));
  await page.goBack().catch(() => {});
  await page.waitForTimeout(500);
});
test('write off: Undo restores, shared list wording, spending', async ({ page }) => {
  await open(page, '/s/shared');
  await page.getByRole('button', { name: /^BBQ PLACE/ }).click();
  await page.waitForTimeout(600);
  const money = async () => (await L(page, 90)).match(/Your spending[^|]*\|[^|]*\|?[^|]*/)?.[0] ?? 'no spending row';
  console.log('spending row before:', await money());
  await page.getByRole('button', { name: 'Write off' }).click();
  await page.waitForTimeout(800);
  console.log('spending row after:', await money(), '| Written off row:', /Written off/.test(await text(page)));
  await page.locator('[data-sonner-toast]').first().getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(800);
  console.log(
    'after Undo spending row:',
    await money(),
    '| Write off back:',
    await page.getByRole('button', { name: 'Write off' }).count(),
    '| Written off row:',
    /Written off/.test(await text(page)),
  );
  await page.getByRole('button', { name: 'Write off' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Back' }).click();
  await page.waitForTimeout(700);
  console.log('SHARED after write-off:', (await L(page, 14)).slice(0, 300));
  await shot(page, 'R3-WO-step-3-shared-list');
});
test('write off not offered: still changing, not payer, nothing owed', async ({ page }) => {
  await page.goto('/');
  const ids = await db<{ nk: string; hd: string }>(
    page,
    `(d) => ({ nk: d.splits.find(s=>!s.lockedAt && s.paidBy==='me').id, hd: d.splits.find(s=>s.paidBy==='other').id })`,
  );
  await open(page, `/s/split?id=${ids.nk}`);
  console.log('NK (still changing) Write off:', await page.getByRole('button', { name: 'Write off' }).count());
  await open(page, `/s/split?id=${ids.hd}`);
  console.log('HAIDILAO (Mei paid) Write off:', await page.getByRole('button', { name: 'Write off' }).count());
  // command level
  const res = await page.evaluate(async (i) => {
    const mod: any = await import(/* @vite-ignore */ '/src/data/index.ts');
    const db = (await mod.backend()).db();
    const area: any = await import(/* @vite-ignore */ '/src/data/fake/areas/index.ts');
    const ctx = { offline: false, later() {} };
    const out: any = {};
    for (const [k, id] of [
      ['not payer', i.hd],
      ['still changing', i.nk],
    ]) {
      try {
        area.applyArea(db, { type: 'split.write-off', splitId: id }, ctx);
        out[k as string] = 'ACCEPTED';
      } catch (e) {
        out[k as string] = String(e).slice(0, 60);
      }
    }
    const bbq = db.splits.find((s: any) => s.lockedAt && s.paidBy === 'me');
    try {
      area.applyArea(db, { type: 'split.write-off', splitId: bbq.id }, ctx);
      out.first = 'ok';
      area.applyArea(db, { type: 'split.write-off', splitId: bbq.id }, ctx);
      out.second = 'ACCEPTED';
    } catch (e) {
      out.second = String(e).slice(0, 60);
    }
    try {
      area.applyArea(db, { type: 'split.write-off', splitId: 'nope' }, ctx);
      out.unknown = 'ACCEPTED';
    } catch (e) {
      out.unknown = String(e).slice(0, 60);
    }
    return out;
  }, ids);
  console.log(JSON.stringify(res));
});
