package io.github.ztsia.sen.core

import java.text.Normalizer
import java.util.Locale

/**
 * Drops one-time passwords, TACs and the like before anything is stored (spec §6.2, D86, D115). It runs
 * after the chosen-apps check, in native code. Since Android 15 the system hides most OTP notifications
 * from listeners; this is the second line, and holds on its own.
 *
 * It weighs evidence, sentence by sentence (the title and each text are separate, so a title never runs
 * into the text after it):
 * 1. **Advice sentences are set aside**: "Never share your PIN", "Jangan kongsi TAC anda". A keyword in
 *    advice isn't evidence, since payments carry the same footers. But advice that points at a code in
 *    this message ("Do not share this code"), or holds a code itself, is.
 * 2. **A strong keyword** (OTP, TAC, verification code, kod pengesahan… in otp-keywords.txt) **and a code
 *    anywhere in the rest** make an OTP, whatever words sit between them.
 * 3. **A weak keyword** (code, kod, password, and PIN when it reads as a PIN: "your PIN", "PIN is")
 *    and a code in the **same sentence** make an OTP, outside a promotion. A reference's own code isn't
 *    a code at all ("reference code", "auth code", "kod rujukan"), so it never qualifies.
 *
 * A code is 4 to 8 digits, maybe grouped by single spaces or hyphens ("123 456"), maybe after `#` or a
 * letter and hyphen ("G-482910"), maybe run straight on from its keyword ("OTP123456"). A number isn't a
 * code when it's an amount, a date (09-10-2026, or a year after its month) or a time, longer than 8 digits in all
 * (a phone number), masked (••1234), or when a reference, approval, booking, account or similar word
 * comes just before it.
 *
 * When the evidence is real it drops: storing an OTP breaks a non-negotiable, while a dropped payment is
 * logged (time and app, never text) and shows as a gap at the next balance check (spec §7).
 */
class OtpFilter(strong: List<String>, weak: List<String> = WEAK) {
    private val strongWords = Regex("(?<![\\p{L}\\p{N}])(?:${alternation(strong)})(?![\\p{L}])")

    /** The weak keywords other than PIN, which has its own rule (PIN_AS_PIN). */
    private val weakAny =
        Regex("(?<![\\p{L}\\p{N}])(?:${alternation(weak.filter { it != "pin" })})(?![\\p{L}])")

    fun isOtp(vararg parts: String?): Boolean {
        val sentences = parts.filterNotNull().flatMap(::sentences)
        if (sentences.isEmpty()) return false
        val (advice, rest) = sentences.partition { ADVICE.containsMatchIn(it) }
        // advice that holds a code, or points at one ("share this code"): the message carries a code
        if (advice.any { codes(it).isNotEmpty() }) return true
        val pointed = advice.any { POINTS_AT_A_CODE.containsMatchIn(it) }
        val found = rest.flatMap { s -> codes(s).map { s to it } }
        if (found.isEmpty()) return false
        if (pointed || rest.any { strongWords.containsMatchIn(it) }) return true
        // weak keywords: joined straight to their code, in the same sentence, outside a promotion
        if (sentences.any { PROMO.containsMatchIn(it) }) return false
        return found.any { (s, _) -> weakInSentence(s) }
    }

    /**
     * A weak keyword and a code in the same sentence. PIN must look like a PIN, not part of a name:
     * "your PIN", "PIN is", "PIN:", "PIN for…" ("TAN PIN HUI" isn't one).
     */
    private fun weakInSentence(s: String): Boolean = weakAny.containsMatchIn(s) || PIN_AS_PIN.containsMatchIn(s)

    /** Where each code is in a sentence. */
    private fun codes(s: String): List<IntRange> =
        CANDIDATE.findAll(s).mapNotNull { m ->
            val digits = m.value.count { it.isDigit() }
            if (digits !in 4..8) return@mapNotNull null
            // a date written with hyphens: 09-10-2026, 9-10-26
            if (isDate(m.value)) return@mapNotNull null
            val start = m.range.first
            val prev = s.getOrNull(start - 1)
            // straight after letters: only a keyword's own code ("otp123456")
            if (prev != null && prev.isLetter() && !GLUED.containsMatchIn(s.substring(0, start))) return@mapNotNull null
            if (NOT_A_CODE_BEFORE.containsMatchIn(s.substring(maxOf(0, start - 32), start))) return@mapNotNull null
            if (TIME_AFTER.matchesAt(s, m.range.last + 1)) return@mapNotNull null
            m.range
        }.toList()

    companion object {
        private const val RESOURCE = "/sen/otp-keywords.txt"

        /** Keywords that count only with a code in the same sentence, outside a promotion. */
        val WEAK = listOf("pin", "nombor pin", "kod", "code", "password", "kata laluan")

        /** PIN as a PIN, not a syllable of a name. */
        private val PIN_AS_PIN =
            Regex(
                "(?<![\\p{L}])((your|the|new|a|card|one-time|one time|atm|nombor) pin|pin (is|ialah|adalah|for|untuk|anda|number|no\\.?)|pin:)(?![\\p{L}])",
            )

        /** 4 to 8 digits, maybe grouped by single spaces or hyphens, maybe after # or a letter and hyphen. */
        private val CANDIDATE =
            Regex("(?<![\\p{N}•*×#])(?<!\\p{N}[.,/:])(?:#|(?<![\\p{L}])[a-z]-)?\\p{N}+(?:[ \\-]\\p{N}+)*(?![\\p{N}]|[.,]\\p{N}|[/:]\\p{N})")
        private val DATE = Regex("(\\p{N}{1,2})-(\\p{N}{1,2})-(\\p{N}{2}|\\p{N}{4})")

        /** 09-10-2026 or 10-09-26: a day and a month, either way round, then a year. "48-29-10" isn't one. */
        private fun isDate(s: String): Boolean {
            val m = DATE.matchEntire(s) ?: return false
            val (a, b) = m.groupValues[1].toInt() to m.groupValues[2].toInt()
            return (a in 1..31 && b in 1..12) || (a in 1..12 && b in 1..31)
        }
        private val GLUED = Regex("(?<![\\p{L}\\p{N}])(otp|tac|mtac|pin)$")
        private val NOT_A_CODE_BEFORE =
            Regex(
                "(?<![\\p{L}\\p{N}])(rm|myr|usd|sgd|ref|reference|rujukan|transaksi|transaction|txn|invoice|invois|order|" +
                    "booking|tempahan|account|akaun|acc|a/c|ending|ends|approval|kelulusan|receipt|resit|merchant|peniaga|" +
                    "terminal|store|kedai|member|ahli|card|kad|trace|bil|bill|id|tel|phone|call|hubungi|postcode|poskod|" +
                    // a year after its month: "9 Oct 2026"
                    "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|" +
                    "september|october|november|december|januari|februari|mac|mei|julai|ogos|okt|oktober|dis|disember)" +
                    "(?:[\\s:#.-]+(no\\.?|number|nombor))?[\\s:#.-]*$|" +
                    // a reference's own code: "approval code 482910", "kod rujukan: 48291077"
                    "(?<![\\p{L}\\p{N}])((reference|ref|approval|auth|authorisation|authorization|payment|txn|booking|order|confirmation|tracking|transaction|merchant)[\\s-]+code|" +
                    "kod[\\s-]+(rujukan|kelulusan|tempahan|transaksi))(?:\\s+(is|ialah|adalah))?[\\s:#.-]*$",
            )
        private val TIME_AFTER = Regex("[ ]?(am|pm|h|hrs|min|mins|minutes|minit|saat|seconds|sec)(?![\\p{L}])")

        /** A sentence of advice: don't share, we never ask. */
        private val ADVICE =
            Regex(
                // don't share, we never ask
                "(?<![\\p{L}])(never|do not|don't|dont|jangan|usah|will not|won't|tidak akan|tidak pernah)(?![\\p{L}]).*" +
                    "(?<![\\p{L}])(share|disclose|reveal|give|tell|ask|send|kongsi|kongsikan|dedahkan|beri|berikan|minta|meminta)(?![\\p{L}])|" +
                    // keep it safe: "Keep your OTP and TAC confidential", "Protect your PIN", "Rahsiakan TAC anda"
                    "(?<![\\p{L}])(keep|protect|safeguard|guard|rahsiakan|lindungi|jaga|jagalah)(?![\\p{L}]).*" +
                    "(?<![\\p{L}])(pin|otp|tac|password|passcode|code|codes|details|kod|kata laluan|maklumat)(?![\\p{L}])",
            )

        /** Advice that points at a code in this message. */
        private val POINTS_AT_A_CODE =
            Regex(
                "(?<![\\p{L}])((this|that|the above) (code|otp|tac|pin|passcode|password)|" +
                    "(share|kongsi\\w*|dedahkan|beri\\w*) (it|this|ini)|(kod|otp|tac|pin|kata laluan) (ini|tersebut))(?![\\p{L}])",
            )

        /** A code with a qualifier is somebody's reference, not a secret. */
        private val QUALIFIED =
            Regex(
                "(?<![\\p{L}])(reference|ref|approval|auth|authorisation|authorization|payment|txn|transaction|promo|promotion|promotional|voucher|coupon|discount|booking|" +
                    "confirmation|tracking|referral|invite|gift|order|redemption|rujukan|kelulusan|promosi|baucar|" +
                    "diskaun|tempahan)[\\s-]+(code|kod|number|no\\.?|pin)(?![\\p{L}])[^\\p{N}]*$|" +
                    "(?<![\\p{L}])(code|kod)[\\s-]+(rujukan|kelulusan|promo|promosi|baucar|diskaun|tempahan)(?![\\p{L}])",
            )


        /** A promotion: a code in it is for a discount. */
        private val PROMO =
            Regex(
                "(?<![\\p{L}])(promo|promosi|promotion|voucher|baucar|cashback|discount|diskaun|coupon|kupon|reward|" +
                    "ganjaran|checkout|sale|jualan|offer|tawaran|% off)(?![\\p{L}])",
            )

        /** The strong keywords kept in the repo, `src/main/resources/sen/otp-keywords.txt`. */
        fun default(): OtpFilter = OtpFilter(parse(load()))

        fun load(): String =
            checkNotNull(OtpFilter::class.java.getResourceAsStream(RESOURCE)) { "missing $RESOURCE" }
                .use { it.readBytes().toString(Charsets.UTF_8) }

        fun parse(list: String): List<String> =
            list.lineSequence().map { it.substringBefore('#').trim() }.filter { it.isNotEmpty() }.toList()

        private fun alternation(phrases: List<String>): String =
            phrases.map { p ->
                val words = normalise(p).split(Regex("[\\s-]+")).filter { it.isNotEmpty() }
                require(words.isNotEmpty()) { "empty phrase" }
                words.joinToString("[\\s-]*") { Regex.escape(it) }
            }.sortedByDescending { it.length }.joinToString("|")

        /**
         * A part's sentences, normalised: NFKC, no zero-width characters, lower case, single spaces. A
         * sentence ends at a full stop, ! ? ; or a line break, followed by a space or the end; not at a
         * decimal point ("RM50.00") or "No.".
         */
        fun sentences(part: String): List<String> {
            val clean =
                Normalizer.normalize(part, Normalizer.Form.NFKC)
                    .replace(Regex("[\\u200B-\\u200D\\u2060\\uFEFF\\u00AD]"), "")
                    .replace('\u2019', '\'')
                    .replace('\u2018', '\'')
                    .lowercase(Locale.ROOT)
            val out = mutableListOf<String>()
            val cur = StringBuilder()
            fun end() {
                val t = cur.toString().replace(Regex("\\s+"), " ").trim()
                if (t.isNotEmpty()) out += t
                cur.clear()
            }
            for ((i, c) in clean.withIndex()) {
                if (c == '\n') {
                    end()
                    continue
                }
                cur.append(c)
                val next = clean.getOrNull(i + 1)
                if (c in ".!?;" && (next == null || next.isWhitespace())) {
                    // "No. 482910" goes on: it's an abbreviation, not the end of a sentence
                    if (c == '.' && Regex("(?<![\\p{L}])no\\.$").containsMatchIn(cur)) continue
                    end()
                }
            }
            end()
            return out
        }
    }
}
