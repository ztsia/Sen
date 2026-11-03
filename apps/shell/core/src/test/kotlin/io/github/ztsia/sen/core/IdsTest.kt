package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

// The same vectors are in the API's ids.test.ts: the phone and the server must derive the same ids.
class IdsTest {
    private val a = "00000000-0000-4000-8000-00000000000a"

    @Test
    fun eventIdIsOfItsPersonAndDedupeKey() {
        assertEquals("3cdaca7c-ddc1-583c-884e-4fd234d7d9e6", Ids.event(a, "a".repeat(64)))
        assertEquals("38794c1a-8e54-570c-a02c-53e5613452d3", Ids.event(a, "0123456789abcdef".repeat(4)))
        assertNotEquals(Ids.event(a, "a".repeat(64)), Ids.event("00000000-0000-4000-8000-00000000000b", "a".repeat(64)))
    }

    @Test
    fun txnIdIsOfItsEventAndIndex() {
        val e = Ids.event(a, "a".repeat(64))
        assertEquals("3aadfde9-d6c7-53fb-86d3-08ffb252fe32", Ids.txn(e, 0))
        assertEquals("5b69ef63-d6d3-5bcb-bfd7-3974eea526e5", Ids.txn(e, 1))
    }
}
