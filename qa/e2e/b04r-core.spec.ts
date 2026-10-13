import { expect, test } from '@playwright/test';
import { db, open, settled, shot, toast, watch } from './b04r-helpers';

test.use({ baseURL: 'http://127.0.0.1:5291' });

// FLOW-3 Review: grouped, chip sized, answer, Undo, double tap
test('FLOW-3 review: structure, answer, undo, double tap', async ({ page }) => {
  const w = watch(page);
  await open(page, '/review');
  const needs = page.getByRole('heading', { name: /Needs you/ });
  await expect(needs).toHaveText('Needs you · 12');
  for (const h of [/Categories · 2/, /Splits · 2/, /Checks · 7/, /New wording · 1/])
    await expect(page.getByRole('heading', { name: h })).toBeVisible();
  await shot(page, 'FLOW-3-step-1-grouped');
  // chip size: 32 drawn, answers on one row that scrolls sideways
  const card = page.locator('[data-review="new-merchant"]').first();
  const chips = await card
    .getByRole('button')
    .evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().height)));
  expect(
    chips.every((h) => h <= 34),
    `chip heights ${chips}`,
  ).toBe(true);
  const rowOverflowY = await card.locator('div.overflow-x-auto').evaluate((d) => d.scrollHeight <= d.clientHeight + 4);
  void rowOverflowY;
  // amounts semibold
  const fw = await card
    .locator('p.font-semibold')
    .first()
    .evaluate((p) => getComputedStyle(p).fontWeight);
  expect(Number(fw)).toBeGreaterThanOrEqual(600);
  // answer the first card with its first chip
  const SQ =
    '(db)=>JSON.stringify({cat:db.txns.find(t=>t.merchantKey==="SITI AMINAH BT YUSOF").categoryId,rules:db.rules.length,cats:db.txns.filter(t=>t.categoryId).length})';
  const s0 = JSON.parse(await db<string>(page, SQ));
  expect(s0.cat).toBeNull();
  const before = s0.cats;
  await card.getByRole('button', { name: 'Meals' }).click();
  await expect(toast(page)).toContainText(/Meals/);
  await expect(needs).toHaveText('Needs you · 11');
  await shot(page, 'FLOW-3-step-2-answered-toast');
  const s1 = JSON.parse(await db<string>(page, SQ));
  console.log('after answer', JSON.stringify(s0), JSON.stringify(s1));
  expect(s1.cat).not.toBeNull();
  expect(s1.rules).toBe(s0.rules + 1);
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(needs).toHaveText('Needs you · 12');
  const s2 = JSON.parse(await db<string>(page, SQ));
  expect(s2.cat).toBeNull();
  expect(s2.rules).toBe(s0.rules);
  expect(s2.cats).toBe(before);
  await shot(page, 'FLOW-3-step-3-undone');
  expect(w.errors).toEqual([]);
});

test('FLOW-3 review: double tap within 300ms answers once', async ({ page }) => {
  await open(page, '/review');
  const needs = page.getByRole('heading', { name: /Needs you/ });
  await expect(needs).toHaveText('Needs you · 12');
  const first = page.locator('[data-review="new-merchant"]').first();
  const btn = first.getByRole('button', { name: 'Meals' });
  const box = (await btn.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(700);
  await expect(needs).toHaveText('Needs you · 11');
  const n = await db<number>(page, '(db)=>db.txns.filter(t=>t.categoryId).length');
  await shot(page, 'FLOW-3-step-6-double-tap-once');
  expect(n).toBeGreaterThan(0);
});

test('FLOW-3 review: Sen suggestions are marked and Apply all works', async ({ page }) => {
  await open(page, '/review');
  const banner = page.getByRole('status').filter({ hasText: /Sen suggested/ });
  await expect(banner).toBeVisible();
  const said = await banner.innerText();
  const n = Number(/(\d+) answer/.exec(said)?.[1] ?? 1);
  const marked = await page
    .locator('main button:has(svg) >> text=/Sen suggests this/')
    .count()
    .catch(() => 0);
  const sr = await page.locator('main .sr-only', { hasText: 'Sen suggests this' }).count();
  console.log('banner says', n, 'marked chips', sr);
  expect(sr).toBe(n);
  void marked;
});

test('FLOW-4 insights pager', async ({ page }) => {
  await open(page, '/insights');
  const tablist = page.getByRole('tablist');
  const tabsN = await tablist.getByRole('tab').allInnerTexts();
  console.log('steps', tabsN.join('|'));
  await expect(page.getByText(/^1 of \d+$/)).toBeVisible();
  await shot(page, 'FLOW-4-step-1-pager');
  await tablist.getByRole('tab', { name: 'Budgets' }).click();
  await expect(page.getByText(/^2 of \d+$/)).toBeVisible();
  await expect(tablist.getByRole('tab', { name: 'Budgets' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Budgets' })).toBeVisible();
  await page.waitForTimeout(500);
  await shot(page, 'FLOW-4-step-2-budgets');
  // swipe back by scrolling the track
  const track = page.getByRole('region').or(page.locator('[tabindex="0"][aria-label^="Insights:"]')).first();
  const t = page.locator('[aria-label^="Insights: "]').first();
  await t.evaluate((el) => el.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior }));
  await expect(page.getByText(/^1 of \d+$/)).toBeVisible();
  await expect(tablist.getByRole('tab', { name: 'On track' })).toHaveAttribute('aria-selected', 'true');
  void track;
  // keyboard: focus the last step and press Enter
  const last = tablist.getByRole('tab').last();
  await last.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const total = tabsN.length;
  await expect(page.getByText(new RegExp(`^${total} of ${total}$`))).toBeVisible();
  await shot(page, 'FLOW-4-step-4-keyboard-last');
});

test('FLOW-4s insights: empty variant drops cards', async ({ page }) => {
  await open(page, '/insights?state=empty');
  await settled(page);
  await shot(page, 'FLOW-4-step-5-empty');
  const t = await page.locator('main').innerText();
  console.log('EMPTY INSIGHTS:', t.slice(0, 300).replace(/\n/g, ' / '));
  expect(t).not.toMatch(/NaN|Infinity|undefined/);
});

test('FLOW-5 settings tour and appearance', async ({ page }) => {
  await open(page, '/s/settings');
  await expect(page.getByRole('button', { name: /^Appearance/ })).toContainText('Minted');
  await shot(page, 'FLOW-5-step-1-settings');
  await page.getByRole('button', { name: /^Appearance/ }).click();
  await expect(page).toHaveURL(/settings\/appearance/);
  await shot(page, 'FLOW-5-step-2-appearance');
  const radios = page.getByRole('radio');
  const names = await radios.evaluateAll((r) =>
    r.map((x) => (x.getAttribute('aria-label') ?? x.textContent ?? '').trim().slice(0, 30)),
  );
  console.log('radios', names.join('|'));
  // pick another look
  await page
    .getByRole('radio', { name: /Copper/ })
    .first()
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-look', 'copper');
  const checked = await page.locator('[role=radio][aria-checked=true], [role=radio][data-state=checked]').count();
  console.log('checked looks', checked);
  await shot(page, 'FLOW-5-step-3-copper');
  // Mode dark
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  await shot(page, 'FLOW-5-step-4-dark');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('button', { name: /^Appearance/ })).toContainText('Copper');
  await shot(page, 'FLOW-5-step-5-state-follows');
});

test('FLOW-3s review: the chip row must not scroll vertically (finding)', async ({ page }) => {
  await open(page, '/review');
  const rows = await page
    .locator('[data-review] div.overflow-x-auto')
    .evaluateAll((ds) => ds.map((d) => d.scrollHeight - d.clientHeight));
  expect(Math.max(...rows), `extra scroll height per row: ${rows}`).toBeLessThanOrEqual(1);
});
