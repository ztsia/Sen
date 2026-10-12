import { test } from '@playwright/test';
import { dialog, open, shot, text, toast } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5181' });
const body = async (p: import('@playwright/test').Page, n = 10) =>
  (await text(p)).split('\n').filter(Boolean).slice(0, n).join(' | ');
test('real offline (context.setOffline) on sign-in, split-public, sen', async ({ page, context }) => {
  await open(page, '/s/sign-in');
  await context.setOffline(true);
  await page.waitForTimeout(800);
  console.log(
    'SIGN-IN offline:',
    await body(page, 6),
    '| send disabled:',
    await page.getByRole('button', { name: 'Send the code' }).isDisabled(),
  );
  await shot(page, 'FLOW-16-step-1-signin-offline');
  await context.setOffline(false);
  await open(page, '/s/split-public?id=demo-new');
  await context.setOffline(true);
  await page.waitForTimeout(500);
  await page.getByLabel("What's your name?").fill('Zed');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600);
  console.log(
    'PUBLIC offline write:',
    await body(page, 14),
    '| toast',
    JSON.stringify(
      await toast(page)
        .innerText()
        .catch(() => 'none'),
    ),
  );
  await shot(page, 'FLOW-16-step-2-public-offline');
  await context.setOffline(false);
  await open(page, '/');
  await context.setOffline(true);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  await page.waitForTimeout(600);
  console.log(
    'SEN offline composer disabled:',
    await dialog(page, 'Sen').getByRole('textbox').isDisabled(),
    (await dialog(page, 'Sen').innerText())
      .split('\n')
      .filter((l) => /connection/.test(l))
      .join(''),
  );
  await shot(page, 'FLOW-16-step-3-sen-offline');
  await context.setOffline(false);
});
test('simulator offline: manual payment marked Not synced yet, then back online', async ({ page }) => {
  await open(page, '/');
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Offline', exact: true }).click();
  await page.waitForTimeout(1000);
  console.log('HOME offline:', await body(page, 12));
  await shot(page, 'FLOW-16-step-4-home-offline');
  await open(page, '/s/manual?state=offline');
  console.log('MANUAL buttons:', (await page.getByRole('button').allInnerTexts()).join(' | ').slice(0, 300));
  await page.getByRole('textbox').first().fill('3.50');
  await shot(page, 'FLOW-16-step-5a-manual-form-offline');
  await page
    .getByRole('button', { name: /Save|Add/ })
    .last()
    .click({ timeout: 5000 })
    .catch((e) => console.log('save click failed', String(e).slice(0, 120)));
  await page.waitForTimeout(1200);
  console.log(
    'after save offline url',
    page.url(),
    JSON.stringify(
      await toast(page)
        .innerText()
        .catch(() => 'none'),
    ),
  );
  await shot(page, 'FLOW-16-step-5-manual-saved-offline');
  await open(page, '/s/payments?state=offline');
  console.log(
    'payments offline:',
    (await text(page))
      .split('\n')
      .filter((l) => /Not synced|3\.50/.test(l))
      .slice(0, 6)
      .join(' | '),
  );
  await shot(page, 'FLOW-16-step-6-payments-offline');
});
