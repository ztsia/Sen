import { test } from '@playwright/test';
import { dialog, open } from './b04-helpers';
test.use({ baseURL: 'http://127.0.0.1:5180' });
test('F20 schema + composer + invite email', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async () => {
    const cmds: any = await import(/* @vite-ignore */ '/@fs/home/user/Sen/packages/core/src/commands.ts');
    const C = cmds.Command;
    const u = () => crypto.randomUUID();
    const L = (n: number) => 'x'.repeat(n);
    const sw = { capture: true, agent: true, splits: true, email: true, calendar: false, claims: false };
    const res: Record<string, string> = {};
    const p = (n: string, v: unknown) => {
      res[n] = C.safeParse(v).success ? 'ACCEPTED' : 'rejected';
    };
    p('setting.set huge record', {
      type: 'setting.set',
      key: 'claims.ess',
      value: Object.fromEntries(Array.from({ length: 50000 }, (_, i) => ['k' + i, L(50)])),
    });
    p('setting.set record 20 keys', {
      type: 'setting.set',
      key: 'claims.ess',
      value: { signedIn: true, capabilities: [], lastPayslip: null },
    });
    p('sen.answer 100k answer', { type: 'sen.answer', askId: 'a', answer: L(100000) });
    p('sen.answer 100k askId', { type: 'sen.answer', askId: L(100000), answer: 'x' });
    p('proposal.answer 100k id', { type: 'proposal.answer', id: L(100000), answer: 'apply' });
    p('memory.forget 100k id', { type: 'memory.forget', id: L(100000) });
    p('research.confirm 100k', { type: 'research.confirm', messageId: L(100000) });
    p('invite email 255+', {
      type: 'member.invite',
      email: L(300) + '@example.com',
      shell: true,
      switches: sw,
      welcome: 0,
      allowance: 0,
    });
    p('sen.send 4001', { type: 'sen.send', id: 'a', text: L(4001), file: null, from: 'home' });
    p('sen.send id 100k', { type: 'sen.send', id: L(100000), text: 'hi', file: null, from: 'home' });
    p('sen.send file name 100k', {
      type: 'sen.send',
      id: 'a',
      text: 'hi',
      file: { name: L(100000), kind: 'pdf' },
      from: 'home',
    });
    p('txn.note 100k (B03)', { type: 'txn.note', id: u(), note: L(100000) });
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  await open(page, '/');
  await page.getByRole('button', { name: 'Ask Sen', exact: true }).click();
  const box = dialog(page, 'Sen').getByLabel('Message to Sen');
  await box.fill('y'.repeat(5000));
  console.log('composer length after fill(5000):', (await box.inputValue()).length);
  await box.fill('');
  await page.keyboard.insertText('z'.repeat(4500));
  console.log('composer length after pasting 4500:', (await box.inputValue()).length);
  await open(page, '/s/settings/members');
  await page.getByRole('button', { name: 'Invite', exact: true }).click();
  await page.waitForTimeout(500);
  const emails = [
    'a@',
    '<script>@x.co',
    'a@b.c',
    'a..b@x.co',
    'a@-b.co',
    'a@b-.co',
    'a@x.co.',
    'ñ@x.co',
    'a+tag@x.co',
    ' B@X.CO ',
    'a b@x.co',
    '.a@x.co',
    'a.@x.co',
    'a@x..co',
    'a@@x.co',
    'a@x.c0',
    'x'.repeat(300) + '@example.com',
    'x'.repeat(64) + '@' + 'y'.repeat(60) + '.com',
    'a@' + 'y'.repeat(70) + '.com',
  ];
  for (const e of emails) {
    await page.getByLabel('Their email').fill(e);
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await page.waitForTimeout(400);
    const msg = await page.getByText('Type their email, like name@example.com.').count();
    console.log(
      'EMAIL',
      JSON.stringify(e.length > 30 ? e.slice(0, 14) + '…(len ' + e.length + ')' : e).padEnd(34),
      msg ? 'refused' : 'ACCEPTED',
    );
    if (!msg) {
      await page
        .getByRole('button', { name: 'Invite', exact: true })
        .click()
        .catch(() => {});
      await page.waitForTimeout(500);
    }
  }
});
