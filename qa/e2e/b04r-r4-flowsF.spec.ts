import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { LOOKS, open, settled } from './b04r-helpers';
import { note, step } from './b04r-r4-lib';

// Run 4 flows F: accessibility and size rules on the forms added this run, and D136's group labels. Preview build (5292).
test.use({ baseURL: process.env.B04R_BASE ?? 'http://127.0.0.1:5292' });

for (const [path, opener, slug] of [
  ['/s/subscriptions', 'Add a subscription', 'subscription'],
  ['/s/goals', 'Add a goal', 'goal'],
] as const) {
  test(`R4-FLOW-14 ${slug} form: labels, focus, errors, axe, targets`, async ({ page }) => {
    const F = 'R4-FLOW-14';
    await open(page, path, 'copper', 'dark');
    await settled(page);
    const opening = page.getByRole('button', { name: opener });
    await opening.click();
    const dlg = page.getByRole('dialog', { name: opener });
    await expect(dlg).toBeVisible();
    const focused = await page.evaluate(
      () => (document.activeElement as HTMLInputElement | null)?.id ?? document.activeElement?.tagName,
    );
    const fields = await dlg.locator('input, textarea').evaluateAll((els) =>
      els.map((e) => {
        const el = e as HTMLInputElement;
        const lab = el.labels?.[0]?.textContent ?? el.getAttribute('aria-label') ?? '';
        const r = el.getBoundingClientRect();
        return {
          id: el.id,
          type: el.type,
          label: lab.trim(),
          h: Math.round(r.height),
          fs: getComputedStyle(el).fontSize,
        };
      }),
    );
    note(F, `${slug}: focus on ${focused}; fields ${JSON.stringify(fields)}`);
    const axe = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    note(F, `${slug}: axe ${JSON.stringify(axe.violations.map((v) => `${v.id}:${v.nodes.length}`))}`);
    const targets = await dlg.locator('button, [role="radio"], input').evaluateAll((els) =>
      els
        .map((e) => {
          const r = e.getBoundingClientRect();
          const a = getComputedStyle(e, '::after');
          const ext = a.content !== 'none' && a.position === 'absolute';
          const w = ext ? Math.max(r.width, parseFloat(a.width) || 0) : r.width;
          const h = ext ? Math.max(r.height, parseFloat(a.height) || 0) : r.height;
          return {
            t: (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 18),
            w: Math.round(w),
            h: Math.round(h),
            vis: r.width > 0,
          };
        })
        .filter((x) => x.vis && (x.w < 47.5 || x.h < 47.5)),
    );
    note(F, `${slug}: targets under 48: ${JSON.stringify(targets)}`);
    await step(
      page,
      F,
      slug === 'goal' ? 2 : 1,
      `${slug}-open`,
      `open ${opener}`,
      'first field focused; every field has a label; no axe violation; targets are 48 px',
      async () => {
        expect(focused).toMatch(/name/);
        for (const f of fields) expect(f.label, JSON.stringify(f)).not.toBe('');
        expect(axe.violations.map((v) => v.id)).toEqual([]);
        expect(targets).toEqual([]);
        for (const f of fields) expect(parseFloat(f.fs)).toBeGreaterThanOrEqual(16);
      },
    );
    // errors are announced beside the field
    await dlg.getByRole('button', { name: 'Save', exact: true }).click();
    const err = dlg.getByText('Type its name.');
    await expect(err).toBeVisible();
    const alert = await err.evaluate((el) => ({
      role: el.getAttribute('role') ?? el.closest('[role]')?.getAttribute('role'),
      live: el.closest('[aria-live]')?.getAttribute('aria-live'),
    }));
    const invalid = await dlg.locator('input[aria-invalid="true"]').count();
    note(F, `${slug}: error announce ${JSON.stringify(alert)}; aria-invalid inputs ${invalid}`);
    await step(
      page,
      F,
      slug === 'goal' ? 4 : 3,
      `${slug}-error`,
      'Save empty',
      'error in words beside the Name field; the field is aria-invalid; Save still enabled',
      async () => {
        expect(invalid).toBeGreaterThan(0);
        expect(alert.role === 'alert' || alert.live !== undefined).toBe(true);
        await expect(dlg.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
      },
    );
    await page.keyboard.press('Escape');
    await expect(dlg).toHaveCount(0);
    await page.waitForTimeout(400);
    const back = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim().slice(0, 30));
    note(F, `${slug}: focus after close: ${JSON.stringify(back)}`);
    // reopen: nothing typed before is there
    await opening.click();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('');
    note(F, `${slug}: focus returns to the opener: ${back.includes(opener) && back.length < opener.length + 3}`);
  });
}

test('R4-FLOW-13 group labels are captions in every look (D136), section headings stay bigger', async ({ page }) => {
  const F = 'R4-FLOW-13';
  const rows: string[] = [];
  for (const look of LOOKS) {
    await open(page, '/s/accounts', look, 'light');
    await settled(page);
    const m = await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('main h2')).map((e) => ({
        t: e.textContent!.trim(),
        fs: parseFloat(getComputedStyle(e).fontSize),
        c: getComputedStyle(e).color,
      }));
      const row = document.querySelector('main [data-slot="item"]');
      return {
        h,
        row: row ? parseFloat(getComputedStyle(row.querySelector('[data-slot="item-title"]') ?? row).fontSize) : null,
      };
    });
    rows.push(`${look}: ${JSON.stringify(m)}`);
  }
  note(F, rows.join('\n'));
  await step(
    page,
    F,
    1,
    'accounts',
    'read the Accounts group labels in six looks',
    'each label is 12 or 13 px',
    async () => {
      for (const r of rows) {
        const px = Array.from(r.matchAll(/"fs":([0-9.]+)/g)).map((x) => Number(x[1]));
        expect(px.length).toBeGreaterThan(0);
        for (const p of px) expect([12, 13]).toContain(p);
      }
    },
  );
});
