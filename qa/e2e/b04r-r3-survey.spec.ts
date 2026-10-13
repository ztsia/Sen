import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { uid } from '../../apps/web/src/data/fake/ids';
import { acctId } from '../../apps/web/src/data/fake/scenario';
import { TXT, open, watch } from './b04r-helpers';

// Run 3 survey: every screen, at 390 x 1.0 and at 320 x 1.5 text, in two looks each: overflow, clipped or
// truncated amounts, unnamed controls, hit areas that cover each other, headings smaller than their text.
// Preview build (5292).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

const PATHS = [
  '/',
  '/review',
  '/insights',
  '/more',
  '/s/skipped',
  '/s/manual',
  '/s/payments',
  '/s/accounts',
  `/s/account?id=${acctId('ryt')}`,
  '/s/balance-check',
  '/s/claims',
  '/s/shared',
  `/s/split?id=${uid('split:bbq')}`,
  `/s/split?id=${uid('split:haidilao')}`,
  `/s/split?id=${uid('split:nk')}`,
  '/s/budgets',
  '/s/subscriptions',
  '/s/goals',
  `/s/goal?id=${uid('goal:japan')}`,
  '/s/insights/year',
  '/s/agent/memory',
  '/s/agent/research',
  '/s/agent/usage',
  '/s/settings',
  '/s/settings/appearance',
  '/s/settings/capture',
  '/s/settings/capture/apps',
  '/s/settings/capture/access',
  '/s/settings/capture/running',
  '/s/settings/capture/captured',
  '/s/settings/you',
  '/s/settings/categories',
  '/s/settings/email',
  '/s/settings/claims',
  '/s/settings/sen',
  '/s/settings/members',
  `/s/settings/member?id=${uid('member:hui-min')}`,
  '/s/settings/data',
  '/s/settings/account',
  '/s/sign-in',
  '/s/first-run',
  '/s/new-look',
  `/s/txn?id=${uid('txn:nasi-kandar')}`,
  `/s/receipt?id=${uid('receipt:nasi-kandar')}`,
  '/scan',
  '/s/payday',
  '/s/split-public?id=demo',
  '/s/split-public?id=demo-final',
];

async function audit(page: Page, scale: number) {
  return page.evaluate((scale) => {
    const out: Record<string, string[]> = {
      overflow: [],
      truncated: [],
      covers: [],
      heading: [],
      badtext: [],
      sizes: [],
      intro: [],
    };
    const vw = document.documentElement.clientWidth;
    const de = document.documentElement;
    if (de.scrollWidth > vw + 1) out.overflow!.push(`document ${de.scrollWidth}>${vw}`);
    const shell = document.querySelector('div.safe-top') as HTMLElement | null;
    if (shell && shell.scrollLeft !== 0) out.overflow!.push(`shell scrolled ${shell.scrollLeft}`);
    const vis = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        cs.visibility !== 'hidden' &&
        !el.closest('.sr-only, [aria-hidden="true"], [inert]')
      );
    };
    // text or boxes past the right edge
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main *'))) {
      if (!vis(el)) continue;
      if (
        el.closest(
          '[role="tablist"], [data-slot="scroll-area"], .overflow-x-auto, [data-review] .overflow-x-auto, [role="tabpanel"]',
        )
      )
        continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && el.children.length === 0 && (el.textContent ?? '').trim())
        out.overflow!.push(`${el.tagName} "${el.textContent!.trim().slice(0, 30)}" right=${Math.round(r.right)}`);
      const cs = getComputedStyle(el);
      if (
        /RM\s?\d/.test(el.textContent ?? '') &&
        el.children.length === 0 &&
        (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') &&
        el.scrollWidth > el.clientWidth + 1
      )
        out.truncated!.push(`"${el.textContent!.trim().slice(0, 30)}"`);
    }
    const sel =
      'a[href], button, input, select, textarea, [role="switch"], [role="radio"], [role="tab"], [role="button"], [role="checkbox"]';
    const ctrls = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(vis);
    // tap extensions that cover another control
    const eff = ctrls.map((el) => {
      const r = el.getBoundingClientRect();
      const a = getComputedStyle(el, '::after');
      const ext = a.content !== 'none' && a.position === 'absolute';
      const w = ext ? Math.max(r.width, parseFloat(a.width) || 0) : r.width;
      const h = ext ? Math.max(r.height, parseFloat(a.height) || 0) : r.height;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return { el, ext, l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2, own: r };
    });
    // a sticky or fixed bar (the tab bar, Save) is meant to sit over scrolled content; the dev handle is previews only
    const pinned = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const p = getComputedStyle(e).position;
        if (p === 'sticky' || p === 'fixed') return true;
      }
      return (
        el.hasAttribute('data-dev-handle') ||
        !!el.closest('[data-dev-handle]') ||
        el.getAttribute('aria-label') === 'Dev panel'
      );
    };
    for (const a of eff) {
      if (!a.ext || pinned(a.el)) continue;
      for (const b of eff) {
        if (a === b || a.el.contains(b.el) || b.el.contains(a.el) || pinned(b.el)) continue;
        const ow = Math.min(a.r, b.r) - Math.max(a.l, b.l);
        const oh = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (ow > 3 && oh > 3)
          out.covers!.push(
            `"${(a.el.getAttribute('aria-label') ?? a.el.textContent ?? '').trim().slice(0, 20)}" covers "${(b.el.getAttribute('aria-label') ?? b.el.textContent ?? '').trim().slice(0, 20)}" ${Math.round(ow)}x${Math.round(oh)}`,
          );
      }
    }
    // a heading is never smaller than the text it heads
    for (const h of Array.from(document.querySelectorAll<HTMLElement>('main h2, main h3')).filter(vis)) {
      const hs = parseFloat(getComputedStyle(h).fontSize);
      const body = h.nextElementSibling as HTMLElement | null;
      if (!body) continue;
      let max = 0;
      for (const t of Array.from(body.querySelectorAll<HTMLElement>('*')).concat(body)) {
        if (!vis(t) || !Array.from(t.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim())) continue;
        if (t.closest('svg, .num, [data-slot="hero"]')) continue;
        max = Math.max(max, parseFloat(getComputedStyle(t).fontSize));
      }
      if (max > hs + 0.5 && max <= 24) out.heading!.push(`"${h.textContent!.trim().slice(0, 30)}" ${hs}px < ${max}px`);
    }
    // placeholder words and float artefacts anywhere on the screen
    const bad = (document.body.innerText.match(/NaN|undefined|\[object|0\.30000000000000004|\bnull\b/g) ?? []).slice(
      0,
      3,
    );
    if (bad.length) out.badtext!.push(...bad);
    // the size hierarchy: titles 22, section headings 17 (or the 13 px label), inputs at least 16, nothing under 12
    for (const h of Array.from(document.querySelectorAll<HTMLElement>('header h1')).filter(vis)) {
      const f = parseFloat(getComputedStyle(h).fontSize);
      if (Math.abs(f - 22 * scale) > 0.6) out.sizes!.push(`title "${h.textContent}" ${f}px`);
    }
    for (const h of Array.from(document.querySelectorAll<HTMLElement>('main h2')).filter(vis)) {
      const f = parseFloat(getComputedStyle(h).fontSize);
      if (![17, 13, 22, 20].some((x) => Math.abs(f - x * scale) < 0.6))
        out.sizes!.push(`h2 "${h.textContent!.slice(0, 24)}" ${f}px`);
    }
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main input, main textarea')).filter(vis)) {
      const f = parseFloat(getComputedStyle(el).fontSize);
      if (f < 16 * scale - 0.6) out.sizes!.push(`input ${f}px`);
    }
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main *')).filter(vis)) {
      if (
        el.closest('svg, [data-dev-handle]') ||
        !Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim())
      )
        continue;
      const f = parseFloat(getComputedStyle(el).fontSize);
      if (f < 12 * scale - 0.6) out.sizes!.push(`"${(el.textContent ?? '').trim().slice(0, 20)}" ${f}px`);
    }
    // an intro is one short paragraph: more than two lines outside a card is a how-to
    for (const p of Array.from(document.querySelectorAll<HTMLElement>('main p')).filter(vis)) {
      if (
        p.closest(
          '[data-slot="card"], [data-slot="item"], [data-slot="empty"], [role="dialog"], form, [role="tabpanel"], button, li',
        )
      )
        continue;
      const lh = parseFloat(getComputedStyle(p).lineHeight) || parseFloat(getComputedStyle(p).fontSize) * 1.4;
      const lines = Math.round(p.getBoundingClientRect().height / lh);
      if (lines >= 3) out.intro!.push(`"${p.textContent!.trim().slice(0, 40)}" ${lines} lines`);
    }
    return out;
  }, scale);
}

const CONFIGS = [
  { name: '390-1x-minted-light', w: 390, h: 844, scale: false, look: 'minted', mode: 'light' },
  { name: '390-1x-copper-dark', w: 390, h: 844, scale: false, look: 'copper', mode: 'dark' },
  { name: '360-1.5x-minted-light', w: 360, h: 740, scale: true, look: 'minted', mode: 'light' },
  { name: '360-1.5x-firefly-dark', w: 360, h: 740, scale: true, look: 'firefly', mode: 'dark' },
  { name: '320-1.5x-minted-light', w: 320, h: 640, scale: true, look: 'minted', mode: 'light' },
];

for (const c of CONFIGS)
  test(`R3 survey ${c.name}`, async ({ browser }) => {
    test.setTimeout(900_000);
    const ctx = await browser.newContext({
      baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292',
      viewport: { width: c.w, height: c.h },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
    });
    if (c.scale) await ctx.addInitScript(() => localStorage.setItem('sen.dev.textScale', '1.5'));
    const page = await ctx.newPage();
    const w = watch(page);
    const report: Record<string, Record<string, string[]>> = {};
    for (const path of PATHS) {
      await open(page, path, c.look, c.mode);
      await page.waitForTimeout(450);
      const a = await audit(page, c.scale ? 1.5 : 1);
      const bad = Object.fromEntries(Object.entries(a).filter(([, v]) => v.length));
      if (Object.keys(bad).length) report[path] = bad;
    }
    fs.writeFileSync(
      `${TXT}r3-survey-${c.name}.json`,
      JSON.stringify({ report, errors: w.errors, external: w.external }, null, 1),
    );
    console.log(`SURVEY ${c.name}: ${Object.keys(report).length} screens with findings of ${PATHS.length}`);
    expect(w.external).toEqual([]);
    await ctx.close();
  });
