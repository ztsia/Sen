package io.github.ztsia.sen.capture

import android.content.Context
import io.github.ztsia.sen.core.ChosenMerge
import io.github.ztsia.sen.core.LocalApp

/**
 * The apps this person chose (D86), kept only in native code and checked first by the listener. B07
 * syncs it as `capture_apps`. The web app reads and sets it over the bridge; setting goes through the
 * classifier here, so a page can never choose an app that's refused.
 */
object Chosen {
    private const val PREFS = "capture"
    private const val KEY = "chosen"

    @Volatile private var cache: Set<String>? = null

    fun get(context: Context): Set<String> =
        cache ?: context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getStringSet(KEY, emptySet())!!.toSet().also { cache = it }

    fun set(context: Context, packages: Set<String>) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putStringSet(KEY, packages).commit()
        cache = packages
    }

    /**
     * The picker's choice (B07): sets the list the listener checks, and records the difference as rows to
     * sync. A newly chosen package gets a new `capture_apps` row, an unchosen one its tombstone; `labels`
     * names the new ones.
     */
    fun choose(context: Context, packages: Set<String>, labels: Map<String, String>) {
        val diff = ChosenMerge.diff(get(context), packages)
        Outbox.get(context).chooseApps(diff.added.associateWith { labels[it] ?: it }, diff.removed)
        set(context, packages)
    }

    /**
     * Before the first sync of a phone that chose apps before B07: a chosen package with no `capture_apps`
     * row at all gets one, so the pull doesn't take the choice away. A package whose rows are all
     * tombstones was unchosen elsewhere, and stays so.
     */
    fun reconcile(context: Context) {
        val outbox = Outbox.get(context)
        val known = outbox.allApps().map { it.packageName }.toSet()
        val missing = get(context) - known
        if (missing.isEmpty()) return
        val labels = InstalledApps.list(context, icons = false).associate { it.packageName to it.label }
        outbox.chooseApps(missing.associateWith { labels[it] ?: it }, emptySet())
    }

    /**
     * After a pull: the listener's list becomes the live packages of the local table, kept only where
     * they're installed and the classifier still accepts them. That is how a reinstall restores the choice.
     */
    fun recompute(context: Context) {
        val rows = Outbox.get(context).allApps().map { LocalApp(it.id, it.packageName, it.deletedAt != null, !it.synced) }
        val allowed = InstalledApps.list(context, icons = false).filter { it.blocked == null }.map { it.packageName }.toSet()
        val next = ChosenMerge.chosen(rows) { it in allowed }
        if (next != get(context)) set(context, next)
    }
}
