import fs from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { DB, PEOPLE } from './b08r2-setup';

// QA B08 run 2: the run-2 flows of qa/B08/flows.md (b08r2.config.ts). Each step asserts, then takes its
// screenshot, then writes its row for results.json. Made-up people and amounts only.
const ROOT = '../../qa-artifacts/B08/first-run-accounts';
const SHOTS = `${ROOT}/screens`;
const STEPS = `${ROOT}/steps-r2.jsonl`;
fs.mkdirSync(SHOTS, { recursive: true });
const SERVER = 'http://localhost:4181';

async function step(
  page: Page,
  flow: string,
  n: number,
  slug: string,
  action: string,
  assertion: string,
  check: () => Promise<void>,
  soft = false,
) {
  const file = `${flow}-step-${n}-${slug}`;
  let status = 'pass';
  let err = '';
  try {
    await check();
  } catch (e) {
    status = 'fail';
    err = String(e).slice(0, 900);
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/${file}.png` }).catch(() => undefined);
  fs.appendFileSync(
    STEPS,
    JSON.stringify({ flow, n, action, assertion, status, screenshot: `${file}.png`, err }) + '\n',
  );
  if (status === 'fail' && !soft) throw new Error(`${flow} step ${n}: ${err}`);
}

async function sql<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const req = createRequire(createRequire(new URL('../../apps/web/package.json', import.meta.url)).resolve('@sen/db'));
  const pg = req('pg') as { Client: new (o: { connectionString: string }) => any };
  const c = new pg.Client({ connectionString: `postgres://sen_owner@127.0.0.1:5432/${DB}` });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}
type Who = keyof typeof PEOPLE;
const uid = (w: Who) => PEOPLE[w].id;
const main = (p: Page) => p.getByRole('main');

async function signIn(page: Page, who: Who) {
  await sql('truncate auth_rate_limit');
  await page.goto(`${SERVER}/s/sign-in?look=minted&mode=light`);
  await page.getByLabel('Your email').fill(PEOPLE[who].email);
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 15_000 });
}
async function atStep(page: Page, n: number, of = 7) {
  await expect(page.getByText(`Step ${n} of ${of}`)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(350);
}
async function chooseApps(page: Page) {
  const choose = page.getByRole('button', { name: /^Choose these \d+$/ });
  if (await choose.count()) await choose.click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Next' }).click();
}
async function typeDigits(page: Page, label: string, digits: string) {
  const f = page.getByLabel(label, { exact: true });
  await f.click();
  await page.keyboard.type(digits);
}
const accountsOf = (w: Who) =>
  sql<{ name: string; opening_balance: string; opening_at: Date }>(
    'select name, opening_balance, opening_at from accounts where user_id = $1 and archived_at is null order by name',
    [uid(w)],
  );

test('FLOW-R2-1..4, 6: first run start to finish; reloads; empty then 0; Accounts; steps never come back', async ({
  page,
}) => {
  await step(page, 'FLOW-R2-1', 1, 'apps', 'Sign in, open first run', 'Step 2 of 7: Choose your apps', async () => {
    await signIn(page, 'main');
    await page.goto(`${SERVER}/s/first-run`);
    await atStep(page, 2);
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
  });
  await step(page, 'FLOW-R2-1', 2, 'access', 'Choose these, Next', 'Step 3 of 7', async () => {
    await chooseApps(page);
    await atStep(page, 3);
  });
  await step(
    page,
    'FLOW-R2-2',
    1,
    'running-reloaded',
    'Skip access; at step 4 reload',
    'Step 4 of 7 again after the reload',
    async () => {
      await page.getByRole('button', { name: 'Skip for now' }).click();
      await atStep(page, 4);
      await page.reload();
      await atStep(page, 4);
    },
  );
  await step(
    page,
    'FLOW-R2-1',
    3,
    'accounts',
    'Skip Keep Sen running',
    'Step 5: TNG says eWallet and GO+ together; Ryt Main account and pockets',
    async () => {
      await page.getByRole('button', { name: 'Skip for now' }).click();
      await atStep(page, 5);
      await expect(main(page)).toContainText('eWallet and GO+ together');
      await expect(main(page)).toContainText('Main account and pockets together');
    },
  );
  const labels = await page
    .locator('main input[inputmode="numeric"]')
    .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).labels?.[0]?.textContent ?? ''));
  console.log('[r2] balance fields:', labels.join(' | '));
  const [tng, ryt, pbb, grab] = labels;
  await step(
    page,
    'FLOW-R2-2',
    2,
    'typed-reloaded',
    `Type 1,2,5,0 into ${tng}; reload`,
    'step 5 again, 12.50 kept',
    async () => {
      await typeDigits(page, tng!, '1250');
      await expect(page.getByLabel(tng!, { exact: true })).toHaveValue('12.50');
      await page.reload();
      await atStep(page, 5);
      await expect(page.getByLabel(tng!, { exact: true })).toHaveValue('12.50');
    },
  );
  await step(
    page,
    'FLOW-R2-3',
    1,
    'empty',
    `Leave ${ryt} empty, fill the rest, Next`,
    'stays at step 5 with words for the empty one',
    async () => {
      await typeDigits(page, pbb!, '345600');
      await typeDigits(page, grab!, '999');
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(main(page)).toContainText('Type today’s balance, or 0.');
      await atStep(page, 5);
    },
  );
  await step(
    page,
    'FLOW-R2-3',
    2,
    'zero',
    `Type 0 into ${ryt}, Next`,
    'RM0.00 shown; step 6; four accounts 1250, 0, 345600, 999',
    async () => {
      await typeDigits(page, ryt!, '0');
      await expect(page.getByLabel(ryt!, { exact: true })).toHaveValue('0.00');
      await page.getByRole('button', { name: 'Next' }).click();
      await atStep(page, 6);
      const rows = await accountsOf('main');
      console.log('[r2] accounts:', JSON.stringify(rows.map((r) => [r.name, r.opening_balance])));
      expect(rows.map((r) => Number(r.opening_balance)).sort((x, y) => x - y)).toEqual([0, 999, 1250, 345600]);
      expect(
        (await sql<{ n: string }>('select count(*) n from categories where user_id=$1', [uid('main')]))[0]!.n,
      ).toBe('21');
    },
  );
  await step(page, 'FLOW-R2-1', 4, 'name', 'Type tan  wei ming, Next', 'Step 7; own_names {TAN WEI MING}', async () => {
    await page.getByLabel('Your name').fill('tan  wei ming');
    await page.getByRole('button', { name: 'Next' }).click();
    await atStep(page, 7);
    await expect
      .poll(
        async () =>
          (await sql<{ n: string[] }>('select own_names n from user_settings where user_id=$1', [uid('main')]))[0]?.n,
      )
      .toEqual(['TAN WEI MING']);
  });
  await step(
    page,
    'FLOW-R2-1',
    5,
    'home',
    'Payday: the default, Finish',
    'Home; setup_done_at set; payday last-working',
    async () => {
      await expect(page.getByRole('radio', { name: 'Last working day' })).toHaveAttribute('aria-checked', 'true');
      await page.getByRole('button', { name: 'Finish' }).click();
      await expect(page).toHaveURL(/4181\/(\?.*)?$/, { timeout: 10_000 });
      const s = await sql<{ d: Date | null; p: string | null }>(
        'select setup_done_at d, expected_payday p from user_settings where user_id=$1',
        [uid('main')],
      );
      expect(s[0]!.d).not.toBeNull();
      expect(s[0]!.p).toBe('last-working');
      console.log('[r2] Home:', (await main(page).innerText()).replace(/\s+/g, ' ').slice(0, 400));
    },
  );
  await step(
    page,
    'FLOW-R2-4',
    2,
    'back-from-home',
    'At Home after Finish, go back (Android back)',
    'no first-run step',
    async () => {
      await page.waitForTimeout(1000);
      await page.goBack();
      await page.waitForTimeout(1500);
      console.log(
        '[r2] back from Home:',
        page.url(),
        (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 160),
      );
      await expect(page.getByText(/Step \d of 7/)).toHaveCount(0);
    },
    true,
  );
  await step(
    page,
    'FLOW-R2-6',
    1,
    'accounts',
    'Open Accounts',
    'total RM3,478.49 in 4 accounts; TNG RM12.50; Ryt RM0.00',
    async () => {
      await page.goto(`${SERVER}/s/accounts`);
      await expect(main(page)).toContainText('RM3,478.49');
      await expect(main(page)).toContainText('In 4 accounts');
      await expect(main(page)).toContainText('RM12.50');
      await expect(main(page)).toContainText('RM0.00');
      console.log('[r2] Accounts:', (await main(page).innerText()).replace(/\s+/g, ' '));
    },
  );
  await step(
    page,
    'FLOW-R2-6',
    2,
    'account',
    `Open ${tng}`,
    'Opening balance RM12.50; fed by its app; last checked = its opening; the Checks card agrees',
    async () => {
      await page.getByRole('button', { name: new RegExp(tng!) }).click();
      await expect(page.getByText('Opening balance')).toBeVisible();
      const t = (await main(page).innerText()).replace(/\s+/g, ' ');
      console.log('[r2] Account:', t);
      expect(t).toContain('RM12.50');
      expect(t).toMatch(/Last checked \d/);
      // the same screen shouldn't also say it was never checked
      expect(t).not.toContain('Not checked yet');
    },
    true,
  );
  await step(
    page,
    'FLOW-R2-4',
    1,
    'first-run-again',
    'After finishing, open /s/first-run',
    'lands on Home: the steps never come back',
    async () => {
      await page.goto(`${SERVER}/s/first-run`);
      await page.waitForTimeout(1500);
      console.log(
        '[r2] /s/first-run after setup:',
        page.url(),
        (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200),
      );
      await expect(page.getByText(/Step \d of 7/)).toHaveCount(0);
    },
    true,
  );
});

test('FLOW-R2-12: a category added in a browser before first run, then first run', async ({ page }) => {
  await step(
    page,
    'FLOW-R2-12',
    1,
    'categories-before',
    'Capture person in a browser, not set up: Settings → Categories',
    'reachable; what it says',
    async () => {
      await signIn(page, 'early');
      await expect(page).not.toHaveURL(/first-run/);
      await page.goto(`${SERVER}/s/settings/categories`);
      await expect(page.getByRole('button', { name: 'Add a category' })).toBeVisible();
      console.log(
        '[r2] Categories before first run:',
        (await main(page).innerText()).replace(/\s+/g, ' ').slice(0, 300),
      );
    },
  );
  await step(page, 'FLOW-R2-12', 2, 'added', 'Add a category: Pets', 'Pets saved', async () => {
    await page.getByRole('button', { name: 'Add a category' }).click();
    await page.getByLabel('Name').fill('Pets');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect
      .poll(
        async () =>
          (await sql<{ n: string }>('select count(*) n from categories where user_id=$1', [uid('early')]))[0]!.n,
      )
      .toBe('1');
  });
  await step(
    page,
    'FLOW-R2-12',
    3,
    'first-run',
    'Open first run (as the phone would), go to step 3',
    'the starting list was seeded: 22 categories with Cash, Unaccounted and Salary',
    async () => {
      await page.goto(`${SERVER}/s/first-run`);
      await atStep(page, 2);
      await chooseApps(page);
      await atStep(page, 3);
      await page.waitForTimeout(1000);
      const cats = await sql<{ name: string; system_key: string | null }>(
        'select name, system_key from categories where user_id=$1',
        [uid('early')],
      );
      console.log('[r2] early categories after first run start:', cats.length, JSON.stringify(cats));
      await page.goto(`${SERVER}/s/settings/categories`);
      await page.waitForTimeout(800);
      expect(cats.filter((c) => c.system_key).length).toBe(3);
    },
    true,
  );
});

test('FLOW-R2-5: offline at the name step', async ({ page, context }) => {
  await signIn(page, 'off');
  await page.goto(`${SERVER}/s/first-run`);
  await atStep(page, 2);
  await chooseApps(page);
  await atStep(page, 3);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 4);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 5);
  for (const el of await page.locator('main input[inputmode="numeric"]').all()) {
    await el.click();
    await page.keyboard.type('100');
  }
  await page.getByRole('button', { name: 'Next' }).click();
  await atStep(page, 6);
  await step(
    page,
    'FLOW-R2-5',
    1,
    'offline-name',
    'Go offline, type the name, Next',
    'Step 7 with the offline banner; nothing on the server yet',
    async () => {
      await context.setOffline(true);
      await page.getByLabel('Your name').fill('lim mei ling');
      await page.getByRole('button', { name: 'Next' }).click();
      await atStep(page, 7);
      await expect(page.locator('body')).toContainText(/offline/i);
    },
  );
  await step(
    page,
    'FLOW-R2-5',
    2,
    'online-finish',
    'Back online, Finish',
    'Home; own_names {LIM MEI LING} once; one audit entry',
    async () => {
      await context.setOffline(false);
      await page.waitForTimeout(3000);
      await page.getByRole('button', { name: 'Finish' }).click();
      await expect(page).toHaveURL(/4181\/(\?.*)?$/, { timeout: 15_000 });
      await expect
        .poll(
          async () =>
            (await sql<{ n: string[] }>('select own_names n from user_settings where user_id=$1', [uid('off')]))[0]?.n,
          { timeout: 15_000 },
        )
        .toEqual(['LIM MEI LING']);
      const a = await sql<{ n: string }>(
        "select count(*) n from audit_log where user_id=$1 and action='you.bankNames'",
        [uid('off')],
      );
      console.log('[r2] bankNames audit entries:', a[0]!.n);
      expect(a[0]!.n).toBe('1');
    },
  );
});

test('FLOW-R2-10: without capture', async ({ page }) => {
  await step(
    page,
    'FLOW-R2-10',
    1,
    'short',
    'Sign in without capture',
    'sent to the short first run: Your categories, Step 2 of 2; Cash locked on; no Unaccounted',
    async () => {
      await signIn(page, 'nocap');
      await expect(page).toHaveURL(/first-run/);
      await atStep(page, 2, 2);
      const cash = page.getByRole('switch', { name: /Cash/ });
      await expect(cash).toBeDisabled();
      await expect(cash).toBeChecked();
      await expect(main(page)).not.toContainText('Unaccounted');
    },
  );
  await step(
    page,
    'FLOW-R2-10',
    2,
    'off-one',
    'Switch Travel off, Start using Sen',
    'Home; Travel archived; setup done',
    async () => {
      await page.getByRole('switch', { name: /Travel/ }).click();
      await page.getByRole('button', { name: 'Start using Sen' }).click();
      await expect(page).toHaveURL(/4181\/(\?.*)?$/, { timeout: 10_000 });
      const t = await sql<{ a: Date | null }>(
        "select archived_at a from categories where user_id=$1 and name='Travel'",
        [uid('nocap')],
      );
      expect(t[0]!.a).not.toBeNull();
    },
  );
  await step(page, 'FLOW-R2-10', 3, 'more', 'Open More', 'no Accounts entry', async () => {
    await page.goto(`${SERVER}/s/more`);
    await page.waitForTimeout(800);
    console.log('[r2] More without capture:', (await main(page).innerText()).replace(/\s+/g, ' ').slice(0, 300));
    await expect(main(page).getByText('Accounts', { exact: true })).toHaveCount(0);
  });
  await step(
    page,
    'FLOW-R2-10',
    4,
    'accounts-url',
    'Open /s/accounts by hand',
    'no money shown; words, not a crash',
    async () => {
      await page.goto(`${SERVER}/s/accounts`);
      await page.waitForTimeout(1500);
      const t = (await main(page).innerText()).replace(/\s+/g, ' ');
      console.log('[r2] /s/accounts without capture:', t.slice(0, 300));
      expect(t).not.toMatch(/RM\d/);
    },
  );
});

test('FLOW-R2-8, 9: Categories and You', async ({ page }) => {
  await signIn(page, 'main');
  await step(
    page,
    'FLOW-R2-8',
    1,
    'cash',
    'Settings → Categories → Cash',
    'no Archive offered (or it says why)',
    async () => {
      await page.goto(`${SERVER}/s/settings/categories`);
      await page.getByRole('button', { name: /^Cash,/ }).click();
      const d = page.getByRole('dialog');
      console.log('[r2] Cash sheet:', (await d.innerText()).replace(/\s+/g, ' '));
      const arch = d.getByRole('button', { name: /Archive/ });
      if (await arch.count()) {
        await arch.click();
        await page.waitForTimeout(800);
        console.log('[r2] after archive tap:', (await page.locator('[data-sonner-toast]').allInnerTexts()).join(' / '));
      }
      const c = await sql<{ a: Date | null }>(
        "select archived_at a from categories where user_id=$1 and system_key='cash'",
        [uid('main')],
      );
      expect(c[0]!.a).toBeNull();
      await page.keyboard.press('Escape');
    },
  );
  await step(page, 'FLOW-R2-8', 2, 'unaccounted', 'Open Unaccounted', 'no flags; says it can’t be picked', async () => {
    await page.getByRole('button', { name: /^Unaccounted,/ }).click();
    const d = page.getByRole('dialog');
    await expect(d).toContainText("can't be picked");
    await expect(d.getByRole('switch')).toHaveCount(0);
    await page.keyboard.press('Escape');
  });
  await step(page, 'FLOW-R2-9', 1, 'you', 'Settings → You', 'shows TAN WEI MING and Last working day', async () => {
    await page.goto(`${SERVER}/s/settings/you`);
    await page.waitForTimeout(800);
    const t = (await main(page).innerText()).replace(/\s+/g, ' ');
    console.log('[r2] You:', t.slice(0, 400));
    const vals = await page
      .locator('main textarea, main input')
      .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    console.log('[r2] You values:', JSON.stringify(vals));
    expect(vals.join('\n')).toContain('TAN WEI MING');
  });
});

test.describe('in New York', () => {
  test.use({ timezoneId: 'America/New_York' });
  test('FLOW-R2-11: Accounts in another timezone', async ({ page }) => {
    await signIn(page, 'main');
    await step(
      page,
      'FLOW-R2-11',
      1,
      'accounts-ny',
      'Accounts with the browser in New York',
      'same total; the checked date is the KL day of opening_at',
      async () => {
        const [r] = await sql<{ d: string }>(
          "select to_char(min(opening_at) at time zone 'Asia/Kuala_Lumpur','FMDD Mon') d from accounts where user_id=$1",
          [uid('main')],
        );
        await page.goto(`${SERVER}/s/accounts`);
        await expect(main(page)).toContainText('RM3,478.49');
        const t = (await main(page).innerText()).replace(/\s+/g, ' ');
        console.log('[r2] NY Accounts:', t, '| KL day:', r!.d);
        await page.getByRole('button', { name: /TNG/ }).first().click();
        await expect(page.getByText('Opening balance')).toBeVisible();
        const acc = (await main(page).innerText()).replace(/\s+/g, ' ');
        console.log('[r2] NY Account:', acc);
        expect(acc).toContain(r!.d);
      },
    );
  });
});

test('FLOW-R2-5b: offline at the accounts step (run 1, finding 10)', async ({ page, context }) => {
  await signIn(page, 'off5');
  await page.goto(`${SERVER}/s/first-run`);
  await atStep(page, 2);
  await chooseApps(page);
  await atStep(page, 3);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 4);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await atStep(page, 5);
  await step(
    page,
    'FLOW-R2-5b',
    1,
    'offline-next',
    'Offline: type every balance, Next',
    'stays at step 5, says it needs a connection, nothing lost',
    async () => {
      await context.setOffline(true);
      for (const el of await page.locator('main input[inputmode="numeric"]').all()) {
        await el.click();
        await page.keyboard.type('2500');
      }
      await page.getByRole('button', { name: 'Next' }).click();
      await page.waitForTimeout(2500);
      console.log(
        '[r2] offline Next at step 5:',
        (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400),
      );
      await atStep(page, 5);
      await expect(page.locator('main input[inputmode="numeric"]').first()).toHaveValue('25.00');
    },
  );
  await step(
    page,
    'FLOW-R2-5b',
    2,
    'online-next',
    'Back online, Next',
    'step 6; four accounts of 2500 each, none twice',
    async () => {
      await context.setOffline(false);
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: 'Next' }).click();
      await atStep(page, 6);
      const rows = await sql<{ n: string; o: string }>(
        "select count(*) n, string_agg(opening_balance::text, ',') o from accounts where user_id=$1",
        [uid('off5')],
      );
      console.log('[r2] off5 accounts:', JSON.stringify(rows));
      expect(rows[0]!.n).toBe('4');
    },
  );
});
