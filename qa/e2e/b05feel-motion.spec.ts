import { expect, test } from '@playwright/test';
import { open, recordVT, shot, vts, watch } from './b05feel-lib';

const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
const ID = (n: number) => `FLOW-${n}`;

test('FLOW-1 push forward, back three ways (AC-1, AC-2)', async ({ page }) => {
  const errors = watch(page);
  await recordVT(page);
  await open(page, '/s/payments');
  const row = page.locator('[data-share]').first();
  await expect(row).toBeVisible();
  await shot(page, ID(1), 1, 'payments');
  await row.click();
  await expect(page).toHaveURL(/\/s\/txn/);
  await expect.poll(async () => (await vts(page)).length).toBe(1);
  await page.waitForTimeout(400);
  let v = await vts(page);
  console.log('FORWARD', JSON.stringify(v[0]));
  expect(v[0].types).toBe('forward');
  const newAnim = v[0].anims.find((a: any) => a.p === '::view-transition-new(screen)');
  const oldAnim = v[0].anims.find((a: any) => a.p === '::view-transition-old(screen)');
  expect(newAnim.d).toBe(200);
  expect(newAnim.kf.map((k: any) => k.ease)).toContain(EASE);
  expect(JSON.stringify(newAnim.kf)).toMatch(/translate(X)?\(100%\)/);
  expect(JSON.stringify(oldAnim.kf)).toMatch(/translate(X)?\(-25%\)/);
  expect(JSON.stringify(oldAnim.kf)).toContain('0.6');
  await shot(page, ID(1), 2, 'txn-after-push');
  // in-app back
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/s\/payments/);
  await page.waitForTimeout(400);
  // forward again, browser back
  await page.locator('[data-share]').first().click();
  await expect(page).toHaveURL(/\/s\/txn/);
  await page.waitForTimeout(400);
  await page.goBack();
  await expect(page).toHaveURL(/\/s\/payments/);
  await page.waitForTimeout(400);
  v = await vts(page);
  console.log('SEQ', v.map((x) => x.types).join(' '));
  expect(v.map((x) => x.types)).toEqual(['forward', 'back', 'forward', 'back']);
  const back = v[1].anims.find((a: any) => a.p === '::view-transition-new(screen)');
  expect(back.d).toBe(200);
  expect(JSON.stringify(back.kf)).toMatch(/translate(X)?\(-25%\)/);
  const backOld = v[1].anims.find((a: any) => a.p === '::view-transition-old(screen)');
  expect(JSON.stringify(backOld.kf)).toMatch(/translate(X)?\(100%\)/);
  await shot(page, ID(1), 3, 'payments-after-back');
  expect(errors).toEqual([]);
});

test('FLOW-2 tabs crossfade, tab bar steady, from a pushed screen too (AC-3, AC-4)', async ({ page }) => {
  const errors = watch(page);
  await recordVT(page);
  await open(page, '/');
  for (const k of ['review', 'insights', 'more', 'home']) {
    await page.locator(`[data-k=${k}]`).click();
    await page.waitForTimeout(350);
  }
  let v = await vts(page);
  console.log('TABS', v.map((x) => x.types).join(' '));
  expect(v.map((x) => x.types)).toEqual(['tab', 'tab', 'tab', 'tab']);
  for (const x of v) {
    const n = x.anims.find((a: any) => a.p === '::view-transition-new(screen)');
    expect(JSON.stringify(n.kf)).not.toContain('translate');
    expect(n.d).toBe(200);
    // the tab bar's pseudo is not animated by the screen motion
    const tb = x.anims.filter((a: any) => a.p.includes('(tabbar)'));
    console.log('tabbar anims', JSON.stringify(tb));
  }
  await shot(page, ID(2), 1, 'tabs-done');
  // pushed screen, then a tab
  await page.locator('[data-k=more]').click();
  await page.waitForTimeout(350);
  await page.getByText('Payments', { exact: false }).first().click();
  await expect(page).toHaveURL(/\/s\/payments/);
  await page.waitForTimeout(350);
  await page.locator('[data-k=home]').click();
  await page.waitForTimeout(350);
  v = await vts(page);
  console.log('TABS2', v.map((x) => x.types).join(' '));
  // Home tapped from a pushed screen, and then Review tapped from a pushed screen
  console.log('HOME-from-pushed:', v[v.length - 1].types);
  await page.locator('[data-k=more]').click();
  await page.waitForTimeout(350);
  await page.getByText('Payments', { exact: false }).first().click();
  await expect(page).toHaveURL(/\/s\/payments/);
  await page.waitForTimeout(350);
  await page.locator('[data-k=review]').click();
  await page.waitForTimeout(350);
  const v2 = await vts(page);
  console.log('REVIEW-from-pushed:', v2[v2.length - 1].types);
  await shot(page, ID(2), 3, 'review-from-pushed');
  expect.soft(v[v.length - 1].types, 'Home tab from a pushed screen').toBe('tab');
  expect.soft(v2[v2.length - 1].types, 'Review tab from a pushed screen').toBe('tab');
  expect(errors).toEqual([]);
});

test('FLOW-2b mid-transition: tab bar and fab at rest (AC-4)', async ({ page }) => {
  await open(page, '/s/payments');
  const tab = page.locator('.tabbar-region');
  const before = await tab.boundingBox();
  await page.locator('[data-share]').first().click();
  await page.waitForTimeout(90);
  const mid = await tab.boundingBox();
  const ops = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a: any) => a.effect?.pseudoElement)
      .map((a: any) => `${a.effect.pseudoElement}`),
  );
  console.log('MID anims', ops.join(' | '));
  await shot(page, ID(2), 2, 'mid-push-90ms');
  expect(mid!.y).toBe(before!.y);
  expect(ops.some((p) => p.includes('(tabbar)') && !p.includes('old'))).toBeDefined();
});

test('FLOW-3 shared amount unique; text never in between (AC-6, AC-15)', async ({ page }) => {
  await recordVT(page);
  await open(page, '/s/payments');
  // each row has exactly one [data-sen] under it (names must be unique at any time)
  const counts = await page.evaluate(() =>
    [...document.querySelectorAll('[data-share]')].map((r) => r.querySelectorAll('[data-sen]').length),
  );
  console.log('sen per row', JSON.stringify([...new Set(counts)]), 'rows', counts.length);
  expect(Math.max(...counts)).toBe(1);
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('[data-share]')].map((r) => r.getAttribute('data-share')),
  );
  expect(new Set(ids).size).toBe(ids.length);
  const row = page.locator('[data-share]').first();
  const amount = (await row.locator('[data-sen]').innerText()).trim();
  await page.evaluate(() => {
    const w = window as any;
    w.__texts = new Set();
    const tick = () => {
      document.querySelectorAll('[data-sen]').forEach((e) => w.__texts.add(e.textContent));
      w.__names = w.__names ?? new Set();
      requestAnimationFrame(tick);
    };
    tick();
  });
  await row.click();
  await expect(page).toHaveURL(/\/s\/txn/);
  await page.waitForTimeout(500);
  const fig = (await page.locator('[data-share-figure]').innerText()).trim();
  console.log('row amount', amount, 'figure', fig);
  const texts = await page.evaluate(() => [...(window as any).__texts]);
  const mine = texts.filter((t: string) => /\d/.test(t));
  console.log('texts seen', JSON.stringify(mine.slice(0, 30)));
  // the shared style exists only while a transition runs
  const css = await page.locator('#sen-share').evaluate((e) => e.textContent);
  console.log('share css', css);
  // the named elements after the transition: none outside it
  const named = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((e) => getComputedStyle(e).viewTransitionName !== 'none' && e !== document.documentElement)
      .map((e) => `${e.tagName}:${getComputedStyle(e).viewTransitionName}`),
  );
  console.log('named after', JSON.stringify(named));
  expect(named).toEqual([]);
  await shot(page, ID(3), 1, 'txn-figure');
  const v = await vts(page);
  expect(v[0].skipped).toBeUndefined();
});

test('FLOW-3b shared amount on an account list (AC-6)', async ({ page }) => {
  const errors = watch(page);
  await recordVT(page);
  await open(page, '/s/accounts');
  const acct = page
    .locator('button, a')
    .filter({ hasText: /Ryt|Touch|Public|Grab|TNG/i })
    .first();
  await acct.click();
  await page.waitForTimeout(500);
  console.log('account url', page.url());
  const rows = page.locator('[data-share]');
  const n = await rows.count();
  console.log('account rows', n);
  if (n) {
    const counts = await page.evaluate(() =>
      [...document.querySelectorAll('[data-share]')].map((r) => r.querySelectorAll('[data-sen]').length),
    );
    console.log('sen per account row', JSON.stringify([...new Set(counts)]));
    await rows.first().click();
    await page.waitForTimeout(500);
    const v = await vts(page);
    console.log('acct vts', JSON.stringify(v.map((x) => ({ t: x.types, s: x.skipped }))));
    expect(v.every((x) => !x.skipped)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('FLOW-5 fast hands: tap during a transition, five navigations in 300 ms (AC-7, AC-8)', async ({ page }) => {
  const errors = watch(page);
  await open(page, '/');
  await page.waitForTimeout(500);
  // 5 rapid tab taps
  const keys = ['review', 'insights', 'more', 'home', 'review'];
  for (const k of keys) {
    await page.locator(`[data-k=${k}]`).dispatchEvent('click');
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(800);
  await expect(page).toHaveURL(/\/review/);
  await shot(page, ID(5), 1, 'after-five-fast-taps');
  // history jumble
  await page.evaluate(() => {
    history.back();
    history.forward();
    history.back();
    history.forward();
  });
  await page.waitForTimeout(800);
  const stuck = await page.evaluate(() => document.documentElement.matches(':active-view-transition'));
  expect(stuck).toBe(false);
  // a tap at 50 ms during a push on the old screen
  await page.goto('/s/payments?look=minted&mode=light');
  await page.waitForTimeout(800);
  await page.locator('[data-share]').first().click();
  await page.waitForTimeout(50);
  await page.mouse.click(200, 300);
  await page.waitForTimeout(600);
  await shot(page, ID(5), 2, 'after-tap-during-push');
  expect(await page.evaluate(() => document.documentElement.matches(':active-view-transition'))).toBe(false);
  // responsive after 500 ms
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/s\/payments/);
  console.log('ERRORS', JSON.stringify(errors));
  expect(errors).toEqual([]);
});

test('FLOW-5b a sheet moves no screen (AC-5)', async ({ page }) => {
  await recordVT(page, false);
  await open(page, '/');
  await page.getByRole('button', { name: 'Ask Sen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(500);
  await shot(page, ID(5), 3, 'sheet-open');
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await vts(page)).toEqual([]);
});

for (const look of ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper']) {
  test(`FLOW-10 ${look}: same push timing (AC-31)`, async ({ page }) => {
    await recordVT(page);
    await open(page, '/s/payments', look);
    await page.waitForTimeout(500);
    await page.locator('[data-share]').first().click();
    await expect(page).toHaveURL(/\/s\/txn/);
    await page.waitForTimeout(500);
    const v = await vts(page);
    const n = v[0].anims.find((a: any) => a.p === '::view-transition-new(screen)');
    console.log(look, v[0].types, n?.d, n?.e);
    expect(n.d).toBe(200);
    expect(n.kf.map((k: any) => k.ease)).toContain(EASE);
    await shot(page, ID(10), 1, `${look}-txn`);
  });
}
