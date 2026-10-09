package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNotEquals

class CaptureGateTest {
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"
    private fun posted(
        pkg: String = ryt,
        title: String? = "Your money is in!",
        text: String? = "You've received RM42.50 from TAN WEI MING on 12/9/2026, 9:48 PM (GMT+8).",
        whenMillis: Long = 1_757_000_000_000,
        summary: Boolean = false,
        ongoing: Boolean = false,
        channel: String? = "transactions",
    ) = Posted(pkg, "0|$pkg|7|null|10123", channel, 1_757_000_000_500, whenMillis, title, text, null, summary, ongoing)

    @Test
    fun `an unchosen app is dropped first, whatever it says`() {
        val d = gate.decide(posted(pkg = "com.example.other"), chosen = setOf(ryt))
        assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), d)
        // even an OTP from it is NOT_CHOSEN: its text is never read
        assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), gate.decide(posted(pkg = "x", text = "OTP 1"), setOf(ryt)))
    }

    @Test
    fun `an OTP from a chosen app is dropped`() {
        assertEquals(Decision.Drop(DropReason.OTP), gate.decide(posted(text = "Your TAC is 123456"), setOf(ryt)))
    }

    @Test
    fun `group summaries, ongoing, empty and dropped channels go`() {
        assertEquals(Decision.Drop(DropReason.GROUP_SUMMARY), gate.decide(posted(summary = true), setOf(ryt)))
        assertEquals(Decision.Drop(DropReason.ONGOING), gate.decide(posted(ongoing = true), setOf(ryt)))
        assertEquals(Decision.Drop(DropReason.EMPTY), gate.decide(posted(title = " ", text = null), setOf(ryt)))
        assertEquals(
            Decision.Drop(DropReason.CHANNEL),
            gate.decide(posted(channel = "promo"), setOf(ryt), setOf(ChannelRef(ryt, "promo"))),
        )
    }

    @Test
    fun `a payment is kept raw, with its dedupe key`() {
        val keep = assertIs<Decision.Keep>(gate.decide(posted(), setOf(ryt)))
        assertEquals("Your money is in!", keep.event.title)
        assertEquals(64, keep.event.dedupeKey.length)
    }

    @Test
    fun `a replay hashes the same, and a second identical payment doesn't`() {
        val a = assertIs<Decision.Keep>(gate.decide(posted(), setOf(ryt))).event
        val replay = assertIs<Decision.Keep>(gate.decide(posted(), setOf(ryt))).event
        val again = assertIs<Decision.Keep>(gate.decide(posted(whenMillis = 1_757_000_060_000), setOf(ryt))).event
        assertEquals(a.dedupeKey, replay.dedupeKey)
        assertNotEquals(a.dedupeKey, again.dedupeKey)
    }

    @Test
    fun `no when falls back to the post time`() {
        val e = assertIs<Decision.Keep>(gate.decide(posted(whenMillis = 0), setOf(ryt))).event
        assertEquals(1_757_000_000_500, e.whenMillis)
    }
}
