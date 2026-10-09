package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class OtpFilterTest {
    private val filter = OtpFilter.default()

    @Test
    fun `drops one-time passwords and TACs, in English and Malay`() {
        listOf(
            "Your OTP is 123456. Valid for 3 minutes.",
            "RM0.00 TAC 482910 for DuitNow Transfer. Do not share this code.",
            "Your one-time password for login is 829104",
            "Use verification code 5521 to sign in",
            "Your security code is 0042",
            "Kod TAC anda ialah 482910. Jangan kongsi kod ini.",
            "Kod pengesahan anda: 662910",
            "Jangan dedahkan kod ini kepada sesiapa",
            "Kata laluan sekali guna anda ialah 112233",
            "Approve with Secure2u: RM50.00 to TAN WEI MING",
            "Your mTAC is 551200",
            "One Time Passcode: 8812",
            "onetime password 9921",
            "Don’t share this code with anyone",
        ).forEach { assertTrue(filter.isOtp(it), it) }
    }

    @Test
    fun `reads title and expanded text too`() {
        assertTrue(filter.isOtp("Your TAC", "123456", null))
        assertTrue(filter.isOtp(null, "Login", "Enter OTP 991122 to continue"))
    }

    @Test
    fun `matches whole words only`() {
        // "tac" inside a word, "otp" inside another, "passcodes" isn't "passcode"
        listOf("Tactical gear 50% off", "Hotpot dinner RM42.00", "Contact us at 1300", "stacked rewards").forEach {
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
    }
}
