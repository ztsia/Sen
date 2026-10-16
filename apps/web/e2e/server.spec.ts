import { expect, test } from '@playwright/test';
import { ownerSql } from './server.setup';

// B05's done-when in a browser: a real code signs in against the local API and Postgres, a stranger is
// turned away, and Account shows the email and signs out everywhere. The preview code is 123456.
test('signs in with a code, shows the email, and signs out everywhere', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/s\/sign-in/);

  const email = page.getByLabel('Your email');
  // A preview fills in its made-up person, so the review app needs only the code.
  await expect(email).toHaveValue('weiming@example.com');
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

/** Signs Wei Ming in from the sign-in screen. */
async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/s/sign-in');
  await page.getByLabel('Your email').fill('weiming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}

test.describe('opened offline', () => {
  test.use({ serviceWorkers: 'allow' });

  // QA B05 run 1, 3: a signed-in person opening Sen offline stays in it; only the server saying
  // nobody's signed in sends them to sign-in
  test('a signed-in person who opens Sen offline stays in it', async ({ page, context }) => {
    await signIn(page);
    await page.goto('/review');
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 20_000 });
    await context.setOffline(true);
    await page.goto('/review');
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page).not.toHaveURL(/sign-in/);
    await context.setOffline(false);
  });
});

// QA B05 run 1, 10 and run 2, 10: paused access is said at sign-in, whether the person was signed in
// (two reads come back 403 at once) or asks for a code
test('a suspended person is told their access is paused', async ({ page }) => {
  const WEI_MING = "(select id from auth_user where email = 'weiming@example.com')";
  await signIn(page);
  await ownerSql(`update user_access set suspended_at = now() where user_id = ${WEI_MING}`);
  try {
    await page.goto('/s/settings/you');
    await expect(page).toHaveURL(/\/s\/sign-in/);
    await expect(page.getByText('Your access to Sen is paused')).toBeVisible();
    await page.getByLabel('Your email').fill('weiming@example.com');
    await page.getByRole('button', { name: 'Send the code' }).click();
    await expect(page.getByText('Your access to Sen is paused')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Type the code' })).toHaveCount(0);
  } finally {
    await ownerSql(`update user_access set suspended_at = null where user_id = ${WEI_MING}`);
  }
});

// QA tooling (D139): a session that ends while Sen is open (it expired, or was ended elsewhere) must
// leave the person at sign-in, not on a broken screen or a spinner that never ends.
test('a session that ends while Sen is open leaves the person at sign-in, not on a broken screen', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeVisible();
  // the server forgets this person's session: its row goes, as an expiry would remove it
  await ownerSql(
    `delete from auth_session where user_id = (select id from auth_user where email = 'weiming@example.com')`,
  );
  // the next thing the person does that needs the server: open Settings, which reads from it
  await page.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: /^More/ }).click();
  await page.getByRole('link', { name: /^Settings/ }).click();
  await expect(page).toHaveURL(/\/s\/sign-in/);
  await expect(page.getByLabel('Your email')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send the code' })).toBeVisible();
  // nothing left spinning, nothing broken
  await expect(page.locator('[role="status"]:has-text("Loading")')).toHaveCount(0);
  await expect(page.getByText(/something went wrong|couldn.t load/i)).toHaveCount(0);
  // and signing in again works
  await page.getByLabel('Your email').fill('weiming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/sign-in/);
  await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeVisible();
});
