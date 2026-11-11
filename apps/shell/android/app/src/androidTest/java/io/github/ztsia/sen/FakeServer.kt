package io.github.ztsia.sen

import io.github.ztsia.sen.core.DedupeKey
import io.github.ztsia.sen.core.Ids
import io.github.ztsia.sen.core.Iso
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.json.JSONArray
import org.json.JSONObject
import java.net.InetAddress
import java.util.concurrent.CopyOnWriteArrayList

/**
 * A fake of the real API's sync routes (apps/api/src/sync/routes.ts) for the emulator tests: it answers a
 * batch with every id it was sent, as the real one does, and refuses what the real one refuses (an event
 * whose dedupe key or id doesn't match its text). It holds the events it has been given, by id, so a test
 * can see that sending them again adds nothing. Served on 127.0.0.1, which the e2e build may reach over
 * cleartext (src/e2e/res/xml/network_security_config.xml).
 */
class FakeServer(var userId: String) {
    enum class Mode { NORMAL, UNAUTHORIZED, CAPTURE_OFF, SHELL_OFF, DOWN }

    private val server = MockWebServer()

    @Volatile var mode = Mode.NORMAL
    @Volatile var captureOn = true
    @Volatile var morningAt: String? = null
    @Volatile var now: String = "2026-11-01T01:00:00.000Z"

    /** Changes `/api/sync/changes` answers: capture apps as the server holds them. */
    @Volatile var serverApps: List<JSONObject> = emptyList()

    /** B08's offline copy as the server holds it; `serverOwnNames` null is "unchanged in this page". */
    @Volatile var serverCategories: List<JSONObject> = emptyList()
    @Volatile var serverAccounts: List<JSONObject> = emptyList()
    @Volatile var serverAccountNames: List<JSONObject> = emptyList()
    @Volatile var serverOwnNames: List<String>? = null

    /** The version the changes answer carries; by default the number of capture apps. */
    @Volatile var serverVersion: Long? = null

    /** Every event id the server holds. */
    val held: MutableSet<String> = java.util.Collections.synchronizedSet(LinkedHashSet())

    /** The POST /api/sync requests, in order. */
    val syncs = CopyOnWriteArrayList<RecordedRequest>()
    val syncBodies = CopyOnWriteArrayList<JSONObject>()
    val changesAsked = CopyOnWriteArrayList<String>()
    val authorizations = CopyOnWriteArrayList<String?>()
    val origins = CopyOnWriteArrayList<String?>()

    val base: String get() = "http://127.0.0.1:${server.port}"

    fun start() {
        server.dispatcher =
            object : Dispatcher() {
                override fun dispatch(request: RecordedRequest): MockResponse {
                    authorizations += request.getHeader("Authorization")
                    origins += request.getHeader("Origin")
                    val path = request.path.orEmpty()
                    return when {
                        mode == Mode.DOWN -> MockResponse().setResponseCode(503)
                        mode == Mode.UNAUTHORIZED -> json(401, JSONObject().put("code", "unauthorized"))
                        path.startsWith("/api/auth/get-session") -> json(200, JSONObject().put("user", JSONObject().put("id", userId)))
                        path == "/api/sync" && request.method == "POST" -> sync(request)
                        path.startsWith("/api/sync/changes") -> {
                            changesAsked += path
                            json(
                                200,
                                JSONObject()
                                    .put("version", serverVersion ?: serverApps.size.toLong())
                                    .put("more", false)
                                    .put("captureApps", JSONArray(serverApps))
                                    .put("categories", JSONArray(serverCategories))
                                    .put("accounts", JSONArray(serverAccounts))
                                    .put("accountNames", JSONArray(serverAccountNames))
                                    .put("ownNames", serverOwnNames?.let { JSONArray(it) } ?: JSONObject.NULL),
                            )
                        }
                        else -> MockResponse().setResponseCode(404)
                    }
                }
            }
        server.start(InetAddress.getByName("127.0.0.1"), 0)
    }

    fun stop() = server.shutdown()

    private fun json(status: Int, body: JSONObject) =
        MockResponse().setResponseCode(status).setHeader("Content-Type", "application/json").setBody(body.toString())

    private fun sync(request: RecordedRequest): MockResponse {
        val body = JSONObject(request.body.readUtf8())
        syncs += request
        syncBodies += body
        val events = body.getJSONArray("events")
        if (mode == Mode.SHELL_OFF) return json(403, JSONObject().put("code", "shell_off").put("message", "off"))
        if (events.length() > 0 && !captureOn) return json(403, JSONObject().put("code", "capture_off").put("message", "off"))

        val syncedEvents = JSONArray()
        val refusedEvents = JSONArray()
        for (i in 0 until events.length()) {
            val e = events.getJSONObject(i)
            fun text(k: String) = if (e.isNull(k)) null else e.getString(k)
            val key = DedupeKey.of(e.getString("package"), e.getString("notificationKey"), Iso.parse(e.getString("notifiedAt"))!!, text("title"), text("text"), text("bigText"))
            when {
                key != e.getString("dedupeKey") -> refusedEvents.put(JSONObject().put("id", e.getString("id")).put("reason", "dedupe_key"))
                Ids.event(userId, key) != e.getString("id") -> refusedEvents.put(JSONObject().put("id", e.getString("id")).put("reason", "id"))
                else -> {
                    held += e.getString("id")
                    syncedEvents.put(e.getString("id"))
                }
            }
        }
        val apps = JSONArray()
        val a = body.getJSONArray("captureApps")
        for (i in 0 until a.length()) apps.put(a.getJSONObject(i).getString("id"))
        val commands = JSONArray()
        val c = body.getJSONArray("commands")
        for (i in 0 until c.length()) {
            commands.put(JSONObject().put("id", c.getJSONObject(i).getString("id")).put("status", "applied").put("said", "Done."))
        }
        return json(
            200,
            JSONObject()
                .put("synced", JSONObject().put("events", syncedEvents).put("edits", JSONArray()).put("captureApps", apps).put("commands", commands))
                .put("refused", JSONObject().put("events", refusedEvents).put("edits", JSONArray()).put("captureApps", JSONArray()))
                .put("capture", captureOn)
                .put("morningAt", morningAt ?: JSONObject.NULL)
                .put("now", now),
        )
    }

    /** The event ids of every POST so far, flattened, in the order sent. */
    fun sentEventIds(): List<String> =
        syncBodies.flatMap { b -> (0 until b.getJSONArray("events").length()).map { b.getJSONArray("events").getJSONObject(it).getString("id") } }
}
