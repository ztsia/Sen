package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

class DedupeKeyTest {
    @Test
    fun `is the SHA-256 of the fields joined with the unit separator`() {
        // Pinned, so a change to the definition fails here before any event syncs (B07 derives ids from it).
        val expected = java.security.MessageDigest.getInstance("SHA-256")
            .digest("p\u001Fk\u001F1\u001Ft\u001Fx\u001F".toByteArray())
            .joinToString("") { "%02x".format(it) }
        assertEquals(expected, DedupeKey.of("p", "k", 1, "t", "x", null))
    }

    @Test
    fun `moving text between fields changes the key`() {
        assertNotEquals(DedupeKey.of("p", "k", 1, "ab", "c", null), DedupeKey.of("p", "k", 1, "a", "bc", null))
        assertNotEquals(DedupeKey.of("p", "k", 1, null, "x", null), DedupeKey.of("p", "k", 1, "x", null, null))
    }
}
