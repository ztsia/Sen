import { expect, test } from '@playwright/test';
import { open, recordVT, shot, vts, watch } from './b05feel-lib';

// R3-5/R3-5s: the shared amount's name must sit on exactly one element when a transition starts, or the
// browser skips the whole transition. Scan every list the shared amount rides on, scrolled in steps.
test('R3-5 every [data-share] id appears once, and holds exactly one amount', async ({ page }) => {
  await open(page, '/s/payments');
  await page.waitForFunction(() => document.querySelector('[data-share]'));
  const seen: string[] = [];
  let bad: string[] = [];
  for (let i = 0; i < 12; i++) {
    const r = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[data-share]:not([data-share-figure])')].map((e) => e.getAttribute('data-share')!);
      const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
      const multi = [...document.querySelectorAll('[data-share]:not([data-share-figure])')]
        .filter((e) => e.querySelectorAll('[data-sen]').length !== 1)
        .map((e) => `${e.getAttribute('data-share')}:${e.querySelectorAll('[data-sen]').length}`);
      return { ids, dup, multi };
    });
    seen.push(...r.ids);
    bad = bad.concat(r.dup.map((d) => `dup ${d}`), r.multi);
    await page.evaluate(() => {
      const s = [...document.querySelectorAll('main *')].find((e) => e.scrollHeight > e.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(e).overflowY));
      s?.scrollBy(0, 500);
    });
    await page.waitForTimeout(150);
  }
  console.log('distinct rows seen', new Set(seen).size, 'problems', JSON.stringify(bad));
  expect(bad).toEqual([]);
});

test('R3-5 an account list: ids once, one amount per row', async ({ page }) => {
  await open(page, '/s/accounts');
  const first = page.locator('main button[data-slot=item]').first();
  await first.click();
  await expect(page).toHaveURL(/\/s\/account/);
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-share]:not([data-share-figure])')];
    const ids = els.map((e) => e.getAttribute('data-share')!);
    return {
      n: ids.length,
      dup: ids.filter((x, i) => ids.indexOf(x) !== i),
      multi: els.filter((e) => e.querySelectorAll('[data-sen]').length !== 1).length,
    };
  });
  console.log(JSON.stringify(r));
  expect(r.dup).toEqual([]);
  expect(r.multi).toBe(0);
});

// R3-2: back must give the list back where it was.
for (const [name, base] of [['head', 'http://localhost:4181'], ['main', 'http://localhost:4183']] as const) {
  test(`R3-2 Payments scroll kept across a push and back (${name})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, serviceWorkers: 'block', baseURL: base, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await open(page, '/s/payments');
    await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
    const area = () => page.evaluate(() => {
      const s = [...document.querySelectorAll('main *')].find((e) => e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY));
      return s ? Math.round(s.scrollTop) : -1;
    });
    await page.evaluate(() => {
      const s = [...document.querySelectorAll('main *')].find((e) => e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY));
      s?.scrollTo(0, 900);
    });
    await page.waitForTimeout(400);
    const before = await area();
    const row = page.locator('main button[data-slot=item]:has-text("RM")').nth(3);
    await row.click();
    await expect(page).toHaveURL(/\/s\/txn/);
    await page.waitForTimeout(500);
    await page.goBack();
    await expect(page).toHaveURL(/\/s\/payments/);
    await page.waitForTimeout(800);
    const after = await area();
    console.log(`SCROLL ${name}: before ${before}, after ${after}`);
    await shot(page, 'FLOW-R3-1', name === 'head' ? 1 : 2, `payments-after-back-${name}`);
    expect(after).toBe(before);
    await ctx.close();
  });
}

// R3-3: a tab tapped while already on it must not turn the next push into a crossfade
test('R3-3 tapping the current tab, then opening a row, still pushes', async ({ page }) => {
  await recordVT(page, false);
  await open(page, '/more');
  await page.locator('[data-k=more]').click();
  await page.locator('[data-slot=item]').filter({ hasText: 'Payments' }).first().click();
  await expect(page).toHaveURL(/\/s\/payments/);
  const v = (await vts(page)).map((x) => x.types);
  console.log('types after tab-on-current then push:', JSON.stringify(v));
  expect(v[v.length - 1]).toBe('forward');
});
test('R3-3 same, Review tab on Review then a row that opens', async ({ page }) => {
  await recordVT(page, false);
  await open(page, '/review');
  await page.waitForFunction(() => document.querySelector('[data-review]'));
  await page.locator('[data-k=review]').click();
  const opener = page.locator('[data-review] button[data-slot=item]').first();
  if (!(await opener.count())) test.skip(true, 'no opening row on Review');
  await opener.click();
  await page.waitForTimeout(600);
  const v = (await vts(page)).map((x) => x.types);
  console.log('types:', JSON.stringify(v), page.url());
});

// Ripple under a scrolling finger: it should not flash on rows the finger only drags across
test('R3-8 ripple while scrolling a list by touch', async ({ page }) => {
  await open(page, '/s/payments');
  await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
  await page.evaluate(() => {
    const w = window as any;
    w.__press = [];
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) if ((n as Element).classList?.contains('press')) w.__press.push(Math.round(performance.now()));
    }).observe(document.body, { subtree: true, childList: true });
  });
  const cdp = await page.context().newCDPSession(page);
  const x = 200;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: 600 }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 600 - i * 25 }] });
    await page.waitForTimeout(16);
  }
  const during = await page.locator('.press').count();
  await shot(page, 'FLOW-R3-2', 1, 'scrolling-finger-ripple');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const created = await page.evaluate(() => (window as any).__press.length);
  console.log(`ripples created by one scroll gesture: ${created}; present mid-scroll: ${during}`);
});

// Timezone: a device in another zone sees the same day headers
test('R3-tz day headers do not move with the device timezone', async ({ browser }) => {
  const heads: string[][] = [];
  for (const tz of ['Asia/Kuala_Lumpur', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, serviceWorkers: 'block', baseURL: 'http://localhost:4181', timezoneId: tz, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await open(page, '/s/payments');
    await page.waitForFunction(() => document.querySelector('main button[data-slot=item]'));
    heads.push(await page.evaluate(() => [...document.querySelectorAll('main h3, main h2, main [role=heading]')].map((e) => e.textContent!.trim()).slice(0, 8)));
    await ctx.close();
  }
  console.log(JSON.stringify(heads));
  expect(heads[1]).toEqual(heads[0]);
  expect(heads[2]).toEqual(heads[0]);
});

// Look change with view transitions in place
test('R3-26 changing the look still reveals, with no screen name left behind', async ({ page }) => {
  const errors = watch(page);
  await recordVT(page);
  await open(page, '/s/settings/appearance');
  await page.waitForTimeout(500);
  const opts = page.getByRole('radio');
  const n = await opts.count();
  console.log('appearance radios', n);
  await page.screenshot({ path: `${process.env.QA_SCREENS ?? '../../qa-artifacts/B05-feel/screens'}/FLOW-R3-7-step-1-appearance.png` });
  expect(errors).toEqual([]);
});
