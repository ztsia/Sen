import fs from 'node:fs';
import { test } from '@playwright/test';
import { TXT, open } from './b04r-helpers';
import { uid } from '../../apps/web/src/data/fake/ids';
test.use({ baseURL: 'http://127.0.0.1:5291' });
const P: Record<string, string> = {
  more: '/more',
  manual: '/s/manual',
  'balance-check': '/s/balance-check',
  claims: '/s/claims',
  members: '/s/settings/members',
  txn: `/s/txn?id=${uid('txn:roti-bakar')}`,
  shared: '/s/shared',
  split: `/s/split?id=${uid('split:bbq')}`,
  accounts: '/s/accounts',
  cats: '/s/settings/categories',
  claimsS: '/s/settings/claims',
  capture: '/s/settings/capture',
  apps: '/s/settings/capture/apps',
  memory: '/s/agent/memory',
  usage: '/s/agent/usage',
  goals: '/s/goals',
  year: '/s/insights/year',
  budgets: '/s/budgets',
  subs: '/s/subscriptions',
  payday: '/s/payday',
  you: '/s/settings/you',
  email: '/s/settings/email',
  sen: '/s/settings/sen',
  data: '/s/settings/data',
  account: '/s/settings/account',
  cycle: '/',
  skipped: '/s/skipped',
  scan: '/scan',
  research: '/s/agent/research',
  payments: '/s/payments',
  claim: `/s/claim?id=${uid('claim:phone:2026-09')}`,
};
for (const [k, path] of Object.entries(P))
  test(`dump ${k}`, async ({ page }) => {
    await open(page, path);
    await page.waitForTimeout(300);
    const t = await page.evaluate(() => {
      const names = [
        ...document.querySelectorAll(
          'main button, main a[href], main [role=tab], main [role=radio], main [role=switch]',
        ),
      ].map(
        (b) =>
          `[${b.getAttribute('role') ?? b.tagName.toLowerCase()}] ${(b.getAttribute('aria-label') ?? (b as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 70)}`,
      );
      return `${(document.querySelector('main') as HTMLElement).innerText}\n\n--- controls\n${names.join('\n')}`;
    });
    fs.writeFileSync(`${TXT}dump-${k}.txt`, t);
  });
