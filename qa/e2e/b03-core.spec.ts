import { expect, test } from '@playwright/test';
import { open, shot, settled, tabs, watch, text } from './b03-helpers';

// FLOW-1, FLOW-2: AC-1, AC-1s, AC-2, AC-3, AC-3s, AC-4, AC-4s, AC-5, AC-5s

test('FLOW-1 tab tour: five tabs in order, Sen button only on tab screens, Back on a tab goes Home', async ({
  page,
}) => {
  const errors = watch(page);
  await open(page, '/');
  const nav = tabs(page);
  const labels = await nav.locator('a, button').allInnerTexts();
  console.log('tab labels:', JSON.stringify(labels));
  await expect(nav).toContainText('Home');
  const order = (await nav.innerText()).replace(/\s+/g, ' ');
  expect(order.indexOf('Home')).toBeLessThan(order.indexOf('Review'));
  expect(order.indexOf('Review')).toBeLessThan(order.indexOf('Scan'));
  expect(order.indexOf('Scan')).toBeLessThan(order.indexOf('Insights'));
  expect(order.indexOf('Insights')).toBeLessThan(order.indexOf('More'));
  await expect(page.getByRole('link', { name: /^Home/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Ask Sen' })).toBeVisible();
  await shot(page, 'FLOW-1-step-1-home');

  // AC-2: badge = Needs you only (12 in the scenario), label "N to review"
  const badge = page.getByTestId('review-badge');
  await expect(badge).toHaveCount(1);
  console.log(
    'badge text:',
    await badge.innerText(),
    '| link label:',
    await page.getByRole('link', { name: /Review/ }).getAttribute('aria-label'),
  );

  for (const [name, url, sen] of [
    ['Review', /\/review/, true],
    ['Insights', /\/insights/, true],
    ['More', /\/more/, true],
  ] as const) {
    await nav.getByRole('link', { name: new RegExp(`^${name}`) }).click();
    await expect(page).toHaveURL(url);
    await settled(page);
    await expect(nav.getByRole('link', { name: new RegExp(`^${name}`) })).toHaveAttribute('aria-current', 'page');
    if (sen) await expect(page.getByRole('button', { name: 'Ask Sen' })).toBeVisible();
    await shot(page, `FLOW-1-step-2-${name.toLowerCase()}`);
  }
  // AC-5: Back on Insights (a non-Home tab root) goes to Home
  await nav.getByRole('link', { name: /^Insights/ }).click();
  await page.goBack();
  await page.waitForTimeout(300);
  console.log('after back from Insights:', page.url());
  expect(errors).toEqual([]);
});

test('AC-4s Sen button is absent on pushed and task screens; AC-1s tab bar hidden on task screens', async ({
  page,
}) => {
  const rows: string[] = [];
  for (const [name, path, bar, sen] of [
    ['payments', '/s/payments', true, false],
    ['budgets', '/s/budgets', true, false],
    ['skipped', '/s/skipped', true, false],
    ['manual', '/s/manual', false, false],
    ['scan', '/scan', false, false],
    ['confirm', '/s/confirm?id=nope', false, false],
  ] as const) {
    await open(page, path);
    const hasBar = (await tabs(page).count()) > 0;
    const hasSen = (await page.getByRole('button', { name: 'Ask Sen' }).count()) > 0;
    rows.push(`${name}: tabbar=${hasBar} (want ${bar}) sen=${hasSen} (want ${sen})`);
  }
  console.log(rows.join('\n'));
  for (const r of rows) {
    const m = /tabbar=(\w+) \(want (\w+)\) sen=(\w+) \(want (\w+)\)/.exec(r)!;
    expect(m[1], r).toBe(m[2]);
    expect(m[3], r).toBe(m[4]);
  }
});

test('FLOW-2 Scan: tap opens scan at once; hold 600 ms opens scan-more; 250 ms hold is a tap', async ({ page }) => {
  await open(page, '/');
  await page.waitForTimeout(800);
  const scanBtn = tabs(page).getByRole('button', { name: 'Scan a receipt' });
  const box = (await scanBtn.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const hold = async (ms: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await hold(650);
  const sheet = page.getByRole('dialog');
  await expect(sheet).toContainText('Scan');
  await expect(sheet).toContainText('From gallery');
  await expect(sheet).toContainText('Add manually');
  await expect(page).not.toHaveURL(/\/scan/);
  await shot(page, 'FLOW-2-step-1-scan-more');
  await sheet.getByRole('button', { name: /Add manually/ }).click();
  await expect(page).toHaveURL(/\/s\/manual/);
  await expect(tabs(page)).toHaveCount(0);
  await shot(page, 'FLOW-2-step-2-add-manually');

  await open(page, '/');
  await page.waitForTimeout(800);
  await page.touchscreen.tap(x, y);
  await expect(page).toHaveURL(/\/scan/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await shot(page, 'FLOW-2-step-3-tap-opens-scan');
  await open(page, '/');
  await page.waitForTimeout(800);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.up();
  await expect(page).toHaveURL(/\/scan/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await shot(page, 'FLOW-2-step-3-short-hold-is-a-tap');
});

test('AC-5 a sheet closes before the screen on Back; AC-4 Sen sheet says Looking at', async ({ page }) => {
  await open(page, '/insights');
  await page.getByRole('button', { name: 'Ask Sen' }).click();
  await expect(page.getByText('Looking at: Insights')).toBeVisible();
  await shot(page, 'FLOW-1-step-3-sen-sheet');
  await page.goBack();
  await expect(page.getByText('Looking at: Insights')).toHaveCount(0);
  await expect(page).toHaveURL(/\/insights/);
});

test('AC-3 From gallery in scan-more: does it get a photo, or dead-end?', async ({ page }) => {
  await open(page, '/');
  await page.waitForTimeout(800);
  const scanBtn = tabs(page).getByRole('button', { name: 'Scan a receipt' });
  const box = (await scanBtn.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 20, y: box.y + 20 }] });
  await page.waitForTimeout(650);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /From gallery/ })
    .click();
  await page.waitForTimeout(500);
  console.log('From gallery lands on:', page.url());
  console.log(await text(page));
  await shot(page, 'FLOW-2-step-4-from-gallery');
  const hasPicker = await page.locator('input[type=file]').count();
  console.log('file inputs on that screen:', hasPicker);
});
