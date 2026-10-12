import { test } from '@playwright/test';
import { open, shot } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const hero = async (p: import('@playwright/test').Page) =>
  (await p.getByTestId('hero').innerText()).replace(/\n/g, ' ');
const sheet = async (p: import('@playwright/test').Page) => {
  await p.getByTestId('hero').click();
  await p.waitForTimeout(600);
  const t = (await p.getByRole('dialog').innerText()).split('\n').filter(Boolean).slice(0, 14).join(' | ');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  return t;
};
test('F21 income vs claims across the payday', async ({ page }) => {
  await open(page, '/?scenario=payday');
  console.log('card up: hero', await hero(page));
  console.log('card up: cycle sheet', (await sheet(page)).slice(0, 300));
  await page.goto('/s/payday?scenario=payday&look=minted&mode=light');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Skip' }).click(); // skip claims step
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.waitForTimeout(900);
  console.log('after skipping all four: url', new URL(page.url()).pathname, '| hero', await hero(page));
  console.log('after skip: cycle sheet', (await sheet(page)).slice(0, 300));
  await shot(page, 'R3-F21-step-5-after-skip');
});
