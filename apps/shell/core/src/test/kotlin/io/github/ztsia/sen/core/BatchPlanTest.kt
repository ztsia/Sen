package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertEquals

class BatchPlanTest {
    @Test
    fun takesUpToTheCount() {
        assertEquals(100, BatchPlan.take(List(250) { 100 }, 100, BatchPlan.BODY_BUDGET))
        assertEquals(3, BatchPlan.take(listOf(10, 10, 10), 100, 1_000))
    }

    @Test
    fun stopsBeforeTheByteBudget() {
        // each costs size + 1 for its comma: 3 x 61 = 183 fits in 200, a fourth would be 244
        assertEquals(3, BatchPlan.take(List(10) { 60 }, 100, 200))
        // exactly full still fits
        assertEquals(2, BatchPlan.take(List(10) { 99 }, 100, 200))
    }

    @Test
    fun anEmptyListTakesNothing() {
        assertEquals(0, BatchPlan.take(emptyList(), 100, 1_000))
    }

    @Test
    fun aLoneOversizedItemStillGoesAlone() {
        assertEquals(1, BatchPlan.take(listOf(500_000, 10), 100, BatchPlan.BODY_BUDGET))
        assertEquals(1, BatchPlan.take(listOf(10), 100, 0))
    }

    @Test
    fun anOversizedItemAfterOthersWaitsForTheNextBatch() {
        assertEquals(2, BatchPlan.take(listOf(10, 10, 500_000), 100, BatchPlan.BODY_BUDGET))
    }

    @Test
    fun maxCountZeroTakesNothing() {
        assertEquals(0, BatchPlan.take(listOf(1, 2), 0, 1_000))
    }
}
