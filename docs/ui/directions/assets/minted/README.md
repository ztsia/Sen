# Minted: assets

Everything Minted draws, as files the app can use, written by `docs/ui/directions/build.mjs` from `src/minted.js` and `src/minted.css`. Don't edit these by hand: change the source and rebuild. The page itself is `docs/ui/directions/minted.html`, and its fonts are in `../fonts/`.

| Path | What it is |
|---|---|
| `theme.css` | shadcn/ui's tokens and Sen's money tokens, light and dark, in OKLCH |
| `tokens.json` | The same tokens with the look's own variables, as hex |
| `launcher/` | The adaptive icon on Android's 108 dp canvas: `background.svg`, `foreground.svg`, `monochrome.svg` for themed icons, and `preview.svg` in a squircle mask |
| `notification.svg` | The 24 dp notification icon, a flat silhouette |
| `tabs/light/`, `tabs/dark/` | The tab bar: each icon idle (`home.svg`) and active (`home-active.svg`) on the shared outlines in `../tab-outlines.json`, the scan button and the badge |
| `marks/light/strip.svg`, `marks/dark/strip.svg` | The cycle strip on Home, on day 19 of 31 |
| `marks/rosette.svg` | The guilloché rosette, as on the page and behind the wordmark |
| `marks/seal.svg` | The foil seal on the payday card |
| `marks/light/microprint.svg`, `marks/dark/microprint.svg` | The microprint line under the total and along the tab bar |
| `marks/light/bead.svg`, `marks/dark/bead.svg` | The bead, the sen |
| `data/rosette.json` | Guilloché bands: radius R and amplitude A as fractions of the mark's size, p petals, copies twisted by spread |

Drawn live in code, not as files: Sen's rosette (canvas, eight states) and the large figure, set in Libre Caslon Display.
