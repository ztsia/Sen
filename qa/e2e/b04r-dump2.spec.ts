import fs from 'node:fs';
import { test } from '@playwright/test';
import { TXT, open } from './b04r-helpers';
import { uid } from '../../apps/web/src/data/fake/ids';
test.use({ baseURL: 'http://127.0.0.1:5291' });
const P: Record<string, string> = {
  nk: `/s/split?id=${uid('split:nk')}`,
  hd: `/s/split?id=${uid('split:haidilao')}`,
  pubnew: '/s/split-public?id=demo-new',
  pubfinal: '/s/split-public?id=demo-final',
  receipt: `/s/receipt?id=${uid('receipt:nasi-kandar')}`,
  confirm: `/s/confirm?id=${uid('receipt:nasi-kandar')}`,
  member: '/s/settings/members',
};
for (const [k, path] of Object.entries(P))
  test(`dump ${k}`, async ({ page }) => {
    await open(page, path);
    await page.waitForTimeout(300);
    const t = await page.evaluate(() => {
      const names = [
        ...document.querySelectorAll(
          'button, a[href], [role=tab], [role=radio], [role=switch], [role=checkbox], input',
        ),
      ].map(
        (b) =>
          `[${b.getAttribute('role') ?? b.tagName.toLowerCase()}] ${(b.getAttribute('aria-label') ?? (b as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 70)}`,
      );
      return `${document.body.innerText}\n\n--- controls\n${names.join('\n')}`;
    });
    fs.writeFileSync(`${TXT}dump-${k}.txt`, t);
  });
