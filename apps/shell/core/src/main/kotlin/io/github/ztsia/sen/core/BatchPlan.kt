package io.github.ztsia.sen.core

/**
 * How many pending items go in one sync batch (B07): at most `maxCount`, and while the batch's JSON stays
 * within `budget` bytes (the API refuses a body over 256 KiB; the shell stops at 180,000). Each item
 * costs its own size plus a comma. Always at least one when there is one, so an item that alone is over
 * the budget still goes (alone) instead of blocking the outbox behind it.
 */
object BatchPlan {
    const val BODY_BUDGET = 180_000

    fun take(sizes: List<Int>, maxCount: Int, budget: Int): Int {
        var used = 0
        var n = 0
        for (s in sizes) {
            if (n >= maxCount) break
            val cost = s + 1
            if (n > 0 && used + cost > budget) break
            used += cost
            n++
        }
        return n
    }
}
