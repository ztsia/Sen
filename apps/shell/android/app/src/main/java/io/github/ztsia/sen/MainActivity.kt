package io.github.ztsia.sen

import android.os.Bundle
import android.os.SystemClock
import android.webkit.WebView
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.getcapacitor.BridgeActivity
import com.getcapacitor.WebViewListener
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
        bridge?.addWebViewListener(
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
}
