import { expect, test, type Page } from '@playwright/test';
import { db, open, settled } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 scoped re-check, flows M: foreign subscriptions, goal accounts, goal dates, select-all. Dev server (5291).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

const save = (p: Page) => p.getByRole('button', { name: 'Save', exact: true });
const addBtn = (p: Page, name: string) => p.getByRole('button', { name });
const committed = async (p: Page) => {
  const t = await p.getByText('Committed each month').locator('xpath=following-sibling::*[1]').first().innerText();
  const m = /RM([\d,]+)\.(\d{2})/.exec(t)!;
  return Number(m[1]!.replace(/,/g, '')) * 100 + Number(m[2]);
};
// half-up rounding of minor * rate, in integers only (rate '4.2180' is 42180 ten-thousandths)
const approx = (minor: bigint, rate: string) => {
  const r = BigInt(rate.replace('.', ''));
  return Number((minor * r * 2n + 10000n) / 20000n);
};
const rm = (sen: number) => `RM${Math.floor(sen / 100).toLocaleString('en-US')}.${String(sen % 100).padStart(2, '0')}`;

const CASES: [string, string, 'Monthly' | 'Yearly', string][] = [
  ['USD', '1299', 'Monthly', '4.2180'],
  ['SGD', '1000', 'Monthly', '3.2650'],
  ['EUR', '999', 'Monthly', '4.9310'],
  ['GBP', '1', 'Monthly', '5.6420'],
  ['GBP', '9999999999999', 'Monthly', '5.6420'],
  ['EUR', '1299', 'Yearly', '4.9310'],
];

test('R4S-FLOW-1 a foreign subscription added by hand: ≈ ringgit by hand arithmetic, with its source, counted in the month', async ({
  page,
}) => {
  const F = 'R4S-FLOW-1';
  await open(page, '/s/subscriptions');
  await settled(page);
  const lines: string[] = [];
  let n = 0;
  for (const [cur, keys, cadence, rate] of CASES) {
    const before = await committed(page);
    const name = `FX ${cur} ${keys.slice(0, 6)} ${cadence}`;
    await addBtn(page, 'Add a subscription').click();
    await page.getByLabel('Name', { exact: true }).fill(name);
    await page.getByRole('button', { name: cur, exact: true }).click();
    await page.getByLabel('Amount each time', { exact: true }).click();
    await page.keyboard.type(keys);
    await page.getByRole('radio', { name: cadence, exact: true }).click();
    await page.getByLabel('Next renewal', { exact: true }).fill('2026-12-01');
    await save(page).click();
    await page.waitForTimeout(700);
    const row = page.locator('[data-slot="card"]').filter({ hasText: name });
    const text = (await row.innerText()).replace(/\n+/g, ' | ');
    const after = await committed(page);
    const want = approx(BigInt(keys), rate);
    lines.push(
      `${cur} ${keys} ${cadence}: row "${text}"; want ≈ ${rm(want)}; committed ${before} -> ${after} (delta ${after - before})`,
    );
    n++;
    await step(
      page,
      F,
      n,
      `${cur}-${keys.slice(0, 5)}-${cadence.toLowerCase()}`,
      `add ${cur} ${keys} minor units ${cadence}`,
      `row reads ≈ ${rm(want)} with rate ${rate} and BNM 17 Oct; the month rises by that (a twelfth when yearly)`,
      async () => {
        expect(text).toContain(`≈ ${rm(want)}`);
        expect(text).toContain(`rate ${rate}`);
        expect(text).toMatch(/BNM 17 Oct/);
        expect(text).not.toMatch(/NaN|undefined|Infinity/);
        const wantDelta = cadence === 'Yearly' ? Math.round(want / 12) : want;
        expect(Math.abs(after - before - wantDelta)).toBeLessThanOrEqual(1);
      },
    );
  }
  note(F, lines.join('\n'));
});

test('R4S-FLOW-1b a ringgit subscription has no ≈ line; the existing USD one keeps its own rate and source', async ({
  page,
}) => {
  const F = 'R4S-FLOW-1b';
  await open(page, '/s/subscriptions');
  await settled(page);
  const seeded = (await page.locator('[data-slot="card"]').filter({ hasText: 'Claude Pro' }).innerText()).replace(
    /\n+/g,
    ' | ',
  );
  await addBtn(page, 'Add a subscription').click();
  await page.getByLabel('Name', { exact: true }).fill('Plain ringgit');
  await page.getByLabel('Amount each time', { exact: true }).click();
  await page.keyboard.type('1500');
  await page.getByLabel('Next renewal', { exact: true }).fill('2026-12-01');
  await save(page).click();
  await page.waitForTimeout(600);
  const myr = (await page.locator('[data-slot="card"]').filter({ hasText: 'Plain ringgit' }).innerText()).replace(
    /\n+/g,
    ' | ',
  );
  note(F, `seeded: ${seeded}\nmyr: ${myr}`);
  await step(
    page,
    F,
    1,
    'myr',
    'add a ringgit subscription',
    'no "≈" line; the seeded Claude Pro keeps its rate 4.2550 and says where it came from',
    async () => {
      expect(myr).not.toContain('≈');
      expect(seeded).toContain('rate 4.2550');
      expect(seeded).toMatch(/from the last charge|BNM|ECB/);
    },
  );
});

test('R4S-FLOW-2 a goal shows where its money is kept, in the list and on its screen', async ({ page }) => {
  const F = 'R4S-FLOW-2';
  await open(page, '/s/goals');
  await settled(page);
  const seededList = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
  await addBtn(page, 'Add a goal').click();
  await page.getByLabel('Name', { exact: true }).fill('Laptop fund');
  await page.getByLabel('Target', { exact: true }).click();
  await page.keyboard.type('450000');
  const chips = page.locator('[role="group"][aria-labelledby="goal-account"] button');
  const names = await chips.allInnerTexts();
  await chips.nth(1).click();
  await save(page).click();
  await page.waitForTimeout(700);
  const list = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
  note(
    F,
    `account choices ${JSON.stringify(names)}; seeded list: ${seededList.slice(0, 400)}; after add: ${list.slice(0, 600)}`,
  );
  await page.getByText('Laptop fund').first().click();
  await page.waitForTimeout(700);
  const goal = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
  note(F, `goal screen: ${goal}`);
  await step(
    page,
    F,
    1,
    'kept-in',
    'add Laptop fund into the second account; read the list and the goal screen',
    `list says "· in ${names[1]}"; the goal screen has Kept in ${names[1]}`,
    async () => {
      expect(list).toContain(`· in ${names[1]}`);
      expect(seededList).toContain('· in Ryt Bank');
      expect(goal).toContain('Kept in');
      expect(goal).toContain(names[1]!);
    },
  );
});

test('R4S-FLOW-2b Kept in does not overflow at 360 px with 1.5x text', async ({ page }) => {
  const F = 'R4S-FLOW-2b';
  await page.setViewportSize({ width: 360, height: 740 });
  await page.addInitScript(() => localStorage.setItem('sen.dev.textScale', '1.5'));
  await open(page, '/s/goals', 'firefly', 'dark');
  await settled(page);
  const listOver = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  const cut = await page
    .locator('main span.num, main span')
    .evaluateAll((els) =>
      els
        .filter(
          (e) => /· in /.test(e.textContent ?? '') && e.children.length === 0 && e.scrollWidth > e.clientWidth + 1,
        )
        .map((e) => e.textContent),
    );
  await page.getByText('Japan in spring').first().click();
  await page.waitForTimeout(700);
  const over = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll('main *'))
      .filter(
        (e) => e.children.length === 0 && (e.textContent ?? '').trim() && e.getBoundingClientRect().right > vw + 1,
      )
      .map((e) => e.textContent!.slice(0, 30));
  });
  note(
    F,
    `list scroll overflow ${listOver}; cut: ${JSON.stringify(cut)}; goal screen past the edge: ${JSON.stringify(over)}`,
  );
  await step(
    page,
    F,
    1,
    'narrow',
    'Goals and a goal at 360 px, 1.5x text',
    'nothing cut, nothing past the edge',
    async () => {
      expect(listOver).toBeLessThanOrEqual(0);
      expect(cut).toEqual([]);
      expect(over).toEqual([]);
    },
  );
});

// the app's fixed clock says Sunday 18 Oct 2026, 8:40 pm in Kuala Lumpur
for (const tz of ['Asia/Kuala_Lumpur', 'Pacific/Kiritimati', 'America/Los_Angeles']) {
  test(`R4S-FLOW-3 a goal's date must be after today, in KL days (browser in ${tz})`, async ({ browser }) => {
    const F = `R4S-FLOW-3-${tz.split('/')[1]!.toLowerCase().replace('_', '')}`;
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      timezoneId: tz,
      isMobile: true,
      hasTouch: true,
      baseURL: 'http://127.0.0.1:5291',
      serviceWorkers: 'block',
    });
    const page = await ctx.newPage();
    await open(page, '/s/goals');
    await settled(page);
    const names = (p: Page) =>
      db<string>(p, '(d) => JSON.stringify(d.goals.map(g=>g.name))').then((s) => JSON.parse(s) as string[]);
    const attempt = async (label: string, date: string) => {
      await addBtn(page, 'Add a goal').click();
      await page.getByLabel('Name', { exact: true }).fill(label);
      await page.getByLabel('Target', { exact: true }).click();
      await page.keyboard.type('10000');
      if (date) await page.getByLabel('By when (optional)', { exact: true }).fill(date);
      await page.locator('[role="group"][aria-labelledby="goal-account"] button').first().click();
      const b = (await save(page).boundingBox())!;
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(40);
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(700);
      const refused = await page.getByText('Pick a day after today.').count();
      const inv = await page.locator('#goal-by[aria-invalid="true"]').count();
      const stored = (await names(page)).filter((x) => x === label).length;
      if (refused) await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      return { refused, inv, stored };
    };
    const rows: Record<string, unknown> = {};
    rows.yesterday = await attempt('G yesterday', '2026-10-17');
    rows.today = await attempt('G today', '2026-10-18');
    rows.tomorrow = await attempt('G tomorrow', '2026-10-19');
    rows.none = await attempt('G none', '');
    note(F, JSON.stringify(rows));
    await step(
      page,
      F,
      1,
      'dates',
      'try yesterday, today, tomorrow and no date (each saved with two taps)',
      'yesterday and today refused beside the field and not stored; tomorrow and none stored once',
      async () => {
        expect(rows.yesterday).toMatchObject({ refused: 1, inv: 1, stored: 0 });
        expect(rows.today).toMatchObject({ refused: 1, inv: 1, stored: 0 });
        expect(rows.tomorrow).toMatchObject({ refused: 0, stored: 1 });
        expect(rows.none).toMatchObject({ refused: 0, stored: 1 });
      },
    );
    await ctx.close();
  });
}
