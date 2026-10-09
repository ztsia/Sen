package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * The OTP/TAC filter, both ways: every OTP shape dropped, every payment kept. The cases include QA B02's
 * runs 1 and 2 (qa/B02/core-probe). Every message here is made up.
 */
class OtpFilterTest {
    private val filter = OtpFilter.default()

    @Test
    fun `drops one-time passwords and TACs, in English and Malay`() {
        listOf(
            "Your OTP is 123456. Valid for 3 minutes.",
            "RM0.00 TAC 482910 for DuitNow Transfer. Do not share this code.",
            "Your one-time password for login is 829104",
            "Use verification code 552190 to sign in",
            "Your security code is 0042",
            "Kod TAC anda ialah 482910. Jangan kongsi kod ini.",
            "Kod pengesahan anda: 662910",
            "482910 adalah kod anda. Jangan dedahkan kod ini kepada sesiapa",
            "Kata laluan sekali guna anda ialah 112233",
            "Your mTAC is 551200",
            "One Time Passcode: 8812",
            "onetime password 992188",
            "Your OTP123456 for login",
            "TAC:482910 for RM10.00",
            "Your Grab code is 482910. It expires in 5 minutes.",
            "Kod anda ialah 482910. Sah selama 3 minit.",
            "Your PIN is 4829",
            "RM500.00 to LIM KAH HOE acc ****1234. TAC: 123456. Never share it.",
            "123456 is your code. Don’t share it with anyone",
            "Enter OTP 991122 to continue",
            "OTP 4829 for login",
        ).forEach { assertTrue(filter.isOtp(it), it) }
    }

    @Test
    fun `drops codes split, prefixed or a few words from the keyword (QA run 2)`() {
        listOf(
            "Your OTP is 123 456. Valid for 3 minutes.",
            "Your verification code is 123-456",
            "G-482910 is your verification code.",
            "Your TAC is #482910 for DuitNow Transfer",
            "TAC No. 482910 for RM50.00 transfer",
            "Your OTP for login: 4829",
            "Nombor TAC anda: 482910",
            "One-Time PIN (OTP): 482910. Do not share.",
            "Your OTP is ４８２９１０",
            "Secure2u: approve with code 482910",
            "Your TAC for DuitNow Transfer to LIM KAH HOE is 482910",
        ).forEach { assertTrue(filter.isOtp(it), it) }
    }

    @Test
    fun `drops wordings no QA run listed, from banks, e-wallets and apps`() {
        listOf(
            "RM0.00 Maybank2u: TAC for DuitNow Transfer to LIM KAH HOE A/C 1234 is 482910. Valid 3 mins. Do not share.",
            "CIMB: Your TAC is 482910 for adding favourite. Never share your TAC with anyone.",
            "PBe: Your TAC No. is 482910. Do not share your TAC.",
            "[RHB] 482910 is your OTP to login. Valid for 5 minutes.",
            "TNG eWallet: 482910 is your verification code. It expires in 3 minutes.",
            "<#> 482910 is your Shopee verification code. Don't share it. AbCdEf12345",
            "Your Grab code: 4829. Don't share it with anyone.",
            "Use 482910 as your one-time password for Touch 'n Go eWallet.",
            "Kod pengesahan TNG eWallet anda ialah 482910",
            "OTP: 482 910",
            "Your login code is 48-29-10",
            "Masukkan kod 482910 untuk mengesahkan transaksi",
            "482910 is your Microsoft account verification code",
            "Apple ID Code: 482910. Don't share it with anyone.",
            "Your PIN for card activation is 482910",
            "Never share this OTP: 482910",
            "Kod OTP anda adalah 482910.",
            "Your Maybank2u TAC: 482910",
            "482910 ialah kod TAC anda.",
        ).forEach { assertTrue(filter.isOtp(it), it) }
        assertTrue(filter.isOtp("Verification code", "482910", null))
    }

    @Test
    fun `keeps payments no QA run listed`() {
        listOf(
            "You've received RM150.00 from TAN WEI MING. Ref: 48291077",
            "Payment of RM50.00 to SHOPEE successful. Order 2410098812",
            "TNG eWallet: RM10.00 reload successful. Transaction ID: 2026100912345678",
            "DuitNow QR payment RM12.90 to KEDAI ABC (Merchant ID 482910) successful.",
            "Card ending 4829 charged RM38.15 at PETRON. If this wasn't you, call 03-2178 8888. Never share your OTP/TAC.",
            "Your OTP was used successfully for a transfer of RM500.00 to LIM KAH HOE. Ref 48291077.",
            "TAC verified. RM500.00 sent to LIM KAH HOE on 09/10/2026.",
            "Secure2u: You have approved a transfer of RM500.00 to LIM KAH HOE at 14:30.",
            "Pembayaran RM12.90 kepada 7-ELEVEN 482910 berjaya. Jangan kongsi PIN anda.",
            "RM100.00 has been credited to your account 1234567890",
            "Your PIN has been changed successfully on 09 Oct 2026, 14:30.",
            "Your OTP was used to approve RM500.00 on 9 Oct 2026",
            "Cashback RM5.00 credited! Use promo code 482910",
            "TAC request for RM50.00 transfer to LIM KAH HOE was cancelled.",
        ).forEach { assertFalse(filter.isOtp(it), it) }
    }

    @Test
    fun `reads title and expanded text too`() {
        assertTrue(filter.isOtp("Your TAC", "123456", null))
        assertTrue(filter.isOtp(null, "Login", "Enter OTP 991122 to continue"))
    }

    @Test
    fun `keeps payments where a keyword and a number only share the notification`() {
        listOf(
            "RM50.00 paid to KEDAI ABC from your Savings Account. Never share your PIN with anyone.",
            "You've sent RM120.00 to LIM KAH HOE. If you didn't do this, call us. We never ask for your TAC.",
            "RM12.90 paid at TAC CAFE using your Main Account.",
            "RM8.00 paid at OTP SDN BHD using your Main Account.",
            "Approve with Secure2u: RM50.00 to TAN WEI MING",
            "RM1,500.00 sent to TAN WEI MING. Do not share your TAC. Call 1300 88 6688.",
            "You have received RM2500.00 from TAN WEI MING on 12/9/2026, 9:48 PM. Ref 482910. Never share your PIN.",
            "RM 125000 received. Account ending 4829. Do not share your OTP.",
            "Your card ••1234 was charged RM38.15. Never share your PIN.",
            "Kod promosi SAVE20 untuk RM5 diskaun",
            "Do not share your OTP with anyone. Visit us at 3 Jalan 1234 for help.",
            // QA run 2
            "RM12.90 paid at 7-ELEVEN 123456 KL using your Main Account. Never share your PIN.",
            "You've received RM42.50 from TAN PIN HUI. Reference number 20261009.",
            "Card payment RM38.15 at PETRON approved. Approval code 482910. Never share your OTP.",
            "RM8.00 paid to MERCHANT 482910 via DuitNow QR. Do not share your TAC.",
            "RM20.00 paid at KEDAI ABC 47301 PETALING JAYA. Never share your PIN.",
            "Pembayaran RM12.90 kepada KEDAI ABC berjaya. Kod rujukan 482910.",
            "Anda telah menerima RM50.00 daripada TAN WEI MING. No. Transaksi 48291077. Jangan kongsi TAC anda.",
            "Your GrabPay Wallet has been charged MYR 12.40 for booking A-482910. Never share your PIN.",
            "Your TAC is required for transfers above RM1,000.00",
            "OTP for amounts over RM5000.00 is sent by SMS",
            "RM38.15 paid at PETRON. Never share your PIN with anyone, approval code: 482910",
            "Never share your PIN, approval code 482910 is for your records",
        ).forEach { assertFalse(filter.isOtp(it), it) }
    }

    @Test
    fun `matches whole words only`() {
        listOf("Tactical gear 50% off 123456", "Hotpot dinner RM42.00", "Contact us at 1300", "stacked rewards", "TACO BELL RM12.00", "hotpot 123456").forEach {
            assertFalse(filter.isOtp(it), it)
        }
    }

    @Test
    fun `keeps every anonymised payment sample in docs-notifications`() {
        val samples = Samples.all
        assertTrue(samples.size >= 10, "expected the samples, found ${samples.size}")
        samples.forEach { assertFalse(filter.isOtp(it.title, it.text, null), "${it.title} / ${it.text}") }
    }

    @Test
    fun `the list in the repo parses, comments and blank lines aside`() {
        val phrases = OtpFilter.parse(OtpFilter.load())
        assertTrue("otp" in phrases && "tac" in phrases && "kod pengesahan" in phrases)
        assertTrue(phrases.none { it.startsWith("#") || it.isBlank() })
        // footers are payments' too: never a keyword on their own
        assertTrue(phrases.none { it in setOf("do not share", "never share", "jangan kongsi", "don't share") })
    }
}
