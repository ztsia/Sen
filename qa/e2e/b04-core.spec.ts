import { expect, test } from '@playwright/test';
import { db, dialog, open, shot, text, toast, watch } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const body = async (p: import('@playwright/test').Page, n = 24) => (await text(p)).split('\n').filter(Boolean).slice(0, n).join(' | ');

async function play(page: import('@playwright/test').Page, id: string, tag: string, asserts: Record<number, (n: number) => Promise<void>> = {}) {
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Choose a journey' }).click();
  await page.waitForTimeout(500);
  await page.getByTestId(`journey-${id}`).click();
  await page.waitForTimeout(1500);
  const bar = page.getByTestId('journey-bar');
  for (let i = 0; ; i++) {
    await expect(bar).toBeVisible();
    const cap = await page.getByTestId('journey-caption').innerText();
    const stepLabel = (await bar.innerText()).split('\n')[0];
    console.log(`${tag} ${stepLabel} | ${cap.slice(0, 90)} | url ${new URL(page.url()).pathname}`);
    await page.waitForTimeout(500);
    if (asserts[i]) await asserts[i](i);
    await shot(page, `${tag}-step-${i + 1}`);
    const btn = bar.getByRole('button', { name: /^(Next|Finish)$/ });
    const last = (await btn.innerText()) === 'Finish';
    await btn.click();
    await page.waitForTimeout(900);
    if (last) break;
  }
}

test('FLOW-C1 first-run guided (core)', async ({ page }) => {
  const w = watch(page);
  await open(page, '/');
  await play(page, 'first-run', 'FLOW-C1-guided', {
    2: async () => {
      await expect(page.getByTestId('hero')).toContainText('Spent since you started');
    },
  });
  console.log(w.errors.join('\n'));
});

test('FLOW-C2 pay-new guided (core) + real prompt answer', async ({ page }) => {
  const w = watch(page);
  await open(page, '/');
  await play(page, 'pay-new', 'FLOW-C2-guided', {
    0: async () => {
      await expect(page.getByText(/ROTI BAKAR 88/).first()).toBeVisible();
      await expect(page.getByText('RM9.50').first()).toBeVisible();
    },
  });
  // real prompt: simulator arrives; answer Meals; db rule and review
  await open(page, '/review');
  const before = await db<{ rules: number; review: number }>(page, `(d) => ({ rules: d.rules.length, review: d.review.filter(r=>r.kind==='new-merchant'&&/ROTI/.test(r.merchant||'')).length })`);
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'A notification arrives' }).click();
  await page.waitForTimeout(1200);
  await shot(page, 'FLOW-C2-step-4-arrives');
  console.log('PROMPT:', await body(page, 12));
  await page.getByRole('button', { name: 'Meals', exact: true }).first().click();
  await page.waitForTimeout(900);
  const after = await db<{ rules: number; review: number }>(page, `(d) => ({ rules: d.rules.length, review: d.review.filter(r=>r.kind==='new-merchant'&&/ROTI/.test(r.merchant||'')).length })`);
  console.log('RULES/REVIEW before', JSON.stringify(before), 'after', JSON.stringify(after), 'toast', JSON.stringify(await toast(page).innerText().catch(() => 'none')));
  await shot(page, 'FLOW-C2-step-5-answered');
  // answer it again (second prompt at same merchant should not ask)
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'A notification arrives' }).click();
  await page.waitForTimeout(1200);
  console.log('SECOND ARRIVAL asks again?', /Pick a category/.test(await text(page)), (await body(page, 6)));
  await shot(page, 'FLOW-C2-step-6-second-arrival');
  console.log(w.errors.join('\n'));
});

test('FLOW-C3 scan-after real flow (core)', async ({ page }) => {
  const w = watch(page);
  await open(page, '/scan');
  await page.getByTestId('scan-camera').setInputFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
  await page.getByRole('button', { name: 'Use this' }).click();
  await expect(page).toHaveURL(/\/s\/confirm/, { timeout: 10000 });
  await expect(page.getByText('SATE KAJANG HJ SAMURI')).toBeVisible();
  await shot(page, 'FLOW-C3-step-1-confirm');
  console.log('CONFIRM:', await body(page, 40));
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(1200);
  console.log('after Done:', JSON.stringify(await toast(page).innerText().catch(() => 'none')), page.url());
  await shot(page, 'FLOW-C3-step-2-done');
  // same file twice
  await open(page, '/scan');
  await page.getByTestId('scan-camera').setInputFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
  await page.getByRole('button', { name: 'Use this' }).click();
  await page.waitForTimeout(2500);
  console.log('second scan same file:', page.url(), await body(page, 14));
  await shot(page, 'FLOW-C3-step-3-second-scan');
  console.log(w.errors.join('\n'));
});
