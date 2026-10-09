package io.github.ztsia.sen.capture

import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * The notification listener (spec §6.2): granted once in Android's settings, it runs while the app is
 * closed. On connect it reads the notifications still showing, so nothing posted while it was
 * disconnected is missed; their dedupe keys make that replay a no-op for anything already stored.
 */
class CaptureListener : NotificationListenerService() {
    override fun onListenerConnected() {
        connected = true
        Heartbeat.record(this, "connected")
        val showing = runCatching { activeNotifications }.getOrNull().orEmpty()
        showing.forEach { Capture.post(this, it) }
    }

    override fun onListenerDisconnected() {
        connected = false
        Heartbeat.record(this, "disconnected")
        // Ask Android to bind us again; the heartbeat worker asks too, if this one is lost.
        requestRebind(ComponentName(this, CaptureListener::class.java))
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        Capture.post(this, sbn)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification, rankingMap: RankingMap?) {
        Capture.post(this, sbn)
    }

    companion object {
        /** Whether Android has this process's listener bound right now. */
        @Volatile var connected: Boolean = false
            private set
    }
}
