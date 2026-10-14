import { expect, test } from '@playwright/test';
import { uid } from '../../apps/web/src/data/fake/ids';
import { open, settled, shot, watch } from './b04r-helpers';
import { note } from './b04r-r3-lib';

// Run 3 evidence for findings: a screenshot and the measured numbers. Preview build (5392 by default).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

test('R3-EV-1 Review, Waiting on others: the amount after "of" is cut off at 390 px', async ({ page }) => {
  await open(page, '/review');
  await settled(page);
  const cut = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('main *'))
      .filter(
        (el) =>
          el.children.length === 0 &&
          /RM\d/.test(el.textContent ?? '') &&
          getComputedStyle(el).textOverflow === 'ellipsis' &&
          el.scrollWidth > el.clientWidth + 1,
      )
      .map((el) => `${el.textContent} | scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`),
  );
  note('R3-EV-1', JSON.stringify(cut));
  await page.getByRole('region', { name: 'Waiting on others' }).scrollIntoViewIfNeeded();
  await shot(page, 'R3-EV-1-review-waiting-amount-cut');
  expect(cut, 'no amount is truncated').toEqual([]);
});

test('R3-EV-2 text at 1.5x on a 360 px phone: Budgets and Settings cut amounts off', async ({ browser }) => {
  const ctx = await browser.newContext({
    baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292',
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  await ctx.addInitScript(() => localStorage.setItem('sen.dev.textScale', '1.5'));
  const page = await ctx.newPage();
  const w = watch(page);
  await open(page, '/s/budgets');
  await settled(page);
  const over = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll<HTMLElement>('main span'))
      .filter(
        (e) => e.children.length === 0 && /RM/.test(e.textContent ?? '') && e.getBoundingClientRect().right > vw + 1,
      )
      .map((e) => `${e.textContent} right=${Math.round(e.getBoundingClientRect().right)} of ${vw}`);
  });
  note('R3-EV-2', `budgets past the right edge: ${JSON.stringify(over)}`);
  await shot(page, 'R3-EV-2-budgets-1.5x-360');
  await open(page, '/s/settings');
  await settled(page);
  const cut = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('main *'))
      .filter(
        (el) =>
          el.children.length === 0 &&
          /RM\d/.test(el.textContent ?? '') &&
          getComputedStyle(el).textOverflow === 'ellipsis' &&
          el.scrollWidth > el.clientWidth + 1,
      )
      .map((e) => `${e.textContent} scrollW ${e.scrollWidth} > ${e.clientWidth}`),
  );
  note('R3-EV-2', `settings truncated: ${JSON.stringify(cut)}`);
  await shot(page, 'R3-EV-2-settings-1.5x-360');
  expect(over, 'Budgets amounts inside the screen').toEqual([]);
  expect(cut, 'Settings amounts not truncated').toEqual([]);
  expect(w.errors).toEqual([]);
  await ctx.close();
});

test('R3-EV-3 Insights: the shell scrolls sideways when a later step is chosen (Goals, Year)', async ({ page }) => {
  await open(page, '/insights');
  await settled(page);
  await page.getByRole('tab', { name: 'Year' }).click();
  await page.waitForTimeout(1500);
  const left = await page.evaluate(() => (document.querySelector('div.safe-top') as HTMLElement).scrollLeft);
  const tabsLeft = await page
    .getByRole('navigation', { name: 'Tabs' })
    .evaluate((e) => Math.round(e.getBoundingClientRect().left));
  note('R3-EV-3', `shell scrollLeft ${left}, tab bar left edge ${tabsLeft}`);
  await shot(page, 'R3-EV-3-insights-year-shifted');
  expect(left).toBe(0);
});

test('R3-EV-4 Memory: a double tap on Forget loses two notes, Undo restores one', async ({ page }) => {
  await open(page, '/s/agent/memory');
  await settled(page);
  const forget = page.getByRole('button', { name: /^Forget:/ });
  const before = await forget.count();
  const b = (await forget.first().boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(150);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(500);
  await shot(page, 'R3-EV-4-memory-two-forgotten');
  const after = await forget.count();
  await page.locator('[data-sonner-toast]').getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(500);
  const undone = await forget.count();
  note('R3-EV-4', `${before} notes, ${after} after a double tap, ${undone} after Undo`);
  await shot(page, 'R3-EV-4-memory-after-undo');
  expect(undone).toBe(before);
});

test('R3-EV-5 Delete on a payment opened without in-app history goes back to nothing', async ({ page }) => {
  await open(page, `/s/txn?id=${uid('txn:nasi-kandar')}`);
  const len = await page.evaluate(() => history.length);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menuitem', { name: /Delete/ }).click();
  await page.waitForTimeout(800);
  note('R3-EV-5', `history.length ${len}; after Delete the page is ${page.url()}`);
  await shot(page, 'R3-EV-5-delete-direct-load');
  expect(page.url()).toContain('127.0.0.1');
});

test("R3-EV-6 Payday: the toast after Skip sits on the next step's main button and takes the tap", async ({ page }) => {
  await open(page, '/s/payday?scenario=payday');
  await settled(page);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.waitForTimeout(500);
  const hit = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll<HTMLElement>('button')).find(
      (x) => x.textContent!.trim() === 'Next',
    )!;
    const r = b.getBoundingClientRect();
    const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { y: `${Math.round(r.top)}-${Math.round(r.bottom)}`, topmostIsToast: !!e?.closest('[data-sonner-toast]') };
  });
  note('R3-EV-6', `Next ${JSON.stringify(hit)}`);
  const step = () =>
    page
      .locator('body')
      .innerText()
      .then((t) => /Step (\d) of 4/.exec(t)![0]);
  const before = await step();
  const b = (await page.getByRole('button', { name: 'Next', exact: true }).boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(500);
  note('R3-EV-6', `a real tap on Next: ${before} -> ${await step()}`);
  await shot(page, 'R3-EV-6-payday-toast-over-next');
  expect(hit.topmostIsToast, 'the toast is over Next').toBe(false);
});

test('R3-FLOW-21 production build: no dev panel, no gallery, no made-up scenario, the look pinned', async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    baseURL: process.env.B04R_PROD ?? 'http://127.0.0.1:5293',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  const w = watch(page);
  const { step } = await import('./b04r-r3-lib');
  await page.goto('/dev/gallery?look=copper&mode=dark');
  await page.waitForTimeout(900);
  await step(
    page,
    'R3-FLOW-21',
    1,
    'gallery-absent',
    'Open /dev/gallery on the production build',
    'it is not served: the app says "Not built yet"; no Dev panel button; the look stays Minted',
    async () => {
      await expect(page.getByRole('button', { name: 'Dev panel' })).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
      await expect(page.locator('body')).toContainText('Not built yet');
    },
  );
  await page.goto('/?scenario=payday&state=error&look=firefly');
  await page.waitForTimeout(900);
  await step(
    page,
    'R3-FLOW-21',
    2,
    'scenario-ignored',
    'Open /?scenario=payday&state=error',
    'no made-up data: no Payday card, no RM figure; "Not built yet"',
    async () => {
      const t = await page.locator('body').innerText();
      expect(t).not.toMatch(/RM\s?\d|Payday plan|Wei Ming/);
      expect(t).toContain('Not built yet');
      await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
    },
  );
  expect(w.errors.filter((e) => !/Not built|no server/i.test(e))).toEqual([]);
  await ctx.close();
});
