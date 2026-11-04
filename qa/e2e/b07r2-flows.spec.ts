import fs from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';

// QA B07 run 2 (scoped): Home's capture warnings against the real API on sen_test, the push stand-in
// beside Home's banner, and Captured on this phone's intro (b07r2.config.ts). Assert, then screenshot.
const ROOT = '../../qa-artifacts/B07_sync';
const SHOTS = `${ROOT}/screens`;
const STEPS = `${ROOT}/run2/steps.jsonl`;
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(`${ROOT}/run2`, { recursive: true });
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

async function sql<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const req = createRequire(createRequire(new URL('../../apps/web/package.json', import.meta.url)).resolve('@sen/db'));
  const pg = req('pg') as {
    Client: new (o: { connectionString: string }) => {
      connect(): Promise<void>;
      end(): Promise<void>;
      query(text: string, params: unknown[]): Promise<{ rows: unknown[] }>;
    };
  };
  const c = new pg.Client({ connectionString: 'postgres://sen_owner@127.0.0.1:5432/sen_test' });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}
const ME = "(select id from auth_user where email = 'weiming@example.com')";
const beat = (hoursAgo: number, connected: boolean, access: boolean) =>
  sql(
    `insert into device_heartbeats (id, user_id, listener_connected, access, app_version, created_at)
     values (gen_random_uuid(), ${ME}, $1, $2, '0.7.0', now() - make_interval(hours => $3))`,
    [connected, access, hoursAgo],
  );

async function signIn(page: Page) {
  await sql('truncate auth_rate_limit');
  await page.goto(`${SERVER}/s/sign-in`);
  await page.getByLabel('Your email').fill('weiming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}
const alertBar = (page: Page) => page.getByRole('main').getByRole('alert');

test('R2-FLOW-1 access revoked, then restored: Home in a browser', async ({ page }) => {
  await sql(`update user_access set features = features || '{"capture": true, "shell": true}' where user_id = ${ME}`);
  await sql(`delete from device_heartbeats where user_id = ${ME}`);
  await beat(3, true, true);
  await beat(1, false, false);
  await signIn(page);
  await step(
    page,
    'R2-FLOW-1',
    1,
    'access-off',
    'The phone’s last sync said access is off; open Home',
    'Home: "Capture is off", "Your phone says Sen can’t read your payment notifications.", with Fix',
    async () => {
      await page.goto(`${SERVER}/`);
      await expect(alertBar(page)).toContainText('Capture is off');
      await expect(alertBar(page)).toContainText(
        'Your phone says Sen can’t read your payment notifications.'.replace('’', "'"),
      );
      await expect(alertBar(page).getByRole('button', { name: 'Fix' })).toBeVisible();
    },
  );
  await step(
    page,
    'R2-FLOW-1',
    2,
    'access-back',
    'A newer heartbeat with access and the listener; reload Home',
    'no capture warning',
    async () => {
      await beat(0, true, true);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Home' })).toBeAttached();
      await page.waitForTimeout(1500);
      await expect(page.getByText(/Capture (is|may be) off/)).toHaveCount(0);
    },
  );
});

test('R2-FLOW-2 the listener off a day, access on: Home’s words', async ({ page }) => {
  await sql(`delete from device_heartbeats where user_id = ${ME}`);
  await beat(25, true, true);
  await beat(1, false, true);
  await signIn(page);
  await step(
    page,
    'R2-FLOW-2',
    1,
    'listener-off',
    'The listener’s last connected heartbeat was 25 h ago; open Home',
    'Home: "Capture may be off", "Sen’s listener on your phone has been off since …"',
    async () => {
      await page.goto(`${SERVER}/`);
      await expect(alertBar(page)).toContainText('Capture may be off');
      await expect(alertBar(page)).toContainText("Sen's listener on your phone has been off since");
    },
  );
});

test('R2-FLOW-6 one fact, one wording: the push stand-in and Home’s banner (preview fake)', async ({ page }) => {
  await page.goto('/?scenario=capture-off&look=minted&mode=light');
  await step(
    page,
    'R2-FLOW-6',
    1,
    'banner',
    'Open Home in the capture-off scenario',
    'the banner names payment notifications and a time; the date isn’t broken across lines',
    async () => {
      const bar = alertBar(page);
      await expect(bar).toContainText(/No payment notifications since (.+)\./);
      const text = await bar.innerText();
      const date = /since (.+?)\./.exec(text.replace(/\n/g, ' '))![1]!;
      // the line boxes of the date's text: one top means it sits on one line
      const tops = await page.evaluate((d) => {
        const walker = document.createTreeWalker(document.querySelector('main [role=alert]')!, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const i = n.textContent!.indexOf(d);
          if (i < 0) continue;
          const r = document.createRange();
          r.setStart(n, i);
          r.setEnd(n, i + d.length);
          return [...new Set([...r.getClientRects()].map((x) => Math.round(x.top)))];
        }
        return [];
      }, date);
      console.log('banner:', JSON.stringify(text), 'date', date, 'line tops', JSON.stringify(tops));
      expect(tops.length).toBe(1);
    },
  );
});

test('R2-FLOW-6b the push stand-in and the widget beside the banner (preview fake)', async ({ page }) => {
  await page.goto('/?scenario=capture-off&look=minted&mode=light');
  await expect(alertBar(page)).toContainText('Capture may be off');
  await step(
    page,
    'R2-FLOW-6',
    2,
    'push-stand-in',
    'Dev panel → Surfaces: the capture push',
    'the push says what the server’s push says for this state',
    async () => {
      await page.getByRole('button', { name: 'Dev panel' }).click();
      await page.getByRole('button', { name: 'Surfaces' }).click();
      const push = page.getByTestId('surface-push-health');
      await push.scrollIntoViewIfNeeded();
      await expect(push).toContainText('Capture may be off');
      await expect(push).toContainText(
        'No payment notifications for 2 days. Open Sen to check it can still read them.',
      );
    },
  );
  await step(
    page,
    'R2-FLOW-6',
    3,
    'widget',
    'Dev panel → Widgets in the same state',
    'the widget’s words, beside the banner’s',
    async () => {
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', { name: 'Dev panel' })
        .click()
        .catch(() => undefined);
      await page.getByRole('button', { name: 'Widgets' }).click();
      await page.waitForTimeout(600);
      const words = await page.getByText(/Capture (is|may be) off/).allInnerTexts();
      console.log('widget words:', JSON.stringify(words));
      expect(words.length).toBeGreaterThan(0);
    },
  );
});

test('R2-FLOW-7 Captured on this phone says what it shows (preview fake)', async ({ page }) => {
  await page.goto('/s/settings/capture/captured?look=minted&mode=light');
  await step(
    page,
    'R2-FLOW-7',
    1,
    'captured-intro',
    'Open Captured on this phone',
    'the intro says amounts show and other numbers are hidden, and the rows bear it out',
    async () => {
      await expect(
        page.getByText(/newest first, kept for you only\. Every number but the amounts is hidden\./),
      ).toBeVisible();
      const rows = (await page.getByRole('main').getByRole('listitem').allInnerTexts()).join('\n');
      // a digit outside an amount in a row's title or text would contradict it (the time label is the app's own)
      const bodies = rows
        .split('\n')
        .filter((l) => !/^(Today|Yesterday|\w{3}, \d)/.test(l) && !/\d{1,2}:\d{2}$/.test(l));
      const stray = bodies.map((l) => l.replace(/RM\s?[\d,]+(\.\d{2})?/g, '')).filter((l) => /\d/.test(l));
      console.log('lines with digits outside amounts:', JSON.stringify(stray));
      expect(stray).toEqual([]);
    },
  );
});
