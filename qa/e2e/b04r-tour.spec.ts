import fs from 'node:fs';
import { test } from '@playwright/test';
import { uid } from '../../apps/web/src/data/fake/ids';
import { OUT, TXT, open, watch } from './b04r-helpers';

// Tour of every registry screen at 390x844: structure measurements + one screenshot each.
const IDS =
  `txn receipt split claim account goal settings/member home review insights more cycle payday skipped manual scan crop reading confirm shared budgets subscriptions goals insights/year agent/memory agent/research agent/usage payments accounts balance-check claims settings settings/appearance settings/capture settings/capture/apps settings/capture/access settings/capture/running settings/capture/captured settings/you settings/categories settings/email settings/claims settings/sen settings/members settings/data settings/account sign-in first-run new-look`.split(
    ' ',
  );

const rows: unknown[] = [];
for (const id of IDS)
  test(`tour ${id}`, async ({ page }) => {
    const w = watch(page);
    const path = id === 'home' ? '/' : ['review', 'insights', 'more', 'scan'].includes(id) ? `/${id}` : `/s/${id}`;
    const WITH: Record<string, string> = {
      txn: `/s/txn?id=${uid('txn:roti-bakar')}`,
      receipt: `/s/receipt?id=${uid('receipt:nasi-kandar')}`,
      split: `/s/split?id=${uid('split:bbq')}`,
      claim: `/s/claim?id=${uid('claim:phone:2026-09')}`,
    };
    await open(page, WITH[id] ?? path);
    if (id === 'account') {
      await page.goto('/s/accounts?look=minted&mode=light');
      await page.locator('main button').filter({ hasText: /RM/ }).first().click();
    }
    if (id === 'goal') {
      await page.goto('/s/goals?look=minted&mode=light');
      await page.locator('main button').filter({ hasText: /RM/ }).first().click();
    }
    if (id === 'settings/member') {
      await page.goto('/s/settings/members?look=minted&mode=light');
      await page
        .locator('main button')
        .filter({ hasText: /@|Ali|Mei|Kah/ })
        .first()
        .click();
    }
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const vis = (el: Element) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[aria-hidden="true"]');
      };
      const btns = [...document.querySelectorAll<HTMLElement>('main button, main a[href], main [role=button]')].filter(
        vis,
      );
      const h = (el: Element) => Math.round(el.getBoundingClientRect().height);
      const name = (el: Element) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
      const unnamed = btns
        .filter((b) => !name(b) && !b.getAttribute('aria-labelledby') && !b.getAttribute('title'))
        .map((b) => b.outerHTML.slice(0, 100));
      const full48 = btns
        .filter((b) => h(b) === 48 && b.getBoundingClientRect().width >= 200 && !b.closest('[data-slot=item]'))
        .map((b) => name(b).slice(0, 25));
      let small = 0;
      const tiny: string[] = [];
      document.querySelectorAll('main *').forEach((el) => {
        if (el.children.length === 0 && el.textContent?.trim() && vis(el)) {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 12) {
            small++;
            tiny.push(`${fs}:${el.textContent!.trim().slice(0, 20)}`);
          }
        }
      });
      const s = document.scrollingElement!;
      const main = document.querySelector('main');
      return {
        scrollH: s.scrollHeight,
        clientH: s.clientHeight,
        mainOver: main ? main.scrollHeight - main.clientHeight : 0,
        hOver: s.scrollWidth - s.clientWidth,
        nBtn: btns.length,
        unnamed,
        full48,
        tiny: tiny.slice(0, 5),
        small,
        cards: document.querySelectorAll('[data-slot=card]').length,
        h1: [...document.querySelectorAll('h1')].map((x) => x.textContent).join('|'),
        body: document.body.innerText.length,
      };
    });
    console.log(id, page.url());
    rows.push({ id, ...m, errors: w.errors.slice(0, 3) });
    fs.writeFileSync(
      `${TXT}tour-${id.replace(/\//g, '_')}.json`,
      JSON.stringify({ id, ...m, errors: w.errors }, null, 1),
    );
    await page.screenshot({ path: `${OUT}tour-${id.replace(/\//g, '_')}.png`, fullPage: true });
  });
