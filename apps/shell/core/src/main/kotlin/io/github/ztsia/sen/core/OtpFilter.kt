package io.github.ztsia.sen.core

/**
 * Drops one-time passwords, TACs and the like before anything is stored (spec §6.2, D86). It runs after
 * the chosen-apps check, in native code. Since Android 15 the system hides most OTP notifications from
 * listeners anyway; this is the second line.
 *
 * A phrase matches as whole words, in any case; a space or hyphen in it matches any run of spaces and
 * hyphens, or none, so "one-time password" also catches "one time password" and "onetime password".
 */
class OtpFilter(phrases: List<String>) {
    private val patterns: List<Regex> = phrases.map(::compile)

    fun isOtp(vararg parts: String?): Boolean {
        val text = normalise(parts.filterNotNull().joinToString("\n"))
        return text.isNotEmpty() && patterns.any { it.containsMatchIn(text) }
    }

    companion object {
        private const val RESOURCE = "/sen/otp-keywords.txt"

        /** The phrases kept in the repo, `src/main/resources/sen/otp-keywords.txt`. */
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
            return Regex("(?<![\\p{L}\\p{N}])$body(?![\\p{L}\\p{N}])")
        }
    }
}
