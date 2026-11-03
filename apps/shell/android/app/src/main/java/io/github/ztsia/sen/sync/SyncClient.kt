package io.github.ztsia.sen.sync

import io.github.ztsia.sen.BuildConfig
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * The shell's HTTP to the API (B07, packages/core/src/sync.ts is the contract), over HttpURLConnection.
 * Every request carries the session as `Authorization: Bearer`, and no `Origin` header: the server
 * treats a bearer request as the shell's, not a page's. The body is read as JSON; what a status means
 * for the sync is decided by [SyncRun], not here.
 */
class SyncClient(private val base: () -> String = { baseUrl() }) {
    sealed interface Reply {
        /** 2xx, with the JSON body (null when the body was `null` or empty). */
        data class Ok(val json: JSONObject?) : Reply
        data object Unauthorized : Reply
        /** 403, with the error's `code` when it has one (`capture_off`, `shell_off`). */
        data class Forbidden(val code: String?) : Reply
        /** Any other 4xx: the request itself is wrong; retrying won't help. */
        data class Rejected(val status: Int) : Reply
        /** 5xx, or no answer: try again later. */
        data class Failed(val status: Int) : Reply
    }

    fun post(token: String, body: JSONObject): Reply = request("POST", "/api/sync", token, body.toString())

    fun changes(token: String, since: Long): Reply = request("GET", "/api/sync/changes?since=$since", token, null)

    /** Better Auth's session for this token: `{user: {id}}`, or `null` when it isn't valid any more. */
    fun session(token: String): Reply = request("GET", "/api/auth/get-session", token, null)

    private fun request(method: String, path: String, token: String, body: String?): Reply {
        val site = base().trimEnd('/')
        if (site.isEmpty()) return Reply.Failed(0)
        var c: HttpURLConnection? = null
        return try {
            c = URL(site + path).openConnection() as HttpURLConnection
            c.requestMethod = method
            c.connectTimeout = 15_000
            c.readTimeout = 45_000
            c.instanceFollowRedirects = false
            c.setRequestProperty("Authorization", "Bearer $token")
            c.setRequestProperty("Accept", "application/json")
            if (body != null) {
                c.doOutput = true
                c.setRequestProperty("Content-Type", "application/json")
                val bytes = body.toByteArray(Charsets.UTF_8)
                c.setFixedLengthStreamingMode(bytes.size)
                c.outputStream.use { it.write(bytes) }
            }
            val status = c.responseCode
            val text = (if (status < 400) c.inputStream else c.errorStream)?.use { it.readBytes().toString(Charsets.UTF_8) }.orEmpty()
            when {
                status in 200..299 -> Reply.Ok(json(text))
                status == 401 -> Reply.Unauthorized
                status == 403 -> Reply.Forbidden(json(text)?.optString("code")?.takeIf { it.isNotEmpty() })
                status in 400..499 -> Reply.Rejected(status)
                else -> Reply.Failed(status)
            }
        } catch (e: IOException) {
            Reply.Failed(0)
        } finally {
            c?.disconnect()
        }
    }

    private fun json(text: String): JSONObject? =
        try {
            if (text.isBlank() || text.trim() == "null") null else JSONObject(text)
        } catch (_: org.json.JSONException) {
            null
        }

    companion object {
        /** The site every request goes to. A test points it at its fake server. */
        @Volatile var baseOverride: String? = null

        fun baseUrl(): String = baseOverride ?: BuildConfig.SEN_URL
    }
}
