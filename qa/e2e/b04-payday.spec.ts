import { test } from '@playwright/test';
import { db, open, shot, text, watch } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const panel = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.waitForTimeout(500);
};
const body = async (p: import('@playwright/test').Page) =>
  (await text(p)).split('\n').filter(Boolean).slice(0, 40).join(' | ');

test('FLOW-12 payday via the simulator', async ({ page }) => {
  const w = watch(page);
  await open(page, '/');
  await panel(page);
  await page.getByRole('button', { name: 'Payday', exact: true }).click();
  await page.waitForTimeout(1200);
  console.log('HOME after simulator:', (await body(page)).slice(0, 500));
  await shot(page, 'FLOW-12-step-1-home-payday-card');
  const links = await page.getByRole('link').allInnerTexts();
  console.log('links', JSON.stringify(links.slice(0, 8)));
  // go to payday
  await page.goto('/s/payday?look=minted&mode=light&scenario=payday');
  await page.waitForTimeout(800);
  for (let i = 0; i < 6; i++) {
    const t = await body(page);
    console.log(`STEP ${i}:`, t.slice(0, 420));
    await shot(page, `FLOW-12-step-${i + 2}`);
    if (/Use this plan/.test(t)) break;
    const next = page.getByRole('button', { name: /^Next$|^Save$/ }).first();
    if (/Check your balances/.test(t)) {
      await page
        .getByRole('button', { name: /matches$/ })
        .first()
        .click();
      await page.getByRole('button', { name: 'Save' }).click();
    } else await next.click();
    await page.waitForTimeout(700);
  }
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await page.waitForTimeout(900);
  console.log('after plan: url', page.url(), 'payday state', await db<string>(page, `(d) => JSON.stringify(d.payday)`));
  console.log('HOME:', (await body(page)).slice(0, 400));
  await shot(page, 'FLOW-12-step-9-home-after-plan');
  console.log(w.errors.join('\n'));
});

test('FLOW-12 payday skip each step -> Review', async ({ page }) => {
  await open(page, '/s/payday?scenario=payday');
  const before = await db<number>(page, `(d) => d.review.filter(r=>r.kind==='payday-step').length`);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.waitForTimeout(600);
    if (!/payday/i.test(page.url())) break;
  }
  const after = await db<{ n: number; steps: string[] }>(
    page,
    `(d) => ({ n: d.review.filter(r=>r.kind==='payday-step').length, steps: d.review.filter(r=>r.kind==='payday-step').map(r=>r.step)})`,
  );
  console.log('payday-step review items', before, '->', JSON.stringify(after), 'url', page.url());
  await open(page, '/review');
  console.log('REVIEW has skipped step:', /skipped on payday/.test(await text(page)));
  await shot(page, 'FLOW-12-step-10-review-skipped');
});

test('payday asked variant', async ({ page }) => {
  await open(page, '/s/payday?scenario=payday');
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(800);
  console.log('ASKED:', (await body(page)).slice(0, 500));
  await shot(page, 'FLOW-12-step-11-claims-asked');
});

test('no-claims/no-capture payday', async ({ page }) => {
  await open(page, '/s/payday?scenario=month');
  console.log('month payday:', (await body(page)).slice(0, 300));
});
