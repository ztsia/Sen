package io.github.ztsia.sen.core

/**
 * Drops one-time passwords, TACs and the like before anything is stored (spec §6.2, D86). It runs after
 * the chosen-apps check, in native code. Since Android 15 the system hides most OTP notifications from
 * listeners anyway; this is the second line.
 *
 * A notification is an OTP when it has **both** a keyword (otp-keywords.txt) and a code:
 * - a 6 to 8 digit number anywhere, or
 * - a 4 or 5 digit number straight after a keyword ("PIN is 4829", "OTP: 4829", "OTP4829").
 *
 * Needing both is what keeps payments: a transfer that ends "We never ask for your TAC", or a café
 * called TAC CAFE, has a keyword but no code. A number isn't a code when it's an amount (RM, MYR, or
 * with decimals or thousands), a date or a time, a reference, an account's last digits, or part of a
 * longer number such as a phone number.
 *
 * Keywords match as whole words, in any case; a space or hyphen in one matches any run of spaces and
 * hyphens, or none, so "one-time password" also catches "one time password" and "onetime password".
 * A keyword may run straight into its code ("OTP123456").
 */
class OtpFilter(phrases: List<String>) {
    private val keywords: List<Regex> = phrases.map(::compile)

    fun isOtp(vararg parts: String?): Boolean {
        val text = normalise(parts.filterNotNull().joinToString("\n"))
        if (text.isEmpty()) return false
        val hits = keywords.flatMap { k -> k.findAll(text).map { it.range.last } }
        if (hits.isEmpty()) return false
        for (n in NUMBER.findAll(text)) {
            if (!isCode(text, n.range)) continue
            if (n.value.length >= 6) return true
            // a short code counts only right after its keyword: "PIN 4829", "OTP: 4829", "code is 4829"
            if (hits.any { end -> n.range.first > end && JOIN.matches(text.substring(end + 1, n.range.first)) }) return true
        }
        return false
    }

    private fun isCode(text: String, at: IntRange): Boolean {
        val before = text.getOrNull(at.first - 1)
        val after = text.getOrNull(at.last + 1)
        val next = text.getOrNull(at.last + 2)
        // part of an amount, a date, a time, a phone number or a masked number
        if (before != null && before in GLUED_BEFORE) return false
        if (after != null && after in GLUED_AFTER && next?.isDigit() == true) return false
        if (after == '/' || after == '-') return false
        // straight after letters: only a keyword's own code, "otp123456"
        if (before != null && before.isLetter()) return GLUED_KEYWORD.containsMatchIn(text.substring(0, at.first))
        val lead = text.substring(maxOf(0, at.first - 16), at.first)
        if (NOT_A_CODE_BEFORE.containsMatchIn(lead)) return false
        if (TIME_AFTER.matchesAt(text, at.last + 1)) return false
        return true
    }

    companion object {
        private const val RESOURCE = "/sen/otp-keywords.txt"
        private val JOIN = Regex("[\\s:=#-]*((is|ialah|adalah|anda)[\\s:=#-]*)?")

        private val NUMBER = Regex("(?<!\\p{N})\\p{N}{4,8}(?!\\p{N})")
        private val GLUED_BEFORE = setOf('.', ',', '/', '-', '+', '•', '*', '#', 'x', '×')
        private val GLUED_AFTER = setOf('.', ',', ':')
        private val GLUED_KEYWORD = Regex("(?<![\\p{L}\\p{N}])(otp|tac|mtac|pin)$")
        private val NOT_A_CODE_BEFORE =
            Regex("(?<![\\p{L}\\p{N}])(rm|myr|ref|reference|no|id|ending|ends|acc|account|a/c|akaun|rujukan)[\\s.:#-]*$")
        private val TIME_AFTER = Regex("\\s?(am|pm|h|hrs)(?![\\p{L}])")

        /** The keywords kept in the repo, `src/main/resources/sen/otp-keywords.txt`. */
        fun default(): OtpFilter = OtpFilter(parse(load()))

        fun load(): String =
            checkNotNull(OtpFilter::class.java.getResourceAsStream(RESOURCE)) { "missing $RESOURCE" }
                .use { it.readBytes().toString(Charsets.UTF_8) }

        fun parse(list: String): List<String> =
            list.lineSequence().map { it.substringBefore('#').trim() }.filter { it.isNotEmpty() }.toList()

        private fun compile(phrase: String): Regex {
            val words = normalise(phrase).split(Regex("[\\s-]+")).filter { it.isNotEmpty() }
            require(words.isNotEmpty()) { "empty phrase" }
            val body = words.joinToString("[\\s-]*") { Regex.escape(it) }
            // whole words on the left; on the right, no letter, so a code may follow straight on
            return Regex("(?<![\\p{L}\\p{N}])$body(?!\\p{L})")
        }
    }
}
