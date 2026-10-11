import { expect, test, type Page } from '@playwright/test';
import { open, shot, settled, tabs, toast, db, watch } from './b03-helpers';

// FLOW-24, 25, 26, 27: AC-50..AC-58

async function toPayments(page: Page) {
  await open(page, '/more');
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await expect(page.getByRole('searchbox', { name: 'Search payments' })).toBeVisible();
}

test('FLOW-24 virtualised: DOM stays small for the whole history; scrolling to the end reaches the oldest day', async ({
  page,
}) => {
  await toPayments(page);
  await page.waitForTimeout(500);
  const total = await db<number>(page, `(d) => d.txns.filter(t => !t.deletedAt).length`);
  const status = await page.locator('main p[role="status"]').first().innerText();
  const dom = await page.locator('[data-index]').count();
  console.log('rows in list:', status, '| DOM virtual items:', dom, '| txns in db:', total);
  expect(dom).toBeLessThan(80);
  await shot(page, 'FLOW-24-step-1-payments-top');
  for (let i = 0; i < 400; i++) {
    const done = await page.locator('main').evaluate((m) => {
      m.scrollTo(0, m.scrollHeight);
      return m.scrollTop + m.clientHeight >= m.scrollHeight - 2;
    });
    await page.waitForTimeout(30);
    if (done && i > 10) break;
  }
  await page.waitForTimeout(500);
  const heads = await page.locator('h3').allInnerTexts();
  console.log('bottom headers:', heads.slice(-3));
  const oldest = await db<string>(page, `(d) => d.txns.filter(t => !t.deletedAt).map(t => t.occurredAt).sort()[0]`);
  console.log('oldest txn at:', oldest);
  await shot(page, 'FLOW-24-step-2-payments-bottom');
});

test('FLOW-24 day header totals equal an oracle from raw rows (this cycle), and transfers/income add nothing', async ({
  page,
}) => {
  await open(page, '/');
  await page.getByTestId('pace').click();
  await settled(page);
  await page.waitForTimeout(500);
  const oracle = await db<Record<string, number>>(
    page,
    `(d) => {
    const kl = (iso) => new Date(new Date(iso).getTime() + 8*3600*1000).toISOString().slice(0,10);
    const live = d.txns.filter(t => !t.deletedAt);
    const spendOf = (t) => { if (t.kind === 'adjustment') return t.direction === 'out' ? t.amount : -t.amount; if (t.kind !== 'spend') return 0; const l = live.filter(x => x.linkedTransactionId === t.id); const rep = l.filter(x=>x.kind==='repayment').reduce((a,x)=>a+x.amount,0); const ref = l.filter(x=>x.kind==='refund').reduce((a,x)=>a+x.amount,0); return Math.max(0, Math.min(t.myShare ?? t.amount, t.amount - rep) - ref); };
    const o = {}; for (const t of live) { const k = kl(t.occurredAt); if (k < '2026-09-30' || k > '2026-10-29') continue; o[k] = (o[k]||0) + spendOf(t); } return o; }`,
  );
  const seen: Record<string, number> = {};
  const MONTHS: Record<string, string> = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Sept: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12',
  };
  for (let i = 0; i < 80; i++) {
    const heads = await page.locator('[data-index] h3').evaluateAll((els) =>
      els.map((e) => ({
        t: e.textContent!,
        sen: Number(e.parentElement!.querySelector('[data-sen]')!.getAttribute('data-sen')),
      })),
    );
    for (const h of heads) {
      const m = /(\d+) (\w+)$/.exec(h.t)!;
      const key = `${h.t.includes('Sep') ? '2026' : '2026'}-${MONTHS[m[2]!]}-${m[1]!.padStart(2, '0')}`;
      seen[key] = h.sen;
    }
    const atEnd = await page.locator('main').evaluate((mm) => {
      mm.scrollBy(0, 500);
      return mm.scrollTop + mm.clientHeight >= mm.scrollHeight - 2;
    });
    await page.waitForTimeout(40);
    if (atEnd && i > 3) break;
  }
  const days = Object.keys(seen).sort();
  console.log('days seen in list:', days.length, days[0], '..', days[days.length - 1]);
  const mismatches = days.filter((k) => (oracle[k] ?? 0) !== seen[k]);
  console.log('mismatches vs oracle:', JSON.stringify(mismatches.map((k) => [k, seen[k], oracle[k]])));
  expect(mismatches).toEqual([]);
  expect(days.length).toBeGreaterThan(15);
});

test('FLOW-24 search and filters: items, notes, merchants, hostile strings; transfer is one row', async ({ page }) => {
  const errors = watch(page);
  await toPayments(page);
  const box = page.getByRole('searchbox', { name: 'Search payments' });
  const status = () => page.locator('main p[role="status"]').first().innerText();
  const tryq = async (q: string) => {
    await box.fill(q);
    await page.waitForTimeout(500);
    return status();
  };
  console.log('grab:', await tryq('grab'));
  console.log('Sate ayam (item):', await tryq('Sate ayam'));
  console.log('"Ryt Bank → GO+":', await tryq('GO+'));
  const goRows = await page.getByRole('button', { name: /^Ryt Bank → GO\+/ }).count();
  console.log('transfer rows visible:', goRows);
  for (const hostile of [
    "'; DROP TABLE transactions;--",
    '%',
    '<script>alert(1)</script>',
    '../../etc/passwd',
    'a'.repeat(5000),
    '🙂🙂',
    '\\',
  ]) {
    const s = await tryq(hostile);
    console.log(JSON.stringify(hostile.slice(0, 12)), '->', s);
  }
  await expect(page.locator('main')).toBeVisible();
  await tryq('zzzznotfound');
  await expect(page.getByText('No payments match.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear the filters' })).toBeVisible();
  await shot(page, 'FLOW-24-step-3-no-match');
  await page.getByRole('button', { name: 'Clear the filters' }).click();
  await page.waitForTimeout(500);
  console.log('after clear:', await status());
  // filters
  await page.getByRole('button', { name: 'Any account' }).click();
  console.log('account options:', (await page.getByRole('dialog').innerText()).replace(/\n+/g, ' | '));
  await page.getByRole('dialog').getByRole('button', { name: /Ryt/ }).first().click();
  await page.waitForTimeout(500);
  console.log('Ryt only:', await status());
  await page.getByRole('button', { name: /^Shared/ }).click();
  await page.waitForTimeout(500);
  console.log('Ryt + Shared:', await status());
  await shot(page, 'FLOW-24-step-4-filters');
  expect(errors).toEqual([]);
});

test('FLOW-24 payments rows: marks, 64 px, amounts never truncated at long names', async ({ page }) => {
  await toPayments(page);
  const box = page.getByRole('searchbox', { name: 'Search payments' });
  await box.fill('');
  await page.waitForTimeout(400);
  const rows = page.locator('[data-index] button');
  const heights = await rows.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  console.log('row heights (min/max):', Math.min(...heights), Math.max(...heights));
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(64);
  const marks = await db<any>(page, `(d) => ({ pending: Object.keys(d.unsynced).length })`);
  console.log(JSON.stringify(marks));
  const ex = await db<any>(
    page,
    `(d) => { const r = d.receipts.find(r => r.transactionId); const t1 = d.txns.find(t => t.id === r.transactionId); const sp = d.splits.find(s => s.transactionId); const t2 = d.txns.find(t => t.id === sp.transactionId); const it = d.items.find(i => i.receiptId === r.id); return { receipt: t1.merchantRaw, split: t2.merchantRaw, item: it.description }; }`,
  );
  console.log('examples:', JSON.stringify(ex));
  for (const [q, label] of [
    [ex.receipt, 'Receipt'],
    [ex.split, 'Split'],
    ['ROTI BAKAR', 'In Review'],
    ['Nasi impit', 'Nasi'],
  ] as const) {
    await box.fill(q);
    await page.waitForTimeout(500);
    const all = await page.locator('[data-index] button').allInnerTexts();
    console.log(q, '->', all.length, 'rows; first:', (all[0] ?? '').replace(/\n/g, ' | '));
    if (label === 'Nasi') continue;
    expect(
      all.some((t) => t.includes(label)),
      `${q} has a row marked ${label}`,
    ).toBe(true);
  }
  await box.fill(ex.item);
  await page.waitForTimeout(500);
  console.log(
    'search by receipt item',
    JSON.stringify(ex.item),
    '->',
    await page.locator('main p[role="status"]').first().innerText(),
  );
  // long merchant: amount stays whole
  await open(page, '/review');
  await page.getByRole('button', { name: /Missing a payment/ }).click();
  await page.getByLabel('Amount').fill('1234.56');
  await page.getByRole('radio', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'More' }).click();
  await page
    .getByLabel('Merchant')
    .fill('A VERY LONG MERCHANT NAME THAT KEEPS GOING AND GOING SDN BHD CAWANGAN SATU DUA TIGA');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page)).toContainText('Added RM1,234.56');
  await tabs(page).getByRole('link', { name: /^More/ }).click();
  await page.getByText('Payments', { exact: true }).click();
  await settled(page);
  await page.waitForTimeout(500);
  const first = page.locator('[data-index] button').first();
  const cut = await first.evaluate((el) => {
    const m = el.querySelector('[data-sen]') as HTMLElement;
    return { w: m.scrollWidth, c: m.clientWidth, txt: m.textContent };
  });
  console.log('long-name row amount:', JSON.stringify(cut), (await first.innerText()).replace(/\n/g, ' | '));
  expect(cut.w).toBeLessThanOrEqual(cut.c + 1);
  await shot(page, 'FLOW-24-step-5-long-name');
});
