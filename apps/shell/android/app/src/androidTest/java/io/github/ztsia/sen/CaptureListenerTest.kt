package io.github.ztsia.sen

import android.os.SystemClock
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.ztsia.sen.capture.CaptureListener
import io.github.ztsia.sen.capture.Chosen
import io.github.ztsia.sen.capture.Outbox
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * B02 done-when 4, on GitHub Actions' emulator: the real listener, with notifications posted by
 * another app (the device's shell, `com.android.shell`, through `cmd notification post`).
 * Every notification here is made up.
 */
@RunWith(AndroidJUnit4::class)
class CaptureListenerTest {
    private val ctx = Device.context
    private val shell = "com.android.shell"
    private val component = "${ctx.packageName}/io.github.ztsia.sen.capture.CaptureListener"
    private val run = SystemClock.uptimeMillis().toString(36)

    @Before
    fun connect() {
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

    /** Waits until the listener's queue has drained: a marker posted after everything else is stored. */
    private fun settle() {
        val marker = "Marker $run ${SystemClock.uptimeMillis()}"
        val chosen = Chosen.get(ctx)
        Chosen.set(ctx, chosen + shell)
        post("marker", "Marker", marker)
        Device.waitFor("the marker") { stored(marker) == 1 }
        Chosen.set(ctx, chosen)
    }

    @Test
    fun a_notification_from_an_unchosen_app_never_reaches_storage() {
        Chosen.set(ctx, setOf("my.rytbank.app"))
        val text = "You have received RM12.30 from TAN WEI MING $run"
        post("unchosen", "Money Received", text)
        settle()
        assertEquals(0, stored(text))
        // nothing about it at all: the only rows from this test are its own markers
        assertEquals(0, Outbox.get(ctx).events(500).count { it.text.orEmpty().endsWith(run) && it.title != "Marker" })
    }

    @Test
    fun a_chosen_app_is_stored_once_and_an_otp_from_it_is_dropped() {
        Chosen.set(ctx, setOf(shell))
        val pay = "RM38.15 paid at Petron using your Main Account $run"
        post("pay", "Card payment completed", pay)
        Device.waitFor("the payment") { stored(pay) == 1 }
        val otp = "Your TAC is 482910 for DuitNow Transfer. Do not share it $run"
        post("otp", "Ryt Bank", otp)
        settle()
        assertEquals(0, stored(otp))
        assertEquals(1, stored(pay))
    }

    @Test
    fun a_reconnect_replays_what_is_showing_without_duplicates_and_catches_what_it_missed() {
        Chosen.set(ctx, setOf(shell))
        val before = "You have successfully transferred RM 18.00 to LIM KAH HOE $run"
        post("before", "DuitNow Transfer is successful!", before)
        Device.waitFor("the first payment") { stored(before) == 1 }

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
    }
}
