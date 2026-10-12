import { test } from '@playwright/test';
import { dialog, open } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
test('F11: commands schema and fake', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async () => {
    const cmds: any = await import(/* @vite-ignore */ '/@fs/home/user/Sen/packages/core/src/commands.ts');
    const C = cmds.Command;
    const u = () => crypto.randomUUID();
    const L = (n: number) => 'x'.repeat(n);
    const sw = { capture: true, agent: true, splits: true, email: true, calendar: false, claims: false };
    const res: Record<string, string> = {};
    const p = (name: string, v: unknown) => {
      const r = C.safeParse(v);
      res[name] = r.success ? 'ACCEPTED' : 'rejected';
    };
    p('invite email 254', {
      type: 'member.invite',
      email: L(242) + '@example.com',
      shell: true,
      switches: sw,
      welcome: 0,
      allowance: 0,
    });
    p('invite email 255+', {
      type: 'member.invite',
      email: L(300) + '@example.com',
      shell: true,
      switches: sw,
      welcome: 0,
      allowance: 0,
    });
    p('sen.send 4000', { type: 'sen.send', id: 'a', text: L(4000), file: null, from: 'home' });
    p('sen.send 4001', { type: 'sen.send', id: 'a', text: L(4001), file: null, from: 'home' });
    p('assign name 60', { type: 'split.assign', splitId: u(), itemId: u(), to: L(60) });
    p('assign name 61', { type: 'split.assign', splitId: u(), itemId: u(), to: L(61) });
    p('assign name spaces only', { type: 'split.assign', splitId: u(), itemId: u(), to: '   ' });
    p('balance.check 0 rows', { type: 'balance.check', checks: [] });
    p('balance.check 51 rows', {
      type: 'balance.check',
      checks: Array.from({ length: 51 }, () => ({ accountId: u(), balance: 1 })),
    });
    const same = u();
    p('balance.check duplicate account', {
      type: 'balance.check',
      checks: [
        { accountId: same, balance: 1 },
        { accountId: same, balance: 2 },
      ],
    });
    p('balance.check negative ok', { type: 'balance.check', checks: [{ accountId: u(), balance: -5 }] });
    p('grant 9e15', { type: 'member.set', id: u(), key: 'grant', value: 9007199254740991 });
    p('grant 9.99e12', { type: 'member.set', id: u(), key: 'grant', value: 9999999999999 });
    p('essRef 65', { type: 'claim.submitted', id: u(), essRef: L(65) });
    p('setting.set key 101', { type: 'setting.set', key: L(101), value: true });
    p('setting.set string 2001', { type: 'setting.set', key: 'you.bankNames', value: L(2001) });
    p('setting.set huge record', {
      type: 'setting.set',
      key: 'claims.ess',
      value: Object.fromEntries(Array.from({ length: 50000 }, (_, i) => ['k' + i, L(50)])),
    });
    p('sen.answer 100k answer', { type: 'sen.answer', askId: 'a', answer: L(100000) });
    p('proposal.answer 100k id', { type: 'proposal.answer', id: L(100000), answer: 'apply' });
    p('memory.forget 100k id', { type: 'memory.forget', id: L(100000) });
    p('research.confirm 100k', { type: 'research.confirm', messageId: L(100000) });
    p('member.set string 201', { type: 'member.set', id: u(), key: 'status', value: L(201) });
    p('invite welcome float', {
      type: 'member.invite',
      email: 'a@example.com',
      shell: true,
      switches: sw,
      welcome: 1.5,
      allowance: 0,
    });
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
});
test('F11: composer with 5000 characters, and the fake refuses a duplicate balance check', async ({ page }) => {
  await open(page, '/');
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  const d = dialog(page, 'Sen');
  const box = d.getByLabel('Message to Sen');
  await box.fill('y'.repeat(5000));
  console.log('composer value length after fill(5000):', (await box.inputValue()).length);
  await d.getByRole('button', { name: /Send/i }).click();
  await page.waitForTimeout(1500);
  console.log(
    'toasts',
    JSON.stringify(await page.locator('[data-sonner-toast]').allInnerTexts()),
    '| shown in sheet:',
    /y{200}/.test(await d.innerText()),
  );
});
