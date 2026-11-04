package io.github.ztsia.sen.core

/** One row of the phone's `capture_apps`, as far as the merge rules need it. */
data class LocalApp(val id: String, val packageName: String, val deleted: Boolean, val pending: Boolean)

/** A choice in the picker changed (B07): the packages newly chosen and the ones unchosen. */
data class ChosenDiff(val added: Set<String>, val removed: Set<String>)

/** What to do with one capture app the server sent down, given the local row with its id (if any). */
enum class AppMerge { INSERT_SYNCED, OVERWRITE_SYNCED, KEEP_LOCAL }

object ChosenMerge {
    /** Old chosen set against the new one: who was added, who was removed. */
    fun diff(old: Set<String>, new: Set<String>): ChosenDiff = ChosenDiff(new - old, old - new)

    /**
     * Server values win for synced rows; a local row with a change not yet sent keeps it (the server
     * hears it in the next batch, and its own rules settle a clash by time).
     */
    fun merge(local: LocalApp?): AppMerge =
        when {
            local == null -> AppMerge.INSERT_SYNCED
            local.pending -> AppMerge.KEEP_LOCAL
            else -> AppMerge.OVERWRITE_SYNCED
        }

    /**
     * The listener's chosen set after a pull: the live packages of the local table, kept only if the
     * classifier still accepts them on this phone (installed, not messaging/SMS/email/social). That is how
     * a reinstall restores the choice, and how a refused app can never be chosen by a row from elsewhere.
     */
    fun chosen(rows: List<LocalApp>, allowed: (String) -> Boolean): Set<String> =
        rows.filter { !it.deleted }.map { it.packageName }.filter(allowed).toSet()
}
