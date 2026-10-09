import { expect, test, type Page } from '@playwright/test';
import { shot, sim, toCapture } from './b02-helpers';

// QA run 7 (scoped: the capture path), R7-FLOW-1 to R7-FLOW-11 of qa/B02/flows.md. The simulator posts only
// its own made-up samples, so for the screen's rendering of other text the page seeds the simulator's
// store with made-up events (the store is imported from the running dev server). What the shell's Kotlin
// core does with other text is Probe7.kt's job. Every step asserts first, then screenshots.
const RYT = 'my.rytbank.app';
const rows = (page: Page) => page.getByRole('main').locator('ul > li');
const LINE = 'Maybe a one-time code, so its numbers are hidden';

type Ev = { title: string | null; text: string | null; bigText?: string | null; maybeOtp?: boolean; postTime?: number; pkg?: string };

async function seed(page: Page, events: Ev[], chosen = [RYT]) {
  await page.evaluate(
    async ({ events, chosen }) => {
      const m = await import(/* @vite-ignore */ '/src/dev/capture-sim.ts');
      const now = Date.now();
      m.useCaptureSim.setState({
        access: true,
        connected: true,
        chosen,
        events: events.map((e, i) => ({
          id: 2000 - i,
          package: e.pkg ?? 'my.rytbank.app',
          channel: 'transactions',
          title: e.title,
          text: e.text,
          bigText: e.bigText ?? null,
          postTime: e.postTime ?? now - i * 60_000,
          when: e.postTime ?? now - i * 60_000,
          capturedAt: now,
          synced: false,
          maybeOtp: e.maybeOtp ?? false,
        })),
      });
    },
    { events, chosen },
  );
}

async function openCaptured(page: Page) {
  await page.getByRole('button', { name: /Captured on this phone/ }).click();
  await expect(page.getByRole('heading', { name: 'Captured on this phone' })).toBeVisible();
}

async function choose(page: Page, labels: string[]) {
  await page.getByRole('button', { name: /Your apps/ }).click();
  for (const label of ['Ryt Bank', "Touch 'n Go eWallet", 'MyPB by Public Bank', 'Grab']) {
    const sw = page.getByRole('switch', { name: label });
    const on = labels.includes(label);
    if ((await sw.isChecked()) !== on) await sw.click();
    if (on) await expect(sw).toBeChecked();
    else await expect(sw).not.toBeChecked();
  }
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Capture' })).toBeVisible();
}

const beats = async (page: Page) => {
  await page.getByRole('button', { name: 'Heartbeat' }).click();
  const sheet = page.getByRole('dialog', { name: 'Heartbeat' });
  await expect(sheet).toBeVisible();
  return sheet;
};

test('R7-FLOW-1/4 rows show what is stored, as stored; the muted line is on the marked row only', async ({ page }) => {
  await toCapture(page);
  const long = 'Statement note: ' + 'word '.repeat(190) + 'END';
  await seed(page, [
    { title: 'Card payment completed 👍', text: 'RM12.90 paid at Kedai Kopi 椰 using your Main Account. Ref ••••••••.' },
    { title: 'Ryt Bank', text: 'RM50.00 transfer to TAN WEI MING: ••••••. Never share your TAC.', maybeOtp: true },
    { title: 'Order update', text: 'Short', bigText: 'Line one\nLine two\n\nLine four   spaced' },
    { title: 'Reference', text: 'a'.repeat(300) + '•'.repeat(40) },
    { title: 'Long note', text: long },
    { title: 'Paid on', text: 'on ••/•/••••, •:••:•• PM' },
  ]);
  await openCaptured(page);
  await expect(rows(page)).toHaveCount(6);
  await expect(page.getByText('6 notifications, newest first, as the apps wrote them, with long numbers hidden.')).toBeVisible();
  // R7-AC-21: exactly one muted line, under the marked row
  await expect(page.getByText(LINE)).toHaveCount(1);
  await expect(rows(page).nth(1).getByText(LINE)).toBeVisible();
  // R7-AC-20: no run of 4 digits shown outside an amount
  const body = await page.getByRole('main').innerText();
  expect(body.replace(/RM\s?[\d,]+(\.\d\d)?/g, '')).not.toMatch(/\d{4}/);
  await shot(page, 'R7-FLOW-1-step-1-rows');
  // no horizontal scroll with a 300-character token and a 1,000-character note
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement!;
    return { doc: el.scrollWidth - el.clientWidth, main: (document.querySelector('main') as HTMLElement).scrollWidth - (document.querySelector('main') as HTMLElement).clientWidth };
  });
  expect(overflow.doc).toBeLessThanOrEqual(0);
  expect(overflow.main).toBeLessThanOrEqual(0);
  await shot(page, 'R7-FLOW-9-step-1-long-wraps');
  // selectable
  const sel = await rows(page).nth(0).getByText('RM12.90 paid at Kedai Kopi', { exact: false }).evaluate((el) => getComputedStyle(el).userSelect);
  expect(sel).toBe('text');
  // R7-AC-20: newlines in expanded text are kept visually (record: this is the drift check)
  const big = rows(page).nth(2).getByText('Line one', { exact: false });
  const h = await big.evaluate((el) => ({ h: el.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(el).lineHeight), ws: getComputedStyle(el).whiteSpace }));
  console.log('R7 newline rendering', JSON.stringify(h));
  expect.soft(h.h, `expanded text with 4 lines and a blank line renders ${Math.round(h.h / h.lh)} line(s), white-space=${h.ws}`).toBeGreaterThan(h.lh * 3.5);
  await shot(page, 'R7-FLOW-1-step-2-newlines');
});

test('R7-FLOW-2/3 an OTP is dropped and logged; an unchosen app leaves no trace; no code is on the page', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank']);
  await sim(page, 'Grant access');
  await openCaptured(page);
  await expect(rows(page)).toHaveCount(0);
  await shot(page, 'R7-FLOW-2-step-1-empty');
  await sim(page, 'Post an OTP');
  await expect(rows(page)).toHaveCount(0);
  const sheet = await beats(page);
  await expect(sheet.getByText('Dropped a one-time code from Ryt Bank')).toHaveCount(1);
  await shot(page, 'R7-FLOW-2-step-2-dropped-logged');
  expect(await page.locator('body').innerHTML()).not.toContain('482910');
  await page.keyboard.press('Escape');
  // the same OTP twice is two notifications for the sim (no key), so no replay claim here; R7-AC-7's once-only
  // is the Kotlin core's and the emulator's.
  // R7-FLOW-3: choose nobody, then an OTP and a payment: nothing stored, nothing logged
  await page.getByRole('button', { name: 'Back' }).click();
  await choose(page, []);
  await openCaptured(page);
  const before = await (await beats(page)).getByRole('listitem').count().catch(() => 0);
  await page.keyboard.press('Escape');
  await sim(page, 'Post an OTP');
  await sim(page, 'Post a notification', 2);
  await expect(rows(page)).toHaveCount(0);
  const sheet2 = await beats(page);
  await expect(sheet2.getByText(/Dropped a one-time code/)).toHaveCount(1); // still only the earlier one
  await shot(page, 'R7-FLOW-3-step-1-unchosen-no-trace');
  const state = await page.evaluate(async () => {
    const m = await import(/* @vite-ignore */ '/src/dev/capture-sim.ts');
    return { events: m.useCaptureSim.getState().events.length, otpBeats: m.useCaptureSim.getState().beats.filter((b: { kind: string }) => b.kind === 'otp').length };
  });
  expect(state).toEqual({ events: 0, otpBeats: 1 });
  void before;
});

test('R7-FLOW-4/5 a maybe-OTP is marked; a replay adds nothing; the same payment later is a second one', async ({ page }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank', "Touch 'n Go eWallet"]);
  await sim(page, 'Grant access');
  await openCaptured(page);
  await sim(page, 'Post a maybe-OTP');
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByText(LINE)).toHaveCount(1);
  await expect(page.getByText('RM50.00 transfer to TAN WEI MING: ••••••. Never share your TAC.')).toBeVisible();
  await shot(page, 'R7-FLOW-4-step-1-maybe-otp');
  await sim(page, 'Post it again');
  await expect(rows(page)).toHaveCount(1);
  await shot(page, 'R7-FLOW-5-step-1-replay-no-op');
  // 4 posts: TNG, PBB (unchosen), Ryt in, Ryt card -> 3 more rows; 4 more: again 3 (new `when`)
  await sim(page, 'Post a notification', 4);
  await expect(rows(page)).toHaveCount(4);
  await sim(page, 'Post a notification', 4);
  await expect(rows(page)).toHaveCount(7);
  await shot(page, 'R7-FLOW-5-step-2-later-is-new');
  const keys = await page.evaluate(async () => {
    const m = await import(/* @vite-ignore */ '/src/dev/capture-sim.ts');
    return m.useCaptureSim.getState().events.map((e: { text: string; when: number }) => `${e.text}|${e.when}`);
  });
  expect(new Set(keys).size).toBe(keys.length);
  // the heartbeat's last event moved only with new rows: the simulator's eventAt is the newest row's capture time
});

test('R7-FLOW-6 Share samples: nothing ticked is refused; a row ticks anywhere on it', async ({ page }) => {
  await toCapture(page);
  await seed(page, [
    { title: 'One', text: 'RM1.00 paid ••••' },
    { title: 'Two', text: 'RM2.00 paid ••••' },
    { title: 'Three', text: 'RM3.00 paid ••••' },
  ]);
  await openCaptured(page);
  await page.getByRole('button', { name: 'Share samples' }).click();
  await page.getByRole('button', { name: 'Tick the ones to share' }).click();
  await expect(page.getByText('Tick the notifications to share first.')).toBeVisible();
  await shot(page, 'R7-FLOW-6-step-1-nothing-ticked');
  // the label's overlay takes the tap, as intended: tap the row body anywhere
  await rows(page).nth(0).click({ position: { x: 200, y: 30 } });
  await rows(page).nth(2).click({ position: { x: 120, y: 40 } });
  await expect(page.getByRole('button', { name: 'Share 2 samples' })).toBeVisible();
  await expect(rows(page).nth(1).getByRole('checkbox')).not.toBeChecked();
  await shot(page, 'R7-FLOW-6-step-2-two-ticked');
  await page.getByRole('button', { name: 'Share 2 samples' }).click();
  await expect(page.getByText('Simulated: the share sheet with 2 samples')).toBeVisible();
  await shot(page, 'R7-FLOW-6-step-3-shared');
});

for (const tz of ['America/Los_Angeles', 'Pacific/Kiritimati', 'Asia/Kuala_Lumpur']) {
  test(`R7-FLOW-7 23:30 KL on 31 Oct reads 31 Oct, 23:30 in ${tz}`, async ({ browser }) => {
    const ctx = await browser.newContext({ timezoneId: tz, viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await toCapture(page);
    await seed(page, [
      { title: 'Month end', text: 'RM9.90 paid', postTime: Date.UTC(2026, 9, 31, 15, 30) },
      { title: 'Next day', text: 'RM1.00 paid', postTime: Date.UTC(2026, 9, 31, 16, 5) },
    ]);
    await openCaptured(page);
    await expect(rows(page).nth(0).getByText('Sat, 31 Oct, 23:30')).toBeVisible();
    await expect(rows(page).nth(1).getByText('Sun, 1 Nov, 00:05')).toBeVisible();
    await shot(page, `R7-FLOW-7-step-1-${tz.replace('/', '-')}`);
    await ctx.close();
  });
}

test('R7-FLOW-8 the simulator keeps nothing across a reload (record), and works offline in the page', async ({ page, context }) => {
  await toCapture(page);
  await choose(page, ['Ryt Bank']);
  await sim(page, 'Grant access');
  await openCaptured(page);
  await context.setOffline(true);
  await sim(page, 'Post a maybe-OTP');
  await expect(rows(page)).toHaveCount(1);
  await shot(page, 'R7-FLOW-8-step-1-offline-captured');
  await context.setOffline(false);
  await page.reload();
  await page.waitForLoadState();
  const left = await page.evaluate(async () => {
    const m = await import(/* @vite-ignore */ '/src/dev/capture-sim.ts');
    return { events: m.useCaptureSim.getState().events.length, chosen: m.useCaptureSim.getState().chosen.length, ls: Object.keys(localStorage).join(','), }
  });
  console.log('R7 after reload', JSON.stringify(left));
  // the simulator holds events in memory only: a reload loses them. The shell's outbox is SQLite (emulator).
  expect(left.events).toBe(0);
  await shot(page, 'R7-FLOW-8-step-2-after-reload');
});

test('R7-FLOW-11 the empty and the error states', async ({ page }) => {
  await toCapture(page);
  await seed(page, []);
  await openCaptured(page);
  await expect(page.getByText('Notifications from your chosen apps appear here as they arrive.')).toBeVisible();
  await shot(page, 'R7-FLOW-11-step-1-empty');
  await page.getByRole('button', { name: 'Back' }).click();
  await page.evaluate(async () => {
    const m = await import(/* @vite-ignore */ '/src/dev/capture-sim.ts');
    (m.captureSim as unknown as { events: () => Promise<never> }).events = async () => {
      throw new Error('boom');
    };
  });
  await openCaptured(page);
  await expect(page.getByRole('alert').or(page.getByRole('button', { name: /try again|retry/i })).first()).toBeVisible();
  await expect(page.getByText(/boom|Error:|at .*\.tsx/)).toHaveCount(0);
  await shot(page, 'R7-FLOW-11-step-2-error');
});
