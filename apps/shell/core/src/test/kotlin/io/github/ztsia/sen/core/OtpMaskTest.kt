package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** The masking net (D116): what the filter keeps, but might hold a code, is stored with it masked. */
class OtpMaskTest {
    private val mask = OtpMask.default()
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"
    private var n = 0L

    private fun one(text: String): String? = mask.mask(null, text, null)?.get(1)

    private fun keep(title: String?, text: String?, big: String? = null): RawEvent {
        n++
        val d = gate.decide(Posted(ryt, "k$n", "c", 1_000L + n, 1_000L + n, title, text, big), setOf(ryt))
        return assertIs<Decision.Keep>(d).event
    }

    /** No run of four or more digits is left outside an amount. */
    private fun assertNoCode(s: String?) {
        val digits = Regex("\\p{N}(?:[\\s.,/\\-\\u200B]{0,3}\\p{N})*").findAll(s ?: return).map { it.value }
        digits.forEach { run ->
            val bare = run.replace(Regex("^\\p{N}{1,3}(?:,\\p{N}{3})*\\.\\p{N}{2}$|^\\p{N}+\\.\\p{N}{2}$"), "")
            assertTrue(bare.count { it.isDigit() } < 4, "a code is left in: $s")
        }
    }

    @Test
    fun `a code the filter keeps is stored masked and marked`() {
        // run 4's miss: the keyword only in advice, the code in a payment-like sentence
        val e = keep("Ryt Bank", "RM50.00 transfer to TAN WEI MING: 482910. Never share your TAC.")
        assertTrue(e.maybeOtp)
        assertEquals("RM50.00 transfer to TAN WEI MING: ••••••. Never share your TAC.", e.text)
        assertEquals("Ryt Bank", e.title)
    }

    @Test
    fun `the dedupe key is taken from the masked text`() {
        val e = keep(null, "RM50.00 transfer to TAN WEI MING: 482910. Never share your TAC.")
        assertEquals(DedupeKey.of(ryt, "k$n", 1_000L + n, null, e.text, null), e.dedupeKey)
        assertTrue(e.dedupeKey != DedupeKey.of(ryt, "k$n", 1_000L + n, null, "RM50.00 transfer to TAN WEI MING: 482910. Never share your TAC.", null))
    }

    @Test
    fun `the amount survives, in every shape`() {
        assertEquals("Paid RM1,234.56 to ZUS. Ref ••••••. Never share your PIN.", one("Paid RM1,234.56 to ZUS. Ref 482910. Never share your PIN."))
        assertEquals("Paid RM 1234 at SHELL ••••. Protect your PIN.", one("Paid RM 1234 at SHELL 2241. Protect your PIN."))
        assertEquals("RM50.00 ••••••, keep your TAC safe", one("RM50.00 482910, keep your TAC safe"))
        assertEquals("Bayaran RM12,90 berjaya. Kod ••••", one("Bayaran RM12,90 berjaya. Kod 2241"))
    }

    @Test
    fun `codes in every shape are masked`() {
        val shapes =
            listOf(
                "Your code: 482 910",
                "Your code: 48-29-10",
                "Your code: 48 - 29 - 10",
                "Your code: 4 8 2 9 1 0",
                "Your code: 48​2910",
                "Your code: OTP482910",
                "Your code: G-482910",
                "Your code: #482910",
                "Your code: 482.910",
                "Your code: ４８２９１０",
                "Your code: 48 29 10",
                "Your code is 12345678 and 9876",
            )
        shapes.forEach { s ->
            val m = one(s)
            assertNoCode(m)
            assertTrue(m!!.contains('•'), s)
        }
    }

    @Test
    fun `without an OTP word nothing is masked`() {
        assertNull(one("You've received RM42.50 from TAN WEI MING, ref 48291077."))
        assertNull(one("Paid RM12.90 at 7-ELEVEN 2241 KLCC."))
        val e = keep("Your money is in!", "You've received RM42.50 from TAN WEI MING, ref 48291077.")
        assertFalse(e.maybeOtp)
        assertEquals("You've received RM42.50 from TAN WEI MING, ref 48291077.", e.text)
    }

    @Test
    fun `an OTP word with nothing to mask leaves it raw`() {
        assertNull(one("PBe: Fund transfer RM100.00 to TAN WEI MING successful (TAC verified)."))
        assertFalse(keep("Ryt Bank", "Keep your OTP and TAC confidential. Paid RM12.90.").maybeOtp)
    }

    @Test
    fun `a keyword in the title masks the text, and the reverse`() {
        // the filter drops these outright; the mask is checked alone
        assertEquals(
            listOf("Kod keselamatan", "Pemindahan RM50.00 kepada TAN WEI MING: ••••••", null),
            mask.mask("Kod keselamatan", "Pemindahan RM50.00 kepada TAN WEI MING: 482910", null),
        )
        assertEquals(listOf("Payment ••••", "Never share your PIN", "Big ••••••"), mask.mask("Payment 2241", "Never share your PIN", "Big 482910"))
    }

    @Test
    fun `payments with a footer are kept, masked, with their amount`() {
        listOf(
            "RM12.90 paid at 7-ELEVEN 2241 KLCC. Keep your OTP and TAC confidential.",
            "Bayaran RM12.90 di 7-ELEVEN 2241 KLCC berjaya. Rahsiakan TAC anda.",
            "Card ending 1234 charged RM38.15 at PETRON on 09 Oct. Auth code 482910.",
            "You've sent RM50.00 to TAN WEI MING on 9 October 2026 at 2:30 PM. Never share your OTP.",
        ).forEach { s ->
            val e = keep("Bank", s)
            assertTrue(e.maybeOtp, s)
            assertNoCode(e.text)
            assertTrue(Regex("RM\\d+\\.\\d{2}").containsMatchIn(e.text!!), s)
        }
    }
}
