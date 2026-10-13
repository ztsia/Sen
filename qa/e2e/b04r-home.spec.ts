import { expect, test } from '@playwright/test';
import { LOOKS, OUT, open, shot, watch } from './b04r-helpers';

// FLOW-1 / FLOW-2: Home fits at 390x844 in every look and scenario; the payday strip and Sen's note.
const SCEN = ['wei-ming', 'payday', 'before-salary', 'first-cycle', 'capture-off', 'cap', 'month'];
const over = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const s = document.scrollingElement!;
    const m = document.querySelector('main')!;
    return { doc: s.scrollHeight - s.clientHeight, main: m.scrollHeight - m.clientHeight };
  });

const results: string[] = [];
for (const scen of SCEN)
  for (const look of LOOKS)
    for (const mode of ['light', 'dark'])
      test(`home fits: ${scen} ${look} ${mode}`, async ({ page }) => {
        const w = watch(page);
        await open(page, `/?scenario=${scen}`, look, mode);
        await page.waitForTimeout(300);
        const o = await over(page);
        console.log(`FIT ${scen} ${look} ${mode} doc=${o.doc} main=${o.main}`);
        if (look === 'minted' || look === 'copper') await shot(page, `FLOW-1-home-${scen}-${look}-${mode}`);
        expect.soft(Math.max(o.doc, o.main), `${scen} ${look} ${mode} overflow px`).toBeLessThanOrEqual(0);
        expect(w.errors).toEqual([]);
      });

test('home: strip, note, More', async ({ page }) => {
  await open(page, '/?scenario=wei-ming');
  const strip = page.getByRole('button', { name: /Payday plan/ });
  await expect(strip).toContainText('Payday plan · 2 of 3');
  await shot(page, 'FLOW-1-step-1-home');
  const note = page.getByTestId('sen-note');
  await expect(note).toContainText('More');
  const lines = await note.locator('p.line-clamp-2').evaluate((p) => {
    const cs = getComputedStyle(p);
    return { clamp: cs.webkitLineClamp, h: p.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight) };
  });
  expect(lines.clamp).toBe('2');
  expect(lines.h).toBeLessThanOrEqual(lines.lh * 2 + 1);
  await note.click();
  await expect(page.getByRole('dialog', { name: 'Sen' })).toBeVisible();
  await shot(page, 'FLOW-1-step-3-more-opens-sen');
  await page.keyboard.press('Escape');
  await page.goBack().catch(() => {});
});

test('home: strip opens payday, absent before salary and when not active', async ({ page }) => {
  await open(page, '/?scenario=wei-ming');
  await page.getByRole('button', { name: /Payday plan/ }).click();
  await expect(page).toHaveURL(/\/s\/payday/);
  await shot(page, 'FLOW-1-step-4-strip-opens-payday');
  for (const scen of ['before-salary', 'first-cycle', 'month']) {
    await open(page, `/?scenario=${scen}`);
    await expect(page.getByRole('button', { name: /Payday plan/ }), scen).toHaveCount(0);
  }
  await open(page, '/?scenario=before-salary');
  await shot(page, 'FLOW-2-step-1-no-strip-before-salary');
});

test.afterAll(async () => {
  (await import('node:fs')).writeFileSync(`${OUT}../text/home-fit.txt`, results.sort().join('\n'));
});
