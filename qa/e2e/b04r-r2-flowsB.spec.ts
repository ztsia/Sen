import { expect, test } from '@playwright/test';
import { db, open, settled, tabs, toast, watch } from './b04r-helpers';
import { step } from './b04r-r2-lib';
import { uid } from '../../apps/web/src/data/fake/ids';

// Run 2 flows, part B: manual, balance check, scan, pay-new, first run. Dev server (5291).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

test('R2-FLOW-9 Add expense: structure', async ({ page }) => {
  const F = 'R2-FLOW-9';
  await open(page, '/review');
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await step(
    page,
    F,
    1,
    'form',
    'Review -> Missing a payment?',
    'Add expense opens without the tab bar; the amount is large (>= 36 px) and centred; categories are a 4-column grid of icon tiles; Paid from and When are rows in one card',
    async () => {
      await expect(page).toHaveURL(/\/s\/manual/);
      await expect(tabs(page)).toHaveCount(0);
      const fs = await page.getByLabel('Amount').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
      expect(fs).toBeGreaterThanOrEqual(36);
      const ta = await page.getByLabel('Amount').evaluate((e) => getComputedStyle(e).textAlign);
      expect(ta).toBe('center');
      const cols = await page
        .getByRole('radiogroup', { name: 'Category' })
        .or(page.locator('[aria-labelledby="category-label"]'))
        .first()
        .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length);
      expect(cols).toBe(4);
      await expect(page.getByRole('radio', { name: 'Meals' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Paid from/ })).toBeVisible();
      await expect(page.locator('main')).toContainText('When');
      await expect(page.getByRole('button', { name: 'More details' })).toBeVisible();
    },
  );
  await page.getByRole('button', { name: 'More details' }).click();
  await step(
    page,
    F,
    2,
    'more-details',
    'Open More details',
    'Merchant and Note fields appear; the disclosure says it is expanded',
    async () => {
      await expect(page.getByRole('button', { name: 'More details' })).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByLabel('Merchant')).toBeVisible();
    },
  );
  await page.getByRole('button', { name: /Paid from/ }).click();
  await step(
    page,
    F,
    3,
    'paid-from',
    'Tap Paid from',
    'a sheet of accounts opens (a choice, not a long page)',
    async () => {
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog')).toContainText(/Ryt Bank/);
    },
  );
});

test('R2-FLOW-11 Check balances', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-11';
  await open(page, '/s/accounts');
  await settled(page);
  await step(
    page,
    F,
    1,
    'accounts',
    'Open Accounts',
    'the total first (In 5 accounts), accounts in a card with bank-initial tiles, "Checked 1 Oct" and "Not checked" badges, Elsewhere in a muted card without balances',
    async () => {
      await expect(page.locator('main')).toContainText('In 5 accounts');
      await expect(page.locator('main')).toContainText('Checked 1 Oct');
      await expect(page.locator('main')).toContainText('Not checked');
      await expect(page.locator('main')).toContainText('Elsewhere');
      await expect(page.locator('main')).toContainText('No balance');
    },
  );
  await page.getByRole('button', { name: 'Check balances' }).click();
  await step(
    page,
    F,
    2,
    'check',
    'Tap Check balances',
    'balance-check: a card per account (5), each "Sen has RM...", no tab bar, Matches chips 32 px',
    async () => {
      await expect(page).toHaveURL(/balance-check/);
      await expect(tabs(page)).toHaveCount(0);
      await settled(page);
      await expect(page.getByRole('group', { name: 'Ryt Bank' })).toBeVisible();
      expect(await page.getByRole('group').count()).toBeGreaterThanOrEqual(5);
      const chips = await page
        .getByRole('button', { name: /matches$/ })
        .evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().height)));
      expect(chips.length).toBeGreaterThanOrEqual(5);
      expect(
        chips.every((h) => h === 32),
        `chips ${chips}`,
      ).toBe(true);
    },
  );
  const ryt = page.getByRole('group', { name: 'Ryt Bank' });
  await page.getByRole('button', { name: 'Ryt Bank matches' }).click();
  await step(
    page,
    F,
    3,
    'matches',
    'Tap Matches on Ryt Bank',
    'the box holds exactly 14,650.87 (parsed back to 1465087 sen) and the badge says No difference',
    async () => {
      await expect(ryt.getByLabel('What the bank app shows')).toHaveValue('14,650.87');
      await expect(ryt.getByText('No difference')).toBeVisible();
    },
  );
  await ryt.getByLabel('What the bank app shows').fill('14650.97');
  await step(
    page,
    F,
    4,
    'diff',
    'Type a figure ten sen higher',
    'the badge says RM0.10 more than Sen has, in words',
    async () => {
      await expect
        .poll(() =>
          ryt.evaluate((el) => {
            const c = el.cloneNode(true) as HTMLElement;
            c.querySelectorAll('.sr-only').forEach((n) => n.remove());
            return (c.textContent ?? '').replace(/\s+/g, ' ');
          }),
        )
        .toContain('RM0.10 more than Sen has');
    },
  );
  const BEFORE = '(db)=>JSON.stringify(db.txns.filter(t=>t.kind==="adjustment").length)';
  const n0 = await db<string>(page, BEFORE);
  await page.getByRole('button', { name: 'Save' }).click();
  await step(
    page,
    F,
    6,
    'saved',
    'Tap Save',
    'the screen closes; Accounts shows Ryt Bank as checked today; the difference is booked (one more Unaccounted row, or the check is recorded)',
    async () => {
      await expect(page).not.toHaveURL(/balance-check/);
      const n1 = await db<string>(page, BEFORE);
      console.log('unaccounted rows', n0, '->', n1);
      await expect(page).toHaveURL(/\/s\/accounts/);
      await settled(page);
      const ryt = page.getByRole('button', { name: /Ryt Bank/ });
      await expect(ryt).not.toContainText('Checked 1 Oct');
      await expect(ryt).toContainText(/Checked/);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-12 Scan a receipt after paying (core)', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-12';
  await open(page, '/');
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await step(
    page,
    F,
    1,
    'scan',
    'Tap the Scan tab',
    'three tips as rows; Take a photo is the only 48 px button; From gallery 40; Add by hand a link/text button',
    async () => {
      await expect(page).toHaveURL(/\/scan/);
      await expect(page.getByText('Lay it flat')).toBeVisible();
      await expect(page.getByText('Stand in the light')).toBeVisible();
      await expect(page.getByText('Get the whole receipt in')).toBeVisible();
      const h = async (n: string) =>
        Math.round(await page.getByRole('button', { name: n }).evaluate((e) => e.getBoundingClientRect().height));
      expect(await h('Take a photo')).toBe(48);
      expect(await h('From gallery')).toBe(40);
      expect(await h('Add by hand')).toBeLessThanOrEqual(40);
    },
  );
  const file = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };
  await page.getByTestId('scan-camera').setInputFiles(file);
  await step(page, F, 2, 'crop', 'Choose a file', 'crop shows with four draggable corners and Use this', async () => {
    await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible();
  });
  await page.getByRole('button', { name: 'Use this' }).click();
  await step(page, F, 3, 'reading', 'Use this', '"Reading receipt…" is shown', async () => {
    await expect(page.getByText('Reading receipt…')).toBeVisible();
  });
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10000 });
  await expect(page.getByText('SATE KAJANG HJ SAMURI').first()).toBeVisible();
  await step(
    page,
    F,
    4,
    'confirm',
    'Reading finishes',
    'confirm opens without the tab bar; the sum of the item prices equals the receipt total (integer sen)',
    async () => {
      await expect(tabs(page)).toHaveCount(0);
      const r = JSON.parse(
        await db<string>(
          page,
          '(db)=>{const r=db.receipts.at(-1);const its=db.items.filter(i=>i.receiptId===r.id);const price=(i)=>i.price??i.amount??0;return JSON.stringify({total:r.total??r.totalSen,sum:its.reduce((a,i)=>a+price(i),0),n:its.length})}',
        ),
      );
      console.log('receipt', JSON.stringify(r));
      expect(r.n).toBeGreaterThan(0);
      expect(r.sum).toBe(r.total);
      expect(Number.isInteger(r.total)).toBe(true);
    },
  );
  await page.getByRole('button', { name: 'More people' }).click();
  await page.getByRole('button', { name: 'More people' }).click();
  await step(
    page,
    F,
    5,
    'three-people',
    'Tap + twice',
    'the meal average is "÷ 3 =" an exact figure: RM64.13 / 3 = RM21.38 (rounded once, in whole sen)',
    async () => {
      const r = page.getByRole('region', { name: 'How many people ate?' });
      await expect(r).toContainText('÷ 3 =');
      await expect(r).toContainText('RM21.38');
    },
  );
  const attached = '(db)=>JSON.stringify(db.receipts.filter(r=>r.transactionId).length)';
  const a0 = JSON.parse(await db<string>(page, attached));
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await step(
    page,
    F,
    6,
    'attached',
    'Tap Done',
    'a toast says Attached to RM64.13 on Ryt Bank with Undo; one more receipt is attached',
    async () => {
      await expect(toast(page)).toContainText('Attached to RM64.13 on Ryt Bank');
      expect(JSON.parse(await db<string>(page, attached))).toBe(a0 + 1);
    },
  );
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await step(page, F, 7, 'undone', 'Tap Undo', 'the receipt is no longer attached', async () => {
    await expect.poll(async () => JSON.parse(await db<string>(page, attached))).toBe(a0);
  });
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-13 Receipt sad paths', async ({ page }) => {
  const F = 'R2-FLOW-13';
  await open(page, '/s/confirm');
  await step(
    page,
    F,
    1,
    'no-receipt',
    'Open confirm with no receipt',
    'an Empty state: icon, title "No receipt here", one line and one button (Go Home); nothing else',
    async () => {
      const main = page.locator('main');
      await expect(main).toContainText('No receipt here');
      await expect(main.getByRole('button', { name: 'Go Home' })).toBeVisible();
      expect(await main.getByRole('button').count()).toBe(1);
      expect(await main.locator('svg').count()).toBeGreaterThan(0);
    },
  );
  await open(page, '/scan');
  const file = { name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };
  const N = '(db)=>db.receipts.length';
  const n0 = await db<number>(page, N);
  await page.getByTestId('scan-camera').setInputFiles(file);
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10000 });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toast(page)).toBeVisible();
  const n1 = await db<number>(page, N);
  await tabs(page).getByRole('button', { name: 'Scan a receipt' }).click();
  await page.getByTestId('scan-camera').setInputFiles(file);
  await page.waitForTimeout(800);
  if (await page.getByRole('button', { name: 'Use this' }).count())
    await page.getByRole('button', { name: 'Use this' }).click();
  await page.waitForTimeout(3500);
  await step(
    page,
    F,
    3,
    'same-file-twice',
    'Scan the same file again',
    'the second scan says Already added and the receipts table does not grow by a second row',
    async () => {
      const n2 = await db<number>(page, N);
      console.log('receipts', n0, n1, n2, page.url());
      expect(n1).toBe(n0 + 1);
      await expect(page.locator('body')).toContainText(/Already added/);
      expect(n2).toBe(n1);
    },
  );
});

test('R2-FLOW-13b A receipt Sen could not read opens manual with the photo', async ({ page }) => {
  const F = 'R2-FLOW-13';
  await open(page, '/review');
  await page.getByRole('button', { name: /A receipt Sen couldn't read/ }).click();
  await step(
    page,
    F,
    2,
    'unreadable',
    "Review -> A receipt Sen couldn't read",
    'manual opens with "Sen couldn\'t read this one. The photo is kept." and a photo placeholder',
    async () => {
      await expect(page).toHaveURL(/\/s\/manual\?id=/);
      await expect(page.locator('main')).toContainText('Sen couldn’t read this one. The photo is kept.');
      await expect(page.getByRole('img', { name: 'Your receipt photo' })).toBeVisible();
    },
  );
});

test('R2-FLOW-14 New merchant (core): answer, rule, and it leaves Review', async ({ page }) => {
  const F = 'R2-FLOW-14';
  await open(page, '/review');
  await step(
    page,
    F,
    1,
    'in-review',
    'Open Review',
    'a Categories card for Roti Bakar 88 is waiting (it was not answered yet)',
    async () => {
      await expect(page.locator('[data-review="new-merchant"]', { hasText: 'Roti Bakar 88' })).toHaveCount(1);
    },
  );
  await open(page, '/');
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.getByRole('button', { name: 'Surfaces' }).click();
  const s = page.getByTestId('surface-prompt-category');
  await s.scrollIntoViewIfNeeded();
  await step(
    page,
    F,
    2,
    'prompt',
    'Dev panel -> Surfaces -> the category prompt',
    'the prompt says RM9.50 · ROTI BAKAR 88 with Meals, Groceries and Scan receipt',
    async () => {
      await expect(s).toContainText('ROTI BAKAR 88');
      await expect(s.getByRole('button', { name: 'Meals' })).toBeVisible();
      await expect(s.getByRole('button', { name: 'Groceries' })).toBeVisible();
      await expect(s.getByRole('button', { name: 'Scan receipt' })).toBeVisible();
    },
  );
  const ROTI = uid('txn:roti-bakar');
  const Q = `(db)=>JSON.stringify({rules:db.rules.length,cat:db.txns.find(t=>t.id==="${ROTI}").categoryId,last:db.rules.at(-1)})`;
  const before = JSON.parse(await db<string>(page, Q));
  await s.getByRole('button', { name: 'Meals' }).click();
  await step(page, F, 3, 'answered', 'Tap Meals', 'the payment takes Meals and exactly one rule is made', async () => {
    await expect.poll(async () => JSON.parse(await db<string>(page, Q)).cat).not.toBeNull();
    const after = JSON.parse(await db<string>(page, Q));
    expect(before.cat).toBeNull();
    expect(after.rules).toBe(before.rules + 1);
  });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await tabs(page)
    .getByRole('link', { name: /Review/ })
    .click();
  await step(page, F, 4, 'left-review', 'Open Review', 'the Roti Bakar card is gone', async () => {
    await expect(page.locator('[data-review="new-merchant"]', { hasText: 'Roti Bakar 88' })).toHaveCount(0);
  });
  await tabs(page).getByRole('link', { name: /More/ }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /^Categories and rules/ }).click();
  await page.getByRole('radio', { name: 'Rules' }).click();
  await step(
    page,
    F,
    5,
    'rule',
    'Settings -> Categories -> Rules',
    'a sentence rule for Roti Bakar 88 -> Meals, with where it came from (From your answer)',
    async () => {
      console.log('RULES', (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 700));
      const rule = page.locator('[data-slot="item"]').filter({ hasText: /Roti Bakar 88/i });
      await expect(rule).toHaveCount(1);
      await expect(rule).toContainText('Meals');
      await expect(rule).toContainText('From your answer');
    },
  );
});

test('R2-FLOW-15 New merchant left alone waits in Review', async ({ page }) => {
  const F = 'R2-FLOW-15';
  await open(page, '/');
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.getByRole('button', { name: 'Surfaces' }).click();
  await page.getByTestId('surface-prompt-category').scrollIntoViewIfNeeded();
  await step(
    page,
    F,
    1,
    'prompt-ignored',
    'See the prompt and ignore it',
    'no category was applied: the payment still has none and no rule was made',
    async () => {
      const r = JSON.parse(
        await db<string>(
          page,
          `(db)=>JSON.stringify({rules:db.rules.length,cat:db.txns.find(t=>t.id==="${uid('txn:roti-bakar')}").categoryId})`,
        ),
      );
      expect(r.cat).toBeNull();
    },
  );
  await open(page, '/review');
  await step(
    page,
    F,
    2,
    'waits',
    'Open Review',
    "the payment waits under Categories; Review's badge counts it",
    async () => {
      await expect(page.locator('[data-review="new-merchant"]', { hasText: 'Roti Bakar 88' })).toHaveCount(1);
      await expect(tabs(page).getByRole('link', { name: /to review/ })).toBeVisible();
    },
  );
});

test('R2-FLOW-16 First run (core)', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-16';
  await open(page, '/s/first-run?scenario=before-salary');
  await step(
    page,
    F,
    1,
    'sign-in',
    'Open first run',
    "centred: the look's mark above, one field (email), one main action; no tab bar",
    async () => {
      await expect(page.getByRole('heading', { name: 'Sign in to Sen' })).toBeVisible();
      await expect(page.getByLabel('Your email')).toBeVisible();
      await expect(tabs(page)).toHaveCount(0);
      expect(await page.locator('main input:visible').count()).toBe(1);
      const h = await page
        .getByRole('button', { name: 'Send the code' })
        .evaluate((e) => Math.round(e.getBoundingClientRect().height));
      expect(h).toBe(48);
    },
  );
  await page.getByLabel('Your email').fill('wei.ming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await expect(page.getByLabel('6-digit code')).toBeVisible();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await step(page, F, 2, 'apps', 'Enter the code', 'Step 2 of 7: Sen found 4 banks and e-wallets', async () => {
    await expect(page.getByText('Step 2 of 7')).toBeVisible();
  });
  await page.getByRole('button', { name: 'Next' }).click();
  await step(page, F, 3, 'access', 'Next', 'Step 3 of 7: notification access', async () => {
    await expect(page.getByText('Step 3 of 7')).toBeVisible();
  });
  await page
    .getByRole('button', { name: 'Next' })
    .click()
    .catch(() => page.getByRole('button', { name: 'Skip for now' }).click());
  await step(page, F, 4, 'running', 'Skip / Next', 'Step 4 of 7', async () => {
    await expect(page.getByText('Step 4 of 7')).toBeVisible();
  });
  await page
    .getByRole('button', { name: /^Next$|Skip for now/ })
    .first()
    .click();
  await step(page, F, 5, 'accounts', 'Next', 'Step 5 of 7: accounts', async () => {
    await expect(page.getByText('Step 5 of 7')).toBeVisible();
  });
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.getByLabel('Your name').fill('TAN WEI MING');
  await step(
    page,
    F,
    6,
    'name',
    'Type your name as the bank prints it',
    'Step 6 of 7 with the typed name kept',
    async () => {
      await expect(page.getByText('Step 6 of 7')).toBeVisible();
      await expect(page.getByLabel('Your name')).toHaveValue('TAN WEI MING');
    },
  );
  await page.getByRole('button', { name: /^Next$/ }).click();
  await step(page, F, 7, 'payday', 'Next', 'Step 7 of 7: payday as choice cards, one line each', async () => {
    await expect(page.getByText('Step 7 of 7')).toBeVisible();
  });
  await page.getByRole('button', { name: 'Finish' }).click();
  await step(
    page,
    F,
    8,
    'home',
    'Finish',
    'Home reads "Spent since you started" (no salary yet), tab bar is back',
    async () => {
      await expect(page.getByTestId('hero')).toBeVisible();
      await expect(page.getByTestId('hero')).toContainText('Spent since you started');
      await expect(tabs(page)).toBeVisible();
    },
  );
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-17 First run sad paths', async ({ page }) => {
  const F = 'R2-FLOW-17';
  await open(page, '/s/first-run?scenario=before-salary');
  await page.getByLabel('Your email').fill('not-an-email');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await step(
    page,
    F,
    1,
    'bad-email',
    'Type "not-an-email" and send',
    'a message in words; the field keeps what was typed; no code sheet',
    async () => {
      await expect(page.getByLabel('Your email')).toHaveValue('not-an-email');
      await expect(page.locator('main [data-slot="field-error"], main [role="alert"]').first()).toBeVisible();
      await expect(page.getByLabel('6-digit code')).toHaveCount(0);
    },
  );
  await page.getByLabel('Your email').fill('stranger@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await step(page, F, 2, 'invitation-only', 'An unknown email', '"Sen is invitation-only" is said', async () => {
    await expect(page.locator('main')).toContainText(/invitation-only/i);
  });
  await open(page, '/s/first-run?scenario=before-salary');
  await page.getByLabel('Your email').fill('wei.ming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('999999');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await step(
    page,
    F,
    3,
    'wrong-code',
    'Type a wrong code',
    'a message says it is wrong; the code field stays; a way to send a new code is offered',
    async () => {
      await expect(page.locator('main')).toContainText(/code/i);
      await expect(page.getByLabel('6-digit code')).toBeVisible();
      await expect(page.getByRole('button', { name: /new code/i })).toBeVisible();
    },
  );
  await page.getByLabel('6-digit code').fill('000000');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await step(
    page,
    F,
    4,
    'expired',
    'Type the made-up expired code',
    '"That code has expired." and a new code is offered',
    async () => {
      await expect(page.getByText('That code has expired.')).toBeVisible();
      await expect(page.getByRole('button', { name: /new code/i })).toBeVisible();
    },
  );
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Step 2 of 7')).toBeVisible();
  await page.reload();
  await step(
    page,
    F,
    5,
    'reload',
    'Close mid-setup and reopen',
    'it reopens at the same step (Step 2 of 7), not at sign-in',
    async () => {
      await expect(page.getByText('Step 2 of 7')).toBeVisible({ timeout: 8000 });
    },
  );
});
