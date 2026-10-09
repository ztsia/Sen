package io.github.ztsia.sen.capture

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import org.json.JSONObject

/**
 * Keep Sen running (spec §6.2, D86): Android's own battery dialog for every phone, then the steps for
 * this phone's brand, picked by Build.MANUFACTURER from apps/shell/data/keep-running.json (written from
 * dontkillmyapp.com). Only Xiaomi is tested; the heartbeat is the real check.
 */
object KeepRunning {
    fun ignoringBattery(context: Context): Boolean =
        (context.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(context.packageName)

    fun batteryIntent(context: Context): Intent =
        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + context.packageName))

    fun appInfoIntent(context: Context): Intent =
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + context.packageName))

    /** This phone's brand entry from the data file, or null when dontkillmyapp has none for it. */
    fun brand(context: Context): JSONObject? {
        val data = context.assets.open("keep-running.json").use { JSONObject(it.reader().readText()) }
        val maker = Build.MANUFACTURER.lowercase()
        val brands = data.getJSONArray("brands")
        for (i in 0 until brands.length()) {
            val b = brands.getJSONObject(i)
            val makers = b.getJSONArray("manufacturers")
            if ((0 until makers.length()).any { makers.getString(it) == maker }) {
                b.put("tested", data.getJSONArray("tested").let { t -> (0 until t.length()).any { t.getString(it) == b.getString("id") } })
                return b
            }
        }
        return null
    }

    /** The settings page a brand step opens, with its extras filled in; the app's info page if it has none. */
    fun stepIntent(context: Context, index: Int): Intent {
        val opens = brand(context)?.optJSONArray("opens") ?: return appInfoIntent(context)
        if (index !in 0 until opens.length()) return appInfoIntent(context)
        val o = opens.getJSONObject(index)
        val intent = Intent().setComponent(ComponentName.unflattenFromString(o.getString("component")))
        val label = context.applicationInfo.loadLabel(context.packageManager).toString()
        o.optJSONObject("extras")?.let { x ->
            x.keys().forEach { k -> intent.putExtra(k, x.getString(k).replace("{package}", context.packageName).replace("{label}", label)) }
        }
        return intent
    }
}
