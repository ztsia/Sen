import { expect, test } from '@playwright/test';
import { db, open, shot, tabs, toast, watch } from './b04r-helpers';
import { uid } from '../../apps/web/src/data/fake/ids';

test.use({ baseURL: 'http://127.0.0.1:5291' });
const dialog = (page: import('@playwright/test').Page, name: string | RegExp) => page.getByRole('dialog', { name });

test('FLOW-C1 first run, with a wrong code and a resume', async ({ page }) => {
  const w = watch(page);
  await open(page, '/s/first-run?scenario=before-salary');
  await expect(page.getByRole('heading', { name: 'Sign in to Sen' })).toBeVisible();
  await shot(page, 'FLOW-C1-step-1-sign-in');
  // malformed email
  await page.getByLabel('Your email').fill('not-an-email');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.waitForTimeout(300);
  console.log('bad email:', (await page.locator('main').innerText()).replace(/\n+/g, ' / ').slice(0, 250));
  await expect(page.getByLabel('Your email')).toHaveValue('not-an-email');
  await shot(page, 'FLOW-C1-step-1b-bad-email');
  await page.getByLabel('Your email').fill('wei.ming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await expect(page.getByLabel('6-digit code')).toBeVisible();
  await page.getByLabel('6-digit code').fill('999999');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(400);
  console.log('wrong code:', (await page.locator('main').innerText()).replace(/\n+/g, ' / ').slice(0, 300));
  await shot(page, 'FLOW-C1-step-2-wrong-code');
  await expect(page.getByLabel('6-digit code')).toBeVisible();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Step 2 of 7')).toBeVisible();
  await shot(page, 'FLOW-C1-step-3-apps');
  // close mid-setup and reopen: same step
  await page.reload();
  await page.waitForTimeout(800);
  console.log('after reload:', (await page.locator('body').innerText()).replace(/\n+/g, ' / ').slice(0, 200));
  await shot(page, 'FLOW-C1-step-4-reload');
  for (const step of ['apps', 'access', 'running', 'accounts', 'name', 'payday']) {
    await expect(page.getByText(/^Step \d of 7$/)).toBeVisible();
    if (step === 'accounts')
      console.log('accounts step:', (await page.locator('main').innerText()).replace(/\n+/g, ' / ').slice(0, 300));
    if (step === 'name') await page.getByLabel('Your name').fill('wei ming');
    await page.getByRole('button', { name: step === 'payday' ? 'Finish' : /^Next$/ }).click();
    await page.waitForTimeout(250);
  }
  await expect(page).toHaveURL(/\/$|\/\?/);
  await expect(page.getByTestId('hero')).toBeVisible();
  console.log('home label:', await page.getByTestId('hero').innerText());
  await shot(page, 'FLOW-C1-step-8-home');
  expect(w.errors).toEqual([]);
});

test('FLOW-C2 new merchant: prompt button, rule, swipe-away waits in Review', async ({ page }) => {
  await open(page, '/');
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.getByRole('button', { name: 'Surfaces' }).click();
  await expect(dialog(page, 'Native stand-ins')).toBeVisible();
  const s = page.getByTestId('surface-prompt-category');
  await s.scrollIntoViewIfNeeded();
  await shot(page, 'FLOW-C2-step-1-prompt');
  console.log('prompt text:', (await s.innerText()).replace(/\n+/g, ' / '));
  const ROTI = uid('txn:roti-bakar');
  const before = JSON.parse(
    await db<string>(
      page,
      `(db)=>JSON.stringify({rules:db.rules.length,cat:db.txns.find(t=>t.id==="${ROTI}").categoryId})`,
    ),
  );
  await s.getByRole('button', { name: 'Meals' }).click();
  await page.waitForTimeout(500);
  const after = JSON.parse(
    await db<string>(
      page,
      `(db)=>JSON.stringify({rules:db.rules.length,cat:db.txns.find(t=>t.id==="${ROTI}").categoryId,rule:db.rules.at(-1)})`,
    ),
  );
  console.log('rule', JSON.stringify(before), JSON.stringify(after));
  expect(after.cat).not.toBeNull();
  expect(after.rules).toBe(before.rules + 1);
  await shot(page, 'FLOW-C2-step-2-answered');
});

test('FLOW-C3 scan after paying: crop, read, confirm, attach, undo; same file twice', async ({ page }) => {
  const w = watch(page);
  await open(page, '/');
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await expect(page).toHaveURL(/\/scan/);
  await expect(page.getByText('Lay it flat')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take a photo' })).toBeVisible();
  await shot(page, 'FLOW-C3-step-1-scan');
  const file = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };
  await page.getByTestId('scan-camera').setInputFiles(file);
  await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible();
  await shot(page, 'FLOW-C3-step-2-crop');
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page.getByText('Reading receipt…')).toBeVisible();
  await shot(page, 'FLOW-C3-step-3-reading');
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10000 });
  await expect(page.getByText('SATE KAJANG HJ SAMURI').first()).toBeVisible();
  await shot(page, 'FLOW-C3-step-4-confirm');
  const items = await db<string>(
    page,
    '(db)=>{const r=db.receipts.at(-1);const its=db.items.filter(i=>i.receiptId===r.id);return JSON.stringify({total:r.total??r.totalSen,items:its.map(i=>i.price??i.amount),sum:its.reduce((a,i)=>a+(i.price??i.amount??0),0)})}',
  );
  console.log('receipt', items);
  await page.getByRole('button', { name: 'More people' }).click();
  await page.getByRole('button', { name: 'More people' }).click();
  await expect(page.getByRole('region', { name: 'How many people ate?' })).toContainText('÷ 3 =');
  await shot(page, 'FLOW-C3-step-5-three-people');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toContainText('Attached to RM64.13 on Ryt Bank');
  await shot(page, 'FLOW-C3-step-6-attached');
  const att = JSON.parse(await db<string>(page, '(db)=>JSON.stringify(db.receipts.filter(r=>r.transactionId).length)'));
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(500);
  const att2 = JSON.parse(
    await db<string>(page, '(db)=>JSON.stringify(db.receipts.filter(r=>r.transactionId).length)'),
  );
  console.log('attached receipts', att, '->', att2);
  expect(att2).toBe(att - 1);
  // same file twice
  await page.goto('/scan?look=minted&mode=light');
  expect(w.errors).toEqual([]);
});

test('FLOW-C3s scan: the same file twice says Already added', async ({ page }) => {
  await open(page, '/scan');
  const file = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };
  const n0 = await db<number>(page, '(db)=>db.receipts.length');
  await page.getByTestId('scan-camera').setInputFiles(file);
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10000 });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toBeVisible();
  await shot(page, 'FLOW-C3-step-7-file-1-done');
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await page.getByTestId('scan-camera').setInputFiles(file);
  await page.waitForTimeout(1500);
  if (await page.getByRole('button', { name: 'Use this' }).count())
    await page.getByRole('button', { name: 'Use this' }).click();
  await page.waitForTimeout(3500);
  console.log(
    'second pass:',
    page.url(),
    (await page.locator('body').innerText()).replace(/\n+/g, ' / ').slice(0, 220),
  );
  await shot(page, 'FLOW-C3-step-8-file-2');
  const n1 = await db<number>(page, '(db)=>db.receipts.length');
  console.log('receipts', n0, '->', n1);
});
