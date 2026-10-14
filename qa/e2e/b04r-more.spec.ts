import { expect, test } from '@playwright/test';
import { db, open, shot, toast, watch } from './b04r-helpers';
import { uid } from '../../apps/web/src/data/fake/ids';

test.use({ baseURL: 'http://127.0.0.1:5291' });

test('FLOW-9 split: payer view, share sheet, tick, lock rule', async ({ page }) => {
  const w = watch(page);
  await open(page, '/s/shared');
  await expect(page.getByRole('radio', { name: /Open · 3/ })).toBeVisible();
  await shot(page, 'FLOW-9-step-0-shared');
  await page.getByRole('button', { name: /Nasi Kandar Abc/ }).click();
  await expect(page.getByText('Still changing', { exact: true })).toBeVisible();
  await expect(page.getByText("Who's done")).toBeVisible();
  await shot(page, 'FLOW-9-step-1-split');
  // QR lives in the Share sheet, not on the page
  await expect(page.locator('main').getByText(/Stand-in .*QR|scan/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(400);
  await shot(page, 'FLOW-9-step-2-share-sheet');
  console.log('share sheet:', (await sheet.innerText()).replace(/\n+/g, ' / ').slice(0, 300));
  await page.keyboard.press('Escape');
  // payer assigns the orphan item to Everyone: lock waits for the others to be done
  await page.getByRole('button', { name: 'Everyone', exact: true }).click();
  await page.waitForTimeout(500);
  await shot(page, 'FLOW-9-step-3-everyone');
  const split = await db<string>(page, `(db)=>JSON.stringify(db.splits.find(s=>s.id==="${uid('split:nk')}"))`);
  console.log('nk split', split.slice(0, 400));
  const txt = await page.locator('main').innerText();
  console.log('after Everyone:', txt.replace(/\n+/g, ' / ').slice(0, 700));
  expect(w.errors).toEqual([]);
});

test('FLOW-9 split: shares sum and largest remainder on the public page', async ({ page }) => {
  await open(page, '/s/split-public?id=demo-final');
  await expect(page.getByText('RM22.14').first()).toBeVisible();
  const txt = await page.locator('body').innerText();
  expect(txt).toContain('your part RM6.99');
  expect(txt).toContain('your part RM2.67');
  await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
  await shot(page, 'FLOW-9-step-5-public-final');
  await open(page, '/s/split-public?id=demo-new');
  await page.getByRole('textbox').fill('Mei');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(/Hi Mei/)).toBeVisible();
  await shot(page, 'FLOW-9-step-4-public-name');
  const boxes = page.getByRole('checkbox');
  const n = await boxes.count();
  // tick the orphan item (kuey teow) and see "so far"
  await page.getByRole('checkbox', { name: /Kuey teow/ }).click();
  await page.waitForTimeout(600);
  await expect(page.getByRole('checkbox', { name: /Kuey teow/ })).toBeChecked();
  console.log('public after tick:', (await page.locator('body').innerText()).replace(/\n+/g, ' / ').slice(0, 900));
  console.log('checkbox count', n);
  await shot(page, 'FLOW-9-step-6-public-ticked');
  await expect(page.getByRole('button', { name: /ticked everything/ })).toBeVisible();
  await page.getByRole('button', { name: /ticked everything/ }).click();
  await expect(page.getByText('Final', { exact: true })).toBeVisible();
  await expect(page.getByText('Pay RM12.48')).toBeVisible();
  await shot(page, 'FLOW-9-step-7-final');
});

test('FLOW-9s split-public: done with nothing ticked', async ({ page }) => {
  await open(page, '/s/split-public?id=demo-new');
  await page.getByRole('textbox').fill('Mei');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /ticked everything/ }).click();
  await page.waitForTimeout(600);
  await shot(page, 'FLOW-9-step-8-done-nothing');
  console.log('done with nothing:', (await page.locator('body').innerText()).replace(/\n+/g, ' / ').slice(0, 500));
});

test('FLOW-10 claims: structure and Send to ESS', async ({ page }) => {
  await open(page, '/s/claims');
  await expect(page.getByText(/2 to submit · RM152\.00/)).toBeVisible();
  const bar = page.getByRole('progressbar').first();
  await expect(bar).toBeVisible();
  const vals = await page
    .getByRole('progressbar')
    .evaluateAll((bs) =>
      bs.map((b) => [b.getAttribute('aria-valuenow'), b.getAttribute('aria-valuemax'), b.getAttribute('aria-label')]),
    );
  console.log('progress', JSON.stringify(vals));
  await shot(page, 'FLOW-10-step-1-claims');
  await page.getByRole('button', { name: /^Phone bill To submit/ }).click();
  await expect(page).toHaveURL(/\/s\/claim\?id=/);
  for (const s of ['Draft', 'Ready', 'Sent', 'Approved', 'Paid'])
    await expect(page.getByText(s, { exact: true }).first()).toBeVisible();
  await shot(page, 'FLOW-10-step-3-claim');
  await page.getByRole('button', { name: 'Send to ESS' }).click();
  await page.waitForTimeout(800);
  await shot(page, 'FLOW-10-step-4-sent');
  console.log('after send:', (await page.locator('main').innerText()).replace(/\n+/g, ' / ').slice(0, 400));
});

test('FLOW-10 claims: Review claim-due opens a claim', async ({ page }) => {
  await open(page, '/review');
  await page.getByRole('button', { name: /claim · RM/ }).click();
  await page.waitForTimeout(500);
  await shot(page, 'FLOW-10-step-6-review-claim-due');
  console.log(
    'claim-due lands on',
    page.url(),
    '|',
    (await page.locator('main').innerText()).replace(/\n+/g, ' / ').slice(0, 200),
  );
});

test('FLOW-10 settings/claims: ESS card, Forget password behind more', async ({ page }) => {
  await open(page, '/s/settings/claims');
  await shot(page, 'FLOW-10-step-5a-settings-claims');
  await page.getByRole('button', { name: 'More about ESS' }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await page.waitForTimeout(400);
  const items = await menu.getByRole('menuitem').allInnerTexts();
  console.log('ESS menu', items.join('|'));
  await shot(page, 'FLOW-10-step-5b-ess-menu');
});

test('FLOW-11 members: pushed screen, switch, back, remove', async ({ page }) => {
  const w = watch(page);
  await open(page, '/s/settings/members');
  await expect(page.getByText('2 of 20')).toBeVisible();
  await shot(page, 'FLOW-11-step-1-members');
  await page.getByRole('button', { name: /Hui Min/ }).click();
  await expect(page).toHaveURL(/settings\/member\?id=/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Loading')).toHaveCount(0);
  await expect(page.getByRole('switch', { name: /Claims/ })).toBeVisible();
  await shot(page, 'FLOW-11-step-2-member');
  const body = await page.locator('main').innerText();
  console.log('member screen text:', body.replace(/\n+/g, ' / ').slice(0, 900));
  const outside = body.replace(/AI credit[\s\S]*?Credit settings/, '');
  expect(outside, 'no RM amount outside the AI credit card').not.toMatch(/RM\s?\d/);
  expect(body).not.toMatch(/spent|spending|transaction|bank balance/i);
  const sw = page.getByRole('switch', { name: /Claims/ });
  const was = await sw.isChecked();
  await sw.click();
  await expect(sw).toBeChecked({ checked: !was });
  await shot(page, 'FLOW-11-step-3-switch');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/settings\/members/);
  await page.getByRole('button', { name: /Hui Min/ }).click();
  await expect(page.getByRole('switch', { name: /Claims/ })).toBeChecked({ checked: !was });
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await page.waitForTimeout(400);
  await shot(page, 'FLOW-11-step-5-remove-confirm');
  console.log('remove dialog:', (await page.getByRole('dialog').innerText()).replace(/\n+/g, ' / ').slice(0, 400));
  await page.getByRole('button', { name: 'Keep them' }).click();
  expect(w.errors).toEqual([]);
});

test('FLOW-12 categories and rules', async ({ page }) => {
  await open(page, '/s/settings/categories');
  await shot(page, 'FLOW-12-step-1-categories');
  await page.getByRole('button', { name: /^Meals, 2 rules/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(400);
  await shot(page, 'FLOW-12-step-2-sheet');
  await page.keyboard.press('Escape');
  await page.getByRole('radio', { name: 'Rules' }).click();
  await page.waitForTimeout(300);
  const t = await page.locator('main').innerText();
  console.log('rules:', t.replace(/\n+/g, ' / ').slice(0, 600));
  await shot(page, 'FLOW-12-step-3-rules');
  expect(t).toMatch(/When/);
});

test('FLOW-13 capture setup: messaging apps cannot be chosen', async ({ page }) => {
  await open(page, '/s/settings/capture');
  await shot(page, 'FLOW-13-step-1-capture');
  await page.getByRole('button', { name: /^Your apps/ }).click();
  await page.waitForTimeout(300);
  for (const n of ['Messages', 'WhatsApp', 'Gmail', 'Instagram'])
    await expect(page.getByRole('switch', { name: n })).toBeDisabled();
  await shot(page, 'FLOW-13-step-3-blocked');
  await page.getByRole('button', { name: 'Choose these 4' }).click();
  await expect(page.getByRole('switch', { name: 'Ryt Bank' })).toBeChecked();
  await page.goBack();
  await page.waitForTimeout(500);
  console.log('capture rows:', (await page.locator('main').innerText()).replace(/\n+/g, ' / ').slice(0, 300));
  await expect(page.getByRole('button', { name: /^Your apps\s+4/ })).toBeVisible();
  await shot(page, 'FLOW-13-step-4-state');
});

test('FLOW-15 budgets, subscriptions, goals, year: no NaN, warning in words', async ({ page }) => {
  for (const [p, shotName] of [
    ['/s/budgets', 'budgets'],
    ['/s/subscriptions', 'subs'],
    ['/s/goals', 'goals'],
    ['/s/insights/year', 'year'],
    ['/s/agent/usage', 'usage'],
  ] as const) {
    await open(page, p);
    const t = await page.locator('main').innerText();
    expect(t, p).not.toMatch(/NaN|Infinity|undefined|null/);
    await shot(page, `FLOW-15-${shotName}`);
  }
  await open(page, '/s/budgets');
  await expect(page.getByText('Over by RM20.30')).toBeVisible();
  await open(page, '/s/subscriptions');
  await page.getByRole('button', { name: '4 matched' }).first().click();
  await page.waitForTimeout(300);
  await shot(page, 'FLOW-15-subs-expanded');
});

test('FLOW-16 sen memory: Forget with Undo', async ({ page }) => {
  await open(page, '/s/agent/memory');
  const n0 = await db<number>(page, '(db)=>db.sen?.memory?.length ?? -1').catch(() => -1);
  const forget = page.getByRole('button', { name: /^Forget:/ });
  await expect(forget).toHaveCount(4);
  await forget.first().click();
  await page.waitForTimeout(400);
  await expect(page.getByRole('button', { name: /^Forget:/ })).toHaveCount(3);
  await shot(page, 'FLOW-16-step-2-forgotten');
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /^Forget:/ })).toHaveCount(4);
  await shot(page, 'FLOW-16-step-3-undone');
  void n0;
});
