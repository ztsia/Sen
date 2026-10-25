package io.github.ztsia.sen

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import io.github.ztsia.sen.capture.Heartbeat

class SenApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // The heartbeat runs only where capture does: release and e2e, never the debug build.
        if (BuildConfig.CAPTURE) Heartbeat.schedule(this)
        // Push (B06): the channel FCM's notifications use (the manifest names it), made before the first.
        // Channels arrived in Android 8; before it, a notification has no channel to need.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel(ALERTS, getString(R.string.channel_alerts), NotificationManager.IMPORTANCE_HIGH).apply {
                    description = getString(R.string.channel_alerts_about)
                },
            )
        }
    }

    companion object {
        /** The manifest's `default_notification_channel_id`. */
        const val ALERTS = "alerts"
    }
}
