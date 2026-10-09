package io.github.ztsia.sen

import android.app.Notification
import android.app.NotificationManager
import android.os.SystemClock
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.ztsia.sen.capture.CaptureListener
import io.github.ztsia.sen.capture.Chosen
import io.github.ztsia.sen.capture.Outbox
import io.github.ztsia.sen.moments.TestMoments
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * B02 done-when 4, on GitHub Actions' emulator: the real listener, with notifications posted by
 * another app (the device's shell, `com.android.shell`, through `cmd notification post`).
 *
 * Each test ends with a marker posted by Sen itself, which is always chosen here. Android hands a
 * listener notifications in the order they were posted, so once the marker is stored, everything
 * posted before it has been through the listener: a notification that isn't stored by then was
 * dropped, not merely late. The chosen list never changes while a notification is on its way.
 * Every notification here is made up.
 */
@RunWith(AndroidJUnit4::class)
class CaptureListenerTest {
    private val ctx = Device.context
    private val shell = "com.android.shell"
    private val self = ctx.packageName
    private val component = "$self/io.github.ztsia.sen.capture.CaptureListener"
    // letters only: every long number in a stored notification is masked (D119), the tests' own tags too
    private val run = letters(SystemClock.uptimeMillis().toString(36))

    private fun letters(s: String) = s.map { if (it.isDigit()) 'g' + (it - '0') else it }.joinToString("")

    @Before
    fun connect() {
        Device.sh("pm grant $self android.permission.POST_NOTIFICATIONS")
        TestMoments.channels(ctx)
        Device.sh("cmd notification allow_listener $component")
        Device.waitFor("the listener to connect") { CaptureListener.connected }
    }

    @After
    fun tidy() {
        Chosen.set(ctx, emptySet())
    }

    private fun post(tag: String, title: String, text: String) {
        Device.sh("cmd notification post -t '$title' '$tag-$run' '$text'")
    }

    private fun stored(text: String): Int = Outbox.get(ctx).events(500).count { it.text == text }

    /** Posts a marker from Sen itself and waits until it's stored: everything before it has been handled. */
    private fun settle() {
        val marker = "Marker $run ${letters(SystemClock.uptimeMillis().toString())}"
        val n =
            Notification.Builder(ctx, "tests")
                .setSmallIcon(R.drawable.ic_stat_minted)
                .setContentTitle("Marker")
                .setContentText(marker)
                .build()
        ctx.getSystemService(NotificationManager::class.java).notify(marker.hashCode(), n)
        Device.waitFor("the marker") { stored(marker) == 1 }
    }

    @Test
    fun a_notification_from_an_unchosen_app_never_reaches_storage() {
        Chosen.set(ctx, setOf(self))
        val text = "You have received RM12.30 from TAN WEI MING $run"
        post("unchosen", "Money Received", text)
        settle()
        assertEquals(0, stored(text))
        // nothing about it at all: the only rows from this test are its own markers
        assertEquals(0, Outbox.get(ctx).events(500).count { it.text.orEmpty().contains(run) && it.title != "Marker" })
    }

    @Test
    fun a_chosen_app_is_stored_once_and_an_otp_from_it_is_dropped() {
        Chosen.set(ctx, setOf(shell, self))
        val pay = "RM38.15 paid at Petron using your Main Account $run"
        post("pay", "Card payment completed", pay)
        val otp = "Your TAC is 482910 for DuitNow Transfer. Do not share it $run"
        post("otp", "Ryt Bank", otp)
        val since = System.currentTimeMillis() - 60_000
        settle()
        assertEquals(1, stored(pay))
        assertEquals(0, stored(otp))
        // the drop is logged by time and app only, so the soak can see it; its words are nowhere
        assertTrue(Outbox.get(ctx).beats(50).any { it.kind == "otp" && it.packageName == shell && it.at >= since })
    }

    @Test
    fun a_notification_that_might_hold_a_code_is_stored_masked_and_marked() {
        Chosen.set(ctx, setOf(shell, self))
        post("maybe", "Ryt Bank", "RM50.00 transfer to TAN WEI MING: 482910. Never share your TAC. $run")
        // no listed word at all: masked all the same, and its amount kept (D119)
        post("noword", "Ryt Bank", "Use 771204 to verify RM12.30 to KEDAI MAJU. $run")
        settle()
        val e = Outbox.get(ctx).events(500).single { it.text.orEmpty().endsWith("TAC. $run") }
        assertEquals("RM50.00 transfer to TAN WEI MING: ••••••. Never share your TAC. $run", e.text)
        assertTrue(e.maybeOtp)
        val plain = Outbox.get(ctx).events(500).single { it.text.orEmpty().startsWith("Use ") && it.text.orEmpty().endsWith(run) }
        assertEquals("Use •••••• to verify RM12.30 to KEDAI MAJU. $run", plain.text)
        // neither code is anywhere in the outbox
        assertTrue(
            Outbox.get(ctx).events(500).none { listOf(it.title, it.text, it.bigText).any { t -> t.orEmpty().contains("482910") || t.orEmpty().contains("771204") } },
        )
    }

    @Test
    fun a_very_long_notification_is_read_without_crashing_the_listener() {
        Chosen.set(ctx, setOf(shell, self))
        // 5,000 characters of digits: the filter's patterns may give up, the mask never does (QA B02 run 5)
        post("long", "Ryt Bank", "Never share your TAC. " + "1 ".repeat(2_500) + run)
        settle()
        val e = Outbox.get(ctx).events(500).single { it.text.orEmpty().endsWith(run) && it.text.orEmpty().startsWith("Never") }
        assertTrue(e.maybeOtp)
        assertTrue(e.text.orEmpty().none { it.isDigit() })
    }

    @Test
    fun a_reconnect_replays_what_is_showing_without_duplicates_and_catches_what_it_missed() {
        Chosen.set(ctx, setOf(shell, self))
        val since = System.currentTimeMillis() - 1_000
        val before = "You have successfully transferred RM 18.00 to LIM KAH HOE $run"
        post("before", "DuitNow Transfer is successful!", before)
        post("otp", "Ryt Bank", "Your TAC is 482910 for DuitNow Transfer $run")
        settle()
        assertEquals(1, stored(before))

        Device.sh("cmd notification disallow_listener $component")
        Device.waitFor("the listener to disconnect") { !CaptureListener.connected }
        val missed = "You have received RM150.00 from TAN WEI MING $run"
        post("missed", "Money Received", missed)
        SystemClock.sleep(1_000)
        assertEquals(0, stored(missed))

        Device.sh("cmd notification allow_listener $component")
        Device.waitFor("the listener to reconnect") { CaptureListener.connected }
        Device.waitFor("the missed payment, from the replay") { stored(missed) == 1 }
        settle()
        assertEquals(1, stored(before))
        assertEquals(1, stored(missed))
        // the OTP still showing was replayed too, and dropped again, but its drop is logged once
        assertEquals(1, Outbox.get(ctx).beats(200).count { it.kind == "otp" && it.packageName == shell && it.at >= since })
    }
}
