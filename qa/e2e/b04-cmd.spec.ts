import { test } from '@playwright/test';
test.use({ baseURL: 'http://127.0.0.1:5180' });
test('shared command contract with hostile payloads (fake apply + zod)', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async () => {
    const mod = await import(/* @vite-ignore */ '/src/data/index.ts');
    const b = (await mod.backend()) as unknown as { db(): any };
    const db = b.db();
    const area = await import(/* @vite-ignore */ '/src/data/fake/areas/index.ts');
    const views = await import(/* @vite-ignore */ '/src/data/fake/views.ts');
    const cmds = await import(/* @vite-ignore */ '/@fs/home/user/Sen/packages/core/src/commands.ts');
    const ctx = { offline: false, later() {} };
    const res: Record<string, unknown> = {};
    const acct = db.accounts.find((a: any) => a.kind === 'tracked');
    const bal0 = views.balances(db).get(acct.id);
    // duplicate account in one balance.check
    try {
      const target = bal0 + 10000;
      area.applyArea(db, { type: 'balance.check', checks: [{ accountId: acct.id, balance: target }, { accountId: acct.id, balance: target }] }, ctx);
      const bal1 = views.balances(db).get(acct.id);
      res.dupCheck = { before: bal0, typed: target, after: bal1, adjustmentsBooked: db.txns.filter((t: any) => t.kind === 'adjustment').length };
    } catch (e) { res.dupCheck = 'threw ' + String(e); }
    // zod: which hostile payloads does the shared Command schema accept?
    const C = cmds.Command;
    const longS = 'x'.repeat(100000);
    const probe = (name: string, v: unknown) => { const r = C.safeParse(v); res[name] = r.success ? 'ACCEPTED' : 'rejected'; };
    probe('invite 100k email', { type: 'member.invite', email: longS, shell: true, switches: { capture: true, agent: true, splits: true, email: true, calendar: false, claims: false }, welcome: 0, allowance: 0 });
    probe('sen.send 100k text', { type: 'sen.send', id: 'a', text: longS, file: null, from: 'home' });
    probe('split.assign 100k name', { type: 'split.assign', splitId: crypto.randomUUID(), itemId: crypto.randomUUID(), to: longS });
    probe('setting.set weird key', { type: 'setting.set', key: '../../__proto__', value: { a: 1 } });
    probe('balance.check 10000 rows', { type: 'balance.check', checks: Array.from({ length: 10000 }, () => ({ accountId: crypto.randomUUID(), balance: 1 })) });
    probe('balance.check float', { type: 'balance.check', checks: [{ accountId: crypto.randomUUID(), balance: 1.5 }] });
    probe('balance.check NaN', { type: 'balance.check', checks: [{ accountId: crypto.randomUUID(), balance: NaN }] });
    probe('member.set grant huge', { type: 'member.set', id: crypto.randomUUID(), key: 'grant', value: 9007199254740991 });
    probe('claim.submitted essRef 100k', { type: 'claim.submitted', id: crypto.randomUUID(), essRef: longS });
    // grant overflow in the fake
    try {
      const m = db.settings.members.find((x: any) => x.email !== db.settings.email);
      area.applyArea(db, { type: 'member.set', id: m.id, key: 'grant', value: 9007199254740991 }, ctx);
      area.applyArea(db, { type: 'member.set', id: m.id, key: 'grant', value: 9007199254740991 }, ctx);
      res.grantOverflow = { balance: m.balance, safe: Number.isSafeInteger(m.balance) };
    } catch (e) { res.grantOverflow = 'threw ' + String(e); }
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
});
