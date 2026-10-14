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
  ['split-nk', `/s/split?id=${uid('split:nk')}`],
  ['split-bbq', `/s/split?id=${uid('split:bbq')}`],
  ['memory', '/s/agent/memory'],
  ['research', '/s/agent/research'],
  ['usage', '/s/agent/usage'],
  ['accounts', '/s/accounts'],
  ['account', `/s/account?id=${acctId('ryt')}`],
  ['balance-check', '/s/balance-check'],
  ['claims', '/s/claims'],
  ['claim', `/s/claim?id=${uid('claim:phone:2026-09')}`],
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
  ['pub', '/s/split-public?id=demo'],
];
const OUT = new URL('../../qa-artifacts/B04-redesign/text/structure.jsonl', import.meta.url).pathname;
test('structure survey', async ({ page }) => {
  test.setTimeout(300000);
  for (const [name, p] of PATHS) {
    await page.goto(`${p}${p.includes('?') ? '&' : '?'}look=minted&mode=light`);
    await page
      .waitForFunction(
        () =>
          (document.querySelector('main')?.textContent?.length ?? 0) > 10 &&
          !document.querySelector('main [role=status]'),
        null,
        { timeout: 8000 },
      )
      .catch(() => {});
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      const vis = (e: Element) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && !e.closest('[aria-hidden="true"]:not(span)');
      };
      const out: Record<string, unknown> = {};
      // info rows with a tile: an item that is neither button nor link but holds an icon tile
      out.infoWithTile = [...main.querySelectorAll('[data-slot="item"]')]
        .filter(
          (e) =>
            e.tagName !== 'BUTTON' &&
            e.tagName !== 'A' &&
            !e.querySelector('button, a, [role=switch]') &&
            e.querySelector('span[aria-hidden="true"].size-8, span[aria-hidden="true"].size-12'),
        )
        .map((e) => (e.textContent ?? '').trim().slice(0, 40));
      // destinations without a tile: item buttons (rows) that have a chevron svg but no tile
      out.rowHeights = [...main.querySelectorAll('[data-slot="item"]')]
        .filter((e) => (e.tagName === 'BUTTON' || e.tagName === 'A') && vis(e))
        .map((e) => Math.round(e.getBoundingClientRect().height))
        .filter((h) => h < 56).length;
      out.smallRows = [...main.querySelectorAll('[data-slot="item"]')]
        .filter((e) => (e.tagName === 'BUTTON' || e.tagName === 'A') && vis(e) && e.getBoundingClientRect().height < 56)
        .map((e) => `${Math.round(e.getBoundingClientRect().height)} ${(e.textContent ?? '').trim().slice(0, 30)}`)
        .slice(0, 4);
      // full-bleed dividers: any element with a border-top/bottom wider than 380 px, outside a card
      out.fullBleed = [...document.querySelectorAll('main *, main ~ *')]
        .filter((e) => {
          const cs = getComputedStyle(e);
          const r = e.getBoundingClientRect();
          return (
            r.width >= 380 &&
            ((parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') ||
              (parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none')) &&
            !e.closest('[data-slot="card"]') &&
            vis(e) &&
            !e.closest('nav')
          );
        })
        .map((e) => `${e.tagName.toLowerCase()}.${(e.className as string).toString().slice(0, 50)}`)
        .slice(0, 3);
      // buttons drawn 48 tall in the body (main actions)
      out.big = [...main.querySelectorAll('button')]
        .filter(
          (b) => vis(b) && Math.round(b.getBoundingClientRect().height) === 48 && !b.closest('[data-slot="item"]'),
        )
        .map((b) => (b.textContent ?? '').trim().slice(0, 24));
      // tile geometry
      out.tiles = [
        ...new Set(
          [...main.querySelectorAll('span[aria-hidden="true"]')]
            .filter((e) => e.querySelector(':scope > svg') && /size-(8|12)/.test(e.className.toString()))
            .map(
              (e) =>
                `${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}/${Math.round((e.firstElementChild as Element).getBoundingClientRect().width)}`,
            ),
        ),
      ];
      // facts that look like buttons
      out.factButtons = [...main.querySelectorAll('dl button')].map((b) => (b.textContent ?? '').trim().slice(0, 20));
      out.h1 = document.querySelector('h1')?.textContent ?? null;
      return out;
    });
    fs.appendFileSync(OUT, JSON.stringify({ name, ...r }) + '\n');
  }
});
