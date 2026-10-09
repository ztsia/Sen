package io.github.ztsia.sen.core

import java.security.MessageDigest

/**
 * Every raw event's dedupe key (spec §6.2): a hash of the package, the notification's key, its `when`
 * and its text. When the listener reconnects, Android hands it the notifications still showing, all
 * unchanged, so a replay hashes the same and the outbox's UNIQUE index makes it a no-op. Two identical
 * payments still differ in `when`.
 *
 * "Its text" is the title, the text and the expanded text (spec §6.2, D115), so an app that rewrites a
 * notification in place (same key, same `when`) records the new wording as a new event.
 *
 * Each field is written as its length in UTF-8 bytes, a colon, then its bytes, so no content can make
 * two different events hash alike; a missing field is empty. The hash is SHA-256, as lower-case hex.
 * B07 derives the event's UUIDv5 from it, on the phone and the server alike, so this definition must
 * never change once events sync.
 */
object DedupeKey {
    fun of(packageName: String, key: String, whenMillis: Long, title: String?, text: String?, bigText: String?): String {
        val sha = MessageDigest.getInstance("SHA-256")
        for (field in listOf(packageName, key, whenMillis.toString(), title.orEmpty(), text.orEmpty(), bigText.orEmpty())) {
            val bytes = field.toByteArray(Charsets.UTF_8)
            sha.update("${bytes.size}:".toByteArray(Charsets.US_ASCII))
            sha.update(bytes)
        }
        return sha.digest().joinToString("") { "%02x".format(it) }
    }
}
