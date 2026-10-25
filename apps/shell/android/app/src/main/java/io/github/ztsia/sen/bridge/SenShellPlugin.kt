package io.github.ztsia.sen.bridge

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.view.HapticFeedbackConstants
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

    /**
     * A haptic on one of a few moments (patterns.md §8, B05). Through the WebView's own
     * performHapticFeedback, so it follows the phone's touch-feedback setting by itself, which a
     * vibrator call wouldn't. Resolves with whether the phone played it.
     */
    @PluginMethod
    fun haptic(call: PluginCall) {
        val constant = hapticConstant(call.getString("kind"), Build.VERSION.SDK_INT)
            ?: return call.reject("Unknown haptic", "UNKNOWN_KIND")
        activity.runOnUiThread {
            val performed = bridge.webView.performHapticFeedback(constant)
            call.resolve(JSObject().put("performed", performed))
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
        /**
         * 1: info, openInBrowser, testPrompt, testIsland, switchIcon; SenCapture (B02).
         * 2: haptic (B05).
         * 3: Capawesome's FirebaseMessaging plugin is in the shell: push (B06).
         */
        const val BRIDGE = 3

        /** Each moment's haptic, with an older phone's nearest where Android added it later (API 30, 34). */
        fun hapticConstant(kind: String?, sdk: Int): Int? = when (kind) {
            "confirm" -> if (sdk >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.CONTEXT_CLICK
            "reject" -> if (sdk >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
            "long-press" -> HapticFeedbackConstants.LONG_PRESS
            "toggle-on" -> if (sdk >= 34) HapticFeedbackConstants.TOGGLE_ON else HapticFeedbackConstants.CONTEXT_CLICK
            "toggle-off" -> if (sdk >= 34) HapticFeedbackConstants.TOGGLE_OFF else HapticFeedbackConstants.CLOCK_TICK
            "threshold" ->
                if (sdk >= 34) HapticFeedbackConstants.GESTURE_THRESHOLD_ACTIVATE else HapticFeedbackConstants.CONTEXT_CLICK
            "tick" -> if (sdk >= 34) HapticFeedbackConstants.SEGMENT_TICK else HapticFeedbackConstants.CLOCK_TICK
            else -> null
        }
    }
}
