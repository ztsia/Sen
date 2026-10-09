package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue

/** The masking net (D116, D119): what the filter keeps is stored with its long numbers masked. */
class OtpMaskTest {
    private val mask = OtpMask.default()
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"
    private var n = 0L

    private fun one(text: String): String = mask.apply(null, text, null).parts[1]!!

    private fun keep(title: String?, text: String?, big: String? = null): RawEvent {
        n++
        val d = gate.decide(Posted(ryt, "k$n", "c", 1_000L + n, 1_000L + n, title, text, big), setOf(ryt))
        return assertIs<Decision.Keep>(d).event
    }

    /**
     * No number left with four or more digits outside amounts, read as the filter reads it (NFKC first),
     * with digits joined across spaces, dashes and the like, or a single dot or comma.
     */
    private fun assertNoCode(s: String?) {
        val t = java.text.Normalizer.normalize(s ?: return, java.text.Normalizer.Form.NFKC).replace(Regex("[\\u200B-\\u200F\\u2060\\uFEFF\\u00AD]"), "")
        val runs = Regex("\\p{Nd}(?:(?:[\\s\\p{Pd}\\u00B7\\u2212_()/]{1,3}|[.,])\\p{Nd}|\\p{Nd})*").findAll(t)
        for (run in runs) {
            val bare = run.value.replace(Regex("(?<![\\d.,])(?:\\d{1,3}(?:,\\d{3})+|\\d+)[.,]\\d{2}(?!\\d)"), "")
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
    fun `a code worded without any listed word is masked too (QA run 5, 2)`() {
        listOf(
            "Nombor pengesahan anda ialah 482913",
            "Masukkan 482913 untuk sahkan transaksi RM50.00.",
            "Gunakan 482913 untuk log masuk",
            "Use 482913 to verify your login.",
            "您的验证码是482913",
            "T A C 4 8 2 9 1 3",
        ).forEach { s ->
            val e = keep("Ryt Bank", s)
            assertNoCode(e.text)
            assertFalse(e.text!!.contains("482913"), s)
        }
        // the amount beside it survives
        assertEquals("Masukkan •••••• untuk sahkan transaksi RM50.00.", keep(null, "Masukkan 482913 untuk sahkan transaksi RM50.00.").text)
    }

    @Test
    fun `the dedupe key is taken from the masked text`() {
        val raw = "RM50.00 transfer to TAN WEI MING: 482910. Never share your TAC."
        val e = keep(null, raw)
        assertEquals(DedupeKey.of(ryt, "k$n", 1_000L + n, null, e.text, null), e.dedupeKey)
        assertTrue(e.dedupeKey != DedupeKey.of(ryt, "k$n", 1_000L + n, null, raw, null))
    }

    @Test
    fun `the amount survives, in every shape`() {
        assertEquals("Paid RM1,234.56 to ZUS. Ref ••••••.", one("Paid RM1,234.56 to ZUS. Ref 482910."))
        assertEquals("Paid RM 1234 at SHELL ••••.", one("Paid RM 1234 at SHELL 2241."))
        assertEquals("Paid RM 2500 at KEDAI MAJU. Ref ••••••.", one("Paid RM 2500 at KEDAI MAJU. Ref 482910."))
        assertEquals("Paid RM  2,500 at KEDAI MAJU.", one("Paid RM  2,500 at KEDAI MAJU."))
        assertEquals("Paid MYR 12,500.00 to TAN", one("Paid MYR 12,500.00 to TAN"))
        assertEquals("RM50.00 ••••••, keep your TAC safe", one("RM50.00 482910, keep your TAC safe"))
        assertEquals("Bayaran RM12,90 berjaya. Kod ••••", one("Bayaran RM12,90 berjaya. Kod 2241"))
        assertEquals("You've received RM42.50 from TAN WEI MING", one("You've received RM42.50 from TAN WEI MING"))
    }

    @Test
    fun `short numbers and times stay, and a comma or dot before a space ends a run (QA run 5, 4)`() {
        assertEquals("Paid RM12.90 at Table 12, No. 123, 9:47 PM.", one("Paid RM12.90 at Table 12, No. 123, 9:47 PM."))
        assertEquals("Paid RM38.15 at 7-ELEVEN on 9 Oct, 2:30 PM", one("Paid RM38.15 at 7-ELEVEN on 9 Oct, 2:30 PM"))
    }

    @Test
    fun `codes in every shape the filter reads as codes are masked (QA run 5, 1 and 5)`() {
        val shapes =
            listOf(
                "Your code: 482 913", // space
                "Your code: 482 913", // thin space
                "Your code: 482 913", // en space
                "Your code: 482　913", // ideographic space
                "Your code: 482\t913", // tab
                "Your code: 482 913", // no-break space
                "Your code: 48-29-13",
                "Your code: 48 - 29 - 13",
                "Your code: 482—913", // em dash
                "Your code: 482−913", // minus sign
                "Your code: 482·913", // middle dot
                "Your code: 482_913",
                "Your code: (482) 913",
                "Your code: 4 8 2 9 1 3",
                "Your code: 48​29​13", // zero-width, split so neither half has four digits
                "Your code: OTP482913",
                "Your code: G-482913",
                "Your code: #482913",
                "Your code: 482.913",
                "Your code: ４８２９１３", // fullwidth
                "Your code: ٤٨٢٩١٣", // Arabic-Indic
                "Your code: ④⑧②⑨①③", // circled
                "Your code: 𝟒𝟖𝟐𝟗𝟏𝟑", // mathematical bold
            )
        shapes.forEach { s ->
            val m = one(s)
            assertNoCode(m)
            assertTrue(m.contains('•'), s)
        }
    }

    @Test
    fun `maybe OTP marks only a masked notification with an OTP word`() {
        assertFalse(keep("Your money is in!", "You've received RM42.50 from TAN WEI MING, ref 48291077.").maybeOtp)
        assertEquals("You've received RM42.50 from TAN WEI MING, ref ••••••••.", keep(null, "You've received RM42.50 from TAN WEI MING, ref 48291077.").text)
        // a word, nothing to mask: stored as it is, unmarked
        assertFalse(keep("Ryt Bank", "Keep your OTP and TAC confidential. Paid RM12.90.").maybeOtp)
        assertTrue(keep("Ryt Bank", "Paid RM12.90 at SHELL 2241. Never share your PIN.").maybeOtp)
    }

    @Test
    fun `a keyword in the title marks the text, and every part is masked`() {
        val r = mask.apply("Payment 2241", "Never share your PIN", "Big 482910")
        assertEquals(listOf("Payment ••••", "Never share your PIN", "Big ••••••"), r.parts)
        assertTrue(r.maybeOtp)
    }

    @Test
    fun `any length of text is read, without overflowing (QA run 5, 3)`() {
        val inputs =
            listOf(
                "1 ".repeat(2_500),
                "4".repeat(5_000),
                "482 913 ".repeat(625),
                "12,34,".repeat(850),
                "Never share your TAC. " + "9 ".repeat(2_500),
            )
        inputs.forEach { s ->
            assertNoCode(one(s))
            val e = keep("Ryt Bank", s)
            assertNoCode(e.text)
        }
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
