import fs from 'node:fs';
import { test } from '@playwright/test';
import { uid } from '../../apps/web/src/data/fake/ids';
import { acctId } from '../../apps/web/src/data/fake/scenario';

test.use({ baseURL: 'http://127.0.0.1:5292' });
const NK = uid('txn:nasi-kandar');
const PATHS: [string, string][] = [
  ['home', '/'],
  ['review', '/review'],
  ['insights', '/insights'],
  ['more', '/more'],
  ['skipped', '/s/skipped'],
  ['manual', '/s/manual'],
  ['budgets', '/s/budgets'],
  ['subscriptions', '/s/subscriptions'],
  ['goals', '/s/goals'],
  ['goal', `/s/goal?id=${uid('goal:japan')}`],
  ['year', '/s/insights/year'],
  ['payments', '/s/payments'],
  ['txn', `/s/txn?id=${NK}`],
  ['receipt', `/s/receipt?id=${uid('receipt:nasi-kandar')}`],
  ['shared', '/s/shared'],
  ['split', `/s/split?id=${uid('split:nk')}`],
  ['memory', '/s/agent/memory'],
  ['research', '/s/agent/research'],
  ['usage', '/s/agent/usage'],
  ['accounts', '/s/accounts'],
  ['account', `/s/account?id=${acctId('ryt')}`],
  ['balance-check', '/s/balance-check'],
  ['claims', '/s/claims'],
  ['claim', `/s/claim?id=${uid('claim:phone:2026-09')}`],
  ['settings', '/s/settings'],
  ['capture', '/s/settings/capture'],
  ['cap-apps', '/s/settings/capture/apps'],
  ['you', '/s/settings/you'],
  ['categories', '/s/settings/categories'],
  ['email', '/s/settings/email'],
  ['set-claims', '/s/settings/claims'],
  ['set-sen', '/s/settings/sen'],
  ['members', '/s/settings/members'],
  ['data', '/s/settings/data'],
  ['set-account', '/s/settings/account'],
];
const OUT = new URL('../../qa-artifacts/B04-redesign/text/states.jsonl', import.meta.url).pathname;
for (const state of ['empty', 'error', 'loading', 'offline'])
  test(`states ${state}`, async ({ page }) => {
    test.setTimeout(300000);
    for (const [name, p] of PATHS) {
      await page.goto(`${p}${p.includes('?') ? '&' : '?'}state=${state}&look=minted&mode=light`);
      await page
        .waitForFunction(
          () =>
            (document.querySelector('main')?.textContent?.length ?? 0) > 3 ||
            document.querySelectorAll('[data-slot="skeleton"]').length > 0,
          null,
          { timeout: 8000 },
        )
        .catch(() => {});
      if (state !== 'loading') await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const m = document.querySelector('main')!;
        const t = m.innerText.replace(/\n+/g, ' | ').slice(0, 260);
        const btn = [...m.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim().slice(0, 24)).slice(0, 6);
        return {
          t,
          svgs: m.querySelectorAll('svg').length,
          btn,
          skeleton: m.querySelectorAll('[data-slot="skeleton"]').length,
          empty: !!m.querySelector('[data-slot="empty"], [data-empty]'),
        };
      });
      fs.appendFileSync(OUT, JSON.stringify({ state, name, ...r }) + '\n');
    }
  });
