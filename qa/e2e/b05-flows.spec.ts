import { test } from '@playwright/test';
import { PEOPLE, fresh, sql } from './b05-setup';
import { before, expect, note, signIn, step, tabs, toast, watch } from './b05-lib';

// QA B05 run 1, phase 5: qa/B05/flows.md, walked in Minted light at 390×844 against sen_qa.
const sessions = (id: string) => Number(sql(`select count(*) from auth_session where user_id = '${id}'`));
const users = () => Number(sql('select count(*) from auth_user'));

test.beforeEach(() => fresh());

test('FLOW-1 the owner signs in by code', async ({ page }) => {
  const errors = watch(page);
  const F = 'FLOW-1';
  await page.goto('/');
  await step(page, F, 1, 'gate', 'open / with no session', 'sign-in shows, not home; no tab bar', async () => {
    await expect(page).toHaveURL(/\/s\/sign-in/);
    await expect(page.getByRole('heading', { name: 'Sign in to Sen' })).toBeVisible();
    await expect(tabs(page)).toHaveCount(0);
  });
  await page.getByLabel('Your email').fill(PEOPLE.admin.email);
  await before(page, F, 2, 'send');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await step(
    page,
    F,
    2,
    'code-step',
    'Send the code',
    'the code step names the email; the code field is focused',
    async () => {
      await expect(page.getByRole('heading', { name: 'Type the code' })).toBeVisible();
      await expect(page.locator('main')).toContainText(PEOPLE.admin.email);
      await expect(page.getByLabel('6-digit code')).toBeFocused();
      const attrs = await page
        .getByLabel('6-digit code')
        .evaluate((i) => [i.getAttribute('inputmode'), i.getAttribute('autocomplete')].join(','));
      expect(attrs).toBe('numeric,one-time-code');
    },
  );
  await page.getByLabel('6-digit code').fill('123456');
  await before(page, F, 3, 'sign-in');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await step(
    page,
    F,
    3,
    'home',
    'Sign in with the right code',
    'home with the tab bar; one session row for the owner',
    async () => {
      await expect(page).not.toHaveURL(/sign-in/);
      await expect(tabs(page)).toBeVisible();
      expect(sessions(PEOPLE.admin.id)).toBe(1);
    },
  );
  await page.goto('/s/settings/account');
  await step(page, F, 4, 'account', 'Settings → Account', 'the email shows', async () => {
    await expect(page.locator('main')).toContainText(PEOPLE.admin.email);
  });
  note(F, `console errors: ${JSON.stringify(errors)}`);
});

test('FLOW-2 a wrong code, then the right one', async ({ page }) => {
  const F = 'FLOW-2';
  await page.goto('/');
  await page.getByLabel('Your email').fill(PEOPLE.ben.email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('000000');
  await before(page, F, 1, 'wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await step(
    page,
    F,
    1,
    'wrong',
    'type 000000',
    'the wrong-code message; still on the code step; no session',
    async () => {
      await expect(page.getByText('That’s not the right code')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Type the code' })).toBeVisible();
      expect(sessions(PEOPLE.ben.id)).toBe(0);
    },
  );
  await page.getByLabel('6-digit code').fill('12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await step(page, F, 2, 'short', 'type five digits', 'says the code is 6 digits', async () => {
    await expect(page.getByText('The code is 6 digits.')).toBeVisible();
  });
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await step(page, F, 3, 'signed-in', 'type the right code', 'signed in; one session', async () => {
    await expect(page).not.toHaveURL(/sign-in/);
    expect(sessions(PEOPLE.ben.id)).toBe(1);
  });
});

test('FLOW-3 an email nobody invited', async ({ page }) => {
  const F = 'FLOW-3';
  const u0 = users();
  await page.goto('/');
  await page.getByLabel('Your email').fill('Stranger@Example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await step(
    page,
    F,
    1,
    'invitation-only',
    'send a code to stranger@example.com',
    '*Sen is invitation-only*; no new user',
    async () => {
      await expect(page.getByText(/Sen is invitation-only/)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Sign in to Sen' })).toBeVisible();
      expect(users()).toBe(u0);
    },
  );
  await page.getByLabel('Your email').fill('not an email');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await step(page, F, 2, 'malformed', 'send to "not an email"', 'a message under the field', async () => {
    await expect(page.locator('#email-msg')).not.toBeEmpty();
    note(F, `malformed email says: ${await page.locator('#email-msg').innerText()}`);
  });
  await page.getByLabel('Your email').fill('');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await step(page, F, 3, 'empty', 'send with no email', 'a message under the field', async () => {
    note(F, `empty email says: ${await page.locator('#email-msg').innerText()}`);
    await expect(page.locator('#email-msg [data-slot="field-error"], #email-msg [role="alert"]').first()).toBeVisible();
  });
});

test('FLOW-4 too many tries, then Send a new code at once', async ({ page }) => {
  const F = 'FLOW-4';
  await page.goto('/');
  await page.getByLabel('Your email').fill(PEOPLE.chong.email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  for (const c of ['111111', '222222', '333333']) {
    await page.getByLabel('6-digit code').fill(c);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForTimeout(400);
  }
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await step(
    page,
    F,
    1,
    'too-many',
    'three wrong codes, then the right one',
    'refused: too many tries; Send a new code',
    async () => {
      await expect(page.getByText(/too many tries/i)).toBeVisible();
      await expect(page).toHaveURL(/sign-in/);
      expect(sessions(PEOPLE.chong.id)).toBe(0);
    },
  );
  await page.getByRole('button', { name: 'Send a new code' }).click();
  await step(page, F, 2, 'resent', 'Send a new code', 'a toast says a new code is on its way', async () => {
    await expect(toast(page)).toContainText('A new code is on its way');
  });
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(800);
  // signed in, the code step (and its message) is gone (fixed after QA B05 run 1, 4)
  const said = (await page.locator('#code-msg').count()) ? (await page.locator('#code-msg').innerText()).trim() : '';
  note(F, `the NEW code, typed at once, says: "${said}"; url ${page.url()}; sessions ${sessions(PEOPLE.chong.id)}`);
  await step(page, F, 3, 'new-code', 'type the new code at once', 'signed in with the new code (AC-42)', async () => {
    await expect(page).not.toHaveURL(/sign-in/);
  });
});

test('FLOW-4b an expired code, then Send a new code', async ({ page }) => {
  const F = 'FLOW-4b';
  await page.goto('/');
  await page.getByLabel('Your email').fill(PEOPLE.chong.email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await expect(page.getByRole('heading', { name: 'Type the code' })).toBeVisible();
  sql(`update auth_verification set expires_at = now() - interval '1 second'`);
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await step(
    page,
    F,
    1,
    'expired',
    'the code expires (in the database), then type it',
    'That code has expired; Send a new code is the main button',
    async () => {
      await expect(page.getByText('That code has expired.')).toBeVisible();
      expect(sessions(PEOPLE.chong.id)).toBe(0);
    },
  );
  await page.getByRole('button', { name: 'Send a new code' }).click();
  await expect(toast(page)).toContainText('A new code is on its way');
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await step(page, F, 2, 'signed-in', 'Send a new code, type it', 'signed in', async () => {
    await expect(page).not.toHaveURL(/sign-in/);
    expect(sessions(PEOPLE.chong.id)).toBe(1);
  });
});

test('FLOW-5 deep links while signed out', async ({ page }) => {
  const F = 'FLOW-5';
  let n = 0;
  for (const path of ['/s/settings/account', '/insights', '/more', '/s/txn?id=x', '/s/settings/members', '/review']) {
    await page.goto(path);
    n++;
    await step(page, F, n, `deep-${n}`, `open ${path} signed out`, 'sign-in; no RM figure', async () => {
      await expect(page).toHaveURL(/\/s\/sign-in/);
      await expect(page.getByRole('heading', { name: 'Sign in to Sen' })).toBeVisible();
      expect(await page.locator('body').innerText()).not.toMatch(/RM\s?\d/);
    });
  }
});

test('FLOW-6 sign out ends this session only', async ({ browser }) => {
  const F = 'FLOW-6';
  const one = await (await browser.newContext()).newPage();
  const two = await (await browser.newContext()).newPage();
  await signIn(one, PEOPLE.ben.email);
  await signIn(two, PEOPLE.ben.email);
  expect(sessions(PEOPLE.ben.id)).toBe(2);
  await one.goto('/s/settings/account');
  await expect(one.locator('main')).toContainText(PEOPLE.ben.email);
  await before(one, F, 1, 'sign-out');
  await one.getByRole('button', { name: 'Sign out', exact: true }).click();
  await step(one, F, 1, 'signed-out', 'Sign out', 'sign-in; one session left (the other browser’s)', async () => {
    await expect(one).toHaveURL(/\/s\/sign-in/);
    expect(sessions(PEOPLE.ben.id)).toBe(1);
  });
  await one.reload();
  await step(one, F, 2, 'reload', 'reload', 'still sign-in', async () => {
    await expect(one).toHaveURL(/\/s\/sign-in/);
  });
  await two.goto('/s/settings/account');
  await step(
    two,
    F,
    3,
    'other-browser',
    'the other browser opens Account',
    'still signed in, with the email',
    async () => {
      await expect(two.locator('main')).toContainText(PEOPLE.ben.email);
    },
  );
});

test('FLOW-7 sign out everywhere from another browser', async ({ browser }) => {
  const F = 'FLOW-7';
  const one = await (await browser.newContext()).newPage();
  const two = await (await browser.newContext()).newPage();
  const ben = await (await browser.newContext()).newPage();
  await signIn(one, PEOPLE.admin.email);
  await signIn(two, PEOPLE.admin.email);
  await signIn(ben, PEOPLE.ben.email);
  const benBefore = sessions(PEOPLE.ben.id);
  await two.goto('/s/settings/you');
  await one.goto('/s/settings/account');
  await before(one, F, 1, 'everywhere');
  await one.getByRole('button', { name: 'Sign out everywhere' }).click();
  await step(one, F, 1, 'dialog', 'Sign out everywhere', 'a confirm dialog that says this one too', async () => {
    const d = one.getByRole('alertdialog');
    await expect(d).toBeVisible();
    await expect(d).toContainText('this one too');
  });
  await one.getByRole('alertdialog').getByRole('button', { name: 'Sign out everywhere' }).click();
  await step(one, F, 2, 'signed-out', 'confirm', 'sign-in; no sessions for the owner; Ben’s untouched', async () => {
    await expect(one).toHaveURL(/\/s\/sign-in/);
    expect(sessions(PEOPLE.admin.id)).toBe(0);
    expect(sessions(PEOPLE.ben.id)).toBe(benBefore);
  });
  // the other browser, already on a screen, acts
  await two
    .getByRole('radio', { name: /Not set/ })
    .click()
    .catch(() => undefined);
  await two.waitForTimeout(800);
  await step(
    two,
    F,
    3,
    'other-acts',
    'the other browser, on You, sets the payday to Not set',
    'it ends on sign-in',
    async () => {
      note(F, `other browser after acting: ${two.url()}`);
      await expect(two).toHaveURL(/\/s\/sign-in/, { timeout: 5000 });
    },
  );
  await two.goto('/');
  await step(two, F, 4, 'other-reload', 'the other browser opens /', 'sign-in', async () => {
    await expect(two).toHaveURL(/\/s\/sign-in/);
  });
});

test('FLOW-8 sign out everywhere, cancelled', async ({ page }) => {
  const F = 'FLOW-8';
  await signIn(page, PEOPLE.admin.email);
  await page.goto('/s/settings/account');
  await page.getByRole('button', { name: 'Sign out everywhere' }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: /Cancel|Keep|Stay signed in/ })
    .click();
  await step(
    page,
    F,
    1,
    'cancelled',
    'Sign out everywhere, then Cancel',
    'still on Account, still one session',
    async () => {
      await expect(page).toHaveURL(/settings\/account/);
      expect(sessions(PEOPLE.admin.id)).toBe(1);
    },
  );
});

test('FLOW-9 a member is refused the admin’s routes, and its screens follow the server', async ({ page }) => {
  const F = 'FLOW-9';
  await signIn(page, PEOPLE.ben.email);
  const api = await page.evaluate(async () => {
    const a = await fetch('/api/admin/members');
    const b = await fetch('/api/commands', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'member.revoke', id: '00000000-0000-4000-8000-00000000000a' }),
    });
    return [a.status, await a.text(), b.status, await b.text()];
  });
  note(F, `member: ${JSON.stringify(api)}`);
  await page.goto('/s/settings');
  await step(
    page,
    F,
    1,
    'settings',
    'a member opens Settings; the API refuses /admin/members and member.*',
    '403 both; no Admin badge, no Members row',
    async () => {
      expect(api[0]).toBe(403);
      expect(api[2]).toBe(403);
      await expect(page.locator('main')).not.toContainText('Admin');
      await expect(page.getByRole('button', { name: /^Members/ })).toHaveCount(0);
    },
  );
  await page.goto('/s/settings/members');
  await step(
    page,
    F,
    2,
    'members',
    'a member opens /s/settings/members by its address',
    'Admin only; no member listed',
    async () => {
      await expect(page.locator('main')).toContainText('Admin only');
      note(
        F,
        `members screen as Ben: ${(await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 300)}`,
      );
    },
  );
});

test('FLOW-10 offline on the sign-in screen', async ({ page, context }) => {
  const F = 'FLOW-10';
  await page.goto('/');
  await page.getByLabel('Your email').fill(PEOPLE.ben.email);
  await context.setOffline(true);
  await page.waitForTimeout(300);
  await step(page, F, 1, 'offline', 'go offline', 'a banner says signing in needs a connection', async () => {
    await expect(page.getByText('Signing in needs a connection')).toBeVisible();
    note(F, `Send enabled offline: ${await page.getByRole('button', { name: 'Send the code' }).isEnabled()}`);
  });
  await context.setOffline(false);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await step(page, F, 2, 'online', 'back online, Send the code', 'the code step', async () => {
    await expect(page.getByRole('heading', { name: 'Type the code' })).toBeVisible();
  });
});

test('FLOW-10b a signed-in browser opened offline', async ({ page, context }) => {
  const F = 'FLOW-10b';
  await signIn(page, PEOPLE.ben.email);
  await context.setOffline(true);
  await page.reload().catch(() => undefined);
  await page.waitForTimeout(1500);
  note(F, `after an offline reload: ${page.url()}`);
  await context.setOffline(false);
  await page.goto('/s/settings/account');
  await step(page, F, 1, 'back', 'reload offline, then online again', 'Account opens, still signed in', async () => {
    await expect(page.locator('main')).toContainText(PEOPLE.ben.email);
  });
});

test.describe('FLOW-11 another timezone', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });
  test('FLOW-11 sign-in and Account in Los Angeles time', async ({ page }) => {
    const F = 'FLOW-11';
    await signIn(page, PEOPLE.ben.email);
    await page.goto('/s/settings/account');
    await step(page, F, 1, 'account', 'sign in and open Account at UTC-7', 'the email shows', async () => {
      await expect(page.locator('main')).toContainText(PEOPLE.ben.email);
    });
  });
});

test('FLOW-12 You is saved on the server, with its audit entry', async ({ page }) => {
  const F = 'FLOW-12';
  sql(`delete from user_settings where user_id = '${PEOPLE.ben.id}'`);
  const audit0 = Number(sql(`select count(*) from audit_log where user_id = '${PEOPLE.ben.id}'`));
  await signIn(page, PEOPLE.ben.email);
  await page.goto('/s/settings/you');
  await page.getByRole('radio', { name: /A day/ }).click();
  const day = page.getByLabel('Day of the month');
  await day.fill('25');
  await day.blur();
  await page.waitForTimeout(800);
  await step(
    page,
    F,
    1,
    'payday',
    'set the payday to day 25',
    'user_settings says 25; one audit row by the user',
    async () => {
      expect(sql(`select expected_payday from user_settings where user_id = '${PEOPLE.ben.id}'`)).toBe('25');
      expect(Number(sql(`select count(*) from audit_log where user_id = '${PEOPLE.ben.id}'`))).toBe(audit0 + 1);
      expect(
        sql(`select actor from audit_log where user_id = '${PEOPLE.ben.id}' order by created_at desc limit 1`),
      ).toBe('user');
    },
  );
  await page.reload();
  await step(page, F, 2, 'reload', 'reload You', 'day 25 is still chosen', async () => {
    await expect(page.getByLabel('Day of the month')).toHaveValue('25');
  });
  await day.fill('40');
  await day.blur();
  await page.waitForTimeout(800);
  await step(page, F, 3, 'out-of-range', 'type 40', 'a message under the field; the row still says 25', async () => {
    note(F, `day 40 says: ${(await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 400)}`);
    expect(sql(`select expected_payday from user_settings where user_id = '${PEOPLE.ben.id}'`)).toBe('25');
  });
});

test('FLOW-13 production build: sign in, Account, and nothing made up', async ({ page }) => {
  const F = 'FLOW-13';
  await page.goto('http://localhost:4178/');
  await step(page, F, 1, 'gate', 'open the production build signed out', 'sign-in', async () => {
    await expect(page).toHaveURL(/\/s\/sign-in/);
  });
  await page.getByLabel('Your email').fill(PEOPLE.admin.email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await step(page, F, 2, 'code', 'Send the code', 'no preview hint naming the code', async () => {
    await expect(page.getByRole('heading', { name: 'Type the code' })).toBeVisible();
    await expect(page.locator('main')).not.toContainText('123456');
  });
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(1500);
  await step(page, F, 3, 'home', 'Sign in', 'leaves sign-in; no made-up name or amount', async () => {
    await expect(page).not.toHaveURL(/sign-in/);
    const body = await page.locator('body').innerText();
    note(F, `production home after sign-in: ${body.replace(/\n+/g, ' | ').slice(0, 300)}`);
    expect(body).not.toMatch(/Wei Ming|TAN WEI MING/);
  });
  await page.goto('http://localhost:4178/s/settings/account');
  await step(page, F, 4, 'account', 'open Account', 'the email', async () => {
    await expect(page.locator('main')).toContainText(PEOPLE.admin.email);
  });
});
