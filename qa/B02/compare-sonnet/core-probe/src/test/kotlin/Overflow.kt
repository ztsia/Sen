package io.github.ztsia.sen.core

import kotlin.test.Test

/** Which stage overflows the stack on ~5 KB inputs, on a 1 MB thread (what Android gives a plain thread)? */
class Overflow {
    private fun onSmallStack(name: String, f: () -> Unit) {
        var res = "ok"
        val t = Thread(null, {
            try { f() } catch (e: Throwable) { res = e::class.simpleName ?: "?" }
        }, "sen-capture", 1L shl 20)
        t.start(); t.join()
        println("OVERFLOW $name -> $res")
    }

    @Test
    fun stages() {
        val otp = OtpFilter.default()
        val mask = OtpMask.default()
        val gate = CaptureGate()
        val inputs = linkedMapOf(
            "'12, ' x1250" to "12, ".repeat(1250),
            "'pin 12, ' x600" to "pin 12, ".repeat(600),
            "'a-1' x1600" to "a-1".repeat(1600),
            "'Your OTP ' x10 + '1 ' x2400" to "Your OTP ".repeat(10) + "1 ".repeat(2400),
            "'Never share your TAC. ' + '482 913 ' x600" to "Never share your TAC. " + "482 913 ".repeat(600),
            "'x ' x2500" to "x ".repeat(2500),
            "'tac ' x1250" to "tac ".repeat(1250),
            "'9' x5000 + spaces" to "9 ".repeat(2500),
        )
        for ((name, s) in inputs) {
            onSmallStack("isOtp   $name") { otp.isOtp("T", s, null) }
            onSmallStack("mask    $name") { mask.apply("T", s, null) }
            val posted = Posted("my.rytbank.app", "k", "c", 1, 1, "T", s, null)
            onSmallStack("gate    $name") { gate.decide(posted, setOf("my.rytbank.app")) }
        }
    }
}
