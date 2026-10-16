import { test } from '@playwright/test';
import { PEOPLE, fresh, sql } from './b05-setup';
import { before, expect, note, signIn, step, toast } from './b05-lib';

// QA B05 run 2, phase 5: qa/B05/flows.md *Run 2*, walked in Minted light at 390×844 against sen_qa.
const sessions = (id: string) => Number(sql(`select count(*) from auth_session where user_id = '${id}'`));
const users = () => Number(sql('select count(*) from auth_user'));
const audits = (id: string) => Number(sql(`select count(*) from audit_log where user_id = '${id}'`));

test.beforeEach(() => fresh());

test('FLOW-20 a mixed-case email signs in to the same person', async ({ page }) => {
  const F = 'FLOW-20';
  const u0 = users();
  await page.goto('/');
  await step(page, F, 1, 'sign-in', 'open Sen signed out', 'sign-in shows', async () => {
    await expect(page).toHaveURL(/\/s\/sign-in/);
  });
  await page.getByLabel('Your email').fill('  QA-Ben@Example.COM ');
  await before(page, F, 2, 'code-step');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await step(page, F, 2, 'code-step', 'send the code to the mixed-case address', 'the code step names the lower-case address', async () => {
    await expect(page.getByRole('heading', { name: 'Type the code' })).toBeVisible();
    await expect(page.locator('main')).toContainText(PEOPLE.ben.email);
  });
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await step(page, F, 3, 'signed-in', 'type the right code', 'signed in; no new auth_user; one session for Ben', async () => {
    await expect(page).not.toHaveURL(/sign-in/);
    expect(users()).toBe(u0);
    expect(sessions(PEOPLE.ben.id)).toBe(1);
  });
  await page.goto('/s/settings/account');
  await step(page, F, 4, 'account', 'open Settings → Account', 'the one email shows', async () => {
    await expect(page.locator('main')).toContainText(PEOPLE.ben.email);
  });
});

test('FLOW-21 a suspended person with a live session', async ({ page }) => {
  const F = 'FLOW-21';
  await signIn(page, PEOPLE.ben.email);
  await page.goto('/s/settings/account');
  await step(page, F, 1, 'signed-in', 'Ben signed in, Account open', 'his email shows', async () => {
    await expect(page.locator('main')).toContainText(PEOPLE.ben.email);
  });
  sql(`update user_access set suspended_at = now() where user_id = '${PEOPLE.ben.id}'`);
  try {
    await page.goto('/s/settings/you');
    await page.waitForTimeout(2000);
    note(F, `after suspension, You: ${page.url()} | ${(await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 300)}`);
    await step(page, F, 2, 'paused', 'reload a screen that reads the server', 'sign-in, saying access is paused; Ben’s session ended', async () => {
      await expect(page).toHaveURL(/\/s\/sign-in/);
      await expect(page.locator('body')).toContainText(/paused/i);
      expect(sessions(PEOPLE.ben.id)).toBe(0);
    });
    await page.getByLabel('Your email').fill(PEOPLE.ben.email);
    await page.getByRole('button', { name: 'Send the code' }).click();
    await step(page, F, 3, 'send-refused', 'ask for a code again', 'refused, saying paused; still no session', async () => {
      await expect(page.locator('body')).toContainText(/paused/i);
      await expect(page.getByRole('heading', { name: 'Type the code' })).toHaveCount(0);
      expect(sessions(PEOPLE.ben.id)).toBe(0);
    });
  } finally {
    sql(`update user_access set suspended_at = null where user_id = '${PEOPLE.ben.id}'`);
  }
});

test('FLOW-22 undo a change in Settings → You', async ({ page }) => {
  const F = 'FLOW-22';
  sql(`insert into user_settings (user_id, own_names, expected_payday) values ('${PEOPLE.ben.id}', '{BEN B}', 'last-working')
       on conflict (user_id) do update set expected_payday = 'last-working'`);
  await signIn(page, PEOPLE.ben.email);
  const a0 = audits(PEOPLE.ben.id);
  await page.goto('/s/settings/you');
  await page.getByRole('radio', { name: /A day/ }).click();
  const day = page.getByLabel('Day of the month');
  await day.fill('12');
  await day.blur();
  await step(page, F, 1, 'changed', 'set the payday to day 12', 'saved as 12, one audit row, a toast with Undo', async () => {
    await expect.poll(() => sql(`select expected_payday from user_settings where user_id = '${PEOPLE.ben.id}'`)).toBe('12');
    expect(audits(PEOPLE.ben.id)).toBe(a0 + 1);
    await expect(toast(page).getByRole('button', { name: 'Undo' })).toBeVisible();
  });
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await step(page, F, 2, 'undone', 'tap Undo', 'back to the last working day in the database; two audit rows; the screen agrees', async () => {
    await expect.poll(() => sql(`select expected_payday from user_settings where user_id = '${PEOPLE.ben.id}'`)).toBe('last-working');
    expect(audits(PEOPLE.ben.id)).toBe(a0 + 2);
    await expect(page.getByRole('radio', { name: /last working/i })).toBeChecked();
  });
});

test.describe('FLOW-23 signed in, offline, then online', () => {
  test.use({ serviceWorkers: 'allow' });
  test('FLOW-23', async ({ page, context }) => {
    const F = 'FLOW-23';
    await signIn(page, PEOPLE.ben.email);
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 20_000 }).catch(() => undefined);
    await page.reload();
    await step(page, F, 1, 'home', 'signed in at home', 'not on sign-in', async () => {
      await expect(page).not.toHaveURL(/sign-in/);
    });
    await context.setOffline(true);
    await page.reload().catch(() => undefined);
    await page.waitForTimeout(2000);
    await step(page, F, 2, 'offline', 'reload offline', 'still not sign-in; one offline banner', async () => {
      await expect(page).not.toHaveURL(/sign-in/);
      await expect(page.getByText(/offline/i)).toHaveCount(1);
    });
    await context.setOffline(false);
    await page.goto('/s/settings/account');
    await step(page, F, 3, 'online', 'back online, open Account', 'the email shows, no banner', async () => {
      await expect(page.locator('main')).toContainText(PEOPLE.ben.email);
      await expect(page.getByText(/offline/i)).toHaveCount(0);
    });
  });
});

test('FLOW-24 a browser offline on You', async ({ page, context }) => {
  const F = 'FLOW-24';
  sql(`insert into user_settings (user_id, own_names, expected_payday) values ('${PEOPLE.ben.id}', '{BEN B}', 'last-working')
       on conflict (user_id) do update set expected_payday = 'last-working'`);
  await signIn(page, PEOPLE.ben.email);
  await page.goto('/s/settings/you');
  await step(page, F, 1, 'online', 'open Settings → You online', 'the payday shows: last working day', async () => {
    await expect(page.getByRole('radio', { name: /last working/i })).toBeChecked();
  });
  await context.setOffline(true);
  await page.waitForTimeout(2000);
  await step(page, F, 2, 'offline', 'go offline, stay on You', 'a browser offline is read-only (flows.md offline): the payday still shows', async () => {
    note(F, `offline on You: ${(await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 300)}`);
    await expect(page.getByRole('radio', { name: /last working/i })).toBeChecked({ timeout: 2000 });
  });
  await context.setOffline(false);
});

test('FLOW-25 the sign-in form, as patterns.md §7 Forms says', async ({ page }) => {
  const F = 'FLOW-25';
  await page.goto('/s/sign-in');
  await page.waitForTimeout(800);
  await step(page, F, 1, 'focus', 'open sign-in', 'the email field, the first to fill, is focused; inputMode email', async () => {
    const active = await page.evaluate(() => document.activeElement?.id ?? document.activeElement?.tagName);
    note(F, `focused on open: ${active}`);
    await expect(page.getByLabel('Your email')).toHaveAttribute('inputmode', 'email');
    expect(active).toBe('email');
  });
});

test('FLOW-26 a long email on Account', async ({ page }) => {
  const F = 'FLOW-26';
  const id = '00000000-0000-4000-8000-0000000000d1';
  const email = 'nurul.aisyah.binti.abdul.rahman.long.address@example-university.edu.my';
  sql(`insert into auth_user (id, name, email, email_verified) values ('${id}', 'Long', '${email}', true) on conflict (id) do nothing`);
  sql(`insert into user_access (user_id, features) values ('${id}', '{}') on conflict (user_id) do nothing`);
  await signIn(page, email);
  await page.goto('/s/settings/account');
  await step(page, F, 1, 'account', 'open Account with a 70-character email', 'the whole email is readable: not clipped or overflowing the card', async () => {
    const cell = page.getByText(email, { exact: true });
    await expect(cell).toBeVisible();
    const m = await cell.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, right: el.getBoundingClientRect().right, vw: window.innerWidth }));
    note(F, `email cell: ${JSON.stringify(m)}`);
    expect(m.sw).toBeLessThanOrEqual(m.cw + 1);
    expect(m.right).toBeLessThanOrEqual(m.vw);
  });
});
