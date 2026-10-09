import { expect, test, type Page } from '@playwright/test';
import { shot, sim, toCapture } from './b02-helpers';

// QA run 6 (scoped: the capture path, D116, D119): R6-FLOW-1 to R6-FLOW-7 of qa/B02/flows.md, at
// 412×915 in QA's own preview build with the shell simulated (b02-r6.config.ts). The simulator posts
// only its own made-up samples; what the Kotlin core does with other text is Probe6.kt's job.
// Every step asserts first, then screenshots.
const back = (page: Page) => page.getByRole('button', { name: 'Back' }).click();
const rows = (page: Page) => page.getByRole('main').locator('ul > li');
const LINE = 'Maybe a one-time code, so its numbers are hidden';
const MASKED = 'RM50.00 transfer to TAN WEI MING: ••••••. Never share your TAC.';
const S = {
  tng: ['DuitNow Transfer is successful!', 'You have successfully transferred RM 18.00 to LIM KAH HOE.'],
  pbb: ['Money Received', 'PBB. You have received a DuitNow Transfer of RM150.00 from TAN WEI MING.'],
  rytIn: ['Your money is in!', "You've received RM42.50 from TAN WEI MING on ••/•/••••, •:•• PM (GMT+•)."],
  rytCard: ['Card payment completed 👍', 'RM38.15 paid at Petron using your Main Account.'],
};

async function choose(page: Page, labels: string[]) {
  await page.getByRole('button', { name: /Your apps/ }).click();
  for (const label of ['Ryt Bank', "Touch 'n Go eWallet", 'MyPB by Public Bank', 'Grab']) {
    const sw = page.getByRole('switch', { name: label });
    const on = labels.includes(label);
    if ((await sw.isChecked()) !== on) await sw.click();
    if (on) await expect(sw).toBeChecked();
    else await expect(sw).not.toBeChecked();
  }
  await back(page);
  await expect(page.getByRole('heading', { name: 'Capture' })).toBeVisible();
}

async function captured(page: Page) {
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await expect(page.getByRole('heading', { name: 'Captured on this phone' })).toBeVisible();
}

const count = (page: Page, n: number) =>
  expect(page.getByText(`${n === 1 ? '1 notification' : `${n} notifications`}, newest first`)).toBeVisible();

async function rowIs(page: Page, i: number, [title, text]: string[], app: string) {
  const row = rows(page).nth(i);
  await expect(row.getByText(title!, { exact: true })).toBeVisible();
  await expect(row.getByText(text!, { exact: true })).toBeVisible();
  await expect(row.getByText(app, { exact: true })).toBeVisible();
  return row;
}

test('R6-FLOW-1 payments from chosen apps land on Captured, exactly, newest first', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank', "Touch 'n Go eWallet", 'MyPB by Public Bank']);
  await sim(page, 'Grant access');
  await captured(page);
  await count(page, 0);
  // the empty state from patterns.md, not a blank list
  await expect(page.getByText('Notifications from your chosen apps appear here as they arrive.')).toBeVisible();
  await shot(page, 'R6-FLOW-1-step-1-before');
  // step 2: four posts: TNG, MyPB, Ryt in, Ryt card (the simulator's order)
  await sim(page, 'Post a notification', 4);
  await count(page, 4);
  await shot(page, 'R6-FLOW-1-step-2-four-posted');
  // step 3: newest first, each title and text exact, app label on the row, no line on any of them
  await rowIs(page, 0, S.rytCard, 'Ryt Bank');
  await rowIs(page, 1, S.rytIn, 'Ryt Bank');
  await rowIs(page, 2, S.pbb, 'MyPB by Public Bank');
  await rowIs(page, 3, S.tng, "Touch 'n Go eWallet");
  await expect(page.getByText(LINE)).toHaveCount(0);
  // the time on each row is KL's, and selectable text stays selectable
  await expect(
    rows(page)
      .nth(0)
      .getByText(/^Today, \d{2}:\d{2}$/),
  ).toBeVisible();
  const style = await rows(page)
    .nth(0)
    .getByText(S.rytCard[1]!, { exact: true })
    .evaluate((el) => getComputedStyle(el).userSelect);
  expect(style).toBe('text');
  await shot(page, 'R6-FLOW-1-step-3-newest-first');
});

test('R6-FLOW-2 an unchosen app and an OTP leave nothing', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank']);
  await sim(page, 'Grant access');
  await captured(page);
  await count(page, 0);
  await shot(page, 'R6-FLOW-2-step-1-before');
  // step 2: the simulator's next sample is TNG's, which isn't chosen
  await sim(page, 'Post a notification');
  await expect(page.getByText('Simulated: not stored, its app isn’t chosen or access is off')).toBeVisible();
  await count(page, 0);
  await shot(page, 'R6-FLOW-2-step-2-unchosen');
  // step 3: a clear OTP from Ryt
  await sim(page, 'Post an OTP');
  await expect(page.getByText('Simulated: an OTP, dropped before anything was stored')).toBeVisible();
  await count(page, 0);
  await expect(rows(page)).toHaveCount(0);
  expect(await page.content()).not.toMatch(/482910/);
  await shot(page, 'R6-FLOW-2-step-3-otp');
  // step 4: the heartbeat: one drop line for Ryt, no text; nothing about TNG
  await page.getByRole('button', { name: 'Heartbeat' }).click();
  const sheet = page.getByRole('dialog', { name: 'Heartbeat' });
  await expect(sheet.getByText(/^Dropped a one-time code from Ryt Bank$/)).toHaveCount(1);
  const all = await sheet.innerText();
  expect(all).not.toMatch(/482910|TAC|Touch 'n Go|tngdigital/i);
  await shot(page, 'R6-FLOW-2-step-4-heartbeat');
});

test('R6-FLOW-3 a payment with a TAC footer and a code-like number is masked and marked', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank']);
  await sim(page, 'Grant access');
  await captured(page);
  await shot(page, 'R6-FLOW-3-step-1-before');
  await sim(page, 'Post a maybe-OTP');
  await expect(page.getByText('Simulated: maybe an OTP, stored with its numbers hidden')).toBeVisible();
  await count(page, 1);
  const row = rows(page).first();
  await expect(row.getByText(MASKED, { exact: true })).toBeVisible();
  await expect(row.getByText(LINE, { exact: true })).toBeVisible();
  // the amount is kept; no run of four digits anywhere in the row
  await expect(row.getByText(/RM50\.00/)).toBeVisible();
  expect(await row.innerText()).not.toMatch(/\d{4,}/);
  await shot(page, 'R6-FLOW-3-step-2-masked-row');
});

test('R6-FLOW-4 the same notification twice is stored once', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank', "Touch 'n Go eWallet"]);
  await sim(page, 'Grant access');
  await sim(page, 'Post a notification');
  await captured(page);
  await count(page, 1);
  await shot(page, 'R6-FLOW-4-step-1-one');
  await sim(page, 'Post it again');
  await expect(page.getByText('Simulated: the same notification again, not stored twice')).toBeVisible();
  await count(page, 1);
  await expect(rows(page)).toHaveCount(1);
  await shot(page, 'R6-FLOW-4-step-2-replayed');
  // reload the screen from Capture: still one
  await back(page);
  await captured(page);
  await count(page, 1);
  await shot(page, 'R6-FLOW-4-step-3-still-one');
});

test('R6-FLOW-5 a masked number with no OTP word: bullets, and no line (D119)', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank', "Touch 'n Go eWallet", 'MyPB by Public Bank']);
  await sim(page, 'Grant access');
  await sim(page, 'Post a notification', 3);
  await captured(page);
  await count(page, 3);
  await shot(page, 'R6-FLOW-5-step-1-posted');
  // Ryt's "money in": its date masked, its time and amount kept, not marked
  const row = await rowIs(page, 0, S.rytIn, 'Ryt Bank');
  await expect(row.getByText(LINE)).toHaveCount(0);
  // what the screen says about its rows, read for the record (finding: "as the apps wrote them")
  const intro = await page.getByText(/newest first/).innerText();
  console.log(`R6-FLOW-5 intro: ${intro}`);
  expect(intro).toContain('as the apps wrote them');
  await shot(page, 'R6-FLOW-5-step-2-masked-unmarked');
});

test("R6-FLOW-6 share samples: tapping a masked row's body ticks it", async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank']);
  await sim(page, 'Grant access');
  await sim(page, 'Post a maybe-OTP');
  await captured(page);
  await count(page, 1);
  await page.getByRole('button', { name: 'Share samples' }).click();
  const box = page.getByRole('main').getByRole('checkbox');
  await expect(box).toHaveCount(1);
  await expect(box).not.toBeChecked();
  await shot(page, 'R6-FLOW-6-step-1-picking');
  // a real tap where the row's text is drawn, not on the box (the row's label covers it)
  const at = (await rows(page).first().getByText(MASKED, { exact: true }).boundingBox())!;
  await page.touchscreen.tap(at.x + at.width / 2, at.y + at.height / 2);
  await expect(box).toBeChecked();
  await expect(rows(page).first().getByText(LINE)).toBeVisible();
  await shot(page, 'R6-FLOW-6-step-2-ticked-by-body');
  await page.getByRole('button', { name: 'Share 1 sample' }).click();
  await expect(page.getByText('Simulated: the share sheet with 1 sample')).toBeVisible();
  await shot(page, 'R6-FLOW-6-step-3-shared');
});

test.describe('another timezone', () => {
  test.use({ timezoneId: 'America/New_York' });
  test('R6-FLOW-7 a capture at 23:30 KL on 31 Oct shows KL time in New York', async ({ page }) => {
    // 2026-10-31 15:30 UTC is 23:30 in Kuala Lumpur and 11:30 in New York
    await page.clock.setFixedTime(new Date('2026-10-31T15:30:00Z'));
    await toCapture(page);
    await choose(page, ['Ryt Bank', "Touch 'n Go eWallet"]);
    await sim(page, 'Grant access');
    await captured(page);
    await shot(page, 'R6-FLOW-7-step-1-before');
    await sim(page, 'Post a notification');
    await count(page, 1);
    const tz = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(tz).toBe('America/New_York');
    await expect(rows(page).first().getByText('Today, 23:30', { exact: true })).toBeVisible();
    await expect(rows(page).first().getByText(/11:30/)).toHaveCount(0);
    await shot(page, 'R6-FLOW-7-step-2-kl-time');
    // 30 minutes later it's 1 Nov in KL and still 31 Oct in New York: yesterday, by KL's calendar
    await page.clock.setFixedTime(new Date('2026-10-31T16:30:00Z'));
    await back(page);
    await captured(page);
    await expect(rows(page).first().getByText('Yesterday, 23:30', { exact: true })).toBeVisible();
    await shot(page, 'R6-FLOW-7-step-3-next-kl-day');
  });
});
