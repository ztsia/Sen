import { test } from '@playwright/test';
import { open, shot, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
test('friend scenario deep links', async ({ page }) => {
  for (const p of [
    'settings/you',
    'settings/claims',
    'settings/members',
    'settings/data',
    'settings/capture',
    'settings/sen',
    'payday',
    'claim',
  ]) {
    await open(page, `/s/${p}?scenario=month`);
    console.log('==', p, JSON.stringify((await text(page)).split('\n').slice(0, 22).join(' | ').slice(0, 520)));
    if (p === 'settings/you') await shot(page, 'FLOW-9-step-2-you-friend');
  }
});
