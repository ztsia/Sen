import { expect, test, type Page } from '@playwright/test';
import { uid } from '../../apps/web/src/data/fake/ids';
import { db, open, settled, tabs, toast, watch } from './b04r-helpers';
import { note, step } from './b04r-r3-lib';

// Run 3 flows D: the core journeys (D124) and the payment detail. Dev server (5391 by default): db() reads the fake.
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

const money = (s: string) => {
  const m = /RM\s?([\d,]+)\.(\d{2})/.exec(s);
  return m ? Number(m[1]!.replace(/,/g, '')) * 100 + Number(m[2]) : NaN;
};
const SCAN = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };

test('R3-FLOW-C1 first-run (core): the wrong codes fail in words, the right one goes on, no tab bar until Home', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R3-FLOW-C1';
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
    'Type a wrong, a short and an expired code',
    'three different messages in words; still on step 1 of 7; "Send a new code" offered; no tab bar',
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
    'Ryt Bank, Grab, Touch n Go, MyPB on; WhatsApp, Gmail, Instagram, Messages stay off and disabled',
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
  await boxes.nth(0).fill('1,284.50');
  await boxes.nth(1).fill('12.345');
  await page.getByRole('button', { name: 'Next' }).click();
  n++;
  await step(
    page,
    F,
    n,
    'balances',
    'Type a balance, then a three-decimal one',
    'RM12.345 is refused in words; the step does not advance',
    async () => {
      await expect(page.locator('body')).toContainText('Step 5 of 7');
      await expect(page.locator('body')).toContainText('Two decimals at most');
    },
  );
  await boxes.nth(1).fill('300');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('body')).toContainText('Step 6 of 7');
  await page.getByRole('button', { name: 'Next' }).click(); // no name typed
  n++;
  await step(page, F, n, 'name', 'Next with no name', 'it asks for the name in words and stays on step 6', async () => {
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

test('R3-FLOW-C2 pay-new (core): an answer files the payment and makes one rule, shown in Settings; Undo removes both', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R3-FLOW-C2';
  let n = 0;
  await open(page, '/review');
  await settled(page);
  const row = page.locator('[data-review="new-merchant"]').filter({ hasText: /ROTI BAKAR 88/i });
  const rules0 = await db<number>(page, '(db) => db.rules.length');
  await expect(row).toBeVisible();
  n++;
  await step(
    page,
    F,
    n,
    'prompt',
    'Review shows the new merchant',
    'RM9.50 · Roti Bakar 88 with two guesses and Other…',
    async () => {
      await expect(row).toContainText('RM9.50');
      await expect(row.getByRole('button')).toHaveCount(3);
    },
  );
  await row.getByRole('button', { name: 'Meals' }).click();
  await expect(toast(page)).toContainText(/Roti Bakar 88 is Meals from now on/i);
  n++;
  await step(
    page,
    F,
    n,
    'answered',
    'Tap Meals',
    'the card is gone; one rule exists in the db; a toast says "from now on" with Undo',
    async () => {
      await expect(row).toHaveCount(0);
      expect(await db<number>(page, '(db) => db.rules.length')).toBe(rules0 + 1);
      const t = await db<string>(
        page,
        '(db) => JSON.stringify(db.txns.filter(t => /ROTI BAKAR/.test(t.merchantRaw ?? "")).map(t => [t.amount, t.status, !!t.categoryId]))',
      );
      note(F, `roti rows after answering: ${t}`);
      expect(JSON.parse(t)).toEqual([[950, 'done', true]]);
    },
  );
  // the rule is visible in Settings, live
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /^Categories and rules/ }).click();
  await page.getByRole('radio', { name: 'Rules' }).click();
  n++;
  await step(
    page,
    F,
    n,
    'rule-listed',
    'Settings -> Categories -> Rules',
    'a sentence card names Roti Bakar 88 and Meals, with where it came from',
    async () => {
      await expect(page.locator('main')).toContainText(/Roti Bakar 88.*Meals/i);
    },
  );
  // swipe-away variant: nothing answered leaves it waiting
  await open(page, '/review');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'waits',
    'Reload without answering',
    'it still waits in Review (nothing was dropped)',
    async () => {
      await expect(page.locator('[data-review="new-merchant"]').filter({ hasText: /ROTI BAKAR 88/i })).toBeVisible();
    },
  );
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-C3 scan-after (core): items add up, three people is RM21.38 each, Done attaches, Undo detaches, the same file twice is refused', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R3-FLOW-C3';
  let n = 0;
  await open(page, '/');
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await expect(page).toHaveURL(/\/scan/);
  await expect(tabs(page)).toHaveCount(0);
  n++;
  await step(
    page,
    F,
    n,
    'scan',
    'Tap the Scan tab',
    'the scanner screen (no tab bar): three tips, Take a photo, From gallery, Add by hand',
    async () => {
      await expect(page.getByRole('button', { name: 'Take a photo' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'From gallery' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add by hand' })).toBeVisible();
    },
  );
  await page.getByTestId('scan-camera').setInputFiles(SCAN);
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  await expect(tabs(page)).toHaveCount(0);
  const itemTexts = await page.getByRole('region', { name: 'Items' }).getByRole('button').allInnerTexts();
  const prices = itemTexts.map((t) => money(t.replace(/\n/g, ' ')));
  const total = money(await page.locator('main dd').last().innerText());
  const service = money(await page.locator('main dd').first().innerText());
  note(F, `item prices ${JSON.stringify(prices)} total ${total} service ${service}`);
  n++;
  await step(
    page,
    F,
    n,
    'confirm',
    'Take a (fake) photo and use it',
    'the five item prices add to the total to the sen; the screen says so; no tab bar',
    async () => {
      expect(prices.reduce((a, b) => a + b, 0)).toBe(total);
      expect(total).toBe(6413);
      await expect(page.getByRole('status').filter({ hasText: 'Items add up to the total' })).toBeVisible();
    },
  );
  await page.getByRole('button', { name: 'More people' }).click();
  await page.waitForTimeout(550);
  await page.getByRole('button', { name: 'More people' }).click();
  const region = page.getByRole('region', { name: 'How many people ate?' });
  n++;
  await step(
    page,
    F,
    n,
    'people',
    'Tap + twice',
    'RM64.13 / 3 = RM21.38 a person (6413/3 = 2137.67 rounded to 2138 sen); the - button is enabled',
    async () => {
      await expect(region).toContainText('RM21.38');
      await expect(region).toContainText('÷ 3');
      await expect(page.getByRole('button', { name: 'Fewer people' })).toBeEnabled();
    },
  );
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
    'Tap Done',
    'a toast "Attached to RM64.13 on Ryt Bank" with Undo; one more receipt is attached to a payment',
    async () => {
      expect(after).toBe(before + 1);
      await expect(toast(page)).toContainText('Undo');
    },
  );
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(600);
  n++;
  await step(page, F, n, 'undone', 'Tap Undo', 'the receipt is detached again (attached count back)', async () => {
    expect(await db<number>(page, '(db) => db.receipts.filter(r => r.transactionId).length')).toBe(before);
  });
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-C3b scan-after, sad: the same file twice, and a receipt that cannot be read', async ({ page }) => {
  const F = 'R3-FLOW-C3';
  await open(page, '/scan');
  await page.getByTestId('scan-camera').setInputFiles(SCAN);
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(700);
  const receipts = await db<number>(page, '(db) => db.receipts.length');
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await page.getByTestId('scan-camera').setInputFiles(SCAN);
  await page.waitForTimeout(1500);
  if (await page.getByRole('button', { name: 'Use this' }).count()) {
    await page.getByRole('button', { name: 'Use this' }).click();
    await page.waitForTimeout(2500);
  }
  const receipts2 = await db<number>(page, '(db) => db.receipts.length');
  const t = (await page.locator('body').innerText()).replace(/\n+/g, ' | ');
  note(F, `after the same file twice: receipts ${receipts} -> ${receipts2}; text ${t.slice(0, 300)}`);
  await step(
    page,
    F,
    10,
    'same-twice',
    'Scan the very same file again',
    '"Already added" and no new receipt row',
    async () => {
      expect(receipts2).toBe(receipts);
      expect(
        t +
          (await toast(page)
            .innerText()
            .catch(() => '')),
      ).toMatch(/Already added/);
    },
  );
});

test('R3-FLOW-6 payment detail: facts, actions, Delete is behind the menu and Undo restores exactly', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R3-FLOW-6';
  let n = 0;
  const NK = uid('txn:nasi-kandar');
  // in the app, from Payments, so Back has somewhere to go (a direct load is its own finding)
  await open(page, '/s/payments');
  await settled(page);
  await page
    .getByRole('button', { name: /^Nasi Kandar Abc/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/s\/txn\?id=/);
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'detail',
    'Open Nasi Kandar Abc',
    'title-cased payee; RM58.30; "Fri, 16 Oct, 19:32 · Ryt Bank"; where it came from; four round actions (Receipt, Split, Ask Sen, More); facts: Category, Your spending, Note',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).toContain('Nasi Kandar Abc');
      expect(t).toMatch(/RM58\.30/);
      expect(t).toContain('From Ryt Bank');
      for (const a of ['Receipt', 'Split', 'Ask Sen', 'More'])
        await expect(page.getByRole('button', { name: a, exact: true }).first()).toBeVisible();
      for (const f of ['Category', 'Your spending', 'Note']) expect(t).toContain(f);
      // the stored text is unchanged by title-casing
      const raw = await db<string>(page, `(db) => db.txns.find(t => t.id === "${NK}").merchantRaw`);
      expect(raw).toBe('NASI KANDAR ABC');
    },
  );
  const exists = () => db<boolean>(page, `(db) => !!db.txns.find(t => t.id === "${NK}" && !t.deletedAt)`);
  const snap = () =>
    db<string>(
      page,
      `(db) => JSON.stringify((({amount, categoryId, myShare, note, accountId, occurredAt}) => ({amount, categoryId, myShare, note, accountId, occurredAt}))(db.txns.find(t => t.id === "${NK}")))`,
    );
  const before = await snap();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  const menu = page.getByRole('menu');
  n++;
  await step(
    page,
    F,
    n,
    'menu',
    'Tap More',
    'a menu with Mark as… and Delete (No receipt is only offered when there is none)',
    async () => {
      await expect(menu).toBeVisible();
      const t = await menu.innerText();
      expect(t).not.toMatch(/No receipt/); // it has a receipt already
      expect(t).toMatch(/Mark as/);
      expect(t).toMatch(/Delete/);
    },
  );
  await menu.getByRole('menuitem', { name: /Delete/ }).click();
  await expect(toast(page)).toContainText(/Undo/);
  await expect(page).toHaveURL(/\/s\/payments/);
  n++;
  await step(
    page,
    F,
    n,
    'deleted',
    'Tap Delete',
    'the payment is deleted in the db; the toast offers Undo',
    async () => {
      expect(await exists()).toBe(false);
    },
  );
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(600);
  await page
    .getByRole('button', { name: /^Nasi Kandar Abc/ })
    .first()
    .click();
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'restored',
    'Tap Undo',
    'the same payment is back, with every field as it was (amount, category, share, note, account, time)',
    async () => {
      expect(await exists()).toBe(true);
      expect(await snap()).toBe(before);
    },
  );
  // double delete: one Delete, one Undo restores it
  await page.getByRole('button', { name: 'More', exact: true }).click();
  const b = await page
    .getByRole('menu')
    .getByRole('menuitem', { name: /Delete/ })
    .boundingBox();
  await page.mouse.click(b!.x + 10, b!.y + 10);
  await page.waitForTimeout(100);
  await page.mouse.click(b!.x + 10, b!.y + 10);
  await page.waitForTimeout(600);
  const gone = await db<number>(page, '(db) => db.txns.filter(t => t.deletedAt).length');
  note(F, `after a double tap on Delete: deleted rows ${gone}, url ${page.url()}`);
  n++;
  await step(
    page,
    F,
    n,
    'double-delete',
    'Double tap Delete',
    'one payment deleted, not two (the second tap lands on the row that slid under it)',
    async () => {
      expect(gone).toBe(1);
    },
  );
  expect(w.errors).toEqual([]);
});

async function noop(_p: Page) {}
void noop;
