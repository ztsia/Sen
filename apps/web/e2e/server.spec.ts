import { expect, test } from '@playwright/test';

// B05's done-when in a browser: a real code signs in against the local API and Postgres, a stranger is
// turned away, and Account shows the email and signs out everywhere. The preview code is 123456.
test('signs in with a code, shows the email, and signs out everywhere', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/s\/sign-in/);

  const email = page.getByLabel('Your email');
  await email.fill('stranger@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await expect(page.getByText('Sen is invitation-only')).toBeVisible();

  await email.fill('weiming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await expect(page.getByRole('heading', { name: 'Type the code' })).toBeVisible();

  const code = page.getByLabel('6-digit code');
  await code.fill('654321');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('That’s not the right code')).toBeVisible();

  await code.fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/sign-in/);

  await page.goto('/s/settings/account');
  await expect(page.getByText('weiming@example.com')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out everywhere' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sign out everywhere' }).click();
  await expect(page).toHaveURL(/\/s\/sign-in/);

  await page.goto('/');
  await expect(page).toHaveURL(/\/s\/sign-in/);
});
