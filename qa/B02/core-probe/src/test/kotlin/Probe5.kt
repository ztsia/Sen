import io.github.ztsia.sen.core.*
import java.text.Normalizer
import kotlin.test.*

/**
 * QA run 5: the capture path after the masking net (D116, spec §6.2). Cases are acceptance.md's run-5
 * criteria (AC-48 to AC-64), written from the docs before OtpMask.kt was opened; a few hostile shapes
 * were added after reading it and are marked "(after reading)". Each goes through the gate as the
 * listener runs it. Every notification is made up.
 *
 *   gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test --tests Probe5
 */
class Probe5 {
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"
    private val chosen = setOf(ryt)
    private var n = 0L

    private fun posted(title: String?, text: String?, big: String? = null, pkg: String = ryt, key: String? = null, `when`: Long? = null): Posted {
        n++
        return Posted(pkg, key ?: "k$n", "c", 1_000L + n, `when` ?: (1_000L + n), title, text, big)
    }

    private fun decide(p: Posted): Decision {
        val d = gate.decide(p, chosen)
        val shown = if (d is Decision.Keep) "Keep(maybeOtp=${d.event.maybeOtp}) -> ${listOf(d.event.title, d.event.text, d.event.bigText).joinToString(" | ")}" else d.toString()
        println("$shown  <- ${listOf(p.title, p.text, p.bigText).joinToString(" | ")}")
        return d
    }

    private fun keep(title: String?, text: String?, big: String? = null): RawEvent =
        assertIs<Decision.Keep>(decide(posted(title, text, big))).event

    /** No four of the code's digits survive in order, even split by up to three other characters (NFKC first). */
    private fun readable(code: String, s: String?): Boolean {
        if (s == null) return false
        val t = Normalizer.normalize(s, Normalizer.Form.NFKC)
        return (0..code.length - 4).any { i ->
            val w = code.substring(i, i + 4)
            Regex(w.toCharArray().joinToString("[^0-9]{0,3}") { Regex.escape(it.toString()) }).containsMatchIn(t)
        }
    }

    /** Dropped as an OTP, or kept with no readable trace of the code (D116: no possible code is stored). */
    private fun safe(code: String, title: String?, text: String?, big: String? = null) {
        when (val d = decide(posted(title, text, big))) {
            is Decision.Drop -> assertEquals(DropReason.OTP, d.reason)
            is Decision.Keep -> {
                val e = d.event
                assertFalse(listOf(e.title, e.text, e.bigText).any { readable(code, it) }, "code readable in: ${e.text}")
                assertTrue(e.maybeOtp, "kept without the maybe-OTP mark")
            }
        }
    }

    private fun masked(code: String, title: String?, text: String?, big: String? = null): RawEvent {
        val e = keep(title, text, big)
        assertTrue(e.maybeOtp, "not marked")
        assertFalse(listOf(e.title, e.text, e.bigText).any { readable(code, it) }, "code readable")
        return e
    }

    private fun untouched(title: String?, text: String?, big: String? = null) {
        val e = keep(title, text, big)
        assertFalse(e.maybeOtp, "marked maybe OTP")
        assertEquals(title, e.title); assertEquals(text, e.text); assertEquals(big, e.bigText)
    }

    private val doubtful = "Paid RM12.90 at KEDAI MAJU 482913. Never share your TAC."

    // ---- AC-48: chosen first ----
    @Test fun ac48_unchosen_doubtful() = assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), gate.decide(posted("Bank", doubtful, pkg = "com.example.notchosen"), chosen))
    @Test fun ac48_unchosen_clear_otp() = assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), gate.decide(posted("Bank", "Your TAC is 482913.", pkg = "com.example.notchosen"), chosen))
    @Test fun ac48s_chosen_doubtful_kept_masked() {
        val e = masked("482913", "Ryt Bank", doubtful)
        assertEquals("Paid RM12.90 at KEDAI MAJU ••••••. Never share your TAC.", e.text)
    }

    // ---- AC-49: a clear OTP still drops on the raw text ----
    @Test fun ac49_clear_otp_dropped() = assertEquals(Decision.Drop(DropReason.OTP), decide(posted("Ryt Bank", "Your TAC is 482913 for a transfer of RM50.00 to TAN WEI MING.")))
    @Test fun ac49_clear_otp_title_dropped() = assertEquals(Decision.Drop(DropReason.OTP), decide(posted("OTP 482913", "Use it within 3 minutes.")))
    @Test fun ac49s_footer_no_digits_untouched() = untouched("Ryt Bank", "You've sent RM42.50 to TAN WEI MING. Never share your TAC.")

    // ---- AC-50: masked in any field, any OTP word ----
    @Test fun ac50_words() {
        listOf(
            "Never share your OTP.", "Jangan kongsi TAC anda.", "Do not reveal your verification code to anyone.",
            "Jangan dedahkan kod pengesahan anda.", "Keep your PIN safe.", "Never share your password.",
            "Rahsiakan kata laluan anda.", "Protect your codes.", "Kod anda adalah rahsia.",
        ).forEach { f -> safe("482913", "Ryt Bank", "Paid RM12.90 at KEDAI MAJU 482913. $f") }
    }
    @Test fun ac50_code_in_title_word_in_big() = safe("482913", "Paid at KEDAI 482913", "RM12.90 paid.", "Never share your TAC.")
    @Test fun ac50_code_in_big_word_in_title() = safe("482913", "Never share your TAC", "RM12.90 paid.", "Merchant KEDAI MAJU 482913")
    @Test fun ac50s_no_word_untouched() = untouched("Ryt Bank", "Paid RM12.90 at KEDAI MAJU 482913. Thank you.")

    // ---- AC-51: amounts are left ----
    @Test fun ac51_amounts_left() {
        listOf("RM12.90", "RM 1,234.50", "RM1234.50", "RM2500", "MYR 2500", "RM 2,500", "1,234.56", "-RM1,250.00", "RM 12,345.67", "MYR1,000,000.00").forEach { a ->
            val e = masked("482913", "Ryt Bank", "Paid $a at KEDAI MAJU. Ref 482913. Never share your TAC.")
            assertTrue(e.text!!.contains("Paid $a at"), "amount changed: ${e.text}")
        }
    }
    /** (after reading) a currency then a no-break space or two spaces, with a whole-ringgit amount. */
    @Test fun ac51_amount_after_nbsp() {
        listOf("RM 2500", "RM  2500", "RM 2,500").forEach { a ->
            val e = keep("Ryt Bank", "Paid $a at KEDAI MAJU. Ref 482913. Never share your TAC.")
            assertTrue(e.text!!.contains("Paid $a at"), "amount changed: ${e.text}")
        }
    }
    @Test fun ac51s_after_amount_masked() {
        val e = masked("482913", "Ryt Bank", "RM12.90 482913. Never share your TAC.")
        assertEquals("RM12.90 ••••••. Never share your TAC.", e.text)
    }
    @Test fun ac51s_ref_2500_masked() {
        val e = keep("Ryt Bank", "Paid RM12.90. Ref 2500. Never share your TAC.")
        assertEquals("Paid RM12.90. Ref ••••. Never share your TAC.", e.text)
        assertTrue(e.maybeOtp)
    }

    // ---- AC-52: disguised codes ----
    private fun disguised(code: String) = safe("482913", "Ryt Bank", "Transfer RM50.00 to TAN WEI MING: $code. Never share your TAC.")
    @Test fun ac52_space() = disguised("482 913")
    @Test fun ac52_pairs() = disguised("48 29 13")
    @Test fun ac52_singles() = disguised("4 8 2 9 1 3")
    @Test fun ac52_hyphen() = disguised("482-913")
    @Test fun ac52_glued_word() = disguised("OTP482913")
    @Test fun ac52_letter_prefix() = disguised("A-482913")
    @Test fun ac52_zero_width() = disguised("48​29​13")
    @Test fun ac52_nbsp() = disguised("482 913")
    @Test fun ac52_thin_space() = disguised("482 913")
    @Test fun ac52_fullwidth() = disguised("４８２９１３")
    // (after reading) more separators the filter's NFKC would read as a space, or a reader as a group
    @Test fun ac52_en_space() = disguised("482 913")
    @Test fun ac52_ideographic_space() = disguised("482　913")
    @Test fun ac52_tab() = disguised("482\t913")
    @Test fun ac52_middle_dot() = disguised("482·913")
    @Test fun ac52_em_dash() = disguised("482—913")
    @Test fun ac52_minus_sign() = disguised("482−913")
    @Test fun ac52_underscore() = disguised("482_913")
    @Test fun ac52_parens() = disguised("(482) 913")
    @Test fun ac52_circled() = disguised("④⑧②⑨①③")
    @Test fun ac52_math_bold() = disguised("𝟒𝟖𝟐𝟗𝟏𝟑")
    @Test fun ac52_arabic_indic() = disguised("٤٨٢٩١٣")
    @Test fun ac52s_short_numbers_stay() = untouched("Ryt Bank", "Paid RM12.90 at Table 12, No. 123, 9:47 PM. Never share your TAC.")

    // ---- AC-53: only the masked digits change ----
    @Test fun ac53_masked_rest_identical() {
        val raw = "Card payment completed 👍\r\nRM12.90 paid at KEDAI MAJU 482913 🙂. Never share your TAC.  "
        val e = keep("Ryt​ Bank", raw)
        assertEquals(raw.replace("482913", "••••••"), e.text)
        assertEquals("Ryt​ Bank", e.title)
        assertNull(e.bigText)
    }
    @Test fun ac53s_unmasked_identical() =
        untouched("Café ​payment", "You've received RM42.50 from TAN WEI MING 👍\r\nThanks!  ", null)

    // ---- AC-54: the dedupe key from the masked text ----
    @Test fun ac54_key_from_masked() {
        val p = posted("Ryt Bank", doubtful, key = "same", `when` = 5_000L)
        val e = assertIs<Decision.Keep>(gate.decide(p, chosen)).event
        assertEquals(DedupeKey.of(ryt, "same", 5_000L, "Ryt Bank", e.text, null), e.dedupeKey)
        assertNotEquals(DedupeKey.of(ryt, "same", 5_000L, "Ryt Bank", doubtful, null), e.dedupeKey)
        val other = assertIs<Decision.Keep>(gate.decide(posted("Ryt Bank", doubtful.replace("482913", "771204"), key = "same", `when` = 5_000L), chosen)).event
        assertEquals(e.dedupeKey, other.dedupeKey)
    }
    @Test fun ac54s_replay_and_new_when() {
        val a = assertIs<Decision.Keep>(gate.decide(posted("Ryt Bank", doubtful, key = "r", `when` = 7_000L), chosen)).event
        val replay = assertIs<Decision.Keep>(gate.decide(posted("Ryt Bank", doubtful, key = "r", `when` = 7_000L), chosen)).event
        val later = assertIs<Decision.Keep>(gate.decide(posted("Ryt Bank", doubtful, key = "r", `when` = 7_060_000L), chosen)).event
        assertEquals(a.dedupeKey, replay.dedupeKey)
        assertNotEquals(a.dedupeKey, later.dedupeKey)
    }

    // ---- AC-55 (core part): nothing the event carries holds the code ----
    @Test fun ac55_event_holds_no_code() {
        val e = keep("Ryt Bank", doubtful, "KEDAI MAJU 482913")
        assertFalse(e.toString().contains("482913"))
        assertFalse(readable("482913", e.toString()))
    }

    // ---- AC-61: nothing hidden, nothing claimed ----
    @Test fun ac61_word_and_amount_only() = untouched("Ryt Bank", "Paid RM1,234.50 at KEDAI MAJU. Never share your TAC.")
    @Test fun ac61_word_and_rm_integer() = untouched("Ryt Bank", "Paid RM 1234 at KEDAI MAJU. Never share your TAC.")

    // ---- AC-62: substrings aren't words; odd forms are ----
    @Test fun ac62_substrings_untouched() {
        listOf("Paid RM12.90 at TACO HOUSE 2241.", "Paid RM12.90 at SPINNEYS 1234.", "Paid RM12.90 at KODAK 5521.",
            "Delivered to postcode 50450. Paid RM12.90.", "Paid RM12.90 at CODEX 2026.").forEach { untouched("Ryt Bank", it) }
    }
    @Test fun ac62s_glued_otp() = safe("482913", "Ryt Bank", "OTP:482913")
    @Test fun ac62s_bracket_tac() = safe("482913", "Ryt Bank", "Paid RM12.90 at KEDAI 482913 [TAC]")
    @Test fun ac62s_lower_tac_colon() = safe("482913", "Ryt Bank", "Paid RM12.90 at KEDAI 482913. tac: never share.")
    @Test fun ac62s_spaced_tac() = safe("482913", "Ryt Bank", "Paid RM12.90 at KEDAI 482913. Never share your T A C.")

    // ---- AC-63: OTPs in wording the lists might not hold ----
    @Test fun ac63_passcode() = safe("482913", "Ryt Bank", "Your passcode is 482913")
    @Test fun ac63_kata_laluan_sekali_guna() = safe("482913", "Ryt Bank", "Kata laluan sekali guna anda: 482913")
    @Test fun ac63_nombor_pengesahan() = safe("482913", "Ryt Bank", "Nombor pengesahan anda ialah 482913")
    @Test fun ac63_one_time_pin() = safe("482913", "Ryt Bank", "Your one-time PIN: 482913")
    @Test fun ac63_security_code() = safe("482913", "Ryt Bank", "Your security code: 482913")
    @Test fun ac63_2fa() = safe("482913", "Ryt Bank", "Your 2FA code is 482913")
    @Test fun ac63_log_masuk() = safe("482913", "Ryt Bank", "Gunakan 482913 untuk log masuk")
    @Test fun ac63_chinese() = safe("482913", "Ryt Bank", "您的验证码是482913")
    @Test fun ac63_verification_number() = safe("482913", "Ryt Bank", "Your verification number is 482913")
    @Test fun ac63_verify_login() = safe("482913", "Ryt Bank", "Use 482913 to verify your login.")
    @Test fun ac63_sahkan() = safe("482913", "Ryt Bank", "Masukkan 482913 untuk sahkan transaksi RM50.00.")
    @Test fun ac63_token() = safe("482913", "Ryt Bank", "Your secure token: 482913")
    @Test fun ac63_activation() = safe("482913", "Ryt Bank", "Your activation code is 482913")

    // ---- AC-64: hostile sizes ----
    private fun timed(label: String, p: Posted): Decision {
        val t0 = System.nanoTime()
        val d = gate.decide(p, chosen)
        val ms = (System.nanoTime() - t0) / 1_000_000
        println("TIME $label: ${ms} ms -> ${d::class.simpleName}")
        assertTrue(ms < 250, "$label took $ms ms")
        return d
    }
    @Test fun ac64_64kb() {
        gate.decide(posted("w", "warm up"), chosen)
        val big = "Paid RM12.90 at KEDAI MAJU 482913. Never share your TAC. ".repeat(64 * 1024 / 56)
        val d = timed("64KB", posted("Ryt Bank", big))
        if (d is Decision.Keep) assertFalse(readable("482913", d.event.text))
    }
    @Test fun ac64_singles() {
        val s = "1 ".repeat(20_000) + "TAC"
        timed("20000 singles", posted("Ryt Bank", s))
    }
    @Test fun ac64_groups() {
        val s = "482 913 ".repeat(5_000) + ". Never share your TAC."
        val d = timed("5000 groups", posted("Ryt Bank", s))
        if (d is Decision.Keep) assertFalse(readable("482913", d.event.text))
    }
    @Test fun ac64_digits_run() {
        val s = "Never share your TAC. Ref " + "7".repeat(60_000)
        timed("60000-digit run", posted("Ryt Bank", s))
    }
    @Test fun ac64s_big_text_only() {
        val e = keep(null, null, "Paid RM12.90 at KEDAI MAJU 482913. Never share your TAC.")
        assertTrue(e.maybeOtp); assertNull(e.title); assertNull(e.text)
    }

    // ---- AC-59s: the simulator's fixed maybe-OTP is what the core would store ----
    @Test fun ac59s_sim_sample_matches_core() {
        val e = keep("Ryt Bank", "RM50.00 transfer to TAN WEI MING: 482910. Never share your TAC.")
        assertEquals("RM50.00 transfer to TAN WEI MING: ••••••. Never share your TAC.", e.text)
    }
}

/**
 * (after reading) Where the stack overflow comes from, and from what size. Each check runs on a thread
 * with a 1 MB stack, as Android gives a plain Java thread such as the listener's capture executor.
 */
class Probe5Overflow {
    private fun overflows(stack: Long, f: () -> Unit): Boolean {
        var hit = false
        val t = Thread(null, { try { f() } catch (e: StackOverflowError) { hit = true } }, "probe", stack)
        t.start(); t.join()
        return hit
    }
    private fun threshold(label: String, make: (Int) -> String, f: (String) -> Unit) {
        var lo = 1; var hi = 200_000
        if (!overflows(1L shl 20) { f(make(hi)) }) { println("OVERFLOW $label: none up to ${make(hi).length} chars"); return }
        while (hi - lo > 1) { val mid = (lo + hi) / 2; if (overflows(1L shl 20) { f(make(mid)) }) hi = mid else lo = mid }
        println("OVERFLOW $label: first at ${make(hi).length} chars (n=$hi)")
    }
    private val filter = OtpFilter.default()
    private val mask = OtpMask.default()
    private val gate = CaptureGate()
    private val singles = { k: Int -> "Never share your TAC. " + "1 ".repeat(k) }
    private val run = { k: Int -> "Never share your TAC. Ref " + "7".repeat(k) }
    private val groups = { k: Int -> "Never share your TAC. " + "482 913 ".repeat(k) }
    private val pairs = { k: Int -> "Never share your TAC. " + "12, ".repeat(k) }

    @Test fun where_and_when() {
        for ((name, make) in listOf("singles" to singles, "digit run" to run, "groups" to groups, "comma pairs" to pairs)) {
            threshold("filter/$name", make) { filter.isOtp("Ryt Bank", it, null) }
            threshold("mask/$name", make) { mask.mask("Ryt Bank", it, null) }
            threshold("gate/$name", make) { gate.decide(Posted("p", "k", "c", 1, 1, "Ryt Bank", it, null), setOf("p")) }
        }
    }
}
