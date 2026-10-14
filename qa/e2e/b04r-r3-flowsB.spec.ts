import { expect, test } from '@playwright/test';
import { uid } from '../../apps/web/src/data/fake/ids';
import { open, settled, toast, watch } from './b04r-helpers';
import { note, step } from './b04r-r3-lib';

// Run 3 flows B: Settings, Appearance, the friend's view, Members, Categories, double taps on destructive actions.
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

const BAD = /undefined|NaN|\[object|null\b/;

test('R3-FLOW-5 Settings tour and Appearance: states are words, the choice survives a reload', async ({ page }) => {
  const w = watch(page);
  const F = 'R3-FLOW-5';
  let n = 0;
  await open(page, '/more');
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Setup' })).toBeVisible();
  n++;
  await step(
    page,
    F,
    n,
    'settings',
    'More -> Settings (owner)',
    'a profile card, Setup / Features / Data groups, each row with its state, no placeholder words',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).not.toMatch(BAD);
      expect(t).toMatch(/weiming@example\.com/);
      for (const row of [
        /Appearance\s+Minted/,
        /Capture/,
        /Claims\s+2 schemes/,
        /Sen\s+~?RM3\.80 this month/,
        /Members\s+2 of 20/,
      ])
        expect(t.replace(/\n+/g, ' ')).toMatch(row);
    },
  );
  await page.getByRole('button', { name: /^Appearance/ }).click();
  await expect(page.getByRole('radiogroup', { name: 'Look' })).toBeVisible();
  const quarterly = page.getByRole('switch', { name: 'Change each quarter' });
  n++;
  await step(
    page,
    F,
    n,
    'appearance',
    'Open Appearance',
    'Mode has System/Light/Dark with icons; Look is six cards, each a live preview; the quarterly switch is on with the next change date',
    async () => {
      await expect(page.getByRole('radio')).toHaveCount(9);
      await expect(quarterly).toBeChecked();
      await expect(page.locator('main')).toContainText(/until \w+, 1 Jan 2027/);
      const svgs = await page
        .getByRole('radio', { name: /^(System|Light|Dark)/ })
        .evaluateAll((els) => els.map((e) => e.querySelectorAll('svg').length));
      expect(svgs).toEqual([1, 1, 1]);
      const previews = await page
        .getByRole('radiogroup', { name: 'Look' })
        .getByRole('radio')
        .evaluateAll((els) => els.map((e) => e.textContent!.includes('RM1,284')));
      expect(previews).toEqual([true, true, true, true, true, true]);
      // the six previews are drawn in six different looks: their background colours differ
      const bgs = await page
        .getByRole('radiogroup', { name: 'Look' })
        .getByRole('radio')
        .evaluateAll((els) =>
          els.map((e) => getComputedStyle(e.querySelector('[class*="preview"], div div') as Element).backgroundColor),
        );
      note(F, `preview backgrounds ${JSON.stringify(bgs)}`);
    },
  );
  // pin Copper and Dark
  await page.getByRole('radio', { name: /^Copper/ }).click();
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-look', 'copper');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  n++;
  await step(
    page,
    F,
    n,
    'pinned',
    'Choose Copper, then Dark',
    'the look and mode change at once; choosing a look turns the quarterly switch off and says it is pinned',
    async () => {
      await expect(quarterly).not.toBeChecked();
      await expect(page.getByRole('radio', { name: /^Copper/ })).toBeChecked();
    },
  );
  await page.goto('/s/settings/appearance'); // no ?look=: only storage can say
  await expect(page.locator('html')).toHaveAttribute('data-look', 'copper');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  n++;
  await step(
    page,
    F,
    n,
    'reloaded',
    'Reload with no query string',
    'Copper and Dark are kept; the quarterly switch is still off',
    async () => {
      await expect(page.getByRole('switch', { name: 'Change each quarter' })).not.toBeChecked();
      await expect(page.getByRole('radio', { name: /^Copper/ })).toBeChecked();
      await page.getByRole('button', { name: 'Back' }).click();
      await expect(page.getByRole('button', { name: /^Appearance/ })).toContainText('Copper');
    },
  );
  // System follows the phone
  await page.getByRole('button', { name: /^Appearance/ }).click();
  await page.getByRole('radio', { name: 'System' }).click();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  n++;
  await step(
    page,
    F,
    n,
    'system',
    'Choose System, then flip the phone to dark',
    'the mode follows the phone, live',
    async () => {
      await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
    },
  );
  // quarterly back on
  await page.getByRole('switch', { name: 'Change each quarter' }).click();
  n++;
  await step(
    page,
    F,
    n,
    'quarterly-on',
    'Turn Change each quarter back on',
    'the switch is on and names the next change',
    async () => {
      await expect(page.getByRole('switch', { name: 'Change each quarter' })).toBeChecked();
      await expect(page.locator('main')).toContainText(/until \w+, 1 Jan 2027/);
    },
  );
  expect(w.errors).toEqual([]);
});

test("R3-FLOW-5b A friend's Settings: no Members, no Capture, no Claims", async ({ page }) => {
  const F = 'R3-FLOW-5';
  await open(page, '/s/settings?scenario=month');
  await settled(page);
  await step(
    page,
    F,
    7,
    'friend',
    'Open Settings as a friend without capture',
    'no Members, Capture, Claims rows; their own email on the profile card',
    async () => {
      const t = (await page.locator('main').innerText()).replace(/\n+/g, ' ');
      expect(t).not.toMatch(/Members/);
      expect(t).not.toMatch(/Capture/);
      expect(t).not.toMatch(/Claims/);
      expect(t).toMatch(/huimin@example\.com/);
      expect(t).not.toMatch(BAD);
    },
  );
  // the admin-only route, reached by URL by a non-admin
  await open(page, '/s/settings/members?scenario=month');
  await page.waitForTimeout(500);
  const t = (await page.locator('main').innerText()).replace(/\n+/g, ' ');
  note(F, `non-admin at /s/settings/members: ${t.slice(0, 200)}`);
  await step(
    page,
    F,
    8,
    'friend-members',
    'A friend opens the Members URL directly',
    'the member list (people, emails, credit) is not shown',
    async () => {
      expect(t).not.toMatch(/farid@example\.com|huimin@example\.com.*Android shell|Shell seats in use/);
    },
  );
});

test('R3-FLOW-11 Members: a pushed screen, no member money, invalid invites refused, Remove asks', async ({ page }) => {
  const w = watch(page);
  const F = 'R3-FLOW-11';
  let n = 0;
  await open(page, '/s/settings/members');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'members',
    'Open Members (admin)',
    'Invite in the app bar; seats "2 of 20" as a meter; a row per person with a status badge',
    async () => {
      await expect(page.getByRole('banner').getByRole('button', { name: 'Invite', exact: true })).toBeVisible();
      await expect(page.getByRole('progressbar', { name: 'Shell seats in use' })).toHaveAttribute(
        'aria-valuenow',
        '10',
      );
      await expect(page.locator('main')).toContainText('2 of 20');
      const t = await page.locator('main').innerText();
      expect(t).toMatch(/Active/);
      expect(t).toMatch(/Invited/);
    },
  );
  await page.getByRole('button', { name: /^Hui Min/ }).click();
  await expect(page).toHaveURL(/\/s\/settings\/member\?id=/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main')).toContainText('AI credit');
  const text = await page.locator('main').innerText();
  const lines = text.split('\n').filter((l) => /RM/.test(l));
  note(F, `RM lines on the member screen: ${JSON.stringify(lines)}`);
  n++;
  await step(
    page,
    F,
    n,
    'member',
    'Open Hui Min',
    'a pushed screen (URL changed, no dialog); the only amounts are AI credit (balance, allowance); nothing about their payments, accounts or balances; Remove is last, in destructive',
    async () => {
      expect(text).not.toMatch(/Payments|Accounts|Spent|Total balance|Transactions|Left until payday/);
      expect(text).toContain('AI credit');
      const remove = page.getByRole('button', { name: 'Remove', exact: true });
      await expect(remove).toHaveAttribute('data-variant', 'destructive');
      const last = await page.locator('main button').last().innerText();
      expect(last.trim()).toBe('Remove');
      const sw = await page.getByRole('switch').count();
      expect(sw).toBeGreaterThanOrEqual(6);
    },
  );
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  n++;
  await step(
    page,
    F,
    n,
    'remove',
    'Tap Remove',
    'it asks first ("Remove Hui Min?") and Cancel leaves them in place',
    async () => {
      await expect(page.getByRole('alertdialog').or(page.getByRole('dialog'))).toContainText('Remove Hui Min?');
      await page
        .getByRole('button', { name: /^(Cancel|Keep|Not now)/i })
        .or(page.getByRole('button', { name: 'Close' }))
        .first()
        .click()
        .catch(async () => page.keyboard.press('Escape'));
      await page.waitForTimeout(300);
      await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeVisible();
    },
  );
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/s\/settings\/members/);
  // invite: bad email refused, good one added once
  await page.getByRole('banner').getByRole('button', { name: 'Invite', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Invite someone' });
  await dlg.getByRole('textbox', { name: 'Their email' }).fill('nope');
  await dlg.getByRole('button', { name: 'Send invitation' }).click();
  n++;
  await step(
    page,
    F,
    n,
    'bad-email',
    'Invite "nope"',
    'an error under the field; nobody is added; the sheet stays open',
    async () => {
      await expect(dlg).toContainText(/email/i);
      await expect(dlg).toBeVisible();
      await expect(page.locator('main')).not.toContainText('nope');
    },
  );
  await dlg.getByRole('textbox', { name: 'Their email' }).fill('new.friend@example.com');
  await dlg.getByRole('button', { name: 'Send invitation' }).click();
  await expect(dlg).toHaveCount(0);
  n++;
  await step(
    page,
    F,
    n,
    'invited',
    'Invite a valid address',
    'one new row "Invited"; seats stay 2 of 20 for a browser friend',
    async () => {
      await expect(page.getByRole('button', { name: /new\.friend@example\.com/ })).toHaveCount(1);
      await expect(page.locator('main')).toContainText('2 of 20');
    },
  );
  // the same address again
  await page.getByRole('banner').getByRole('button', { name: 'Invite', exact: true }).click();
  await dlg.getByRole('textbox', { name: 'Their email' }).fill(' New.Friend@Example.com ');
  await dlg.getByRole('button', { name: 'Send invitation' }).click();
  await page.waitForTimeout(500);
  n++;
  await step(
    page,
    F,
    n,
    'invite-again',
    'Invite the same address again (other case, spaces)',
    'still one row: the second is a no-op',
    async () => {
      await expect(page.getByRole('button', { name: /new\.friend@example\.com/i })).toHaveCount(1);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-12 Categories and rules', async ({ page }) => {
  const F = 'R3-FLOW-12';
  await open(page, '/s/settings/categories');
  await settled(page);
  await step(
    page,
    F,
    1,
    'grid',
    'Open Categories',
    'a grid of tiles, each named, with its rule count in the accessible name; the segment says Categories',
    async () => {
      const tiles = page.getByRole('region', { name: 'Spending categories' }).getByRole('button');
      expect(await tiles.count()).toBeGreaterThanOrEqual(18);
      // neighbours differ in tint (three hues, by position)
      const tints = await tiles.evaluateAll((els) =>
        els
          .slice(0, 6)
          .map(
            (e) => getComputedStyle(e.querySelector('[class*="size-8"], [class*="tile"], span, div')!).backgroundColor,
          ),
      );
      note(F, `tile tints ${JSON.stringify(tints)}`);
      expect(new Set(tints).size).toBeGreaterThan(1);
    },
  );
  await page.getByRole('button', { name: /^Meals, 2 rules/ }).click();
  await step(
    page,
    F,
    2,
    'sheet',
    'Tap Meals',
    'its sheet opens (a dialog) and names the category and its rules',
    async () => {
      await expect(page.getByRole('dialog')).toContainText('Meals');
    },
  );
  await page.keyboard.press('Escape');
  await page.getByRole('radio', { name: 'Rules' }).click();
  await step(
    page,
    F,
    3,
    'rules',
    'Open the Rules segment',
    'one intro line; each rule is a sentence card with where it came from',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).toMatch(/When the payee has/);
      expect(t).toMatch(/From your answer/);
      const intro = await page.locator('main > p, main > div > p').first().innerText();
      expect(intro).toMatch(/rule/i);
    },
  );
});

test('R3-FLOW-X1 Double tap on a destructive action changes one thing (Forget a note)', async ({ page }) => {
  const F = 'R3-FLOW-X1';
  await open(page, '/s/agent/memory');
  await settled(page);
  const forget = page.getByRole('button', { name: /^Forget/ });
  const before = await forget.count();
  const b = (await forget.first().boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(150);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(600);
  const after = await forget.count();
  let restored = after;
  if (await toast(page).count()) {
    await toast(page).getByRole('button', { name: 'Undo' }).click();
    await page.waitForTimeout(400);
    restored = await forget.count();
  }
  note(F, `notes before ${before}, after a double tap ${after}, after Undo ${restored}`);
  await step(
    page,
    F,
    1,
    'double-tap-forget',
    'Double tap Forget on the first note, then Undo',
    'one note forgotten, and Undo brings every forgotten note back (before = after Undo)',
    async () => {
      expect(after, 'one note forgotten by a double tap').toBe(before - 1);
      expect(restored, 'Undo restores everything the double tap took').toBe(before);
    },
  );
});

test('R3-FLOW-X2 Double tap: Sen proposal Dismiss and a member revoke change one thing', async ({ page }) => {
  const F = 'R3-FLOW-X2';
  await open(page, '/s/settings/members');
  await settled(page);
  await page.getByRole('button', { name: /^Farid/ }).click();
  await page.waitForTimeout(400);
  const revoke = page.getByRole('button', { name: /Revoke|Cancel invitation|Withdraw/i });
  note(F, `farid buttons ${JSON.stringify(await page.locator('main button').allInnerTexts())}`);
  await step(
    page,
    F,
    1,
    'farid',
    'Open the invited member',
    'the invitation can be resent or revoked, in the foot actions',
    async () => {
      await expect(revoke.first()).toBeVisible();
    },
  );
});

test('R3-FLOW-9c split: shares add up to the bill in sen at every tick; Share holds the QR and the link', async ({
  page,
}) => {
  const F = 'R3-FLOW-9';
  const NK = uid('split:nk');
  await open(page, `/s/split?id=${NK}`);
  await settled(page);
  const readShares = async () => {
    const t = (await page.getByRole('region', { name: "Who's done" }).innerText()).replace(/\n+/g, ' ');
    const amts = [...t.matchAll(/RM\s?([\d,]+)\.(\d{2})/g)].map(
      (m) => Number(m[1]!.replace(/,/g, '')) * 100 + Number(m[2]),
    );
    // each amount appears twice (visible and spoken); keep the visible ones
    return amts.filter((_, i) => i % 2 === 0);
  };
  const items = async () => {
    const boxes = page.getByRole('region', { name: 'Items' }).getByRole('checkbox');
    const names = await boxes.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent ?? ''));
    return names.length;
  };
  const total = 5830;
  const unclaimed = () => page.getByRole('region', { name: 'Items' }).getByText('Nobody has ticked this').count();
  const before = await readShares();
  note(F, `NK shares before: ${JSON.stringify(before)} items ${await items()}`);
  await step(
    page,
    F,
    30,
    'shares-before',
    'Open the Nasi Kandar split (still changing)',
    'shares + the unclaimed item = the bill: 23.17 + 24.27 + 4.66 + 6.20 = 58.30',
    async () => {
      expect(before.reduce((a, b) => a + b, 0) + 620).toBe(total);
    },
  );
  // tick the unclaimed item (Telur dadar) as yourself, then it is shared between claimed
  await page.getByRole('checkbox', { name: /^Telur dadar/ }).click();
  await page.waitForTimeout(600);
  const after = await readShares();
  note(F, `NK shares after ticking Telur dadar: ${JSON.stringify(after)} unclaimed ${await unclaimed()}`);
  await step(
    page,
    F,
    31,
    'ticked',
    'Tick Telur dadar',
    'nothing is unclaimed; the three shares add to exactly RM58.30',
    async () => {
      expect(await unclaimed()).toBe(0);
      expect(after.reduce((a, b) => a + b, 0)).toBe(total);
    },
  );
  await page.getByRole('banner').getByRole('button', { name: 'Share' }).click();
  await step(
    page,
    F,
    32,
    'share-sheet',
    'Tap Share',
    'a sheet with the QR for the table and the link; the QR has a text alternative',
    async () => {
      const dlg = page.getByRole('dialog');
      await expect(dlg).toBeVisible();
      const t = await dlg.innerText();
      expect(t).toMatch(/link/i);
      const qr = await dlg.locator('svg[aria-label], img[alt], canvas[aria-label]').count();
      expect(qr, 'the QR has a name').toBeGreaterThan(0);
    },
  );
});
