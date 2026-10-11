import { expect, test, type Page } from '@playwright/test';
import { LOOKS, MODES, open, smallTargets, watchErrors } from './helpers';

// B01 done-when 3 and 4: the tab bar in each look on the shared outlines, aria-current, the badge to
// 99+, Scan's tap and long-press; the avatar in its eight states, still under reduced motion; and back
// closing a sheet before it leaves the screen.

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });

for (const look of LOOKS)
  for (const mode of MODES)
    test(`the tab bar in ${look}, ${mode}: five tabs, drawn by the look, the active one marked`, async ({ page }) => {
      const errors = watchErrors(page);
      await open(page, '/', look, mode);
      const bar = tabs(page);
      await expect(bar.getByRole('link')).toHaveCount(4);
      await expect(bar.getByRole('link', { name: /^Home/ })).toHaveAttribute('aria-current', 'page');
      await expect(bar.getByRole('button', { name: 'Scan a receipt' })).toBeVisible();
      // each tab has the look's idle and active icon, and the scan button its own drawing
      for (const k of ['home', 'review', 'insights', 'more']) {
        await expect(bar.locator(`[data-k="${k}"] .i-off svg`)).toHaveCount(1);
        await expect(bar.locator(`[data-k="${k}"] .i-on svg`)).toHaveCount(1);
      }
      await expect(bar.locator('.scanbtn svg')).toHaveCount(1);
      // the active state moves with the tab, and only one tab is current
      await bar.getByRole('link', { name: /^Insights/ }).click();
      await expect(page).toHaveURL(/\/insights/);
      await expect(bar.getByRole('link', { name: /^Insights/ })).toHaveAttribute('aria-current', 'page');
      await expect(bar.locator('[aria-current="page"]')).toHaveCount(1);
      expect(errors).toEqual([]);
    });

test("Review's badge counts Needs you, up to 99+, and is read as words", async ({ page }) => {
  await open(page, '/');
  const review = tabs(page).getByRole('link', { name: /^Review/ });
  // Wei Ming's month has twelve things that need you (D72)
  await expect(review).toHaveAccessibleName('Review , 12 to review');
  await expect(page.getByTestId('review-badge')).toHaveAttribute('data-count', '12');
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.getByRole('radio', { name: '120' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByTestId('review-badge')).toHaveAttribute('data-count', '99+');
  await expect(review).toHaveAccessibleName('Review , More than 99 to review');
  await expect(page.getByTestId('review-badge').locator('svg')).toBeVisible();
});

test('Scan: a tap opens the scanner; a long-press of 500 ms opens scan-more, and a shorter one does not', async ({
  page,
}) => {
  await open(page, '/');
  const scan = tabs(page).getByRole('button', { name: 'Scan a receipt' });
  const box = (await scan.boundingBox())!;
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  // a long-press: held past 500 ms
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect(page.getByRole('dialog', { name: 'Add a payment' })).toBeVisible();
  await expect(page).toHaveURL(/\/\?|\/$/);
  // back closes the sheet before it leaves the screen
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Add a payment' })).toBeHidden();
  await expect(tabs(page).getByRole('link', { name: /^Home/ })).toHaveAttribute('aria-current', 'page');

  // held for 300 ms only: a tap, so it opens the scanner and no sheet
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  await expect(page).toHaveURL(/\/scan/);
  await expect(page.getByRole('dialog')).toBeHidden();
  // the scanner is a task with an end: no tab bar
  await expect(tabs(page)).toBeHidden();
});

test("Sen's button is on the tab screens only, labelled, and opens Sen's sheet over the screen", async ({ page }) => {
  await open(page, '/');
  await page.getByRole('button', { name: 'Ask Sen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Sen' });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Looking at: Home');
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toBeHidden();
  await page.goto('/s/payments');
  await expect(page.getByRole('button', { name: 'Ask Sen' })).toBeHidden();
  await expect(tabs(page)).toBeVisible();
});

const frame = (page: Page, state: string) =>
  page
    .getByTestId(`avatar-${state}`)
    .locator('canvas')
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
const STATES = ['resting', 'note', 'listening', 'thinking', 'helpers', 'speaking', 'paused', 'done'];

for (const look of LOOKS) {
  test(`${look}: Sen's avatar plays its eight states`, async ({ page }) => {
    await open(page, '/dev/gallery', look, 'dark');
    for (const s of STATES) {
      await page.getByTestId(`avatar-${s}`).scrollIntoViewIfNeeded();
      const a = await frame(page, s);
      expect(a.length, `${s} is drawn`).toBeGreaterThan(1000);
    }
    // a working Sen moves
    await page.getByTestId('avatar-thinking').scrollIntoViewIfNeeded();
    const a = await frame(page, 'thinking');
    await page.waitForTimeout(400);
    expect(await frame(page, 'thinking')).not.toBe(a);
  });

  test(`${look}: under reduced motion, every avatar holds one still frame`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/dev/gallery', look, 'dark');
    for (const s of STATES) {
      await page.getByTestId(`avatar-${s}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const a = await frame(page, s);
      await page.waitForTimeout(400);
      expect(await frame(page, s), `${s} holds still`).toBe(a);
    }
  });
}

test('Mercury and Copper draw a still fallback where WebGL is missing', async ({ page }) => {
  for (const look of ['mercury', 'copper'] as const) {
    await open(page, '/dev/gallery?gl=0', look, 'dark');
    const canvas = page.getByTestId('gallery-figure').locator('canvas').first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(500);
    const drawn = await canvas.evaluate((c: HTMLCanvasElement) => {
      const g = c.getContext('2d')!;
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let ink = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) ink++;
      return ink;
    });
    expect(drawn, `${look}'s fallback figure has ink`).toBeGreaterThan(500);
  }
});

// The gallery has no tab bar, so the frame is measured here: the tab bar and Sen's button on a tab
// screen, the sheets they open, and the dev panel, in every look (QA B01 run 2, finding 1).
for (const look of LOOKS)
  test(`${look}: every target in the frame, its sheets and the dev panel is at least 48 px`, async ({ page }) => {
    await open(page, '/', look);
    const tabSizes = await tabs(page)
      .locator('a, button')
      .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(tabSizes).toHaveLength(5);
    const small: string[] = (await smallTargets(page)).map((s) => `home: ${s}`);

    await page.getByRole('button', { name: 'Ask Sen' }).click();
    await expect(page.getByRole('dialog', { name: 'Sen' })).toBeVisible();
    small.push(...(await smallTargets(page)).map((s) => `sen sheet: ${s}`));
    await page.goBack();

    const box = (await tabs(page).getByRole('button', { name: 'Scan a receipt' }).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
    await expect(page.getByRole('dialog', { name: 'Add a payment' })).toBeVisible();
    small.push(...(await smallTargets(page)).map((s) => `scan sheet: ${s}`));
    await page.goBack();

    await page.getByRole('button', { name: 'Dev panel' }).click();
    await expect(page.getByRole('dialog', { name: 'Dev panel' })).toBeVisible();
    small.push(...(await smallTargets(page)).map((s) => `dev panel: ${s}`));
    expect(small, `tab heights ${tabSizes.join(', ')}\n${small.join('\n')}`).toEqual([]);
  });

test("the frame clears the status bar and, with no tab bar, the navigation bar, from the shell's insets", async ({
  page,
}) => {
  // the shell's SystemBars plugin sets these on <html> (capacitor.config.ts, insetsHandling: 'css')
  const inset = (top: number, bottom: number) =>
    page.evaluate(
      ([t, b]) => {
        document.documentElement.style.setProperty('--safe-area-inset-top', `${t}px`);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', `${b}px`);
      },
      [top, bottom],
    );
  await open(page, '/');
  await inset(40, 24);
  const bar = page.locator('header').first();
  await expect.poll(async () => (await bar.boundingBox())!.y).toBe(40);
  // the tab bar pads itself for the navigation bar, so the column doesn't add it twice
  const tabBox = (await tabs(page).boundingBox())!;
  expect(tabBox.y + tabBox.height).toBe(page.viewportSize()!.height);

  // a screen without the tab bar ends above the navigation bar
  await page.goto('/scan');
  await inset(40, 24);
  await expect(tabs(page)).toHaveCount(0);
  await expect.poll(async () => (await page.locator('header').first().boundingBox())!.y).toBe(40);
  const main = (await page.locator('main').first().boundingBox())!;
  expect(main.y + main.height).toBe(page.viewportSize()!.height - 24);
});
