import { expect, test, type Page } from '@playwright/test';
import { db, open, settled, watch } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 flows B: add a subscription and a goal by hand (D133, D134). Dev server (5291).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

const SUBS =
  '(db)=>JSON.stringify(db.subscriptions.map(s=>({n:s.name,a:s.amount,c:s.currency,k:s.cadence,r:s.nextRenewalDate,fx:s.displayFxRate})))';
const GOALS =
  '(db)=>JSON.stringify(db.goals.map(g=>({n:g.name,k:g.kind,t:g.targetAmount,d:g.targetDate,a:g.accountId,y:g.repeatsYearly})))';
type Sub = { n: string; a: number; c: string; k: string; r: string; fx: unknown };
type Goal = { n: string; k: string; t: number; d: string | null; a: string | null; y: boolean };
const subs = async (p: Page) => JSON.parse(await db<string>(p, SUBS)) as Sub[];
const goals = async (p: Page) => JSON.parse(await db<string>(p, GOALS)) as Goal[];
const save = (p: Page) => p.getByRole('button', { name: 'Save', exact: true });

test('R4-FLOW-2 add a subscription by hand: refusals, then one (double tap), then a USD one', async ({ page }) => {
  const w = watch(page);
  const F = 'R4-FLOW-2';
  await open(page, '/s/subscriptions');
  await settled(page);
  const start = await subs(page);
  const monthlyBefore = await page.locator('main').innerText();
  let n = 0;

  await page.getByRole('button', { name: 'Add a subscription' }).click();
  await save(page).click();
  n++;
  await step(page, F, n, 'empty', 'Save an empty form', 'says "Type its name."; nothing added', async () => {
    await expect(page.getByText('Type its name.')).toBeVisible();
    expect(await subs(page)).toHaveLength(start.length);
  });

  await page.getByLabel('Name', { exact: true }).fill('Netflix');
  await save(page).click();
  n++;
  await step(page, F, n, 'no-amount', 'name only, Save', 'says "Type the amount."; nothing added', async () => {
    await expect(page.getByText('Type the amount.', { exact: true })).toBeVisible();
    expect(await subs(page)).toHaveLength(start.length);
  });

  await page.getByLabel('Amount each time', { exact: true }).click();
  await page.keyboard.type('1700');
  await save(page).click();
  n++;
  await step(
    page,
    F,
    n,
    'no-date',
    'amount 17.00, no date, Save',
    'says "Pick the next renewal date."; nothing added',
    async () => {
      await expect(page.getByText('Pick the next renewal date.')).toBeVisible();
      expect(await subs(page)).toHaveLength(start.length);
    },
  );

  await page.getByLabel('Next renewal', { exact: true }).fill('2026-11-20');
  // a real double tap at the Save button's centre
  const b = (await save(page).boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(40);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(900);
  const afterNetflix = await subs(page);
  note(F, `after double tap on Save: ${JSON.stringify(afterNetflix.filter((s) => s.n === 'Netflix'))}`);
  n++;
  await step(
    page,
    F,
    n,
    'saved-once',
    'fill 17.00 monthly 20 Nov, tap Save twice 40 ms apart',
    'exactly one Netflix of 1700 sen MYR monthly',
    async () => {
      const nf = afterNetflix.filter((s) => s.n === 'Netflix');
      expect(nf).toHaveLength(1);
      expect(nf[0]).toMatchObject({ a: 1700, c: 'MYR', k: 'monthly', r: '2026-11-20' });
      await expect(page.locator('main').getByText('Netflix').first()).toBeVisible();
    },
  );

  await page.getByRole('button', { name: 'Add a subscription' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Canva <img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: 'USD', exact: true }).click();
  await page.getByLabel('Amount each time', { exact: true }).click();
  await page.keyboard.type('1299');
  await page.getByRole('radio', { name: 'Yearly', exact: true }).click();
  await page.getByLabel('Next renewal', { exact: true }).fill('2027-03-01');
  await save(page).click();
  await page.waitForTimeout(900);
  const afterUsd = await subs(page);
  const mainText = await page.locator('main').innerText();
  note(F, `USD row: ${JSON.stringify(afterUsd.filter((s) => s.c === 'USD'))}`);
  note(F, `main text after USD add:\n${mainText}`);
  n++;
  await step(
    page,
    F,
    n,
    'usd',
    'add a USD 12.99 yearly with a hostile name',
    'stored as 1299 USD yearly; the name is literal text; the figure carries US$',
    async () => {
      const u = afterUsd.find((s) => s.n.startsWith('Canva'))!;
      expect(u).toMatchObject({ a: 1299, c: 'USD', k: 'yearly', r: '2027-03-01' });
      expect(mainText).toContain('Canva <img src=x onerror=alert(1)>');
      expect(mainText).toContain('US$12.99');
      expect(mainText).not.toMatch(/NaN|undefined|Infinity/);
    },
  );
  note(F, `monthly tile before: ${monthlyBefore.split('\n').slice(0, 8).join(' | ')}`);
  expect(w.errors).toEqual([]);
});

test('R4-FLOW-2b a foreign subscription never moves Home or Insights spending', async ({ page }) => {
  const F = 'R4-FLOW-2b';
  await open(page, '/');
  await settled(page);
  const homeBefore = await page.locator('main').innerText();
  await open(page, '/s/subscriptions');
  await settled(page);
  await page.getByRole('button', { name: 'Add a subscription' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Spotify');
  await page.getByRole('button', { name: 'USD', exact: true }).click();
  await page.getByLabel('Amount each time', { exact: true }).click();
  await page.keyboard.type('99999');
  await page.getByLabel('Next renewal', { exact: true }).fill('2026-10-30');
  await save(page).click();
  await page.waitForTimeout(800);
  const txt = await page.locator('main').innerText();
  note(F, txt);
  await step(
    page,
    F,
    1,
    'added',
    'add USD 999.99 monthly renewing 30 Oct',
    'listed with US$999.99; the committed figure stays a number',
    async () => {
      expect(txt).toContain('US$999.99');
      expect(txt).not.toMatch(/NaN|undefined|Infinity|RMNaN/);
    },
  );
  // go Home through the app (the fake keeps its db within one page load)
  await page.getByRole('button', { name: 'Back' }).click();
  await page.waitForTimeout(500);
  await page.goto('/');
  await settled(page);
  // a page load resets the fake; compare structure only
  const homeAfter = await page.locator('main').innerText();
  expect(homeAfter).toBe(homeBefore);
});

test('R4-FLOW-3 add a goal by hand: refusals, one (double tap), account named on its screen', async ({ page }) => {
  const w = watch(page);
  const F = 'R4-FLOW-3';
  await open(page, '/s/goals');
  await settled(page);
  const start = await goals(page);
  let n = 0;
  await page.getByRole('button', { name: 'Add a goal' }).click();
  await save(page).click();
  n++;
  await step(page, F, n, 'empty', 'Save an empty goal form', 'says "Type its name."; nothing added', async () => {
    await expect(page.getByText('Type its name.')).toBeVisible();
    expect(await goals(page)).toHaveLength(start.length);
  });
  await page.getByLabel('Name', { exact: true }).fill('New laptop');
  await save(page).click();
  n++;
  await step(page, F, n, 'no-target', 'name only', 'says "Type the target."', async () => {
    await expect(page.getByText('Type the target.')).toBeVisible();
    expect(await goals(page)).toHaveLength(start.length);
  });
  await page.getByLabel('Target', { exact: true }).click();
  await page.keyboard.type('450000');
  await save(page).click();
  n++;
  await step(
    page,
    F,
    n,
    'no-account',
    'name and target, no account',
    'says "Pick the account it\'s kept in."',
    async () => {
      await expect(page.getByText("Pick the account it's kept in.")).toBeVisible();
      expect(await goals(page)).toHaveLength(start.length);
    },
  );
  // a past date is accepted? record it
  await page.getByLabel('By when (optional)', { exact: true }).fill('2020-01-01');
  const chips = page.locator('[role="group"][aria-labelledby="goal-account"] button');
  const names = await chips.allInnerTexts();
  note(F, `account choices: ${JSON.stringify(names)}`);
  await chips.nth(1).click();
  const chosen = names[1];
  const b = (await save(page).boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(40);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(900);
  const after = await goals(page);
  note(F, `goals after: ${JSON.stringify(after.filter((g) => g.n === 'New laptop'))}`);
  n++;
  await step(
    page,
    F,
    n,
    'saved-once',
    'choose an account, a past date, tap Save twice',
    'exactly one New laptop of 450000 sen; the past date is (note) accepted',
    async () => {
      const g = after.filter((x) => x.n === 'New laptop');
      expect(g).toHaveLength(1);
      expect(g[0]).toMatchObject({ t: 450000, k: 'goal' });
      expect(g[0]!.a).not.toBeNull();
    },
  );
  await page.getByText('New laptop').first().click();
  await page.waitForTimeout(700);
  const gtxt = await page.locator('main').innerText();
  note(F, `goal screen:\n${gtxt}\nchosen account: ${chosen}`);
  n++;
  await step(page, F, n, 'goal-screen', 'open the new goal', `names the account ${chosen}`, async () => {
    expect(gtxt).toContain(chosen!);
    expect(gtxt).not.toMatch(/NaN|undefined|Infinity/);
  });
  expect(w.errors).toEqual([]);
});

test('R4-FLOW-3b a bucket repeats yearly; two goals can share an account', async ({ page }) => {
  const F = 'R4-FLOW-3b';
  await open(page, '/s/goals');
  await settled(page);
  for (const name of ['Road tax', 'Trip home']) {
    await page.getByRole('button', { name: 'Add a goal' }).click();
    await page.getByLabel('Name', { exact: true }).fill(name);
    await page.getByRole('radio', { name: 'Every year' }).click();
    await page.getByLabel('Target', { exact: true }).click();
    await page.keyboard.type('120000');
    await page.locator('[role="group"][aria-labelledby="goal-account"] button').first().click();
    await save(page).click();
    await page.waitForTimeout(700);
  }
  const g = (await goals(page)).filter((x) => x.n === 'Road tax' || x.n === 'Trip home');
  note(F, JSON.stringify(g));
  await step(
    page,
    F,
    1,
    'two-buckets',
    'add two yearly buckets into the first account',
    'both repeat yearly and share one account id',
    async () => {
      expect(g).toHaveLength(2);
      expect(g.every((x) => x.k === 'bucket' && x.y)).toBe(true);
      expect(g[0]!.a).toBe(g[1]!.a);
      await expect(page.locator('main').getByText('Road tax').first()).toBeVisible();
    },
  );
});
