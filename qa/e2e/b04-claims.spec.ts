import { test } from '@playwright/test';
import { db, dump, open, shot, toast, watch } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });

test('claims: list, kit, copy, submitted double tap + Undo, ESS gating', async ({ page }) => {
  const w = watch(page);
  await open(page, '/s/claims');
  await dump(page, 'claims-list');
  const rows = await db<{ id: string; scheme: string; status: string; missing: string[]; amount: number }[]>(
    page,
    `(d) => d.claimState.claims.map(c=>({id:c.id,scheme:c.scheme,status:c.status,missing:c.missing,amount:c.amount}))`,
  );
  console.log(JSON.stringify(rows));
  const phone = rows.find((r) => r.scheme === 'Phone bill' && r.status === 'to_submit')!;
  const parking = rows.find((r) => r.scheme === 'Parking' && r.status === 'to_submit')!;
  await open(page, `/s/claim?id=${parking.id}`);
  await dump(page, 'claim-parking');
  await shot(page, 'FLOW-8-step-1-claim-parking-missing');
  const ess = page.getByRole('button', { name: /Send to ESS/ });
  console.log(
    'Send to ESS count (evidence missing):',
    await ess.count(),
    'disabled:',
    await ess
      .first()
      .isDisabled()
      .catch(() => 'n/a'),
  );
  await open(page, `/s/claim?id=${phone.id}`);
  await dump(page, 'claim-phone');
  await shot(page, 'FLOW-8-step-2-claim-phone');
  console.log('Send to ESS (complete):', await page.getByRole('button', { name: /Send to ESS/ }).count());
  // copy buttons: clipboard
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const copies = page.getByRole('button', { name: /^Copy/ });
  console.log(
    'copy buttons',
    await copies.count(),
    (await copies.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).join(' | '),
  );
  await copies.nth(2).click();
  console.log(
    'clipboard:',
    JSON.stringify(await page.evaluate(() => navigator.clipboard.readText()).catch((e) => String(e))),
  );
  // Submitted double tap
  const sub = page.getByRole('button', { name: 'Submitted', exact: true });
  await sub.dblclick();
  await page.waitForTimeout(800);
  console.log(
    'toast after dbl submitted:',
    JSON.stringify(
      await toast(page)
        .innerText()
        .catch(() => 'none'),
    ),
  );
  console.log('status:', await db<string>(page, `(d) => d.claimState.claims.find(c=>c.id==='${phone.id}').status`));
  await toast(page)
    .getByRole('button', { name: 'Undo' })
    .click()
    .catch(() => console.log('no undo'));
  await page.waitForTimeout(800);
  console.log(
    'status after undo:',
    await db<string>(page, `(d) => d.claimState.claims.find(c=>c.id==='${phone.id}').status`),
  );
  await shot(page, 'FLOW-8-step-3-after-submitted');
  console.log(w.errors.join('\n'));
});
