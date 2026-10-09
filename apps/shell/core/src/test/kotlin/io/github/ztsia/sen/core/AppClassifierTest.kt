package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** Messaging, SMS, email and social apps can't be chosen (brief B02, done-when 5). */
class AppClassifierTest {
    private val self = "io.github.ztsia.sen"
    private fun blocked(app: AppFacts) = AppClassifier.blocked(app, self)

    @Test
    fun `the default SMS app is blocked, whatever its package`() {
        assertEquals(BlockReason.SMS, blocked(AppFacts("com.example.sms", isDefaultSms = true)))
    }

    @Test
    fun `apps that send SMS or email are blocked`() {
        assertEquals(BlockReason.MESSAGING, blocked(AppFacts("com.example.chat", handlesSms = true)))
        assertEquals(BlockReason.EMAIL, blocked(AppFacts("com.example.mail", handlesEmail = true)))
    }

    @Test
    fun `social apps are blocked by their category`() {
        assertEquals(BlockReason.SOCIAL, blocked(AppFacts("com.example.social", isSocial = true)))
    }

    @Test
    fun `the denylist blocks well-known apps that declare nothing`() {
        listOf("com.whatsapp", "org.telegram.messenger", "com.google.android.gm", "com.facebook.orca", "com.instagram.android")
            .forEach { assertEquals(BlockReason.DENYLIST, blocked(AppFacts(it)), it) }
    }

    @Test
    fun `Sen itself can't be chosen, nor its debug build`() {
        assertEquals(BlockReason.SELF, blocked(AppFacts(self)))
        assertEquals(BlockReason.SELF, blocked(AppFacts("$self.debug")))
    }

    @Test
    fun `banks and e-wallets can be chosen`() {
        listOf("my.rytbank.app", "my.com.tngdigital.ewallet", "com.pbb.mypb", "com.grabtaxi.passenger")
            .forEach { assertNull(blocked(AppFacts(it)), it) }
    }

    @Test
    fun `the first sign wins, so a messaging app on the denylist still says why`() {
        assertEquals(BlockReason.MESSAGING, blocked(AppFacts("com.whatsapp", handlesSms = true)))
    }
}
