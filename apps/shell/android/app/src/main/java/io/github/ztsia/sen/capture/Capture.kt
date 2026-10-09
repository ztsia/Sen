package io.github.ztsia.sen.capture

import android.app.Notification
import android.content.Context
import android.os.Build
import android.service.notification.StatusBarNotification
import io.github.ztsia.sen.core.CaptureGate
import io.github.ztsia.sen.core.Decision
import io.github.ztsia.sen.core.DropReason
import io.github.ztsia.sen.core.Posted
import java.util.concurrent.Executors

/**
 * From a posted notification to the outbox (spec §6.2). Nothing about a notification from an app that
 * wasn't chosen is read, stored or logged: the package check comes before its extras are touched.
 * Notification text is never logged, in any build.
 */
object Capture {
    private val gate by lazy { CaptureGate() }
    private val worker = Executors.newSingleThreadExecutor { r -> Thread(r, "sen-capture") }

    fun post(context: Context, sbn: StatusBarNotification) {
        val app = context.applicationContext
        // The chosen-apps check, first, on the listener's thread: an unchosen app's notification is
        // never copied anywhere.
        if (sbn.packageName !in Chosen.get(app)) return
        val posted = read(sbn)
        worker.execute { store(app, posted) }
    }

    /** Synchronous, for the listener's tests and the reconnect replay. */
    fun store(context: Context, posted: Posted): Boolean {
        val outbox = Outbox.get(context)
        return when (val d = gate.decide(posted, Chosen.get(context), outbox.droppedChannels())) {
            is Decision.Drop -> {
                // a one-time code from a chosen app: logged by time and app, never its text (Outbox.beat)
                if (d.reason == DropReason.OTP) Heartbeat.dropped(context, posted.packageName)
                false
            }
            is Decision.Keep -> {
                // only a new event moves "last captured": a replay or a duplicate isn't news (B07's
                // watchdog reads this time)
                outbox.insert(d.event).also { new -> if (new) Heartbeat.event(context) }
            }
        }
    }

    fun read(sbn: StatusBarNotification): Posted {
        val n = sbn.notification
        val x = n.extras
        val lines = x.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        val bigText =
            x.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?: lines?.takeIf { it.isNotEmpty() }?.joinToString("\n")
        return Posted(
            packageName = sbn.packageName,
            key = sbn.key,
            channel = if (Build.VERSION.SDK_INT >= 26) n.channelId else null,
            postTime = sbn.postTime,
            whenMillis = n.`when`,
            title = (x.getCharSequence(Notification.EXTRA_TITLE_BIG) ?: x.getCharSequence(Notification.EXTRA_TITLE))?.toString(),
            text = x.getCharSequence(Notification.EXTRA_TEXT)?.toString(),
            bigText = bigText,
            isGroupSummary = (n.flags and Notification.FLAG_GROUP_SUMMARY) != 0,
            isOngoing = sbn.isOngoing,
        )
    }

    /** Runs a task on the capture thread, in order after any pending stores. */
    fun after(task: () -> Unit) = worker.execute(task)
}
