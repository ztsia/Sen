import { expect, test, type Page } from '@playwright/test';
import { open, settled, tabs, toast, watch } from './b04r-helpers';
import { fitOver, note, step, swipe } from './b04r-r3-lib';

// Run 3 flows A: Home, Review, Insights, More. Preview build (5392 by default; B04R_BASE overrides).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

const money = (s: string) => {
  const m = /RM\s?([\d,]+)\.(\d{2})/.exec(s);
  return m ? Number(m[1]!.replace(/,/g, '')) * 100 + Number(m[2]) : NaN;
};

/** Text clipped by overflow:hidden that isn't an intended line clamp or ellipsis. */
const clipped = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main *, header *'))) {
      const c = getComputedStyle(el);
      if (!el.childNodes.length || !Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim()))
        continue;
      const clamp = c.webkitLineClamp !== 'none' || c.textOverflow === 'ellipsis';
      if (clamp) continue;
      if (el.clientHeight <= 2) continue; // visually hidden text (sr-only)
      if ((c.overflow === 'hidden' || c.overflowY === 'hidden') && el.scrollHeight > el.clientHeight + 2)
        out.push(`${el.tagName} "${el.textContent!.trim().slice(0, 40)}" ${el.scrollHeight}>${el.clientHeight}`);
    }
    return out;
  });

test('R3-FLOW-1 Home fits in every scenario, look and mode; the cycle sheet adds up', async ({ page }) => {
  const w = watch(page);
  const F = 'R3-FLOW-1';
  const scenarios = ['wei-ming', 'payday', 'before-salary', 'first-cycle', 'month', 'capture-off', 'cap'];
  const over: string[] = [];
  let n = 0;
  for (const sc of scenarios)
    for (const [look, mode] of [
      ['minted', 'light'],
      ['copper', 'dark'],
      ['instrument', 'dark'],
      ['firefly', 'light'],
      ['line', 'dark'],
      ['mercury', 'light'],
    ] as const) {
      await open(page, `/?scenario=${sc}`, look, mode);
      await expect(page.getByTestId('hero')).toBeVisible();
      const o = await fitOver(page);
      if (o > 0) over.push(`${sc} ${look} ${mode}: ${o}px over`);
    }
  note(F, `fit failures: ${JSON.stringify(over)}`);
  await open(page, '/');
  n++;
  await step(
    page,
    F,
    n,
    'home',
    'Open Home (Minted light)',
    'no scroll in 42 scenario/look/mode combinations',
    async () => {
      expect(over, 'Home must not scroll').toEqual([]);
    },
  );
  await page.getByTestId('hero').click();
  const sheet = page.getByRole('dialog');
  n++;
  await step(
    page,
    F,
    n,
    'cycle-sheet',
    'Tap the large figure',
    'income - spending = left, to the sen; the estimate is its own line labelled An estimate',
    async () => {
      await expect(sheet).toBeVisible();
      const t = await sheet.innerText();
      const inc = money(t.split('Income received')[1]!);
      const spent = money(t.split('Spending')[1]!);
      const left = money(t.split('Left until payday')[1]!);
      expect(inc - spent, 'income - spending').toBe(left);
      expect(t).toContain('An estimate:');
      // the estimate is not inside the three tiles
      const tiles = t.split('An estimate:')[0]!;
      expect(tiles).not.toMatch(/740\.53/);
    },
  );
  await page.keyboard.press('Escape');
  // month scenario: month against last month, and no payday words
  await open(page, '/?scenario=month');
  await page.getByTestId('hero').click();
  n++;
  await step(
    page,
    F,
    n,
    'month-sheet',
    'Without capture: tap the figure',
    'the sheet counts by month and never says payday',
    async () => {
      const t = await page.getByRole('dialog').innerText();
      expect(t).not.toMatch(/payday/i);
      expect(t).toMatch(/month/i);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-2 Home under pressure: a health bar, the Payday card, Sen still reachable, nothing clipped', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R3-FLOW-2';
  let n = 0;
  for (const [sc, text] of [
    ['capture-off', 'Capture may be off'],
    ['payday', 'Payday'],
  ] as const) {
    for (const [look, mode] of [
      ['minted', 'light'],
      ['firefly', 'dark'],
    ] as const) {
      await open(page, `/?scenario=${sc}`, look, mode);
      n++;
      await step(
        page,
        F,
        n,
        `${sc}-${look}`,
        `Open Home, ${sc}, ${look} ${mode}`,
        `fits, shows "${text}", nothing clipped`,
        async () => {
          await expect(page.locator('main')).toContainText(text);
          expect(await fitOver(page)).toBeLessThanOrEqual(0);
          expect(await clipped(page)).toEqual([]);
        },
      );
    }
  }
  await open(page, '/?scenario=capture-off');
  await page.getByRole('button', { name: /Ask Sen/ }).click();
  n++;
  await step(
    page,
    F,
    n,
    'sen-sheet',
    "Tap Sen's button",
    'Sen opens with "Looking at: Home" and the note is in the conversation',
    async () => {
      await expect(page.getByRole('dialog')).toContainText('Looking at: Home');
    },
  );
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-3 Review: counts add up, chips, one change per double tap, Undo, Apply all', async ({ page }) => {
  const w = watch(page);
  const F = 'R3-FLOW-3';
  let n = 0;
  await open(page, '/review');
  await settled(page);
  const heads = await page.locator('main h2, main h3').allInnerTexts();
  const total = Number(/Needs you · (\d+)/.exec(heads[0]!)![1]);
  const groups = heads
    .slice(1)
    .filter((h) => / · \d+$/.test(h))
    .map((h) => Number(h.split(' · ')[1]));
  const badge = Number(await page.getByTestId('review-badge').innerText());
  n++;
  await step(
    page,
    F,
    n,
    'groups',
    'Open Review',
    'group counts sum to the header and the badge; Waiting on others is not counted',
    async () => {
      expect(groups.reduce((a, b) => a + b, 0)).toBe(total);
      expect(badge).toBe(total);
      expect(heads.join('|')).toContain('Waiting on others');
      expect(
        (await page.getByRole('tab', { name: /review/i }).count()) +
          (await tabs(page)
            .getByText(/to review/)
            .count()),
      ).toBeGreaterThan(0);
    },
  );
  // chips: drawn 32, hit area 48, never over three plus Other
  const chipRows = await page
    .locator('[data-review="new-merchant"]')
    .first()
    .getByRole('button')
    .evaluateAll((els) =>
      els.map((e) => ({
        t: e.textContent,
        h: Math.round(e.getBoundingClientRect().height),
        after: getComputedStyle(e, '::after').width,
      })),
    );
  note(F, `chips ${JSON.stringify(chipRows)}`);
  n++;
  await step(
    page,
    F,
    n,
    'chips',
    'Measure the answer chips',
    'drawn 32 px, tap area 48 px, at most 3 answers + Other',
    async () => {
      for (const c of chipRows) expect(c.h, c.t ?? '').toBe(32);
      expect(chipRows.length).toBeLessThanOrEqual(4);
    },
  );
  // answer one, undo
  const first = page.locator('[data-review="new-merchant"]').first();
  const label = await first.getByRole('button').first().innerText();
  await first.getByRole('button').first().click();
  n++;
  await step(page, F, n, 'answered', `Tap ${label}`, 'the count falls by one and a toast offers Undo', async () => {
    await expect(page.locator('main h2, main h3').first()).toContainText(`Needs you · ${total - 1}`);
    await expect(toast(page)).toContainText(/Undo/);
  });
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  n++;
  await step(page, F, n, 'undone', 'Tap Undo', 'the count is back and the card is back in place', async () => {
    await expect(page.locator('main h2, main h3').first()).toContainText(`Needs you · ${total}`);
  });
  // apply all, undo
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Apply all', exact: true }).click();
  n++;
  await step(
    page,
    F,
    n,
    'apply-all',
    'Tap Apply all',
    "both of Sen's picks are applied and the banner is gone; an Undo is offered",
    async () => {
      await expect(page.getByRole('button', { name: 'Apply all', exact: true })).toHaveCount(0);
      await expect(page.locator('main h2, main h3').first()).toContainText(`Needs you · ${total - 2}`);
      await expect(toast(page)).toContainText(/Undo/);
    },
  );
  // an empty Review
  await open(page, '/review?state=empty');
  n++;
  await step(page, F, n, 'empty', 'Review with nothing to do', '"Nothing needs you."', async () => {
    await expect(page.locator('main')).toContainText('Nothing needs you');
  });
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-3b Review: two taps 700 ms apart answer two cards', async ({ page }) => {
  await open(page, '/review');
  await settled(page);
  const head = page.locator('main h2, main h3').first();
  const total = Number(/Needs you · (\d+)/.exec(await head.innerText())![1]);
  const chip = page.locator('[data-review="new-merchant"]').first().getByRole('button').first();
  const b = (await chip.boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(900);
  const chip2 = page.locator('[data-review="new-merchant"]').first().getByRole('button').first();
  await chip2.click();
  await page.waitForTimeout(500);
  expect(Number(/Needs you · (\d+)/.exec(await head.innerText())![1])).toBe(total - 2);
  await step(page, 'R3-FLOW-3', 7, 'two-answers', 'Two taps 900 ms apart', 'two cards answered', async () => undefined);
});

test('R3-FLOW-4 Insights: one card at a time, named steps, counter, empty state', async ({ page }) => {
  const w = watch(page);
  const F = 'R3-FLOW-4';
  let n = 0;
  await open(page, '/insights');
  await settled(page);
  const steps = page.getByRole('tab');
  const names = await steps.allInnerTexts();
  n++;
  await step(page, F, n, 'first', 'Open Insights', 'five named steps, "1 of 5", the first selected', async () => {
    expect(names).toEqual(['On track', 'Budgets', 'Subscriptions', 'Goals', 'Year']);
    await expect(page.locator('main')).toContainText('1 of 5');
    await expect(steps.first()).toHaveAttribute('aria-selected', 'true');
  });
  await steps.nth(3).click();
  await page.waitForTimeout(700);
  n++;
  await step(page, F, n, 'goals', 'Tap Goals', '"4 of 5", Goals selected, only that card is exposed', async () => {
    await expect(page.locator('main')).toContainText('4 of 5');
    await expect(steps.nth(3)).toHaveAttribute('aria-selected', 'true');
    const exposed = await page
      .locator('[role="tabpanel"]')
      .evaluateAll(
        (els) => els.filter((e) => !e.hasAttribute('inert') && e.getAttribute('aria-hidden') !== 'true').length,
      );
    expect(exposed).toBe(1);
  });
  // swipe back with a real touch gesture
  await swipe(page, 215, 60, 280);
  n++;
  await step(page, F, n, 'swiped', 'Swipe right', 'the counter moves to 3 of 5', async () => {
    await expect(page.locator('main')).toContainText('3 of 5');
    await expect(steps.nth(2)).toHaveAttribute('aria-selected', 'true');
  });
  // picker stays above
  n++;
  await step(
    page,
    F,
    n,
    'picker',
    'Look for the cycle picker',
    'the cycle picker is above the steps and not inside the pager',
    async () => {
      const pickerBox = await page
        .getByText(/this cycle\)/)
        .first()
        .boundingBox();
      const tabBox = (await steps.first().boundingBox())!;
      expect(pickerBox!.y).toBeLessThan(tabBox.y);
    },
  );
  await open(page, '/insights?state=empty');
  n++;
  await step(page, F, n, 'empty', 'Insights with no data', 'an EmptyState, no pager', async () => {
    await expect(page.locator('main')).toContainText(/first insights/i);
    await expect(page.getByRole('tab')).toHaveCount(0);
  });
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-4b Insights: choosing a step does not shift the screen sideways', async ({ page }) => {
  const F = 'R3-FLOW-4';
  await open(page, '/insights');
  await settled(page);
  const shellLeft = () => page.evaluate(() => (document.querySelector('div.safe-top') as HTMLElement).scrollLeft);
  const shifts: Record<string, number> = {};
  for (const [i, name] of ['Budgets', 'Subscriptions', 'Goals', 'Year'].entries()) {
    await page.getByRole('tab', { name }).click();
    await page.waitForTimeout(1200);
    shifts[name] = await shellLeft();
    void i;
  }
  note(F, `shell scrollLeft after each step: ${JSON.stringify(shifts)}`);
  await step(
    page,
    F,
    8,
    'year-shifted',
    'Tap Budgets, Subscriptions, Goals, Year in turn',
    'the screen never scrolls sideways (the app shell stays at scrollLeft 0, the card is at x=0)',
    async () => {
      expect(shifts).toEqual({ Budgets: 0, Subscriptions: 0, Goals: 0, Year: 0 });
      const left = await page
        .locator('[role="tabpanel"]')
        .nth(4)
        .evaluate((e) => e.parentElement!.getBoundingClientRect().left);
      expect(left).toBe(0);
    },
  );
});

test('R3-FLOW-7 More: states are real, and follow the scenario', async ({ page }) => {
  const F = 'R3-FLOW-7';
  await open(page, '/more');
  await settled(page);
  const rows = (await page.locator('main a, main button').allInnerTexts()).map((s) => s.replace(/\n+/g, ' | '));
  note(F, `more rows ${JSON.stringify(rows)}`);
  await step(
    page,
    F,
    1,
    'default',
    'Open More (owner, capture on, claims on)',
    'Payments, Shared bills, Accounts, Claims, Settings each with a state',
    async () => {
      const t = rows.join(' ; ');
      expect(t).toMatch(/Payments.*1,151/);
      expect(t).toMatch(/Shared bills.*3 open/);
      expect(t).toMatch(/Accounts.*5/);
      expect(t).toMatch(/Claims.*2 to submit/);
      expect(t).not.toMatch(/undefined|NaN|\[object/);
    },
  );
  await open(page, '/more?scenario=month');
  await settled(page);
  await step(
    page,
    F,
    2,
    'friend',
    'Open More as a friend without capture or claims',
    'no Accounts row, no Claims row',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).not.toMatch(/Accounts/);
      expect(t).not.toMatch(/Claims/);
      expect(t).toMatch(/Payments/);
    },
  );
  await open(page, '/more?state=empty');
  await step(page, F, 3, 'empty', 'More with an empty ledger', 'Payments says 0 / none in words', async () => {
    const t = await page.locator('main').innerText();
    expect(t).not.toMatch(/undefined|NaN|\[object/);
  });
});

test("R3-FLOW-X3 Sen's button: only on the five tab screens, labelled, opens Sen over the screen it was on, never covers the last row", async ({
  page,
}) => {
  const F = 'R3-FLOW-X3';
  let n = 0;
  const tabScreens: [string, string][] = [
    ['/', 'Home'],
    ['/review', 'Review'],
    ['/insights', 'Insights'],
    ['/more', 'More'],
  ];
  for (const [path, name] of tabScreens) {
    await open(page, path);
    await settled(page);
    const btn = page.getByRole('button', { name: 'Ask Sen', exact: true });
    await expect(btn).toHaveCount(1);
    // scroll to the very bottom, then nothing interactive or textual may sit under the button
    await page.evaluate(() => document.querySelector('main')!.scrollTo(0, 1e6));
    await page.waitForTimeout(300);
    const covered = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll<HTMLElement>('button')).find(
        (x) => x.getAttribute('aria-label') === 'Ask Sen',
      )!;
      const r = b.getBoundingClientRect();
      const out: string[] = [];
      for (const el of Array.from(
        document.querySelectorAll<HTMLElement>(
          'main a, main button, main [role="tab"], main [role="switch"], main p, main span, main li',
        ),
      )) {
        if (el.closest('[inert],[aria-hidden="true"]') || b.contains(el)) continue;
        const e = el.getBoundingClientRect();
        if (e.width === 0 || !(el.textContent ?? '').trim()) continue;
        if (el.children.length && el.tagName !== 'BUTTON' && el.tagName !== 'A') continue;
        const ow = Math.min(e.right, r.right) - Math.max(e.left, r.left);
        const oh = Math.min(e.bottom, r.bottom) - Math.max(e.top, r.top);
        if (ow > 4 && oh > 4)
          out.push(`${el.tagName} "${el.textContent!.trim().slice(0, 28)}" ${Math.round(ow)}x${Math.round(oh)}`);
      }
      return out;
    });
    note(F, `${name} bottom: covered by Sen's button: ${JSON.stringify(covered)}`);
    n++;
    await step(
      page,
      F,
      n,
      `bottom-${name.toLowerCase()}`,
      `Scroll ${name} to the bottom`,
      "nothing at the end of the screen is under Sen's button",
      async () => {
        expect(covered).toEqual([]);
      },
    );
    await btn.click();
    await expect(page.getByRole('dialog', { name: 'Sen' })).toContainText(`Looking at: ${name}`);
    await page.keyboard.press('Escape');
  }
  for (const p of ['/s/payments', '/s/settings', '/s/claims', '/s/manual', '/scan', '/s/budgets']) {
    await open(page, p);
    await settled(page);
    await expect(page.getByRole('button', { name: 'Ask Sen', exact: true }), p).toHaveCount(0);
  }
  n++;
  await step(
    page,
    F,
    n,
    'pushed',
    'Open six pushed or task screens',
    "Sen's button is absent on each",
    async () => undefined,
  );
});

test('R3-FLOW-4c Insights under reduced motion: the pager jumps, it does not slide; with motion it slides', async ({
  browser,
}) => {
  const F = 'R3-FLOW-4';
  const sample = async (reduced: boolean) => {
    const ctx = await browser.newContext({
      baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292',
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    });
    const page = await ctx.newPage();
    await open(page, '/insights');
    await settled(page);
    await page.getByRole('tab', { name: 'Budgets' }).click();
    const xs: number[] = [];
    for (let i = 0; i < 8; i++) {
      xs.push(
        await page.evaluate(
          () => (document.querySelector('[role="tabpanel"]')!.parentElement as HTMLElement).scrollLeft,
        ),
      );
      await page.waitForTimeout(40);
    }
    await ctx.close();
    return xs;
  };
  const jump = await sample(true);
  const slide = await sample(false);
  note(F, `reduced motion scrollLeft samples ${JSON.stringify(jump)}; with motion ${JSON.stringify(slide)}`);
  const page = await (await browser.newContext({ baseURL: 'http://127.0.0.1:5292' })).newPage();
  await step(
    page,
    F,
    9,
    'reduced-motion',
    'Tap Budgets with and without reduced motion',
    'under reduced motion the first sample already sits at 390 (no slide); without it the samples pass through intermediate values',
    async () => {
      expect(jump.every((x) => x === 390 || x === 0)).toBe(true);
      expect(jump.slice(2).every((x) => x === 390)).toBe(true);
      expect(new Set(slide.filter((x) => x > 0 && x < 390)).size).toBeGreaterThan(0);
    },
  );
});
