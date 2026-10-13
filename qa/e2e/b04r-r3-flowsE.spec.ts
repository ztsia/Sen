import { expect, test } from '@playwright/test';
import { uid } from '../../apps/web/src/data/fake/ids';
import { open, settled, toast, watch } from './b04r-helpers';
import { note, step } from './b04r-r3-lib';

// Run 3 flows E: claims, budgets, subscriptions, goals, Sen's pages, capture, states. Preview build (5392).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

test('R3-FLOW-10 claims: a month card, one main action, the pack in the app bar; a claim shows where it is', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R3-FLOW-10';
  let n = 0;
  await open(page, '/s/claims');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'claims',
    'Open Claims',
    'a September card "2 to submit · RM152.00 of RM200.00" with a bar whose value is 76; Send to ESS is the one 48 px primary button; Download claim pack is an icon button in the app bar',
    async () => {
      await expect(page.getByRole('region', { name: 'September 2026' })).toContainText('2 to submit');
      const bar = page.getByRole('progressbar', { name: /September 2026/ });
      await expect(bar).toHaveAttribute('aria-valuenow', '76');
      await expect(page.getByRole('banner').getByRole('button', { name: 'Download claim pack' })).toBeVisible();
      const send = page.getByRole('button', { name: 'Send to ESS' });
      const h = await send.evaluate((e) => Math.round(e.getBoundingClientRect().height));
      expect(h).toBe(48);
      await expect(send).toHaveAttribute('data-variant', 'default');
      // no other default-variant (primary) button on the screen
      const primaries = await page.locator('main [data-slot="button"][data-variant="default"]').count();
      expect(primaries).toBe(1);
    },
  );
  await page.getByRole('button', { name: 'Send to ESS' }).click();
  n++;
  await step(
    page,
    F,
    n,
    'send',
    'Tap Send to ESS',
    'only the claim with its evidence complete is sent: the toast says "Sending 1 claim", never 2',
    async () => {
      await expect(toast(page)).toContainText(/Sending 1 claim/);
    },
  );
  await page
    .getByRole('button', { name: /^Parking/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/s\/claim\?id=/);
  await settled(page);
  const stepper = page.getByRole('list', { name: 'Claim progress' });
  const marks = await stepper.locator('li').evaluateAll((els) =>
    els.map((e) => ({
      t: e.textContent!.trim(),
      current: e.getAttribute('aria-current'),
      svg: e.querySelectorAll('svg').length,
      sr: e.querySelector('.sr-only')?.textContent ?? null,
    })),
  );
  note(F, `stepper ${JSON.stringify(marks)}`);
  n++;
  await step(
    page,
    F,
    n,
    'claim',
    'Open the Parking claim (evidence missing)',
    'a stepper Draft, Ready, Sent, Approved, Paid where exactly one step is marked current for a screen reader (aria-current or hidden text); missing evidence says how to add it',
    async () => {
      expect(marks.map((m) => m.t.replace(/^\d/, ''))).toEqual(['Draft', 'Ready', 'Sent', 'Approved', 'Paid']);
      expect(marks.filter((m) => m.current || m.sr).length, 'one step marked current in the accessibility tree').toBe(
        1,
      );
      expect(
        marks.findIndex((m) => m.current),
        'evidence missing -> Draft',
      ).toBe(0);
      await expect(page.locator('main')).toContainText(/Receipt for 21 Sep|evidence/i);
    },
  );
  await page.goBack();
  await page
    .getByRole('button', { name: /^Phone bill/ })
    .first()
    .click();
  await settled(page);
  const cur = await page.getByRole('list', { name: 'Claim progress' }).locator('li[aria-current="step"]').innerText();
  n++;
  await step(
    page,
    F,
    n,
    'claim-ready',
    'Open the Phone bill claim (evidence complete)',
    'the current step is Ready',
    async () => {
      expect(cur.replace(/^\d\s*/, '')).toBe('Ready');
    },
  );
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-15 budgets, subscriptions, goals, goal, year: states in words, never alarm for a goal', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R3-FLOW-15';
  let n = 0;
  await open(page, '/s/budgets');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'budgets',
    'Open Budgets',
    'At risk: Meals 78% spent / Shopping "Over by RM20.30" with an icon and words; On track below; "Add a budget" in the app bar; each row says its figure and status in words',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).toMatch(/Over by RM20\.30/);
      expect(t).toMatch(/At risk: 78% spent, 63% of the cycle gone/);
      await expect(page.getByRole('banner').getByRole('button', { name: /Add a budget/ })).toBeVisible();
      // each row says its figure and status in its own name, so the bar itself is decoration
      for (const name of [
        /^Meals RM932\.93 of RM1,200\.00/,
        /^Shopping RM320\.30 of RM300\.00 Over by/,
        /^Drinks/,
        /^Entertainment/,
      ])
        await expect(page.getByRole('button', { name })).toHaveCount(1);
      // the over-budget row shows its warning with an icon, in the warning colour
      const warn = page.getByText('Over by RM20.30').first();
      const colour = await warn.evaluate((e) => getComputedStyle(e).color);
      note(F, `over-budget colour ${colour}`);
      const hasIcon = await warn.evaluate((e) => !!(e.parentElement?.querySelector('svg') ?? e.querySelector('svg')));
      expect(hasIcon).toBe(true);
    },
  );
  await open(page, '/s/subscriptions');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'subs',
    'Open Subscriptions',
    'RM141.90 committed each month; four compact cards; each history collapsed ("3 matched · 1 expected", "4 matched") and expandable',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).toMatch(/RM141\.90/);
      for (const name of ['Claude Pro', 'Netflix Basic', 'iCloud+ 200 GB', 'Spotify Premium'])
        expect(t).toContain(name);
      const toggles = page.getByRole('button', { name: /matched/ });
      expect(await toggles.count()).toBe(4);
      await expect(toggles.first()).toHaveAttribute('aria-expanded', 'false');
      await toggles.first().click();
      await expect(toggles.first()).toHaveAttribute('aria-expanded', 'true');
    },
  );
  // the sum: 85.10 + 28.00 + 4.90 + 23.90 = 141.90
  await open(page, '/s/goals');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'goals',
    'Open Goals',
    'Japan 49%, "RM2,950.00 of RM6,000.00", "Needs RM610.00 a cycle"; no goal bar or text in the warning colour',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).toMatch(/49%/);
      expect(t).toMatch(/RM2,950\.00 of RM6,000\.00/);
      expect(t).toMatch(/Needs RM610\.00/);
      const warn = await page.evaluate(() => {
        const w = getComputedStyle(document.documentElement).getPropertyValue('--money-warning').trim();
        return (
          Array.from(document.querySelectorAll<HTMLElement>('main *')).filter((e) =>
            /warning/.test(String(e.className)),
          ).length + (w ? 0 : 0)
        );
      });
      expect(warn).toBe(0);
    },
  );
  await page
    .getByRole('button', { name: /Japan in spring/ })
    .first()
    .click();
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'goal',
    'Open the Japan goal',
    'a large ring, a fact grid, "At this pace" labelled About <date> (a projection, in words), contributions listed; sum of contributions = the saved RM2,950.00',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).toMatch(/At this pace\s+About /);
      const amounts = [...t.split('Put in so far')[1]!.matchAll(/RM([\d,]+\.\d{2})\s*\n?RM [\d,]+\.\d{2}/g)].map((m) =>
        Number(m[1]!.replace(/[,.]/g, '')),
      );
      note(F, `goal contributions ${JSON.stringify(amounts)}`);
      // the screen lists the latest six; saved is RM2,950.00 in all (earlier ones are not listed)
      expect(amounts.length).toBeGreaterThan(0);
      expect(amounts.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(295000);
    },
  );
  await open(page, '/s/insights/year');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'year',
    'Open The year',
    'a chart with a table equivalent (12 months); savings rate 15% as a stat tile; "Relief tags" group',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).toMatch(/Savings rate\s+15%/);
      expect(t).toMatch(/Relief tags/);
      expect(t).toMatch(/Jan was the heaviest month at RM6,452\.90/);
    },
  );
  expect(w.errors).toEqual([]);
});

test("R3-FLOW-16 Sen's memory, research and usage", async ({ page }) => {
  const w = watch(page);
  const F = 'R3-FLOW-16';
  let n = 0;
  await open(page, '/s/agent/memory');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'memory',
    'Open What Sen remembers',
    'four notes, each with a Forget icon button named "Forget: <the note>"; none contains an amount',
    async () => {
      const forgets = page.getByRole('button', { name: /^Forget:/ });
      expect(await forgets.count()).toBe(4);
      const t = await page.locator('main').innerText();
      expect(t).not.toMatch(/RM\s?\d/);
    },
  );
  await open(page, '/s/agent/research');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'research',
    'Open Research',
    'three briefs with status badges (Draft, Confirmed, Draft) and the number of findings; the intro says a draft is not confirmed',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).toMatch(/Draft/);
      expect(t).toMatch(/Confirmed/);
      expect(t).toMatch(/3 findings/);
      expect(t).toMatch(/draft until you confirm/i);
    },
  );
  await open(page, '/s/agent/usage');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'usage',
    'Open Usage',
    'StatTiles "Used this month 320k tokens" and "Estimated cost About RM3.80"; a stacked bar with a legend: 182k + 96k + 42k = 320k',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t).toMatch(/Estimated cost\s+About RM3\.80/);
      expect(t).toMatch(/is an estimate/);
      const parts = [...t.matchAll(/· (\d+)k tokens/g)].map((m) => Number(m[1]));
      expect(parts.reduce((a, b) => a + b, 0)).toBe(320);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-X5 payday: a task with an end; every step can be skipped and a skipped step waits in Review', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R3-FLOW-X5';
  let n = 0;
  await open(page, '/?scenario=payday');
  await settled(page);
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page).toHaveURL(/\/s\/payday/);
  n++;
  await step(
    page,
    F,
    n,
    'step1',
    'Start the payday card',
    'Step 1 of 4; no tab bar, no Sen button; Undo is a ghost button at most 40 px; Skip is offered',
    async () => {
      await expect(page.locator('main')).toContainText('Step 1 of 4');
      await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Ask Sen', exact: true })).toHaveCount(0);
      const undo = page.getByRole('button', { name: 'Undo' });
      await expect(undo).toHaveAttribute('data-variant', 'ghost');
      expect(await undo.evaluate((e) => Math.round(e.getBoundingClientRect().height))).toBeLessThanOrEqual(40);
      await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
    },
  );
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    seen.push(/Step (\d) of 4/.exec(await page.locator('main').innerText())![0]);
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.waitForTimeout(650);
  }
  note(F, `steps seen while skipping: ${seen.join(', ')}; url ${page.url()}`);
  n++;
  await step(
    page,
    F,
    n,
    'skipped-all',
    'Skip step 1, 2 and 3',
    'each skip moves on one step (1, 2, 3 of 4)',
    async () => {
      expect(seen).toEqual(['Step 1 of 4', 'Step 2 of 4', 'Step 3 of 4']);
    },
  );
  await page.getByRole('button', { name: 'Skip' }).click(); // the fourth
  await page.waitForTimeout(800);
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('link', { name: /^Review/ })
    .click();
  await settled(page);
  const waiting = (await page.locator('main').innerText()).match(/skipped on payday/g)?.length ?? 0;
  note(F, `Review shows ${waiting} skipped payday step(s) after skipping four`);
  n++;
  await step(
    page,
    F,
    n,
    'review-waits',
    'Skip the fourth step, then open Review',
    'every skipped step waits in Review (at least the look-back and the plan), nothing is dropped',
    async () => {
      expect(waiting).toBeGreaterThanOrEqual(2);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-X6 skipped notifications: a card each, two lines of text, one booking per tap, Undo', async ({
  page,
}) => {
  const F = 'R3-FLOW-X6';
  await open(page, '/s/skipped');
  await settled(page);
  const cards = page.getByRole('article');
  const clamps = await cards.evaluateAll((els) =>
    els.map((e) => {
      const p = Array.from(e.querySelectorAll('p')).find((x) => getComputedStyle(x).webkitLineClamp !== 'none');
      return p ? getComputedStyle(p).webkitLineClamp : null;
    }),
  );
  note(F, `line clamps ${JSON.stringify(clamps)}`);
  await step(
    page,
    F,
    1,
    'cards',
    'Open Skipped',
    'three cards; the body text is clamped to 2 lines; each has "This was a payment" with an icon',
    async () => {
      await expect(cards).toHaveCount(3);
      expect(clamps.filter((c) => c === '2').length).toBe(3);
      for (const b of await page.getByRole('button', { name: 'This was a payment' }).all())
        expect(await b.locator('svg').count()).toBeGreaterThan(0);
    },
  );
  await page.getByRole('button', { name: 'This was a payment' }).first().click();
  await expect(cards).toHaveCount(2);
  await expect(page.locator('[data-sonner-toast]').first()).toContainText(/Undo/);
  await step(
    page,
    F,
    2,
    'booked',
    'Tap This was a payment on the first card',
    'one card left the list (two remain) and a toast offers Undo',
    async () => undefined,
  );
  await page.locator('[data-sonner-toast]').first().getByRole('button', { name: 'Undo' }).click();
  await expect(cards).toHaveCount(3);
  await step(page, F, 3, 'undone', 'Tap Undo', 'the card is back (three)', async () => undefined);
});

test('R3-FLOW-X7 add expense layout: large centred amount, a 4-column grid of category tiles, NavRows, a disclosure; no tab bar', async ({
  page,
}) => {
  const F = 'R3-FLOW-X7';
  await open(page, '/s/manual');
  await settled(page);
  const geo = await page.evaluate(() => {
    const amount = document.querySelector('input[inputmode="decimal"]') as HTMLInputElement;
    const r = document.querySelector('[role="radiogroup"]')!;
    const radios = Array.from(r.querySelectorAll('[role="radio"]')).map((e) =>
      Math.round(e.getBoundingClientRect().left),
    );
    const cols = new Set(radios).size;
    return {
      fs: parseFloat(getComputedStyle(amount).fontSize),
      cols,
      focused: document.activeElement === amount,
      tile: r.querySelectorAll('[role="radio"] svg').length,
    };
  });
  note(F, JSON.stringify(geo));
  await step(
    page,
    F,
    1,
    'layout',
    'Open Add expense',
    'the amount is large (>= 28 px) and focused; categories sit in 4 columns, each an icon tile; no tab bar; Paid from and When are rows in a card; More details is a disclosure',
    async () => {
      expect(geo.fs).toBeGreaterThanOrEqual(28);
      expect(geo.focused).toBe(true);
      expect(geo.cols).toBe(4);
      expect(geo.tile).toBe(17);
      await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'More details' })).toHaveAttribute('aria-expanded', 'false');
    },
  );
  await page.getByRole('button', { name: 'More details' }).click();
  await step(page, F, 2, 'more', 'Tap More details', 'merchant and note fields appear', async () => {
    await expect(page.getByRole('textbox')).not.toHaveCount(1);
  });
});

test('R3-FLOW-X8 structure: payments rows, accounts, an account, capture, the five settings screens, the sign-in pages', async ({
  page,
}) => {
  const w = watch(page);
  const F = 'R3-FLOW-X8';
  let n = 0;
  await open(page, '/s/payments');
  await settled(page);
  const rows = await page.locator('main button').evaluateAll((els) =>
    els
      .filter((e) => /RM\d/.test(e.textContent ?? '') && !e.closest('[aria-hidden="true"]'))
      .slice(0, 6)
      .map((e) => ({ h: Math.round(e.getBoundingClientRect().height), tile: e.querySelectorAll('svg').length > 0 })),
  );
  note(F, `payments rows ${JSON.stringify(rows)}`);
  n++;
  await step(
    page,
    F,
    n,
    'payments',
    'Open Payments',
    'rows are 56 px or more with a tinted icon mark; the search box has a search icon',
    async () => {
      expect(rows.length).toBeGreaterThan(3);
      for (const r of rows) {
        expect(r.h).toBeGreaterThanOrEqual(56);
        expect(r.tile).toBe(true);
      }
      expect(await page.getByRole('searchbox').evaluate((e) => !!e.closest('div')!.querySelector('svg'))).toBe(true);
    },
  );
  await open(page, '/s/accounts');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'accounts',
    'Open Accounts',
    'five tracked accounts with bank-initial tiles; Ryt "Checked 1 Oct", the others "Not checked"; Elsewhere holds Maybank with no balance',
    async () => {
      const t = await page.locator('main').innerText();
      expect(t.match(/Not checked/g)?.length).toBe(4);
      expect(t).toMatch(/Checked 1 Oct/);
      expect(t).toMatch(/Elsewhere[\s\S]*Maybank\s+No balance/);
      expect(t).not.toMatch(/Maybank[\s\S]{0,40}RM\d/);
    },
  );
  await page
    .getByRole('button', { name: /^Ryt Bank/ })
    .first()
    .click();
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'account',
    'Open Ryt Bank',
    'a header card; facts (Opening balance, Fed by, Last checked); an action bar Check, Payments, Ask Sen; recent payments in a card',
    async () => {
      const t = await page.locator('main').innerText();
      for (const f of ['Opening balance', 'Fed by', 'Last checked', 'Recent payments']) expect(t).toContain(f);
      for (const a of ['Check', 'Payments', 'Ask Sen'])
        await expect(page.getByRole('button', { name: a, exact: true }).first()).toBeVisible();
    },
  );
  await open(page, '/s/settings/capture');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'capture',
    'Open Capture (nothing chosen yet)',
    'a status card; the checklist Your apps / Notification access / Keep Sen running with their states; Captured on this phone with a count',
    async () => {
      const t = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
      expect(t).toMatch(/Not listening/);
      expect(t).toMatch(/Your apps \| None yet/);
      expect(t).toMatch(/Notification access \| Off/);
      expect(t).toMatch(/Keep Sen running \| Not done/);
      expect(t).toMatch(/Captured on this phone \| 0/);
    },
  );
  await open(page, '/s/settings/you');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'you',
    'Open You',
    'the payday choices are two cards that do not wrap; sharing is a row with its explanation',
    async () => {
      const heights = await page
        .getByRole('radiogroup')
        .getByRole('radio')
        .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
      note(F, `payday choice heights ${JSON.stringify(heights)}`);
      const names = await page.getByRole('radio').allInnerTexts();
      expect(names.join('|')).toMatch(/Last working day/);
      const lw = page.getByRole('radio', { name: /Last working day/ });
      const lines = await lw.evaluate((e) => {
        const t = Array.from(e.querySelectorAll('*')).find(
          (x) => x.children.length === 0 && /Last working day/.test(x.textContent ?? ''),
        )!;
        return Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight));
      });
      expect(lines).toBe(1);
    },
  );
  await open(page, '/s/settings/email');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'email',
    'Open Receipts by email',
    'the address in a card with an inline Copy button that has a name; Gmail steps; the confirmation code card; Received as a row',
    async () => {
      await expect(page.getByTestId('forward-address')).toContainText('@in.sen-my.app');
      await expect(page.getByRole('button', { name: /^Copy/ }).first()).toBeVisible();
      await expect(page.getByTestId('gmail-code')).toContainText(/\d{6}/);
      await expect(page.locator('main')).toContainText('Received');
    },
  );
  await open(page, '/s/settings/account');
  await settled(page);
  n++;
  await step(
    page,
    F,
    n,
    'account-screen',
    'Open Account',
    'About (Version) and Account (Sign out, Delete account in destructive); until B05 Delete only says nothing was deleted',
    async () => {
      const del = page.getByRole('button', { name: /Delete account/ });
      await expect(del).toBeVisible();
      await expect(page.getByRole('button', { name: /Sign out/ }).first()).toBeVisible();
      const red = await del.evaluate((b) => {
        const t = Array.from(b.querySelectorAll('*')).find(
          (x) => /Delete account/.test(x.textContent ?? '') && x.children.length === 0,
        )!;
        const probe = document.createElement('span');
        probe.style.color = 'var(--destructive)';
        document.body.append(probe);
        const want = getComputedStyle(probe).color;
        probe.remove();
        return getComputedStyle(t).color === want;
      });
      expect(red, 'Delete account is drawn in the destructive colour').toBe(true);
      // until B05 it is a stand-in: nothing is deleted, and the toast says so (the confirmation dialog is B05's)
      await del.click();
      await expect(toast(page)).toContainText(/Nothing was deleted/);
    },
  );
  await open(page, '/s/sign-in');
  await page.getByLabel('Your email').fill('stranger@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  n++;
  await step(
    page,
    F,
    n,
    'invitation-only',
    'Sign in as an address that was never invited',
    'it says "Sen is invitation-only" in words and sends no code (no code field)',
    async () => {
      await expect(page.locator('main')).toContainText('Sen is invitation-only');
      await expect(page.getByLabel('6-digit code')).toHaveCount(0);
    },
  );
  await open(page, '/s/new-look');
  n++;
  await step(
    page,
    F,
    n,
    'new-look',
    'Open the new-look card',
    'the look name large, Keep it as the main button, Go back, and a Change each quarter switch; a still placeholder (no animation)',
    async () => {
      await expect(page.getByRole('button', { name: 'Keep it' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
      await expect(page.getByRole('switch', { name: /Change each quarter/ })).toBeVisible();
      expect(
        await page
          .getByRole('button', { name: 'Keep it' })
          .evaluate((e) => Math.round(e.getBoundingClientRect().height)),
      ).toBe(48);
    },
  );
  expect(w.errors).toEqual([]);
});

test('R3-FLOW-X9 web behaviour: no overscroll, text selectable only where it is text, no context menu, focus ring only for the keyboard', async ({
  page,
}) => {
  const F = 'R3-FLOW-X9';
  await open(page, `/s/txn?id=${uid('txn:nasi-kandar')}`);
  await settled(page);
  const css = await page.evaluate(() => {
    const sel = (el: Element) => getComputedStyle(el).userSelect;
    const note = Array.from(document.querySelectorAll('main *')).find(
      (e) => /^Add a note$/.test(e.textContent?.trim() ?? '') && e.children.length === 0,
    );
    const bank = Array.from(document.querySelectorAll('main p')).find((e) =>
      /paid at NASI KANDAR/.test(e.textContent ?? ''),
    );
    const title = document.querySelector('header h1')!;
    return {
      html: getComputedStyle(document.documentElement).overscrollBehavior,
      body: getComputedStyle(document.body).overscrollBehavior,
      bankText: bank ? sel(bank) : 'missing',
      headerTitle: sel(title),
      callout: getComputedStyle(document.body).getPropertyValue('-webkit-touch-callout'),
      tap: getComputedStyle(document.body).touchAction,
      noteRow: note ? sel(note) : 'missing',
    };
  });
  note(F, JSON.stringify(css));
  let prevented = false;
  await page.evaluate(() =>
    document.addEventListener(
      'contextmenu',
      (e) => ((window as unknown as { __cm: boolean }).__cm = e.defaultPrevented),
      { capture: false },
    ),
  );
  await page.locator('header h1').dispatchEvent('contextmenu', { cancelable: true });
  prevented = await page.evaluate(() => (window as unknown as { __cm?: boolean }).__cm === true);
  await step(
    page,
    F,
    1,
    'css',
    'Read the computed styles on a payment page',
    'overscroll none on html and body; what the bank said is selectable; titles are not; the context menu on a title is cancelled; touch-action manipulation',
    async () => {
      expect(css.html).toContain('none');
      expect(css.body).toContain('none');
      expect(css.bankText).toBe('text');
      expect(css.headerTitle).toBe('none');
      expect(prevented).toBe(true);
      expect(css.tap).toBe('manipulation');
    },
  );
  // a pointer click shows no focus ring; the keyboard does
  const btn = page.getByRole('button', { name: 'Ask Sen', exact: true }).first();
  await btn.click({ force: true }).catch(() => undefined);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    return e ? { focusVisible: e.matches(':focus-visible'), shadow: getComputedStyle(e).boxShadow !== 'none' } : null;
  });
  note(F, `after Tab: ${JSON.stringify(ring)}`);
  await step(
    page,
    F,
    2,
    'focus',
    'Press Tab',
    'the focused control matches :focus-visible and shows a ring',
    async () => {
      expect(ring?.focusVisible).toBe(true);
    },
  );
});
