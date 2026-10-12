import { expect, test } from '@playwright/test';
import { db, dialog, open, shot, text, tabs, toast, watch } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const SEN = (p: import('@playwright/test').Page) => p.getByRole('button', { name: 'Ask Sen', exact: true });

test('FLOW-6 Sen sad states: offline, paused', async ({ page }) => {
  await open(page, '/?state=offline');
  await SEN(page).click();
  const d = dialog(page, 'Sen');
  await page.waitForTimeout(500);
  const t1 = await d.innerText();
  console.log('OFFLINE sheet:', JSON.stringify(t1.split('\n').filter((l) => /connection|offline/i.test(l))));
  await expect(d).toContainText('Sen needs a connection');
  const box = d.getByRole('textbox');
  console.log('composer disabled offline?', await box.isDisabled().catch(() => 'no textbox'));
  await shot(page, 'FLOW-6-step-1-sen-offline');
  await open(page, '/?scenario=cap');
  await SEN(page).click();
  await page.waitForTimeout(500);
  const t2 = await dialog(page, 'Sen').innerText();
  console.log('CAP sheet:', JSON.stringify(t2.split('\n').filter((l) => /paused|until|cap|Sen is/i.test(l))));
  await expect(dialog(page, 'Sen')).toContainText('Sen is paused until 1 Nov; everything else works');
  await shot(page, 'FLOW-6-step-2-sen-paused');
});

test('FLOW-5 apply double tap + dismiss + ask_user + menu', async ({ page }) => {
  await open(page, '/');
  await SEN(page).click();
  const d = dialog(page, 'Sen');
  const before = await db<number>(page, `(d) => d.rules.length`);
  await d.getByRole('button', { name: 'Apply' }).dblclick();
  await page.waitForTimeout(800);
  console.log('toast after dbl apply:', JSON.stringify(await toast(page).innerText().catch(() => 'none')));
  const after = await db<number>(page, `(d) => d.rules.length`);
  console.log('rules before/after', before, after);
  await shot(page, 'FLOW-5-step-2-applied');
  // ask_user: tap the recommended option
  await d.getByRole('button', { name: /^Yes, I did/ }).click();
  await page.waitForTimeout(800);
  console.log('after yes: url', page.url(), 'toast', JSON.stringify(await toast(page).innerText().catch(() => 'none')));
  await shot(page, 'FLOW-5-step-3-ask-user');
});

test('FLOW-5 menu: memory, research, usage', async ({ page }) => {
  await open(page, '/');
  await SEN(page).click();
  const d = dialog(page, 'Sen');
  await d.getByRole('button', { name: /More|menu|Sen menu|options/i }).first().click().catch(() => console.log('no menu button by name'));
  await page.waitForTimeout(400);
  await shot(page, 'FLOW-5-step-4-menu');
  console.log('MENU:', JSON.stringify((await page.getByRole('menuitem').allInnerTexts())));
  for (const name of ['What Sen remembers', 'Research', 'Usage']) {
    await page.getByRole('menuitem', { name }).click();
    await page.waitForTimeout(700);
    console.log(name, '->', page.url(), JSON.stringify((await text(page)).split('\n').slice(0, 12).join(' | ')));
    await shot(page, `FLOW-5-step-5-${name.replace(/\s+/g, '-')}`);
    await page.goBack();
    await page.waitForTimeout(500);
    if (!(await dialog(page, 'Sen').isVisible().catch(() => false))) await SEN(page).click();
    await d.getByRole('button', { name: /More|menu|Sen menu|options/i }).first().click().catch(() => {});
  }
});
