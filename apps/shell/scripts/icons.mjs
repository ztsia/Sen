// Writes the shell's launcher, notification and splash icons into the Android resources, from the
// looks' own drawings in docs/ui/directions/assets/<look>/ (the one source; change those, then run
// this). Chromium renders each SVG at every density, so the PNGs match what the design pages show.
//
//   node apps/shell/scripts/icons.mjs
//
// Two looks for now: Minted, the default icon, and Instrument, for the Switch icon test (D77,
// docs/local.md). The rest join when the icon follows the look.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const ASSETS = path.join(ROOT, 'docs/ui/directions/assets');
const RES = path.join(ROOT, 'apps/shell/android/app/src/main/res');
const LOOKS = ['minted', 'instrument'];
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const browser = await chromium.launch(process.env.PLAYWRIGHT_BROWSERS_PATH ? {} : {});
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function render(svgFile, px, out) {
  const svg = fs.readFileSync(svgFile, 'utf8');
  const src = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><img src="${src}" style="display:block;width:${px}px;height:${px}px"></body></html>`,
  );
  await page.locator('img').evaluate((img) => img.decode());
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
}

for (const look of LOOKS) {
  const dir = path.join(ASSETS, look);
  for (const [d, k] of Object.entries(DENSITIES)) {
    const mip = path.join(RES, `mipmap-${d}`);
    // Adaptive layers on the 108 dp canvas, and the legacy 48 dp icon for Android 7 (minSdk 24).
    for (const layer of ['background', 'foreground', 'monochrome']) {
      await render(
        path.join(dir, 'launcher', `${layer}.svg`),
        Math.round(108 * k),
        path.join(mip, `ic_launcher_${look}_${layer}.png`),
      );
    }
    await render(
      path.join(dir, 'launcher', 'preview.svg'),
      Math.round(48 * k),
      path.join(mip, `ic_launcher_${look}.png`),
    );
    // The notification icon, a white silhouette on 24 dp.
    await render(
      path.join(dir, 'notification.svg'),
      Math.round(24 * k),
      path.join(RES, `drawable-${d}`, `ic_stat_${look}.png`),
    );
  }
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<!-- Written by apps/shell/scripts/icons.mjs from docs/ui/directions/assets/${look}/launcher/. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_${look}_background" />
    <foreground android:drawable="@mipmap/ic_launcher_${look}_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_${look}_monochrome" />
</adaptive-icon>
`;
  fs.mkdirSync(path.join(RES, 'mipmap-anydpi-v26'), { recursive: true });
  fs.writeFileSync(path.join(RES, 'mipmap-anydpi-v26', `ic_launcher_${look}.xml`), xml);
}
await browser.close();
console.log(`icons: ${LOOKS.join(', ')} at ${Object.keys(DENSITIES).length} densities`);
