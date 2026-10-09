package io.github.ztsia.sen.bridge

import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import io.github.ztsia.sen.BuildConfig
import io.github.ztsia.sen.capture.CaptureListener
import io.github.ztsia.sen.capture.Chosen
import io.github.ztsia.sen.capture.Heartbeat
import io.github.ztsia.sen.capture.InstalledApps
import io.github.ztsia.sen.capture.KeepRunning
import io.github.ztsia.sen.capture.Outbox
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Capture, to the web app's Settings → Capture (spec §6.2, §9.5 steps 2-4). The chosen apps are set
 * here, through the classifier, never trusted from the page. Events are read back only for the soak's
 * *Captured on this phone* (B07 replaces it); they never leave the phone except through the share
 * sheet, when the owner chooses.
 */
@CapacitorPlugin(name = "SenCapture")
class SenCapturePlugin : Plugin() {
    @PluginMethod
    fun status(call: PluginCall) {
        val s = Heartbeat.state(context)
        call.resolve(
            JSObject()
                .put("enabled", BuildConfig.CAPTURE)
                .put("access", s.access)
                .put("connected", s.connected)
                .put("beatAt", s.beatAt)
                .put("eventAt", s.eventAt)
                .put("connectedAt", s.connectedAt)
                .put("disconnectedAt", s.disconnectedAt)
                .put("ignoringBattery", KeepRunning.ignoringBattery(context))
                .put("chosen", JSArray(Chosen.get(context).sorted()))
                .put("events", Outbox.get(context).count())
                // Android 13+ greys out notification access for sideloaded apps until "Allow restricted
                // settings" is chosen on the app's info page (spec §6.2).
                .put("restrictedSettings", Build.VERSION.SDK_INT >= 33),
        )
    }

    @PluginMethod
    fun apps(call: PluginCall) {
        val chosen = Chosen.get(context)
        val list = InstalledApps.list(context, icons = call.getBoolean("icons", true) ?: true)
        val out = JSArray()
        list.forEach { a ->
            out.put(
                JSObject()
                    .put("package", a.packageName)
                    .put("label", a.label)
                    .put("curated", a.curated != null)
                    .put("kind", a.curated?.kind)
                    .put("accounts", JSArray(a.curated?.accounts ?: emptyList<String>()))
                    .put("blocked", a.blocked?.name?.lowercase())
                    .put("chosen", a.packageName in chosen)
                    .put("icon", a.icon),
            )
        }
        call.resolve(JSObject().put("apps", out))
    }

    /** Replaces the chosen list. Refused apps are left out and reported, never stored. */
    @PluginMethod
    fun setChosen(call: PluginCall) {
        val asked = call.getArray("packages")?.toList<String>().orEmpty().toSet()
        val installed = InstalledApps.list(context, icons = false).associateBy { it.packageName }
        val refused = JSArray()
        val ok = mutableSetOf<String>()
        asked.forEach { p ->
            val app = installed[p]
            val why = if (app == null) "missing" else app.blocked?.name?.lowercase()
            if (why == null) ok += p else refused.put(JSObject().put("package", p).put("reason", why))
        }
        Chosen.set(context, ok)
        call.resolve(JSObject().put("chosen", JSArray(ok.sorted())).put("refused", refused))
    }

    @PluginMethod
    fun openNotificationAccess(call: PluginCall) {
        val component = ComponentName(context, CaptureListener::class.java)
        val detail =
            if (Build.VERSION.SDK_INT >= 30) {
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
                    .putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, component.flattenToString())
            } else {
                null
            }
        start(call, listOfNotNull(detail, Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)))
    }

    /** The app's own info page, where "Allow restricted settings" lives (its ⋮ menu). */
    @PluginMethod
    fun openAppInfo(call: PluginCall) = start(call, listOf(KeepRunning.appInfoIntent(context)))

    @PluginMethod
    fun requestIgnoreBattery(call: PluginCall) =
        start(call, listOf(KeepRunning.batteryIntent(context), Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)))

    @PluginMethod
    fun keepRunning(call: PluginCall) {
        val brand = KeepRunning.brand(context)
        call.resolve(
            JSObject()
                .put("manufacturer", Build.MANUFACTURER)
                .put("ignoringBattery", KeepRunning.ignoringBattery(context))
                .put("brand", brand?.let { JSObject(it.toString()) }),
        )
    }

    @PluginMethod
    fun openBrandStep(call: PluginCall) {
        val i = call.getInt("index") ?: -1
        start(call, listOf(KeepRunning.stepIntent(context, i), KeepRunning.appInfoIntent(context)))
    }

    @PluginMethod
    fun events(call: PluginCall) {
        val limit = (call.getInt("limit") ?: 50).coerceIn(1, 200)
        val before = call.getLong("before")
        val outbox = Outbox.get(context)
        val out = JSArray()
        outbox.events(limit, before).forEach { e ->
            out.put(
                JSObject()
                    .put("id", e.id)
                    .put("package", e.packageName)
                    .put("channel", e.channel)
                    .put("postTime", e.postTime)
                    .put("when", e.whenMillis)
                    .put("title", e.title)
                    .put("text", e.text)
                    .put("bigText", e.bigText)
                    .put("capturedAt", e.capturedAt)
                    .put("synced", e.synced),
            )
        }
        call.resolve(JSObject().put("events", out).put("total", outbox.count()))
    }

    @PluginMethod
    fun heartbeats(call: PluginCall) {
        val out = JSArray()
        Outbox.get(context).beats((call.getInt("limit") ?: 100).coerceIn(1, 2000)).forEach { b ->
            out.put(JSObject().put("at", b.at).put("kind", b.kind).put("connected", b.connected))
        }
        call.resolve(JSObject().put("beats", out))
    }

    /**
     * Share samples: the chosen events as text, through Android's share sheet, so the owner can paste
     * them into a session that anonymises them (docs/notifications.md). Nothing is sent by Sen itself.
     */
    @PluginMethod
    fun shareSamples(call: PluginCall) {
        val ids = call.getArray("ids")?.toList<Any>().orEmpty().map { (it as Number).toLong() }
        val events = Outbox.get(context).events(ids.size.coerceAtLeast(1), ids = ids).reversed()
        if (events.isEmpty()) return call.reject("Nothing chosen", "EMPTY")
        val kl = SimpleDateFormat("d MMM yyyy, h:mm:ss a", Locale.ENGLISH).apply { timeZone = TimeZone.getTimeZone("Asia/Kuala_Lumpur") }
        val text =
            events.joinToString("\n\n") { e ->
                buildString {
                    appendLine("App: ${e.packageName}")
                    appendLine("Channel: ${e.channel ?: "-"}")
                    appendLine("Posted: ${kl.format(Date(e.postTime))} (when: ${kl.format(Date(e.whenMillis))})")
                    appendLine("Title: ${e.title ?: ""}")
                    appendLine("Text: ${e.text ?: ""}")
                    if (e.bigText != null && e.bigText != e.text) appendLine("Expanded: ${e.bigText}")
                }.trimEnd()
            }
        val send =
            Intent(Intent.ACTION_SEND)
                .setType("text/plain")
                .putExtra(Intent.EXTRA_SUBJECT, "Sen samples (${events.size})")
                .putExtra(Intent.EXTRA_TEXT, "Sen samples: real notifications, to anonymise before anything is saved.\n\n$text")
        start(call, listOf(Intent.createChooser(send, "Share samples")))
    }

    private fun start(call: PluginCall, intents: List<Intent>) {
        for (intent in intents) {
            try {
                activity.startActivity(intent)
                return call.resolve(JSObject().put("opened", intent.action ?: intent.component?.flattenToShortString()))
            } catch (_: ActivityNotFoundException) {
                continue
            } catch (_: SecurityException) {
                continue
            }
        }
        call.reject("Couldn't open that settings page", "NOT_FOUND")
    }
}
