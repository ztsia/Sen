package io.github.ztsia.sen

import android.webkit.WebView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.FixMethodOrder
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.MethodSorters
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/**
 * B02 done-when 2 and 3, on GitHub Actions' emulator. The e2e build loads http://localhost:4173, the
 * production web build served on the runner by apps/shell/e2e/serve.mjs and reached through
 * `adb reverse`. The server can be told to drop every connection (/__sen_offline), which is what
 * airplane mode looks like to the WebView. 127.0.0.1:4173 is the same server under another origin.
 *
 * In order, on a freshly installed app: the shell's own page when the site is unreachable and nothing
 * is cached; the bridge, for our origin; no bridge for another origin; then the app opening offline
 * from the service worker.
 */
@RunWith(AndroidJUnit4::class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class ShellTest {
    private val site = BuildConfig.SEN_URL

    private fun offline(on: Boolean) {
        val c = URL("$site/__sen_offline?on=${if (on) 1 else 0}").openConnection() as HttpURLConnection
        assertEquals(204, c.responseCode)
        c.disconnect()
    }

    private fun <T> onWebView(s: ActivityScenario<MainActivity>, f: (WebView) -> T): T {
        val out = AtomicReference<T>()
        s.onActivity { out.set(f(it.bridge.webView)) }
        return out.get()
    }

    /** Evaluates JavaScript in the page and returns its JSON result. */
    private fun js(s: ActivityScenario<MainActivity>, code: String): String {
        val latch = CountDownLatch(1)
        val out = AtomicReference("null")
        s.onActivity { a -> a.bridge.webView.evaluateJavascript(code) { r -> out.set(r); latch.countDown() } }
        latch.await(10, TimeUnit.SECONDS)
        return out.get()
    }

    private fun waitJs(s: ActivityScenario<MainActivity>, what: String, code: String, timeoutMs: Long = 30_000) =
        Device.waitFor(what, timeoutMs) { js(s, code) == "true" }

    /** Calls a plugin through Capacitor's raw bridge, without the web app's code, and returns its JSON. */
    private fun call(s: ActivityScenario<MainActivity>, plugin: String, method: String): String {
        js(s, "window.__senT = null; window.Capacitor.nativePromise('$plugin','$method',{}).then(r => window.__senT = JSON.stringify(r), e => window.__senT = 'ERR ' + e.message); true")
        Device.waitFor("$plugin.$method to answer") { js(s, "window.__senT !== null") == "true" }
        return js(s, "window.__senT")
    }

    @Test
    fun a_with_the_site_unreachable_and_nothing_cached_the_shell_shows_its_own_page() {
        offline(true)
        try {
            ActivityScenario.launch(MainActivity::class.java).use { s ->
                waitJs(s, "the fallback page", "location.href.startsWith('https://localhost/index.html?app=')")
                waitJs(s, "its words", "document.body.innerText.includes(\"Sen can't reach its site\")")
            }
        } finally {
            offline(false)
        }
    }

    @Test
    fun b_the_bridge_answers_our_own_site() {
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            waitJs(s, "the app", "location.origin === '$site' && document.querySelector('#root > *') !== null")
            val info = call(s, "SenShell", "info")
            assertTrue(info, info.contains("\\\"build\\\":\\\"e2e\\\""))
            assertTrue(info, info.contains("\\\"capture\\\":true"))
        }
    }

    @Test
    fun c_a_page_from_another_origin_gets_no_bridge_and_cant_navigate_the_shell() {
        val other = site.replace("localhost", "127.0.0.1")
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            waitJs(s, "the app", "location.origin === '$site'")
            // the page can't take the WebView elsewhere: Capacitor hands other origins to the browser
            js(s, "location.href = '$other/'; true")
            Thread.sleep(2_000)
            assertEquals("\"$site\"", js(s, "location.origin"))
            // loaded anyway (as if by a bug): no message channel to native code exists there. The page is
            // the same web build, so its own @capacitor/core defines window.Capacitor, but only as a
            // plain web page: no native platform, and a call through it never reaches Kotlin.
            s.onActivity { it.bridge.webView.loadUrl("$other/") }
            waitJs(s, "the other origin", "location.origin === '$other' && document.readyState === 'complete'")
            assertEquals("\"undefined\"", js(s, "typeof window.androidBridge"))
            assertEquals("\"web\"", js(s, "window.Capacitor.getPlatform()"))
            assertEquals("false", js(s, "window.Capacitor.isNativePlatform()"))
            js(s, "window.__senT = null; Promise.resolve().then(() => window.Capacitor.nativePromise('SenShell','info',{})).then(r => window.__senT = 'ANSWERED ' + JSON.stringify(r), e => window.__senT = 'REFUSED'); true")
            Device.waitFor("the call to settle") { js(s, "window.__senT !== null") == "true" }
            assertEquals("\"REFUSED\"", js(s, "window.__senT"))
        }
    }

    @Test
    fun d_once_it_has_loaded_the_app_opens_in_airplane_mode() {
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            waitJs(s, "the app", "location.origin === '$site' && document.querySelector('#root > *') !== null")
            waitJs(s, "the service worker in control", "navigator.serviceWorker.controller !== null", 60_000)
            js(s, "window.__senC = null; caches.keys().then(k => Promise.all(k.map(n => caches.open(n).then(c => c.keys())))).then(l => window.__senC = l.flat().length); true")
            Device.waitFor("the cache to fill") { (js(s, "window.__senC").toIntOrNull() ?: 0) > 10 }
        }
        offline(true)
        try {
            ActivityScenario.launch(MainActivity::class.java).use { s ->
                waitJs(s, "the app, offline", "location.origin === '$site' && document.querySelector('#root > *') !== null")
                // the cached app reached the bridge too
                assertTrue(call(s, "SenShell", "info").contains("e2e"))
                assertEquals("\"$site\"", js(s, "location.origin"))
            }
        } finally {
            offline(false)
        }
    }
}
