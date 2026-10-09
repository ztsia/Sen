package io.github.ztsia.sen.core

/**
 * The safety net under the OTP/TAC filter (D116, spec §6.2). A notification the filter keeps, but which
 * carries an OTP word anywhere (a strong or weak keyword, advice included) and a number that could be a
 * code, is stored with those numbers masked and marked *maybe OTP*. A code the filter misses is then
 * never stored; the template drafter decides later (B09, B10) whether the wording was a payment or an OTP.
 *
 * What's masked, on the text as posted: every run of digits with at least four digits in all, where a run
 * may be grouped by up to three spaces, dots, commas, hyphens or slashes ("482 910", "48 - 29 - 10"), hold
 * invisible characters (a zero-width space between digits), or follow letters ("OTP482910"). Amounts are
 * left: a decimal amount ("1,234.56", "50.00") or a number straight after a currency ("RM 1234"), so a
 * payment's amount survives. Each masked digit becomes `•`; separators stay. Dates, times, references
 * and phone numbers in such a notification are masked too: the event's time is stored apart, and nothing
 * else a template needs is a long number.
 */
class OtpMask(strong: List<String>) {
    private val words =
        Regex("(?<![\\p{L}\\p{N}])(?:${OtpFilter.alternation(strong + WORDS)})(?![\\p{L}])")

    /** The parts masked, or null when the notification holds no OTP word or nothing to mask. */
    fun mask(vararg parts: String?): List<String?>? {
        val present = parts.filterNotNull()
        if (present.none { p -> OtpFilter.sentences(p).any { words.containsMatchIn(it) } }) return null
        val masked = parts.map { it?.let(::maskDigits) }
        return if (masked == parts.toList()) null else masked
    }

    companion object {
        /** Words that may stand for a code beyond the filter's own keywords: plurals and their kin. */
        private val WORDS =
            OtpFilter.WEAK + listOf("codes", "pins", "passwords", "passcodes", "kod-kod", "token", "tokens")

        private const val INVISIBLE = "\\u200B-\\u200D\\u2060\\uFEFF\\u00AD"

        /** A run of digits, grouped by up to three separators at a time, with invisible characters anywhere. */
        private val RUN =
            Regex(
                "(?<![\\p{N}])\\p{N}(?:[$INVISIBLE]*(?:[ \\u00A0\\u2007\\u202F.,/\\-\\u2010-\\u2013][$INVISIBLE]*){0,3}\\p{N})*",
            )

        /** A decimal amount inside a run: 50.00, 1,234.56. */
        private val AMOUNT =
            Regex("(?<![\\p{N}.,])(?:\\p{N}{1,3}(?:,\\p{N}{3})+|\\p{N}+)\\.\\p{N}{2}(?![\\p{N}])|(?<![\\p{N}.,])\\p{N}+,\\p{N}{2}(?![\\p{N}.,])")

        /** A currency just before a run: what follows is an amount. */
        private val CURRENCY = Regex("(?i)(?<![\\p{L}])(rm|myr|usd|sgd|\\$)\\s?$")

        /** An amount after a currency: its whole number, with thousands and maybe cents. */
        private val CURRENCY_AMOUNT = Regex("^\\p{N}{1,3}(?:,\\p{N}{3})+(?:\\.\\p{N}{2})?|^\\p{N}+(?:[.,]\\p{N}{2})?")

        fun default(): OtpMask = OtpMask(OtpFilter.parse(OtpFilter.load()))

        internal fun maskDigits(s: String): String {
            val out = StringBuilder(s)
            for (run in RUN.findAll(s)) {
                val text = run.value
                val keep = BooleanArray(text.length)
                fun keepRange(r: IntRange) = r.forEach { keep[it] = true }
                if (CURRENCY.containsMatchIn(s.substring(maxOf(0, run.range.first - 5), run.range.first))) {
                    CURRENCY_AMOUNT.find(text)?.let { keepRange(it.range) }
                }
                AMOUNT.findAll(text).forEach { keepRange(it.range) }
                val loose = text.indices.filter { !keep[it] && Character.isDigit(text[it]) }
                if (loose.size < 4) continue
                loose.forEach { out.setCharAt(run.range.first + it, '•') }
            }
            return out.toString()
        }
    }
}
