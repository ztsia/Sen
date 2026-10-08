# Instrument: assets

Everything Instrument draws, as files the app can use, written by `docs/ui/directions/build.mjs` from `src/instrument.js` and `src/instrument.css`. Don't edit these by hand: change the source and rebuild. The page itself is `docs/ui/directions/instrument.html`, and its fonts are in `../fonts/`.

| Path | What it is |
|---|---|
| `theme.css` | shadcn/ui's tokens and Sen's money tokens, light and dark, in OKLCH |
| `tokens.json` | The same tokens with the look's own variables, as hex |
| `launcher/` | The adaptive icon on Android's 108 dp canvas: `background.svg`, `foreground.svg`, `monochrome.svg` for themed icons, and `preview.svg` in a squircle mask |
| `notification.svg` | The 24 dp notification icon, a flat silhouette |
| `tabs/light/`, `tabs/dark/` | The tab bar: each icon idle (`home.svg`) and active (`home-active.svg`) on the shared outlines in `../tab-outlines.json`, the scan button and the badge |
| `marks/light/strip.svg`, `marks/dark/strip.svg` | The cycle strip on Home, on day 19 of 31 |
| `marks/light/wordmark.svg`, `marks/dark/wordmark.svg` | The wordmark in dots |
| `marks/grid.svg` | The grid of a hundred with one sen lit |
| `data/dot-matrix.json` | The 5×7 face for the figure, the wordmark and the title, and the 9×9 tab icons |

Drawn live in code, not as files: Sen's 9×9 matrix (canvas, eight states) and the dot-matrix figure, drawn from `data/dot-matrix.json`.
