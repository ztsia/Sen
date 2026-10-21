import { expect, test, type Page } from '@playwright/test';
import { open, watchErrors } from './helpers';

// B05 · Feel (patterns.md §8, D140): which motion each change gets, press feedback in the first frame,
// reduced motion, and the haptics' moments. The journeys run with motion reduced; these turn it on
// where they check the motion itself.

/** Records each view transition the page starts, by its kinds. */
async function recordTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: string[] };
    w.__vt = [];
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    document.startViewTransition = ((arg: unknown) => {
      const types = (arg as { types?: string[] } | undefined)?.types;
      w.__vt.push(types?.length ? types.join(',') : 'untyped');
      return start(arg as never);
    }) as typeof document.startViewTransition;
  });
}
const transitions = (page: Page) => page.evaluate(() => (window as unknown as { __vt: string[] }).__vt);

test.describe('with motion on', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('a push goes forward, back pops, a tab crossfades, and a sheet moves no screen', async ({ page }) => {
    const errors = watchErrors(page);
    await recordTransitions(page);
    await open(page, '/s/payments');
    const row = page.locator('[data-share]').first();
    await expect(row).toBeVisible();
    const id = await row.getAttribute('data-share');
    await row.click();
    await expect(page).toHaveURL(/\/s\/txn/);
    // the tapped payment's amount is the one shared element
    await expect
      .poll(() => page.locator('#sen-share').evaluate((e) => e.textContent))
      .toContain(`[data-share="${id}"]`);
    await expect(page.locator('[data-share-figure]')).toHaveAttribute('data-share', id!);
    await page.goBack();
    await expect(page).toHaveURL(/\/s\/payments/);
    // a tab, even from a pushed screen, crossfades
    await page.locator('[data-k=home]').click();
    await expect(page).toHaveURL(/\/\?|\/$/);
    await page.locator('[data-k=review]').click();
    await expect(page).toHaveURL(/\/review/);
    await expect.poll(() => transitions(page)).toEqual(['forward', 'back', 'tab', 'tab']);
    // a sheet's history step is not a screen change
    await page.getByRole('button', { name: 'Ask Sen' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await transitions(page)).toEqual(['forward', 'back', 'tab', 'tab']);
    expect(errors).toEqual([]);
  });

  test('answering a Review row clears it in motion, and Undo brings it back', async ({ page }) => {
    await recordTransitions(page);
    await open(page, '/review');
    const rows = page.locator('[data-review]');
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();
    await rows
      .getByRole('button', { name: /^(Income|Transfer|Yes|Apply)\b/ })
      .first()
      .click();
    await expect(rows).toHaveCount(before - 1);
    expect(await transitions(page)).toContain('change');
  });
});

test('reduced motion: every change is at once, with no view transition', async ({ page }) => {
  await recordTransitions(page);
  await open(page, '/s/payments');
  await page.locator('[data-share]').first().click();
  await expect(page).toHaveURL(/\/s\/txn/);
  await page.goBack();
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
  expect(await transitions(page)).toEqual([]);
});

test('a press shows in the first frame, from the finger, and leaves nothing behind', async ({ page }) => {
  await open(page, '/more');
  const row = page.locator('[data-slot=item]').filter({ hasText: 'Payments' }).first();
  const box = (await row.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + box.height / 2);
  await page.mouse.down();
  // the ripple is placed on pointerdown, before any click or navigation
  await expect(row.locator('.press')).toHaveCount(1);
  await expect(row.locator('.press')).toHaveAttribute('aria-hidden', 'true');
  await page.mouse.move(box.x + 40, box.y - 200);
  await page.mouse.up();
  await expect(row.locator('.press')).toHaveCount(0);
  // a control that draws its own response gets none
  await open(page, '/s/settings/appearance');
  const toggle = page.getByRole('switch').first();
  const t = (await toggle.boundingBox())!;
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
  await page.mouse.down();
  await expect(toggle.locator('.press')).toHaveCount(0);
  await page.mouse.up();
});

test('haptics: a toggle, a change with Undo, and Undo', async ({ page }) => {
  await open(page, '/s/settings/appearance');
  const played = () => page.evaluate(() => (window as unknown as { __senHaptics: string[] }).__senHaptics.slice());
  const toggle = page.getByRole('switch').first();
  const was = (await toggle.getAttribute('aria-checked')) === 'true';
  await toggle.click();
  await toggle.click();
  expect(await played()).toEqual(was ? ['toggle-off', 'toggle-on'] : ['toggle-on', 'toggle-off']);

  await page.locator('[data-k=review]').click();
  await page
    .locator('[data-review]')
    .getByRole('button', { name: /^(Income|Transfer|Yes|Apply)\b/ })
    .first()
    .click();
  const undo = page.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeVisible();
  await undo.click();
  await expect.poll(played).toEqual(expect.arrayContaining(['confirm', 'undo']));
});
