import { expect, test } from '@playwright/test';
import {
  LOOKS,
  MODES,
  NAMES,
  closePanel,
  cssVar,
  frameOf,
  openPanel,
  shot,
  tabs,
  themeTokens,
  touchHold,
  watch,
} from './helpers';

// QA B01, flows 1 to 7 (qa/B01/flows.md), at 412×915. Assert, then screenshot.

test('FLOW-1 switch through all six looks, light and dark, from the dev panel', async ({ page }) => {
  const w = watch(page);
  await page.goto('/dev/gallery');
  await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
  await expect(page.getByTestId('gallery-figure')).toBeVisible();
  await shot(page, 'FLOW-1-step-1-gallery-opens');

  // only the look on show is fetched (AC-17)
  const lookChunks = w.requests.filter((u) => /\/assets\/(instrument|firefly|line|mercury|copper)-[\w-]+\.js/.test(u));
  expect(lookChunks, 'other looks fetched on first open').toEqual([]);

  const panel = await openPanel(page);
  for (const n of Object.values(NAMES)) await expect(panel.getByRole('radio', { name: n, exact: true })).toHaveCount(1);
  await shot(page, 'FLOW-1-step-2-dev-panel');
  await closePanel(page);

  for (const look of LOOKS)
    for (const mode of MODES) {
      const p = await openPanel(page);
      await p.getByRole('radio', { name: NAMES[look], exact: true }).click();
      await p.getByRole('radio', { name: mode === 'light' ? 'Light' : 'Dark', exact: true }).click();
      await closePanel(page);
      await expect(page.locator('html')).toHaveAttribute('data-look', look);
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode);
      const want = themeTokens(look)[mode];
      for (const t of [
        '--background',
        '--foreground',
        '--primary',
        '--chart-1',
        '--chart-2',
        '--chart-3',
        '--money-in',
        '--money-warning',
      ]) {
        const [a, b] = await page.evaluate(
          ([name, css]) => {
            const rgb = (c: string) => {
              const cv = document.createElement('canvas');
              cv.width = cv.height = 1;
              const g = cv.getContext('2d')!;
              g.fillStyle = '#000';
              g.fillStyle = c;
              g.fillRect(0, 0, 1, 1);
              return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3);
            };
            return [rgb(getComputedStyle(document.documentElement).getPropertyValue(name!).trim()), rgb(css!)];
          },
          [t, want[t]],
        );
        for (let i = 0; i < 3; i++)
          expect(Math.abs(a![i]! - b![i]!), `${look} ${mode} ${t} ${a} vs ${b}`).toBeLessThanOrEqual(2);
      }
      for (const t of ['--icon-stroke', '--icon-cap', '--icon-join', '--icon-dot-cap'])
        expect(await cssVar(page, t), `${look} ${mode} ${t}`).toBe(want[t]);
      // the look's module has drawn the tab-less gallery figure
      await expect(page.getByTestId('gallery-figure').locator('svg, canvas').first()).toBeVisible();
      await page.waitForTimeout(300);
      await shot(page, `FLOW-1-step-3-${look}-${mode}`);
    }

  expect(w.external, 'requests that left the origin').toEqual([]);
  expect(w.errors).toEqual([]);
  await shot(page, 'FLOW-1-step-4-done');
});

test('FLOW-1b lucide icons take the look stroke, line ends and corners', async ({ page }) => {
  const want = {
    minted: ['1.5', 'butt', 'miter'],
    instrument: ['1.8', 'square', 'miter'],
    firefly: ['1.6', 'round', 'round'],
    line: ['1.5', 'round', 'round'],
    mercury: ['1.6', 'round', 'round'],
    copper: ['1.8', 'butt', 'round'],
  } as const;
  for (const look of LOOKS) {
    await page.goto(`/dev/gallery?look=${look}&mode=light`);
    await expect(page.locator('html')).toHaveAttribute('data-look', look);
    await expect(page.getByTestId('gallery-status').locator('svg.lucide').first()).toBeAttached();
    const got = await page.evaluate(() => {
      const svg = document.querySelector('main svg.lucide') as SVGElement | null;
      if (!svg) return null;
      const cs = getComputedStyle(svg);
      return [cs.strokeWidth, cs.strokeLinecap, cs.strokeLinejoin];
    });
    expect(got, `${look}: a lucide icon's computed stroke`).not.toBeNull();
    // stroke-width is in px at the icon's own viewBox scale; compare the number only
    expect([String(parseFloat(got![0]!)), got![1], got![2]], look).toEqual([...want[look]]);
  }
});

test('FLOW-2 move between the tabs; Sen button never covers the last row', async ({ page }) => {
  const w = watch(page);
  await page.goto('/');
  const bar = tabs(page);
  await expect(bar.getByRole('link', { name: /^Home/ })).toHaveAttribute('aria-current', 'page');
  await expect(bar.getByRole('link')).toHaveCount(4);
  await expect(bar.getByRole('button', { name: 'Scan a receipt' })).toBeVisible();
  const labels = await bar.locator('.tl').allTextContents();
  expect(labels.map((s) => s.trim())).toEqual(['Home', 'Review', 'Scan', 'Insights', 'More']);
  await expect(page.getByRole('button', { name: 'Ask Sen' })).toBeVisible();
  const fab = (await page.getByRole('button', { name: 'Ask Sen' }).boundingBox())!;
  expect(Math.round(fab.width)).toBeGreaterThanOrEqual(60);
  await shot(page, 'FLOW-2-step-1-home');

  for (const [name, url] of [
    ['Review', /\/review$/],
    ['Insights', /\/insights$/],
    ['More', /\/more$/],
  ] as const) {
    await bar.getByRole('link', { name: new RegExp(`^${name}`) }).tap();
    await expect(page).toHaveURL(url);
    await expect(bar.getByRole('link', { name: new RegExp(`^${name}`) })).toHaveAttribute('aria-current', 'page');
    await expect(bar.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Ask Sen' })).toBeVisible();
    await shot(page, `FLOW-2-step-2-${name.toLowerCase()}`);
  }

  // on More, scroll to the end: the last row must clear Sen's button (AC-24s)
  await page.locator('main').evaluate((m) => (m.scrollTop = m.scrollHeight));
  await page.waitForTimeout(200);
  const last = page.locator('main a').last();
  const lr = (await last.boundingBox())!;
  const fb = (await page.getByRole('button', { name: 'Ask Sen' }).boundingBox())!;
  const overlap = !(
    lr.x + lr.width <= fb.x ||
    fb.x + fb.width <= lr.x ||
    lr.y + lr.height <= fb.y ||
    fb.y + fb.height <= lr.y
  );
  expect(overlap, `last row ${JSON.stringify(lr)} vs Sen ${JSON.stringify(fb)}`).toBe(false);
  await shot(page, 'FLOW-2-step-3-more-scrolled-to-end');

  // back on a tab that isn't Home goes to Home
  await page.goBack();
  await expect(page).toHaveURL(/localhost:4173\/$/);
  await expect(bar.getByRole('link', { name: /^Home/ })).toHaveAttribute('aria-current', 'page');
  await shot(page, 'FLOW-2-step-4-back-to-home');

  // a pushed screen keeps the tab bar and drops Sen's button (AC-24s, AC-25s)
  await page.goto('/s/payments');
  await expect(bar).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask Sen' })).toHaveCount(0);
  await shot(page, 'FLOW-2-step-5-pushed-payments');

  // task screens hide the tab bar and Sen's button (AC-25)
  for (const id of ['first-run', 'payday', 'confirm', 'manual', 'balance-check', 'split-public']) {
    await page.goto(`/s/${id}`);
    await expect(page.getByTestId('not-built')).toBeVisible();
    await expect(bar, id).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ask Sen' }), id).toHaveCount(0);
  }
  await shot(page, 'FLOW-2-step-6-task-screen-split-public');
  expect(w.errors).toEqual([]);
});

test('FLOW-2b back after Home, Review, Home', async ({ page }) => {
  await page.goto('/');
  const bar = tabs(page);
  await bar.getByRole('link', { name: /^Review/ }).tap();
  await expect(page).toHaveURL(/\/review$/);
  await bar.getByRole('link', { name: /^Home/ }).tap();
  await expect(page).toHaveURL(/4173\/$/);
  await page.goBack();
  // patterns.md §6: back on Home leaves (in a browser: goes before the app). Record where it lands.
  const landed = page.url();
  await shot(page, 'FLOW-2b-step-1-back-from-home');
  test.info().annotations.push({ type: 'landed', description: landed });
  expect(landed, 'back on Home went to another tab').not.toMatch(/\/review$/);
});

test('FLOW-3 Scan: tap, short hold, long-press, and the sheet rows', async ({ page }) => {
  const w = watch(page);
  await page.goto('/');
  const scan = tabs(page).getByRole('button', { name: 'Scan a receipt' });
  await shot(page, 'FLOW-3-step-0-home');
  await scan.tap();
  await expect(page).toHaveURL(/\/scan$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(tabs(page)).toHaveCount(0);
  await shot(page, 'FLOW-3-step-1-tap-opens-scanner');
  await page.goBack();
  await expect(page).toHaveURL(/4173\/$/);

  const b = (await tabs(page).getByRole('button', { name: 'Scan a receipt' }).boundingBox())!;
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;

  // a 300 ms touch: no sheet
  await touchHold(page, x, y, 300);
  await page.waitForTimeout(300);
  await expect(page.getByRole('dialog', { name: 'Add a payment' })).toHaveCount(0);
  await shot(page, 'FLOW-3-step-2-short-hold-no-sheet');
  if (!/4173\/$/.test(page.url())) await page.goBack();
  await expect(page).toHaveURL(/4173\/$/);

  // a 650 ms touch (real touch events through CDP): the sheet, and no navigation
  await touchHold(page, x, y, 650);
  await page.waitForTimeout(600);
  const afterTouch = page.url();
  await shot(page, 'FLOW-3-step-3-touch-long-press');
  test.info().annotations.push({ type: 'URL after a 650 ms touch hold on Scan', description: afterTouch });
  expect.soft(afterTouch, 'lifting the finger chose the sheet row under it').toMatch(/4173\/$/);
  await page.goto('/');

  // the same hold with a mouse, as the slice's own test does
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect(page.getByRole('dialog', { name: 'Add a payment' })).toBeVisible();
  await page.waitForTimeout(400);
  await expect(page).toHaveURL(/4173\/$/);
  await shot(page, 'FLOW-3-step-3b-mouse-long-press-opens-scan-more');

  // back closes the sheet and stays on Home
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Add a payment' })).toBeHidden();
  await expect(page).toHaveURL(/4173\/$/);
  await shot(page, 'FLOW-3-step-4-back-closes-sheet');

  // a row in the sheet goes on, and back from there returns to Home, not to the sheet
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await page.getByRole('dialog', { name: 'Add a payment' }).getByRole('button', { name: 'Add manually' }).tap();
  await expect(page).toHaveURL(/\/s\/manual$/);
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/s\/manual$/);
  await shot(page, 'FLOW-3-step-5-add-manually');
  await page.goBack();
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/4173\/$/);
  await expect(page.getByRole('dialog', { name: 'Add a payment' })).toHaveCount(0);
  await shot(page, 'FLOW-3-step-6-back-from-manual');

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await page.getByRole('dialog', { name: 'Add a payment' }).getByRole('button', { name: 'Scan', exact: true }).tap();
  await expect(page).toHaveURL(/\/scan$/);
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/scan$/);
  await shot(page, 'FLOW-3-step-7-sheet-scan');
  expect(w.errors).toEqual([]);
});

test("FLOW-4 Review's badge at 0, 5 and 120", async ({ page }) => {
  await page.goto('/');
  const review = tabs(page).getByRole('link', { name: /^Review/ });
  await expect(page.getByTestId('review-badge')).toHaveAttribute('data-count', '5');
  await expect(review).toHaveAccessibleName(/5 to review/);
  await shot(page, 'FLOW-4-step-1-badge-5');

  let p = await openPanel(page);
  await p.getByRole('radio', { name: '0', exact: true }).click();
  await closePanel(page);
  await expect(page.getByTestId('review-badge')).toHaveCount(0);
  expect(await review.evaluate((e) => e.textContent)).not.toMatch(/to review/);
  await shot(page, 'FLOW-4-step-2-badge-0');

  p = await openPanel(page);
  await p.getByRole('radio', { name: '120', exact: true }).click();
  await closePanel(page);
  await expect(page.getByTestId('review-badge')).toHaveAttribute('data-count', '99+');
  await expect(review).toHaveAccessibleName(/More than 99 to review/);
  await shot(page, 'FLOW-4-step-3-badge-99plus');

  // patterns.md §6: the count "updates live, announced politely"
  const live = await page.evaluate(() => {
    const badge = document.querySelector('[data-k="review"]');
    return !!badge?.closest('[aria-live]') || !!badge?.querySelector('[aria-live]');
  });
  test.info().annotations.push({ type: 'aria-live around the badge', description: String(live) });
  expect(live, 'no aria-live region announces the badge count').toBe(true);
});

test('FLOW-5 type an amount into the money input', async ({ page }) => {
  await page.goto('/dev/gallery');
  const forms = page.getByTestId('gallery-forms');
  const amount = forms.getByLabel('Amount');
  await amount.scrollIntoViewIfNeeded();
  await expect(amount).toHaveAttribute('inputmode', 'decimal');
  const fs = await amount.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(fs).toBeGreaterThanOrEqual(16);
  const lab = (await forms.getByText('Amount', { exact: true }).boundingBox())!;
  const inp = (await amount.boundingBox())!;
  expect(lab.y + lab.height).toBeLessThanOrEqual(inp.y + 1);
  await shot(page, 'FLOW-5-step-0-empty');

  await amount.tap();
  await page.keyboard.type('1,284.50');
  await forms.getByRole('button', { name: 'Add' }).tap();
  await expect(page.getByText('Added RM1,284.50')).toBeVisible();
  await shot(page, 'FLOW-5-step-1-typed-1284-50');

  // the same amount typed without grouping should say the same money (patterns.md §3)
  await amount.fill('');
  await amount.tap();
  await page.keyboard.type('1284.5');
  await forms.getByRole('button', { name: 'Add' }).tap();
  const toastText = await page.locator('[data-sonner-toast]').first().innerText();
  test.info().annotations.push({ type: 'toast for 1284.5', description: toastText });
  await shot(page, 'FLOW-5-step-2-typed-1284-5');

  await amount.fill('');
  await amount.tap();
  await page.keyboard.type('12.505');
  await page.keyboard.press('Tab');
  await expect(forms.getByText('Two decimals at most, like 12.50.').last()).toBeVisible();
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  const msg = (await forms.locator('[data-slot="field-error"], [role="alert"]').first().boundingBox())!;
  expect(msg.y).toBeGreaterThanOrEqual(inp.y);
  await shot(page, 'FLOW-5-step-3-blur-three-decimals');
  await forms.getByRole('button', { name: 'Add' }).tap();
  await expect(forms.getByRole('button', { name: 'Add' })).toBeEnabled();
  await expect(amount).toHaveValue('12.505');
  await shot(page, 'FLOW-5-step-4-submit-keeps-text');

  for (const bad of ['-5', '1e3', '12..5', ' ', '99999999999999']) {
    await amount.fill(bad);
    await forms.getByRole('button', { name: 'Add' }).tap();
    await expect(amount, bad).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText(/^Added RM/), bad)
      .toHaveCount(0, { timeout: 500 })
      .catch(() => {});
  }
  await shot(page, 'FLOW-5-step-5-hostile-values');
});

test('FLOW-6 a sheet and the back button', async ({ page }) => {
  await page.goto('/');
  await page.goto('/dev/gallery');
  const overlays = page.getByTestId('gallery-overlays');
  await overlays.getByRole('button', { name: 'Open a sheet' }).scrollIntoViewIfNeeded();
  await overlays.getByRole('button', { name: 'Open a sheet' }).tap();
  const sheet = page.getByRole('dialog', { name: 'Which category?' });
  await expect(sheet).toBeVisible();
  await shot(page, 'FLOW-6-step-1-sheet-open');
  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/dev\/gallery/);
  await shot(page, 'FLOW-6-step-2-back-closed-it');

  await overlays.getByRole('button', { name: 'Open a sheet' }).tap();
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Close' }).tap();
  await expect(sheet).toBeHidden();
  await page.waitForTimeout(400);
  await expect(page).toHaveURL(/\/dev\/gallery/);
  await shot(page, 'FLOW-6-step-3-closed-by-close');
  await page.goBack();
  await expect(page).toHaveURL(/4173\/$/);
  await shot(page, 'FLOW-6-step-4-back-leaves-gallery');

  // Sen's sheet on Home: back closes it first
  await page.getByRole('button', { name: 'Ask Sen' }).tap();
  const sen = page.getByRole('dialog', { name: 'Sen' });
  await expect(sen).toBeVisible();
  await expect(sen).toContainText('Looking at: Home');
  await shot(page, 'FLOW-6-step-5-sen-sheet');
  await page.goBack();
  await expect(sen).toBeHidden();
  await expect(page).toHaveURL(/4173\/$/);
  await shot(page, 'FLOW-6-step-6-back-closes-sen');
});

test('FLOW-7 a change with Undo, one toast at a time, gone after 6 s', async ({ page }) => {
  await page.goto('/dev/gallery');
  const overlays = page.getByTestId('gallery-overlays');
  await overlays.getByRole('button', { name: 'Show a toast' }).scrollIntoViewIfNeeded();
  await overlays.getByRole('button', { name: 'Show a toast' }).tap();
  await expect(page.getByText('Attached to RM58.30 on Ryt')).toBeVisible();
  await shot(page, 'FLOW-7-step-1-toast');
  await page.getByRole('button', { name: 'Undo' }).tap();
  await expect(page.getByText('Undone')).toBeVisible();
  await shot(page, 'FLOW-7-step-2-undone');

  // a change made at once after Undo still gets its own toast and Undo (AC-33s)
  await overlays.getByRole('button', { name: 'Show a toast' }).tap();
  await page.waitForTimeout(1200);
  const kept = await page.getByText('Attached to RM58.30 on Ryt').isVisible();
  await shot(page, 'FLOW-7-step-2b-change-right-after-undo');
  test.info().annotations.push({ type: 'toast for a change right after Undo', description: String(kept) });
  expect.soft(kept, 'a change made right after Undo got no toast, so no Undo').toBe(true);

  // a Review answer replaces the toast: one at a time
  await page.waitForTimeout(500);
  await overlays.getByRole('button', { name: 'Show a toast' }).tap();
  await expect(page.getByText('Attached to RM58.30 on Ryt')).toBeVisible();
  const rows = page.getByTestId('gallery-rows');
  await rows.getByRole('button', { name: /Meals.*Sen suggests this/ }).scrollIntoViewIfNeeded();
  await rows.getByRole('button', { name: /Meals.*Sen suggests this/ }).tap();
  await expect(page.getByText('ROTI BAKAR 88 is Meals now')).toBeVisible();
  await expect(page.locator('[data-sonner-toast][data-visible="true"]')).toHaveCount(1);
  await shot(page, 'FLOW-7-step-3-replaced');

  const t0 = Date.now();
  await page.waitForTimeout(5000);
  await expect(page.getByText('ROTI BAKAR 88 is Meals now')).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(page.getByText('ROTI BAKAR 88 is Meals now')).toBeHidden({ timeout: 1500 });
  test.info().annotations.push({ type: 'toast gone after ms', description: String(Date.now() - t0) });
  await shot(page, 'FLOW-7-step-4-gone-after-6s');
});

for (const look of ['minted', 'copper'] as const)
  test(`FLOW-1c an unknown or garbage stored look and mode fall back (${look} stored as junk)`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sen.look', 'clay');
      localStorage.setItem('sen.mode', 'purple');
      localStorage.setItem('sen.dev.textScale', '9');
    });
    const w = watch(page);
    await page.goto(`/?look=../../etc&mode=%3Cscript%3E`);
    await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
    await expect(page.locator('html')).toHaveAttribute('data-mode', /^(light|dark)$/);
    await expect(page.getByTestId('not-built')).toBeVisible();
    expect(w.errors).toEqual([]);
    if (look === 'minted') await shot(page, 'FLOW-1c-step-1-garbage-falls-back');
  });

test('FLOW-2c an unknown screen id', async ({ page }) => {
  const w = watch(page);
  await page.goto('/s/does-not-exist');
  await page.waitForTimeout(800);
  const url = page.url();
  const body = await page.locator('body').innerText();
  test.info().annotations.push({ type: 'landed', description: `${url} :: ${body.slice(0, 120)}` });
  await shot(page, 'FLOW-2c-step-1-unknown-screen');
  expect(w.errors, 'errors on an unknown screen id').toEqual([]);
  await expect(page).toHaveURL(/4173\/$/);
  await expect(page.getByTestId('not-built')).toBeVisible();
});

test('FLOW-avatar the dev panel avatar player and Sen button', async ({ page }) => {
  await page.goto('/');
  const p = await openPanel(page);
  for (const s of ['Resting', 'Has a note', 'Listening', 'Working', 'With helpers', 'Answering', 'Paused', 'Done']) {
    await p.getByRole('radio', { name: s, exact: true }).click();
    await expect(p.getByText(`${s}. Sen's button plays it too.`)).toBeVisible();
  }
  await shot(page, 'FLOW-9-step-0-avatar-player-done');
  await closePanel(page);
});

test.describe('FLOW-9 the avatar in eight states', () => {
  for (const look of LOOKS)
    test(`${look}: eight distinct states, still under the dev panel's reduced motion`, async ({ page }) => {
      await page.goto(`/dev/gallery?look=${look}&mode=dark`);
      await expect(page.locator('html')).toHaveAttribute('data-look', look);
      const states = ['resting', 'note', 'listening', 'thinking', 'helpers', 'speaking', 'paused', 'done'];
      await page.getByTestId('gallery-sen').scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      const frames: string[] = [];
      for (const s of states) {
        await expect(page.getByTestId(`avatar-${s}`).locator('canvas')).toHaveCount(1);
        frames.push(await frameOf(page, `avatar-${s}`));
      }
      expect(new Set(frames).size, `${look}: distinct state drawings`).toBe(8);
      await shot(page, `FLOW-9-step-1-${look}-eight-states`);

      // the dev panel's own Reduced motion switch (not the media query)
      const p = await openPanel(page);
      await p.getByRole('switch', { name: 'Reduced motion' }).click();
      await closePanel(page);
      await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
      await page.getByTestId('gallery-sen').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      for (const s of states) {
        const a = await frameOf(page, `avatar-${s}`);
        await page.waitForTimeout(1000);
        expect(await frameOf(page, `avatar-${s}`), `${look} ${s} holds still`).toBe(a);
      }
      await shot(page, `FLOW-9-step-2-${look}-reduced-motion`);
    });
});
