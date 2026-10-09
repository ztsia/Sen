import io.github.ztsia.sen.core.*
import kotlin.test.*

/**
 * QA run 2's own checks on the capture core, beyond the branch's tests and run 1's Probe.kt. Each prints
 * what the core returned, so the report can paste it. Every notification here is made up.
 *
 *   gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test --tests Probe2
 */
class Probe2 {
    private val f = OtpFilter.default()
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"

    private fun otp(t: String): Boolean = f.isOtp(t).also { println("isOtp=$it  <- $t") }

    // ---- AC-17: OTP and TAC shapes that must drop ----

    @Test fun r2_otp_spaced_in_threes() = assertTrue(otp("Your OTP is 123 456. Valid for 3 minutes."))
    @Test fun r2_otp_hyphenated() = assertTrue(otp("Your verification code is 123-456"))
    @Test fun r2_google_style_prefix() = assertTrue(otp("G-482910 is your verification code."))
    @Test fun r2_tac_hash_prefix() = assertTrue(otp("Your TAC is #482910 for DuitNow Transfer"))
    @Test fun r2_tac_no_prefix() = assertTrue(otp("TAC No. 482910 for RM50.00 transfer"))
    @Test fun r2_short_otp_after_words() = assertTrue(otp("Your OTP for login: 4829"))
    @Test fun r2_malay_nombor_tac() = assertTrue(otp("Nombor TAC anda: 482910"))
    @Test fun r2_one_time_pin_brackets() = assertTrue(otp("One-Time PIN (OTP): 482910. Do not share."))
    @Test fun r2_fullwidth_digits() = assertTrue(otp("Your OTP is ４８２９１０"))
    @Test fun r2_secure2u_code() = assertTrue(otp("Secure2u: approve with code 482910"))

    // ---- AC-17s: payments that must be kept ----

    @Test fun r2_store_number_and_footer() =
        assertFalse(otp("RM12.90 paid at 7-ELEVEN 123456 KL using your Main Account. Never share your PIN."))
    @Test fun r2_name_pin_and_reference_number() =
        assertFalse(otp("You've received RM42.50 from TAN PIN HUI. Reference number 20261009."))
    @Test fun r2_approval_code_and_footer() =
        assertFalse(otp("Card payment RM38.15 at PETRON approved. Approval code 482910. Never share your OTP."))
    @Test fun r2_merchant_id_and_footer() =
        assertFalse(otp("RM8.00 paid to MERCHANT 482910 via DuitNow QR. Do not share your TAC."))
    @Test fun r2_postcode_and_footer() =
        assertFalse(otp("RM20.00 paid at KEDAI ABC 47301 PETALING JAYA. Never share your PIN."))
    @Test fun r2_malay_payment_with_kod_rujukan() =
        assertFalse(otp("Pembayaran RM12.90 kepada KEDAI ABC berjaya. Kod rujukan 482910."))
    @Test fun r2_malay_payment_jangan_kongsi_with_txn_number() =
        assertFalse(otp("Anda telah menerima RM50.00 daripada TAN WEI MING. No. Transaksi 48291077. Jangan kongsi TAC anda."))
    @Test fun r2_grab_booking() =
        assertFalse(otp("Your GrabPay Wallet has been charged MYR 12.40 for booking A-482910. Never share your PIN."))

    // ---- AC-3: origin parsing edge cases ----

    private val site = "https://sen.vercel.app"
    private fun same(u: String) = Origin.same(u, site).also { println("same=$it  <- $u") }

    @Test fun r2_origin_trailing_dot() = assertFalse(same("https://sen.vercel.app./"))
    @Test fun r2_origin_userinfo_port() = assertFalse(same("https://sen.vercel.app:443@evil.example/"))
    @Test fun r2_origin_backslash() = assertFalse(same("https://evil.example\\@sen.vercel.app/"))
    @Test fun r2_origin_encoded_dot() = assertFalse(same("https://sen.vercel.app%2eevil.example/"))
    @Test fun r2_origin_tab_inside_host() = assertFalse(same("https://sen.vercel.app\t.evil.example/"))
    @Test fun r2_origin_data_url() = assertFalse(same("data:text/html,<script>1</script>"))
    @Test fun r2_origin_file_url() = assertFalse(same("file:///android_asset/public/index.html"))
    @Test fun r2_origin_same_with_userinfo_is_same_origin() = assertTrue(same("https://u@sen.vercel.app/x"))

    // ---- AC-16, AC-21: the gate and the key ----

    @Test fun r2_chosen_check_is_exact_not_prefix() {
        val d = gate.decide(Posted("my.rytbank.app.fake", "k", "c", 1, 1, "T", "RM1.00 paid", null), setOf(ryt))
        println("decision=$d"); assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), d)
    }
    @Test fun r2_chosen_check_is_case_sensitive() {
        val d = gate.decide(Posted("MY.RYTBANK.APP", "k", "c", 1, 1, "T", "RM1.00 paid", null), setOf(ryt))
        println("decision=$d"); assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), d)
    }
    @Test fun r2_same_text_new_key_is_a_new_event() {
        val a = (gate.decide(Posted(ryt, "k1", "c", 1, 5, "T", "RM1.00 paid", null), setOf(ryt)) as Decision.Keep).event
        val b = (gate.decide(Posted(ryt, "k2", "c", 1, 5, "T", "RM1.00 paid", null), setOf(ryt)) as Decision.Keep).event
        assertNotEquals(a.dedupeKey, b.dedupeKey)
    }
    @Test fun r2_post_time_alone_does_not_change_the_key() {
        // a replay hands back the same postTime anyway; with `when` set, postTime isn't in the key
        val a = (gate.decide(Posted(ryt, "k", "c", 1, 5, "T", "x", null), setOf(ryt)) as Decision.Keep).event
        val b = (gate.decide(Posted(ryt, "k", "c", 999, 5, "T", "x", null), setOf(ryt)) as Decision.Keep).event
        assertEquals(a.dedupeKey, b.dedupeKey)
    }
    @Test fun r2_channel_drop_only_for_its_own_package() {
        val d = gate.decide(Posted(ryt, "k", "promo", 1, 1, "T", "RM1.00 paid", null), setOf(ryt), setOf(ChannelRef("other.app", "promo")))
        assertIs<Decision.Keep>(d)
    }
}
