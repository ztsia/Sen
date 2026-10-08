# Line: assets

Everything Line draws, as files the app can use, written by `docs/ui/directions/build.mjs` from `src/line.js` and `src/line.css`. Don't edit these by hand: change the source and rebuild. The page itself is `docs/ui/directions/line.html`, and its fonts are in `../fonts/`.

| Path | What it is |
|---|---|
| `theme.css` | shadcn/ui's tokens and Sen's money tokens, light and dark, in OKLCH |
| `tokens.json` | The same tokens with the look's own variables, as hex |
| `launcher/` | The adaptive icon on Android's 108 dp canvas: `background.svg`, `foreground.svg`, `monochrome.svg` for themed icons, and `preview.svg` in a squircle mask |
| `notification.svg` | The 24 dp notification icon, a flat silhouette |
| `tabs/light/`, `tabs/dark/` | The tab bar: each icon idle (`home.svg`) and active (`home-active.svg`) on the shared outlines in `../tab-outlines.json`, the scan button and the badge |
| `marks/light/strip.svg`, `marks/dark/strip.svg` | The cycle strip on Home, on day 19 of 31 |
| `marks/light/loop.svg`, `marks/dark/loop.svg` | The loop and its dot, the mark Sen signs with |
| `marks/light/underline.svg`, `marks/dark/underline.svg` | Sen's underline under the active tab |
| `data/pen-glyphs.json` | Single-stroke letters and figures in a box 100 units tall (baseline 0, top -100) |

Drawn live in code, not as files: the handwritten figure, title and wordmark, written by the pen engine from `data/pen-glyphs.json`, and Sen's nib (canvas).
