import { expect, test } from '@playwright/test';
import { open } from './helpers';

// The building blocks behave as patterns.md §7 says: a change happens at once with Undo; a form says
// what's wrong under the field and keeps what was typed; a sheet closes by back.

test('answering a Review row clears it at once, and Undo brings it back', async ({ page }) => {
  await open(page, '/dev/gallery');
  const rows = page.getByTestId('gallery-rows');
  await rows.getByRole('button', { name: /Meals.*Sen suggests this/ }).click();
  await expect(rows.getByText('ROTI BAKAR 88')).toBeHidden();
  const toast = page.getByText('ROTI BAKAR 88 is Meals now');
  await expect(toast).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(rows.getByText('ROTI BAKAR 88')).toBeVisible();
});

test('a change made right after Undo still gets its own toast, with Undo', async ({ page }) => {
  await open(page, '/dev/gallery');
  const overlays = page.getByTestId('gallery-overlays');
  await overlays.getByRole('button', { name: 'Show a toast' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Undone')).toBeVisible();
  await overlays.getByRole('button', { name: 'Show a toast' }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText('Attached to RM58.30 on Ryt')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
});

test('the money input parses text into sen, says what is wrong, and keeps what was typed', async ({ page }) => {
  await open(page, '/dev/gallery');
  const forms = page.getByTestId('gallery-forms');
  const amount = forms.getByLabel('Amount');
  await expect(amount).toHaveAttribute('inputmode', 'decimal');
  await amount.fill('12.345');
  await forms.getByRole('button', { name: 'Add' }).click();
  await expect(forms.getByText('Two decimals at most, like 12.50.')).toBeVisible();
  await expect(amount).toHaveValue('12.345');
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  await amount.fill('1,284.50');
  await forms.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Added RM1,284.50')).toBeVisible();
});

test('Other… opens a sheet that back closes, and the destructive dialog is only for what cannot be undone', async ({
  page,
}) => {
  await open(page, '/dev/gallery');
  await page.getByTestId('gallery-rows').getByRole('button', { name: 'Other…' }).click();
  await expect(page.getByRole('dialog', { name: 'Which category?' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Which category?' })).toBeHidden();
  await expect(page).toHaveURL(/\/dev\/gallery/);
  await page.getByTestId('gallery-overlays').getByRole('button', { name: 'Delete forever' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete this payment forever?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep it' }).click();
  await expect(dialog).toBeHidden();
});
