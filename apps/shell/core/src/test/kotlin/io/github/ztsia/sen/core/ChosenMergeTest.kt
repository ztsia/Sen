package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertEquals

class ChosenMergeTest {
    private fun row(pkg: String, deleted: Boolean = false, pending: Boolean = false) = LocalApp("id-$pkg", pkg, deleted, pending)

    @Test
    fun diffSplitsAddedFromRemoved() {
        val d = ChosenMerge.diff(setOf("a.a", "b.b"), setOf("b.b", "c.c"))
        assertEquals(setOf("c.c"), d.added)
        assertEquals(setOf("a.a"), d.removed)
    }

    @Test
    fun diffOfTheSameSetIsEmpty() {
        val d = ChosenMerge.diff(setOf("a.a"), setOf("a.a"))
        assertEquals(emptySet(), d.added)
        assertEquals(emptySet(), d.removed)
    }

    @Test
    fun serverRowsWinOverSyncedOnesAndKeepPendingOnes() {
        assertEquals(AppMerge.INSERT_SYNCED, ChosenMerge.merge(null))
        assertEquals(AppMerge.OVERWRITE_SYNCED, ChosenMerge.merge(row("a.a")))
        assertEquals(AppMerge.KEEP_LOCAL, ChosenMerge.merge(row("a.a", pending = true)))
    }

    @Test
    fun chosenIsTheLiveInstalledAndAllowedPackages() {
        val rows = listOf(row("my.bank"), row("gone.app", deleted = true), row("not.installed"), row("com.whatsapp"), row("my.wallet"))
        val allowed = setOf("my.bank", "my.wallet", "gone.app")
        assertEquals(setOf("my.bank", "my.wallet"), ChosenMerge.chosen(rows) { it in allowed })
    }

    @Test
    fun aReinstallRestoresTheChoiceFromTheServersRows() {
        // a fresh install: the pull inserts the server's live rows, and the chosen set follows
        val rows = listOf(row("my.bank"), row("my.wallet"))
        assertEquals(setOf("my.bank", "my.wallet"), ChosenMerge.chosen(rows) { true })
    }
}
