package io.github.ztsia.sen.sync

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import io.github.ztsia.sen.MainActivity
import io.github.ztsia.sen.R
import io.github.ztsia.sen.capture.Outbox
import io.github.ztsia.sen.core.isSchedulerLate
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * The 26-hour check (spec §18, B07): every sync returns when the server's morning job last ran, by the
 * server's clock. More than 26 hours ago, the shell posts its own notification (the server may be the
 * thing that's down, so a push wouldn't do), at most once per Kuala Lumpur day. Back under 26 hours, the
 * notification is taken down. The rule itself is `isSchedulerLate` in the pure core.
 */
object SchedulerCheck {
    const val CHANNEL = "sen-health"
    const val NOTIFICATION_ID = 7107

    fun check(context: Context, morningAtMs: Long?, serverNowMs: Long) {
        val outbox = Outbox.get(context)
        if (!isSchedulerLate(morningAtMs, serverNowMs)) {
            NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
            return
        }
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = TimeZone.getTimeZone("Asia/Kuala_Lumpur") }.format(serverNowMs)
        if (outbox.meta(Meta.LATE_NOTICE_DAY) == today) return
        if (post(context)) outbox.setMeta(Meta.LATE_NOTICE_DAY, today)
    }

    /** False when the phone won't show it (notifications are off for Sen): the day isn't spent then. */
    private fun post(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return false
        }
        if (Build.VERSION.SDK_INT >= 26) {
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel(CHANNEL, context.getString(R.string.channel_health), NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = context.getString(R.string.channel_health_about)
                },
            )
        }
        val open =
            PendingIntent.getActivity(
                context,
                0,
                Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
        val n =
            NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_minted)
                .setContentTitle(context.getString(R.string.health_late_title))
                .setContentText(context.getString(R.string.health_late_text))
                .setStyle(NotificationCompat.BigTextStyle().bigText(context.getString(R.string.health_late_text)))
                .setContentIntent(open)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .build()
        return try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, n)
            true
        } catch (_: SecurityException) {
            false
        }
    }
}
