package io.github.ztsia.sen.sync

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import io.github.ztsia.sen.capture.CaptureListener
import io.github.ztsia.sen.capture.Outbox

/**
 * The person's *Capture* switch (D98, spec §9.6), obeyed here. The server says it on every sync. Off, the
 * listener's component is disabled, which unbinds it: nothing more is captured, and nothing is deleted.
 * On again, the component goes back to the manifest's setting and Android is asked to rebind it.
 * It only touches the component when its state differs, and only the explicit disabled state we set: the
 * debug build's listener, off in its manifest, is never switched on from here.
 */
object CaptureSwitch {
    fun isOn(context: Context): Boolean = Outbox.get(context).meta(Meta.CAPTURE_ON) != "0"

    fun apply(context: Context, on: Boolean) {
        val pm = context.packageManager
        val listener = ComponentName(context, CaptureListener::class.java)
        val disabled = pm.getComponentEnabledSetting(listener) == PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        if (!on && !disabled) {
            pm.setComponentEnabledSetting(listener, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
        } else if (on && disabled) {
            pm.setComponentEnabledSetting(listener, PackageManager.COMPONENT_ENABLED_STATE_DEFAULT, PackageManager.DONT_KILL_APP)
            runCatching { NotificationListenerService.requestRebind(listener) }
        }
        val outbox = Outbox.get(context)
        val want = if (on) "1" else "0"
        if (outbox.meta(Meta.CAPTURE_ON) != want) outbox.setMeta(Meta.CAPTURE_ON, want)
    }
}
