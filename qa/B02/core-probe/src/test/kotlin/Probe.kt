import io.github.ztsia.sen.core.*
import kotlin.test.*

/** Cases the branch's own tests don't cover. Every notification here is made up. */
class Probe {
    private val f = OtpFilter.default()
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"
    private fun p(text: String?, title: String? = "T", whenMs: Long = 1_000, key: String = "k", big: String? = null, pkg: String = ryt) =
        Posted(pkg, key, "c", 2_000, whenMs, title, text, big)

    // AC-24: OTPs that must drop
    @Test fun otp_glued_to_digits() { println("OTP123456 -> " + f.isOtp("Your OTP123456 for login")); assertTrue(f.isOtp("Your OTP123456 for login")) }
    @Test fun tac_glued_to_digits() { println("TAC:482910 -> " + f.isOtp("TAC:482910 for RM10.00")); assertTrue(f.isOtp("TAC:482910 for RM10.00")) }
    @Test fun generic_code_is() { val t = "Your Grab code is 482910. It expires in 5 minutes."; println("code is -> " + f.isOtp(t)); assertTrue(f.isOtp(t)) }
    @Test fun malay_kod_anda() { val t = "Kod anda ialah 482910. Sah selama 3 minit."; println("kod anda -> " + f.isOtp(t)); assertTrue(f.isOtp(t)) }
    @Test fun pin_is() { val t = "Your PIN is 4829"; println("PIN -> " + f.isOtp(t)); assertTrue(f.isOtp(t)) }

    // AC-25: payments that must be kept
    @Test fun payment_with_security_footer() {
        val t = "RM50.00 paid to KEDAI ABC from your Savings Account. Never share your PIN with anyone."
        println("payment+footer -> " + f.isOtp(t)); assertFalse(f.isOtp(t))
    }
    @Test fun payment_with_tac_mention() {
        val t = "You've sent RM120.00 to LIM KAH HOE. If you didn't do this, call us. We never ask for your TAC."
        println("payment+TAC mention -> " + f.isOtp(t)); assertFalse(f.isOtp(t))
    }
    @Test fun merchant_named_tac() {
        val t = "RM12.90 paid at TAC CAFE using your Main Account."
        println("merchant TAC CAFE -> " + f.isOtp(t)); assertFalse(f.isOtp(t))
    }
    @Test fun merchant_named_otp() {
        val t = "RM8.00 paid at OTP SDN BHD using your Main Account."
        println("merchant OTP SDN BHD -> " + f.isOtp(t)); assertFalse(f.isOtp(t))
    }
    @Test fun substrings_kept() { listOf("Contact", "attack", "Stacks", "TACO BELL RM12.00", "OTPro RM3.00", "hotpot").forEach { assertFalse(f.isOtp(it), it) } }

    // AC-23: an unchosen app never gets as far as reading
    @Test fun unchosen_first_even_if_ongoing_summary_or_empty() {
        assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), gate.decide(p(null, null, pkg = "com.whatsapp").copy(isGroupSummary = true, isOngoing = true), setOf(ryt)))
        assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), gate.decide(p("RM5", pkg = "com.whatsapp"), emptySet()))
    }
    @Test fun chosen_is_exact_package_not_prefix() {
        assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), gate.decide(p("RM5", pkg = "my.rytbank.app.evil"), setOf(ryt)))
        assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), gate.decide(p("RM5", pkg = "MY.RYTBANK.APP"), setOf(ryt)))
    }

    // AC-26/27/28: dedupe
    private fun key(d: Decision) = (d as Decision.Keep).event.dedupeKey
    @Test fun replay_same_key() = assertEquals(key(gate.decide(p("RM5"), setOf(ryt))), key(gate.decide(p("RM5"), setOf(ryt))))
    @Test fun new_when_new_key() = assertNotEquals(key(gate.decide(p("RM5"), setOf(ryt))), key(gate.decide(p("RM5", whenMs = 61_000), setOf(ryt))))
    @Test fun new_text_new_key() = assertNotEquals(key(gate.decide(p("RM5"), setOf(ryt))), key(gate.decide(p("RM6"), setOf(ryt))))
    @Test fun big_text_change_same_when_is_new_key() {
        val a = key(gate.decide(p("RM5"), setOf(ryt))); val b = key(gate.decide(p("RM5", big = "RM5 paid at X"), setOf(ryt)))
        println("bigText added, same key/when/text -> different dedupe key: ${a != b}")
    }
    @Test fun when_zero_uses_post_time() {
        val a = gate.decide(p("RM5", whenMs = 0), setOf(ryt)) as Decision.Keep
        val b = gate.decide(p("RM5", whenMs = 0).copy(postTime = 9_000), setOf(ryt)) as Decision.Keep
        println("when=0, re-posted with new postTime -> same key: ${a.event.dedupeKey == b.event.dedupeKey}")
    }
    @Test fun raw_text_unchanged() {
        val t = "You’ve received money!   RM 18.00 👍"
        val e = (gate.decide(p(t, title = "Card payment completed 👍"), setOf(ryt)) as Decision.Keep).event
        assertEquals(t, e.text); assertEquals("Card payment completed 👍", e.title)
    }
    @Test fun separator_inside_text_collides() {
        // fields joined with U+001F: can a notification containing U+001F collide?
        val a = DedupeKey.of("p", "k", 1, "a\u001Fb", "c", null)
        val b = DedupeKey.of("p", "k", 1, "a", "b\u001Fc", null)
        println("U+001F inside a field collides: ${a == b}")
    }
    @Test fun null_vs_empty_same_key() {
        println("title null vs \"\" -> same key: ${DedupeKey.of("p","k",1,null,"x",null) == DedupeKey.of("p","k",1,"","x",null)}")
    }
}
