# Assets

Everything the six looks draw, saved as files, so the design never lives only in a published page.

| Path | What it holds |
|---|---|
| `minted/`, `instrument/`, `firefly/`, `line/`, `mercury/`, `copper/` | One look each: its theme tokens, launcher and notification icons, tab bar, marks and data. Each has a README |
| `fonts/` | The fonts the looks use, as WOFF2, with their licences and `fonts.css` |
| `tab-outlines.json` | The five tabs and the outline of each tab icon, which every look shares (D80) |

`docs/ui/directions/build.mjs` writes the look folders and `tab-outlines.json` from `src/`, and `fonts.mjs` writes `fonts/`. Change the source and rebuild; don't edit these files by hand. `docs/ui/README.md` lists every design page and where its source is.
