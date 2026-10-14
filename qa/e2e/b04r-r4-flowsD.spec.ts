import { expect, test } from '@playwright/test';
import { db, open, settled, tabs, toast, watch } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 flows D: the core journeys (D124) on the code after D132 and the Scan tab change. Dev server (5291).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

const money = (s: string) => {
  const m = /RM\s?([\d,]+)\.(\d{2})/.exec(s);
  return m ? Number(m[1]!.replace(/,/g, '')) * 100 + Number(m[2]) : NaN;
};
const SCAN = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };

test('R4-FLOW-C1 first-run (core): wrong codes, apps, amounts typed from the right, name, Home', async ({ page }) => {
  const w = watch(page);
  const F = 'R4-FLOW-C1';
  let n = 0;
  await open(page, '/s/first-run');
  const noTabs = () => expect(tabs(page)).toHaveCount(0);
  await page.getByRole('textbox').first().fill('weiming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  const code = page.getByLabel('6-digit code');
  const msg = async (c: string) => {
    await code.fill(c);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(350);
    return (await page.locator('main, body').first().innerText()).replace(/\n+/g, ' | ');
  };
  const t1 = await msg('111111');
  const t2 = await msg('12345');
  const t3 = await msg('000000');
  n++;
  await step(
    page,
    F,
    n,
    'wrong-codes',
    'wrong, short and expired code',
    'three different messages in words; Step 1 of 7; Send a new code; no tab bar',
    async () => {
      expect(t1).toMatch(/not the right code/);
      expect(t2).toMatch(/The code is 6 digits/);
      expect(t3).toMatch(/expired/);
      await expect(page.getByRole('button', { name: 'Send a new code' })).toBeVisible();
      await expect(page.locator('body')).toContainText('Step 1 of 7');
      await noTabs();
    },
  );
  await code.fill('123456');
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toContainText('Step 2 of 7');
  await page.getByRole('button', { name: 'Choose these 4' }).click();
  n++;
  await step(
    page,
    F,
    n,
    'apps',
    'Choose the four suggested apps',
    'banks on; messaging apps off and disabled',
    async () => {
      await expect(page.getByRole('switch', { name: 'Ryt Bank' })).toBeChecked();
      for (const blocked of ['WhatsApp', 'Gmail', 'Instagram', 'Messages']) {
        const sw = page.getByRole('switch', { name: blocked });
        await expect(sw).toBeDisabled();
        await expect(sw).not.toBeChecked();
      }
      await noTabs();
    },
  );
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.locator('body')).toContainText('Step 5 of 7');
  const boxes = page.getByRole('textbox');
  await expect(boxes.first()).toBeVisible();
  await boxes.nth(0).click();
  await page.keyboard.type('128450');
  await boxes.nth(1).click();
  await page.keyboard.type('30000');
  const vals = [await boxes.nth(0).inputValue(), await boxes.nth(1).inputValue()];
  n++;
  await step(
    page,
    F,
    n,
    'balances',
    'type 128450 and 30000 into the first two balances',
    'they read 1,284.50 and 300.00',
    async () => {
      expect(vals).toEqual(['1,284.50', '300.00']);
      await expect(page.locator('body')).toContainText('Step 5 of 7');
    },
  );
  // an empty balance field: Next
  await boxes.nth(1).click();
  for (let i = 0; i < 8; i++) await page.keyboard.press('Backspace');
  await page.getByRole('button', { name: 'Next' }).click();
  const afterEmpty = (await page.locator('body').innerText()).replace(/\n+/g, ' | ');
  note(F, `Next with a balance left empty -> ${afterEmpty.slice(0, 200)}`);
  await expect(page.locator('body')).toContainText('Step 6 of 7');
  await page.getByRole('button', { name: 'Next' }).click();
  n++;
  await step(page, F, n, 'name', 'Next with no name', 'asks for the name in words and stays on step 6', async () => {
    await expect(page.locator('body')).toContainText('Step 6 of 7');
    await expect(page.locator('body')).toContainText('Type your name as your bank prints it');
  });
  await page.getByRole('textbox').first().fill('TAN WEI MING');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('body')).toContainText('Step 7 of 7');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByTestId('hero')).toBeVisible();
  n++;
  await step(page, F, n, 'home', 'Finish', 'Home, with the tab bar back', async () => {
    await expect(tabs(page)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
  expect(w.errors).toEqual([]);
});

test('R4-FLOW-C2 pay-new (core): an answer files the payment and makes one rule; a second from the same merchant needs none', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R4-FLOW-C2';
  let n = 0;
  await open(page, '/review');
  await settled(page);
  const row = page.locator('[data-review="new-merchant"]').filter({ hasText: /ROTI BAKAR 88/i });
  const rules0 = await db<number>(page, '(db) => db.rules.length');
  await expect(row).toBeVisible();
  n++;
  await step(page, F, n, 'prompt', 'Review shows the new merchant', 'RM9.50 with two guesses and Other…', async () => {
    await expect(row).toContainText('RM9.50');
    await expect(row.getByRole('button')).toHaveCount(3);
  });
  await row.getByRole('button', { name: 'Meals' }).click();
  await expect(toast(page)).toContainText(/Roti Bakar 88 is Meals from now on/i);
  n++;
  await step(page, F, n, 'answered', 'Tap Meals', 'the card is gone; one new rule; toast with Undo', async () => {
    await expect(row).toHaveCount(0);
    expect(await db<number>(page, '(db) => db.rules.length')).toBe(rules0 + 1);
    await expect(toast(page)).toContainText('Undo');
  });
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /^Categories and rules/ }).click();
  await page.getByRole('radio', { name: 'Rules' }).click();
  n++;
  await step(
    page,
    F,
    n,
    'rule',
    'Settings -> Categories -> Rules',
    'a sentence card names Roti Bakar 88 and Meals with its origin',
    async () => {
      await expect(page.locator('main')).toContainText(/Roti Bakar 88.*Meals/i);
      await expect(page.locator('main')).toContainText(/from your answer/i);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R4-FLOW-C3 scan-after (core): the Scan tab opens the camera, then crop, confirm, Done, Undo; the same file twice', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R4-FLOW-C3';
  let n = 0;
  await open(page, '/');
  await settled(page);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }),
    tabs(page).getByRole('button', { name: 'Scan a receipt' }).click(),
  ]);
  n++;
  await step(page, F, n, 'camera', 'tap the Scan tab', 'the camera chooser opens at once; Home stays', async () => {
    expect(await chooser.element().getAttribute('capture')).toBe('environment');
    await expect(page).toHaveURL(/\/($|\?)/);
  });
  await chooser.setFiles(SCAN);
  await expect(page).toHaveURL(/\/s\/crop/, { timeout: 10_000 });
  n++;
  await step(page, F, n, 'crop', 'choose a photo', 'crop opens with the photo; no tab bar', async () => {
    await expect(tabs(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible();
  });
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  const itemTexts = await page.getByRole('region', { name: 'Items' }).getByRole('button').allInnerTexts();
  const prices = itemTexts.map((t) => money(t.replace(/\n/g, ' ')));
  const total = money(await page.locator('main dd').last().innerText());
  note(F, `item prices ${JSON.stringify(prices)} total ${total}`);
  n++;
  await step(page, F, n, 'confirm', 'Use this', 'items add to the total to the sen (6413)', async () => {
    expect(prices.reduce((a, b) => a + b, 0)).toBe(total);
    expect(total).toBe(6413);
    await expect(page.getByRole('status').filter({ hasText: 'Items add up to the total' })).toBeVisible();
  });
  await page.getByRole('button', { name: 'More people' }).click();
  await page.waitForTimeout(550);
  await page.getByRole('button', { name: 'More people' }).click();
  n++;
  await step(page, F, n, 'people', 'tap + twice', 'RM21.38 a person (÷ 3)', async () => {
    const region = page.getByRole('region', { name: 'How many people ate?' });
    await expect(region).toContainText('RM21.38');
    await expect(region).toContainText('÷ 3');
  });
  const before = await db<number>(page, '(db) => db.receipts.filter(r => r.transactionId).length');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toContainText('Attached to RM64.13 on Ryt Bank');
  const after = await db<number>(page, '(db) => db.receipts.filter(r => r.transactionId).length');
  n++;
  await step(
    page,
    F,
    n,
    'attached',
    'Done',
    'toast "Attached to RM64.13 on Ryt Bank" with Undo; one more attached',
    async () => {
      expect(after).toBe(before + 1);
      await expect(toast(page)).toContainText('Undo');
    },
  );
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(600);
  n++;
  await step(page, F, n, 'undone', 'Undo', 'detached again', async () => {
    expect(await db<number>(page, '(db) => db.receipts.filter(r => r.transactionId).length')).toBe(before);
  });
  // the same file twice
  const receipts = await db<number>(page, '(db) => db.receipts.length');
  await tabs(page)
    .getByRole('button', { name: 'Scan a receipt' })
    .isVisible()
    .catch(() => false);
  expect(w.errors).toEqual([]);
  note(F, `receipts after first scan: ${receipts}`);
});

test('R4-FLOW-C3b scan-after, sad: the same file twice is refused; an empty file and a text file say so', async ({
  page,
}) => {
  const F = 'R4-FLOW-C3b';
  await open(page, '/');
  await settled(page);
  const pick = async (file: { name: string; mimeType: string; buffer: Buffer }) => {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }),
      tabs(page).getByRole('button', { name: 'Scan a receipt' }).click(),
    ]);
    await chooser.setFiles(file);
    await page.waitForTimeout(1500);
  };
  await pick(SCAN);
  await expect(page).toHaveURL(/\/s\/crop/);
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(800);
  const receipts = await db<number>(page, '(db) => db.receipts.length');
  await pick(SCAN);
  const t = (await page.locator('body').innerText()).replace(/\n+/g, ' | ');
  const toastText = await toast(page)
    .innerText()
    .catch(() => '');
  const receipts2 = await db<number>(page, '(db) => db.receipts.length');
  note(
    F,
    `same file twice: receipts ${receipts} -> ${receipts2}; url ${page.url()}; toast ${JSON.stringify(toastText)}`,
  );
  await step(page, F, 1, 'same-twice', 'choose the same file again', '"Already added" and no new receipt', async () => {
    expect(receipts2).toBe(receipts);
    expect(t + toastText).toMatch(/Already added/);
  });
  await open(page, '/');
  await pick({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  const t2 = await toast(page)
    .innerText()
    .catch(() => '');
  await step(
    page,
    F,
    2,
    'text-file',
    'choose a text file',
    'says it is not a photo or a PDF; stays on Home',
    async () => {
      expect(t2).toMatch(/isn't a photo or a PDF/);
      await expect(page).toHaveURL(/\/($|\?)/);
    },
  );
  await pick({ name: 'empty.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(0) });
  const t3 = await toast(page)
    .innerText()
    .catch(() => '');
  note(F, `empty jpg toast: ${JSON.stringify(t3)}`);
  await step(page, F, 3, 'empty-file', 'choose a 0-byte jpg', 'says so in words; stays on Home', async () => {
    expect(t3.length).toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/($|\?)/);
  });
});
