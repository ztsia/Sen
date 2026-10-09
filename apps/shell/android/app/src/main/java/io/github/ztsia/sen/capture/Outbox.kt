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
    )

    /** Newest first; `before` pages by id. */
    fun events(limit: Int, before: Long? = null, ids: List<Long>? = null): List<Stored> {
        val where = mutableListOf<String>()
        val args = mutableListOf<String>()
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
            "SELECT id, package, channel, post_time, when_ms, title, text, big_text, captured_at, synced_at, maybe_otp FROM events" +
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
                        ),
                    )
                }
            }
        }
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

    companion object {
        private const val NAME = "outbox.db"
        private const val VERSION = 3

        @Volatile private var instance: Outbox? = null

        fun get(context: Context): Outbox =
            instance ?: synchronized(this) { instance ?: Outbox(context.applicationContext).also { instance = it } }
    }
}
