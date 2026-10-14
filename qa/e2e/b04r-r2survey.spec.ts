import fs from 'node:fs';
import { test } from '@playwright/test';
import { uid } from '../../apps/web/src/data/fake/ids';
import { acctId } from '../../apps/web/src/data/fake/scenario';

// Run 2 survey: every redesigned screen in every look and mode at 390x844, measuring what the brief
// and D129 promise (type sizes, hit-testing of every control, page overflow). Raw rows go to
// qa-artifacts/B04-redesign/text/survey.jsonl; triage is by hand.
test.use({ baseURL: 'http://127.0.0.1:5292' });

const OUT = new URL('../../qa-artifacts/B04-redesign/text/survey.jsonl', import.meta.url).pathname;
fs.mkdirSync(new URL('../../qa-artifacts/B04-redesign/text/', import.meta.url).pathname, { recursive: true });

const NK = uid('txn:nasi-kandar');
const PATHS: [string, string][] = [
  ['home', '/'],
  ['review', '/review'],
  ['insights', '/insights'],
  ['more', '/more'],
  ['skipped', '/s/skipped'],
  ['manual', '/s/manual'],
  ['scan', '/scan'],
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
  ['pub-new', '/s/split-public?id=demo-new'],
  ['pub', '/s/split-public?id=demo'],
  ['pub-final', '/s/split-public?id=demo-final'],
  ['pub-closed', '/s/split-public?id=demo-closed'],
  ['memory', '/s/agent/memory'],
  ['research', '/s/agent/research'],
  ['usage', '/s/agent/usage'],
  ['accounts', '/s/accounts'],
  ['account', `/s/account?id=${acctId('ryt')}`],
  ['balance-check', '/s/balance-check'],
  ['payday', '/s/payday?scenario=payday'],
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
  ['data', '/s/settings/data'],
  ['set-account', '/s/settings/account'],
  ['sign-in', '/s/sign-in'],
  ['first-run', '/s/first-run?scenario=before-salary'],
  ['new-look', '/s/new-look'],
  ['home-capture-off', '/?scenario=capture-off'],
  ['home-payday', '/?scenario=payday'],
];
const LOOKS = ['minted', 'instrument', 'firefly', 'line', 'mercury', 'copper'];
const SEL =
  'a[href], button, input, select, textarea, [role="switch"], [role="radio"], [role="button"], [role="link"], [role="tab"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';

async function measure(page: import('@playwright/test').Page) {
  return page.evaluate((SEL) => {
    const vw = innerWidth;
    const vh = innerHeight;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        cs.visibility !== 'hidden' &&
        cs.display !== 'none' &&
        !el.closest('.sr-only,[aria-hidden="true"],[data-dev-handle]')
      );
    };
    const desc = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : ''} "${(el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28)}"`;
    const out: Record<string, unknown> = {};
    const se = document.scrollingElement!;
    out.pageOverflowX = se.scrollWidth - se.clientWidth;
    // text sizes
    const sizes: Record<string, number> = {};
    const small: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const t = (n.textContent ?? '').trim();
      if (!t) continue;
      const p = n.parentElement!;
      if (!p || p.closest('script,style,[data-dev-handle],[data-dev-panel]') || !visible(p)) continue;
      const px = parseFloat(getComputedStyle(p).fontSize);
      sizes[px] = (sizes[px] ?? 0) + 1;
      if (px < 12) small.push(`${px}px ${desc(p)}`);
    }
    out.sizes = sizes;
    out.small = small.slice(0, 8);
    // horizontal spill of elements outside any sideways scroller
    const inHScroll = (el: Element) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) && p !== document.body && p !== document.documentElement)
          return true;
      }
      return false;
    };
    const spill: string[] = [];
    for (const el of document.querySelectorAll('main *')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if ((r.right > vw + 1 || r.left < -1) && !inHScroll(el))
        spill.push(`${desc(el)} ${Math.round(r.left)}..${Math.round(r.right)}`);
    }
    out.spill = spill.slice(0, 6);
    // hit-testing of controls, over up to 4 screenfuls
    const covered: string[] = [];
    const seen = new Set<Element>();
    const tabbar = document.querySelector('nav[aria-label="Tabs"]')?.getBoundingClientRect();
    const scroller = (() => {
      let el: Element | null = document.elementFromPoint(vw / 2, vh / 2);
      while (el) {
        const cs = getComputedStyle(el);
        if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) return el;
        el = el.parentElement;
      }
      return document.scrollingElement!;
    })();
    out.scrollable = scroller.scrollHeight - scroller.clientHeight;
    const pass = () => {
      for (const el of document.querySelectorAll(SEL)) {
        if (seen.has(el) || !visible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > vh) continue;
        if (tabbar && r.bottom > tabbar.top + 2) continue;
        if (el.closest('[data-vaul-drawer],[role="dialog"]')) continue;
        seen.add(el);
        const pts: [number, number][] = [
          [r.left + r.width / 2, r.top + r.height / 2],
          [r.left + 3, r.top + r.height / 2],
          [r.right - 3, r.top + r.height / 2],
          [r.left + r.width / 2, r.top + 3],
          [r.left + r.width / 2, r.bottom - 3],
        ];
        for (const [x, y] of pts) {
          if (x < 0 || x > vw) continue;
          const hit = document.elementFromPoint(x, y);
          if (!hit || hit === el || el.contains(hit)) continue;
          // a label or wrapper that owns this control
          if (hit.contains(el) && hit.tagName === 'LABEL') continue;
          if (hit.closest('label') && hit.closest('label')?.contains(el)) continue;
          covered.push(
            `${desc(el)} (${Math.round(r.width)}x${Math.round(r.height)}) hit by ${desc(hit)} at ${Math.round(x)},${Math.round(y)}`,
          );
          break;
        }
      }
    };
    const start = scroller.scrollTop;
    scroller.scrollTop = 0;
    pass();
    for (let i = 0; i < 4; i++) {
      scroller.scrollTop += vh * 0.6;
      pass();
    }
    scroller.scrollTop = start;
    out.covered = covered.slice(0, 8);
    out.controls = seen.size;
    return out;
  }, SEL);
}

for (const look of LOOKS)
  for (const mode of ['light', 'dark'])
    test(`survey ${look} ${mode}`, async ({ page }) => {
      test.setTimeout(600_000);
      await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
      for (const [name, path] of PATHS) {
        const sep = path.includes('?') ? '&' : '?';
        await page.goto(`${path}${sep}look=${look}&mode=${mode}`);
        await page.waitForFunction(
          () =>
            document.querySelectorAll('svg').length > 0 ||
            (document.querySelector('main')?.textContent?.length ?? 0) > 10,
        );
        await page.waitForTimeout(250);
        const m = await measure(page);
        fs.appendFileSync(OUT, JSON.stringify({ name, look, mode, ...m }) + '\n');
      }
    });
