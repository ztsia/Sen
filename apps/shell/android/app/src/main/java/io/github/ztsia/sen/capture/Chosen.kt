package io.github.ztsia.sen.capture

import android.content.Context

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
}
