package io.github.ztsia.sen.capture

import android.content.ComponentName
import android.content.Context
import android.service.notification.NotificationListenerService
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * The local heartbeat (spec §6.2, Health): whether the listener is connected, and when the last event
 * arrived. An hourly beat, plus each connect, disconnect and boot, goes into the outbox's log, so the
 * soak can show capture surviving a reboot and an idle day. B07 sends it to the server.
 */
object Heartbeat {
    private const val PREFS = "heartbeat"
    private const val WORK = "sen-heartbeat"

    fun schedule(context: Context) {
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WORK,
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<Beat>(1, TimeUnit.HOURS).build(),
        )
    }

    fun record(context: Context, kind: String) {
        val connected = CaptureListener.connected
        val now = System.currentTimeMillis()
        prefs(context).edit().apply {
            putBoolean("connected", connected)
            putLong("beat_at", now)
            if (kind == "connected") putLong("connected_at", now)
            if (kind == "disconnected") putLong("disconnected_at", now)
        }.apply()
        Capture.after { Outbox.get(context).beat(kind, connected, now) }
    }

    fun event(context: Context) {
        prefs(context).edit().putLong("event_at", System.currentTimeMillis()).apply()
    }

    data class State(val access: Boolean, val connected: Boolean, val beatAt: Long, val eventAt: Long, val connectedAt: Long, val disconnectedAt: Long)

    fun state(context: Context): State {
        val p = prefs(context)
        return State(
            access = hasAccess(context),
            connected = CaptureListener.connected,
            beatAt = p.getLong("beat_at", 0),
            eventAt = p.getLong("event_at", 0),
            connectedAt = p.getLong("connected_at", 0),
            disconnectedAt = p.getLong("disconnected_at", 0),
        )
    }

    fun hasAccess(context: Context): Boolean =
        context.packageName in NotificationManagerCompat.getEnabledListenerPackages(context)

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    class Beat(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
        override suspend fun doWork(): Result {
            val ctx = applicationContext
            if (hasAccess(ctx)) {
                record(ctx, "beat")
                if (!CaptureListener.connected) {
                    NotificationListenerService.requestRebind(ComponentName(ctx, CaptureListener::class.java))
                }
            }
            return Result.success()
        }
    }
}
