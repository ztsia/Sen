package io.github.ztsia.sen.core

import java.text.Normalizer

/**
 * The safety net under the OTP/TAC filter (D116, D119, D121, spec §6.2). Until the template drafter can
 * classify a new wording (B09, B10), nothing on the phone can tell a code from a reference, so every
 * notification the filter keeps is stored with **every digit outside an amount masked** as `•`. No way of
 * spacing, splitting or decorating a code can get one past it, since no digit is judged by its neighbours.
 * One that also carries an OTP word (advice included) is marked *maybe OTP*, for the drafter to judge
 * first. From B10 a new wording is masked like this only for the classifier, and a transaction is stored
 * with its numbers.
 *
 * A digit is anything Unicode reads as one, the way the filter does after NFKC (fullwidth, Arabic-Indic,
 * circled, mathematical). Amounts are left: a decimal amount ("1,234.56", "50.00", "12,90") or the number
 * straight after a currency ("RM 2,500", "THB 2500", "£40"). Short numbers go too until B10: "7-ELEVEN"
 * reads "•-ELEVEN", "9:47 PM" reads "•:•• PM"; the event's time is stored apart. It reads the text once.
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

        /** The longest number read as an amount; anything longer is a number to mask. */
        private const val MAX_AMOUNT = 24

        fun default(): OtpMask = OtpMask(OtpFilter.parse(OtpFilter.load()))

        private enum class Kind { DIGIT, OTHER_DIGIT, POINT, OTHER }

        private fun kind(cp: Int): Kind =
            when {
                Character.isDigit(cp) -> Kind.DIGIT
                Character.getType(cp).toByte() == Character.OTHER_NUMBER && nfkcDigits(cp) -> Kind.OTHER_DIGIT
                cp == '.'.code || cp == ','.code -> Kind.POINT
                else -> Kind.OTHER
            }

        /** Circled, parenthesised and similar numbers: digits once NFKC has read them ("①" is "1"). */
        private fun nfkcDigits(cp: Int): Boolean {
            val n = Normalizer.normalize(String(Character.toChars(cp)), Normalizer.Form.NFKC)
            return n.isNotEmpty() && n.all { it in '0'..'9' || it == '(' || it == ')' || it == '.' } && n.any { it.isDigit() }
        }

        /** Every digit outside an amount becomes `•`. */
        internal fun maskDigits(s: String): String {
            val cps = s.codePoints().toArray()
            val kinds = Array(cps.size) { kind(cps[it]) }
            fun digit(i: Int) = kinds[i] == Kind.DIGIT || kinds[i] == Kind.OTHER_DIGIT
            if (cps.indices.none(::digit)) return s
            val masked = BooleanArray(cps.size) { digit(it) }
            // tokens: digits with the dots and commas between them; an amount among them keeps its digits
            var t = 0
            while (t < cps.size) {
                if (!digit(t)) {
                    t++
                    continue
                }
                var u = t
                while (u + 1 < cps.size && (digit(u + 1) || (kinds[u + 1] == Kind.POINT && u + 2 < cps.size && digit(u + 2)))) u++
                val token = shape(cps, kinds, t, u)
                if (isDecimalAmount(token) || (afterCurrency(cps, t) && isCurrencyAmount(token))) {
                    for (n in t..u) masked[n] = false
                }
                t = u + 1
            }
            val out = StringBuilder(s.length)
            for (n in cps.indices) if (masked[n]) out.append(MASK) else out.appendCodePoint(cps[n])
            return out.toString()
        }

        /** A token's shape: `d` for a digit, `.` and `,` as they are. Null when it's too long to be an amount. */
        private fun shape(cps: IntArray, kinds: Array<Kind>, from: Int, to: Int): String? {
            if (to - from + 1 > MAX_AMOUNT) return null
            return buildString {
                for (n in from..to) append(if (kinds[n] == Kind.DIGIT) 'd' else if (kinds[n] == Kind.POINT) cps[n].toChar() else 'x')
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

        /** A currency code or sign just before the number, with up to three spaces between. */
        private fun afterCurrency(cps: IntArray, start: Int): Boolean {
            var k = start - 1
            var spaces = 0
            while (k >= 0 && (Character.isWhitespace(cps[k]) || Character.isSpaceChar(cps[k]))) {
                k--
                spaces++
            }
            if (spaces > 3 || k < 0) return false
            // a currency sign: $ £ € ¥ ฿ ₹ ₩ ₫ …
            if (Character.getType(cps[k]).toByte() == Character.CURRENCY_SYMBOL) return true
            val letters = StringBuilder()
            while (k >= 0 && Character.isLetter(cps[k]) && letters.length < 4) {
                letters.insert(0, Character.toChars(Character.toLowerCase(cps[k])))
                k--
            }
            if (k >= 0 && Character.isLetter(cps[k])) return false
            return letters.toString() in CURRENCIES
        }

        /** Ringgit, and the currencies a Malaysian's cards and wallets most often show. */
        private val CURRENCIES =
            setOf(
                "rm", "myr", "usd", "sgd", "eur", "gbp", "jpy", "cny", "rmb", "hkd", "twd", "thb", "idr", "php",
                "vnd", "krw", "inr", "aud", "nzd", "chf", "cad", "aed", "sar", "bnd",
            )
    }
}
