import io.github.ztsia.sen.core.*
import kotlin.test.*

/**
 * QA run 4's checks on the OTP/TAC filter as spec §6.2 and D115 now describe it (evidence, sentence by
 * sentence; in doubt it drops). Cases are acceptance.md's run-4 AC-17 (t-ap) and AC-17s (7-20), written
 * from the docs before OtpFilter.kt was opened, and new to every QA run and the branch's tests. Each is
 * checked through the gate as the listener runs it (title, text, big text). Every notification is made up.
 *
 *   gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test --tests Probe4
 */
class Probe4 {
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"
    private var n = 0L

    private fun decide(title: String?, text: String?, big: String? = null): Decision {
        n++
        val d = gate.decide(Posted(ryt, "k$n", "c", 1_000L + n, 1_000L + n, title, text, big), setOf(ryt))
        val shown = if (d is Decision.Keep) "Keep" else d.toString()
        println("$shown  <- ${listOf(title, text, big).joinToString(" | ")}")
        return d
    }
    private fun dropped(title: String?, text: String?, big: String? = null) =
        assertEquals(Decision.Drop(DropReason.OTP), decide(title, text, big))
    private fun kept(title: String?, text: String?, big: String? = null) =
        assertTrue(decide(title, text, big) is Decision.Keep)
    /** Kept, but masked and marked maybe OTP (D116): no code is stored. Added after run 4. */
    private fun masked(code: String, title: String?, text: String?, big: String? = null) {
        val e = (decide(title, text, big) as Decision.Keep).event
        assertTrue(e.maybeOtp)
        assertFalse(listOf(e.title, e.text, e.bigText).any { it?.contains(code) == true })
    }

    // ---- AC-17 (run 4): OTPs that must drop ----
    @Test fun t_amount_first() = dropped("Ryt Bank", "RM50.00 DuitNow to TAN WEI MING. TAC: 482910. Expires in 3 min.")
    @Test fun u_pbe_phone() = dropped("Public Bank", "PBe: TAC 482910 for Fund Transfer RM100.00 to acct ending 1234. Not you? Call 03-2176 7000")
    @Test fun v_kod_otp_ialah() = dropped("Ryt Bank", "Kod OTP anda untuk transaksi RM100.00 ialah 482910. Sah selama 5 minit.")
    @Test fun w_masukkan_sebagai() = dropped("Ryt Bank", "Masukkan 482910 sebagai kod pengesahan anda.")
    @Test fun x_one_time_pin() = dropped("Ryt Bank", "Use one-time PIN 482910 to complete your RM120.00 purchase at SHOPEE")
    @Test fun y_adalah_otp() = dropped("Ryt Bank", "482910 adalah OTP anda. Jangan kongsi.")
    @Test fun z_approve_login_code() = dropped("Ryt Bank", "Approve login? Code 482910 expires in 60s")
    @Test fun aa_otp_for_brand_ref() = dropped("TNG eWallet", "Your OTP for TNG eWallet is 482910 (valid 5 mins). Ref: 8812")
    @Test fun ab_equals() = dropped("Ryt Bank", "TAC=482910")
    @Test fun ac_pairs() = dropped("Ryt Bank", "OTP: 48 29 10")
    @Test fun ad_advice_holds_code() = dropped("Ryt Bank", "Do not share this OTP with anyone: 482910")
    @Test fun ae_spelled_out_tac() = dropped("Ryt Bank", "Transaction Authorisation Code (TAC) 482910 for transfer RM100.00")
    @Test fun af_kata_laluan_sekali() = dropped("Ryt Bank", "Kata laluan sekali (OTP) anda: 482910")
    @Test fun ag_title_keyword_bare_code() = dropped("Your OTP", "482910")
    @Test fun ah_2fa_code() = dropped("Ryt Bank", "Your 2FA code is 482910")
    @Test fun ai_passcode() = dropped("Ryt Bank", "One Time Passcode (OTP): 482910")
    @Test fun aj_login_code() = dropped("Ryt Bank", "Your login code is 482910")
    @Test fun ak_exclamation() = dropped("Ryt Bank", "Your TAC is ready! 482910")
    @Test fun al_lower() = dropped("Ryt Bank", "otp 482910")
    @Test fun am_emoji() = dropped("Ryt Bank", "🔐 Your OTP is 482910")
    @Test fun an_code_first_amount_after() = dropped("Ryt Bank", "482910 is your TAC for RM50.00 to TAN WEI MING")
    @Test fun ao_big_text_only() = dropped("Public Bank", "You have a new message", "Your TAC is 482910")
    @Test fun ap_pin_colon() = dropped("Ryt Bank", "PIN: 4829")

    // ---- AC-17s (run 4): payments that must be kept ----
    @Test fun p07_advice_only() = kept("Ryt Bank", "You've paid RM12.90 to ZUS COFFEE. Never share your OTP or TAC with anyone.")
    @Test fun p08_date_time_ref() = kept("Ryt Bank", "Payment of RM1,250.00 to TAN WEI MING successful on 09/10/2026 14:30. Ref 482910.")
    @Test fun p09_merchant_tac_txn_id() = kept("TNG eWallet", "DuitNow QR payment RM8.50 to KEDAI TAC SENG. Transaction ID 20261009482910")
    @Test fun p10_phone_number() = kept("Ryt Bank", "Received RM100.00 from TAN WEI MING. If you did not authorise this, call 03-2176 7000.")
    @Test fun p11_merchant_digits() = kept("Ryt Bank", "Ryt Bank: RM25.00 spent at GRAB*FOOD 482910 using card ending 1234.")
    @Test fun p12_card_ending_advice() = kept("Ryt Bank", "Your card ending 4829 was charged RM38.15 at PETRON. Do not reveal your PIN or TAC to anyone.")
    @Test fun p13_malay_advice() = kept("Ryt Bank", "Bayaran RM12.90 kepada ZUS COFFEE berjaya pada 09/10/2026. Jangan dedahkan OTP anda kepada sesiapa.")
    @Test fun p14_transaction_no() = kept("TNG eWallet", "TNG eWallet: Reload of RM50.00 successful. Transaction No. 2026100914301234.")
    @Test fun p15_order_code() = kept("Grab", "GrabPay: You paid RM15.00 to MAKCIK NASI LEMAK. Order code A-482910.")
    @Test fun p16_nombor_akaun() = kept("Ryt Bank", "Pembayaran RM30.00 kepada TNB berjaya. Nombor akaun 220012345678.")
    @Test fun p17_grouped_account() = kept("Ryt Bank", "Transfer of RM200.00 to 1234 5678 9012 successful.")
    @Test fun p18_pbe_debit() = kept("Public Bank", "PBe: RM120.00 debited from acct 4829xxxx1234 on 09-10-26 14:30. Ref 482910. Never share your TAC.")
    @Test fun p19_rujukan() = kept("Ryt Bank", "Anda telah membayar RM12.90 kepada ZUS COFFEE. Rujukan: 482910.")
    @Test fun p20_reference_code_colon() = kept("Ryt Bank", "Payment successful. RM12.90 to ZUS COFFEE. Reference code: 482910")

    // ---- after reading OtpFilter.kt (run 4): shapes its rules suggest it gets wrong ----
    // OTPs (a weak keyword not "joined" by its rules; digits spaced singly; the keyword only in advice)
    @Test fun r4_code_for_amount_is() = dropped("Ryt Bank", "Your code for DuitNow transfer of RM50.00 to TAN WEI MING is 482910")
    @Test fun r4_code_for_transfer_colon() = dropped("Ryt Bank", "Code for your RM50.00 transfer: 482910")
    @Test fun r4_code_to_log_in_colon() = dropped("ShopeePay", "Your code to log in to ShopeePay: 482910")
    @Test fun r4_pin_for_amount_is() = dropped("Ryt Bank", "Your PIN for the RM50.00 transfer is 4829")
    @Test fun r4_single_digit_spaced() = dropped("Ryt Bank", "Your OTP is 4 8 2 9 1 0")
    // run 4 expected a drop; D116's net stores it masked instead (ledger, run 4)
    @Test fun r4_keyword_only_in_advice() = masked("482910", "Ryt Bank", "RM50.00 transfer to TAN WEI MING: 482910. Never share your TAC.")
    @Test fun r4_kod_sah() = dropped("Ryt Bank", "Kod sah anda: 482910")
    @Test fun r4_hyphen_u2011() = dropped("Ryt Bank", "Your one\u2011time passcode: 482910")
    // payments (a footer that isn't "never share"; card auth codes; hyphen dates; a store number)
    @Test fun r4_keep_your_tac_safe() = kept("Ryt Bank", "RM12.90 paid at 7-ELEVEN 2241 KLCC. Keep your OTP and TAC confidential.")
    @Test fun r4_rahsiakan_tac() = kept("Ryt Bank", "Bayaran RM12.90 di 7-ELEVEN 2241 KLCC berjaya. Rahsiakan TAC anda.")
    @Test fun r4_protect_your_pin_store() = kept("Public Bank", "PBe: RM12.90 spent at SHELL 2241 PJ. Protect your PIN and OTP.")
    @Test fun r4_auth_code() = kept("Public Bank", "Card ending 1234 charged RM38.15 at PETRON on 09 Oct. Auth code 482910.")
    @Test fun r4_authorisation_code() = kept("Public Bank", "Card ending 1234 charged RM38.15 at PETRON. Authorisation code: 482910.")
    @Test fun r4_payment_code() = kept("Ryt Bank", "Payment of RM12.90 to ZUS COFFEE successful. Payment code: 482910")
    @Test fun r4_txn_code() = kept("Ryt Bank", "Paid RM12.90 to ZUS COFFEE. Txn code 482910")
    @Test fun r4_secure2u_hyphen_date() = kept("MAE", "Transfer of RM50.00 to TAN WEI MING approved via Secure2u on 09-10-2026.")
    @Test fun r4_tac_verified_hyphen_date() = kept("Public Bank", "PBe: Fund transfer RM100.00 to TAN WEI MING on 09-10-2026 successful (TAC verified).")
    @Test fun r4_merchant_tac_store_no() = kept("Ryt Bank", "Paid RM12.90 at TAC CAFE 2241 KLCC using your Main Account.")
    @Test fun r4_dated_month_word() = kept("Ryt Bank", "You've sent RM50.00 to TAN WEI MING on 9 October 2026 at 2:30 PM. Never share your OTP.")
    @Test fun r4_pin_name_digits() = kept("Ryt Bank", "Received RM42.50 from LIM PIN 4829 ENTERPRISE.")
}
