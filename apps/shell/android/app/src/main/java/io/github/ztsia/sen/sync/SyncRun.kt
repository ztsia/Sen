package io.github.ztsia.sen.sync

import android.content.Context
import android.util.Log
import io.github.ztsia.sen.BuildConfig
import io.github.ztsia.sen.capture.CaptureListener
import io.github.ztsia.sen.capture.Chosen
import io.github.ztsia.sen.capture.Heartbeat
import io.github.ztsia.sen.capture.Outbox
import io.github.ztsia.sen.core.BatchPlan
import io.github.ztsia.sen.core.Ids
import io.github.ztsia.sen.core.Iso
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * One run of the sync (B07): push the outbox in batches until nothing is pending, then pull what the
 * server keeps for this phone. The shapes are packages/core/src/sync.ts; the rules are the brief's:
 *
 * - no token: nothing to do. No user id yet: ask Better Auth who the token is.
 * - 200: mark what the server holds (synced) and what it won't take (refused), keep what it said of the
 *   Capture switch and the morning job. A batch that moved nothing ends the run, never loops.
 * - 401: signed out. 403 `capture_off`: unbind the listener and resend the batch without events (they
 *   stay pending). 403 `shell_off`: the Sen app is off for this person; stop. Another 4xx: the request
 *   is wrong, retrying won't mend it. 5xx or no answer: retry later with backoff.
 *
 * Returns [Outcome.RETRY] only for a failure worth another try.
 */
class SyncRun(private val context: Context, private val client: SyncClient = SyncClient()) {
    enum class Outcome { DONE, RETRY }

    private val outbox = Outbox.get(context)

    fun run(): Outcome {
        val token = Session.token(context)?.value ?: return Outcome.DONE
        val userId =
            Session.userId(context)
                ?: when (val r = client.session(token)) {
                    is SyncClient.Reply.Ok -> {
                        val id = r.json?.optJSONObject("user")?.optString("id")?.takeIf { it.isNotEmpty() }
                        if (id == null) {
                            Session.clear(context)
                            return Outcome.DONE
                        }
                        Session.setUserId(context, id)
                        id
                    }
                    SyncClient.Reply.Unauthorized -> return signedOut()
                    is SyncClient.Reply.Failed -> return Outcome.RETRY
                    else -> return Outcome.DONE
                }
        claim(userId)
        Chosen.reconcile(context)
        pushLoop(token, userId)?.let { return it }
        return pull(token)
    }

    /**
     * The outbox belongs to the first person who syncs it. A different person's session (someone else
     * signed in on this phone) starts from an empty outbox and an empty choice of apps, so the last
     * person's notifications and writes never land in the new person's account (D52).
     */
    private fun claim(userId: String) {
        when (outbox.meta(Meta.OWNER)) {
            userId -> return
            null -> {}
            else -> {
                outbox.forgetPerson()
                Chosen.set(context, emptySet())
            }
        }
        outbox.setMeta(Meta.OWNER, userId)
    }

    /** A null means the push finished; otherwise the outcome to return now. */
    private fun pushLoop(token: String, userId: String): Outcome? {
        var first = true
        // with the switch known off, the first batch carries no events: only a 200 saying it's on again lets them go
        var withEvents = outbox.meta(Meta.CAPTURE_ON) != "0"
        while (true) {
            var batch = buildBatch(userId, withEvents, first)
            if (!first && batch.isEmpty) return null
            var reply = client.post(token, batch.json)
            if (reply is SyncClient.Reply.Forbidden && reply.code == CAPTURE_OFF) {
                CaptureSwitch.apply(context, false)
                withEvents = false
                batch = buildBatch(userId, false, first)
                reply = client.post(token, batch.json)
            }
            when (reply) {
                is SyncClient.Reply.Ok -> {
                    val moved = absorb(batch, reply.json ?: return Outcome.DONE)
                    if (outbox.meta(Meta.SHELL_OFF) == "1") outbox.setMeta(Meta.SHELL_OFF, null)
                    val wasWithEvents = withEvents
                    withEvents = CaptureSwitch.isOn(context)
                    first = false
                    // a batch that moved nothing ends the run, unless the switch just came back on: the events wait behind it
                    if (!moved && !(withEvents && !wasWithEvents)) return null
                }
                SyncClient.Reply.Unauthorized -> return signedOut()
                is SyncClient.Reply.Forbidden -> {
                    if (reply.code == SHELL_OFF) outbox.setMeta(Meta.SHELL_OFF, "1")
                    else log("sync refused: 403 ${reply.code}")
                    return Outcome.DONE
                }
                is SyncClient.Reply.Rejected -> {
                    log("sync rejected: ${reply.status}")
                    return Outcome.DONE
                }
                is SyncClient.Reply.Failed -> return Outcome.RETRY
            }
        }
    }

    /** A batch as it will be sent, and how to match the answer back to local rows. */
    private class Batch(
        val json: JSONObject,
        /** The event ids sent, to the local rows they came from. */
        val events: Map<String, Long>,
        val apps: Set<String>,
        val commands: Set<String>,
    ) {
        val isEmpty get() = events.isEmpty() && apps.isEmpty() && commands.isEmpty()
    }

    /**
     * Up to 100 pending events (oldest first, and while the body stays within 180,000 bytes), 100 chosen
     * apps and 50 commands in the order they were made; the first batch of a run carries a heartbeat too.
     */
    private fun buildBatch(userId: String, withEvents: Boolean, heartbeat: Boolean): Batch {
        val apps = outbox.pendingApps(SYNC_LIMIT_APPS)
        val appJson = apps.map { a ->
            JSONObject()
                .put("id", a.id)
                .put("package", a.packageName)
                .put("label", a.label)
                .put("chosenAt", Iso.format(a.chosenAt))
                .put("deletedAt", a.deletedAt?.let { Iso.format(it) } ?: JSONObject.NULL)
        }
        val commandIds = mutableSetOf<String>()
        val commandJson = mutableListOf<JSONObject>()
        for (c in outbox.pendingCommands(SYNC_LIMIT_COMMANDS)) {
            val command = try {
                JSONObject(c.body)
            } catch (_: org.json.JSONException) {
                // can't be read, ever: answered as refused here, so it doesn't block the ones behind it
                outbox.markCommand(c.id, "refused", "Sen couldn’t read that change.")
                continue
            }
            commandIds += c.id
            commandJson += JSONObject().put("id", c.id).put("command", command).put("madeAt", Iso.format(c.madeAt))
        }
        val hb =
            if (!heartbeat) null
            else {
                val s = Heartbeat.state(context)
                JSONObject()
                    .put("id", UUID.randomUUID().toString())
                    .put("listenerConnected", CaptureListener.connected)
                    .put("access", Heartbeat.hasAccess(context))
                    .put("lastBankEventAt", if (s.eventAt > 0) Iso.format(s.eventAt) else JSONObject.NULL)
                    .put("appVersion", BuildConfig.VERSION_NAME)
            }
        val others = appJson + commandJson + listOfNotNull(hb)
        val overhead = others.sumOf { it.toString().toByteArray(Charsets.UTF_8).size } + ENVELOPE_BYTES

        val eventIds = LinkedHashMap<String, Long>()
        val eventJson = mutableListOf<JSONObject>()
        if (withEvents) {
            val pending = outbox.pendingEvents(SYNC_LIMIT_EVENTS)
            val objs = pending.map { e ->
                JSONObject()
                    .put("id", Ids.event(userId, e.dedupeKey))
                    .put("package", e.packageName)
                    .put("channelId", e.channel ?: JSONObject.NULL)
                    .put("notificationKey", e.notificationKey)
                    .put("postedAt", Iso.format(e.postTime))
                    .put("notifiedAt", Iso.format(e.whenMillis))
                    .put("title", e.title ?: JSONObject.NULL)
                    .put("text", e.text ?: JSONObject.NULL)
                    .put("bigText", e.bigText ?: JSONObject.NULL)
                    .put("maybeOtp", e.maybeOtp)
                    .put("dedupeKey", e.dedupeKey)
            }
            val n = BatchPlan.take(objs.map { it.toString().toByteArray(Charsets.UTF_8).size }, SYNC_LIMIT_EVENTS, BatchPlan.BODY_BUDGET - overhead)
            for (i in 0 until n) {
                eventIds[objs[i].getString("id")] = pending[i].rowId
                eventJson += objs[i]
            }
        }

        val body =
            JSONObject()
                .put("events", JSONArray(eventJson))
                .put("edits", JSONArray())
                .put("captureApps", JSONArray(appJson))
                .put("commands", JSONArray(commandJson))
                .put("heartbeat", hb ?: JSONObject.NULL)
        return Batch(body, eventIds, apps.map { it.id }.toSet(), commandIds)
    }

    private fun absorb(batch: Batch, body: JSONObject): Boolean {
        var moved = 0
        val synced = body.optJSONObject("synced")
        val refused = body.optJSONObject("refused")

        val syncedEvents = strings(synced?.optJSONArray("events")).mapNotNull { batch.events[it] }
        outbox.markEventsSynced(syncedEvents)
        moved += syncedEvents.size
        objects(refused?.optJSONArray("events")).forEach { o ->
            batch.events[o.optString("id")]?.let {
                outbox.markEventRefused(it, o.optString("reason").ifEmpty { "refused" }.take(200))
                moved++
            }
        }

        val syncedApps = strings(synced?.optJSONArray("captureApps")).filter { it in batch.apps }
        outbox.markAppsSynced(syncedApps)
        moved += syncedApps.size
        // a choice the server won't take: stop sending it (it stays, the picker still shows it)
        val refusedApps = objects(refused?.optJSONArray("captureApps")).map { it.optString("id") }.filter { it in batch.apps }
        outbox.markAppsSynced(refusedApps)
        moved += refusedApps.size

        objects(synced?.optJSONArray("commands")).forEach { o ->
            val id = o.optString("id")
            if (id in batch.commands) {
                outbox.markCommand(id, o.optString("status").ifEmpty { "applied" }, o.optString("said"))
                moved++
            }
        }

        outbox.setMeta(Meta.LAST_SYNC_AT, System.currentTimeMillis().toString())
        val morning = body.optString("morningAt").takeIf { it.isNotEmpty() && !body.isNull("morningAt") }
        val now = body.optString("now").takeIf { it.isNotEmpty() }
        outbox.setMeta(Meta.MORNING_AT, morning)
        outbox.setMeta(Meta.SERVER_NOW, now)
        if (body.has("capture")) CaptureSwitch.apply(context, body.optBoolean("capture", true))
        val nowMs = Iso.parse(now)
        if (nowMs != null) SchedulerCheck.check(context, Iso.parse(morning), nowMs)
        return moved > 0
    }

    private fun pull(token: String): Outcome {
        var since = outbox.meta(Meta.CHANGES_VERSION)?.toLongOrNull() ?: 0L
        while (true) {
            when (val r = client.changes(token, since)) {
                is SyncClient.Reply.Ok -> {
                    val body = r.json ?: return Outcome.DONE
                    objects(body.optJSONArray("captureApps")).forEach { a ->
                        outbox.mergeServerApp(
                            Outbox.App(
                                id = a.getString("id"),
                                packageName = a.getString("package"),
                                label = a.optString("label"),
                                chosenAt = Iso.parse(a.optString("chosenAt")) ?: 0L,
                                deletedAt = if (a.isNull("deletedAt")) null else Iso.parse(a.optString("deletedAt")),
                                synced = true,
                            ),
                        )
                    }
                    val version = body.optLong("version", since)
                    outbox.setMeta(Meta.CHANGES_VERSION, version.toString())
                    val more = body.optBoolean("more", false)
                    if (!more || version <= since) break
                    since = version
                }
                SyncClient.Reply.Unauthorized -> return signedOut()
                is SyncClient.Reply.Forbidden -> {
                    if (r.code == SHELL_OFF) outbox.setMeta(Meta.SHELL_OFF, "1")
                    return Outcome.DONE
                }
                is SyncClient.Reply.Rejected -> {
                    log("pull rejected: ${r.status}")
                    return Outcome.DONE
                }
                is SyncClient.Reply.Failed -> return Outcome.RETRY
            }
        }
        Chosen.recompute(context)
        return Outcome.DONE
    }

    private fun signedOut(): Outcome {
        Session.clear(context)
        return Outcome.DONE
    }

    private fun log(message: String) {
        // never the token, never a notification's text; and nothing at all in the release build
        if (BuildConfig.BUILD_NAME != "release") Log.d("SenSync", message)
    }

    private fun strings(a: JSONArray?): List<String> = if (a == null) emptyList() else (0 until a.length()).map { a.optString(it) }

    private fun objects(a: JSONArray?): List<JSONObject> =
        if (a == null) emptyList() else (0 until a.length()).mapNotNull { a.optJSONObject(it) }

    companion object {
        const val SYNC_LIMIT_EVENTS = 100
        const val SYNC_LIMIT_APPS = 100
        const val SYNC_LIMIT_COMMANDS = 50
        /** The body's braces and keys around the items. */
        private const val ENVELOPE_BYTES = 200
        const val CAPTURE_OFF = "capture_off"
        const val SHELL_OFF = "shell_off"
    }
}
