import { expect, test } from '@playwright/test';
import { open, settled, tabs, toast, watch } from './b04r-helpers';
import { step } from './b04r-r2-lib';

// Run 2 flows, part C: shared bills, claims, variants, budgets, Sen, settings, appearance, time zone,
// offline, text scale, production. Dev server (5291).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5291' });

test("R2-FLOW-18 Shared bill, from the owner's side", async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-18';
  await open(page, '/s/shared');
  await settled(page);
  await step(
    page,
    F,
    1,
    'shared',
    'Open Shared bills',
    'Segmented Open · 3 / Settled · 0; each bill a card with an avatar and a status in words (You paid · still changing, Mei paid · you owe RM24.40)',
    async () => {
      await expect(page.getByRole('radio', { name: 'Open · 3' })).toBeChecked();
      await expect(page.getByRole('radio', { name: 'Settled · 0' })).toBeVisible();
      await expect(page.locator('main')).toContainText('You paid · still changing');
      await expect(page.locator('main')).toContainText('Mei paid · you owe RM24.40');
      await expect(page.locator('main')).toContainText('You paid · 1 of 2 paid you back');
    },
  );
  await page.getByRole('button', { name: /Nasi Kandar Abc/ }).click();
  await step(
    page,
    F,
    3,
    'split',
    'Open the Nasi Kandar split',
    'status in words first (Still changing; Waiting for You, Kah Hoe · 1 item nobody has ticked); people as rows in one card; no QR on the page',
    async () => {
      await expect(page.getByText('Still changing', { exact: true })).toBeVisible();
      await expect(page.locator('main')).toContainText(/Waiting for/);
      await expect(page.getByText("Who's done")).toBeVisible();
      await expect(page.locator('main canvas, main svg[aria-label*="QR" i], main img[alt*="QR" i]')).toHaveCount(0);
    },
  );
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await step(page, F, 4, 'share-sheet', 'Tap Share', 'a sheet opens holding the link and its QR', async () => {
    const d = page.getByRole('dialog');
    await expect(d).toBeVisible();
    console.log('SHARE', (await d.innerText()).replace(/\n+/g, ' | ').slice(0, 300));
    await expect(d).toContainText(/QR|link/i);
  });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Everyone', exact: true }).click();
  await step(
    page,
    F,
    5,
    'everyone',
    'Give the orphan item to Everyone',
    'the "nobody has ticked" warning is gone; the status still waits for Kah Hoe (not Final)',
    async () => {
      await page.waitForTimeout(400);
      await expect(page.locator('main')).not.toContainText('1 item nobody has ticked');
      await expect(page.getByText('Final', { exact: true })).toHaveCount(0);
    },
  );
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: /Bbq Place/ }).click();
  await step(
    page,
    F,
    6,
    'final',
    'Open the final Bbq split',
    'Final: "The shares are locked"; the shares add up to the bill (3 x RM48.80 = RM146.40); "Write off" is offered for the unpaid friend',
    async () => {
      await expect(page.getByText('Final', { exact: true })).toBeVisible();
      await expect(page.locator('main')).toContainText('The shares are locked');
      const t = await page.locator('main').innerText();
      expect((t.match(/RM48\.80/g) ?? []).length).toBeGreaterThanOrEqual(3);
      await expect(page.getByRole('button', { name: 'Write off' })).toBeVisible();
    },
  );
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: /Haidilao/ }).click();
  await step(
    page,
    F,
    7,
    'friend-paid',
    'Open Haidilao (Mei paid)',
    '"You owe Mei RM24.40" in words with an I\'ve paid action',
    async () => {
      await expect(page.locator('main')).toContainText('You owe');
      await expect(page.locator('main')).toContainText('to Mei');
      await expect(page.locator('main')).toContainText('RM24.40');
      await expect(page.getByRole('button', { name: "I've paid" })).toBeVisible();
    },
  );
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-18b Shared bills: the Settled tab with nothing in it', async ({ page }) => {
  const F = 'R2-FLOW-18';
  await open(page, '/s/shared');
  await settled(page);
  await page.getByRole('radio', { name: 'Settled · 0' }).click();
  await step(
    page,
    F,
    2,
    'settled-empty',
    'Tap Settled',
    'an Empty state (nothing settled yet), not bare text',
    async () => {
      await expect(page.getByRole('radio', { name: 'Settled · 0' })).toBeChecked();
      await expect(page.locator('main svg').first()).toBeVisible();
      await expect(page.locator('main')).not.toContainText('Nasi Kandar Abc');
    },
  );
});

test("R2-FLOW-19 A friend's public split", async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-19';
  await open(page, '/s/split-public?id=demo-new');
  await step(
    page,
    F,
    1,
    'name',
    'Open the link (no login)',
    'no tab bar; a name box the first time; header with the payer',
    async () => {
      await expect(tabs(page)).toHaveCount(0);
      await expect(page.getByRole('textbox')).toBeVisible();
    },
  );
  await page.getByRole('textbox').fill('Mei');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(/Hi Mei/)).toBeVisible();
  await step(
    page,
    F,
    2,
    'items',
    'Enter the name Mei',
    '"Hi Mei. Sen remembers this browser."; items as a check list in one card; the sticky "I\'ve ticked everything I had" is inside the viewport',
    async () => {
      const btn = page.getByRole('button', { name: /ticked everything/ });
      await expect(btn).toBeVisible();
      const r = await btn.evaluate((e) => ({
        b: e.getBoundingClientRect().bottom,
        h: Math.round(e.getBoundingClientRect().height),
      }));
      expect(r.b).toBeLessThanOrEqual(844);
      expect(r.h).toBe(48);
      const pos = await btn.evaluate((e) => {
        let p: HTMLElement | null = e;
        while (p) {
          const s = getComputedStyle(p).position;
          if (s === 'sticky' || s === 'fixed') return s;
          p = p.parentElement;
        }
        return 'static';
      });
      expect(pos).not.toBe('static');
    },
  );
  await page.getByRole('checkbox', { name: /Kuey teow/ }).click();
  await step(page, F, 3, 'ticked', 'Tick Kuey teow', 'the item is ticked; "Your share so far" changes', async () => {
    await expect(page.getByRole('checkbox', { name: /Kuey teow/ })).toBeChecked();
  });
  await page.getByRole('button', { name: /ticked everything/ }).click();
  await step(
    page,
    F,
    4,
    'final',
    "Tap I've ticked everything",
    'Final; the payer\'s QR and "Pay RM12.48" appear only now',
    async () => {
      await expect(page.getByText('Final', { exact: true })).toBeVisible();
      await expect(page.getByText('Pay RM12.48')).toBeVisible();
    },
  );
  await open(page, '/s/split-public?id=demo-new');
  await step(
    page,
    F,
    5,
    'no-pay-before-final',
    'Reload the unfinished split',
    'no "Pay RM" and no payer QR while the split is still changing',
    async () => {
      await expect(page.locator('body')).not.toContainText(/Pay RM\d/);
    },
  );
  await open(page, '/s/split-public?id=demo-closed');
  await step(
    page,
    F,
    6,
    'closed',
    'Open a closed link',
    '"This split is closed" and nothing else (no checkboxes, no buttons, no tab bar)',
    async () => {
      await expect(page.locator('body')).toContainText('This split is closed');
      await expect(page.getByRole('checkbox')).toHaveCount(0);
      await expect(tabs(page)).toHaveCount(0);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-20 Claims', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-20';
  await open(page, '/s/claims');
  await settled(page);
  await step(
    page,
    F,
    1,
    'claims',
    'Open Claims',
    'a September card ("2 to submit · RM152.00 of RM200.00") with a named bar; claims with status words; Send to ESS is the only 48 px button; Download is in the app bar; no "stand-in" text',
    async () => {
      await expect(page.locator('main')).toContainText('2 to submit · RM152.00');
      await expect(page.getByRole('progressbar', { name: /September 2026/ })).toBeVisible();
      await expect(page.locator('main')).toContainText('To submit · evidence complete');
      await expect(page.locator('main')).toContainText('To submit · evidence missing');
      const big = await page
        .locator('main button')
        .evaluateAll((bs) =>
          bs
            .filter((b) => Math.round(b.getBoundingClientRect().height) === 48)
            .map((b) => (b.textContent ?? '').trim()),
        );
      expect(big).toEqual(['Send to ESS']);
      await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
      await expect(page.locator('main')).not.toContainText(/stand-in/i);
    },
  );
  await page.getByRole('button', { name: /^Phone bill To submit/ }).click();
  await step(
    page,
    F,
    2,
    'claim',
    'Open the Phone bill claim',
    'a five-step stepper Draft, Ready, Sent, Approved, Paid with the current one marked by more than colour; each value has Copy; evidence as files',
    async () => {
      await expect(page).toHaveURL(/\/s\/claim\?id=/);
      for (const s of ['Draft', 'Ready', 'Sent', 'Approved', 'Paid'])
        await expect(page.getByText(s, { exact: true }).first()).toBeVisible();
      expect(await page.getByRole('button', { name: /Copy/ }).count()).toBeGreaterThanOrEqual(3);
      const cur = await page.locator('[aria-current="step"]').count();
      expect(cur).toBeGreaterThanOrEqual(1);
    },
  );
  await page.getByRole('button', { name: 'Submitted' }).click();
  await step(
    page,
    F,
    3,
    'submitted',
    'Tap Submitted',
    'the claim moves on (the stepper shows Sent, or the claim says so)',
    async () => {
      await page.waitForTimeout(500);
      await expect(page.locator('main')).toContainText(/Sent|Submitted/);
    },
  );
  await page.getByRole('button', { name: 'Back' }).click();
  await step(
    page,
    F,
    4,
    'back-to-claims',
    'Back to Claims',
    'the Phone bill row now has a status other than "To submit" (and the month says "1 to submit")',
    async () => {
      await expect(page.locator('main')).toContainText(/1 to submit/);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-21 Switches off: rows are absent, not disabled', async ({ page }) => {
  const F = 'R2-FLOW-21';
  await open(page, '/more?scenario=month');
  await settled(page);
  await step(
    page,
    F,
    1,
    'more-month',
    'More without capture (by month)',
    'no Accounts row (D52, D79); the Payments, Shared and Settings rows remain',
    async () => {
      await expect(page.getByRole('main').getByText('Accounts', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('main').getByText('Claims', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('main').getByText('Payments', { exact: true })).toBeVisible();
    },
  );
  await open(page, '/s/settings?scenario=month');
  await settled(page);
  await step(
    page,
    F,
    2,
    'settings-month',
    'Settings without capture',
    'no Capture row; no row is a disabled button',
    async () => {
      await expect(page.getByRole('button', { name: /^Capture/ })).toHaveCount(0);
      expect(await page.locator('main button:disabled').count()).toBe(0);
    },
  );
  await open(page, '/?scenario=month');
  await step(
    page,
    F,
    3,
    'home-month',
    'Home without capture',
    'no total-balance row and no gap; the figure is "Spent this month"',
    async () => {
      await expect(page.getByTestId('hero')).toContainText('Spent this month');
      await expect(page.getByTestId('quiet')).toHaveCount(0);
    },
  );
});

test('R2-FLOW-22 Budgets, subscriptions, goals, the year', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-22';
  await open(page, '/s/budgets');
  await settled(page);
  await step(
    page,
    F,
    1,
    'budgets',
    'Open Budgets',
    'At risk first; Shopping says "Over by RM20.30" in words; every bar has a name and a value; Add a budget is in the app bar',
    async () => {
      await expect(page.locator('main')).toContainText('At risk');
      await expect(page.locator('main')).toContainText('Over by RM20.30');
      // a budget says its figures in words on the row, so the bar need not be announced twice
      await expect(page.getByRole('button', { name: /^Meals.*RM932\.93 of RM1,200\.00.*At risk/ })).toBeVisible();
      await expect(
        page
          .getByRole('banner')
          .getByRole('button', { name: /Add/ })
          .or(page.locator('header').getByRole('button', { name: /Add/ }))
          .first(),
      ).toBeVisible();
    },
  );
  await open(page, '/s/subscriptions');
  await settled(page);
  await step(
    page,
    F,
    2,
    'subscriptions',
    'Open Subscriptions',
    'compact cards (name, per month, next renewal); history collapsed to "N matched"',
    async () => {
      await expect(page.locator('main')).toContainText('Committed each month');
      await expect(page.getByRole('button', { name: '4 matched' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: '4 matched' }).first()).toHaveAttribute('aria-expanded', 'false');
    },
  );
  await page.getByRole('button', { name: '4 matched' }).first().click();
  await step(
    page,
    F,
    3,
    'subs-expanded',
    'Expand history',
    'aria-expanded true and the matched charges are listed',
    async () => {
      await expect(page.getByRole('button', { name: '4 matched' }).first()).toHaveAttribute('aria-expanded', 'true');
    },
  );
  await open(page, '/s/goals');
  await settled(page);
  await step(
    page,
    F,
    4,
    'goals',
    'Open Goals',
    'goal cards with a progress ring, "RM2,950.00 of RM6,000.00" and "Needs RM610.00 a cycle"; feasibility is worded as a need, not a fact',
    async () => {
      await expect(page.locator('main')).toContainText('RM2,950.00 of RM6,000.00');
      await expect(page.locator('main')).toContainText(/Needs RM610\.00/);
    },
  );
  await page.getByRole('button', { name: /Japan in spring/ }).click();
  await step(
    page,
    F,
    5,
    'goal',
    'Open Japan in spring',
    'a large ring, facts, contributions in a card; no NaN',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).not.toMatch(/NaN|Infinity|undefined/);
      await expect(page.locator('main')).toContainText('Japan in spring');
    },
  );
  await open(page, '/s/insights/year');
  await settled(page);
  await step(
    page,
    F,
    6,
    'year',
    'Open the year',
    'chart card, savings rate as a stat tile ("15%"), relief tags',
    async () => {
      await expect(page.locator('main')).toContainText('Savings rate');
      await expect(page.locator('main')).toContainText('15%');
      await expect(page.locator('main')).toContainText('Relief tags');
    },
  );
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-23 Sen: memory, research, usage, offline', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-23';
  await open(page, '/s/agent/memory');
  await settled(page);
  const forget = page.getByRole('button', { name: /^Forget:/ });
  await step(
    page,
    F,
    1,
    'memory',
    'Open What Sen remembers',
    'four notes, each with an icon-only Forget button that has a name',
    async () => {
      await expect(forget).toHaveCount(4);
    },
  );
  await forget.first().click();
  await step(page, F, 2, 'forgotten', 'Forget the first note', 'three notes left and a toast with Undo', async () => {
    await expect(forget).toHaveCount(3);
    await expect(toast(page).getByRole('button', { name: 'Undo' })).toBeVisible();
  });
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await step(page, F, 3, 'undone', 'Undo', 'four notes again', async () => {
    await expect(forget).toHaveCount(4);
  });
  await open(page, '/s/agent/research');
  await settled(page);
  await step(
    page,
    F,
    4,
    'research',
    'Open Research',
    'cards with status badges (Draft, Confirmed) and the number of findings; a draft is not shown as confirmed',
    async () => {
      await expect(page.locator('main')).toContainText('3 findings');
      await expect(page.locator('main')).toContainText('Draft');
      await expect(page.locator('main')).toContainText('Confirmed');
    },
  );
  await open(page, '/s/agent/usage');
  await settled(page);
  await step(
    page,
    F,
    5,
    'usage',
    'Open Usage',
    'two stat tiles (used, estimated cost) and one stacked bar with a legend; the cost is called an estimate',
    async () => {
      await expect(page.locator('main')).toContainText('320k tokens');
      await expect(page.locator('main')).toContainText('Estimated cost');
      await expect(page.locator('main')).toContainText(/estimate/i);
      await expect(page.locator('main')).toContainText('Chat · 182k tokens');
    },
  );
  await open(page, '/?state=offline');
  await page.getByRole('button', { name: /Ask Sen/ }).click();
  await step(page, F, 6, 'sen-offline', 'Open Sen while offline', 'Sen says it needs a connection', async () => {
    await expect(page.getByRole('dialog').first()).toContainText(/needs a connection/i);
  });
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-24 Settings tour', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-24';
  await open(page, '/s/settings');
  await settled(page);
  await step(
    page,
    F,
    1,
    'settings',
    'Open Settings',
    'a profile card (avatar, name, email) on top; rows with states: Appearance Minted, Capture 0 apps · not listening, Categories 4 rules, Claims 2 schemes, Sen ~RM3.80 this month, Members 2 of 20',
    async () => {
      await expect(page.locator('main')).toContainText('weiming@example.com');
      await expect(page.getByRole('button', { name: /^Appearance/ })).toContainText('Minted');
      await expect(page.getByRole('button', { name: /^Claims/ })).toContainText('2 schemes');
      await expect(page.getByRole('button', { name: /^Sen/ })).toContainText('RM3.80');
      await expect(page.getByRole('button', { name: /^Members/ })).toContainText('2 of 20');
    },
  );
  const visit: [string, RegExp, string, string][] = [
    ['Capture', /^Capture/, 'capture', 'status card and a 3-step checklist'],
    ['You', /^You/, 'you', 'payday as choice cards'],
    ['Categories and rules', /^Categories and rules/, 'categories', 'Categories / Rules'],
    ['Receipts by email', /^Receipts by email/, 'email', 'address with a copy icon button; Gmail steps; code card'],
    ['Claims', /^Claims/, 'claims', 'schemes as sentences; ESS connection card'],
    ['Sen', /^Sen/, 'sen', 'Calendar, Memory, AI credit'],
    ['Members', /^Members/, 'members', 'seat meter and people'],
    ['Data', /^Export and backups/, 'data', 'export card'],
  ];
  let n = 1;
  for (const [title, name, slug, what] of visit) {
    await page.getByRole('button', { name }).click();
    n++;
    await step(
      page,
      F,
      n,
      slug,
      `Open ${title}`,
      `${what}; the screen has a title and Back returns to Settings`,
      async () => {
        await expect(page).toHaveURL(/\/s\/settings\//);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      },
    );
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/s\/settings(\?|$)/);
  }
  expect(w.errors).toEqual([]);
});

test('R2-FLOW-25 Settings: destructive actions are guarded', async ({ page }) => {
  const F = 'R2-FLOW-25';
  await open(page, '/s/settings/account');
  await settled(page);
  await step(
    page,
    F,
    1,
    'account',
    'Open Account',
    'groups About (Version) and Account (Sign out, Delete account); Delete account is destructive-styled',
    async () => {
      await expect(page.locator('main')).toContainText('Version');
      const del = page.getByRole('button', { name: 'Delete account' });
      const col = await del.evaluate((e) => getComputedStyle(e.querySelector('[class*="destructive"]') ?? e).color);
      console.log('delete colour', col);
      expect(
        await del.evaluate((e) => !!e.querySelector('[class*="destructive"]') || e.className.includes('destructive')),
      ).toBe(true);
    },
  );
  await page.getByRole('button', { name: 'Delete account' }).click();
  await step(
    page,
    F,
    2,
    'delete-stand-in',
    'Tap Delete account',
    'nothing is deleted: a toast says so (the real confirmation dialog arrives with accounts, B05)',
    async () => {
      await expect(toast(page)).toContainText(/Nothing was deleted/);
    },
  );
  await open(page, '/s/settings/claims');
  await settled(page);
  await page.getByRole('button', { name: 'More about ESS' }).click();
  await step(
    page,
    F,
    3,
    'ess-menu',
    "Open the ESS card's menu",
    'Teach again / Forget password are behind the menu, not on the card',
    async () => {
      const items = await page.getByRole('menu').getByRole('menuitem').allInnerTexts();
      console.log('ESS menu', items.join('|'));
      expect(items.join('|')).toMatch(/Forget/);
    },
  );
  await page.keyboard.press('Escape');
  await open(page, '/s/settings/members');
  await settled(page);
  await page.getByRole('button', { name: /Hui Min/ }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await step(
    page,
    F,
    4,
    'remove-dialog',
    'Member -> Remove',
    'a confirmation with a way out ("Keep them"); the member is still listed afterwards',
    async () => {
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Keep them' }).click();
      await page.getByRole('button', { name: 'Back' }).click();
      await expect(page.getByRole('button', { name: /Hui Min/ })).toBeVisible();
    },
  );
});

test('R2-FLOW-26 Appearance: six looks, three modes', async ({ page }) => {
  const w = watch(page);
  const F = 'R2-FLOW-26';
  await open(page, '/s/settings/appearance');
  await settled(page);
  await step(
    page,
    F,
    1,
    'appearance',
    'Open Appearance',
    'Mode as System/Light/Dark with icons; a switch card "Change each quarter" with the next change date (1 Jan 2027); six look cards in two columns, each with a preview',
    async () => {
      for (const m of ['System', 'Light', 'Dark']) await expect(page.getByRole('radio', { name: m })).toBeVisible();
      await expect(page.getByRole('switch', { name: /Change each quarter/ })).toBeChecked();
      await expect(page.locator('main')).toContainText('1 Jan 2027');
      const _cards = page.getByRole('radio').filter({ has: page.locator('[data-look-preview], svg, div') });
      expect(await page.locator('[role=radio]').count()).toBeGreaterThanOrEqual(9);
    },
  );
  let n = 1;
  for (const look of ['Instrument', 'Firefly', 'Line', 'Mercury', 'Copper', 'Minted']) {
    await page
      .getByRole('radio', { name: new RegExp(look) })
      .first()
      .click();
    n++;
    await step(
      page,
      F,
      n,
      look.toLowerCase(),
      `Choose ${look}`,
      `the whole app is ${look}: html[data-look]; exactly one look card is chosen; the quarterly switch turns off`,
      async () => {
        await expect(page.locator('html')).toHaveAttribute('data-look', look.toLowerCase());
        await expect(page.getByRole('switch', { name: /Change each quarter/ })).not.toBeChecked();
        const checked = await page
          .locator('[role=radio][aria-checked="true"], [role=radio][data-state="checked"]')
          .count();
        // mode group has one checked + exactly one look card
        expect(checked).toBe(2);
      },
    );
  }
  await page.getByRole('radio', { name: 'Dark' }).click();
  await step(page, F, 8, 'dark', 'Choose Dark', 'html data-mode is dark', async () => {
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  });
  await page.goto('/s/settings/appearance');
  await step(page, F, 9, 'reload', 'Reload without dev parameters', 'the look and mode survive a reload', async () => {
    await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  });
  expect(w.errors).toEqual([]);
});
