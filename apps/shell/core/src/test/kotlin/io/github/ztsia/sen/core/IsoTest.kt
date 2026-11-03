package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class IsoTest {
    @Test
    fun formatsUtcWithThreeDigitsOfMilliseconds() {
        assertEquals("2026-11-01T01:00:00.050Z", Iso.format(1_793_494_800_050L))
        assertEquals("1970-01-01T00:00:00.000Z", Iso.format(0))
        assertEquals("2026-11-01T01:00:00.000Z", Iso.format(1_793_494_800_000L))
    }

    @Test
    fun parsesWhatItFormatsAndTheServersOwnShape() {
        assertEquals(1_793_494_800_050L, Iso.parse("2026-11-01T01:00:00.050Z"))
        assertEquals(1_793_494_800_000L, Iso.parse("2026-11-01T01:00:00Z"))
        assertNull(Iso.parse("yesterday"))
        assertNull(Iso.parse(null))
    }
}
