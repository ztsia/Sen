import { expect, test, type Browser } from '@playwright/test';
import { open, shot, settled, tabs } from './b03-helpers';

// FLOW-29: AC-61, AC-61s. Same scenario, same injected late-night payments, four browser timezones: the text must be identical.

const TZS = ['Asia/Kuala_Lumpur', 'America/Los_Angeles', 'Pacific/Kiritimati', 'UTC', 'Pacific/Pago_Pago'];

async function snapshot(browser: Browser, tz: string) {
  const ctx = await browser.newContext({
    timezoneId: tz,
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await open(page, '/');
  // three payments around KL midnight, written through the app's own write interface
  await page.evaluate(async () => {
    const mod = await import(/* @vite-ignore */ '/src/data/index.ts');
    const b = await mod.backend();
    const cats = await b.categories('spend');
    const meals = cats.find((c: any) => c.label === 'Meals').id;
    for (const [at, amount] of [
      ['2026-09-29T23:59:00+08:00', 1111],
      ['2026-09-30T23:30:00+08:00', 2222],
      ['2026-10-01T00:00:00+08:00', 3333],
    ] as const)
      await b.run({
        type: 'txn.create',
        txn: {
          id: crypto.randomUUID(),
          occurredAt: at,
          amount,
          categoryId: meals,
          accountId: null,
          merchantRaw: `LATE ${amount}`,
          note: null,
        },
      });
  });
  await page.waitForTimeout(500);
  const out: Record<string, string> = {};
  const norm = (s: string) => s.replace(/\s+/g, ' ');
  await page.goto('/?look=minted&mode=light');
  await settled(page);
  await page.waitForTimeout(300);
  // goto reloaded the page: the fake restarted, so inject again, then read in-app, never reloading
  await page.evaluate(async () => {
    const mod = await import(/* @vite-ignore */ '/src/data/index.ts');
    const b = await mod.backend();
    const cats = await b.categories('spend');
    const meals = cats.find((c: any) => c.label === 'Meals').id;
    for (const [at, amount] of [
      ['2026-09-29T23:59:00+08:00', 1111],
      ['2026-09-30T23:30:00+08:00', 2222],
      ['2026-10-01T00:00:00+08:00', 3333],
    ] as const)
      await b.run({
        type: 'txn.create',
        txn: {
          id: crypto.randomUUID(),
          occurredAt: at,
          amount,
          categoryId: meals,
          accountId: null,
          merchantRaw: `LATE ${amount}`,
          note: null,
        },
      });
  });
  await page.waitForTimeout(400);
  await tabs(page).getByRole('link', { name: /^Home/ }).click();
  await settled(page);
  out.home = norm(await page.locator('main').innerText());
  await page.getByTestId('hero').click();
  out.cycle = norm(await page.getByRole('dialog').innerText());
  await page.keyboard.press('Escape');
  await page.getByTestId('pace').click();
  await settled(page);
  await page.waitForTimeout(400);
  const heads = await page.locator('h3').allInnerTexts();
  out.paymentsHeads = norm(heads.join(' || '));
  // the last day of the cycle's list: scroll to the bottom
  await page.locator('main').evaluate((m) => m.scrollTo(0, m.scrollHeight));
  await page.waitForTimeout(500);
  out.paymentsBottom = norm((await page.locator('h3').allInnerTexts()).join(' || '));
  await page.getByRole('searchbox', { name: 'Search payments' }).fill('LATE');
  await page.waitForTimeout(600);
  out.late = norm(await page.locator('main').innerText());
  await tabs(page)
    .getByRole('link', { name: /^Insights/ })
    .click();
  await settled(page);
  await page.waitForTimeout(500);
  out.insights = norm(await page.locator('main').innerText());
  await page
    .getByRole('button', { name: /The year/ })
    .click()
    .catch(() => {});
  await page.waitForTimeout(500);
  out.year = norm(await page.locator('main').innerText());
  if (tz === 'Pacific/Kiritimati') await shot(page, 'FLOW-29-step-1-kiritimati');
  if (tz === 'America/Los_Angeles') await shot(page, 'FLOW-29-step-1-los-angeles');
  await ctx.close();
  return out;
}

test('FLOW-29 timezone: KL, Los Angeles, Kiritimati, UTC, Pago Pago give identical screens', async ({ browser }) => {
  test.setTimeout(300_000);
  const snaps: Record<string, Record<string, string>> = {};
  for (const tz of TZS) snaps[tz] = await snapshot(browser, tz);
  const base = snaps['Asia/Kuala_Lumpur']!;
  console.log('KL late-night search:', base.late);
  console.log('KL payments heads:', base.paymentsHeads.slice(0, 300));
  const diffs: string[] = [];
  for (const tz of TZS.slice(1))
    for (const k of Object.keys(base)) if (snaps[tz]![k] !== base[k]) diffs.push(`${tz} / ${k}`);
  console.log('DIFFS:', JSON.stringify(diffs));
  for (const tz of TZS.slice(1))
    for (const k of Object.keys(base)) {
      if (snaps[tz]![k] !== base[k]) {
        const a = base[k]!,
          b = snaps[tz]![k]!;
        let i = 0;
        while (i < a.length && a[i] === b[i]) i++;
        console.log(
          `first diff ${tz}/${k} at ${i}:\n  KL : ...${a.slice(Math.max(0, i - 60), i + 80)}\n  ${tz}: ...${b.slice(Math.max(0, i - 60), i + 80)}`,
        );
      }
    }
  expect(diffs).toEqual([]);
});
