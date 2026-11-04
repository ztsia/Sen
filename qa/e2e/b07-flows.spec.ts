import fs from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';

// QA B07 run 1: the flows of qa/B07/flows.md a browser can walk (b07.config.ts). Each step asserts
// first, then takes its screenshot, then writes its row for results.json. Made-up people and amounts.
const ROOT = '../../qa-artifacts/B07_sync';
const SHOTS = `${ROOT}/screens`;
const STEPS = `${ROOT}/steps.jsonl`;
fs.mkdirSync(SHOTS, { recursive: true });
const SERVER = 'http://localhost:4179';

async function step(
  page: Page,
  flow: string,
  n: number,
  slug: string,
  action: string,
  assertion: string,
  check: () => Promise<void>,
) {
  const file = `${flow}-step-${n}-${slug}`;
  let status = 'pass';
  let err = '';
  try {
    await check();
  } catch (e) {
    status = 'fail';
    err = String(e).slice(0, 600);
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/${file}.png` }).catch(() => undefined);
  fs.appendFileSync(
    STEPS,
    JSON.stringify({ flow, n, action, assertion, status, screenshot: `${file}.png`, err }) + '\n',
  );
  if (status === 'fail') throw new Error(`${flow} step ${n}: ${err}`);
}

/** One query on sen_test as its owner, answering the rows. */
async function sql<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const req = createRequire(createRequire(new URL('../../apps/web/package.json', import.meta.url)).resolve('@sen/db'));
  const pg = req('pg') as { Client: new (o: { connectionString: string }) => unknown };
  const c = new pg.Client({ connectionString: 'postgres://sen_owner@127.0.0.1:5432/sen_test' });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });
const alertBar = (page: Page) => page.getByRole('main').getByRole('alert');
/** The simulated category prompt (a stand-in notification): its card, found from its own words. */
const promptCard = (page: Page) =>
  page
    .locator('*')
    .filter({ has: page.getByText(/^Stand-in/) })
    .filter({ has: page.getByRole('button', { name: 'Meals', exact: true }) })
    .last();

async function openFake(page: Page, path: string) {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${sep}look=minted&mode=light`);
  await expect(page.locator('html')).toHaveAttribute('data-look', 'minted');
  await page.waitForTimeout(400);
}

// ── FLOW-7: Home's capture warning (the fake's capture-off scenario) ─────────────────────────────
test('FLOW-7 Home warns that capture may be off, and Fix opens Capture', async ({ page }) => {
  await step(
    page,
    'FLOW-7',
    1,
    'home-healthy',
    'Open Home in the usual scenario',
    'no capture warning on Home',
    async () => {
      await openFake(page, '/');
      await expect(page.getByRole('heading', { name: 'Home' })).toBeAttached();
      await expect(page.getByText(/Capture (is|may be) off/)).toHaveCount(0);
    },
  );
  await step(
    page,
    'FLOW-7',
    2,
    'home-capture-off',
    'Open Home with capture silent (?scenario=capture-off)',
    'a warning bar at the top reads "Capture may be off" with Fix',
    async () => {
      await openFake(page, '/?scenario=capture-off');
      const bar = alertBar(page);
      await expect(bar).toContainText('Capture may be off');
      await expect(bar).toContainText(/No payment notifications since/);
      await expect(bar.getByRole('button', { name: 'Fix' })).toBeVisible();
      // it sits above everything else on Home (screens.md home 2): above the Payday plan and the figure
      const barY = (await bar.boundingBox())!.y;
      const planY = (await page.getByRole('button', { name: /Payday plan/ }).boundingBox())!.y;
      expect(barY).toBeLessThan(planY);
    },
  );
  await step(page, 'FLOW-7', 3, 'fix-opens-capture', 'Tap Fix', 'Settings → Capture opens', async () => {
    await alertBar(page).getByRole('button', { name: 'Fix' }).click();
    await expect(page).toHaveURL(/\/s\/settings\/capture$/);
  });
});

// ── FLOW-9: Captured on this phone, from the server's events (the fake) ─────────────────────────
const captured: Record<string, string[]> = {};
for (const tz of ['Asia/Kuala_Lumpur', 'America/New_York']) {
  test.describe(`FLOW-9 in ${tz}`, () => {
    test.use({ timezoneId: tz });
    test(`FLOW-9 Captured on this phone lists the events newest first (${tz})`, async ({ page }) => {
      const tag = tz === 'Asia/Kuala_Lumpur' ? 'kl' : 'ny';
      await step(
        page,
        'FLOW-9',
        tag === 'kl' ? 1 : 2,
        `captured-${tag}`,
        `Open Settings → Capture → Captured on this phone (browser in ${tz})`,
        'the server’s events, newest first, with their raw text; times in KL',
        async () => {
          await openFake(page, '/s/settings/capture/captured');
          const rows = page.getByRole('main').getByRole('listitem');
          await expect(rows.first()).toBeVisible();
          await expect(page.getByText(/notifications, newest first, kept for you only/)).toBeVisible();
          const texts = await rows.allInnerTexts();
          captured[tz] = texts;
          expect(texts.length).toBeGreaterThan(1);
          expect(texts.join('\n')).toContain('You paid RM6.50 to KEDAI MAJU');
          if (tz !== 'Asia/Kuala_Lumpur') expect(texts).toEqual(captured['Asia/Kuala_Lumpur']);
        },
      );
    });
  });
}

// ── FLOW-8: a setting written in a browser, against the real API on sen_test ────────────────────
async function signIn(page: Page) {
  await sql('truncate auth_rate_limit');
  await page.goto(`${SERVER}/s/sign-in`);
  await page.getByLabel('Your email').fill('weiming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}
const storedNames = async () =>
  (
    await sql<{ n: string[] | null }>(
      "select s.own_names n from user_settings s join auth_user u on u.id = s.user_id where u.email = 'weiming@example.com'",
    )
  )[0]?.n ?? null;

test('FLOW-8 a write in a browser: slow, refused, retried', async ({ page }) => {
  await signIn(page);
  await page.goto(`${SERVER}/s/settings/you`);
  const names = page.getByLabel('Your names as banks print them');
  const before = await storedNames();

  let mode: 'slow' | 'error' | 'pass' = 'slow';
  await page.route('**/api/commands', async (route) => {
    if (mode === 'slow') {
      await new Promise((r) => setTimeout(r, 7000));
      return route.continue();
    }
    if (mode === 'error')
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'server', message: 'Sen’s server had a problem.' }),
      });
    return route.continue();
  });

  await step(
    page,
    'FLOW-8',
    1,
    'slow-shows-at-once',
    'Change the names; the request takes 7 s',
    'the new value shows at once, with no "Not synced yet" before 5 s',
    async () => {
      await names.fill('QA SLOW NAME');
      await names.blur();
      await expect(names).toHaveValue('QA SLOW NAME');
      await page.waitForTimeout(2500);
      await expect(page.getByText('Not synced yet')).toHaveCount(0);
    },
  );
  await step(
    page,
    'FLOW-8',
    2,
    'slow-not-synced',
    'Wait past 5 s',
    '"Not synced yet" shows by the field while the request is out',
    async () => {
      await expect(page.getByText('Not synced yet')).toBeVisible({ timeout: 4000 });
    },
  );
  await step(
    page,
    'FLOW-8',
    3,
    'slow-saved',
    'The request answers',
    'the mark goes, the value stays, and the database has it',
    async () => {
      await expect(page.getByText('Not synced yet')).toHaveCount(0, { timeout: 8000 });
      await expect(names).toHaveValue('QA SLOW NAME');
      await expect.poll(storedNames).toEqual(['QA SLOW NAME']);
    },
  );

  mode = 'error';
  await step(
    page,
    'FLOW-8',
    4,
    'refused-reverts',
    'Change the names; the API answers 500',
    'the field goes back to the stored value and the toast offers Retry with the server’s words',
    async () => {
      await names.fill('QA REFUSED NAME');
      await names.blur();
      await expect(names).toHaveValue('QA SLOW NAME');
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
      await expect(page.getByText(/Couldn't save: /)).toBeVisible();
      expect(await storedNames()).toEqual(['QA SLOW NAME']);
    },
  );

  await step(
    page,
    'FLOW-8',
    5,
    'retry-fails-again',
    'Tap Retry while the API still refuses',
    'still the stored value; a Retry is offered again and nothing says it saved',
    async () => {
      await page.getByRole('button', { name: 'Retry' }).click();
      await expect(page.getByRole('button', { name: 'Retry' }).first()).toBeVisible();
      console.log('Retry buttons after a failed Retry:', await page.getByRole('button', { name: 'Retry' }).count());
      await page.waitForTimeout(800);
      await expect(names).toHaveValue('QA SLOW NAME');
      const toasts = await page.locator('[data-sonner-toast]').allInnerTexts();
      console.log('toasts after a failed Retry:', JSON.stringify(toasts));
      expect(toasts.join(' ')).not.toMatch(/Names saved/);
    },
  );

  mode = 'pass';
  await step(
    page,
    'FLOW-8',
    6,
    'retry-saves',
    'Tap Retry with the API back',
    'Names saved; the field and the database hold the new value',
    async () => {
      await page.getByRole('button', { name: 'Retry' }).first().click();
      await expect(page.getByText('Names saved')).toBeVisible();
      await expect(names).toHaveValue('QA REFUSED NAME');
      await expect.poll(storedNames).toEqual(['QA REFUSED NAME']);
    },
  );
  console.log('names before the flow:', JSON.stringify(before));
});

// ── The core journeys (D124), in the preview's fake ─────────────────────────────────────────────
test('CORE-first-run guided journey', async ({ page }) => {
  await openFake(page, '/');
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.getByRole('button', { name: 'Choose a journey' }).click();
  await page.getByTestId('journey-first-run').click();
  const bar = page.getByTestId('journey-bar');
  for (let i = 1; i < 20; i++) {
    const caption = await page.getByTestId('journey-caption').innerText();
    const btn = bar.getByRole('button', { name: /^(Next|Finish)$/ });
    const last = (await btn.innerText()) === 'Finish';
    await step(
      page,
      'CORE-first-run',
      i,
      `step-${i}`,
      caption.slice(0, 80),
      last ? 'Home: "Spent since you started"' : 'the journey bar shows its step',
      async () => {
        await expect(bar).toBeVisible();
        if (last) await expect(page.getByTestId('hero')).toContainText('Spent since you started');
      },
    );
    await btn.click();
    await page.waitForTimeout(700);
    if (last) break;
  }
});

test('CORE-pay-new: the prompt files a new merchant, and the next payment asks nothing', async ({ page }) => {
  await openFake(page, '/review');
  await step(
    page,
    'CORE-pay-new',
    1,
    'prompt',
    'Dev panel → A notification arrives',
    'the category prompt names the payment',
    async () => {
      await page.getByRole('button', { name: 'Dev panel' }).click();
      await page.getByRole('button', { name: 'A notification arrives' }).click();
      const prompt = promptCard(page);
      await expect(prompt).toContainText('ROTI BAKAR 88');
      await expect(prompt).toContainText('RM9.50');
      await expect(prompt.getByRole('button', { name: 'Meals', exact: true })).toBeVisible();
    },
  );
  await step(page, 'CORE-pay-new', 2, 'filed', 'Tap Meals', 'the payment is filed and the prompt goes', async () => {
    const prompt = promptCard(page);
    await prompt.getByRole('button', { name: 'Meals', exact: true }).click();
    await expect(prompt).toHaveCount(0, { timeout: 4000 });
    await expect(page.locator('[data-sonner-toast]')).toContainText(/ROTI BAKAR 88/i);
  });
  // The simulator's prompt is one fixed stand-in (dev/native/simulator.ts `arrives`): it shows again
  // whatever the rules say, so "the next payment there asks nothing" isn't reachable in a browser; it is
  // the shell's native prompt (B09/B10). What is reachable: the payment left Review's Categories.
  await step(
    page,
    'CORE-pay-new',
    3,
    'left-review',
    'Look at Review → Categories',
    'Roti Bakar 88 no longer waits for a category',
    async () => {
      const categories = page.getByRole('main').getByText(/^Categories · \d+/);
      await expect(page.getByRole('main').getByText('RM9.50 · Roti Bakar 88')).toHaveCount(0);
      console.log('categories header:', await categories.innerText().catch(() => 'none'));
    },
  );
});

test('CORE-scan-after: scan, confirm, three people, attached', async ({ page }) => {
  await openFake(page, '/');
  await step(
    page,
    'CORE-scan-after',
    1,
    'crop',
    'Tap Scan and choose a photo',
    'the crop step offers Use this',
    async () => {
      const [camera] = await Promise.all([
        page.waitForEvent('filechooser'),
        tabs(page).getByRole('button', { name: 'Scan a receipt' }).click(),
      ]);
      await camera.setFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
      await expect(page.getByRole('button', { name: 'Use this' })).toBeVisible();
    },
  );
  await step(page, 'CORE-scan-after', 2, 'confirm', 'Use this', 'confirm shows SATE KAJANG HJ SAMURI', async () => {
    await page.getByRole('button', { name: 'Use this' }).click();
    await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10_000 });
    await expect(page.getByText('SATE KAJANG HJ SAMURI')).toBeVisible();
  });
  await step(page, 'CORE-scan-after', 3, 'three-people', 'Tap More people twice', 'RM21.38 a person', async () => {
    await page.getByRole('button', { name: 'More people' }).click();
    await page.getByRole('button', { name: 'More people' }).click();
    await expect(page.getByRole('region', { name: 'How many people ate?' })).toContainText('RM21.38');
  });
  await step(
    page,
    'CORE-scan-after',
    4,
    'attached',
    'Done',
    'the toast says Attached to RM64.13 on Ryt Bank',
    async () => {
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(page.locator('[data-sonner-toast]')).toContainText('Attached to RM64.13 on Ryt Bank');
    },
  );
});
