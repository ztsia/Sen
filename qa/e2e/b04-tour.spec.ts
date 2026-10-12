import { test } from '@playwright/test';
import { dump, open, shot, watch } from './b04-helpers';

const ROUTES: [string, string][] = [
  ['shared', '/s/shared'],
  ['accounts', '/s/accounts'],
  ['balance-check', '/s/balance-check'],
  ['claims', '/s/claims'],
  ['payday', '/s/payday'],
  ['sign-in', '/s/sign-in'],
  ['first-run', '/s/first-run'],
  ['new-look', '/s/new-look'],
  ['settings', '/s/settings'],
  ['settings-appearance', '/s/settings/appearance'],
  ['settings-capture', '/s/settings/capture'],
  ['settings-you', '/s/settings/you'],
  ['settings-categories', '/s/settings/categories'],
  ['settings-email', '/s/settings/email'],
  ['settings-claims', '/s/settings/claims'],
  ['settings-sen', '/s/settings/sen'],
  ['settings-members', '/s/settings/members'],
  ['settings-data', '/s/settings/data'],
  ['settings-account', '/s/settings/account'],
  ['agent-memory', '/s/agent/memory'],
  ['agent-research', '/s/agent/research'],
  ['agent-usage', '/s/agent/usage'],
  ['split-public-new', '/s/split-public?id=demo-new'],
  ['split-public-demo', '/s/split-public?id=demo'],
  ['split-public-final', '/s/split-public?id=demo-final'],
  ['split-public-closed', '/s/split-public?id=demo-closed'],
];

test('tour', async ({ page }) => {
  const w = watch(page);
  for (const [name, path] of ROUTES) {
    await open(page, path);
    await page.waitForTimeout(400);
    await dump(page, `tour-${name}`);
    await shot(page, `tour-${name}`);
  }
  console.log('errors', JSON.stringify(w.errors), 'external', JSON.stringify(w.external));
});
