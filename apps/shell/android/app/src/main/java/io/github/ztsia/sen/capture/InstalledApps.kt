package io.github.ztsia.sen.capture

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.os.Build
import android.provider.Telephony
import android.util.Base64
import io.github.ztsia.sen.core.AppClassifier
import io.github.ztsia.sen.core.AppFacts
import io.github.ztsia.sen.core.BlockReason
import org.json.JSONObject
import java.io.ByteArrayOutputStream

/**
 * The picker's apps (D86): every launchable app, found through the manifest's `<queries>` (never
 * QUERY_ALL_PACKAGES), each marked if it's on the curated list and why it can't be chosen, if it can't.
 */
object InstalledApps {
    data class Curated(val packageName: String, val label: String, val kind: String, val accounts: List<String>)

    data class App(
        val packageName: String,
        val label: String,
        val curated: Curated?,
        val blocked: BlockReason?,
        val icon: String?,
    )

    fun curated(context: Context): List<Curated> {
        val json = context.assets.open("capture-apps.json").use { JSONObject(it.reader().readText()) }
        val apps = json.getJSONArray("apps")
        return (0 until apps.length()).map { i ->
            val a = apps.getJSONObject(i)
            val acc = a.getJSONArray("accounts")
            Curated(a.getString("package"), a.getString("label"), a.getString("kind"), (0 until acc.length()).map(acc::getString))
        }
    }

    fun list(context: Context, icons: Boolean): List<App> {
        val pm = context.packageManager
        val curated = curated(context).associateBy { it.packageName }
        val launchable =
            pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
                .map { it.activityInfo.applicationInfo }
                .distinctBy { it.packageName }
        val sms = handlers(pm, "smsto") + handlers(pm, "mmsto")
        val email = handlers(pm, "mailto")
        val defaultSms = Telephony.Sms.getDefaultSmsPackage(context)
        return launchable
            .map { info ->
                val facts =
                    AppFacts(
                        packageName = info.packageName,
                        isDefaultSms = info.packageName == defaultSms,
                        isSocial = Build.VERSION.SDK_INT >= 26 && info.category == ApplicationInfo.CATEGORY_SOCIAL,
                        handlesSms = info.packageName in sms,
                        handlesEmail = info.packageName in email,
                    )
                App(
                    packageName = info.packageName,
                    label = pm.getApplicationLabel(info).toString(),
                    curated = curated[info.packageName],
                    blocked = AppClassifier.blocked(facts, context.packageName),
                    icon = if (icons) icon(pm, info) else null,
                )
            }
            .sortedWith(compareBy({ it.curated == null }, { it.label.lowercase() }))
    }

    /** Why this package can't be chosen, or "missing" if it isn't installed and launchable; null if it can. */
    fun refusal(context: Context, packageName: String): String? {
        val app = list(context, icons = false).find { it.packageName == packageName } ?: return "missing"
        return app.blocked?.name?.lowercase()
    }

    private fun handlers(pm: PackageManager, scheme: String): Set<String> =
        pm.queryIntentActivities(Intent(Intent.ACTION_SENDTO, Uri.parse("$scheme:")), 0)
            .map { it.activityInfo.packageName }
            .toSet()

    private fun icon(pm: PackageManager, info: ApplicationInfo): String? =
        runCatching {
            val d = pm.getApplicationIcon(info)
            val px = 96
            val bmp = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888)
            d.setBounds(0, 0, px, px)
            d.draw(Canvas(bmp))
            val out = ByteArrayOutputStream()
            bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
            "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        }.getOrNull()
}
