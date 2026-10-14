import { test } from '@playwright/test';
import { open, shot } from './b04r-helpers';
import { uid } from '../../apps/web/src/data/fake/ids';
test.use({ baseURL: 'http://127.0.0.1:5291' });
const P: [string, string][] = [
  ['home', '/'],
  ['review', '/review'],
  ['insights', '/insights'],
  ['more', '/more'],
  ['payments', '/s/payments'],
  ['accounts', '/s/accounts'],
  ['claims', '/s/claims'],
  ['shared', '/s/shared'],
  ['budgets', '/s/budgets'],
  ['subscriptions', '/s/subscriptions'],
  ['goals', '/s/goals'],
  ['memory', '/s/agent/memory'],
  ['usage', '/s/agent/usage'],
  ['members', '/s/settings/members'],
  ['balance-check', '/s/balance-check'],
  ['settings', '/s/settings'],
  ['appearance', '/s/settings/appearance'],
  ['categories', '/s/settings/categories'],
  ['you', '/s/settings/you'],
  ['txn', `/s/txn?id=${uid('txn:roti-bakar')}`],
  ['split', `/s/split?id=${uid('split:nk')}`],
  ['claim', `/s/claim?id=${uid('claim:phone:2026-09')}`],
  ['manual', '/s/manual'],
  ['payday', '/s/payday'],
  ['settings-claims', '/s/settings/claims'],
  ['sen', '/s/settings/sen'],
  ['email', '/s/settings/email'],
  ['year', '/s/insights/year'],
];
test('FLOW-20 text at 1.5x: no page overflow, no clipped amounts', async ({ page }) => {
  const rows: string[] = [];
  for (const [name, path] of P) {
    await open(page, path);
    await page.addStyleTag({ content: 'html{font-size:150% !important}' });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const s = document.scrollingElement!;
      const clipped: string[] = [];
      document.querySelectorAll('main *').forEach((el) => {
        const e = el as HTMLElement;
        if (e.children.length) return;
        const t = (e.textContent ?? '').trim();
        if (!t) return;
        const cs = getComputedStyle(e);
        if (
          e.scrollWidth > e.clientWidth + 1 &&
          (cs.overflow !== 'visible' || cs.textOverflow === 'ellipsis') &&
          !e.closest('[role=tablist]') &&
          !e.closest('.overflow-x-auto')
        )
          clipped.push(t.slice(0, 40));
      });
      return { hOver: s.scrollWidth - s.clientWidth, clipped: clipped.slice(0, 5), n: clipped.length };
    });
    rows.push(`${name}: hOver=${r.hOver} clipped=${r.n} ${JSON.stringify(r.clipped)}`);
    if (r.n || r.hOver > 0) await shot(page, `FLOW-20-scale-${name}`);
  }
  console.log(rows.join('\n'));
});
