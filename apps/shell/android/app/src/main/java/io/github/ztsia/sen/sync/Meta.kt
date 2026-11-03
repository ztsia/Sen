package io.github.ztsia.sen.sync

/** The keys of the outbox's `meta` table (B07): what the last sync learned. */
object Meta {
    const val CHANGES_VERSION = "changes_version"
    const val LAST_SYNC_AT = "last_sync_at"
    const val MORNING_AT = "morning_at"
    const val SERVER_NOW = "server_now"
    const val CAPTURE_ON = "capture_on"
    const val SHELL_OFF = "shell_off"
    const val LATE_NOTICE_DAY = "late_notice_day"

    /** Whose outbox this is: the user id of the first session that synced it. */
    const val OWNER = "owner"
}
