import { expect, test } from '@playwright/test';
import { open, settled } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 flows I: evidence for the USD subscription finding. Dev server (5291) or preview build.
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

test('R4-FLOW-2c a USD subscription added by hand shows a real MYR estimate and counts in the monthly commitment', async ({
  page,
}) => {
  const F = 'R4-FLOW-2c';
  await open(page, '/s/subscriptions');
  await settled(page);
  const before = await page
    .getByText('Committed each month')
    .locator('xpath=following-sibling::*[1]')
    .first()
    .innerText();
  await page.getByRole('button', { name: 'Add a subscription' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Spotify US');
  await page.getByRole('button', { name: 'USD', exact: true }).click();
  await page.getByLabel('Amount each time', { exact: true }).click();
  await page.keyboard.type('999');
  await page.getByLabel('Next renewal', { exact: true }).fill('2026-11-30');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(800);
  const row = page.locator('[data-slot="card"]').filter({ hasText: 'Spotify US' });
  const rowText = (await row.innerText()).replace(/\n+/g, ' | ');
  const after = await page
    .getByText('Committed each month')
    .locator('xpath=following-sibling::*[1]')
    .first()
    .innerText();
  note(F, `row: ${rowText}; committed before ${before.replace(/\n/g, ' ')} after ${after.replace(/\n/g, ' ')}`);
  await step(
    page,
    F,
    1,
    'usd-estimate',
    'add US$9.99 a month by hand',
    'the row reads "≈ RM…" above zero with its rate and date, and the monthly commitment rises',
    async () => {
      expect(rowText).toContain('US$9.99');
      expect(rowText).not.toMatch(/≈\s*RM\s?0\.00/);
      expect(after).not.toBe(before);
    },
  );
});
