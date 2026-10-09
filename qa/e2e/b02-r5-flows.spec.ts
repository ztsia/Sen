import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot, sim, toCapture } from './b02-helpers';

// QA run 5: the capture path after the masking net (D116), FLOW-15 to FLOW-18 and FLOW-20 of
// qa/B02/flows.md, at 412×915 in QA's own preview build with the shell simulated (b02-r5.config.ts).
// Every notification here is the simulator's made-up sample.
const back = (page: Page) => page.getByRole('button', { name: 'Back' }).click();
const rows = (page: Page) => page.getByRole('main').locator('ul > li');
const LINE = 'Maybe a one-time code, so its numbers are hidden';
const MASKED = 'RM50.00 transfer to TAN WEI MING: ••••••. Never share your TAC.';

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

const style = (l: Locator, prop: string) => l.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

test('FLOW-15 a doubtful OTP from a chosen app, stored masked and marked', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank']);
  await sim(page, 'Grant access');
  // step 1: the list, empty
  await captured(page);
  await count(page, 0);
  await expect(rows(page)).toHaveCount(0);
  await shot(page, 'FLOW-15-step-1-empty');
  // step 2: the simulator posts a maybe-OTP
  await sim(page, 'Post a maybe-OTP');
  await expect(page.getByText('Simulated: maybe an OTP, stored with its numbers hidden')).toBeVisible();
  await shot(page, 'FLOW-15-step-2-posted');
  // step 3: one row, bullets, the muted line under it, no 4-digit run anywhere in the row
  await count(page, 1);
  await expect(rows(page)).toHaveCount(1);
  const row = rows(page).first();
  await expect(row.getByText(MASKED, { exact: true })).toBeVisible();
  const line = row.getByText(LINE, { exact: true });
  await expect(line).toBeVisible();
  expect(await row.innerText()).not.toMatch(/\d{4,}/);
  // the line comes after the text, is muted like the app-and-time line, and isn't the body colour
  const text = row.getByText(MASKED, { exact: true });
  const lineBox = (await line.boundingBox())!;
  const textBox = (await text.boundingBox())!;
  expect(lineBox.y).toBeGreaterThan(textBox.y);
  const appLine = row.getByText('Ryt Bank', { exact: true }).first();
  expect(await style(line, 'color')).toBe(await style(appLine, 'color'));
  expect(await style(line, 'color')).not.toBe(await style(text, 'color'));
  // the title and text stay selectable (patterns.md §7)
  expect(await style(text, 'user-select')).toBe('text');
  await shot(page, 'FLOW-15-step-3-masked-row');
  // step 4: the same notification again (a reconnect replay)
  await sim(page, 'Post it again');
  await expect(page.getByText('Simulated: the same notification again, not stored twice')).toBeVisible();
  await shot(page, 'FLOW-15-step-4-replayed');
  // step 5: reload the list: still one
  await back(page);
  await captured(page);
  await count(page, 1);
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByText(LINE, { exact: true })).toHaveCount(1);
  // the screen with a masked row passes axe (WCAG 2.1 AA)
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  await shot(page, 'FLOW-15-step-5-still-one');
});

test('FLOW-16 a plain payment is stored exactly, with no maybe-OTP line', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank', "Touch 'n Go eWallet"]);
  await sim(page, 'Grant access');
  // step 1: a chosen app's payment (the simulator's first sample is TNG's transfer)
  await sim(page, 'Post a notification');
  await expect(page.getByText('Simulated: a notification captured')).toBeVisible();
  await shot(page, 'FLOW-16-step-1-posted');
  // step 2: the row, exactly as written, and no line under it
  await captured(page);
  await count(page, 1);
  const row = rows(page).first();
  await expect(row.getByText('DuitNow Transfer is successful!', { exact: true })).toBeVisible();
  await expect(
    row.getByText('You have successfully transferred RM 18.00 to LIM KAH HOE.', { exact: true }),
  ).toBeVisible();
  await expect(row.getByText(LINE)).toHaveCount(0);
  await expect(row.getByText('•')).toHaveCount(0);
  // then a maybe-OTP beside it: only that row carries the line
  await sim(page, 'Post a maybe-OTP');
  await count(page, 2);
  await expect(rows(page).nth(0).getByText(LINE)).toHaveCount(1);
  await expect(rows(page).nth(1).getByText(LINE)).toHaveCount(0);
  await shot(page, 'FLOW-16-step-2-plain-and-masked');
});

test('FLOW-17 a clear OTP and an unchosen app, after the mask', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank']);
  await sim(page, 'Grant access');
  // step 1: a clear OTP from a chosen app
  await sim(page, 'Post an OTP');
  await expect(page.getByText('Simulated: an OTP, dropped before anything was stored')).toBeVisible();
  await shot(page, 'FLOW-17-step-1-otp');
  // step 2: no row; one drop line, no text
  await captured(page);
  await count(page, 0);
  await page.getByRole('button', { name: 'Heartbeat' }).click();
  const sheet = page.getByRole('dialog', { name: 'Heartbeat' });
  await expect(sheet.getByText(/^Dropped a one-time code from Ryt Bank$/)).toHaveCount(1);
  expect(await sheet.innerText()).not.toMatch(/482910|TAC|share/i);
  await shot(page, 'FLOW-17-step-2-drop-logged');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  // step 3: no app chosen any more; a maybe-OTP arrives from the app that was
  await back(page);
  await choose(page, []);
  await sim(page, 'Post a maybe-OTP');
  await expect(page.getByText('Simulated: not stored, its app isn’t chosen or access is off')).toBeVisible();
  await shot(page, 'FLOW-17-step-3-unchosen');
  // step 4: still nothing stored, and the log still has one drop line
  await captured(page);
  await count(page, 0);
  await page.getByRole('button', { name: 'Heartbeat' }).click();
  await expect(page.getByRole('dialog', { name: 'Heartbeat' }).getByText(/^Dropped a one-time code/)).toHaveCount(1);
  await shot(page, 'FLOW-17-step-4-unchanged');
});

test('FLOW-18 share samples with a masked row ticked', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank', "Touch 'n Go eWallet"]);
  await sim(page, 'Grant access');
  await sim(page, 'Post a notification');
  await sim(page, 'Post a maybe-OTP');
  await captured(page);
  await count(page, 2);
  // step 1: tick both rows; the masked one still shows its line while picking
  await page.getByRole('button', { name: 'Share samples' }).click();
  const boxes = page.getByRole('main').getByRole('checkbox');
  await expect(boxes).toHaveCount(2);
  await boxes.nth(0).click();
  await boxes.nth(1).click();
  await expect(boxes.nth(0)).toBeChecked();
  await expect(boxes.nth(1)).toBeChecked();
  await expect(rows(page).nth(0).getByText(LINE)).toBeVisible();
  await expect(rows(page).nth(0).getByText(MASKED)).toBeVisible();
  await shot(page, 'FLOW-18-step-1-ticked');
  // step 2: share: the simulator stands in for Android's share sheet
  await page.getByRole('button', { name: 'Share 2 samples' }).click();
  await expect(page.getByText('Simulated: the share sheet with 2 samples')).toBeVisible();
  await shot(page, 'FLOW-18-step-2-shared');
});

test('FLOW-20 the simulator stores the masked text, never a code, for its maybe-OTP', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank']);
  await sim(page, 'Grant access');
  await sim(page, 'Post a maybe-OTP');
  await captured(page);
  // step 1: the stored text is the core's own output for the raw sample (Probe5.ac59s_sim_sample_matches_core)
  await expect(rows(page).first().getByText(MASKED, { exact: true })).toBeVisible();
  // step 2: nothing in the page's whole text or DOM holds a code-like run
  const html = await page.content();
  expect(html).not.toMatch(/482910/);
  expect(await page.locator('body').innerText()).not.toMatch(/\d{4,}/);
  await shot(page, 'FLOW-20-step-1-sim-equals-core');
});
