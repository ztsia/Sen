package io.github.ztsia.sen.bridge

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import io.github.ztsia.sen.BuildConfig
import io.github.ztsia.sen.moments.TestMoments

/**
 * The shell itself, to the web app (apps/web/src/shell/). Methods are only ever added, never changed
 * or removed, so a newer web app on an older shell feature-detects with `info().bridge` and Capacitor's
 * UNIMPLEMENTED; `BRIDGE` counts the additions.
 */
@CapacitorPlugin(
    name = "SenShell",
    permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])],
)
class SenShellPlugin : Plugin() {
    @PluginMethod
    fun info(call: PluginCall) {
        call.resolve(
            JSObject()
                .put("bridge", BRIDGE)
                .put("version", BuildConfig.VERSION_NAME)
                .put("versionCode", BuildConfig.VERSION_CODE)
                .put("build", BuildConfig.BUILD_NAME)
                .put("capture", BuildConfig.CAPTURE)
                .put("manufacturer", Build.MANUFACTURER)
                .put("model", Build.MODEL)
                .put("sdk", Build.VERSION.SDK_INT)
                .put("icon", TestMoments.currentIcon(context)),
        )
    }

    /** Every external link opens in the phone's default browser, never the WebView or a Custom Tab (spec §17). */
    @PluginMethod
    fun openInBrowser(call: PluginCall) {
        val uri = call.getString("url")?.let(Uri::parse)
        if (uri == null || uri.scheme != "https" || uri.host.isNullOrEmpty()) {
            call.reject("Only https links open", "NOT_HTTPS")
            return
        }
        val intent = Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            activity.startActivity(intent)
            call.resolve()
        } catch (e: ActivityNotFoundException) {
            call.reject("No browser", "NO_BROWSER")
        }
    }

    // The hidden tests (Settings → Account, a long-press on the version).

    @PluginMethod
    fun testPrompt(call: PluginCall) = withNotifications(call, "promptAllowed")

    @PermissionCallback
    private fun promptAllowed(call: PluginCall) {
        if (!notificationsAllowed()) return call.reject("Notifications are off for Sen", "NOTIFICATIONS_OFF")
        TestMoments.prompt(context)
        call.resolve()
    }

    @PluginMethod
    fun testIsland(call: PluginCall) = withNotifications(call, "islandAllowed")

    @PermissionCallback
    private fun islandAllowed(call: PluginCall) {
        if (!notificationsAllowed()) return call.reject("Notifications are off for Sen", "NOTIFICATIONS_OFF")
        val promoted = TestMoments.island(context)
        call.resolve(JSObject().put("promoted", promoted).put("liveUpdates", Build.VERSION.SDK_INT >= 36))
    }

    @PluginMethod
    fun switchIcon(call: PluginCall) {
        call.resolve(JSObject().put("icon", TestMoments.switchIcon(context)))
    }

    private fun notificationsAllowed() =
        Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED

    private fun withNotifications(call: PluginCall, callback: String) {
        if (notificationsAllowed()) {
            if (callback == "promptAllowed") promptAllowed(call) else islandAllowed(call)
        } else {
            requestPermissionForAlias("notifications", call, callback)
        }
    }

    companion object {
        /** 1: info, openInBrowser, testPrompt, testIsland, switchIcon; SenCapture (B02). */
        const val BRIDGE = 1
    }
}
