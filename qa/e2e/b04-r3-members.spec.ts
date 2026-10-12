import { test } from '@playwright/test';
import { db, dialog, open, shot, text } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
const L = async (p: import('@playwright/test').Page, n = 30) =>
  (await text(p))
    .split('\n')
    .filter((l) => l && !/EVERY SEN|^Home$|^Review$|^Scan$|^Insights$|^More$|to review|^\d+$/.test(l))
    .slice(0, n)
    .join(' | ');
const toasts = (p: import('@playwright/test').Page) => p.locator('[data-sonner-toast]').allInnerTexts();
const members = (p: import('@playwright/test').Page) =>
  db<string>(
    p,
    `(d) => JSON.stringify(d.settings.members.map(m=>[m.email,m.status,m.unlimited,m.balance,m.allowance]))`,
  );

test('sign-in expired invitation', async ({ page }) => {
  await open(page, '/s/sign-in?state=expired');
  console.log('EXPIRED:', (await L(page, 10)).slice(0, 300));
  await shot(page, 'R3-SI-step-1-expired');
  await page.getByRole('button', { name: 'Ask for a new invitation' }).click();
  await page.waitForTimeout(500);
  console.log('toast:', JSON.stringify(await toasts(page)));
  console.log(
    'has email field:',
    await page.getByLabel('Your email').count(),
    '| Send the code:',
    await page.getByRole('button', { name: 'Send the code' }).count(),
  );
  await open(page, '/s/sign-in?state=bogus');
  console.log('?state=bogus:', (await L(page, 3)).slice(0, 100));
  await open(page, '/s/sign-in?state=expired&email=farid%40example.com');
  console.log('expired + email:', (await L(page, 5)).slice(0, 150));
  await page.goto('http://127.0.0.1:5182/s/sign-in?state=expired').catch(() => {});
});

test('members: unlimited at invite, resend, revoke + Undo, remove with export', async ({ page }) => {
  await open(page, '/s/settings/members');
  console.log('start', await members(page));
  await page.getByRole('button', { name: 'Invite', exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByLabel('Their email').fill('zed@example.com');
  await page.getByRole('switch', { name: /Unlimited/ }).click();
  console.log('allowance field with Unlimited on:', await page.getByLabel('Monthly allowance').count());
  await shot(page, 'R3-MEM-step-1-invite-unlimited');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await page.waitForTimeout(800);
  console.log('after invite', await members(page), JSON.stringify(await toasts(page)));
  await page.getByRole('button', { name: /^Zed/ }).click();
  await page.waitForTimeout(600);
  const sheetText = (await dialog(page, /Zed/).innerText()).split('\n').filter(Boolean);
  console.log(
    'Zed sheet:',
    JSON.stringify(sheetText.filter((l) => /Unlimited|Resend|Revoke|Remove|Suspend|Allowance|Balance/.test(l))),
  );
  await shot(page, 'R3-MEM-step-2-zed-sheet');
  await page.getByRole('button', { name: 'Resend' }).dblclick();
  await page.waitForTimeout(700);
  console.log('Resend toasts', JSON.stringify(await toasts(page)));
  await page.getByRole('button', { name: 'Revoke' }).click();
  await page.waitForTimeout(800);
  console.log('after Revoke', await members(page), JSON.stringify(await toasts(page)));
  await page.locator('[data-sonner-toast]').first().getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(800);
  console.log('after Undo', await members(page));
  await shot(page, 'R3-MEM-step-3-revoke-undone');
  // Resend/Revoke only for invited: open Hui Min (active)
  await page.getByRole('button', { name: /^Hui Min/ }).click();
  await page.waitForTimeout(600);
  const hui = (await dialog(page, /Hui Min/).innerText()).split('\n');
  console.log(
    'Hui Min sheet has Resend/Revoke:',
    hui.some((l) => /^Resend$|^Revoke$/.test(l)),
    '| has Remove:',
    hui.includes('Remove'),
  );
  await page
    .getByRole('dialog', { name: /Hui Min/ })
    .getByRole('button', { name: 'Remove', exact: true })
    .click();
  await page.waitForTimeout(600);
  console.log(
    'Remove step:',
    (await dialog(page, /Remove Hui Min/).innerText()).split('\n').filter(Boolean).join(' | ').slice(0, 300),
  );
  await shot(page, 'R3-MEM-step-4-remove-step');
  await page.getByRole('button', { name: 'Keep them' }).click();
  await page.waitForTimeout(500);
  console.log('after Keep them:', await members(page));
  await page
    .getByRole('dialog', { name: /Hui Min/ })
    .getByRole('button', { name: 'Remove', exact: true })
    .click();
  await page.getByRole('button', { name: 'Export their data first' }).click();
  await page.waitForTimeout(900);
  console.log('after export+remove:', await members(page), JSON.stringify(await toasts(page)));
});

test('members: invite sad paths and seats', async ({ page }) => {
  await open(page, '/s/settings/members');
  await page.getByRole('button', { name: 'Invite', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByLabel('Their email').fill('dup@example.com');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Invite', exact: true }).click();
  await page.getByLabel('Their email').fill('DUP@example.com');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await page.waitForTimeout(700);
  console.log('duplicate (case-insensitive):', await members(page), JSON.stringify(await toasts(page)));
  // owner row
  await page.getByRole('button', { name: /^Wei Ming/ }).click();
  await page.waitForTimeout(500);
  console.log(
    'owner sheet buttons:',
    JSON.stringify(
      (
        await dialog(page, /Wei Ming/)
          .getByRole('button')
          .allInnerTexts()
      ).filter(Boolean),
    ).slice(0, 200),
  );
});

test('member.* refused for non-admins (command level) and revoke/resend sad paths', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1200);
  const res = await page.evaluate(async () => {
    const mod: any = await import(/* @vite-ignore */ '/src/data/index.ts');
    const db = (await mod.backend()).db();
    const area: any = await import(/* @vite-ignore */ '/src/data/fake/areas/index.ts');
    const ctx = { offline: false, later() {} };
    const out: any = {};
    const run = (k: string, cmd: any) => {
      try {
        out[k] = 'ok: ' + area.applyArea(db, cmd, ctx)?.said;
      } catch (e) {
        out[k] = 'refused: ' + String(e).slice(0, 60);
      }
    };
    const active = db.settings.members.find((m: any) => m.status === 'active' && m.email !== db.settings.email);
    const invited = db.settings.members.find((m: any) => m.status === 'invited');
    run('admin resend active', { type: 'member.resend', id: active.id });
    run('admin revoke active', { type: 'member.revoke', id: active.id });
    run('admin resend invited', { type: 'member.resend', id: invited.id });
    run('admin resend unknown', { type: 'member.resend', id: crypto.randomUUID() });
    db.settings.admin = false;
    const ids = { a: active.id, i: invited.id };
    for (const t of ['invite', 'set', 'resend', 'revoke', 'remove']) {
      const cmd: any =
        t === 'invite'
          ? {
              type: 'member.invite',
              email: 'x@example.com',
              shell: false,
              switches: { capture: false, agent: true, splits: true, email: true, calendar: false, claims: false },
              welcome: 0,
              allowance: 0,
              unlimited: false,
            }
          : t === 'set'
            ? { type: 'member.set', id: ids.a, key: 'unlimited', value: true }
            : { type: 'member.' + t, id: ids.i };
      run('non-admin ' + t, cmd);
    }
    out.membersAfter = db.settings.members.length;
    return out;
  });
  console.log(JSON.stringify(res, null, 1));
});
