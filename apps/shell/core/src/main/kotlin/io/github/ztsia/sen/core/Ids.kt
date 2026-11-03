package io.github.ztsia.sen.core

import java.security.MessageDigest
import java.util.UUID

/**
 * The ids the phone and the server both derive (spec §5, §6.5), as UUIDv5 under namespaces fixed here
 * and in the API's `apps/api/src/sync/ids.ts`. Neither may ever change once events sync.
 *
 * An event's id is of its person and its dedupe key, so a notification captured again (a reconnect, a
 * reinstall, a second phone) lands on the same row. A transaction's is of its event's id and an index,
 * because one notification can make two transactions (a salary that is split, D45).
 */
object Ids {
    private val EVENT = UUID.fromString("e41973d7-5fe2-4c27-bace-b79fbaa03dc0")
    private val TXN = UUID.fromString("190709cc-cb32-4ded-b5e8-236da7755252")

    fun event(userId: String, dedupeKey: String): String = v5(EVENT, "$userId:$dedupeKey")

    fun txn(eventId: String, index: Int): String = v5(TXN, "$eventId:$index")

    fun v5(namespace: UUID, name: String): String {
        val sha = MessageDigest.getInstance("SHA-1")
        val ns = ByteArray(16)
        for (i in 0 until 8) ns[i] = (namespace.mostSignificantBits ushr (56 - 8 * i)).toByte()
        for (i in 0 until 8) ns[8 + i] = (namespace.leastSignificantBits ushr (56 - 8 * i)).toByte()
        sha.update(ns)
        sha.update(name.toByteArray(Charsets.UTF_8))
        val h = sha.digest().copyOf(16)
        h[6] = ((h[6].toInt() and 0x0f) or 0x50).toByte()
        h[8] = ((h[8].toInt() and 0x3f) or 0x80).toByte()
        val hex = h.joinToString("") { "%02x".format(it) }
        return "${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}"
    }
}
