package io.github.ztsia.sen

import android.content.ComponentName
import android.content.pm.PackageManager
import android.app.NotificationManager
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.Configuration
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.SynchronousExecutor
import androidx.work.testing.WorkManagerTestInitHelper
import io.github.ztsia.sen.capture.CaptureListener
import io.github.ztsia.sen.capture.Chosen
import io.github.ztsia.sen.capture.InstalledApps
import io.github.ztsia.sen.capture.Outbox
import io.github.ztsia.sen.core.DedupeKey
import io.github.ztsia.sen.core.Ids
import io.github.ztsia.sen.core.Iso
import io.github.ztsia.sen.core.RawEvent
import io.github.ztsia.sen.sync.CaptureSwitch
import io.github.ztsia.sen.sync.Meta
import io.github.ztsia.sen.sync.SchedulerCheck
import io.github.ztsia.sen.sync.Session
import io.github.ztsia.sen.sync.SyncClient
import io.github.ztsia.sen.sync.SyncRun
import io.github.ztsia.sen.sync.SyncWorker
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * B07 done-when 1, 2 and 7, on GitHub Actions' emulator: the outbox against a fake of the API's sync
 * (FakeServer). Capturing the same notification again adds nothing, through a reinstall too; a capture
 * made in airplane mode goes up once the network is back; the Capture switch unbinds the listener while
 * the events stay safe; a 401 signs the shell out. Every notification here is made up.
 */
@RunWith(AndroidJUnit4::class)
class SyncTest {
    private val ctx = Device.context
    private val user = "00000000-0000-4000-8000-0000000000aa"
    private lateinit var server: FakeServer
    private var chosenBefore: Set<String> = emptySet()

    @Before
    fun setUp() {
        chosenBefore = Chosen.get(ctx)
        Chosen.set(ctx, emptySet())
        Outbox.reset(ctx)
        server = FakeServer(user).also { it.start() }
        SyncClient.baseOverride = server.base
        Session.clear(ctx)
        Session.set(ctx, "better-auth.session_token", "token-value.signature")
        WorkManagerTestInitHelper.initializeTestWorkManager(ctx, Configuration.Builder().setExecutor(SynchronousExecutor()).build())
    }

    @After
    fun tearDown() {
        SyncClient.baseOverride = null
        server.stop()
        // the Capture switch back on, the listener as the manifest has it
        CaptureSwitch.apply(ctx, true)
        Session.clear(ctx)
        Outbox.reset(ctx)
        Chosen.set(ctx, chosenBefore)
    }

    private fun raw(n: Int, text: String = "You paid RM$n.00 to KEDAI MAJU"): RawEvent {
        val whenMs = 1_793_494_800_000L + n * 1_000L + 50
        val title = "Payment"
        val key = "0|my.com.tngdigital.ewallet|$n|null|10123"
        return RawEvent(
            dedupeKey = DedupeKey.of("my.com.tngdigital.ewallet", key, whenMs, title, text, null),
            packageName = "my.com.tngdigital.ewallet",
            channel = "payments",
            key = key,
            postTime = whenMs + 7,
            whenMillis = whenMs,
            title = title,
            text = text,
            bigText = null,
        )
    }

    private fun sync() = SyncRun(ctx).run()

    @Test
    fun the_same_notification_captured_again_adds_nothing() {
        val outbox = Outbox.get(ctx)
        assertTrue(outbox.insert(raw(1)))
        assertFalse(outbox.insert(raw(1)))
        assertEquals(1, outbox.pendingCount())
        assertEquals(1, outbox.count())
    }

    @Test
    fun a_reinstall_captures_the_same_notifications_and_sends_the_same_ids() {
        val first = (1..3).map(::raw)
        first.forEach { Outbox.get(ctx).insert(it) }
        assertEquals(SyncRun.Outcome.DONE, sync())
        val ids = server.sentEventIds()
        assertEquals(3, ids.size)
        assertEquals(first.map { Ids.event(user, it.dedupeKey) }, ids)
        assertEquals(0, Outbox.get(ctx).pendingCount())
        assertEquals(3, server.held.size)

        // a reinstall: the outbox file and the stored login are gone; the person signs in again
        Outbox.reset(ctx)
        Session.clear(ctx)
        Session.set(ctx, "better-auth.session_token", "another-token.signature")
        first.forEach { assertTrue(Outbox.get(ctx).insert(it)) }
        assertEquals(SyncRun.Outcome.DONE, sync())

        assertEquals(ids + ids, server.sentEventIds())
        // the server holds nothing new
        assertEquals(3, server.held.size)
        assertEquals(0, Outbox.get(ctx).pendingCount())
    }

    @Test
    fun events_go_up_in_batches_of_at_most_100_with_one_heartbeat() {
        (1..250).forEach { Outbox.get(ctx).insert(raw(it)) }
        assertEquals(SyncRun.Outcome.DONE, sync())
        assertEquals(listOf(100, 100, 50), server.syncBodies.map { it.getJSONArray("events").length() })
        assertFalse(server.syncBodies[0].isNull("heartbeat"))
        assertTrue(server.syncBodies[1].isNull("heartbeat"))
        assertEquals(250, server.held.size)
        // the bearer session, and no Origin
        assertTrue(server.authorizations.all { it == "Bearer token-value.signature" })
        assertTrue(server.origins.all { it == null })
    }

    @Test
    fun the_times_keep_their_milliseconds() {
        Outbox.get(ctx).insert(raw(4))
        sync()
        val e = server.syncBodies[0].getJSONArray("events").getJSONObject(0)
        assertEquals("2026-11-01T01:00:04.050Z", e.getString("notifiedAt"))
        assertEquals("2026-11-01T01:00:04.057Z", e.getString("postedAt"))
    }

    @Test
    fun an_event_the_server_refuses_is_marked_and_not_sent_again() {
        val bad = raw(5).copy(dedupeKey = "0".repeat(64))
        Outbox.get(ctx).insert(bad)
        Outbox.get(ctx).insert(raw(6))
        sync()
        assertEquals(0, Outbox.get(ctx).pendingCount())
        assertEquals(listOf("dedupe_key"), Outbox.get(ctx).events(10).mapNotNull { it.refused })
        val sentBefore = server.sentEventIds().size
        sync()
        assertEquals(sentBefore, server.sentEventIds().size)
    }

    @Test
    fun an_install_from_before_sync_keeps_its_soak_events_and_sends_them() {
        Outbox.reset(ctx)
        val db = ctx.openOrCreateDatabase(Outbox.FILE, 0, null)
        db.execSQL(
            """CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, dedupe_key TEXT NOT NULL UNIQUE, package TEXT NOT NULL,
               channel TEXT, notification_key TEXT NOT NULL, post_time INTEGER NOT NULL, when_ms INTEGER NOT NULL, title TEXT,
               text TEXT, big_text TEXT, captured_at INTEGER NOT NULL, synced_at INTEGER, maybe_otp INTEGER NOT NULL DEFAULT 0)""",
        )
        db.execSQL("CREATE TABLE heartbeats (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, kind TEXT NOT NULL, connected INTEGER NOT NULL, package TEXT, drop_key TEXT)")
        db.execSQL("CREATE TABLE channel_drops (package TEXT NOT NULL, channel TEXT NOT NULL, PRIMARY KEY (package, channel))")
        val e = raw(7)
        db.execSQL(
            "INSERT INTO events (dedupe_key, package, channel, notification_key, post_time, when_ms, title, text, captured_at) VALUES (?,?,?,?,?,?,?,?,?)",
            arrayOf<Any?>(e.dedupeKey, e.packageName, e.channel, e.key, e.postTime, e.whenMillis, e.title, e.text, 1L),
        )
        db.version = 3
        db.close()

        assertEquals(1, Outbox.get(ctx).pendingCount())
        assertEquals(SyncRun.Outcome.DONE, sync())
        assertEquals(listOf(Ids.event(user, e.dedupeKey)), server.sentEventIds())
        assertEquals(0, Outbox.get(ctx).pendingCount())
    }

    @Test
    fun a_capture_made_in_airplane_mode_syncs_when_the_network_is_back() {
        Outbox.get(ctx).insert(raw(8))
        SyncWorker.enqueue(ctx)
        val wm = WorkManager.getInstance(ctx)
        val info = wm.getWorkInfosForUniqueWork(SyncWorker.UNIQUE).get().single()
        // no network: the work waits, and nothing is sent
        assertEquals(WorkInfo.State.ENQUEUED, info.state)
        Thread.sleep(500)
        assertEquals(0, server.syncs.size)
        assertEquals(1, Outbox.get(ctx).pendingCount())

        // the network comes back
        WorkManagerTestInitHelper.getTestDriver(ctx)!!.setAllConstraintsMet(info.id)
        Device.waitFor("the sync after the reconnect") { wm.getWorkInfoById(info.id).get()?.state == WorkInfo.State.SUCCEEDED }
        assertEquals(listOf(Ids.event(user, raw(8).dedupeKey)), server.sentEventIds())
        assertEquals(0, Outbox.get(ctx).pendingCount())
    }

    @Test
    fun with_the_capture_switch_off_the_listener_unbinds_and_the_events_stay_pending() {
        val listener = ComponentName(ctx, CaptureListener::class.java)
        server.captureOn = false
        Outbox.get(ctx).insert(raw(9))
        assertEquals(SyncRun.Outcome.DONE, sync())

        assertEquals(PackageManager.COMPONENT_ENABLED_STATE_DISABLED, ctx.packageManager.getComponentEnabledSetting(listener))
        assertFalse(CaptureSwitch.isOn(ctx))
        // kept, not refused: they go when the switch is back on
        assertEquals(1, Outbox.get(ctx).pendingCount())
        assertNull(Outbox.get(ctx).events(10).single().refused)
        // the refused batch was resent without events, with its heartbeat
        assertEquals(listOf(1, 0), server.syncBodies.map { it.getJSONArray("events").length().coerceAtMost(1) })
        assertFalse(server.syncBodies.last().isNull("heartbeat"))

        server.captureOn = true
        assertEquals(SyncRun.Outcome.DONE, sync())
        assertTrue(CaptureSwitch.isOn(ctx))
        assertEquals(0, Outbox.get(ctx).pendingCount())
        assertTrue(ctx.packageManager.getComponentEnabledSetting(listener) != PackageManager.COMPONENT_ENABLED_STATE_DISABLED)
    }

    @Test
    fun a_401_signs_the_shell_out() {
        Session.setUserId(ctx, user)
        Outbox.get(ctx).insert(raw(10))
        server.mode = FakeServer.Mode.UNAUTHORIZED
        assertEquals(SyncRun.Outcome.DONE, sync())
        assertNull(Session.token(ctx))
        assertNull(Session.userId(ctx))
        // signed out, the next run asks nothing
        server.mode = FakeServer.Mode.NORMAL
        sync()
        assertEquals(0, server.syncs.size)
        assertEquals(1, Outbox.get(ctx).pendingCount())
    }

    @Test
    fun a_server_that_is_down_asks_for_a_retry_and_loses_nothing() {
        Session.setUserId(ctx, user)
        Outbox.get(ctx).insert(raw(11))
        server.mode = FakeServer.Mode.DOWN
        assertEquals(SyncRun.Outcome.RETRY, sync())
        assertEquals(1, Outbox.get(ctx).pendingCount())
        server.mode = FakeServer.Mode.NORMAL
        assertEquals(SyncRun.Outcome.DONE, sync())
        assertEquals(0, Outbox.get(ctx).pendingCount())
    }

    @Test
    fun the_sen_app_switched_off_stops_the_run_without_a_retry() {
        Session.setUserId(ctx, user)
        server.mode = FakeServer.Mode.SHELL_OFF
        assertEquals(SyncRun.Outcome.DONE, sync())
        assertEquals("1", Outbox.get(ctx).meta(Meta.SHELL_OFF))
    }

    @Test
    fun another_person_signing_in_never_sends_the_last_ones_notifications_or_writes() {
        val outbox = Outbox.get(ctx)
        outbox.insert(raw(1))
        assertEquals(SyncRun.Outcome.DONE, sync())
        assertEquals(user, outbox.meta(Meta.OWNER))

        // captured and written while the first person was signed in, never synced
        outbox.insert(raw(2))
        outbox.insertCommand("11111111-2222-4333-8444-555555555556", JSONObject().put("kind", "test").toString(), 1_793_494_800_000L)
        Chosen.set(ctx, setOf("my.com.tngdigital.ewallet"))

        val other = "00000000-0000-4000-8000-0000000000bb"
        server.userId = other
        Session.set(ctx, "better-auth.session_token", "someone-else.signature")
        val before = server.syncBodies.size
        assertEquals(SyncRun.Outcome.DONE, sync())

        server.syncBodies.drop(before).forEach { b ->
            assertEquals(0, b.optJSONArray("events")?.length() ?: 0)
            assertEquals(0, b.optJSONArray("commands")?.length() ?: 0)
            assertEquals(0, b.optJSONArray("captureApps")?.length() ?: 0)
        }
        assertEquals(0, outbox.count())
        assertTrue(outbox.recentCommands().isEmpty())
        assertTrue(Chosen.get(ctx).isEmpty())
        assertEquals(other, outbox.meta(Meta.OWNER))
    }

    @Test
    fun a_write_from_the_web_app_goes_up_once_and_its_outcome_comes_back() {
        val id = "11111111-2222-4333-8444-555555555555"
        val body = JSONObject().put("kind", "test").put("n", 1).toString()
        assertTrue(Outbox.get(ctx).insertCommand(id, body, 1_793_494_800_000L))
        assertFalse(Outbox.get(ctx).insertCommand(id, body, 1_793_494_800_000L))
        assertEquals(SyncRun.Outcome.DONE, sync())
        val sent = server.syncBodies[0].getJSONArray("commands")
        assertEquals(1, sent.length())
        assertEquals(id, sent.getJSONObject(0).getString("id"))
        assertEquals(1, sent.getJSONObject(0).getJSONObject("command").getInt("n"))
        val c = Outbox.get(ctx).recentCommands().single()
        assertEquals("applied", c.status)
        assertEquals("Done.", c.said)
    }

    @Test
    fun the_chosen_apps_are_restored_from_the_servers_rows() {
        val installed = InstalledApps.list(ctx, icons = false).firstOrNull { it.blocked == null }
        assumeTrue("an app that can be chosen", installed != null)
        val live = JSONObject().put("id", "aaaaaaaa-0000-4000-8000-000000000001").put("package", installed!!.packageName).put("label", installed.label)
            .put("chosenAt", "2026-10-01T00:00:00.000Z").put("deletedAt", JSONObject.NULL)
        val gone = JSONObject().put("id", "aaaaaaaa-0000-4000-8000-000000000002").put("package", "not.installed.anywhere").put("label", "Nope")
            .put("chosenAt", "2026-10-01T00:00:00.000Z").put("deletedAt", JSONObject.NULL)
        server.serverApps = listOf(live, gone)
        assertEquals(emptySet<String>(), Chosen.get(ctx))
        assertEquals(SyncRun.Outcome.DONE, sync())
        // the installed one is chosen again; the one that isn't installed is kept as a row but not listened to
        assertEquals(setOf(installed.packageName), Chosen.get(ctx))
        assertEquals(2, Outbox.get(ctx).liveApps().size)
        assertEquals("0", server.changesAsked.first().substringAfter("since="))
    }

    private fun category(id: String, name: String, position: Int, archivedAt: String? = null) =
        JSONObject().put("id", id).put("name", name).put("kind", "spend").put("meal", name == "Food").put("beverage", false)
            .put("discretionary", true).put("system", JSONObject.NULL).put("position", position).put("archivedAt", archivedAt ?: JSONObject.NULL)

    private val catFood = "cccccccc-0000-4000-8000-000000000001"
    private val catOld = "cccccccc-0000-4000-8000-000000000002"
    private val acct = "dddddddd-0000-4000-8000-000000000001"

    @Test
    fun a_pull_stores_the_offline_copy_and_leaves_archived_categories_out_by_default() {
        server.serverVersion = 3
        server.serverCategories = listOf(category(catOld, "Old", 1, "2026-10-02T00:00:00.000Z"), category(catFood, "Food", 2))
        server.serverAccounts = listOf(
            JSONObject().put("id", acct).put("name", "Wallet").put("kind", "tracked").put("package", "my.com.tngdigital.ewallet").put("archivedAt", JSONObject.NULL),
        )
        server.serverAccountNames = listOf(JSONObject().put("id", "eeeeeeee-0000-4000-8000-000000000001").put("package", "my.com.tngdigital.ewallet").put("label", "TNG Wallet").put("accountId", acct))
        server.serverOwnNames = listOf("TAN WEI MING")
        assertEquals(SyncRun.Outcome.DONE, sync())
        val box = Outbox.get(ctx)
        assertEquals(listOf("Food"), box.categories().map { it.name })
        assertTrue(box.categories().single().meal)
        val all = box.categories(includeArchived = true)
        assertEquals(listOf("Old", "Food"), all.map { it.name })
        assertEquals(Iso.parse("2026-10-02T00:00:00.000Z"), all.first().archivedAt)
        assertNull(all.last().archivedAt)
        assertEquals(listOf("Wallet"), box.accounts().map { it.name })
        assertEquals("my.com.tngdigital.ewallet", box.accounts().single().packageName)
        assertEquals(acct, box.accountNames().single().accountId)
        assertEquals(listOf("TAN WEI MING"), box.ownNames())
        assertEquals("3", box.meta(Meta.CHANGES_VERSION))
    }

    @Test
    fun a_later_page_replaces_a_renamed_category_and_null_own_names_leave_the_stored_ones() {
        server.serverVersion = 1
        server.serverCategories = listOf(category(catFood, "Food", 1))
        server.serverOwnNames = listOf("TAN WEI MING")
        sync()
        server.serverVersion = 2
        server.serverCategories = listOf(category(catFood, "Meals", 1))
        server.serverOwnNames = null
        sync()
        val box = Outbox.get(ctx)
        assertEquals(listOf("Meals"), box.categories().map { it.name })
        assertEquals(listOf("TAN WEI MING"), box.ownNames())
        assertEquals("1", server.changesAsked.last().substringAfter("since="))
        // an array, even an empty one, replaces
        server.serverVersion = 3
        server.serverOwnNames = emptyList()
        sync()
        assertEquals(emptyList<String>(), box.ownNames())
    }

    @Test
    fun forgetting_the_person_empties_the_offline_copy() {
        server.serverVersion = 1
        server.serverCategories = listOf(category(catFood, "Food", 1))
        server.serverAccounts = listOf(JSONObject().put("id", acct).put("name", "Wallet").put("kind", "elsewhere").put("package", JSONObject.NULL).put("archivedAt", JSONObject.NULL))
        server.serverAccountNames = listOf(JSONObject().put("id", "eeeeeeee-0000-4000-8000-000000000001").put("package", "p").put("label", "L").put("accountId", acct))
        server.serverOwnNames = listOf("TAN WEI MING")
        sync()
        val box = Outbox.get(ctx)
        assertEquals(1, box.categories().size)
        box.forgetPerson()
        assertTrue(box.categories(includeArchived = true).isEmpty())
        assertTrue(box.accounts(includeArchived = true).isEmpty())
        assertTrue(box.accountNames().isEmpty())
        assertTrue(box.ownNames().isEmpty())
    }

    @Test
    fun a_choice_made_on_the_phone_is_sent_as_a_row_and_a_tombstone() {
        val installed = InstalledApps.list(ctx, icons = false).firstOrNull { it.blocked == null }
        assumeTrue("an app that can be chosen", installed != null)
        val p = installed!!.packageName
        Chosen.choose(ctx, setOf(p), mapOf(p to installed.label))
        sync()
        val first = server.syncBodies[0].getJSONArray("captureApps")
        assertEquals(1, first.length())
        assertEquals(p, first.getJSONObject(0).getString("package"))
        assertTrue(first.getJSONObject(0).isNull("deletedAt"))

        Chosen.choose(ctx, emptySet(), emptyMap())
        sync()
        val second = server.syncBodies.last().getJSONArray("captureApps")
        assertEquals(1, second.length())
        assertFalse(second.getJSONObject(0).isNull("deletedAt"))
        assertEquals(first.getJSONObject(0).getString("id"), second.getJSONObject(0).getString("id"))
        assertEquals(emptySet<String>(), Chosen.get(ctx))
    }

    @Test
    fun the_token_is_stored_encrypted() {
        val stored = ctx.getSharedPreferences("session", 0).all.values.joinToString { it.toString() }
        assertFalse(stored.contains("token-value"))
        assertTrue(stored.isNotEmpty())
        assertEquals("token-value.signature", Session.token(ctx)!!.value)
        Session.clear(ctx)
        assertNull(Session.token(ctx))
        assertEquals("", ctx.getSharedPreferences("session", 0).all.values.joinToString { it.toString() })
    }

    @Test
    fun the_sync_asks_who_the_token_is_once() {
        assertNull(Session.userId(ctx))
        sync()
        assertEquals(user, Session.userId(ctx))
        assertNotNull(Outbox.get(ctx).meta(Meta.LAST_SYNC_AT))
    }

    private fun healthNotification() =
        ctx.getSystemService(NotificationManager::class.java).activeNotifications.firstOrNull { it.id == SchedulerCheck.NOTIFICATION_ID }

    @Test
    fun a_morning_job_over_26_hours_old_posts_one_warning_a_day_and_clears_when_it_runs() {
        Device.sh("pm grant ${ctx.packageName} android.permission.POST_NOTIFICATIONS")
        val h = 3_600_000L
        val now = 1_793_494_800_000L
        try {
            // exactly 26 hours: not late, nothing posted
            SchedulerCheck.check(ctx, now - 26 * h, now)
            assertNull(healthNotification())

            SchedulerCheck.check(ctx, now - 27 * h, now)
            val n = healthNotification()
            assertNotNull(n)
            assertEquals("Sen's daily check hasn't run", n!!.notification.extras.getCharSequence("android.title")?.toString())
            assertEquals("2026-11-01", Outbox.get(ctx).meta(Meta.LATE_NOTICE_DAY))

            // the same day: not posted again (dismissed, it stays dismissed)
            ctx.getSystemService(NotificationManager::class.java).cancel(SchedulerCheck.NOTIFICATION_ID)
            SchedulerCheck.check(ctx, now - 28 * h, now + h)
            assertNull(healthNotification())

            // the next day: again; then the job runs and the warning goes
            SchedulerCheck.check(ctx, now - 28 * h, now + 24 * h)
            assertNotNull(healthNotification())
            SchedulerCheck.check(ctx, now + 23 * h, now + 25 * h)
            assertNull(healthNotification())
        } finally {
            ctx.getSystemService(NotificationManager::class.java).cancel(SchedulerCheck.NOTIFICATION_ID)
        }
    }

    @Test
    fun a_sync_whose_answer_says_the_morning_job_is_late_posts_the_warning() {
        Device.sh("pm grant ${ctx.packageName} android.permission.POST_NOTIFICATIONS")
        server.now = "2026-11-02T01:00:00.000Z"
        server.morningAt = "2026-10-31T22:00:00.000Z"
        try {
            sync()
            assertNotNull(healthNotification())
            assertEquals("2026-10-31T22:00:00.000Z", Outbox.get(ctx).meta(Meta.MORNING_AT))
            assertEquals("2026-11-02T01:00:00.000Z", Outbox.get(ctx).meta(Meta.SERVER_NOW))
        } finally {
            ctx.getSystemService(NotificationManager::class.java).cancel(SchedulerCheck.NOTIFICATION_ID)
        }
    }
}
