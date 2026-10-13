import { expect, test } from '@playwright/test';
import { db, open, toast, watch } from './b04r-helpers';
import { uid } from '../../apps/web/src/data/fake/ids';
import { note, step } from './b04r-r3-lib';

// Run 3 flows C: money entry and the record behind it. Dev server (5391 by default): the fake db is read as a module.
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

const MANUAL = '(db)=>JSON.stringify(db.txns.filter(t=>t.source==="manual").map(t=>t.amount).sort((a,b)=>a-b))';
const manual = async (page: import('@playwright/test').Page) => JSON.parse(await db<string>(page, MANUAL)) as number[];

test('R3-FLOW-8 manual entry: typed text becomes exact sen, or is refused; nothing else saves', async ({ page }) => {
  const w = watch(page);
  const F = 'R3-FLOW-8';
  const OK: [string, number][] = [
    ['12.5', 1250],
    ['0.1', 10],
    ['1,234.56', 123456],
    [' 12.50 ', 1250],
    ['0.01', 1],
    ['99,999,999,999.99', 9999999999999],
    ['7', 700],
  ];
  const BAD: [string, RegExp][] = [
    ['12,50', /Type the amount in ringgit/],
    ['RM 12.50', /Type the amount in ringgit/],
    ['１２.５０', /Type the amount in ringgit/], // full-width digits
    ['٣.٥٠', /Type the amount in ringgit/], // Arabic-Indic digits
    ['.5', /Type the amount in ringgit/],
    ['5.', /Type the amount in ringgit/],
    ['+5', /Type the amount in ringgit/],
    ['1_000', /Type the amount in ringgit/],
    ['NaN', /Type the amount in ringgit/],
    ['Infinity', /Type the amount in ringgit/],
    ['12.50.00', /Type the amount in ringgit/],
    ['100,000,000,000.00', /too large/],
    ['9'.repeat(40), /too large/],
    ['0.00', /above zero/],
    ['<script>alert(1)</script>', /Type the amount in ringgit/],
  ];
  // one page load holds one fake db, so the form is reached in the app each time: Review's "Add it"
  await open(page, '/review');
  const start = await manual(page);
  let n = 0;
  const saved: number[] = [];
  for (const [text, sen] of OK) {
    await page.getByRole('button', { name: 'Add it' }).click();
    await page.getByLabel('Amount').fill(text);
    await page.getByRole('radio', { name: 'Meals' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect.poll(async () => (await manual(page)).length, { message: text }).toBe(start.length + saved.length + 1);
    saved.push(sen);
  }
  const all = await manual(page);
  note(F, `saved amounts: ${JSON.stringify(all)} expected additions ${JSON.stringify(saved)}`);
  n++;
  await step(
    page,
    F,
    n,
    'saved',
    'Save seven valid amounts',
    'each is stored as exactly the integer sen typed (1250, 10, 123456, 1250, 1, 9999999999999, 700)',
    async () => {
      expect([...all].sort((a, b) => a - b)).toEqual([...start, ...saved].sort((a, b) => a - b));
    },
  );
  await page.getByRole('button', { name: 'Add it' }).click();
  await page.getByRole('radio', { name: 'Meals' }).click();
  const refused: string[] = [];
  for (const [text, msg] of BAD) {
    await page.getByLabel('Amount').fill(text);
    await page.getByRole('button', { name: 'Save' }).click();
    const err = await page
      .getByRole('main')
      .locator('[data-slot="field-error"]')
      .first()
      .innerText()
      .catch(() => '(no message)');
    if (!msg.test(err)) refused.push(`${JSON.stringify(text)} -> ${err}`);
    if ((await manual(page)).length !== all.length) refused.push(`${JSON.stringify(text)} SAVED`);
  }
  note(F, `refusal mismatches: ${JSON.stringify(refused)}`);
  n++;
  await step(
    page,
    F,
    n,
    'refused',
    'Try fifteen malformed amounts',
    'each is refused in words under the field and nothing is saved; the form stays open',
    async () => {
      expect(refused).toEqual([]);
      expect(page.url()).toContain('/s/manual');
    },
  );
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-8b manual entry: a double tap on Save makes one payment (dedupe)', async ({ page }) => {
  const F = 'R3-FLOW-8';
  await open(page, '/s/manual');
  const before = await manual(page);
  await page.getByLabel('Amount').fill('23.45');
  await page.getByRole('radio', { name: 'Meals' }).click();
  const save = page.getByRole('button', { name: 'Save' });
  const b = (await save.boundingBox())!;
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(1200);
  const after = await manual(page);
  note(F, `double-click Save: ${after.length - before.length} payment(s) added`);
  await step(page, F, 9, 'double-save', 'Double-click Save', 'exactly one payment of 2345 sen is added', async () => {
    expect(after.filter((a) => a === 2345).length - before.filter((a) => a === 2345).length).toBe(1);
  });
});

test('R3-FLOW-8c manual entry: Undo removes the payment, and the Payments list shows exactly the typed amount', async ({
  page,
}) => {
  const F = 'R3-FLOW-8';
  await open(page, '/s/manual');
  const before = await manual(page);
  await page.getByLabel('Amount').fill('31.07');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText(/Undo/);
  await step(page, F, 10, 'saved-toast', 'Save RM31.07', 'a toast with Undo; the db holds 3107', async () => {
    expect((await manual(page)).includes(3107)).toBe(true);
  });
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(500);
  await step(page, F, 11, 'undone', 'Tap Undo', 'the payment is gone: the manual list is what it was', async () => {
    expect(await manual(page)).toEqual(before);
  });
});

test("R3-FLOW-9 split link in a friend's browser: name, tick, done; final is read-only; unknown links say closed", async ({
  browser,
}) => {
  const F = 'R3-FLOW-9';
  const ctx = await browser.newContext({
    baseURL: 'http://127.0.0.1:5292',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  const w = watch(page);
  let n = 0;
  await open(page, '/s/split-public?id=demo-new');
  n++;
  await step(
    page,
    F,
    n,
    'name',
    'Open a split link with no login',
    'a name box; items are disabled until you type your name; no tab bar and no Sen button',
    async () => {
      await expect(page.getByRole('textbox', { name: "What's your name?" })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Ask Sen/ })).toHaveCount(0);
      for (const c of await page.getByRole('checkbox').all()) await expect(c).toBeDisabled();
    },
  );
  // a hostile, very long name stays literal and inside the screen
  const hostile = `<img src=x onerror=alert(1)>${'W'.repeat(300)}`;
  await page.getByRole('textbox', { name: "What's your name?" }).fill(hostile);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(500);
  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  const injected = await page.evaluate(() => document.querySelectorAll('img[src="x"]').length);
  note(F, `hostile name: overflowX=${overflowX} injected img=${injected}`);
  n++;
  await step(
    page,
    F,
    n,
    'hostile-name',
    'Type a 300-letter name containing an <img onerror>',
    'the markup is shown as text (no img element is created), nothing scrolls sideways',
    async () => {
      expect(injected).toBe(0);
      expect(overflowX).toBeLessThanOrEqual(0);
    },
  );
  await open(page, '/s/split-public?id=demo'); // a browser that already knows Mei
  const ktg = page.getByRole('checkbox', { name: /Kuey teow goreng/ });
  await expect(ktg).toBeChecked();
  await ktg.click();
  await page.waitForTimeout(300);
  n++;
  await step(
    page,
    F,
    n,
    'untick',
    'Mei unticks Kuey teow goreng',
    'Your share so far falls to RM0.00 and the item says nobody has ticked it',
    async () => {
      await expect(page.locator('main')).toContainText('RM0.00');
      await expect(page.locator('main')).toContainText('Nobody has ticked this');
    },
  );
  await ktg.click();
  await expect(page.locator('main')).toContainText('RM12.48');
  await expect(page.locator('main')).not.toContainText('Nobody has ticked this');
  const done = page.getByRole('button', { name: "I've ticked everything I had" });
  const box = (await done.boundingBox())!;
  note(F, `I'm done button at y=${Math.round(box.y)} h=${Math.round(box.height)} of 844`);
  await done.click();
  n++;
  await step(
    page,
    F,
    n,
    'done',
    "Re-tick, then tap I've ticked everything I had",
    'Mei was the last to finish and every item is claimed, so the split locks: "Final", the share is RM12.48, ticks are read-only',
    async () => {
      await expect(page.locator('main')).toContainText('Final');
      await expect(page.locator('main')).toContainText('RM12.48');
      for (const c of await page.getByRole('checkbox').all()) await expect(c).toBeDisabled();
    },
  );
  await open(page, '/s/split-public?id=demo-final');
  n++;
  await step(
    page,
    F,
    n,
    'final',
    'Open a final split',
    'ticks are read-only with "To change a tick, ask Wei Ming."; the share is RM22.14; Pay RM22.14 is offered',
    async () => {
      await expect(page.locator('main')).toContainText('To change a tick, ask Wei Ming.');
      for (const c of await page.getByRole('checkbox').all()) await expect(c).toBeDisabled();
      await expect(page.locator('main')).toContainText('RM22.14');
      await expect(page.getByText(/Pay RM22\.14/).first()).toBeVisible();
    },
  );
  await open(page, '/s/split-public?id=demo-closed');
  n++;
  await step(page, F, n, 'closed', 'Open a closed link', '"This split is closed" and nothing else', async () => {
    const t = (await page.locator('main').innerText()).trim();
    expect(t).toMatch(/This split is closed/);
    expect(t).not.toMatch(/RM|Kedai|Wei Ming|Ali/);
  });
  for (const id of [
    'zzz',
    encodeURIComponent('../../etc/passwd'),
    encodeURIComponent("'; DROP TABLE splits;--"),
    'a'.repeat(2000),
  ]) {
    await open(page, `/s/split-public?id=${id}`);
    expect((await page.locator('main').innerText()).trim()).toMatch(/This split is closed/);
  }
  expect(w.errors).toEqual([]);
  await ctx.close();
});

test('R3-FLOW-9b Shared bills: Open and Settled, with the status in words and colour', async ({ page }) => {
  const F = 'R3-FLOW-9';
  await open(page, '/s/shared');
  await settled2(page);
  await step(
    page,
    F,
    20,
    'shared-open',
    'Open Shared bills',
    'Open selected: three bills, each with a status line in words; "you owe RM24.40" present',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).toMatch(/Open · 3/);
      expect(t).toMatch(/Mei paid · you owe RM24\.40/);
      expect(t).toMatch(/You paid · 1 of 2 paid you back/);
      await expect(page.getByRole('radio', { name: /^Open/ })).toBeChecked();
    },
  );
  await page.getByRole('radio', { name: /^Settled/ }).click();
  await step(
    page,
    F,
    21,
    'shared-settled',
    'Choose Settled',
    'an EmptyState with an icon, a title and a line; no bare text',
    async () => {
      await expect(page.locator('main')).toContainText(/Nothing settled yet/);
      expect(await page.locator('main svg').count()).toBeGreaterThan(0);
    },
  );
});

async function settled2(page: import('@playwright/test').Page) {
  await expect(page.locator('main [role="status"]:has-text("Loading")')).toHaveCount(0, { timeout: 10_000 });
}

test('R3-FLOW-14 balance check: the difference reads by sign, a bad figure is refused, a double tap on Save books each difference once', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R3-FLOW-14';
  let n = 0;
  await open(page, '/s/balance-check');
  await settled2(page);
  const shape = () =>
    db<{ checks: number; txns: number }>(page, '(db) => ({ checks: db.checks.length, txns: db.txns.length })');
  const before = await shape();
  const boxes = page.getByRole('textbox');
  await boxes.nth(0).fill('14,655.87'); // Sen has 14,650.87
  await boxes.nth(1).fill('7,339.00'); // Sen has 7,340.00
  await boxes.nth(2).fill('262.30'); // matches
  const t = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
  n++;
  await step(
    page,
    F,
    n,
    'differences',
    'Type a higher, a lower and an equal figure',
    '"RM5.00 more than Sen has", "RM1.00 less than Sen has", and "No difference" for the equal one',
    async () => {
      expect(t).toMatch(/RM5\.00.*more than Sen has/);
      expect(t).toMatch(/RM1\.00.*less than Sen has/);
      expect(t).toMatch(/No difference/);
      expect(t.match(/more than Sen has/g)?.length).toBe(1);
      expect(t.match(/less than Sen has/g)?.length).toBe(1);
    },
  );
  await boxes.nth(3).fill('');
  const save = page.getByRole('button', { name: 'Save' });
  const b = (await save.boundingBox())!;
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(1200);
  const after = await shape();
  note(F, `checks ${before.checks} -> ${after.checks}, payments ${before.txns} -> ${after.txns}`);
  n++;
  await step(
    page,
    F,
    n,
    'saved',
    'Double-click Save',
    'two checks (Ryt, Public Bank; the equal one books nothing extra but is a check) and exactly two Unaccounted payments, not four',
    async () => {
      expect(after.txns - before.txns, 'Unaccounted payments booked').toBe(2);
      expect(after.checks - before.checks, 'checks saved').toBeLessThanOrEqual(3);
      expect(after.checks - before.checks).toBeGreaterThanOrEqual(2);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-14b balance check: a typo is flagged when you leave the field (validate on blur)', async ({ page }) => {
  const F = 'R3-FLOW-14';
  await open(page, '/s/balance-check');
  await settled2(page);
  const box = page.getByRole('textbox').nth(3);
  await box.click();
  await page.keyboard.type('14,65O.87');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  const onBlur = await page.locator('[data-slot="field-error"]').allInnerTexts();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(300);
  const onSave = await page.locator('[data-slot="field-error"]').allInnerTexts();
  note(F, `typo "14,65O.87": messages on blur ${JSON.stringify(onBlur)}, on Save ${JSON.stringify(onSave)}`);
  await step(
    page,
    F,
    3,
    'blur',
    'Type a typo and tab out of the field',
    'the field says "Type the amount in ringgit" when you leave it, as Add expense does (patterns §7: validate on blur and on submit)',
    async () => {
      expect(onBlur.join(' ')).toMatch(/Type the amount in ringgit/);
    },
  );
});

test('R3-FLOW-X4 hostile text: a note and a search with markup, SQL, a path and 5,000 letters stay literal and inside the screen', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R3-FLOW-X4';
  let n = 0;
  const NK = uid('txn:nasi-kandar');
  const hostile = `<img src=x onerror="window.__pwned=1"> '; DROP TABLE txns;-- ../../etc/passwd ${'W'.repeat(400)}`;
  await open(page, `/s/txn?id=${NK}`);
  await settled2(page);
  await page.getByRole('button', { name: /Add a note/ }).click();
  await page.getByRole('textbox', { name: 'Note' }).fill(hostile);
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(700);
  const probe = await page.evaluate(() => ({
    pwned: (window as unknown as { __pwned?: number }).__pwned ?? 0,
    img: document.querySelectorAll('main img[src="x"]').length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    shell: (document.querySelector('div.safe-top') as HTMLElement).scrollLeft,
    shows: document.body.innerText.includes('<img src=x'),
  }));
  note(F, `note: ${JSON.stringify(probe)}`);
  n++;
  await step(
    page,
    F,
    n,
    'note',
    'Save a note full of markup, SQL, a path and 400 W',
    'the text shows literally; no element is created; nothing scrolls sideways',
    async () => {
      expect(probe.pwned).toBe(0);
      expect(probe.img).toBe(0);
      expect(probe.overflowX).toBeLessThanOrEqual(0);
      expect(probe.shell).toBe(0);
      expect(probe.shows).toBe(true);
    },
  );
  await open(page, '/s/payments');
  await settled2(page);
  const search = page.getByRole('searchbox', { name: 'Search payments' });
  const odd = [
    '%',
    '_',
    "'; DROP TABLE txns;--",
    '<script>window.__pwned=1</script>',
    '\\',
    '../../etc/passwd',
    'W'.repeat(5000),
    '🍜',
    '   ',
  ];
  const results: string[] = [];
  for (const q of odd) {
    await search.fill(q);
    const emptyNow = async () =>
      /No payments|Nothing|No match|didn.t find/i.test(await page.locator('main').innerText());
    await expect
      .poll(emptyNow, { timeout: q.trim() ? 4000 : 500 })
      .toBe(true)
      .catch(() => undefined);
    const empty = await emptyNow();
    results.push(`${JSON.stringify(q.slice(0, 20))}: ${empty ? 'empty state' : 'rows'}`);
  }
  const clean = await page.evaluate(() => ({
    pwned: (window as unknown as { __pwned?: number }).__pwned ?? 0,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  note(F, `search: ${results.join(' ; ')} ${JSON.stringify(clean)}`);
  n++;
  await step(
    page,
    F,
    n,
    'search',
    'Search with %, _, SQL, markup, backslash, a path, 5,000 letters, an emoji, spaces',
    'no script runs, nothing scrolls sideways, and each hostile query shows an empty state rather than every payment',
    async () => {
      expect(clean.pwned).toBe(0);
      expect(clean.overflowX).toBeLessThanOrEqual(0);
      for (const r of results.slice(0, 8)) expect(r, r).toMatch(/empty state/);
    },
  );
  expect(w.errors).toEqual([]);
});
