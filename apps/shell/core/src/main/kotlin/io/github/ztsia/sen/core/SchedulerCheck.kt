package io.github.ztsia.sen.core

/**
 * The 26-hour check (spec §18, B07): each sync tells the shell when the server's morning job last ran,
 * by the server's own clock. More than 26 hours ago, the shell warns. Exactly 26 hours is still on time,
 * and a server that has never run it (null) is not late: there is nothing yet to be late for.
 */
fun isSchedulerLate(morningAtMs: Long?, serverNowMs: Long): Boolean =
    morningAtMs != null && serverNowMs - morningAtMs > SCHEDULER_LATE_MS

const val SCHEDULER_LATE_MS = 26 * 3_600_000L
