package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SchedulerCheckTest {
    private val h = 3_600_000L
    private val now = 1_000 * h

    @Test
    fun overTwentySixHoursIsLate() {
        assertTrue(isSchedulerLate(now - 26 * h - 1, now))
        assertTrue(isSchedulerLate(now - 100 * h, now))
    }

    @Test
    fun exactlyTwentySixHoursIsNotLate() {
        assertFalse(isSchedulerLate(now - 26 * h, now))
        assertFalse(isSchedulerLate(now - 26 * h + 1, now))
    }

    @Test
    fun aMorningJobThatRanRecentlyIsNotLate() {
        assertFalse(isSchedulerLate(now - 3 * h, now))
        assertFalse(isSchedulerLate(now, now))
    }

    @Test
    fun aServerThatNeverRanItIsNotLate() {
        assertFalse(isSchedulerLate(null, now))
    }

    @Test
    fun theLimitIsTwentySixHoursInMilliseconds() {
        kotlin.test.assertEquals(93_600_000L, SCHEDULER_LATE_MS)
    }
}
