import { test } from '@playwright/test';
import { LOOKS, open, shot, watch } from './b04-helpers';
const NK = 'eb9ebb1f-b041-4f7a-8f61-7f84bf03095c';
const SCREENS: [string, string][] = [
  ['shared', '/s/shared'],
  ['split', `/s/split?id=${NK}`],
  ['splitpub', '/s/split-public?id=demo'],
  ['accounts', '/s/accounts'],
  ['claims', '/s/claims'],
  ['members', '/s/settings/members'],
  ['payday', '/s/payday'],
  ['signin', '/s/sign-in'],
];
for (const mode of ['light', 'dark'] as const)
  test(`looks ${mode}`, async ({ page }) => {
    test.setTimeout(400_000);
    const w = watch(page);
    for (const look of LOOKS)
      for (const [name, path] of SCREENS) {
        await open(page, path, look, mode);
        await page.waitForTimeout(250);
        await shot(page, `looks-${mode}-${name}-${look}`);
      }
    console.log('errors', JSON.stringify(w.errors).slice(0, 300), 'external', JSON.stringify(w.external));
  });
