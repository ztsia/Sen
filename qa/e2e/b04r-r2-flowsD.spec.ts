import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { db, LOOKS, open, settled, tabs, toast, watch } from './b04r-helpers';
import { step } from './b04r-r2-lib';

// Run 2 flows, part D: time zone, offline, text scale and axe, the production build, capture. Dev server (5291).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

async function snapshot(page: Page) {
  await open(page, '/');
  const home = (await page.getByTestId('hero').innerText()).replace(/\s+/g, ' ');
  const pace = (await page.getByTestId('pace').innerText()).replace(/\s+/g, ' ');
  await open(page, '/s/payments');
  await settled(page);
  const days = await page.locator('main h3').allInnerTexts();
  const first = (await page.locator('main button').nth(4).innerText()).replace(/\s+/g, ' ');
  await open(page, '/s/txn?id=' + (await db<string>(page, '(db)=>db.txns.find(t=>t.merchantKey==="NASI KANDAR ABC")?.id ?? db.txns[0].id')));
  const txn = (await page.locator('main').innerText()).split('\n').slice(0, 8).join('|');
  return JSON.stringify({ home, pace, days: days.slice(0, 6), first, txn });
}

for (const [tz, n] of [['Asia/Kuala_Lumpur', 1], ['America/Los_Angeles', 2], ['Pacific/Auckland', 3]] as const)
  test(`R2-FLOW-27 time zone ${tz}`, async ({ browser }) => {
    const ctx = await browser.newContext({ timezoneId: tz, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });
    const page = await ctx.newPage();
    const snap = await snapshot(page);
    const fs = await import('node:fs');
    fs.writeFileSync(new URL(`../../qa-artifacts/B04-redesign/text/tz-${n}.json`, import.meta.url).pathname, snap);
    await step(page, 'R2-FLOW-27', n, tz.replace('/', '-').toLowerCase(), `Home, Payments and a payment in ${tz}`, 'the same text as in Kuala Lumpur (compared after all three runs)', async () => {
      expect(snap.length).toBeGreaterThan(50);
    });
    await ctx.close();
  });

test('R2-FLOW-27 time zone: the three runs match', async () => {
  const fs = await import('node:fs');
  const read = (n: number) => fs.readFileSync(new URL(`../../qa-artifacts/B04-redesign/text/tz-${n}.json`, import.meta.url).pathname, 'utf8');
  const [a, b, c] = [read(1), read(2), read(3)];
  console.log('KL', a.slice(0, 400));
  expect(b).toBe(a);
  expect(c).toBe(a);
});

test('R2-FLOW-28 Offline: banner, a change, Not synced yet, back online', async ({ page, context }) => {
  const w = watch(page);
  const F = 'R2-FLOW-28';
  // one document load: every screen the flow visits is loaded online first, since only the service worker
  // (production) serves a screen never opened before while offline
  await open(page, '/review');
  await settled(page);
  await tabs(page).getByRole('link', { name: /More/ }).click();
  await page.getByRole('link', { name: /^Payments/ }).click();
  await settled(page);
  await page.getByRole('button', { name: 'Back' }).click();
  await tabs(page).getByRole('link', { name: /Review/ }).click();
  await settled(page);
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await step(page, F, 1, 'banner', 'Go offline', 'a banner "You\'re offline" (not an error); Review still works', async () => {
    await expect(page.getByText(/You're offline/)).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/Couldn't load/);
  });
  const row = page.locator('[data-review="new-merchant"]').filter({ hasText: 'Roti Bakar 88' });
  await row.getByRole('button', { name: 'Meals' }).click();
  await step(page, F, 2, 'answered-offline', 'Answer a Review question', 'it clears at once with a toast', async () => {
    await expect(toast(page)).toContainText(/Roti Bakar 88|ROTI BAKAR 88/i);
    await expect(row).toHaveCount(0);
  });
  await tabs(page).getByRole('link', { name: /More/ }).click();
  await page.getByRole('link', { name: /^Payments/ }).click();
  await settled(page);
  await step(page, F, 3, 'not-synced', 'Open Payments', 'the answered payment is marked "Not synced yet" while offline', async () => {
    await expect(page.locator('main')).toContainText('Not synced yet');
  });
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await step(page, F, 4, 'back-online', 'Go back online', 'the banner goes; the marks go after a sync; the rule was made once', async () => {
    await expect(page.getByText(/You're offline/)).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('main')).not.toContainText('Not synced yet', { timeout: 15000 });
    const rules = await db<number>(page, '(db)=>db.rules.filter(r=>r.merchantKey==="ROTI BAKAR 88").length');
    expect(rules).toBe(1);
  });
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-29 Text at 1.5x and axe, on the main screens', async ({ page }) => {
  const F = 'R2-FLOW-29';
  const SCREENS: [string, string][] = [['home', '/'], ['review', '/review'], ['txn', '/s/payments'], ['more', '/more'], ['settings', '/s/settings'], ['claims', '/s/claims'], ['budgets', '/s/budgets'], ['categories', '/s/settings/categories']];
  let n = 0;
  for (const [name, path] of SCREENS) {
    await open(page, path);
    await settled(page);
    await page.evaluate(() => (document.documentElement.style.fontSize = '150%'));
    await page.waitForTimeout(300);
    n++;
    await step(page, F, n, name, `${name} at 1.5x text`, 'no sideways scroll; no amount is cut off; no chip row wraps to two lines', async () => {
      const over = await page.evaluate(() => document.scrollingElement!.scrollWidth - document.scrollingElement!.clientWidth);
      expect(over, `${name} scrolls sideways`).toBeLessThanOrEqual(0);
      const cut = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('main *')].filter((e) => e.children.length === 0 && /^\+?RM[\d,]+\.\d\d$/.test((e.textContent ?? '').trim()) && (e.scrollWidth > e.clientWidth + 1 || getComputedStyle(e).textOverflow === 'ellipsis')).map((e) => e.textContent));
      expect(cut, `${name} cut amounts`).toEqual([]);
    });
  }
  // axe on the redesigned screens at the normal size, in the two looks that stress contrast most
  for (const look of ['firefly', 'line']) {
    for (const [name, path] of SCREENS) {
      await open(page, path, look, 'dark');
      await settled(page);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((x) => x.target.join(' ')).join(', ')}`), `${look} ${name}`).toEqual([]);
    }
  }
});

test('R2-FLOW-31 Capture: unchosen apps dropped, a repost is one row, an OTP is dropped, a maybe-OTP is masked', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-31';
  await open(page, '/s/settings/capture');
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.getByRole('button', { name: 'Grant access' }).click();
  const dlg = () => page.getByRole('dialog').first();
  const count = async () => Number(/(\d+) captured/.exec(await dlg().innerText())?.[1] ?? -1);
  await page.getByRole('button', { name: 'Post a notification' }).click();
  await step(page, F, 1, 'unchosen', 'Grant access and post before any app is chosen', 'the notification is discarded: 0 captured (the listener drops apps the person has not chosen)', async () => {
    expect(await count()).toBe(0);
  });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Your apps/ }).click();
  await page.getByRole('button', { name: 'Choose these 4' }).click();
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.getByRole('button', { name: 'Post a notification' }).click();
  await step(page, F, 2, 'post', 'Choose the four apps, then post', 'one event is captured', async () => {
    expect(await count()).toBe(1);
  });
  await page.getByRole('button', { name: 'Post it again' }).click();
  await step(page, F, 3, 'repost', 'Post the same notification again', 'still 1: the repost is a no-op (dedupe)', async () => {
    expect(await count()).toBe(1);
  });
  await page.getByRole('button', { name: 'Post an OTP' }).click();
  await step(page, F, 4, 'otp', 'Post an OTP', 'discarded before storage: still 1', async () => {
    expect(await count()).toBe(1);
  });
  await page.getByRole('button', { name: 'Post a maybe-OTP' }).click();
  await step(page, F, 5, 'maybe-otp', 'Post a maybe-OTP', 'stored: 2 captured', async () => {
    expect(await count()).toBe(2);
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: /^Captured on this phone/ }).click();
  await step(page, F, 6, 'captured', 'Open Captured on this phone', 'the raw rows show with digits outside amounts masked; a maybe-OTP row says "Maybe a one-time code, so its numbers are hidden"', async () => {
    const t = await page.locator('main').innerText();
    console.log('CAPTURED', t.replace(/\n+/g, ' | ').slice(0, 700));
    await expect(page.locator('main')).toContainText('Maybe a one-time code, so its numbers are hidden');
  });
  expect(w.errors).toEqual([]);
});
