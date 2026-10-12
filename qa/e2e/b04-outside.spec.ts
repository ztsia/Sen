import { expect, test } from '@playwright/test';
import { open, shot, text, watch } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const body = async (p: import('@playwright/test').Page) =>
  (await text(p)).split('\n').filter(Boolean).slice(0, 30).join(' | ');

test('FLOW-13 new-look: keep, go back, switch off', async ({ page }) => {
  const w = watch(page);
  await open(page, '/');
  await page.getByRole('button', { name: 'Dev panel' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Play the reveal' }).click();
  await page.waitForTimeout(2500);
  const look1 = await page.locator('html').getAttribute('data-look');
  console.log('look during reveal', look1, '|', (await body(page)).slice(0, 300));
  const keep = page.getByRole('button', { name: 'Keep it' });
  await expect(keep).toBeFocused();
  await shot(page, 'FLOW-13-step-1-card');
  await page.getByRole('switch').click();
  await keep.click();
  await page.waitForTimeout(1000);
  console.log('after keep (switch off): url', page.url(), 'look', await page.locator('html').getAttribute('data-look'));
  await page.goto('/s/settings/appearance?mode=light');
  await page.waitForTimeout(800);
  console.log('APPEARANCE:', (await body(page)).slice(0, 500));
  await shot(page, 'FLOW-13-step-2-appearance-after-keep-switch-off');
  // go back path
  await open(page, '/s/new-look', 'minted');
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Go back' }).click();
  await page.waitForTimeout(800);
  console.log('after Go back: look', await page.locator('html').getAttribute('data-look'), page.url());
  console.log(w.errors.join('\n'));
});

test('FLOW-10 sign-in states', async ({ page }) => {
  const w = watch(page);
  await open(page, '/s/sign-in');
  const email = page.getByLabel('Your email');
  const send = page.getByRole('button', { name: 'Send the code' });
  for (const bad of [
    '',
    'abc',
    'a@b',
    'x'.repeat(400) + '@example.com',
    '<img src=x onerror=window.__p=1>@a.com',
    'stranger@example.com',
  ]) {
    await open(page, '/s/sign-in');
    await email.fill(bad);
    await send.click();
    await page.waitForTimeout(200);
    const t = (await text(page))
      .split('\n')
      .filter((l) => /email|invitation|code/i.test(l))
      .slice(0, 3)
      .join(' / ');
    console.log('EMAIL', JSON.stringify(bad.slice(0, 20)), '=>', t.slice(0, 160));
  }
  await shot(page, 'FLOW-10-step-1-invitation-only');
  await open(page, '/s/sign-in');
  await email.fill('weiming@example.com');
  await send.click();
  const code = page.getByLabel('6-digit code');
  for (const c of ['12345', 'abcdef', '000000', '999999']) {
    await code.fill(c);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForTimeout(200);
    console.log(
      'CODE',
      JSON.stringify(c),
      '=> val',
      JSON.stringify(await code.inputValue()),
      (await text(page))
        .split('\n')
        .filter((l) => /code|digits|expired|right/i.test(l))
        .slice(0, 3)
        .join(' / ')
        .slice(0, 140),
      page.url(),
    );
  }
  await shot(page, 'FLOW-10-step-2-wrong-code');
  await code.fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(800);
  console.log('after ok:', page.url());
  // invitation link
  await page.goto('/s/sign-in?email=farid%40example.com&look=minted&mode=light');
  await page.waitForTimeout(600);
  console.log('invite prefill:', await page.getByLabel('Your email').inputValue());
  await page.goto('/s/sign-in?email=%3Cscript%3E&look=minted&mode=light');
  await page.waitForTimeout(600);
  console.log('hostile prefill:', JSON.stringify(await page.getByLabel('Your email').inputValue()));
  console.log(w.errors.join('\n'));
});

test('FLOW-C1 first-run, shell version, 7 steps', async ({ page }) => {
  const w = watch(page);
  await open(page, '/s/first-run');
  await page.getByLabel('Your email').fill('weiming@example.com');
  await page.getByRole('button', { name: 'Send the code' }).click();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(700);
  console.log('S2', (await body(page)).slice(0, 700));
  await shot(page, 'FLOW-C1-step-2-apps');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(500);
  console.log('S3', (await body(page)).slice(0, 400));
  await shot(page, 'FLOW-C1-step-3-access');
  // reload mid-way: reopens at same step?
  await page.reload();
  await page.waitForTimeout(900);
  console.log('RELOAD at', (await body(page)).slice(0, 120));
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.waitForTimeout(400);
  console.log('S4', (await body(page)).slice(0, 500));
  await shot(page, 'FLOW-C1-step-4-running');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(500);
  console.log('S5', (await body(page)).slice(0, 500));
  const boxes = page.getByRole('textbox');
  await boxes.first().fill('abc');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(300);
  console.log(
    'S5 bad balance:',
    (await text(page))
      .split('\n')
      .filter((l) => /amount|ringgit/i.test(l))
      .join(' / '),
  );
  await boxes.first().fill('1,284.50');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(400);
  console.log('S6', (await body(page)).slice(0, 300));
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(300);
  console.log(
    'S6 empty name:',
    (await text(page))
      .split('\n')
      .filter((l) => /Type your name/i.test(l))
      .join(''),
  );
  await page.getByLabel('Your name').fill('  tan   wei ming ');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(400);
  console.log('S7', (await body(page)).slice(0, 300));
  await page.getByRole('radio', { name: 'A day number' }).click();
  for (const d of ['0', '32', '', '5']) {
    await page.getByLabel('Day of the month').fill(d);
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.waitForTimeout(300);
    console.log(
      'payday day',
      JSON.stringify(d),
      '=>',
      (await text(page))
        .split('\n')
        .filter((l) => /1 to 31/.test(l))
        .join('') || 'accepted',
      page.url(),
    );
    if (!/first-run/.test(page.url())) break;
  }
  await page.waitForTimeout(800);
  console.log('HOME after first-run:', (await body(page)).slice(0, 300));
  await shot(page, 'FLOW-C1-step-8-home');
  console.log(w.errors.join('\n'));
});
