package io.github.ztsia.sen.capture

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Notes each boot and app update in the heartbeat's log; Android rebinds the listener by itself. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED -> Heartbeat.record(context, "boot")
            Intent.ACTION_MY_PACKAGE_REPLACED -> Heartbeat.record(context, "updated")
        }
    }
}
