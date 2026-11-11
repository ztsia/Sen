import { expect, test } from '@playwright/test';
import { ALL_LOOKS, open, watchErrors } from './helpers';
import { TOTAL, walkFirstRun } from './first-run';

// First run in every look (B08, done-when 5): the shell's seven steps, with its native ones answered
// by the dev simulator, from the email to Home, and the accounts it made. All six looks whatever
// E2E_LOOKS says: it's one walk each, and first run is the first thing everyone sees.
test.describe('first run, walked in each look', () => {
  for (const look of ALL_LOOKS)
    test(look, async ({ page }) => {
      const errors = watchErrors(page);
      await open(page, '/s/first-run?scenario=new', look);
      await walkFirstRun(page);
      await expect(page.getByTestId('hero')).toBeVisible();
      await page.getByRole('link', { name: 'More' }).click();
      await page.getByRole('link', { name: /^Accounts/ }).click();
      await expect(page.getByText(TOTAL)).toBeVisible();
      expect(errors).toEqual([]);
    });
});
