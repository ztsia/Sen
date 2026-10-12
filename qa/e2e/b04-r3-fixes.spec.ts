import { test } from '@playwright/test';
import { open, shot, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
const L = async (p: import('@playwright/test').Page, n = 30) =>
  (await text(p))
    .split('\n')
    .filter((l) => l && !/EVERY SEN|^Home$|^Review$|^Scan$|^Insights$|^More$|to review|^RM \d|^\d+$/.test(l))
    .slice(0, n)
    .join(' | ');

test('F21 payday: claims out of income, Home and plan', async ({ page }) => {
  await open(page, '/?scenario=payday');
  console.log('HOME payday card:', (await L(page, 14)).slice(0, 360));
  await shot(page, 'R3-F21-step-1-home-payday');
  await page.goto('/s/payday?scenario=payday&look=minted&mode=light');
  await page.waitForTimeout(700);
  // step 1 -> next through to the plan
  for (let i = 0; i < 6; i++) {
    const t = await L(page, 40);
    if (/Use this plan/.test(t)) {
      console.log('PLAN:', t.slice(0, 420));
      await shot(page, 'R3-F21-step-2-plan');
      break;
    }
    if (/Check your balances/.test(t)) {
      await page
        .getByRole('button', { name: /matches$/ })
        .first()
        .click();
      await page.getByRole('button', { name: 'Save' }).click();
    } else
      await page
        .getByRole('button', { name: /^Next$/ })
        .first()
        .click();
    await page.waitForTimeout(600);
  }
  await page.getByRole('button', { name: 'Use this plan' }).click();
  await page.waitForTimeout(900);
  console.log('HOME after Use this plan:', (await L(page, 14)).slice(0, 360));
  await shot(page, 'R3-F21-step-3-home-after-plan');
});
test('F21 payday: answer No, and Undo', async ({ page }) => {
  await open(page, '/s/payday?scenario=payday');
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(500);
  await page
    .getByRole('radio', { name: 'No' })
    .click()
    .catch(() => page.getByRole('button', { name: 'No' }).click());
  await page.getByRole('button', { name: /^Next$/ }).click();
  await page.waitForTimeout(700);
  await page.goto('/?scenario=payday&look=minted&mode=light');
});
test('F21 claims screens in payday scenario', async ({ page }) => {
  await open(page, '/s/claims?scenario=payday');
  console.log('CLAIMS payday:', (await L(page, 30)).slice(0, 600));
  console.log('Send to ESS buttons:', await page.getByRole('button', { name: /Send to ESS/ }).count());
  await shot(page, 'R3-F21-step-4-claims-payday');
  await open(page, '/s/claims');
  console.log('CLAIMS normal:', (await L(page, 30)).slice(0, 700));
  console.log(
    'Send to ESS buttons:',
    await page.getByRole('button', { name: /Send to ESS/ }).count(),
    '| stand-in note:',
    await page.getByText(/A stand-in here/).count(),
  );
  await shot(page, 'R3-F15-step-1-claims-standin');
});
