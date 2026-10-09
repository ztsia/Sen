package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

class DedupeKeyTest {
    @Test
    fun `is the SHA-256 of each field, length-prefixed, as hex`() {
        // Pinned, so a change to the definition fails here before any event syncs (B07 derives ids from it).
        val expected = java.security.MessageDigest.getInstance("SHA-256")
            .digest("1:p1:k1:11:t1:x0:".toByteArray())
            .joinToString("") { "%02x".format(it) }
        assertEquals(expected, DedupeKey.of("p", "k", 1, "t", "x", null))
    }

    @Test
    fun `moving text between fields changes the key, whatever the text holds`() {
        assertNotEquals(DedupeKey.of("p", "k", 1, "ab", "c", null), DedupeKey.of("p", "k", 1, "a", "bc", null))
        assertNotEquals(DedupeKey.of("p", "k", 1, null, "x", null), DedupeKey.of("p", "k", 1, "x", null, null))
        assertNotEquals(DedupeKey.of("p", "k", 1, "a\u001Fb", "c", null), DedupeKey.of("p", "k", 1, "a", "b\u001Fc", null))
        assertNotEquals(DedupeKey.of("p", "k", 1, "1:a", "", null), DedupeKey.of("p", "k", 1, "", "1:a", null))
    }

    @Test
    fun `counts bytes, not characters`() {
        assertNotEquals(DedupeKey.of("p", "k", 1, "é", "", null), DedupeKey.of("p", "k", 1, "é", "", null))
    }
}
