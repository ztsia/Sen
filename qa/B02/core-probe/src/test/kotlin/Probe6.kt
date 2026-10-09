import io.github.ztsia.sen.core.*
import java.io.File
import java.text.Normalizer
import kotlin.test.*

/**
 * QA run 6 (scoped: the capture path, spec §6.2, D86, D115, D116, D119). Cases are acceptance.md's
 * R6-AC criteria, written from the docs before OtpMask.kt was opened this run. Cases marked
 * "(after reading)" were added after reading the source, to aim at what it does. Each goes through
 * the gate as the listener runs it. Every notification is made up.
 *
 *   gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test --tests Probe6
 *
 * With PROBE6_OUT set, the kept events are also written as JSON lines, for QA's SQLite check of the
 * outbox schema (phase 4).
 */
class Probe6 {
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"
    private val grab = "com.grabtaxi.passenger"
    private val chosen = setOf(ryt, grab)
    private var n = 0L

    private fun posted(title: String?, text: String?, big: String? = null, pkg: String = ryt, key: String? = null, w: Long? = null, channel: String? = "c") =
        Posted(pkg, key ?: "k${++n}", channel, 1_000L + n, w ?: (1_000L + n), title, text, big)

    private fun decide(p: Posted, channels: Set<ChannelRef> = emptySet()): Decision {
        val d = gate.decide(p, chosen, channels)
        val shown = if (d is Decision.Keep) "Keep(maybeOtp=${d.event.maybeOtp}) -> ${listOf(d.event.title, d.event.text, d.event.bigText).joinToString(" | ")}" else d.toString()
        println("$shown  <- ${listOf(p.title, p.text, p.bigText).joinToString(" | ")}")
        if (d is Decision.Keep) dump(d.event)
        return d
    }

    private fun keep(title: String?, text: String?, big: String? = null, pkg: String = ryt): RawEvent =
        assertIs<Decision.Keep>(decide(posted(title, text, big, pkg))).event

    private fun dropped(reason: DropReason, title: String?, text: String?, big: String? = null) =
        assertEquals(Decision.Drop(reason), decide(posted(title, text, big)))

    /** Any four of the code's digits in order, even split by up to three other characters (NFKC first). */
    private fun readable(code: String, s: String?): Boolean {
        if (s == null) return false
        // as the filter reads text: NFKC, and any run of whitespace as one space
        val t = Normalizer.normalize(s, Normalizer.Form.NFKC).replace(Regex("\\s+"), " ")
        val digitsOnly = t.map { if (it.isDigit()) Character.getNumericValue(it).toString() else it.toString() }.joinToString("")
        return (0..code.length - 4).any { i ->
            val w = code.substring(i, i + 4)
            Regex(w.toCharArray().joinToString("[^0-9]{0,3}") { Regex.escape(it.toString()) }).containsMatchIn(digitsOnly)
        }
    }

    /** Dropped as an OTP, or stored with no readable trace of the code. */
    private fun safe(code: String, title: String?, text: String?, big: String? = null) {
        when (val d = decide(posted(title, text, big))) {
            is Decision.Drop -> assertEquals(DropReason.OTP, d.reason)
            is Decision.Keep -> assertFalse(listOf(d.event.title, d.event.text, d.event.bigText).any { readable(code, it) }, "code readable in: ${d.event.text}")
        }
    }

    private fun dump(e: RawEvent) {
        val out = System.getenv("PROBE6_OUT") ?: return
        fun j(s: String?) = if (s == null) "null" else "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\t", "\\t") + "\""
        File(out).appendText(
            "{\"dedupe_key\":${j(e.dedupeKey)},\"package\":${j(e.packageName)},\"channel\":${j(e.channel)},\"key\":${j(e.key)}," +
                "\"post_time\":${e.postTime},\"when_ms\":${e.whenMillis},\"title\":${j(e.title)},\"text\":${j(e.text)},\"big_text\":${j(e.bigText)},\"maybe_otp\":${if (e.maybeOtp) 1 else 0}}\n",
        )
    }

    // ---- R6-AC-1 / 2: chosen first ----
    @Test fun ac1_unchosen_payment() = assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), gate.decide(posted("Paid", "Paid RM12.90 at KEDAI MAJU", pkg = "com.example.notchosen"), chosen))
    @Test fun ac1s_chosen_payment_kept() { keep("Paid", "Paid RM12.90 at KEDAI MAJU") }
    @Test fun ac2_unchosen_otp_is_not_chosen() = assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), gate.decide(posted("Bank", "Your TAC is 482913.", pkg = "com.example.notchosen"), chosen))
    @Test fun ac2_denylisted_package_in_the_chosen_set_still_refused_by_classifier() {
        // the gate trusts the chosen set; the picker's classifier is what refuses WhatsApp (D86)
        val d = gate.decide(posted("Mum", "Your TAC is 482913", pkg = "com.whatsapp"), setOf("com.whatsapp"))
        println("whatsapp forced into chosen -> $d")
    }

    // ---- R6-AC-3 / 4: clear OTPs drop ----
    @Test fun ac3_clear_otps() {
        dropped(DropReason.OTP, "Ryt Bank", "Your TAC is 482913.")
        dropped(DropReason.OTP, "Ryt Bank", "Kod pengesahan anda ialah 482913.")
        dropped(DropReason.OTP, "OTP", "482913 is your code")
    }
    @Test fun ac3s_footer_only_kept_unchanged() {
        val e = keep("Ryt Bank", "Paid RM12.90 at KEDAI MAJU. Never share your TAC with anyone.")
        assertEquals("Paid RM12.90 at KEDAI MAJU. Never share your TAC with anyone.", e.text)
        assertFalse(e.maybeOtp)
    }
    @Test fun ac4_advice_points_at_code() = dropped(DropReason.OTP, "Ryt Bank", "Use 482913 to approve. Do not share this code.")

    // ---- R6-AC-5 / 6: weak keywords and references ----
    @Test fun ac5_pin_dropped() = dropped(DropReason.OTP, "Ryt Bank", "Your PIN is 4829.")
    @Test fun ac5s_promo_code_kept() { keep("Ryt Bank", "Promo! Use code 4829 for 10% off.") }
    @Test fun ac6_reference_codes_kept() {
        keep("Ryt Bank", "Payment of RM12.90 successful. Payment code 48291375.")
        keep("Ryt Bank", "Bayaran RM12.90 berjaya. Kod rujukan 48291375.")
    }
    @Test fun ac6s_verification_code_dropped() = dropped(DropReason.OTP, "Ryt Bank", "Your verification code is 48291375.")

    // ---- R6-AC-7: shapes ----
    @Test fun ac7_shapes_dropped() {
        listOf("482 913", "4 8 2 9 1 3", "G-482913", "４８２９１３").forEach { dropped(DropReason.OTP, "Ryt Bank", "Your TAC is $it.") }
    }
    @Test fun ac7s_not_codes_kept() {
        listOf("RM4,829.00", "09-10-2026", "21:47", "03-2345 6789").forEach {
            val d = decide(posted("Ryt Bank", "TAC request for transfer on $it was cancelled."))
            println("ac7s $it -> $d")
            assertIs<Decision.Keep>(d, it)
        }
    }

    // ---- R6-AC-9: summaries, ongoing, channels ----
    @Test fun ac9_summary_ongoing_channel() {
        assertEquals(Decision.Drop(DropReason.GROUP_SUMMARY), gate.decide(posted("P", "Paid RM12.90").copy(isGroupSummary = true), chosen))
        assertEquals(Decision.Drop(DropReason.ONGOING), gate.decide(posted("P", "Paid RM12.90").copy(isOngoing = true), chosen))
        assertEquals(Decision.Drop(DropReason.CHANNEL), gate.decide(posted("P", "Paid RM12.90", channel = "promo"), chosen, setOf(ChannelRef(ryt, "promo"))))
        assertIs<Decision.Keep>(gate.decide(posted("P", "Paid RM12.90", channel = "tx"), chosen, setOf(ChannelRef(ryt, "promo"))))
        // the same channel name on another app isn't dropped
        assertIs<Decision.Keep>(gate.decide(posted("P", "Paid RM12.90", channel = "promo", pkg = grab), chosen, setOf(ChannelRef(ryt, "promo"))))
    }

    // ---- R6-AC-10 / 11 / 12: the mask ----
    @Test fun ac10_masked_and_marked() {
        val e = keep("Ryt Bank", "Paid RM12.90 at KEDAI 4829. Never share your TAC.")
        assertEquals("Paid RM12.90 at KEDAI ••••. Never share your TAC.", e.text)
        assertTrue(e.maybeOtp)
    }
    @Test fun ac10s_three_digits_unchanged_unmarked() {
        val e = keep("Ryt Bank", "Paid RM12.90 at KEDAI 482. Never share your TAC.")
        assertEquals("Paid RM12.90 at KEDAI 482. Never share your TAC.", e.text)
        assertFalse(e.maybeOtp)
    }
    @Test fun ac11_amounts_left() {
        val e = keep("Ryt Bank", "RM 1,250.00 / MYR 12.40 / RM12.40 / RM 4829 / 12.40 / 4829. Never share your TAC.")
        assertEquals("RM 1,250.00 / MYR 12.40 / RM12.40 / RM 4829 / 12.40 / ••••. Never share your TAC.", e.text)
    }
    @Test fun ac12_every_field() {
        val big = keep("Never share your TAC", "Paid RM12.90.", "Store KEDAI 482913")
        assertEquals("Store KEDAI ••••••", big.bigText); assertTrue(big.maybeOtp)
        val title = keep("KEDAI 482913", "Paid RM12.90.", "Never share your TAC.")
        assertEquals("KEDAI ••••••", title.title); assertTrue(title.maybeOtp)
    }

    // ---- R6-AC-13: dedupe from the masked text ----
    @Test fun ac13_same_key_when_differing_only_in_masked_digits_one_key() {
        val a = assertIs<Decision.Keep>(decide(posted("Ryt Bank", "Paid RM12.90 at KEDAI 482913. Never share your TAC.", key = "same", w = 5_000))).event
        val b = assertIs<Decision.Keep>(decide(posted("Ryt Bank", "Paid RM12.90 at KEDAI 771204. Never share your TAC.", key = "same", w = 5_000))).event
        assertEquals(a.dedupeKey, b.dedupeKey)
        assertEquals(DedupeKey.of(ryt, "same", 5_000, "Ryt Bank", a.text, null), a.dedupeKey)
        val c = assertIs<Decision.Keep>(decide(posted("Ryt Bank", "Paid RM12.90 at KEDAI 482913. Never share your TAC.", key = "same", w = 5_001))).event
        assertNotEquals(a.dedupeKey, c.dedupeKey)
    }

    // ---- R6-AC-14: raw text exact ----
    @Test fun ac14_exact_text() {
        val title = "You’ve received money!  "
        val text = "Paid RM12.90 at Kedai Kopi 椰浆 - Bangsar [Non-Halal] 👍\nThank you.\u00A0"
        val e = keep(title, text, "Line one\r\nLine two")
        assertEquals(title, e.title); assertEquals(text, e.text); assertEquals("Line one\r\nLine two", e.bigText)
        assertFalse(e.maybeOtp)
    }
    @Test fun ac14s_grab_reference_masked_unmarked() {
        val e = keep(null, "Your GrabPay Wallet has been charged MYR 12.40 for booking 00129876543-K4XQ2PLM7RTWA-G-1.", pkg = grab)
        assertEquals("Your GrabPay Wallet has been charged MYR 12.40 for booking •••••••••••-K4XQ2PLM7RTWA-G-1.", e.text)
        assertFalse(e.maybeOtp)
    }
    @Test fun ac14s_null_title_stays_null() {
        val e = keep(null, "Paid RM12.90", null)
        assertNull(e.title); assertNull(e.bigText)
    }

    // ---- R6-AC-15: dedupe key parts ----
    @Test fun ac15_key_parts() {
        val a = assertIs<Decision.Keep>(decide(posted("AB", "C", key = "k", w = 9))).event
        val a2 = assertIs<Decision.Keep>(decide(posted("AB", "C", key = "k", w = 9))).event
        val b = assertIs<Decision.Keep>(decide(posted("A", "BC", key = "k", w = 9))).event
        val c = assertIs<Decision.Keep>(decide(posted("AB", "C", key = "k", w = 10))).event
        val d = assertIs<Decision.Keep>(decide(posted("AB", "C", key = "k", w = 9, pkg = grab))).event
        assertEquals(a.dedupeKey, a2.dedupeKey)
        assertEquals(4, setOf(a.dedupeKey, b.dedupeKey, c.dedupeKey, d.dedupeKey).size)
    }

    // ---- R6-AC-18: hostile input ----
    @Test fun ac18_hostile() {
        keep("Ryt Bank", "x".repeat(5_000))
        assertEquals(Decision.Drop(DropReason.EMPTY), decide(posted("", null, null)))
        safe("482913", "Ryt Bank", "Paid RM12.90 at KEDAI 48\u200B29\u200B13. Never share your TAC.")
        // the filter's own patterns on a very long digit sentence: kept masked and marked
        val e = keep("Ryt Bank", "Never share your TAC. " + "9 ".repeat(5_000))
        assertTrue(e.text!!.none { it.isDigit() })
    }

    // ---- R6-AC-24: digits as the filter reads them ----
    @Test fun ac24_shapes_masked() {
        listOf("482\u2009913", "４８２９１３", "(482) 913", "482_913", "48\u200B29\u200B13", "𝟒𝟖𝟐𝟗𝟏𝟑", "④⑧②⑨①③", "⁴⁸²⁹¹³", "४८२९१३").forEach {
            safe("482913", "Ryt Bank", "Masukkan $it untuk sahkan.")
        }
    }
    @Test fun ac24s_short_numbers_stay() {
        val e = keep("Ryt Bank", "Table 12, No. 123, 9:47 PM")
        assertEquals("Table 12, No. 123, 9:47 PM", e.text)
    }

    // ---- R6-AC-26: unlisted OTP wordings ----
    @Test fun ac26_unlisted_wordings() {
        listOf("Masukkan 482913 untuk sahkan transaksi.", "Nombor pengesahan anda ialah 482913.", "您的验证码是482913").forEach { safe("482913", "Ryt Bank", it) }
    }

    // ---- (after reading) shapes the filter reads as one number but the mask doesn't join ----
    /** The filter collapses any run of whitespace to one space; the mask joins across at most three. */
    @Test fun after_four_spaces() = safe("482913", "Ryt Bank", "Masukkan 482    913 untuk sahkan.")
    @Test fun after_newlines_and_spaces() = safe("482913", "Ryt Bank", "Masukkan 482 \n \n 913 untuk sahkan.")
    /** Keycap emoji digits: '4' U+FE0F U+20E3 each. */
    @Test fun after_keycap_digits() = safe("482913", "Ryt Bank", "Masukkan 4\uFE0F\u20E38\uFE0F\u20E32\uFE0F\u20E39\uFE0F\u20E31\uFE0F\u20E33\uFE0F\u20E3 untuk sahkan.")
    /** Combining marks or a variation selector between digits: invisible-ish, not in the mask's set. */
    @Test fun after_variation_selector() = safe("482913", "Ryt Bank", "Masukkan 4\uFE0E8\uFE0E2\uFE0E9\uFE0E1\uFE0E3 untuk sahkan.")
    @Test fun after_combining_grapheme_joiner() = safe("482913", "Ryt Bank", "Masukkan 482\u034F913 untuk sahkan.")
    @Test fun after_bullet_separator() = safe("482913", "Ryt Bank", "Masukkan 482•913 untuk sahkan.")
    @Test fun after_colon_groups() = safe("482913", "Ryt Bank", "Masukkan 48:29:13 untuk sahkan.")
    /** A code shaped as an amount: "4829.13", "4829,13" (decimal comma) and right after a currency. */
    // spec-consistent: §6.2 leaves a decimal amount ("12,90" too) and never reads an amount as a code; printed only
    @Test fun after_decimal_shape() { println("decimal shape -> ${keep("Ryt Bank", "Masukkan 4829,13 untuk sahkan.").text}") }
    @Test fun after_currency_whole() {
        val e = keep("Ryt Bank", "Sahkan RM 482913 dengan kod.")
        println("after currency -> ${e.text}")
    }
    /** The sim's fourth sample, as the core stores it: the date masked as the simulator shows it. */
    @Test fun after_sim_sample_parity() {
        val e = keep("Your money is in!", "You've received RM42.50 from TAN WEI MING on 12/9/2026, 9:48 PM (GMT+8).")
        assertEquals("You've received RM42.50 from TAN WEI MING on ••/•/••••, 9:48 PM (GMT+8).", e.text)
        assertFalse(e.maybeOtp)
    }
    /** Run 5's finding 4: a currency then a no-break space keeps a whole-ringgit amount. */
    @Test fun after_nbsp_currency() {
        listOf("RM\u00A02500", "RM  2500", "RM\u00A02,500").forEach { a ->
            val e = keep("Ryt Bank", "Paid $a at KEDAI MAJU. Ref 482913. Never share your TAC.")
            assertTrue(e.text!!.contains("Paid $a at"), "amount changed: ${e.text}")
        }
        assertEquals("No. 123, 9:47 PM", keep("Ryt Bank", "No. 123, 9:47 PM. Never share your TAC.").text!!.substringBefore(". Never"))
    }
    /** Time to read hostile sizes (run 5 finding 3): each decision under 250 ms. */
    @Test fun after_timing() {
        listOf("1 ".repeat(2_560), "4".repeat(5_120), "482 913 ".repeat(640), "Never share your TAC. " + "12, ".repeat(1_250), "(1)".repeat(1_700)).forEach { s ->
            val t0 = System.nanoTime()
            val d = gate.decide(posted("Ryt Bank", s), chosen)
            val ms = (System.nanoTime() - t0) / 1_000_000
            println("timing ${s.take(12)}… ${s.length} chars -> ${d::class.simpleName} in $ms ms")
            assertTrue(ms < 250, "took $ms ms")
        }
    }

    /** (after reading) The same shapes with a strong keyword: if the filter misses them too, a TAC is stored readable. */
    @Test fun after_strong_keyword_keycap() = safe("482913", "Ryt Bank", "Your TAC is 4\uFE0F\u20E38\uFE0F\u20E32\uFE0F\u20E39\uFE0F\u20E31\uFE0F\u20E33\uFE0F\u20E3.")
    @Test fun after_strong_keyword_bullet() = safe("482913", "Ryt Bank", "Your TAC is 482•913.")
    @Test fun after_strong_keyword_colons() = safe("482913", "Ryt Bank", "Your TAC is 48:29:13.")
    @Test fun after_strong_keyword_cgj() = safe("482913", "Ryt Bank", "Your TAC is 482\u034F913.")
    @Test fun after_strong_keyword_vs() = safe("482913", "Ryt Bank", "Your TAC is 4\uFE0E8\uFE0E2\uFE0E9\uFE0E1\uFE0E3.")
    @Test fun after_strong_keyword_four_spaces() = safe("482913", "Ryt Bank", "Your TAC is 482    913.")
    @Test fun after_strong_keyword_decimal_comma() { println("decimal comma -> ${decide(posted("Ryt Bank", "Your TAC is 4829,13."))}") } // spec-consistent, printed only
    @Test fun after_strong_keyword_dot_groups() = safe("482913", "Ryt Bank", "Your TAC is 48.29.13.")
    @Test fun after_strong_keyword_after_currency_word() { println("after RM -> ${decide(posted("Ryt Bank", "Your TAC for RM 482913."))}") } // an amount by §6.2, printed only

    /**
     * R6-AC-25 (after reading): a notification the filter can't read is kept masked and *marked*. No OTP word
     * here, so the mark can only come from the gate's catch (the JVM's regex overflows on this sentence).
     */
    @Test fun ac25_unreadable_kept_masked_and_marked() {
        val e = keep("Ryt Bank", "Paid RM12.90 at KEDAI MAJU. " + "1 ".repeat(2_500))
        assertTrue(e.text!!.startsWith("Paid RM12.90 at KEDAI MAJU. ") && !e.text!!.contains("1 1 1 1"), "digits left: ${e.text!!.take(60)}")
        assertTrue(e.maybeOtp, "an unreadable notification must be marked maybe OTP (spec §6.2, D119)")
    }
}
