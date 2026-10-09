package io.github.ztsia.sen.core

import kotlin.test.Test

/** Plausible made-up payment wordings: does the filter wrongly drop a payment? (Informational: prints every verdict.) */
class FalseDrops {
    private val gate = CaptureGate()
    private val pkg = "my.rytbank.app"

    @Test
    fun verdicts() {
        val cases = listOf(
            "Card payment completed 👍" to "RM12.90 paid at MCD 1234 using your Main Account. Keep your code private.",
            "Top-up successful" to "Top up RM50.00 successful. Code: 123456",
            "Payment received" to "You received RM30.00 from LIM TAC SENG. Ref 12345678",
            "Payment" to "Verification of your payment of RM30.00 at 7-ELEVEN 1234 is complete",
            "Bayaran berjaya" to "Bayaran RM25.00 kepada PIN GUAN KOPITIAM 1234 berjaya.",
            "GrabFood" to "Your order #A-123456 from KFC is on the way. Pay RM23.40 in cash.",
            "Transfer" to "You've sent RM1,200.00 to TAN WEI MING. Your PIN was not required.",
            "Card" to "Your card ending 4821 was used for RM88.00 at SHOPEE. Not you? Call 1300-88-1234.",
            "Promo" to "Use code RAYA2026 for RM5 off. Valid 1-31 Oct 2026.",
            "Balance" to "Your balance is RM1,234.56 as of 09-10-2026 21:47.",
            "Reload" to "TNG card reload RM30.00 at KLCC station 2241 completed",
            "Refund" to "Refund of RM45.00 from LAZADA (order 88776655) has been credited.",
            "Transfer" to "RM500.00 received from AHMAD BIN ALI. Approval code 482910.",
            "Login" to "New sign-in to your Ryt account from a new device at 9:47 PM.",
            "Auth" to "Authorise your RM89.90 payment to NETFLIX in the app. Do not share your TAC.",
        )
        for ((t, x) in cases) {
            val d = gate.decide(Posted(pkg, "k", "c", 1000, 1000, t, x, null), setOf(pkg))
            println("VERDICT [$t | $x] -> " + when (d) {
                is Decision.Drop -> "DROP ${d.reason}"
                is Decision.Keep -> "keep [${d.event.text}] maybe=${d.event.maybeOtp}"
            })
        }
    }
}
