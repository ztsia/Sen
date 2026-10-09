import io.github.ztsia.sen.core.*
import java.text.Normalizer
import java.io.File
import kotlin.test.*

/**
 * QA run 7 (scoped: the capture path, spec §6.2, D86, D115, D116, D119). Cases are acceptance.md's
 * R7-AC criteria, written from the docs before any source was opened. Cases marked "(after reading)"
 * aim at what the source does. Every notification is made up.
 *
 *   gradle -p apps/shell/core jar && gradle -p qa/B02/core-probe test --tests Probe7
 */
class Probe7 {
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"
    private val grab = "com.grabtaxi.passenger"
    private val chosen = setOf(ryt, grab)
    private var n = 0L

    private fun posted(title: String?, text: String?, big: String? = null, pkg: String = ryt, key: String? = null, w: Long? = null, channel: String? = "c", summary: Boolean = false, ongoing: Boolean = false) =
        Posted(pkg, key ?: "k${++n}", channel, 1_000L + n, w ?: (1_000L + n), title, text, big, summary, ongoing)

    private fun decide(p: Posted, ch: Set<String> = chosen, channels: Set<ChannelRef> = emptySet()): Decision = gate.decide(p, ch, channels)

    private fun keep(title: String?, text: String?, big: String? = null, pkg: String = ryt): RawEvent =
        assertIs<Decision.Keep>(decide(posted(title, text, big, pkg)), "kept: $title | $text | $big").event

    /** Bullets, and any spaces, dashes, dots or brackets inside a masked run, squashed to one bullet. */
    private fun squash(s: String?): String? = s?.replace(Regex("•(?:[\\s\\-.()\\u00A0]*•)*"), "•")

    /** The digits of s (NFKC, invisible removed), as one string. */
    private fun digitsOf(s: String?): String {
        if (s == null) return ""
        val t = Normalizer.normalize(s, Normalizer.Form.NFKC).replace(Regex("[\\p{Mn}\\p{Me}\\p{Cf}]"), "")
        return t.filter { it.isDigit() }.map { Character.getNumericValue(it).toString() }.joinToString("")
    }

    /** Four consecutive digits of the code, in order, among the digits of the stored text. */
    private fun leaks(code: String, e: RawEvent): Boolean =
        listOf(e.title, e.text, e.bigText).any { s -> (0..code.length - 4).any { i -> digitsOf(s).contains(code.substring(i, i + 4)) } }

    private fun safe(code: String, title: String?, text: String?, big: String? = null): Decision {
        val d = decide(posted(title, text, big))
        if (d is Decision.Keep) assertFalse(leaks(code, d.event), "code readable in: ${d.event.title} | ${d.event.text} | ${d.event.bigText}")
        return d
    }

    // ---- R7-AC-1 .. 5: the gate
    @Test fun ac1_unchosen_everything() {
        for ((t, x, s, o) in listOf(
            listOf("Card payment completed", "RM12.90 paid at KEDAI MAJU", false, false),
            listOf("Ryt", "Your TAC is 482913", false, false),
            listOf("Card payment completed", "RM12.90 paid at KEDAI MAJU", true, false),
            listOf("Card payment completed", "RM12.90 paid at KEDAI MAJU", false, true),
            listOf(null, null, false, false),
        )) {
            val d = decide(posted(t as String?, x as String?, pkg = "com.example.other", summary = s as Boolean, ongoing = o as Boolean))
            assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), d)
        }
        assertIs<Decision.Keep>(decide(posted("Card payment completed", "RM12.90 paid at KEDAI MAJU")))
    }

    @Test fun ac2_exact_package() {
        for (p in listOf("MY.RYTBANK.APP", "my.rytbank.app.debug", "my.rytbank.apps", "my.rytbank", " my.rytbank.app", "my.rytbank.app ", "", "my.rytbank.app\u0000", "my.rytbank.app\n", "my.rytbаnk.app" /* Cyrillic a */))
            assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), decide(posted("T", "RM1.00 paid", pkg = p)), "[$p]")
        assertIs<Decision.Keep>(decide(posted("T", "RM1.00 paid", pkg = "my.rytbank.app")))
    }

    @Test fun ac3_empty_then_changing_chosen() {
        val p1 = posted("Card payment completed", "RM12.90 paid at KEDAI MAJU", w = 5_000)
        assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), decide(p1, ch = emptySet()))
        assertIs<Decision.Keep>(decide(p1.copy(whenMillis = 6_000), ch = setOf(ryt)))
        assertEquals(Decision.Drop(DropReason.NOT_CHOSEN), decide(p1.copy(whenMillis = 7_000), ch = emptySet()))
    }

    @Test fun ac4_summary_and_ongoing() {
        assertEquals(Decision.Drop(DropReason.GROUP_SUMMARY), decide(posted("Card payment completed", "RM12.90 paid", summary = true)))
        assertEquals(Decision.Drop(DropReason.ONGOING), decide(posted("Card payment completed", "RM12.90 paid", ongoing = true)))
        assertIs<Decision.Keep>(decide(posted("Card payment completed", "RM12.90 paid")))
    }

    @Test fun ac5_channel_list() {
        val list = setOf(ChannelRef(ryt, "promos"))
        assertEquals(Decision.Drop(DropReason.CHANNEL), decide(posted("T", "RM12.90 paid", channel = "promos"), channels = list))
        assertIs<Decision.Keep>(decide(posted("T", "RM12.90 paid", channel = "payments"), channels = list))
        assertIs<Decision.Keep>(decide(posted("T", "RM12.90 paid", pkg = grab, channel = "promos"), channels = list))
        assertIs<Decision.Keep>(decide(posted("T", "RM12.90 paid", channel = "promos")))
        assertIs<Decision.Keep>(decide(posted("T", "RM12.90 paid", channel = null), channels = list))
    }

    // ---- R7-AC-6: OTP / TAC, new wordings
    private val otps = listOf(
        Triple("Ryt Bank", "Your TAC for the RM250.00 transfer is 739204", "739204"),
        Triple("Ryt Bank", "Gunakan 739204 sebagai kod pengesahan anda", "739204"),
        Triple("OTP", "739 204", "739204"),
        Triple("Ryt Bank", "739204 is your one-time password", "739204"),
        Triple("Ryt Bank", "Kod TAC anda: 739204. Sah untuk 5 minit.", "739204"),
        Triple("Grab", "Enter 739204 to confirm your login to Grab.", "739204"),
        Triple("Ryt Bank", "OTP 7392 for your card activation", "7392"),
        Triple("Ryt Bank", "Your verification code is 739-204", "739204"),
        Triple("Ryt Bank", "TAC 739204 untuk pemindahan RM100.00 kepada ALI", "739204"),
        Triple("Verification", "Use code 739204 to continue", "739204"),
        Triple("Ryt Bank", "Your one time pin is 739204", "739204"),
        Triple("Ryt Bank", "Pengesahan: 739204 (jangan kongsi)", "739204"),
    )

    @Test fun ac6_otps_dropped_or_masked() {
        val kept = mutableListOf<String>()
        for ((t, x, code) in otps) {
            val d = safe(code, t, x)
            if (d is Decision.Keep) kept += x
        }
        println("AC-6: ${otps.size - kept.size} dropped, ${kept.size} kept masked: $kept")
        // the clear ones must be dropped outright (no doubt in the wording)
        for (i in listOf(0, 1, 2, 3, 4, 7, 8, 10)) assertEquals(Decision.Drop(DropReason.OTP), decide(posted(otps[i].first, otps[i].second)), otps[i].second)
    }

    private val payments = listOf(
        "RM12.90 paid at KEDAI KOPI using your Main Account. Ref 20261009001. Never share your TAC.",
        "You've sent RM42.50 to TAN WEI MING on 12/9/2026, 9:47 PM (GMT+8) using your Main Account.",
        "Your payment of RM88.00 to TM UNIFI, account 0123456789, was successful. Do not share your PIN with anyone.",
        "Bayaran RM15.30 di KEDAI RUNCIT 2241 berjaya. Jangan kongsi TAC anda.",
        "GrabFood order 1234-5678 delivered. RM23.40 charged to GrabPay.",
        "You received RM150.00 from LIM on 09-10-2026. Invoice 20261009.",
        "RM5.00 top-up to your TNG eWallet. Reference 7392041. Never share your TAC with anyone.",
        "Card ending 4829 charged RM60.00 at ZUS COFFEE. Call 03-12345678 if not you.",
        "Pembayaran RM77.70 kepada SHOPEE berjaya. No. rujukan 73920411.",
        "Paid RM1,234.50 at MOBILE SHOP. Balance RM 5,000.00.",
        "Transfer of RM300.00 to Ahmad completed. Do not share this with anyone.",
        "Store no. 48291 charged RM9.90. Auth code 482911. Keep your OTP confidential.",
    )

    @Test fun ac6_twin_payments_kept() {
        val dropped = payments.filter { decide(posted("Card payment completed", it)) is Decision.Drop }
        println("AC-6 twin: ${payments.size - dropped.size} kept; dropped: $dropped")
        assertTrue(dropped.size <= 1, "payments dropped: $dropped")
    }

    // ---- R7-AC-8 .. 12: the mask
    private fun stored(text: String, title: String? = "Notice", big: String? = null) = keep(title, text, big)

    @Test fun ac8_any_wording_masked() {
        assertEquals("Your reference number is •", squash(stored("Your reference number is 48291375").text))
        assertEquals("Order • has been packed", squash(stored("Order 5829 4417 has been packed").text))
        assertEquals("Confirmation •", squash(stored("Confirmation 20261009-4417").text))
        assertEquals("Paid RM12.90 to KEDAI KOPI. Receipt •", squash(stored("Paid RM12.90 to KEDAI KOPI. Receipt 000412873").text))
        assertEquals("Use • to approve", squash(stored("Use 482913 to approve").text))
        // twin: short numbers and times untouched
        val same = "Paid RM12.90 at 7 stores, 3 items, 9:47 PM, No. 12"
        assertEquals(same, stored(same).text)
    }

    @Test fun ac9_amounts_left() {
        for (t in listOf("RM12.90", "RM 1,234.50", "MYR 5000.00", "RM1234", "rm 99.00", "Balance 1,234.50", "Paid RM12.90 at X", "Total: RM 250", "RM12,345.67 sent"))
            assertEquals(t, stored(t).text, t)
        assertEquals("Paid RM12.90 ref •", squash(stored("Paid RM12.90 ref 482913").text))
        assertEquals("RM12.90 •", squash(stored("RM12.90 482913").text))
        assertFalse(leaks("482913", stored("Ref 482.913")), "three decimals is not money")
        assertFalse(leaks("482913", stored("Balance RM 1,234.50 482913")))
    }

    private val forms = listOf(
        "４８２９１３", "٤٨٢٩١٣", "४८२९१३", "①②③④⑤⑥", "𝟒𝟖𝟐𝟗𝟏𝟑", "482 913", "482-913", "482.913", "(482) 913",
        "4 8 2 9 1 3", "4‑8‑2‑9‑1‑3", "482 913", "482 913", "482　913", "482\t913", "482–913", "482·913",
        "482​913", "482‍913", "482­913", "482﻿913", "482‎913", "482‏913", "482⁠913",
        // run 6 #11, #10
        "482    913", "482\n913", "482   \t 913", "4️⃣8️⃣2️⃣9️⃣1️⃣3️⃣", "4︎8︎2︎9︎1︎3", "482͏913", "482•913", "48:29:13", "482́913", "4/8/2/9/1/3",
        "⁴⁸²⁹¹³", "₄₈₂₉₁₃", "४ ८ २ ९ १ ३", "4​8​2​9​1​3", "48 29 13", "4829 13", "48 2913",
    )

    @Test fun ac10_digit_forms() {
        val leaked = mutableListOf<String>()
        for (f in forms) {
            val e = keep("Status", "Your booking status: $f")
            if (leaks("482913", e)) leaked += "[" + f.map { "U+%04X".format(it.code) }.joinToString(" ") + "] -> ${e.text}"
        }
        assertTrue(leaked.isEmpty(), "readable: ${leaked.joinToString("\n")}")
        // twin: words and commas end a run
        for (t in listOf("Buy 12 apples and 34 pears", "Room 12, level 34", "Order 12\nShip 34", "Qty 12, 34 and 56")) assertEquals(t, stored(t).text, t)
    }

    @Test fun ac11_everything_else_verbatim() {
        val raw = " Lead  double\tTab\nLine2\r\nCRLF é ​zw 👍 👨‍👩‍👧 椰 it’s ‏ RTL \uD800 lone nb sp ref 48291 end "
        val e = stored(raw, title = " Title  ")
        assertEquals(raw.replace("48291", "•"), squash(e.text))
        assertEquals(" Title  ", e.title)
        // twin: the reference itself is masked
        assertFalse(e.text!!.contains("48291"))
    }

    @Test fun ac12_maybe_otp() {
        assertTrue(stored("Paid RM12.90. Ref 48291375. Never share your TAC.").maybeOtp)      // a
        assertFalse(stored("Paid RM12.90. Ref 48291375.").maybeOtp)                              // b
        assertTrue(keep("Your OTP", "Paid RM12.90. Ref 48291375.").maybeOtp)                    // c
        assertFalse(stored("Paid RM12.90. Never share your TAC.").maybeOtp)                      // d (my reading)
        assertTrue(keep("Ryt", "Paid RM12.90", "Ref 48291375. Never share your TAC.").maybeOtp) // expanded text
        // false positives of the hint (record): words that merely contain tac / otp / pin
        println("hint on 'Starbucks Tacoma ref 482913': ${stored("Starbucks Tacoma ref 482913").maybeOtp}; 'Shopping ref 482913': ${stored("Shopping ref 482913").maybeOtp}")
    }

    // ---- R7-AC-13..15, 18, 32: keys and fields
    @Test fun ac13_key_from_masked_text() {
        val a = keep("Ryt", "Paid RM12.90. Ref 48291375.").dedupeKey
        val p = posted("Ryt", "Paid RM12.90. Ref 48291375.", key = "K", w = 9_000)
        val d1 = (decide(p) as Decision.Keep).event.dedupeKey
        val d2 = (decide(p.copy(text = "Paid RM12.90. Ref 99887766.")) as Decision.Keep).event.dedupeKey
        assertEquals(d1, d2)
        assertNotEquals(d1, (decide(p.copy(whenMillis = 9_001)) as Decision.Keep).event.dedupeKey)
        assertNotEquals(d1, (decide(p.copy(text = "Paid RM13.90. Ref 48291375.")) as Decision.Keep).event.dedupeKey)
        assertNotEquals(d1, (decide(p.copy(text = "Paid RM12.90. Rev 48291375.")) as Decision.Keep).event.dedupeKey)
        assertNotEquals(a, "")
    }

    @Test fun ac14_field_boundaries() {
        val base = posted("x", "y", key = "K", w = 9_000)
        val keys = listOf(Triple("A", "BC", ""), Triple("AB", "C", ""), Triple("A", "B", "C"), Triple("", "ABC", ""), Triple("A", "", "BC"))
            .map { (t, x, b) -> (decide(base.copy(title = t, text = x, bigText = b.ifEmpty { null })) as Decision.Keep).event.dedupeKey }
        assertEquals(5, keys.toSet().size)
    }

    @Test fun ac15_replay_rewrite_later() {
        val p = posted("Ryt", "Paid RM12.90 at KEDAI", key = "K", w = 9_000)
        val k = { x: Posted -> (decide(x) as Decision.Keep).event.dedupeKey }
        val a = k(p)
        assertEquals(a, k(p))
        assertNotEquals(a, k(p.copy(text = "Paid RM12.90 at KEDAI MAJU")))
        assertNotEquals(a, k(p.copy(whenMillis = 9_000 + 180_000)))
    }

    @Test fun ac18_nullable_fields() {
        val e = (decide(posted(null, "Paid RM12.90", w = 7)) as Decision.Keep).event
        assertEquals(null, e.title); assertEquals(null, e.bigText); assertEquals("c", e.channel)
        assertEquals(7, e.whenMillis)
        assertEquals(Decision.Drop(DropReason.EMPTY), decide(posted(null, "  ", "")))
    }

    @Test fun ac32_no_when() {
        val p = posted("Ryt", "Paid RM12.90", key = "K", w = 0)
        val a = (decide(p) as Decision.Keep).event
        val b = (decide(p) as Decision.Keep).event
        println("AC-32: when_ms stored = ${a.whenMillis} (postTime ${p.postTime}); replay same key: ${a.dedupeKey == b.dedupeKey}")
        assertEquals(a.dedupeKey, b.dedupeKey)
    }

    // ---- R7-AC-16: hostile input
    private fun timed(label: String, p: Posted): Decision {
        val t0 = System.nanoTime()
        val d = try { decide(p) } catch (e: Throwable) { fail("$label threw ${e::class.simpleName}") }
        val ms = (System.nanoTime() - t0) / 1_000_000
        println("AC-16 $label: ${if (d is Decision.Keep) "Keep(maybeOtp=${d.event.maybeOtp})" else d.toString()} in $ms ms")
        assertTrue(ms < 2_000, "$label took $ms ms")
        if (d is Decision.Keep) for (s in listOf(d.event.title, d.event.text, d.event.bigText)) assertFalse(Regex("[0-9]{4}").containsMatchIn(s.orEmpty().replace("RM12.90", "")), "$label: digits in storage")
        return d
    }

    @Test fun ac16_hostile() {
        timed("1.6MB", posted("Ryt", "Paid RM12.90 ref " + "x".repeat(1_600_000)))
        timed("200k digits", posted("Ryt", "ref " + "7".repeat(200_000)))
        timed("200k digits spaced", posted("Ryt", "ref " + "7 ".repeat(100_000)))
        timed("200k ZWSP", posted("Ryt", "Paid RM12.90 ref 4829" + "​".repeat(200_000) + "1375"))
        timed("NULs", posted("Ryt", "\u0000".repeat(50_000) + "ref 48291375"))
        timed("lone surrogates", posted("\uD800𐀀\uDC00 ref 48291375", "Paid RM12.90"))
        timed("nested brackets", posted("Ryt", "(".repeat(1_000) + "482913" + ")".repeat(1_000)))
        timed("1.6MB with TAC word", posted("Ryt", "Never share your TAC. " + "word ".repeat(300_000) + "482913"))
        timed("many sentences", posted("Ryt", "Paid. ".repeat(20_000) + "ref 482913"))
        timed("200k joiners", posted("Ryt", "4" + " -".repeat(100_000) + "8"))
        timed("long OTP", posted("Ryt", "Your TAC is 482913. " + "a".repeat(1_000_000)))
        val after = keep("Ryt", "Paid RM12.90 at KEDAI")
        assertEquals("Paid RM12.90 at KEDAI", after.text)
    }

    // ---- (after reading) probes aimed at the source
    @Test fun after_decimal_shaped_code() {
        // PLAIN_DECIMAL d+[.,]dd: any number with exactly two decimals is "an amount", whatever its length
        val e = stored("Ref 4829.13")
        println("after_decimal_shaped_code: ${e.text}")
        val e2 = stored("Ref 48291375.99")
        println("after_decimal_shaped_code long: ${e2.text}")
    }

    @Test fun after_currency_whole_number() {
        // the number straight after a currency is left, any length up to 24
        for (t in listOf("Use RM 482913 now", "Your pass is RM482913", "SGD 4829 1375", "USD 48291375")) println("after_currency: $t -> ${stored(t).text}")
    }

    @Test fun after_comma_space_groups() {
        for (t in listOf("Code 482, 913", "Number 4,8,2,9,1,3", "Number 482 . 913", "Num 482 - - - 913", "Num 48 - 29 - 13", "Num 4829 13", "Num 482/913", "Num 482_913", "Num 482 x 913", "Num 482 xx 913")) {
            val e = stored(t)
            println("after_groups: ${leaks("482913", e)}  $t -> ${e.text}")
        }
    }

    @Test fun after_time_and_date_overmask() {
        for (t in listOf("Paid on 12/9/2026 at 9:47:05 PM", "Paid RM12.90 on 09-10-2026", "Posted 2026-10-09T21:47:05", "Ref 12 34 56"))
            println("after_overmask: $t -> ${stored(t).text}")
    }

    @Test fun after_title_in_big_text_and_mark() {
        val e = keep("Ryt", "RM12.90 paid", "RM12.90 paid at KEDAI. Ref 48291375. Do not share your OTP.")
        assertTrue(e.maybeOtp); assertFalse(leaks("48291375", e))
    }

    @Test fun after_word_hint_substrings() {
        for (t in listOf("Starbucks Tacoma ref 482913", "Shopping at TACTILE ref 482913", "Sepinning 482913", "Cakap kod 482913", "Spin class ref 482913", "Payment verified ref 482913")) {
            val d = decide(posted("Notice", t))
            println("after_hint: ${if (d is Decision.Keep) d.event.maybeOtp else d}  $t")
        }
    }

    @Test fun after_unread_branch_marks() {
        // run 6 #12: with the filter throwing, kept masked AND marked, even with no OTP word
        val g = CaptureGate(isOtp = { _, _, _ -> throw StackOverflowError() })
        val d = g.decide(posted("Ryt", "Paid RM12.90 ref 48291375"), chosen, emptySet())
        val e = assertIs<Decision.Keep>(d).event
        assertTrue(e.maybeOtp); assertFalse(leaks("48291375", e))
        val g2 = CaptureGate(isOtp = { _, _, _ -> throw IllegalStateException("icu") })
        assertTrue(assertIs<Decision.Keep>(g2.decide(posted("Ryt", "Paid RM12.90 ref 48291375"), chosen, emptySet())).event.maybeOtp)
    }

    // ---- (after reading) strong keyword with gaps the mask doesn't join and the filter doesn't group
    @Test fun after_strong_keyword_odd_gaps() {
        val readable = mutableListOf<String>()
        for (f in listOf("482, 913", "482 , 913", "482 - - 913", "4 - - 8 - - 2 - - 9 - - 1 - - 3", "48, 29, 13", "482. 913", "482\u00A0,\u00A0913", "482 / / 913", "482 xx 913", "4, 8, 2, 9, 1, 3", "482 ,913", "482,, 913")) {
            val d = decide(posted("Ryt Bank", "Your TAC is $f"))
            val state = when (d) { is Decision.Drop -> "dropped"; is Decision.Keep -> if (leaks("482913", d.event)) "READABLE ${d.event.text} maybe=${d.event.maybeOtp}" else "masked" }
            println("odd_gaps [$f] -> $state")
            if (state.startsWith("READABLE")) readable += f
        }
        assertTrue(readable.isEmpty(), "readable: $readable")
    }

    @Test fun after_scaling_many_sentences() {
        for (k in listOf(25_000, 50_000, 100_000, 200_000)) {
            val t0 = System.nanoTime()
            decide(posted("Ryt", "Paid. ".repeat(k) + "ref 482913"))
            println("scaling sentences $k: ${(System.nanoTime() - t0) / 1_000_000} ms")
        }
        for (k in listOf(1_000, 2_000, 4_000)) {  // what Android could really hold: a few KB
            val t0 = System.nanoTime()
            repeat(20) { decide(posted("Ryt", "Paid. ".repeat(k) + "ref 482913")) }
            println("scaling x20 realistic $k sentences: ${(System.nanoTime() - t0) / 20_000_000} ms each")
        }
    }

    // ---- phase 4 stand-in: the kept events as JSON lines, for QA's SQLite check of the outbox's UNIQUE key
    @Test fun dump_for_sqlite() {
        val out = System.getenv("PROBE7_OUT") ?: return
        fun j(x: String?) = if (x == null) "null" else "\"" + x.flatMap { c -> when { c == '"' -> "\\\"".toList(); c == '\\' -> "\\\\".toList(); c.code < 0x20 -> "\\u%04x".format(c.code).toList(); else -> listOf(c) } }.joinToString("") + "\""
        val lines = mutableListOf<String>()
        fun add(p: Posted) {
            val d = decide(p)
            if (d is Decision.Keep) { val e = d.event; lines += "{\"dedupe\":${j(e.dedupeKey)},\"pkg\":${j(e.packageName)},\"key\":${j(e.key)},\"when\":${e.whenMillis},\"post\":${e.postTime},\"title\":${j(e.title)},\"text\":${j(e.text)},\"big\":${j(e.bigText)},\"maybe\":${if (e.maybeOtp) 1 else 0}}" }
        }
        val pay = posted("Card payment completed", "RM12.90 paid at KEDAI KOPI. Receipt 000412873", key = "K1", w = 100_000)
        add(pay)                                              // 1 new
        add(pay)                                              // replay: no-op
        add(pay.copy(whenMillis = 100_000 + 180_000))         // second payment 3 minutes later: new
        add(pay.copy(text = "RM12.90 paid at KEDAI KOPI MAJU. Receipt 000412873")) // in-place rewrite: new
        add(pay.copy(text = "RM12.90 paid at KEDAI KOPI. Receipt 999999999"))      // only the long number differs: same key: no-op
        add(pay.copy(text = "RM13.90 paid at KEDAI KOPI. Receipt 000412873"))      // different amount: new
        add(posted("Ryt Bank", "Ref 48291375. Never share your TAC.", key = "K2", w = 200_000)) // new, marked
        for ((t, x, _) in otps) add(posted(t, x, key = "O${++n}", w = 300_000 + n))              // mostly dropped
        File(out).writeText(lines.joinToString("\n") + "\n")
    }

    /** The gate's wiring: each of the three fields it stores comes out masked (the unit tests call the mask, never the gate). */
    @Test fun after_gate_masks_every_stored_field() {
        val e = keep("Order 48291375 ready", "Your pickup number 20261009", "Details: ref 7392041 and 5829 4417")
        for (s in listOf(e.title, e.text, e.bigText)) assertFalse(Regex("[0-9]{4}").containsMatchIn(s!!), "digits in: $s")
    }

    /** R7-AC-25: the dev simulator's six fixed notifications, raw, through the real gate, against what the simulator stores. */
    @Test fun ac25_simulator_parity() {
        assertEquals("Your money is in!", keep("Your money is in!", "You've received RM42.50 from TAN WEI MING on 12/9/2026, 9:48 PM (GMT+8).").title)
        assertEquals("You've received RM42.50 from TAN WEI MING on ••/•/••••, 9:48 PM (GMT+8).", squash2(keep("Your money is in!", "You've received RM42.50 from TAN WEI MING on 12/9/2026, 9:48 PM (GMT+8).").text))
        for ((t, x) in listOf(
            "Card payment completed 👍" to "RM38.15 paid at Petron using your Main Account.",
            "DuitNow Transfer is successful!" to "You have successfully transferred RM 18.00 to LIM KAH HOE.",
            "Money Received" to "PBB. You have received a DuitNow Transfer of RM150.00 from TAN WEI MING.",
        )) assertEquals(x, keep(t, x).text)
        val m = keep("Ryt Bank", "RM50.00 transfer to TAN WEI MING: 482910. Never share your TAC.")
        assertEquals("RM50.00 transfer to TAN WEI MING: ••••••. Never share your TAC.", m.text); assertTrue(m.maybeOtp)
        assertEquals(Decision.Drop(DropReason.OTP), decide(posted("Ryt Bank", "Your TAC is 482910. Do not share it.")))
    }
    private fun squash2(s: String?) = s
}
