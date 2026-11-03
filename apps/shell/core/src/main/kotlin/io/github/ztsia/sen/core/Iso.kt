package io.github.ztsia.sen.core

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * ISO-8601 instants for the sync's JSON, the same shape the server writes: UTC, always three digits of
 * milliseconds (the server hashes `notifiedAt`'s milliseconds into the dedupe key, so none may be lost).
 * SimpleDateFormat, not java.time: the shell supports Android 7, which has no java.time.
 */
object Iso {
    private fun fmt(pattern: String) =
        SimpleDateFormat(pattern, Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
            isLenient = false
        }

    fun format(ms: Long): String = fmt("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").format(Date(ms))

    /** Epoch milliseconds, or null when the text isn't an instant. Takes `…Z` with or without fraction. */
    fun parse(text: String?): Long? {
        if (text == null) return null
        for (p in listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'")) {
            try {
                return fmt(p).parse(text)?.time
            } catch (_: java.text.ParseException) {
                continue
            }
        }
        return null
    }
}
