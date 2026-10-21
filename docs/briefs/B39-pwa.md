# B39 · The PWA

**Stage 9 · Sharing and data** · after: B38 · next: B40

## Goal

A friend without the Android shell, on an iPhone or any browser, installs Sen as an app: receipts,
manual entry, splits, budgets, Insights and Sen, with pushes. It works read-only when offline.

## Read first

- `spec_v2.md`:
  - §9.6: *One app, two ways in*, and *Without capture*
  - §6.4: *In a browser or the PWA*
  - §9.4: *an installed PWA keeps its icon*
  - §20
- Decisions: D52, D79.
- `docs/ui/patterns.md` §10: zoom, the 16 px inputs, the viewport.
- `docs/flows.md`: `invited` (*Add to Home screen*) and `offline` (*In a browser, offline is
  read-only*).

## Builds

- **A web app manifest** and an installable service worker. The installed icon is the look current
  at install time.
- ***Add to Home screen*:** offered once, from `home`, in a browser.
- **Web push**, with VAPID keys in Vercel. On iOS, it works only once the PWA is on the home screen;
  until then, notices wait in the app.
- **Offline in a browser is read-only:** cached reads, writes disabled with a clear line.
- **On iOS:** check the safe areas, the 16 px inputs, the camera through the file picker with B15's
  crop, and the Files app's scanned PDF uploading like any file.
- **Back on iOS, by swiping from the left edge.** An installed iOS PWA has no system back gesture,
  though every pushed screen keeps its back button.
  - The swipe is for iOS standalone only (`navigator.standalone`). Android's system gesture already
    covers back, and an in-app edge swipe would fight it.
  - The screen follows the finger, running B05's back transition (D140).
  - Past about a third of the width, or on a quick flick, it goes back; otherwise it springs back.
  - Like the back gesture, it closes the top sheet first.

## Done when

1. Playwright with WebKit at an iPhone viewport walks `invited`, a receipt, a split and a budget,
   and goes back by the edge swipe.
2. A web push arrives on an installed PWA (Android Chrome in a test; iOS by hand).
3. **A friend uses Sen on an iPhone for a month** (P8's bar).

## Needs from you first

- The VAPID keys, made by this slice and added to Vercel.
- A friend willing to try it.
