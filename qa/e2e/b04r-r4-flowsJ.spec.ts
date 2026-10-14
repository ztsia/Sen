import { expect, test } from '@playwright/test';
import { settled } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 flows J: Appearance, the sad twins. Preview build (5292).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

test('R4-FLOW-6c a corrupted stored look, mode and quarterly flag fall back; the app opens', async ({ page }) => {
  const F = 'R4-FLOW-6c';
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('sen.look', '<script>alert(1)</script>');
    localStorage.setItem('sen.mode', '{"x":1}');
    localStorage.setItem('sen.lookQuarterly', 'banana');
  });
  await page.goto('/s/settings/appearance');
  await settled(page);
  const look = await page.locator('html').getAttribute('data-look');
  const mode = await page.locator('html').getAttribute('data-mode');
  note(F, `look ${look} mode ${mode} errors ${JSON.stringify(errors)}`);
  await step(
    page,
    F,
    1,
    'corrupt',
    'open Appearance with garbage in the stored look, mode and flag',
    'the page renders; the look is one of the six; the mode is light or dark; no page error',
    async () => {
      expect(['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper']).toContain(look);
      expect(['light', 'dark']).toContain(mode);
      await expect(page.getByRole('heading', { name: /Look|Appearance/ }).first()).toBeVisible();
      expect(errors).toEqual([]);
    },
  );
});

test('R4-FLOW-6d choosing a look while "changes each quarter" is on: what the screen says', async ({ page }) => {
  const F = 'R4-FLOW-6d';
  await page.goto('/s/settings/appearance?look=minted&mode=light');
  await settled(page);
  const sw = page.getByRole('switch').first();
  const name = await sw.getAttribute('aria-label').catch(() => null);
  const before = await sw.getAttribute('aria-checked');
  const cards = page.getByRole('radio');
  const n = await cards.count();
  note(F, `switch "${name}" checked ${before}; ${n} radios`);
  await page.getByRole('radio', { name: /Copper/ }).click();
  await page.waitForTimeout(800);
  const after = await sw.getAttribute('aria-checked');
  const txt = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
  const look = await page.locator('html').getAttribute('data-look');
  note(F, `after choosing Copper: look ${look}, switch ${after}; text ${txt.slice(0, 500)}`);
  await step(
    page,
    F,
    1,
    'choose',
    'choose Copper while the quarterly switch is on',
    'the look changes; the screen says whether the choice will be replaced next quarter (switch off, or words)',
    async () => {
      expect(look).toBe('copper');
      const says = after === 'false' || /replace|next quarter|until|kept|pinned|stay/i.test(txt);
      expect(says, txt.slice(0, 300)).toBe(true);
    },
  );
  await page.reload();
  await settled(page);
  const kept = await page.locator('html').getAttribute('data-look');
  note(F, `after reload: ${kept}`);
});
