package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.fail

/** Re-checks of run 5's fixed findings 1-5 (as named in the coordinator's message), written from the fix descriptions. */
class Recheck {
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"
    private val fails = mutableListOf<String>()
    private var n = 0L

    private fun post(title: String?, text: String?, big: String? = null): Decision {
        n++
        return gate.decide(Posted(ryt, "k$n", "c", 1_757_000_000_000 + n, 1_757_000_000_000 + n, title, text, big), setOf(ryt))
    }

    private fun text(d: Decision) = when (d) {
        is Decision.Drop -> "DROP(${d.reason})"
        is Decision.Keep -> d.event.text + (if (d.event.maybeOtp) " [maybe]" else "")
    }

    private fun hasRun(s: String?): Boolean {
        if (s == null) return false
        val t = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFKC).replace(Regex("[\\p{Cf}\\p{Mn}\\p{Me}\\uFE0F]"), "")
        return Regex("\\p{Nd}(?:[\\s\\-./,]{0,3}\\p{Nd})*").findAll(t).any { r -> r.value.count { it.isDigit() } >= 4 && !Regex("^\\d{1,3}(,\\d{3})*\\.\\d\\d$|^\\d+\\.\\d\\d$").matches(r.value) }
    }

    @Test
    fun finding1_spacesAndDigitShapes() {
        val seps = mapOf("thin 2009" to " ", "en 2002" to " ", "ideographic 3000" to "　", "tab" to "\t", "nbsp" to " ", "narrow 202F" to " ", "figure 2007" to " ", "em 2003" to " ", "hair 200A" to " ", "line sep 2028" to " ", "ogham 1680" to " ")
        for ((name, sp) in seps) {
            // OTP word only in advice, so the filter keeps it (the shape that leaked in run 5)
            val d = post("Ryt", "RM50.00 transfer to TAN WEI MING: 482${sp}913. Never share your TAC.")
            println("F1 $name -> ${text(d)}")
            if (d is Decision.Keep && hasRun(d.event.text)) fails += "F1 $name leaks: ${d.event.text}"
        }
    }

    @Test
    fun finding2_noListedWord() {
        for (s in listOf("Nombor pengesahan anda ialah 482913", "Masukkan 482913 untuk sahkan transaksi RM50.00.", "Gunakan 482913 untuk log masuk", "Use 482913 to verify your login.", "您的验证码是482913", "T A C 4 8 2 9 1 3", "Your secret number: 482913", "Jumlah: 482913 hanya anda tahu", "482913")) {
            val d = post("Ryt", s)
            println("F2 [$s] -> ${text(d)}")
            if (d is Decision.Keep && hasRun(d.event.text)) fails += "F2 leaks: [$s] -> ${d.event.text}"
        }
    }

    @Test
    fun finding3_overflow() {
        // 1 MB-ish thread stack, as Android gives a plain Java thread; 5,000 chars per field
        var err: Throwable? = null
        val inputs = listOf("1".repeat(5000), "1 ".repeat(2500), "482 913 ".repeat(625), "12, ".repeat(1250), "Your OTP ".repeat(10) + "1 ".repeat(2400), "Never share your TAC. " + "482 913 ".repeat(600), "pin 12, ".repeat(600), "a-1".repeat(1600))
        val t = Thread(null, {
            try {
                for (s in inputs) {
                    val d = post(s.take(12), s)
                    println("F3 input=${s.take(14)} len=${s.length} -> ${if (d is Decision.Keep) "keep maybe=${d.event.maybeOtp} leak=${hasRun(d.event.text)}" else text(d)}")
                    if (d is Decision.Keep && hasRun(d.event.text)) fails += "F3 leaks for ${s.take(20)}"
                }
            } catch (e: Throwable) {
                err = e
            }
        }, "sen-capture", 1L shl 20)
        t.start()
        t.join()
        if (err != null) { fails += "F3 threw ${err!!::class.simpleName} at input #" + 0; println("F3 TRACE: " + err!!.stackTrace.filter { it.className.contains("sen") }.take(8).joinToString(" <- ") { it.className.substringAfterLast(".") + "." + it.methodName + ":" + it.lineNumber }) }
    }

    @Test
    fun finding4_short_and_nbsp() {
        val ex = mapOf(
            "No. 123, 9:47 PM" to "No. 123, 9:47 PM",
            "Paid RM 2500 at SHOP" to "Paid RM 2500 at SHOP",
            "Paid RM  2500 at SHOP" to "Paid RM  2500 at SHOP",
            "Paid RM 2,500 at SHOP" to "Paid RM 2,500 at SHOP",
            "Order 12, 34, 56 ready" to "Order 12, 34, 56 ready",
            "Paid RM 2500 at SHOP" to "Paid RM 2500 at SHOP",
            "Paid RM\t2500 at SHOP" to "Paid RM\t2500 at SHOP",
            "Paid rm 2500 at SHOP" to "Paid rm 2500 at SHOP",
            "Paid RM:2500 at SHOP" to "Paid RM:2500 at SHOP",
            "Paid RM2500.00 at SHOP" to "Paid RM2500.00 at SHOP",
            "You paid RM 1,500 to X on 12 Oct" to "You paid RM 1,500 to X on 12 Oct",
        )
        for ((i, e) in ex) {
            val d = post("Ryt", i)
            val got = (d as? Decision.Keep)?.event?.text
            println("F4 [$i] -> [$got]")
            if (got != e) fails += "F4 [$i] expected unchanged, got [$got]"
        }
    }

    @Test
    fun timing() {
        for (size in listOf(2_000, 5_000, 10_000, 20_000, 40_000)) {
            for ((name, unit) in listOf("no. " to "no. ", "never " to "never ")) {
                val s = unit.repeat(size / unit.length)
                val t0 = System.nanoTime()
                post("T", s)
                println("TIMING $name size=$size -> ${(System.nanoTime() - t0) / 1_000_000}ms")
            }
        }
    }

    @org.junit.jupiter.api.AfterEach
    fun report() {
        if (fails.isNotEmpty()) {
            val m = fails.joinToString("\n")
            fails.clear()
            fail("\n$m")
        }
    }
}
