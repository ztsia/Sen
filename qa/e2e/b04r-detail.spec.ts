import { expect, test } from '@playwright/test';
import { db, open, shot, tabs, toast, watch } from './b04r-helpers';
import { uid } from '../../apps/web/src/data/fake/ids';

test.use({ baseURL: 'http://127.0.0.1:5291' });
const ROTI = uid('txn:roti-bakar');
const TX = (id: string) =>
  `(db)=>{const t=db.txns.find(t=>t.id==="${id}");return JSON.stringify({cat:t.categoryId,del:t.deletedAt,amt:t.amount,note:t.note,status:t.status})}`;

test('FLOW-6 txn: header, facts, actions; category; delete with Undo', async ({ page }) => {
  const w = watch(page);
  await open(page, '/s/payments');
  await page
    .getByRole('button', { name: /Roti Bakar 88/ })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(ROTI));
  await expect(page.getByText('Roti Bakar 88').first()).toBeVisible();
  await expect(page.getByText("From Ryt Bank's notification")).toBeVisible();
  for (const n of ['Scan receipt', 'Split', 'Ask Sen', 'More'])
    await expect(page.getByRole('button', { name: n, exact: true })).toBeVisible();
  // the action bar's buttons are round with a caption beneath (button height small, caption visible)
  const barBtn = await page.getByRole('button', { name: 'Split', exact: true }).evaluate((b) => {
    const r = b.getBoundingClientRect();
    return { w: r.width, h: r.height, text: b.textContent };
  });
  console.log('action bar button', JSON.stringify(barBtn));
  await shot(page, 'FLOW-6-step-1-txn');
  // category chip -> sheet
  await page.getByRole('button', { name: 'Choose one' }).click();
  const sheet = page.getByRole('dialog', { name: /which category/ });
  await expect(sheet).toBeVisible();
  await shot(page, 'FLOW-6-step-2-category-sheet');
  await sheet.getByRole('button', { name: /Meals/ }).first().click();
  const s1 = JSON.parse(await db<string>(page, TX(ROTI)));
  expect(s1.cat).not.toBeNull();
  await expect(toast(page)).toBeVisible();
  await shot(page, 'FLOW-6-step-3-categorised');
  // delete from the menu
  await page.getByRole('button', { name: 'More', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await page.waitForTimeout(500);
  await shot(page, 'FLOW-6-step-4-menu');
  const items = await menu.getByRole('menuitem').allInnerTexts();
  console.log('menu', items.join('|'));
  await menu.getByRole('menuitem', { name: 'Delete' }).click();
  await page.waitForTimeout(500);
  const s2 = JSON.parse(await db<string>(page, TX(ROTI)));
  console.log('after delete', JSON.stringify(s2));
  expect(s2.del).not.toBeNull();
  await expect(toast(page)).toContainText(/Delet|Removed|gone/i);
  await shot(page, 'FLOW-6-step-5-deleted-toast');
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(400);
  const s3 = JSON.parse(await db<string>(page, TX(ROTI)));
  expect(s3.del).toBeNull();
  expect(s3.amt).toBe(950);
  await shot(page, 'FLOW-6-step-6-undone');
  expect(w.errors).toEqual([]);
});

test('FLOW-6s txn: unknown id and double tap on Delete', async ({ page }) => {
  await open(page, `/s/txn?id=00000000-0000-4000-8000-000000000000`);
  await expect(page.getByText('Not here any more')).toBeVisible();
  await shot(page, 'FLOW-6-step-7-gone');
  await open(page, '/s/payments');
  await page
    .getByRole('button', { name: /Roti Bakar 88/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  const item = page.getByRole('menuitem', { name: 'Delete' });
  const b = (await item.boundingBox())!;
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(800);
  const n = await db<number>(
    page,
    `(db)=>db.changes.filter(c=>c.txnId==="${ROTI}"&&/delet/i.test(c.what??"")).length`,
  ).catch(() => -1);
  console.log('delete changes', n);
});

test('FLOW-7 more hub: states derived from data', async ({ page }) => {
  await open(page, '/more');
  const pay = page.getByRole('link', { name: /^Payments/ });
  await expect(page.getByRole('link', { name: /^Payments\s*[\d,]+/ })).toBeVisible();
  const before = await pay.innerText();
  console.log('payments row', before.replace(/\n/g, ' '));
  await shot(page, 'FLOW-7-step-1-more');
  const n0 = Number(/([\d,]+)/.exec(before.replace('Payments', ''))![1]!.replace(/,/g, ''));
  // add a manual payment
  await page.getByRole('link', { name: /^Settings/ }).waitFor();
  await page
    .getByRole('button', { name: 'Dev panel' })
    .waitFor()
    .catch(() => {});
  await tabs(page).getByRole('link', { name: 'Review' }).click();
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByLabel('Amount').fill('12.50');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(700);
  await shot(page, 'FLOW-7-step-2-saved');
  const row = await db<string>(
    page,
    '(db)=>JSON.stringify(db.txns.filter(t=>t.source==="manual").map(t=>[t.amount,t.kind,t.direction]))',
  );
  console.log('manual txns', row);
  expect(row).toContain('[1250,');
  await tabs(page).getByRole('link', { name: 'More' }).click();
  await expect(page.getByRole('link', { name: /^Payments\s*[\d,]+/ })).toBeVisible();
  const after = await page.getByRole('link', { name: /^Payments/ }).innerText();
  const n1 = Number(/([\d,]+)/.exec(after.replace('Payments', ''))![1]!.replace(/,/g, ''));
  console.log('payments', n0, '->', n1);
  expect(n1).toBe(n0 + 1);
  await shot(page, 'FLOW-7-step-3-count-up');
});

test('FLOW-8 manual: money inputs', async ({ page }) => {
  await open(page, '/s/manual');
  const amount = page.getByLabel('Amount');
  const seen: Record<string, string> = {};
  for (const v of ['12.345', 'abc', '', '-5', '0', '99999999999999999999', '1e3', '0.1', '1,284.50', '12.5.5']) {
    await amount.fill(v);
    await page.getByRole('radio', { name: 'Meals' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(250);
    const msg = (
      await page.locator('[role=alert], [id$="-error"], .text-destructive, [data-slot=field-error]').allInnerTexts()
    ).join(' / ');
    const n = await db<number>(page, '(db)=>db.txns.filter(t=>t.source==="manual").length');
    seen[v || '(empty)'] = `msg="${msg.slice(0, 80)}" manualTxns=${n}`;
    if (v === '12.345') await shot(page, 'FLOW-8-step-2-bad-three-decimals');
    if (v === '0.1') {
      await shot(page, 'FLOW-8-step-5-point-one');
      const last = await db<string>(
        page,
        '(db)=>JSON.stringify(db.txns.filter(t=>t.source==="manual").map(t=>t.amount))',
      );
      seen['0.1 stored'] = last;
      await open(page, '/s/manual');
    }
    if (v === '1,284.50') {
      const last = await db<string>(
        page,
        '(db)=>JSON.stringify(db.txns.filter(t=>t.source==="manual").map(t=>t.amount))',
      );
      seen['1,284.50 stored'] = last;
      await open(page, '/s/manual');
    }
  }
  console.log(JSON.stringify(seen, null, 1));
  const all = await db<string>(page, '(db)=>JSON.stringify(db.txns.filter(t=>t.source==="manual").map(t=>t.amount))');
  console.log('stored amounts', all);
});

test('FLOW-14 balance check: exact difference and save', async ({ page }) => {
  await open(page, '/s/balance-check');
  const ryt = page.getByRole('group', { name: 'Ryt Bank' });
  await ryt.getByLabel('What the bank app shows').fill('14650.97');
  await expect(ryt.getByText(/RM0\.10.*more than Sen has/)).toBeVisible();
  await ryt.getByLabel('What the bank app shows').fill('14650.77');
  await expect(ryt.getByText(/RM0\.10.*less than Sen has/)).toBeVisible();
  await shot(page, 'FLOW-14-step-2-difference');
  await ryt.getByLabel('What the bank app shows').fill('14650.87');
  await expect(ryt.getByText('No difference')).toBeVisible();
  const pb = page.getByRole('group', { name: 'Public Bank' });
  await pb.getByRole('button', { name: /matches/ }).click();
  await expect(pb.getByLabel('What the bank app shows')).toHaveValue('7,340.00');
  await ryt.getByLabel('What the bank app shows').fill('14650.97');
  await shot(page, 'FLOW-14-step-3-matches');
  const before = await db<number>(page, '(db)=>db.checks.length');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(700);
  const after = await db<string>(
    page,
    '(db)=>JSON.stringify({n:db.checks.length,adj:db.txns.filter(t=>t.kind==="adjustment").map(t=>[t.amount,t.direction])})',
  );
  console.log('checks', before, after);
  await shot(page, 'FLOW-14-step-4-saved');
  expect(JSON.parse(after).adj.some((a: [number, string]) => a[0] === 10 && a[1] === 'in')).toBe(true);
});

test('FLOW-14s balance check: empty and float-hostile input', async ({ page }) => {
  await open(page, '/s/balance-check');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/Type what a bank app shows/)).toBeVisible();
  const g = page.getByRole('group', { name: 'TNG eWallet' });
  await g.getByLabel('What the bank app shows').fill('262.30');
  await expect(g.getByText('No difference')).toBeVisible();
  await g.getByLabel('What the bank app shows').fill('262.3');
  await expect(g.getByText('No difference')).toBeVisible();
  await g.getByLabel('What the bank app shows').fill('0.1');
  await expect(g.getByText(/RM262\.20.*less than Sen has/)).toBeVisible();
  await g.getByLabel('What the bank app shows').fill('1e3');
  await page.getByRole('button', { name: 'Save' }).click();
  await shot(page, 'FLOW-14-step-5-hostile');
  console.log('1e3 error:', (await g.innerText()).replace(/\n/g, ' / '));
});
