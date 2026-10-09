package io.github.ztsia.sen.core

import java.text.Normalizer

/**
 * The safety net under the OTP/TAC filter (D116, D119, spec §6.2). Until the template drafter can classify
 * a new wording (B09, B10), nothing on the phone can tell a code from a reference, so every notification
 * the filter keeps is stored with its long numbers masked. A code the filter misses is then never stored,
 * whatever words it comes with. One that also carries an OTP word (advice included) is marked
 * *maybe OTP*, for the drafter to judge first.
 *
 * What's masked, on the text as posted: every run of digits with at least four digits outside amounts.
 * A digit is anything Unicode reads as one, the way the filter does after NFKC (fullwidth, Arabic-Indic,
 * circled, mathematical). A run may be grouped by up to three spaces of any kind, tabs, dashes, middle
 * dots, underscores, slashes or brackets ("482 913", "48 - 29 - 13", "(482) 913"), or by a single dot or
 * comma ("48.29.13"), may hold invisible characters, and may follow letters ("OTP482913"). A comma or
 * dot followed by a space ends a run, so "No. 123, 9:47 PM" stays as it is.
 *
 * Amounts are left: a decimal amount ("1,234.56", "50.00", "12,90") or the number straight after a
 * currency ("RM 2,500", "RM 2500"). Each masked digit becomes `•`; everything else stays. It reads
 * the text once, without regular expressions, so no notification can be too long for it.
 */
class OtpMask(strong: List<String>) {
    private val words =
        Regex("(?<![\\p{L}\\p{N}])(?:${OtpFilter.alternation(strong + WORDS)})(?![\\p{L}])")

    /** The parts as they're stored: long numbers masked; `maybeOtp` when an OTP word sits beside them. */
    data class Result(val parts: List<String?>, val maybeOtp: Boolean)

    fun apply(vararg parts: String?): Result {
        val masked = parts.map { it?.let(::maskDigits) }
        val changed = masked != parts.toList()
        return Result(masked, changed && parts.filterNotNull().any(::hasWord))
    }

    /** An OTP word anywhere: a listed word, its letters spelled apart ("T A C"), or a Chinese term. */
    private fun hasWord(part: String): Boolean =
        CJK.containsMatchIn(part) ||
            OtpFilter.sentences(part).any { words.containsMatchIn(it) || words.containsMatchIn(joinLetters(it.replace(PUNCTUATION, " "))) }

    companion object {
        /**
         * Words that mark a masked notification *maybe OTP*, beyond the filter's own keywords. Only a hint
         * for the drafter, which judges every masked wording (B10); the mask never depends on it.
         */
        private val WORDS =
            OtpFilter.WEAK +
                listOf(
                    "codes", "pins", "passwords", "passcodes", "kod-kod", "token", "tokens", "verify", "verification",
                    "verified", "login", "log in", "log-in", "sign in", "sign-in", "authenticate", "pengesahan",
                    "sahkan", "mengesahkan", "log masuk", "daftar masuk",
                )

        private val PUNCTUATION = Regex("\\p{P}+")

        private val CJK = Regex("验证码|校验码|动态码|动态密码|验证|密码|認證|驗證碼")

        /** "t a c 4 8 2" reads as "tac 4 8 2": single letters spelled apart are joined. */
        private fun joinLetters(s: String): String {
            val out = StringBuilder()
            var prevSingle = false
            for (w in s.split(' ').filter { it.isNotEmpty() }) {
                val single = w.length == 1 && w[0].isLetter()
                if (out.isNotEmpty() && !(single && prevSingle)) out.append(' ')
                out.append(w)
                prevSingle = single
            }
            return out.toString()
        }

        private const val MASK = '•'
        private const val MAX_SEPARATORS = 3

        /** The longest number read as an amount; anything longer is a number to mask. */
        private const val MAX_AMOUNT = 24

        fun default(): OtpMask = OtpMask(OtpFilter.parse(OtpFilter.load()))

        private enum class Kind { DIGIT, OTHER_DIGIT, POINT, SEPARATOR, INVISIBLE, OTHER }

        private fun kind(cp: Int): Kind =
            when {
                Character.isDigit(cp) -> Kind.DIGIT
                Character.getType(cp) == Character.OTHER_NUMBER.toInt() && nfkcDigits(cp) -> Kind.OTHER_DIGIT
                cp == '.'.code || cp == ','.code -> Kind.POINT
                cp in INVISIBLE -> Kind.INVISIBLE
                Character.isWhitespace(cp) || Character.isSpaceChar(cp) -> Kind.SEPARATOR
                Character.getType(cp) == Character.DASH_PUNCTUATION.toInt() -> Kind.SEPARATOR
                cp in SEPARATORS -> Kind.SEPARATOR
                else -> Kind.OTHER
            }

        /** Circled, parenthesised and similar numbers: digits once NFKC has read them ("①" is "1"). */
        private fun nfkcDigits(cp: Int): Boolean {
            val n = Normalizer.normalize(String(Character.toChars(cp)), Normalizer.Form.NFKC)
            return n.isNotEmpty() && n.all { it in '0'..'9' || it == '(' || it == ')' || it == '.' } && n.any { it.isDigit() }
        }

        private val INVISIBLE = setOf(0x200B, 0x200C, 0x200D, 0x200E, 0x200F, 0x2060, 0xFEFF, 0x00AD)

        /** Besides spaces and dashes: middle dots, the minus sign, underscores, slashes and brackets. */
        private val SEPARATORS = setOf(0x00B7, 0x2027, 0x30FB, 0x2212, '_'.code, '/'.code, '('.code, ')'.code)

        internal fun maskDigits(s: String): String {
            val cps = s.codePoints().toArray()
            val kinds = Array(cps.size) { kind(cps[it]) }
            fun digit(i: Int) = kinds[i] == Kind.DIGIT || kinds[i] == Kind.OTHER_DIGIT
            val masked = BooleanArray(cps.size)
            var i = 0
            while (i < cps.size) {
                if (!digit(i)) {
                    i++
                    continue
                }
                // a run: from this digit to the last digit reachable through allowed gaps
                val start = i
                var end = i
                var j = i + 1
                while (j < cps.size) {
                    if (digit(j)) {
                        end = j
                        j++
                        continue
                    }
                    // a gap: invisible characters, then up to three separators, or a single dot or comma
                    var k = j
                    var separators = 0
                    var points = 0
                    while (k < cps.size && !digit(k)) {
                        when (kinds[k]) {
                            Kind.INVISIBLE -> {}
                            Kind.SEPARATOR -> separators++
                            Kind.POINT -> points++
                            else -> break
                        }
                        k++
                    }
                    val joins = k < cps.size && digit(k) && (if (points > 0) points == 1 && separators == 0 else separators <= MAX_SEPARATORS)
                    if (!joins) break
                    j = k
                }
                maskRun(s, cps, kinds, start, end, masked)
                i = end + 1
            }
            if (masked.none { it }) return s
            val out = StringBuilder(s.length)
            for (n in cps.indices) if (masked[n]) out.append(MASK) else out.appendCodePoint(cps[n])
            return out.toString()
        }

        /** Masks one run's digits outside its amounts, when four or more of them are left. */
        private fun maskRun(s: String, cps: IntArray, kinds: Array<Kind>, start: Int, end: Int, masked: BooleanArray) {
            val amount = BooleanArray(end - start + 1)
            // tokens: the run split at separators (dots and commas stay inside a token)
            var t = start
            var first = true
            while (t <= end) {
                while (t <= end && kinds[t] != Kind.DIGIT && kinds[t] != Kind.OTHER_DIGIT) t++
                if (t > end) break
                var u = t
                while (u + 1 <= end && (kinds[u + 1] == Kind.DIGIT || kinds[u + 1] == Kind.POINT)) u++
                val token = shape(cps, kinds, t, u)
                if (isDecimalAmount(token) || (first && afterCurrency(cps, start) && isCurrencyAmount(token))) {
                    for (n in t..u) amount[n - start] = true
                }
                first = false
                t = u + 1
            }
            val loose = (start..end).filter { (kinds[it] == Kind.DIGIT || kinds[it] == Kind.OTHER_DIGIT) && !amount[it - start] }
            val count = loose.sumOf { if (kinds[it] == Kind.OTHER_DIGIT) digitsIn(cps[it]) else 1 }
            if (count >= 4) loose.forEach { masked[it] = true }
        }

        private fun digitsIn(cp: Int): Int =
            Normalizer.normalize(String(Character.toChars(cp)), Normalizer.Form.NFKC).count { it.isDigit() }

        /** A token's shape: `d` for a digit, `.` and `,` as they are. Null when it's too long to be an amount. */
        private fun shape(cps: IntArray, kinds: Array<Kind>, from: Int, to: Int): String? {
            if (to - from + 1 > MAX_AMOUNT) return null
            return buildString {
                for (n in from..to) append(if (kinds[n] == Kind.DIGIT) 'd' else cps[n].toChar())
            }
        }

        /** 50.00, 1,234.56, 12,90: whole units, maybe grouped by thousands, then exactly two decimals. */
        private fun isDecimalAmount(t: String?): Boolean =
            t != null && (THOUSANDS_DECIMAL.matches(t) || PLAIN_DECIMAL.matches(t))

        /** After a currency: a whole number too, maybe grouped by thousands. */
        private fun isCurrencyAmount(t: String?): Boolean =
            t != null && (isDecimalAmount(t) || THOUSANDS.matches(t) || WHOLE.matches(t))

        private val THOUSANDS_DECIMAL = Regex("d{1,3}(?:,ddd)+\\.dd")
        private val PLAIN_DECIMAL = Regex("d+[.,]dd")
        private val THOUSANDS = Regex("d{1,3}(?:,ddd)+")
        private val WHOLE = Regex("d+")

        /** RM, MYR, USD, SGD or $ just before the run, with any spaces between. */
        private fun afterCurrency(cps: IntArray, start: Int): Boolean {
            var k = start - 1
            var spaces = 0
            while (k >= 0 && (Character.isWhitespace(cps[k]) || Character.isSpaceChar(cps[k]))) {
                k--
                spaces++
            }
            if (spaces > MAX_SEPARATORS || k < 0) return false
            if (cps[k] == '$'.code) return true
            val letters = StringBuilder()
            while (k >= 0 && Character.isLetter(cps[k]) && letters.length < 4) {
                letters.insert(0, Character.toChars(Character.toLowerCase(cps[k])))
                k--
            }
            if (k >= 0 && Character.isLetter(cps[k])) return false
            return letters.toString() in CURRENCIES
        }

        private val CURRENCIES = setOf("rm", "myr", "usd", "sgd")
    }
}
