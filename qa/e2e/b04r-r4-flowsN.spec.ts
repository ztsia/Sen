import { expect, test, type Locator, type Page } from '@playwright/test';
import { uid } from '../../apps/web/src/data/fake/ids';
import { acctId } from '../../apps/web/src/data/fake/scenario';
import { LOOKS, open, settled } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 scoped re-check, flows N: every button that opens Sen (D135), and app bar titles. Preview build (5292).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

const message = (p: Page) => p.getByRole('textbox', { name: 'Message to Sen' });

async function probe(page: Page, label: string, target: Locator, rows: string[], expectStart?: RegExp) {
  await expect(target, label).toBeVisible();
  const av = await target.locator('canvas.av').count();
  const box = (await target.boundingBox())!;
  const name = (await target.getAttribute('aria-label')) ?? (await target.innerText()).trim().replace(/\n+/g, ' ');
  await target.click();
  await expect(message(page), label).toBeVisible();
  await page.waitForTimeout(250);
  const v = await message(page).inputValue();
  rows.push(
    `${label} [name "${name}"]: canvas.av=${av} size ${Math.round(box.width)}x${Math.round(box.height)} composer ${JSON.stringify(v)}`,
  );
  if (expectStart) expect(v, label).toMatch(expectStart);
  expect(av, `${label}: avatar`).toBeGreaterThanOrEqual(1);
  await page.keyboard.press('Escape');
  await expect(message(page)).toHaveCount(0);
  await page.waitForTimeout(250);
}

test('R4S-FLOW-4 Claims: Add, every Edit, every Teach Sen and the menu items show the avatar and start their message', async ({
  page,
}) => {
  const F = 'R4S-FLOW-4';
  const rows: string[] = [];
  await open(page, '/s/settings/claims', 'copper', 'dark');
  await settled(page);
  await probe(
    page,
    'Add',
    page.getByRole('button', { name: 'Add a scheme' }),
    rows,
    /^I want to add a claim scheme: $/,
  );
  const edits = page.getByRole('button', { name: /^Edit / });
  const ne = await edits.count();
  for (let i = 0; i < ne; i++) await probe(page, `Edit #${i + 1}`, edits.nth(i), rows, /^Change my .+ scheme: $/);
  const teach = page.getByRole('button', { name: 'Teach Sen' });
  const nt = await teach.count();
  for (let i = 0; i < nt; i++)
    await probe(page, `Teach Sen #${i + 1}`, teach.nth(i), rows, /^Learn how I submit my .+ claim on ESS: $/);
  // the dropdown
  await page.getByRole('button', { name: 'More about ESS' }).click();
  const items = page.getByRole('menuitem', { name: /^Teach again/ });
  const ni = await items.count();
  for (let i = 0; i < ni; i++) {
    const it = items.nth(i);
    const av = await it.locator('canvas.av').count();
    const label = (await it.innerText()).trim();
    await it.click();
    await expect(message(page)).toBeVisible();
    await page.waitForTimeout(250);
    const v = await message(page).inputValue();
    rows.push(`menu "${label}": canvas.av=${av} composer ${JSON.stringify(v)}`);
    expect(av).toBeGreaterThanOrEqual(1);
    expect(v).toMatch(/^Learn how I submit my .+ claim on ESS: $/);
    await page.keyboard.press('Escape');
    await expect(message(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'More about ESS' }).click();
  }
  await page.keyboard.press('Escape');
  note(F, `edits ${ne}, teach buttons ${nt}, menu items ${ni}\n${rows.join('\n')}`);
  await step(
    page,
    F,
    1,
    'claims',
    'tap Add, each Edit, each Teach Sen and each Teach again',
    'each has the avatar, opens Sen with its started message, sends nothing',
    async () => {
      expect(ne).toBeGreaterThan(0);
      expect(nt + ni).toBeGreaterThan(0);
    },
  );
});

test('R4S-FLOW-4b every other button that opens Sen shows the avatar', async ({ page }) => {
  const F = 'R4S-FLOW-4b';
  const rows: string[] = [];
  // the floating button on the tab screens, and Home's note
  for (const path of ['/', '/review', '/insights', '/more']) {
    await open(page, path, 'minted', 'light');
    await settled(page);
    await probe(page, `floating ${path}`, page.getByRole('button', { name: 'Ask Sen', exact: true }), rows, /^$/);
  }
  await open(page, '/');
  await settled(page);
  if (await page.getByTestId('sen-note').count())
    await probe(page, 'Home note', page.getByTestId('sen-note'), rows, /^$/);
  // Insights: every step's card
  await open(page, '/insights');
  await settled(page);
  for (const nm of await page.getByRole('tab').allInnerTexts()) {
    await page.getByRole('tab', { name: nm.trim() }).click();
    await page.waitForTimeout(600);
    await probe(
      page,
      `Insights ${nm.trim()}`,
      page.getByRole('button', { name: 'Ask Sen about this' }).filter({ visible: true }).first(),
      rows,
      /\?$/,
    );
  }
  await open(page, '/s/insights/year');
  await settled(page);
  await probe(page, 'Year', page.getByRole('button', { name: 'Ask Sen about this' }).first(), rows, /\?$/);
  await open(page, `/s/txn?id=${uid('txn:roti-bakar')}`);
  await settled(page);
  await probe(page, 'payment', page.getByRole('button', { name: 'Ask Sen' }).first(), rows);
  await open(page, `/s/account?id=${acctId('ryt')}`);
  await settled(page);
  await probe(page, 'account', page.getByRole('button', { name: 'Ask Sen' }).first(), rows);
  // empty states
  for (const [path, label, want] of [
    ['/s/agent/memory', 'Memory empty', /^Remember this: $/],
    ['/s/agent/research', 'Research empty', /^Look into this for me: $/],
    ['/s/goals', 'Goals empty', /^I want to save for $/],
    ['/s/subscriptions', 'Subscriptions empty', /^I want to add a subscription: $/],
  ] as [string, string, RegExp][]) {
    await open(page, `${path}?state=empty`);
    await settled(page);
    const b = page.getByRole('button', { name: 'Ask Sen', exact: true });
    if (await b.count()) await probe(page, label, b.first(), rows, want);
    else
      rows.push(
        `${label}: no Ask Sen button on this state (${(await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 120)})`,
      );
  }
  note(F, rows.join('\n'));
  await step(
    page,
    F,
    1,
    'others',
    'tap every other button that opens Sen',
    'each shows the avatar; set-up ones start their message; the plain ones open empty',
    async () => {
      expect(rows.length).toBeGreaterThan(10);
    },
  );
});

test('R4S-FLOW-5 app bar titles at 390 and at 360 with 1.5x text: the action reads Add, is named in full, and is 48 px', async ({
  page,
}) => {
  const F = 'R4S-FLOW-5';
  const paths = [
    '/s/subscriptions',
    '/s/goals',
    '/s/settings/claims',
    '/s/budgets',
    '/s/settings/members',
    '/s/claims',
    '/s/accounts',
    '/s/payments',
  ];
  const cut390: string[] = [];
  const cut360: string[] = [];
  const names: string[] = [];
  const small: string[] = [];
  for (const look of LOOKS) {
    for (const p of paths) {
      await open(page, p, look, 'light');
      const r = await page.evaluate(() => {
        const h = document.querySelector('header h1') as HTMLElement | null;
        const act = document.querySelector('header button:not([aria-label="Back"])') as HTMLElement | null;
        const rect = act?.getBoundingClientRect();
        const a = act ? getComputedStyle(act, '::after') : null;
        const ext = a && a.content !== 'none' && a.position === 'absolute';
        return {
          cut: !!h && h.scrollWidth > h.clientWidth + 1,
          t: h?.textContent,
          act: act
            ? {
                label: act.getAttribute('aria-label'),
                text: act.textContent?.trim(),
                h: Math.max(rect!.height, ext ? parseFloat(a!.height) : 0),
                w: Math.max(rect!.width, ext ? parseFloat(a!.width) : 0),
              }
            : null,
        };
      });
      if (r.cut) cut390.push(`${look} ${p} "${r.t}"`);
      if (r.act && /^(Add|Invite)/.test(r.act.text ?? '')) {
        if ((r.act.label ?? '').length <= (r.act.text ?? '').length && r.act.text === 'Add')
          names.push(`${p}: visible "${r.act.text}" but no longer accessible name`);
        if (r.act.h < 47.5 || r.act.w < 47.5) small.push(`${look} ${p} ${r.act.w}x${r.act.h}`);
      }
    }
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await page.addInitScript(() => localStorage.setItem('sen.dev.textScale', '1.5'));
  for (const look of ['minted', 'firefly', 'copper'] as const) {
    for (const p of paths) {
      await open(page, p, look, 'light');
      const r = await page.evaluate(() => {
        const h = document.querySelector('header h1') as HTMLElement | null;
        return { cut: !!h && h.scrollWidth > h.clientWidth + 1, t: h?.textContent };
      });
      if (r.cut) cut360.push(`${look} ${p} "${r.t}"`);
    }
  }
  await open(page, '/s/subscriptions');
  note(
    F,
    `390 cut: ${JSON.stringify(cut390)}; name problems: ${JSON.stringify(names)}; targets under 48: ${JSON.stringify(small)}; 360 at 1.5x cut: ${JSON.stringify(cut360)}`,
  );
  await step(
    page,
    F,
    1,
    'titles',
    'read each app bar at 390 in six looks, then at 360 with 1.5x text in three',
    'no title cut at 390; every Add action named in full and 48 px (360 at 1.5x recorded)',
    async () => {
      expect(cut390).toEqual([]);
      expect(names).toEqual([]);
      expect(small).toEqual([]);
    },
  );
});
