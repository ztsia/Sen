import fs from 'node:fs';
import { test } from '@playwright/test';
import { uid } from '../../apps/web/src/data/fake/ids';
import { acctId } from '../../apps/web/src/data/fake/scenario';

// R2-AC-43 sad twin: at the end of every screen, nothing a person must tap is under the tab bar, Sen's
// button or a sticky bar.
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
  ['split-nk', `/s/split?id=${uid('split:nk')}`],
  ['split-bbq', `/s/split?id=${uid('split:bbq')}`],
  ['split-hdl', `/s/split?id=${uid('split:haidilao')}`],
  ['memory', '/s/agent/memory'],
  ['research', '/s/agent/research'],
  ['usage', '/s/agent/usage'],
  ['accounts', '/s/accounts'],
  ['account', `/s/account?id=${acctId('ryt')}`],
  ['balance-check', '/s/balance-check'],
  ['claims', '/s/claims'],
  ['claim', `/s/claim?id=${uid('claim:phone:2026-09')}`],
  ['claim-missing', `/s/claim?id=${uid('claim:parking:2026-09')}`],
  ['settings', '/s/settings'],
  ['appearance', '/s/settings/appearance'],
  ['capture', '/s/settings/capture'],
  ['cap-apps', '/s/settings/capture/apps'],
  ['cap-access', '/s/settings/capture/access'],
  ['cap-running', '/s/settings/capture/running'],
  ['cap-captured', '/s/settings/capture/captured'],
  ['you', '/s/settings/you'],
  ['categories', '/s/settings/categories'],
  ['email', '/s/settings/email'],
  ['set-claims', '/s/settings/claims'],
  ['set-sen', '/s/settings/sen'],
  ['members', '/s/settings/members'],
  ['member', '/s/settings/members'],
  ['data', '/s/settings/data'],
  ['set-account', '/s/settings/account'],
  ['pub', '/s/split-public?id=demo'],
  ['pub-new', '/s/split-public?id=demo-new'],
];
const OUT = new URL('../../qa-artifacts/B04-redesign/text/bottom.jsonl', import.meta.url).pathname;
for (const look of ['minted', 'firefly'])
  test('bottom ' + look, async ({ page }) => {
    test.setTimeout(300000);
    for (const [name, p] of PATHS) {
      await page.goto(`${p}${p.includes('?') ? '&' : '?'}look=${look}&mode=light`);
      await page
        .waitForFunction(
          () =>
            (document.querySelector('main')?.textContent?.length ?? 0) > 10 &&
            !document.querySelector('main [role=status]'),
          null,
          { timeout: 8000 },
        )
        .catch(() => {});
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => {
        const vh = innerHeight,
          vw = innerWidth;
        let el: Element | null = document.elementFromPoint(vw / 2, vh / 2);
        let sc: Element = document.scrollingElement!;
        while (el) {
          const cs = getComputedStyle(el);
          if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) {
            sc = el;
            break;
          }
          el = el.parentElement;
        }
        sc.scrollTop = 99999;
        const SEL =
          'a[href], button, input, select, textarea, [role="switch"], [role="radio"], [role="checkbox"], [role="tab"]';
        const bad: string[] = [];
        for (const c of document.querySelectorAll(SEL)) {
          const r = c.getBoundingClientRect();
          if (
            r.width === 0 ||
            r.height === 0 ||
            r.bottom < 0 ||
            r.top > vh ||
            c.closest('nav, [role=dialog], .sr-only, [data-dev-handle]')
          )
            continue;
          const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1),
            y = Math.min(r.top + r.height / 2, vh - 1);
          if (r.top < 60) continue;
          const hit = document.elementFromPoint(x, y);
          if (!hit || hit === c || c.contains(hit) || (hit.closest('label') && hit.closest('label')!.contains(c)))
            continue;
          bad.push(
            `${(c.getAttribute('aria-label') ?? c.textContent ?? '').trim().slice(0, 26)} (${Math.round(r.width)}x${Math.round(r.height)} at y=${Math.round(r.top)}) under ${hit.tagName.toLowerCase()}${hit.getAttribute('aria-label') ? '[' + hit.getAttribute('aria-label') + ']' : ''} "${(hit.textContent ?? '').trim().slice(0, 20)}"`,
          );
        }
        const ls = [...document.querySelectorAll(SEL)].filter((c) => {
          const r = c.getBoundingClientRect();
          return (
            r.width > 0 && r.bottom > 0 && r.top < vh && !c.closest('nav, [role=dialog], .sr-only, [data-dev-handle]')
          );
        });
        const lastBottom = Math.max(0, ...ls.map((c) => c.getBoundingClientRect().bottom).filter((b) => b < vh));
        return {
          bad: bad.slice(0, 5),
          scrollable: sc.scrollHeight - sc.clientHeight,
          lastBottom: Math.round(lastBottom),
        };
      });
      fs.appendFileSync(OUT, JSON.stringify({ name, look, ...r }) + '\n');
    }
  });
