package io.github.ztsia.sen.core

/** A notification as the listener sees it, before anything is decided or stored. */
data class Posted(
    val packageName: String,
    val key: String,
    val channel: String?,
    val postTime: Long,
    /** The time the app stamped on it (`Notification.when`); 0 when it set none. */
    val whenMillis: Long,
    val title: String?,
    val text: String?,
    val bigText: String?,
    val isGroupSummary: Boolean = false,
    val isOngoing: Boolean = false,
)

/**
 * A notification that passed every check: what the outbox stores (spec §6.2). Its text is as the app
 * wrote it, except that long numbers outside amounts are masked (D116, D119, OtpMask); `maybeOtp` marks
 * one that also carries an OTP word.
 */
data class RawEvent(
    val dedupeKey: String,
    val packageName: String,
    val channel: String?,
    val key: String,
    val postTime: Long,
    val whenMillis: Long,
    val title: String?,
    val text: String?,
    val bigText: String?,
    val maybeOtp: Boolean = false,
)

enum class DropReason { NOT_CHOSEN, GROUP_SUMMARY, ONGOING, CHANNEL, EMPTY, OTP }

sealed interface Decision {
    data class Keep(val event: RawEvent) : Decision
    data class Drop(val reason: DropReason) : Decision
}

/**
 * The listener's checks, in order (spec §6.2, D86). The chosen-apps check comes first: a notification
 * from any other app is dropped before its text is even read, and the caller keeps no record of it.
 * Then group summaries, ongoing notifications (a ride in progress or a download: status, never a
 * payment), the channels a channel rule drops (B10 fills the list), notifications with no text, and
 * OTPs and TACs. What's kept has its long numbers masked before it's stored, and its dedupe key is taken
 * from the masked text, so a code never reaches storage, even as a hash. If the filter can't read a
 * notification at all, it's kept masked and marked *maybe OTP*: the mask reads any text.
 */
class CaptureGate(
    otp: OtpFilter = OtpFilter.default(),
    private val mask: OtpMask = OtpMask.default(),
    /** The OTP check; replaceable only so tests can make it fail. */
    private val isOtp: (String?, String?, String?) -> Boolean = { t, x, b -> otp.isOtp(t, x, b) },
) {
    fun decide(p: Posted, chosen: Set<String>, droppedChannels: Set<ChannelRef> = emptySet()): Decision {
        if (p.packageName !in chosen) return Decision.Drop(DropReason.NOT_CHOSEN)
        if (p.isGroupSummary) return Decision.Drop(DropReason.GROUP_SUMMARY)
        if (p.isOngoing) return Decision.Drop(DropReason.ONGOING)
        if (p.channel != null && ChannelRef(p.packageName, p.channel) in droppedChannels) {
            return Decision.Drop(DropReason.CHANNEL)
        }
        if (p.title.isNullOrBlank() && p.text.isNullOrBlank() && p.bigText.isNullOrBlank()) {
            return Decision.Drop(DropReason.EMPTY)
        }
        val unread =
            try {
                if (isOtp(p.title, p.text, p.bigText)) return Decision.Drop(DropReason.OTP)
                false
            } catch (e: StackOverflowError) {
                // text too long or odd for the filter's patterns: in doubt, keep it masked and marked
                true
            } catch (e: RuntimeException) {
                // the same on Android, whose ICU-backed patterns fail with an exception instead
                true
            }
        val whenMillis = if (p.whenMillis > 0) p.whenMillis else p.postTime
        val masked = mask.apply(p.title, p.text, p.bigText)
        val (title, text, bigText) = masked.parts
        return Decision.Keep(
            RawEvent(
                dedupeKey = DedupeKey.of(p.packageName, p.key, whenMillis, title, text, bigText),
                packageName = p.packageName,
                channel = p.channel,
                key = p.key,
                postTime = p.postTime,
                whenMillis = whenMillis,
                title = title,
                text = text,
                bigText = bigText,
                maybeOtp = masked.maybeOtp || unread,
            ),
        )
    }
}

/** One app's notification channel, as a channel rule names it. */
data class ChannelRef(val packageName: String, val channel: String)
