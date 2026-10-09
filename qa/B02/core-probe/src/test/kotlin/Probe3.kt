import io.github.ztsia.sen.core.*
import kotlin.test.*

/**
 * QA run 3's own checks on the redesigned OTP/TAC filter (D115: a keyword and a code must be joined).
 * Cases come from acceptance.md AC-17 / AC-17s (written before the filter was read), plus a few added
 * after reading it, marked "after reading". Every notification here is made up.
 *
 *   gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test --tests Probe3
 */
class Probe3 {
    private val f = OtpFilter.default()
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"

    private fun otp(vararg t: String?): Boolean = f.isOtp(*t).also { println("isOtp=$it  <- ${t.joinToString(" | ")}") }

    // ---- AC-17: OTPs that must drop ----
    @Test fun a_otp_is() = assertTrue(otp("Your OTP is 123456"))
    @Test fun b_tac_colon_for() = assertTrue(otp("TAC: 482913 for transfer"))
    @Test fun c_kod_tac_ialah() = assertTrue(otp("Kod TAC anda ialah 123456"))
    @Test fun d_code_first() = assertTrue(otp("123456 is your verification code"))
    @Test fun e_run_together() = assertTrue(otp("OTP123456"))
    @Test fun f_grouped() = assertTrue(otp("Your OTP is 123 456. Valid for 3 minutes."))
    @Test fun g_google_prefix() = assertTrue(otp("G-482910 is your verification code."))
    @Test fun h_tac_no() = assertTrue(otp("TAC No. 482910 for RM50.00 transfer"))
    @Test fun i_amount_inside_clause() =
        assertTrue(otp("Your TAC for DuitNow Transfer of RM50.00 to TAN WEI MING is 482910. Valid for 3 mins."))
    @Test fun j_one_time_password() = assertTrue(otp("Your one-time password is 482910"))
    @Test fun k_brand_before_keyword() = assertTrue(otp("Your Ryt Bank OTP is 482910"))
    @Test fun l_brand_between_code_and_keyword() = assertTrue(otp("482910 is your Grab verification code"))
    @Test fun l2_google_real_shape() = assertTrue(otp("G-482910 is your Google verification code."))
    @Test fun m_kod_pengesahan() = assertTrue(otp("Kod pengesahan anda ialah 482910"))
    @Test fun n_tac_anda_colon() = assertTrue(otp("TAC anda: 482910"))
    @Test fun o_gunakan_kod() = assertTrue(otp("Gunakan kod 482910 untuk log masuk"))
    @Test fun p_keyword_in_title_code_in_text() = assertTrue(otp("One-Time Password", "482910. Valid for 3 minutes.", null))
    @Test fun q_line_break() = assertTrue(otp("Your OTP is\n482910"))
    @Test fun q2_no_break_space() = assertTrue(otp("Your OTP is 482910"))
    @Test fun r_upper_case() = assertTrue(otp("YOUR TAC IS 482910"))
    @Test fun s_four_digits_then_full_stop() = assertTrue(otp("Your TAC is 4829. Do not share."))
    // after reading: amount inside the clause, short forms
    @Test fun t_amount_then_is() = assertTrue(otp("TAC for RM1,250.00 transfer is 482910"))
    @Test fun u_use_code_to_approve() = assertTrue(otp("Use 482910 to approve your RM50.00 transfer. Do not share this code."))
    @Test fun v_otp_valid_comma() = assertTrue(otp("Your OTP, valid for 3 minutes, is 482910"))
    @Test fun w_zero_width_space() = assertTrue(otp("Your OTP is ​482910"))

    // ---- AC-17s: payments that must be kept ----
    @Test fun ps1_store_number_footer() =
        assertFalse(otp("RM12.90 paid at 7-ELEVEN 123456 KL using your Main Account. Never share your PIN."))
    @Test fun ps2_name_pin() = assertFalse(otp("You've received RM42.50 from TAN PIN HUI. Reference number 20261009."))
    @Test fun ps3_approval_code_footer() =
        assertFalse(otp("Card payment RM38.15 at PETRON approved. Approval code 482910. Never share your OTP."))
    @Test fun ps4_malay_footer() =
        assertFalse(otp("Anda telah menerima RM50.00 daripada TAN WEI MING. No. Transaksi 48291077. Jangan kongsi TAC anda."))
    @Test fun ps5_merchant_tac() = assertFalse(otp("Transfer to TAC TRADING is successful. Ref: 48291077"))
    @Test fun ps6_merchant_otp() =
        assertFalse(otp("You've sent RM50.00 to OTP ENTERPRISE on 09 Oct, 14:30 (GMT+8) using your Main Account."))
    // after reading: "kod" alone and "code is" are keywords; payments carry reference codes
    @Test fun ps7_malay_kod_rujukan() =
        assertFalse(otp("Pembayaran RM12.90 kepada ZUS COFFEE berjaya. Kod rujukan: 48291077"))
    @Test fun ps8_reference_code_is() =
        assertFalse(otp("Payment of RM12.90 to ZUS COFFEE successful. Your reference code is 48291077"))
    @Test fun ps9_approval_code_is() =
        assertFalse(otp("Card payment RM38.15 at PETRON approved. Approval code is 482910."))
    @Test fun ps10_payee_pin_colon() =
        assertFalse(otp("DuitNow to TAN PIN HUI: 48291077 RM50.00 successful"))
    @Test fun ps11_promo_code() =
        assertFalse(otp("RM5 cashback! Use code 2026 at checkout."))
    @Test fun ps12_kod_promo() =
        assertFalse(otp("Dapatkan RM5 cashback dengan kod promo RAYA2026 sekarang"))
    @Test fun ps13_kod_promo_digits() =
        assertFalse(otp("Tebus baucar RM10 dengan kod 8888 di kaunter"))
    @Test fun ps14_receipt_title_text() =
        assertFalse(otp("Payment to PIN", "482910 RM12.90 paid using your Main Account", null))

    // ---- the gate, end to end: an OTP from a chosen app is dropped, the same text from an unchosen app NOT_CHOSEN
    @Test fun gate_otp_from_chosen() {
        val p = Posted(ryt, "k", "c", 1L, 1L, "Ryt Bank", "Your TAC for DuitNow Transfer of RM50.00 to TAN WEI MING is 482910. Valid for 3 mins.", null)
        val d = gate.decide(p, setOf(ryt))
        println("gate(chosen, maybank-style TAC) = $d")
        assertEquals(Decision.Drop(DropReason.OTP), d)
    }
}
