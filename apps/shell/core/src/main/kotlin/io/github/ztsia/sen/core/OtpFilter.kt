package io.github.ztsia.sen.core

/**
 * Drops one-time passwords, TACs and the like before anything is stored (spec §6.2, D86). It runs after
 * the chosen-apps check, in native code. Since Android 15 the system hides most OTP notifications from
 * listeners anyway; this is the second line, and holds on its own.
 *
 * A notification is an OTP when a keyword (otp-keywords.txt) and a code are **joined**, in either order:
 * - the keyword, then a few linking words from a closed list, then the code:
 *   "Your OTP is 123 456", "TAC No. 482910", "Your OTP for login: 4829", "Kod anda ialah 482910";
 * - or the code, then a few linking words, then the keyword: "G-482910 is your verification code",
 *   "482910 adalah kod anda";
 * - or the keyword, then any few words in the same clause (no comma or full stop), then "is",
 *   "ialah" or a colon, then the code: "TAC for DuitNow Transfer to LIM KAH HOE is 482910".
 *
 * A code is 4 to 8 digits, which may be grouped by single spaces or hyphens ("123 456", "123-456"), and
 * may carry `#` or a letter and hyphen in front ("#482910", "G-482910"). It's never part of an amount (a
 * decimal point or thousands comma after it) or of a longer number.
 *
 * A keyword and a number that merely share a notification aren't joined, so payments stay: a footer such
 * as "Never share your PIN" next to a store number, a reference or an approval code is kept. That's why
 * the linking words are a closed list, and why a full stop ends the join ("No." aside).
 */
class OtpFilter(phrases: List<String>) {
    private val joined: List<Regex>

    init {
        val kw = phrases.map(::phrase).sortedByDescending { it.length }.joinToString("|")
        val keyword = "(?<![\\p{L}\\p{N}])(?:$kw)(?![\\p{L}])"
        val forward = "(?:$SEP(?:$LINK_AFTER)(?![\\p{L}]))*"
        val backward = "(?:$SEP(?:$LINK_BEFORE)(?![\\p{L}]))*"
        joined =
            listOf(
                Regex("$keyword$forward$SEP$CODE"),
                Regex("$CODE$backward$SEP$keyword"),
                // "TAC for DuitNow Transfer to LIM KAH HOE is 482910": a payee's name can't be on a list,
                // so any words may follow the keyword, within one clause, when "is" or a colon then
                // hands over the code
                Regex("$keyword(?:[ \\t]+[^\\s.,!?;]+){0,8}[ \\t]*(?:(?<![\\p{L}])(?:is|ialah|adalah)[ \\t]+|:[ \\t]*)$CODE"),
            )
    }

    fun isOtp(vararg parts: String?): Boolean {
        val text = normalise(parts.filterNotNull().joinToString("\n"))
        return text.isNotEmpty() && joined.any { it.containsMatchIn(text) }
    }

    companion object {
        private const val RESOURCE = "/sen/otp-keywords.txt"

        /** What may sit between the parts: spaces, a colon, an equals sign, brackets, a dash. Never a full stop. */
        private const val SEP = "[\\s:=()\\[\\]\\-–—]*"

        /** 4 to 8 digits, maybe grouped, maybe with # or a letter and hyphen in front; not an amount, not part of a longer number. */
        private const val CODE =
            "(?<![\\p{N}.,#/])(?:#|[a-z]-)?\\p{N}(?:[ \\-]?\\p{N}){3,7}(?![\\p{N}]|[.,]\\p{N}|[ \\-]\\p{N})"

        /** Words that link a keyword to the code after it. A closed list: anything else breaks the join. */
        private const val LINK_AFTER =
            "is|are|for|your|the|a|to|use|enter|with|approve|code|login|log|in|sign|signing|transaction|transfer|" +
                "payment|duitnow|no\\.?|number|anda|ialah|adalah|untuk|ini|bagi|guna|masukkan|masuk|nombor|nya"

        /** Words that link a code to the keyword after it. */
        private const val LINK_BEFORE = "is|are|your|the|as|adalah|ialah|merupakan|anda|ini"

        /** The keywords kept in the repo, `src/main/resources/sen/otp-keywords.txt`. */
        fun default(): OtpFilter = OtpFilter(parse(load()))

        fun load(): String =
            checkNotNull(OtpFilter::class.java.getResourceAsStream(RESOURCE)) { "missing $RESOURCE" }
                .use { it.readBytes().toString(Charsets.UTF_8) }

        fun parse(list: String): List<String> =
            list.lineSequence().map { it.substringBefore('#').trim() }.filter { it.isNotEmpty() }.toList()

        /** A keyword as a pattern: a space or hyphen in it matches any run of spaces and hyphens, or none. */
        private fun phrase(p: String): String {
            val words = normalise(p).split(Regex("[\\s-]+")).filter { it.isNotEmpty() }
            require(words.isNotEmpty()) { "empty phrase" }
            return words.joinToString("[\\s-]*") { Regex.escape(it) }
        }
    }
}
