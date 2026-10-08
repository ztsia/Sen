# Design pages

Every design page published for Sen, and its source in this repo. The repo copy is the original: a
published page is a copy of it, and can always be published again from it (to the same link, with the
Artifact tool's `url`). A page whose source isn't here doesn't count as saved.

| Page | Published at | Source |
|---|---|---|
| The wireframe, approved 6 Oct | https://claude.ai/artifact/GV9cJbkjjFSExMgpbWY9Sc | `wireframe.html` |
| The screen map, the 5 Oct draft (superseded by the wireframe, `docs/screens.md` and `docs/flows.md`) | https://claude.ai/artifact/Qg4xnrytAMWfJ7uSnSq8DJ | `screen-map.html` |
| Minted | https://claude.ai/artifact/Co4jSZC5CRSRPgnSq9gnYG | `directions/minted.html` |
| Instrument | https://claude.ai/artifact/FtzJQRoKgs542C4NyAvnkj | `directions/instrument.html` |
| Firefly | https://claude.ai/artifact/DdtERg2hYY2HvEEdTUw7JY | `directions/firefly.html` |
| Line | https://claude.ai/artifact/9N9VXLoYYTg2F4WwSvmZJ7 | `directions/line.html` |
| Mercury | https://claude.ai/artifact/QMZtw9imqk8Jw6f44yxBGA | `directions/mercury.html` |
| Copper | https://claude.ai/artifact/PMtA2qnvKY3BwgFom611YM | `directions/copper.html` |

The six looks' pages are built by `directions/build.mjs` from `directions/src/`: edit the source,
rebuild, then publish. The chart palette is written by `directions/palette.mjs` into
`directions/src/charts.js`: change the hues there, run it (it prints the dataviz checks), then
rebuild. Everything the looks draw is saved as files in `directions/assets/`: theme
tokens, launcher and notification icons, tab bars, marks, the data their drawn type is made from, and
their fonts with licences. The two ideas not built, Clay and Salt, are in `directions/backlog.md`.
