package io.github.ztsia.sen.core

/** What the shell knows about an installed app, from PackageManager (D86). */
data class AppFacts(
    val packageName: String,
    /** The phone's default SMS app. */
    val isDefaultSms: Boolean = false,
    /** Its manifest says `android:appCategory="social"` (ApplicationInfo.CATEGORY_SOCIAL). */
    val isSocial: Boolean = false,
    /** It handles `smsto:` or `mmsto:`: an SMS or messaging app. */
    val handlesSms: Boolean = false,
    /** It handles `mailto:`: an email app. */
    val handlesEmail: Boolean = false,
)

/** Why an app can never be chosen. */
enum class BlockReason { SELF, SMS, MESSAGING, EMAIL, SOCIAL, DENYLIST }

/**
 * Messaging, SMS, email and social apps can never be chosen (spec §6.2, D86): they carry TACs and private
 * conversations. Any one sign blocks an app; the denylist catches the well-known ones that declare none.
 */
object AppClassifier {
    val DENYLIST: Set<String> =
        setOf(
            // messaging
            "com.whatsapp",
            "com.whatsapp.w4b",
            "org.telegram.messenger",
            "org.telegram.messenger.web",
            "org.telegram.plus",
            "org.thunderdog.challegram",
            "com.facebook.orca",
            "com.facebook.mlite",
            "org.thoughtcrime.securesms",
            "com.viber.voip",
            "jp.naver.line.android",
            "com.tencent.mm",
            "com.discord",
            "com.Slack",
            "com.microsoft.teams",
            "com.google.android.apps.dynamite",
            "com.google.android.apps.messaging",
            "com.samsung.android.messaging",
            "com.android.mms",
            "com.skype.raider",
            "com.google.android.apps.googlevoice",
            // email
            "com.google.android.gm",
            "com.google.android.gm.lite",
            "com.microsoft.office.outlook",
            "com.yahoo.mobile.client.android.mail",
            "ch.protonmail.android",
            "com.samsung.android.email.provider",
            "com.android.email",
            // social
            "com.facebook.katana",
            "com.facebook.lite",
            "com.instagram.android",
            "com.instagram.barcelona",
            "com.twitter.android",
            "com.zhiliaoapp.musically",
            "com.ss.android.ugc.trill",
            "com.snapchat.android",
            "com.linkedin.android",
            "com.reddit.frontpage",
            "com.pinterest",
            "xyz.blueskyweb.app",
        )

    fun blocked(app: AppFacts, selfPackage: String): BlockReason? =
        when {
            app.packageName == selfPackage || app.packageName.startsWith("$selfPackage.") -> BlockReason.SELF
            app.isDefaultSms -> BlockReason.SMS
            app.handlesSms -> BlockReason.MESSAGING
            app.handlesEmail -> BlockReason.EMAIL
            app.isSocial -> BlockReason.SOCIAL
            app.packageName in DENYLIST -> BlockReason.DENYLIST
            else -> null
        }
}
