package io.github.ztsia.sen

import android.os.ParcelFileDescriptor
import android.os.SystemClock
import androidx.test.platform.app.InstrumentationRegistry
import java.io.FileInputStream
import java.io.FileOutputStream

/** Helpers for the emulator tests: the device's shell, and waiting for a condition. */
object Device {
    val context get() = InstrumentationRegistry.getInstrumentation().targetContext

    /**
     * Runs a command in the device's shell, as the shell user, with quoting intact: the command goes to
     * `sh` on its stdin (executeShellCommand alone splits on every space). Returns its output.
     */
    fun sh(command: String): String {
        val ua = InstrumentationRegistry.getInstrumentation().uiAutomation
        val (out, input, err) = ua.executeShellCommandRwe("sh")
        FileOutputStream(input.fileDescriptor).use { it.write("$command\nexit\n".toByteArray()) }
        input.close()
        val text = ParcelFileDescriptor.AutoCloseInputStream(out).use { it.readBytes().toString(Charsets.UTF_8) }
        FileInputStream(err.fileDescriptor).use { it.readBytes() }
        err.close()
        return text
    }

    fun waitFor(what: String, timeoutMs: Long = 15_000, check: () -> Boolean) {
        val end = SystemClock.uptimeMillis() + timeoutMs
        while (SystemClock.uptimeMillis() < end) {
            if (check()) return
            SystemClock.sleep(200)
        }
        throw AssertionError("Timed out waiting for $what")
    }
}
