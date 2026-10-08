# B37 · Export everything

**Stage 9 · Sharing and data** · after: B36 · next: B38

## Goal

The data stays the owner's, outside the app and its backups. *Export everything* builds a ZIP of
CSVs and receipt images on GitHub Actions in the private `sen_ops` repo, which reads only the
requester's data. The link works for 24 hours.

## Read first

- `spec_v2.md`:
  - §5: the export row
  - §14: an export can be limited to one year
  - §15: `exports`
  - §16: `/export` and `/exports/:id/done`, and *Auth* (the fine-grained token, the opaque id)
  - §17: *RLS* (the export connects as `app_user`), *Secrets* and *Export, any time*
- Decisions: D49, D85.
- `docs/screens.md`: Settings → *Data*.
- `docs/flows.md`: `export`.

## Builds

- **`POST /export`** records an `exports` row, with an optional year, and starts the `sen_ops` export
  workflow with a fine-grained token limited to that repo's Actions.
  - The workflow gets **only an opaque export id**, because run inputs are visible to anyone who can
    read the repo.
  - Only the export workflow has a manual trigger in `sen_ops`.
- **The workflow:**
  - connects as `app_user`, with the requester's id set, so RLS limits it to their rows
  - writes CSVs (transactions, accounts, categories, rules, claims) and the receipt images into a ZIP
  - puts the ZIP in R2, **never in a workflow artifact or log**
- **The report-back:** the workflow calls `/exports/:id/done` with its own secret. The server signs a
  24-hour link and sends the push *Export ready*.
- **The morning job deletes the ZIP** after a day.
- **Settings → *Data*:** *Export everything*, the year option, and the state of the latest export.

## Done when

1. With two people in a test database, an export contains only the requester's rows and images.
2. A log of the workflow run shows no data and no link.
3. **On the phone:** the push arrives, and the ZIP downloads and opens. The link fails after 24 hours.

## Needs from you first

- In `sen_ops`: the workflow's secrets (an `app_user` connection URL, R2 keys and its report-back
  secret).
- In Vercel: the fine-grained GitHub token.
