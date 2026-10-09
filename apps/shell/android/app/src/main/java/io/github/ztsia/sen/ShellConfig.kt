package io.github.ztsia.sen

import android.content.Context
import androidx.core.content.ContextCompat
import com.getcapacitor.CapConfig
import org.json.JSONObject
import java.net.URLEncoder

/**
 * The bridge's config, built at launch for this build's one site (spec §17, sites.json): release loads
 * production, debug the review alias, e2e the test server. `allowNavigation` stays empty, so the page
 * can't navigate the WebView anywhere else (Capacitor sends any other address to the browser), and the
 * bridge answers only this site's origin: Capacitor injects itself with a document-start script and a
 * web-message listener, both limited to it.
 *
 * When the site can't load and the service worker has nothing cached, the shell's own page from the
 * APK shows instead (`www/index.html`), told which site to go back to.
 */
object ShellConfig {
    fun build(context: Context): CapConfig {
        val shared = context.assets.open("capacitor.config.json").use { JSONObject(it.reader().readText()) }
        val bg = ContextCompat.getColor(context, R.color.sen_background)
        val builder =
            CapConfig.Builder(context)
                .setAllowNavigation(arrayOf())
                .setPluginsConfiguration(shared.optJSONObject("plugins") ?: JSONObject())
                .setBackgroundColor(String.format("#%06X", 0xFFFFFF and bg))
                .setAllowMixedContent(false)
                // Logs carry plugin calls and their data; the release logs nothing (spec §17).
                .setLoggingEnabled(BuildConfig.BUILD_NAME != "release")
        val site = BuildConfig.SEN_URL
        if (site.isNotEmpty()) {
            builder.setServerUrl(site).setErrorPath("index.html?app=" + URLEncoder.encode(site, "UTF-8"))
        }
        // With no site set yet, Capacitor shows the APK's own page, which says so.
        return builder.create()
    }
}
