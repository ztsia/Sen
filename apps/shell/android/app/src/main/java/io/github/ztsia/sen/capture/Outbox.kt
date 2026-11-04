package io.github.ztsia.sen.capture

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import io.github.ztsia.sen.core.ChannelRef
import io.github.ztsia.sen.core.RawEvent

/**
 * The phone's SQLite outbox (spec §5, §6.2). Raw events are stored first and never changed; B07 syncs
 * them as `bank_events`. The dedupe key is UNIQUE, so a replayed notification is a no-op. A *maybe OTP*
 * arrives already masked, with `maybe_otp` set (D116).
 *
 * Also here: the heartbeat's log (B02's soak reads it) and the channel drop list (empty until B10).
 */
class Outbox private constructor(context: Context) : SQLiteOpenHelper(context, NAME, null, VERSION) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              dedupe_key TEXT NOT NULL UNIQUE,
              package TEXT NOT NULL,
              channel TEXT,
              notification_key TEXT NOT NULL,
              post_time INTEGER NOT NULL,
              when_ms INTEGER NOT NULL,
              title TEXT,
              text TEXT,
              big_text TEXT,
              captured_at INTEGER NOT NULL,
              synced_at INTEGER
            )
            """.trimIndent(),
        )
        db.execSQL("CREATE INDEX events_post_time ON events (post_time DESC)")
        db.execSQL(
            """
            CREATE TABLE heartbeats (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              at INTEGER NOT NULL,
              kind TEXT NOT NULL,
              connected INTEGER NOT NULL
            )
            """.trimIndent(),
        )
        addDropColumns(db)
        addMaybeOtp(db)
        addSync(db)
        db.execSQL(
            """
            CREATE TABLE channel_drops (
              package TEXT NOT NULL,
              channel TEXT NOT NULL,
              PRIMARY KEY (package, channel)
            )
            """.trimIndent(),
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // 2: the heartbeat logs each dropped one-time code, by app and once per notification (QA B02 run 4)
        if (oldVersion < 2) addDropColumns(db)
        // 3: a notification that might hold a code is stored masked and marked (D116)
        if (oldVersion < 3) addMaybeOtp(db)
        // 4: sync (B07). Every event already there, B02's soak included, is pending and goes up.
        if (oldVersion < 4) addSync(db)
    }

    /**
     * Sync (B07): the server's refusal on an event (its raw columns never change), the chosen apps and the
     * web app's writes as rows to send, and `meta` for what the last sync learned. A pending event is one
     * with neither `synced_at` nor `refused`.
     */
    private fun addSync(db: SQLiteDatabase) {
        db.execSQL("ALTER TABLE events ADD COLUMN refused TEXT")
        db.execSQL("CREATE INDEX events_pending ON events (id) WHERE synced_at IS NULL AND refused IS NULL")
        db.execSQL(
            """
            CREATE TABLE capture_apps (
              id TEXT PRIMARY KEY,
              package TEXT NOT NULL,
              label TEXT NOT NULL,
              chosen_at INTEGER NOT NULL,
              deleted_at INTEGER,
              synced_at INTEGER
            )
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE commands (
              id TEXT PRIMARY KEY,
              body TEXT NOT NULL,
              made_at INTEGER NOT NULL,
              synced_at INTEGER,
              status TEXT,
              said TEXT
            )
            """.trimIndent(),
        )
        db.execSQL("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)")
    }

    private fun addMaybeOtp(db: SQLiteDatabase) {
        db.execSQL("ALTER TABLE events ADD COLUMN maybe_otp INTEGER NOT NULL DEFAULT 0")
    }

    private fun addDropColumns(db: SQLiteDatabase) {
        db.execSQL("ALTER TABLE heartbeats ADD COLUMN package TEXT")
        db.execSQL("ALTER TABLE heartbeats ADD COLUMN drop_key TEXT")
        db.execSQL("CREATE UNIQUE INDEX heartbeats_drop ON heartbeats (drop_key) WHERE drop_key IS NOT NULL")
    }

    /** Stores a raw event; false when its dedupe key is already there. */
    fun insert(e: RawEvent, now: Long = System.currentTimeMillis()): Boolean {
        val values =
            ContentValues().apply {
                put("dedupe_key", e.dedupeKey)
                put("package", e.packageName)
                put("channel", e.channel)
                put("notification_key", e.key)
                put("post_time", e.postTime)
                put("when_ms", e.whenMillis)
                put("title", e.title)
                put("text", e.text)
                put("big_text", e.bigText)
                put("maybe_otp", if (e.maybeOtp) 1 else 0)
                put("captured_at", now)
            }
        return writableDatabase.insertWithOnConflict("events", null, values, SQLiteDatabase.CONFLICT_IGNORE) != -1L
    }

    data class Stored(
        val id: Long,
        val packageName: String,
        val channel: String?,
        val postTime: Long,
        val whenMillis: Long,
        val title: String?,
        val text: String?,
        val bigText: String?,
        val capturedAt: Long,
        val synced: Boolean,
        val maybeOtp: Boolean,
        val refused: String? = null,
    )

    /** Newest first; `before` pages by id; `pending` keeps only what the server hasn't answered for yet. */
    fun events(limit: Int, before: Long? = null, ids: List<Long>? = null, pending: Boolean = false): List<Stored> {
        val where = mutableListOf<String>()
        val args = mutableListOf<String>()
        if (pending) where += PENDING
        if (before != null) {
            where += "id < ?"
            args += before.toString()
        }
        if (ids != null) {
            if (ids.isEmpty()) return emptyList()
            where += "id IN (${ids.joinToString(",") { "?" }})"
            args += ids.map { it.toString() }
        }
        val sql =
            "SELECT id, package, channel, post_time, when_ms, title, text, big_text, captured_at, synced_at, maybe_otp, refused FROM events" +
                (if (where.isEmpty()) "" else " WHERE " + where.joinToString(" AND ")) +
                " ORDER BY id DESC LIMIT ?"
        args += limit.toString()
        return readableDatabase.rawQuery(sql, args.toTypedArray()).use { c ->
            buildList {
                while (c.moveToNext()) {
                    add(
                        Stored(
                            id = c.getLong(0),
                            packageName = c.getString(1),
                            channel = c.getString(2),
                            postTime = c.getLong(3),
                            whenMillis = c.getLong(4),
                            title = c.getString(5),
                            text = c.getString(6),
                            bigText = c.getString(7),
                            capturedAt = c.getLong(8),
                            synced = !c.isNull(9),
                            maybeOtp = c.getInt(10) == 1,
                            refused = c.getString(11),
                        ),
                    )
                }
            }
        }
    }

    /** What the sync sends of an event: the raw row, with the dedupe key its id is derived from. */
    data class Pending(
        val rowId: Long,
        val dedupeKey: String,
        val packageName: String,
        val channel: String?,
        val notificationKey: String,
        val postTime: Long,
        val whenMillis: Long,
        val title: String?,
        val text: String?,
        val bigText: String?,
        val maybeOtp: Boolean,
    )

    /** Oldest first. */
    fun pendingEvents(limit: Int): List<Pending> =
        readableDatabase.rawQuery(
            "SELECT id, dedupe_key, package, channel, notification_key, post_time, when_ms, title, text, big_text, maybe_otp " +
                "FROM events WHERE $PENDING ORDER BY id ASC LIMIT ?",
            arrayOf(limit.toString()),
        ).use { c ->
            buildList {
                while (c.moveToNext()) {
                    add(
                        Pending(
                            rowId = c.getLong(0),
                            dedupeKey = c.getString(1),
                            packageName = c.getString(2),
                            channel = c.getString(3),
                            notificationKey = c.getString(4),
                            postTime = c.getLong(5),
                            whenMillis = c.getLong(6),
                            title = c.getString(7),
                            text = c.getString(8),
                            bigText = c.getString(9),
                            maybeOtp = c.getInt(10) == 1,
                        ),
                    )
                }
            }
        }

    fun pendingCount(): Long = readableDatabase.compileStatement("SELECT COUNT(*) FROM events WHERE $PENDING").use { it.simpleQueryForLong() }

    fun markEventsSynced(rowIds: Collection<Long>, now: Long = System.currentTimeMillis()) =
        inChunks(rowIds) { ph, args -> writableDatabase.execSQL("UPDATE events SET synced_at = ? WHERE id IN ($ph)", listOf<Any>(now).plus(args.toList()).toTypedArray()) }

    /** The server won't take this event, ever: kept, marked, and not sent again. */
    fun markEventRefused(rowId: Long, reason: String) {
        writableDatabase.execSQL("UPDATE events SET refused = ? WHERE id = ? AND synced_at IS NULL", arrayOf<Any>(reason, rowId))
    }

    private fun inChunks(ids: Collection<Long>, run: (String, Array<Any>) -> Unit) {
        ids.chunked(400).forEach { chunk -> run(chunk.joinToString(",") { "?" }, chunk.toTypedArray()) }
    }

    fun count(): Long = readableDatabase.compileStatement("SELECT COUNT(*) FROM events").use { it.simpleQueryForLong() }

    /**
     * One line of the heartbeat's log. `package` and `dropKey` are set only for a drop ("otp"): which
     * chosen app posted a one-time code, and when, never its text, so the soak can tell a dropped payment
     * from a missing one. `dropKey` hashes the package, the notification's key and its `when`, no text, so
     * a replay logs nothing new.
     */
    fun beat(
        kind: String,
        connected: Boolean,
        at: Long = System.currentTimeMillis(),
        packageName: String? = null,
        dropKey: String? = null,
    ) {
        writableDatabase.apply {
            insertWithOnConflict(
                "heartbeats",
                null,
                ContentValues().apply {
                    put("at", at)
                    put("kind", kind)
                    put("connected", if (connected) 1 else 0)
                    put("package", packageName)
                    put("drop_key", dropKey)
                },
                // a notification still showing is replayed at every reconnect; its drop is logged once
                SQLiteDatabase.CONFLICT_IGNORE,
            )
            // Keep the last 2,000 beats: a few weeks at one an hour, plus every connect and boot.
            execSQL("DELETE FROM heartbeats WHERE id <= (SELECT MAX(id) - 2000 FROM heartbeats)")
        }
    }

    data class Beat(val at: Long, val kind: String, val connected: Boolean, val packageName: String?)

    fun beats(limit: Int): List<Beat> =
        readableDatabase.rawQuery("SELECT at, kind, connected, package FROM heartbeats ORDER BY id DESC LIMIT ?", arrayOf(limit.toString())).use { c ->
            buildList { while (c.moveToNext()) add(Beat(c.getLong(0), c.getString(1), c.getInt(2) == 1, c.getString(3))) }
        }

    fun droppedChannels(): Set<ChannelRef> =
        readableDatabase.rawQuery("SELECT package, channel FROM channel_drops", null).use { c ->
            buildSet { while (c.moveToNext()) add(ChannelRef(c.getString(0), c.getString(1))) }
        }

    // The chosen apps (B07). One row per choice, its id made on the phone; unchoosing sets deleted_at.

    data class App(val id: String, val packageName: String, val label: String, val chosenAt: Long, val deletedAt: Long?, val synced: Boolean)

    private fun readApps(sql: String, args: Array<String> = emptyArray()): List<App> =
        readableDatabase.rawQuery(sql, args).use { c ->
            buildList {
                while (c.moveToNext()) {
                    add(App(c.getString(0), c.getString(1), c.getString(2), c.getLong(3), if (c.isNull(4)) null else c.getLong(4), !c.isNull(5)))
                }
            }
        }

    private val appColumns = "id, package, label, chosen_at, deleted_at, synced_at"

    fun allApps(): List<App> = readApps("SELECT $appColumns FROM capture_apps ORDER BY chosen_at, id")

    fun liveApps(): List<App> = readApps("SELECT $appColumns FROM capture_apps WHERE deleted_at IS NULL ORDER BY chosen_at, id")

    fun pendingApps(limit: Int): List<App> =
        readApps("SELECT $appColumns FROM capture_apps WHERE synced_at IS NULL ORDER BY chosen_at, id LIMIT ?", arrayOf(limit.toString()))

    /**
     * The picker changed: a newly chosen package gets a new row, an unchosen one has its live row's
     * `deleted_at` set. Both are pending. A package chosen, unchosen and chosen again is a new row.
     */
    fun chooseApps(added: Map<String, String>, removed: Set<String>, now: Long = System.currentTimeMillis()) {
        writableDatabase.transaction {
            added.forEach { (pkg, label) ->
                if (readApps("SELECT $appColumns FROM capture_apps WHERE package = ? AND deleted_at IS NULL", arrayOf(pkg)).isEmpty()) {
                    execSQL(
                        "INSERT INTO capture_apps (id, package, label, chosen_at) VALUES (?, ?, ?, ?)",
                        arrayOf<Any>(java.util.UUID.randomUUID().toString(), pkg, label, now),
                    )
                }
            }
            removed.forEach { pkg ->
                execSQL("UPDATE capture_apps SET deleted_at = ?, synced_at = NULL WHERE package = ? AND deleted_at IS NULL", arrayOf<Any>(now, pkg))
            }
        }
    }

    fun markAppsSynced(ids: Collection<String>, now: Long = System.currentTimeMillis()) {
        ids.chunked(400).forEach { chunk ->
            writableDatabase.execSQL("UPDATE capture_apps SET synced_at = ? WHERE id IN (${chunk.joinToString(",") { "?" }})", listOf<Any>(now).plus(chunk).toTypedArray())
        }
    }

    /** The server's rows win for synced ones; a local row with a change still to send keeps it. */
    fun mergeServerApp(a: App, now: Long = System.currentTimeMillis()) {
        val local = readApps("SELECT $appColumns FROM capture_apps WHERE id = ?", arrayOf(a.id)).firstOrNull()
        val verdict = io.github.ztsia.sen.core.ChosenMerge.merge(local?.let { io.github.ztsia.sen.core.LocalApp(it.id, it.packageName, it.deletedAt != null, !it.synced) })
        if (verdict == io.github.ztsia.sen.core.AppMerge.KEEP_LOCAL) return
        writableDatabase.execSQL(
            "INSERT OR REPLACE INTO capture_apps (id, package, label, chosen_at, deleted_at, synced_at) VALUES (?, ?, ?, ?, ?, ?)",
            arrayOf<Any?>(a.id, a.packageName, a.label, a.chosenAt, a.deletedAt, now),
        )
    }

    // The web app's writes (B07): each Command JSON as given, with the id it was made with.

    data class Command(val id: String, val body: String, val madeAt: Long, val syncedAt: Long?, val status: String?, val said: String?)

    private fun readCommands(where: String, args: Array<String> = emptyArray(), tail: String = "ORDER BY made_at, rowid"): List<Command> =
        readableDatabase.rawQuery("SELECT id, body, made_at, synced_at, status, said FROM commands WHERE $where $tail", args).use { c ->
            buildList {
                while (c.moveToNext()) {
                    add(Command(c.getString(0), c.getString(1), c.getLong(2), if (c.isNull(3)) null else c.getLong(3), c.getString(4), c.getString(5)))
                }
            }
        }

    /** False when a command with this id is already there. */
    fun insertCommand(id: String, body: String, madeAt: Long): Boolean =
        writableDatabase.insertWithOnConflict(
            "commands",
            null,
            ContentValues().apply {
                put("id", id)
                put("body", body)
                put("made_at", madeAt)
            },
            SQLiteDatabase.CONFLICT_IGNORE,
        ) != -1L

    fun pendingCommands(limit: Int): List<Command> = readCommands("synced_at IS NULL", tail = "ORDER BY made_at, rowid LIMIT $limit")

    fun markCommand(id: String, status: String, said: String, now: Long = System.currentTimeMillis()) {
        writableDatabase.execSQL("UPDATE commands SET synced_at = ?, status = ?, said = ? WHERE id = ?", arrayOf<Any>(now, status, said, id))
    }

    /** Unsynced commands plus those answered in the last ten minutes; synced ones older than a day are pruned. */
    fun recentCommands(now: Long = System.currentTimeMillis()): List<Command> {
        writableDatabase.execSQL("DELETE FROM commands WHERE synced_at IS NOT NULL AND synced_at < ?", arrayOf<Any>(now - DAY_MS))
        return readCommands("synced_at IS NULL OR synced_at >= ?", arrayOf((now - TEN_MIN_MS).toString()))
    }

    /**
     * Another person signed in on this phone: what the last one captured, chose and wrote, and what their
     * syncs learned, goes, so none of it is ever sent as the new person's. The heartbeat log stays (it
     * holds no one's money).
     */
    fun forgetPerson() {
        writableDatabase.transaction {
            execSQL("DELETE FROM events")
            execSQL("DELETE FROM commands")
            execSQL("DELETE FROM capture_apps")
            execSQL("DELETE FROM meta")
        }
    }

    // What the last sync learned (B07).

    fun meta(key: String): String? =
        readableDatabase.rawQuery("SELECT value FROM meta WHERE key = ?", arrayOf(key)).use { if (it.moveToFirst()) it.getString(0) else null }

    fun setMeta(key: String, value: String?) {
        if (value == null) {
            writableDatabase.execSQL("DELETE FROM meta WHERE key = ?", arrayOf<Any>(key))
        } else {
            writableDatabase.execSQL("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", arrayOf<Any>(key, value))
        }
    }

    private inline fun SQLiteDatabase.transaction(body: SQLiteDatabase.() -> Unit) {
        beginTransaction()
        try {
            body()
            setTransactionSuccessful()
        } finally {
            endTransaction()
        }
    }

    companion object {
        private const val NAME = "outbox.db"
        private const val VERSION = 4
        private const val PENDING = "synced_at IS NULL AND refused IS NULL"
        private const val DAY_MS = 86_400_000L
        private const val TEN_MIN_MS = 600_000L

        /** The database file's name, for a test that deletes it to look like a reinstall. */
        const val FILE = NAME

        /** Forgets the open instance (a test that deleted the file). */
        fun reset(context: Context) = synchronized(this) {
            instance?.close()
            instance = null
            context.applicationContext.deleteDatabase(NAME)
        }

        @Volatile private var instance: Outbox? = null

        fun get(context: Context): Outbox =
            instance ?: synchronized(this) { instance ?: Outbox(context.applicationContext).also { instance = it } }
    }
}
