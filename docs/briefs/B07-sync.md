# B07 · Sync and the outbox

**Stage 3 · Capture to ledger** · after: B06 · next: B08

## Goal

The phone and the server agree. Captured notifications reach the database exactly once, through
retries, reconnects, reinstalls and a second phone. The shell owns the session and shares it with
the web app. In the shell every write goes through the outbox; in a browser, straight to the API.
Capture's health is watched.

**From here, real notification text reaches production**, which is why backups (B06) came first.

## Read first

- `spec_v2.md`:
  - §5: the *Outbox and sync* and *Writes* rows of the table, plus *What the phone keeps offline*,
    *Rows still in the outbox*, *Sync can't duplicate or undo* and *The shell owns the session*
  - §5.1: *Local storage* and *State*
  - §6.2: *Raw text is stored first*, *Dedupe key*, *Background execution* and *Health*
  - §6.5, all of it
  - §9.6, the *Capture* switch
  - §15: `bank_events`, `capture_apps` and `device_heartbeats`, plus the opening paragraph on ids and
    tombstones
  - §16: `/sync` (its sync part) and `/match` (an empty frame for now)
  - §18
- Decisions: D22, D42, D86, D100 (*your own actions are instant*).
- `docs/ui/patterns.md` §7: *Offline* and *Live updates*.
- Skill: `database`.

## Builds

### Ids
- **UUIDv5 namespaces fixed in code.** An event's id comes from its dedupe key. Its transaction ids
  are derived from the event id with an index, because one notification can make two transactions,
  such as a salary that is split (§15 *Key decisions*).

### The shell
- **The outbox:** pending events, row upserts and field-level edits.
- **Sync:** WorkManager, with a network constraint, backoff and batches, triggered on capture,
  app open and reconnect.
- **The session:** after `sign-in` in the web app, the shell keeps the session token in
  Keystore-backed storage, uses it for sync and hands it to the web app at launch, so both share one
  login. Use Better Auth's bearer support. *Sign out everywhere* kills the shell's session too.
- **The bridge write path:** every write the web app makes in the shell goes into the outbox, and
  appears in its queries at once, marked *Not synced yet* (after 5 s, or while offline:
  `patterns.md` §7).

### The browser
- Writes go straight to the API, optimistically, reverting with *Retry* on failure.

### The server
- **`/sync`** takes a batch of events, upserts and edits, each with its id, and is idempotent:
  - an upsert of a known id is a no-op or a merge
  - an edit applies only its changed fields, so it can't undo what matching changed
  - a tombstoned row is never brought back by a stale phone
- **`bank_events`.** A trigger keeps the raw columns immutable; status columns stay writable.
- **`capture_apps`**, synced from the picker, so a reinstall restores the choice.
- **The offline copy, synced down:** one endpoint returns what changed since a version, per kind.
  Today that's `capture_apps`; templates, rules, categories, names and owed shares join in later
  slices.
- **The *Capture* switch:** with it off, `/sync` refuses bank events with a clear code, and the
  shell unbinds its listener.

### Health
- **`device_heartbeats`** from the shell, on sync and once a day.
- **The capture watchdog,** in the morning job and only with capture on: no heartbeat for 24 hours,
  or no bank event for 48 hours, sends the push *Capture may be off*, at most once a day through
  `alerts_sent`.
- **Home shows *Capture is off*,** with *Fix* opening the right Android setting.
- **The 26-hour check:** each sync returns when the morning job last ran. If that's more than 26
  hours ago, the shell posts its own notification and Home warns.

### The soak's events
- **They sync too.** They're real events, and B09 and B10 read them later.
- ***Captured on this phone*** becomes a view of the server's `bank_events` (raw text), until B10's
  *Skipped* and learned wordings replace it.

## Leaves for later

- Accounts and transactions: B08 and B09. Templates and drafting: B09 and B10.

## Done when

1. B02's soak events land in the hosted database with stable ids.
2. On the emulator:
   - capturing the same notifications again (a reconnect, a reinstall, a second install) adds
     nothing
   - airplane-mode capture syncs on reconnect
3. SQL tests:
   - a stale upsert can't bring back a tombstone
   - a field edit doesn't overwrite a field the server changed
   - the raw columns can't be updated
4. In a browser, a failed write reverts and offers *Retry*.
5. Killing the listener leads to the watchdog push, tested with a fake clock, and on the phone by
   revoking access for a day.
6. The 26-hour check fires in a test.
7. With the *Capture* switch off, events are refused and the listener unbinds.
8. Signing in once in the shell signs in the web app inside it, and *Sign out everywhere* from a
   browser signs the shell out.
9. pgTAP covers the new tables. Q25 (Neon's free compute) is measured after a week of real syncs
   and recorded in `docs/cloud.md` and the spec.

## On your phone

- [ ] Install the new release. Sign in once in the app.
- [ ] Check that *Captured on this phone* now shows the soak's events from the server.
- [ ] Turn notification access off for a day; the warning should come.

## Needs from you first

Nothing new.
