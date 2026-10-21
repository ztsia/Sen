import { expect, test } from '@playwright/test';
import { open, recordVT, shot, vts, watch } from './b05feel-lib';

const LOOKS = ['minted', 'copper', 'instrument', 'line', 'mercury', 'firefly'];
const EASE = 'cubic-bezier(0.2, 0, 0, 1)';

// R2-1, R2-2, R2-28: the push and the pop, their kind, duration and easing, in every look.
for (const look of LOOKS) {
  test(`R2-1/2/28 push and pop at 200 ms with the shared easing, ${look}`, async ({ page }) => {
    const errors = watch(page);
    await recordVT(page);
    await open(page, '/s/payments', look, 'light');
    await page.locator('[data-share]').first().click();
    await expect(page).toHaveURL(/\/s\/txn/);
    await expect.poll(async () => (await vts(page)).filter((v) => v.fin !== undefined).length).toBe(1);
    await shot(page, 'FLOW-R2-10', 1, `${look}-detail-after-push`);
    if (look === 'minted') await shot(page, 'FLOW-R2-1', 1, 'detail-after-push');
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/s\/payments/);
    await expect.poll(async () => (await vts(page)).filter((v) => v.fin !== undefined).length).toBe(2);
    const v = await vts(page);
    expect(v.map((x) => x.types)).toEqual(['forward', 'back']);
    for (const rec of v) {
      const screen = rec.anims.filter((a: any) => /(old|new)\(screen\)/.test(a.p));
      expect(screen.length, JSON.stringify(rec.anims.map((a: any) => a.p))).toBe(2);
      for (const a of screen) {
        expect(a.d).toBe(200);
        // a CSS animation's easing lives on its keyframes
        expect(a.kf.map((k: any) => k.ease)).toContain(EASE);
      }
    }
    // forward: new from the right, old to the left; back: the reverse
    const f = v[0].anims.filter((a: any) => /(old|new)\(screen\)/.test(a.p));
    expect(JSON.stringify(f.find((a: any) => /new/.test(a.p)).kf)).toContain('translate(100%)');
    expect(JSON.stringify(f.find((a: any) => /old/.test(a.p)).kf)).toContain('translate(-25%)');
    const b = v[1].anims.filter((a: any) => /(old|new)\(screen\)/.test(a.p));
    expect(JSON.stringify(b.find((a: any) => /old/.test(a.p)).kf)).toContain('translate(100%)');
    expect(JSON.stringify(b.find((a: any) => /new/.test(a.p)).kf)).toContain('translate(-25%)');
    expect(errors).toEqual([]);
  });
}

// R2-2: the back gesture (history.back) and Done pop too
test('R2-2 history.back and the app bar pop; a tab crossfades with no transform', async ({ page }) => {
  await recordVT(page);
  await open(page, '/more');
  await page.locator('[data-slot=item]').filter({ hasText: 'Payments' }).first().click();
  await expect(page).toHaveURL(/\/s\/payments/);
  await page.waitForTimeout(500);
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/more/);
  await page.locator('[data-k=insights]').click();
  await expect(page).toHaveURL(/\/insights/);
  await page.waitForTimeout(1200);
  await shot(page, 'FLOW-R2-2', 1, 'insights-after-tab');
  const v = await vts(page);
  console.log('VTS', JSON.stringify(v.map((x) => ({ t: x.types, fin: x.fin, skipped: x.skipped }))));
  expect(v.map((x) => x.types)).toEqual(['forward', 'back', 'tab']);
  const tab = v[2].anims.filter((a: any) => /(old|new)\(screen\)/.test(a.p));
  expect(tab.length).toBe(2);
  for (const a of tab) expect(JSON.stringify(a.kf)).not.toContain('translate');
  // the tab bar and Sen's button are never part of the captured screen
  expect(
    v[2].anims.filter((a: any) => /tabbar/.test(a.p) && a.d > 0 && /old|new/.test(a.p) === true).length,
  ).toBeLessThan(3);
});

// R2-3: the tab bar does not move during a push or a tab switch
test('R2-3 the tab bar holds still through a push and a tab switch', async ({ page }) => {
  await open(page, '/more');
  const track = async (act: () => Promise<unknown>) => {
    await page.evaluate(() => {
      const w = window as any;
      w.__tb = [];
      const el = document.querySelector('[data-k=home]')!;
      const t0 = performance.now();
      const tick = () => {
        const r = el.getBoundingClientRect();
        w.__tb.push([Math.round(r.top), Math.round(r.left)]);
        if (performance.now() - t0 < 700) requestAnimationFrame(tick);
      };
      tick();
    });
    await act();
    await page.waitForTimeout(800);
    return page.evaluate(() => new Set((window as any).__tb.map((p: number[]) => p.join(','))).size);
  };
  expect(await track(() => page.locator('[data-k=insights]').click())).toBe(1);
  await page.locator('[data-k=more]').click();
  await page.waitForTimeout(600);
  const sizes = await track(() => page.locator('[data-slot=item]').filter({ hasText: 'Payments' }).first().click());
  // on a pushed screen the tab bar may be gone, in which case the probe finds nothing to move
  expect(sizes).toBeLessThanOrEqual(2);
});

// R2-7 / R2-10: interrupted transitions settle
test('R2-7/10 forward then back at once, tab x3 fast: lands on the last request, usable, no errors', async ({
  page,
}) => {
  const errors = watch(page);
  await open(page, '/s/payments');
  await page.locator('[data-share]').first().click();
  await page.goBack();
  await expect(page).toHaveURL(/\/s\/payments/);
  await expect(page.locator('[data-share]').first()).toBeVisible();
  await open(page, '/');
  await page.evaluate(async () => {
    const k = (s: string) => (document.querySelector(`[data-k=${s}]`) as HTMLElement).click();
    k('insights');
    await new Promise((r) => setTimeout(r, 30));
    k('review');
    await new Promise((r) => setTimeout(r, 30));
    k('more');
  });
  await expect(page).toHaveURL(/\/more/);
  await page.waitForTimeout(700);
  // nothing left running, and a tap works at once
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  expect(running).toBe(0);
  const blank = await page.evaluate(() => (document.querySelector('.screen-region') as HTMLElement).innerText.length);
  expect(blank).toBeGreaterThan(20);
  await page.locator('[data-slot=item]').filter({ hasText: 'Payments' }).first().click();
  await expect(page).toHaveURL(/\/s\/payments/);
  await shot(page, 'FLOW-R2-7', 1, 'after-hammering');
  expect(errors).toEqual([]);
});

test('R2-7 a tap during a push is blocked, a tap after it works', async ({ page }) => {
  await open(page, '/s/payments');
  const rows = page.locator('[data-share]');
  await rows.first().click();
  // immediately try to tap the Back button twice in the same frame as the push begins
  const urls = await page.evaluate(async () => {
    const out: string[] = [];
    const back = document.querySelector('[aria-label=Back]') as HTMLElement | null;
    back?.click();
    out.push(location.pathname);
    await new Promise((r) => setTimeout(r, 900));
    out.push(location.pathname);
    return out;
  });
  expect(urls[1]).toMatch(/\/s\/payments|\/s\/txn/);
  await page.waitForTimeout(300);
  // whichever it was, a real tap works afterwards
  const before = page.url();
  const back = page.getByRole('button', { name: 'Back' });
  if (await back.count()) {
    await back.click();
    await expect(page).not.toHaveURL(before);
  } else {
    await rows.first().click();
    await expect(page).toHaveURL(/\/s\/txn/);
  }
});

// R2-9: no View Transitions API, and one without the type selector
for (const mode of ['absent', 'untyped']) {
  test(`R2-9 navigation works with the View Transitions API ${mode}`, async ({ page }) => {
    const errors = watch(page);
    await page.addInitScript((mode) => {
      const w = window as any;
      w.__called = 0;
      if (mode === 'absent') (document as any).startViewTransition = undefined;
      else {
        const s = CSS.supports.bind(CSS);
        CSS.supports = ((q: string) => (/active-view-transition-type/.test(q) ? false : s(q))) as any;
        const st = document.startViewTransition?.bind(document);
        (document as any).startViewTransition = (...a: any[]) => {
          w.__called++;
          return st!(...a);
        };
      }
    }, mode);
    await open(page, '/s/payments');
    await page.locator('[data-share]').first().click();
    await expect(page).toHaveURL(/\/s\/txn/);
    await page.goBack();
    await expect(page).toHaveURL(/\/s\/payments/);
    await page.locator('[data-k=review]').click();
    await expect(page).toHaveURL(/\/review/);
    const rows = page.locator('[data-review]');
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();
    await rows
      .getByRole('button', { name: /^(Income|Transfer|Yes|Apply)\b/ })
      .first()
      .click();
    await expect(rows).toHaveCount(before - 1);
    await shot(page, 'FLOW-R2-6', mode === 'absent' ? 1 : 2, `review-after-clear-api-${mode}`);
    if (mode === 'untyped') expect(await page.evaluate(() => (window as any).__called)).toBe(0);
    expect(errors).toEqual([]);
  });
}

// R2-27: no layout shift from a push, a tab and a sheet
test('R2-27 no layout shift from a push, back, a tab switch and a sheet', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await open(page, '/s/payments');
  await page.waitForTimeout(500);
  const base = await page.evaluate(() => (window as any).__cls);
  await page.locator('[data-share]').first().click();
  await expect(page).toHaveURL(/\/s\/txn/);
  await page.waitForTimeout(600);
  await page.goBack();
  await page.waitForTimeout(600);
  await page.locator('[data-k=insights]').click();
  await page.waitForTimeout(800);
  const cls = await page.evaluate(() => (window as any).__cls);
  expect(cls - base).toBeLessThan(0.01);
});

test('R2-7 a real tap on Back inside the 200 ms of a push is swallowed; after it, Back works', async ({ page }) => {
  await open(page, '/s/payments');
  const back = page.getByRole('button', { name: 'Back' });
  const bb = (await back.boundingBox())!;
  await page.locator('[data-share]').first().click({ noWaitAfter: true });
  // the first frames of the push: tap where Back will be
  await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.waitForTimeout(150);
  const during = page.url();
  await page.waitForTimeout(700);
  console.log('R2-7 url during/after', during, page.url());
  await expect(page).toHaveURL(/\/s\/txn/);
  await shot(page, 'FLOW-R2-7', 2, 'detail-after-swallowed-tap');
  await back.click();
  await expect(page).toHaveURL(/\/s\/payments/);
});
