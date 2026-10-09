package io.github.ztsia.sen.core

import java.net.URI

/**
 * Whether a URL is on exactly the site's origin: the same scheme, host and port (spec §17). Capacitor
 * keeps a navigation in the WebView when the URL merely starts with the site's address, so
 * `https://sen.vercel.app.example.com` would pass its check; the shell checks the origin itself.
 */
object Origin {
    fun same(url: String, site: String): Boolean {
        val a = parse(url) ?: return false
        val b = parse(site) ?: return false
        return a == b
    }

    private fun parse(s: String): Triple<String, String, Int>? =
        runCatching {
            val u = URI(s)
            val scheme = u.scheme?.lowercase() ?: return null
            val host = u.host?.lowercase() ?: return null
            if (scheme != "https" && scheme != "http") return null
            val port = if (u.port != -1) u.port else if (scheme == "https") 443 else 80
            Triple(scheme, host, port)
        }.getOrNull()
}
