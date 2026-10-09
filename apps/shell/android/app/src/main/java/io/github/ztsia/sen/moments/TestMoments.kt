package io.github.ztsia.sen.moments

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import io.github.ztsia.sen.R

/**
 * The hidden tests for the soak (brief B02; docs/local.md says what the owner checks): a category
 * prompt with three buttons, an island moment (an Android 16 Live Update with a countdown), and the
 * launcher icon switch (D77). Everything they show is made up and says it's a test.
 */
object TestMoments {
    private const val TESTS = "tests"
    private const val MOMENTS = "moments"
    const val PROMPT_ID = 9101
    const val ISLAND_ID = 9102

    fun channels(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(TESTS, context.getString(R.string.channel_tests), NotificationManager.IMPORTANCE_HIGH).apply {
                description = context.getString(R.string.channel_tests_about)
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(MOMENTS, context.getString(R.string.channel_moments), NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = context.getString(R.string.channel_moments_about)
            },
        )
    }

    private fun action(context: Context, id: Int, label: String): Notification.Action {
        val intent =
            Intent(context, TestActionReceiver::class.java)
                .putExtra(TestActionReceiver.EXTRA_ID, id)
                .putExtra(TestActionReceiver.EXTRA_LABEL, label)
        val pi = PendingIntent.getBroadcast(context, (id * 31 + label.hashCode()), intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        return Notification.Action.Builder(null, label, pi).build()
    }

    /** A category prompt as B12 will post it, with three buttons. */
    fun prompt(context: Context) {
        channels(context)
        val n =
            Notification.Builder(context, TESTS)
                .setSmallIcon(R.drawable.ic_stat_minted)
                .setContentTitle("Test · RM12.90 at a café")
                .setContentText("Which category? (a test from Settings)")
                .setAutoCancel(true)
                .addAction(action(context, PROMPT_ID, "Meals"))
                .addAction(action(context, PROMPT_ID, "Coffee"))
                .addAction(action(context, PROMPT_ID, "Scan receipt"))
                .build()
        context.getSystemService(NotificationManager::class.java).notify(PROMPT_ID, n)
    }

    /**
     * An island moment (D101): on Android 16 a Live Update, which HyperOS 3.1 draws as the Hyper Island.
     * It counts down a minute and closes by itself. Returns whether Android will promote it.
     */
    fun island(context: Context): Boolean {
        channels(context)
        val nm = context.getSystemService(NotificationManager::class.java)
        val minute = 60_000L
        val b =
            Notification.Builder(context, MOMENTS)
                .setSmallIcon(R.drawable.ic_stat_minted)
                .setContentTitle("Just paid · test")
                .setContentText("RM12.90 at a café. Which category?")
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(true)
                .setWhen(System.currentTimeMillis() + minute)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setTimeoutAfter(minute)
                .setStyle(Notification.BigTextStyle().bigText("RM12.90 at a café, a test from Settings. It closes by itself in a minute."))
                .addAction(action(context, ISLAND_ID, "Meals"))
                .addAction(action(context, ISLAND_ID, "Coffee"))
                .addAction(action(context, ISLAND_ID, "Scan receipt"))
        var promoted = false
        if (Build.VERSION.SDK_INT >= 36) {
            b.setShortCriticalText("−RM12.90")
            // Notification.EXTRA_REQUEST_PROMOTED_ONGOING, which API 36's stubs don't list yet; androidx's
            // NotificationCompat.Builder.setRequestPromotedOngoing sets the same key.
            b.extras.putBoolean("android.requestPromotedOngoing", true)
            promoted = nm.canPostPromotedNotifications()
        }
        nm.notify(ISLAND_ID, b.build())
        return promoted
    }

    private val ICONS = listOf("LauncherMinted" to "minted", "LauncherInstrument" to "instrument")

    /** Swaps the launcher icon between Minted and Instrument (D77), without killing the app. */
    fun switchIcon(context: Context): String {
        val pm = context.packageManager
        val comps = ICONS.map { (cls, look) -> ComponentName(context.packageName, "io.github.ztsia.sen.$cls") to look }
        val current = comps.indexOfFirst { (c, _) -> enabled(pm, c, default = c.className.endsWith("Minted")) }.coerceAtLeast(0)
        val next = (current + 1) % comps.size
        // Enable the new one first, so the launcher is never left without Sen.
        pm.setComponentEnabledSetting(comps[next].first, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
        pm.setComponentEnabledSetting(comps[current].first, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
        return comps[next].second
    }

    fun currentIcon(context: Context): String {
        val pm = context.packageManager
        return if (enabled(pm, ComponentName(context.packageName, "io.github.ztsia.sen.LauncherInstrument"), false)) "instrument" else "minted"
    }

    private fun enabled(pm: PackageManager, c: ComponentName, default: Boolean): Boolean =
        when (pm.getComponentEnabledSetting(c)) {
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED -> false
            else -> default
        }
}
