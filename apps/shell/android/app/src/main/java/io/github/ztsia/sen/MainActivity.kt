package io.github.ztsia.sen

import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Bundle
import android.os.SystemClock
import android.webkit.WebResourceRequest
import android.webkit.WebView
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.getcapacitor.BridgeActivity
import com.getcapacitor.BridgeWebViewClient
import com.getcapacitor.WebViewListener
import io.github.ztsia.sen.core.Origin
import io.github.ztsia.sen.bridge.SenCapturePlugin
import io.github.ztsia.sen.bridge.SenShellPlugin

/**
 * The one activity: Capacitor's WebView showing the web app (spec §5). The launcher reaches it through
 * an alias per look (the manifest). The splash holds until the page first paints, or 3 seconds.
 */
class MainActivity : BridgeActivity() {
    @Volatile private var painted = false

    override fun onCreate(savedInstanceState: Bundle?) {
        val started = SystemClock.uptimeMillis()
        installSplashScreen().setKeepOnScreenCondition { !painted && SystemClock.uptimeMillis() - started < 3_000 }
        registerPlugin(SenShellPlugin::class.java)
        registerPlugin(SenCapturePlugin::class.java)
        config = ShellConfig.build(this)
        super.onCreate(savedInstanceState)
        val bridge = bridge ?: return
        bridge.setWebViewClient(SiteOnly(bridge))
        bridge.addWebViewListener(
            object : WebViewListener() {
                override fun onPageCommitVisible(view: WebView, url: String) {
                    painted = true
                }

                override fun onReceivedError(webView: WebView) {
                    painted = true
                }
            },
        )
    }

    /**
     * Only the site's own origin stays in the WebView (spec §17). Capacitor's own check accepts any URL
     * that starts with the site's address; this one compares the origin exactly. An https link elsewhere
     * goes to the phone's browser, and anything else (intent:, javascript:) goes nowhere.
     */
    private inner class SiteOnly(bridge: com.getcapacitor.Bridge) : BridgeWebViewClient(bridge) {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url.toString()
            if (BuildConfig.SEN_URL.isNotEmpty() && Origin.same(url, BuildConfig.SEN_URL)) {
                return super.shouldOverrideUrlLoading(view, request)
            }
            if (request.url.scheme == "https") {
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, request.url).addCategory(Intent.CATEGORY_BROWSABLE))
                } catch (_: ActivityNotFoundException) {
                    // no browser: the link goes nowhere
                }
            }
            return true
        }
    }
}
