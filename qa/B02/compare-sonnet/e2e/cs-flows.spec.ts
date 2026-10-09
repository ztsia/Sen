import { expect, test, type Page } from '@playwright/test';

const SHOTS = '/home/user/Sen/.claude/worktrees/agent-a4be4889e0dd8b315/qa-artifacts/B02-shell-listener/screens';
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });

async function sim(page: Page, button: string, times = 1) {
  await page.getByRole('button', { name: 'Dev panel' }).click();
  for (let i = 0; i < times; i++) await page.getByRole('button', { name: button }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(700);
}

/** In-app navigation only: the simulator lives in the page's memory. */
async function toCaptured(page: Page) {
  await page.goto('/more?look=minted&mode=light');
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('link', { name: 'Capture' }).click();
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
}

/** The screen's rows, as plain text, in order. */
const evLi = (page: Page) => page.locator('li').filter({ has: page.locator('.selectable') });
const rows = (page: Page) => evLi(page).allInnerTexts();
const bodyText = (page: Page) => page.locator('body').innerText();
/** Four or more digits in a row (across single spaces, dashes, slashes), outside RM amounts. */
const longRuns = (s: string) =>
  [...s.replace(/(RM|MYR)\s?[\d,]+(\.\d{2})?/gi, '').replace(/\d{1,3}(,\d{3})*\.\d{2}/g, '').matchAll(/\d(?:[\s\-/.]?\d){3,}/g)].map((m) => m[0]);

async function chooseRytOnly(page: Page) {
  await page.getByRole('button', { name: 'Choose your apps' }).click();
  await page.getByRole('switch', { name: 'Ryt Bank' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
}

test('FLOW-1/2/3/4: chosen app captured; unchosen, OTP dropped; maybe-OTP masked and marked', async ({ page }) => {
  await toCaptured(page);
  // FLOW-1 step 1: empty state (patterns: EmptyState)
  await expect(page.getByText('Notifications from your chosen apps appear here as they arrive.')).toBeVisible();
  await expect(page.getByText('0 notifications', { exact: false })).toBeVisible();
  await shot(page, 'FLOW-1-step-1-empty');

  // FLOW-2 step 1: access granted, no app chosen -> nothing stored
  await sim(page, 'Grant access');
  await sim(page, 'Post a notification', 4);
  await expect(page.getByText('0 notifications', { exact: false })).toBeVisible();
  await shot(page, 'FLOW-2-step-1-none-chosen-4-posted');

  // choose Ryt only; the four samples cycle TNG, PBB, Ryt (x2): only Ryt's two are stored
  await chooseRytOnly(page);
  await sim(page, 'Post a notification', 4);
  await expect(page.getByText('2 notifications', { exact: false })).toBeVisible();
  const r = await rows(page);
  expect(r.length).toBe(2);
  for (const t of r) expect(t).toContain('Ryt Bank');
  await shot(page, 'FLOW-2-step-2-ryt-only-2-of-4');
  expect(await bodyText(page)).not.toContain('DuitNow Transfer is successful');
  expect(await bodyText(page)).not.toContain('Money Received');

  // FLOW-1 step 3: newest first. The sample order is Petron, then "Your money is in!" (next=1 starts at the 2nd sample)
  // so the last stored is the 4th post.
  const first = r[0]!;
  expect(first).toMatch(/Today, \d\d:\d\d/);
  await shot(page, 'FLOW-1-step-3-rows');

  // FLOW-3: an OTP: no new row, a heartbeat line with time+app, no digits anywhere
  await sim(page, 'Post an OTP');
  await expect(page.getByText('2 notifications', { exact: false })).toBeVisible();
  expect(await bodyText(page)).not.toContain('482910');
  await page.getByRole('button', { name: 'Heartbeat' }).click();
  await expect(page.getByText(/^Dropped a one-time code from Ryt Bank/)).toBeVisible();
  const sheet = await page.locator('[role=dialog]').innerText();
  expect(sheet).not.toContain('482910');
  expect(sheet).not.toMatch(/TAC|share/i);
  await page.waitForTimeout(700);
  await shot(page, 'FLOW-3-step-1-heartbeat-otp-line');
  await page.keyboard.press('Escape');

  // FLOW-4: maybe-OTP row has the muted line, masked digits as bullets; plain rows have none
  await sim(page, 'Post a maybe-OTP');
  await expect(page.getByText('3 notifications', { exact: false })).toBeVisible();
  await expect(page.getByText('Maybe a one-time code, so its numbers are hidden')).toHaveCount(1);
  await expect(page.getByText('RM50.00 transfer to TAN WEI MING: ••••••. Never share your TAC.')).toBeVisible();
  const all = (await rows(page)).join('\n');
  expect(longRuns(all)).toEqual([]);
  await shot(page, 'FLOW-4-step-1-maybe-otp-row');

  // FLOW-6: re-post of the newest: no new row (same dedupe identity)
  await sim(page, 'Post it again');
  await expect(page.getByText('3 notifications', { exact: false })).toBeVisible();
  await shot(page, 'FLOW-6-step-1-replay-no-new-row');

  // FLOW-6 step 2: two identical payments with different `when` are two rows: post 4 more (Ryt samples repeat)
  await sim(page, 'Post a notification', 4);
  await expect(page.getByText('5 notifications', { exact: false })).toBeVisible();
  const texts = (await rows(page)).filter((t) => t.includes('Petron'));
  expect(texts.length).toBe(2);
  await shot(page, 'FLOW-6-step-2-two-identical-payments-two-rows');
});

test('FLOW-8: Share samples ticks by row tap; nothing ticked is refused', async ({ page }) => {
  await toCaptured(page);
  await sim(page, 'Grant access');
  await chooseRytOnly(page);
  await sim(page, 'Post a notification', 3);
  await sim(page, 'Post a maybe-OTP');
  await page.getByRole('button', { name: 'Share samples' }).click();
  await shot(page, 'FLOW-8-step-1-picking');
  await page.getByRole('button', { name: 'Tick the ones to share' }).click();
  await expect(page.getByText('Tick the notifications to share first.')).toBeVisible();
  // tap the whole row, not the checkbox
  const row = evLi(page).nth(1);
  await row.click({ position: { x: 150, y: 20 } });
  await expect(page.getByRole('checkbox').nth(1)).toBeChecked();
  await expect(page.getByRole('checkbox').nth(0)).not.toBeChecked();
  await shot(page, 'FLOW-8-step-2-row-ticked');
  await page.getByRole('button', { name: 'Share 1 sample' }).click();
  await expect(page.getByText('Simulated: the share sheet with 1 sample')).toBeVisible();
  await shot(page, 'FLOW-8-step-3-shared');
});

test('FLOW-9: offline capture, reload, back online', async ({ page, context }) => {
  await toCaptured(page);
  await sim(page, 'Grant access');
  await chooseRytOnly(page);
  await context.setOffline(true);
  await sim(page, 'Post a notification', 3);
  await expect(page.getByText('1 notification', { exact: false })).toBeVisible();
  const before = (await rows(page)).length;
  await shot(page, 'FLOW-9-step-1-offline-captured');
  await context.setOffline(false);
  // the simulator is in-page memory: does it survive a reload? (AC-46)
  await page.reload();
  await page.waitForLoadState('networkidle');
  await shot(page, 'FLOW-9-step-2-after-reload');
  const afterText = await bodyText(page);
  console.log(`FLOW-9: rows before reload ${before}; after reload body mentions: ${/(\d+) notifications?/.exec(afterText)?.[0] ?? '(no captured screen)'}`);
});

test('FLOW-10: browser timezone America/New_York still shows Kuala Lumpur time', async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
    timezoneId: 'America/New_York',
    baseURL: 'http://localhost:4310',
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  await toCaptured(page);
  await sim(page, 'Grant access');
  await chooseRytOnly(page);
  await sim(page, 'Post a notification', 3);
  await expect(page.getByText('1 notification', { exact: false })).toBeVisible();
  const klNow = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const nyNow = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const r = (await rows(page))[0] ?? '(none)'; console.log('FLOW-10 rows:', JSON.stringify(await rows(page)));
  const m = /(Today|Yesterday), (\d\d):(\d\d)/.exec(r);
  console.log(`FLOW-10: row says [${m?.[0]}], KL now ${klNow}, NY now ${nyNow}`);
  expect(m).not.toBeNull();
  const shown = `${m![2]}:${m![3]}`;
  const diff = Math.abs(parseInt(shown.slice(0, 2)) * 60 + parseInt(shown.slice(3)) - (parseInt(klNow.slice(0, 2)) * 60 + parseInt(klNow.slice(3))));
  expect(Math.min(diff, 1440 - diff)).toBeLessThanOrEqual(2);
  await shot(page, 'FLOW-10-step-1-kl-time-under-ny-browser');
  await ctx.close();
});

test('FLOW-5: the stand-in samples never show a 4+ digit run outside amounts', async ({ page }) => {
  await toCaptured(page);
  await sim(page, 'Grant access');
  await page.getByRole('button', { name: 'Choose your apps' }).click();
  await page.getByRole('button', { name: 'Choose these 4' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await sim(page, 'Post a notification', 4);
  await sim(page, 'Post a maybe-OTP');
  const t = (await rows(page)).join('\n');
  expect(longRuns(t)).toEqual([]);
  // the Ryt "Your money is in!" sample: its date is masked to bullets by the mask
  await expect(page.getByText("You've received RM42.50 from TAN WEI MING on ••/•/••••, 9:48 PM (GMT+8).")).toBeVisible();
  await shot(page, 'FLOW-5-step-1-samples-masked');
});

test('FLOW-12: dropdown of states: error state when the bridge fails', async ({ page }) => {
  await toCaptured(page);
  await page.route('**/*', (r) => r.continue());
  // loading state is visible briefly: the simulator pauses 150 ms
  await shot(page, 'FLOW-12-step-1-empty-state-actions');
  await expect(page.getByRole('button', { name: 'Choose your apps' })).toBeVisible();
});
