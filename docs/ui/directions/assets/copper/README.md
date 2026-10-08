# Copper: assets

Everything Copper draws, as files the app can use, written by `docs/ui/directions/build.mjs` from `src/copper.js` and `src/copper.css`. Don't edit these by hand: change the source and rebuild. The page itself is `docs/ui/directions/copper.html`, and its fonts are in `../fonts/`.

| Path | What it is |
|---|---|
| `theme.css` | shadcn/ui's tokens and Sen's money tokens, light and dark, in OKLCH |
| `tokens.json` | The same tokens with the look's own variables, as hex |
| `launcher/` | The adaptive icon on Android's 108 dp canvas: `background.svg`, `foreground.svg`, `monochrome.svg` for themed icons, and `preview.svg` in a squircle mask |
| `notification.svg` | The 24 dp notification icon, a flat silhouette |
| `tabs/light/`, `tabs/dark/` | The tab bar: each icon idle (`home.svg`) and active (`home-active.svg`) on the shared outlines in `../tab-outlines.json`, the scan button and the badge |
| `marks/light/strip.svg`, `marks/dark/strip.svg` | The cycle strip on Home, on day 19 of 31 |
| `marks/coin.svg` | The coin, with its milled edge |
| `data/patina.json` | The colour of the copper for a share of the cycle's money spent, from 0 (payday, polished) to 1 (all of it, green) |

Drawn live in code, not as files: the struck figure and title, and Sen's coin with its two faces: a WebGL renderer (`CU_FS` in `src/copper.js`) with a painted 2D fallback. The patina follows `data/patina.json`.
