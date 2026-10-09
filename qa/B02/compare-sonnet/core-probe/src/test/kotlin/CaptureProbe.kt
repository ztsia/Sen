package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.fail

/**
 * QA (compare-sonnet): the capture path's pure core, driven from the acceptance criteria. Every
 * notification is made up. Failures are collected and printed together; the test fails once at the end.
 */
class CaptureProbe {
    private val gate = CaptureGate()
    private val ryt = "my.rytbank.app"
    private val chosen = setOf(ryt, "com.grabtaxi.passenger")
    private var n = 0L
    private val fails = mutableListOf<String>()
    private val notes = mutableListOf<String>()

    private fun post(
        title: String?,
        text: String?,
        big: String? = null,
        pkg: String = ryt,
        key: String? = null,
        whenMs: Long? = null,
        summary: Boolean = false,
        ongoing: Boolean = false,
        channel: String? = "tx",
    ): Decision {
        n++
        return gate.decide(
            Posted(pkg, key ?: "0|$pkg|$n|null|10001", channel, 1_757_000_000_000 + n, whenMs ?: (1_757_000_000_000 + n), title, text, big, summary, ongoing),
            chosen,
        )
    }

    private fun kept(d: Decision) = (d as? Decision.Keep)?.event

    private fun check(id: String, ok: Boolean, what: String) {
        if (!ok) fails += "$id FAIL: $what"
    }

    /** Independent oracle: after NFKC and with invisible chars removed, any 4+ digits (joined by <=3 separators) outside amounts. */
    private fun leaks(s: String?): Boolean {
        if (s == null) return false
        val t = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFKC).replace(Regex("[\\p{Cf}\\p{Mn}\\p{Me}\\uFE0F]"), "")
        val noAmounts = t.replace(Regex("(?:rm|myr)\\s?[\\d,]+(?:\\.\\d{2})?", RegexOption.IGNORE_CASE), "").replace(Regex("\\d{1,3}(?:,\\d{3})*\\.\\d{2}"), "")
        val runs = Regex("\\p{Nd}(?:[\\s\\-./]{0,3}\\p{Nd})*").findAll(noAmounts)
        return runs.any { r -> r.value.count { it.isDigit() } >= 4 }
    }

    // ---- C. the filter ----
    @Test
    fun filter() {
        val dropped =
            listOf(
                "Ryt" to "Your OTP is 482913. Do not share it.",
                "Ryt" to "Kod TAC anda ialah 731942",
                "Ryt" to "Kod pengesahan: 5521 88",
                "Ryt" to "Your TAC is 4 8 2 9 1 3",
                "Ryt" to "Your TAC is 4-8-2-9-1-3",
                "Ryt" to "Your TAC is ４８２９１３",
                "Ryt" to "Your TAC is 48​2913",
                "Ryt" to "Your TAC is ٤٨٢٩١٣",
                "Ryt" to "OTP:482913",
                "Ryt" to "Your verification code is 482913",
                "Ryt" to "OTP 482913 for RM12.90 payment at FAKE COFFEE",
                "Ryt" to "Your one-time password is 4829",
                "Ryt" to "Your PIN is 4829",
                "Ryt" to "Never share your TAC. Your TAC is 482913",
                "OTP" to "482913",
                "Ryt" to "Use code 482913 to confirm",
                "Ryt" to "Kod OTP: 482913. Jangan kongsi.",
                "Ryt" to "Your OTP: 482913 (valid 5 min)",
                "Ryt" to "OTP is 48 29 13",
            )
        for ((t, x) in dropped) {
            val d = post(t, x)
            check("AC-9/10/14/15", d is Decision.Drop && d.reason == DropReason.OTP, "should drop: [$t] $x -> $d")
        }
        // code only in expanded text
        check("AC-15", post("Ryt", "Open to see", big = "Your TAC is 482913") is Decision.Drop, "TAC in bigText only")
        check("AC-16", post("Your OTP", "482913") is Decision.Drop, "OTP in title, code in text")
        // kept
        val keptCases =
            listOf(
                "Card payment completed 👍" to "RM12.90 paid at ZUS COFFEE #4471 using your Main Account. Never share your TAC with anyone.",
                "Transfer settled" to "Reference no: 20260912345678",
                "Nice! Transfer settled!" to "You've sent RM1,234.50 on 09-10-2026, 9:47 PM to 0123456789",
                "Nice! Transfer settled!" to "You've sent RM42.50 to TAN WEI MING on 12/9/2026, 9:47 PM (GMT+8) using your Main Account.",
                "Order out" to "Your order #12345 is out for delivery",
                "Grab" to "Your driver is 2 minutes away",
                "Card" to "RM25.00 paid at SHOP using card ending 5678",
            )
        for ((t, x) in keptCases) {
            val d = post(t, x)
            check("AC-11/12/13", d is Decision.Keep, "should keep: [$t] $x -> $d")
        }
        println("dropped/kept filter checked")
    }

    // ---- D. mask ----
    @Test
    fun mask() {
        fun txt(text: String, title: String? = "Ryt") = kept(post(title, text))
        fun exp(id: String, input: String, expected: String) {
            val e = txt(input)
            check(id, e?.text == expected, "mask [$input] expected [$expected] got [${e?.text ?: "DROPPED"}]")
        }
        exp("AC-18", "Card ending 5678 used for RM25.00 at SHOP, ref 998877", "Card ending •••• used for RM25.00 at SHOP, ref ••••••")
        exp("AC-19a", "Paid RM1,234.50 at SHOP", "Paid RM1,234.50 at SHOP")
        exp("AC-19b", "Paid RM 1500 at SHOP", "Paid RM 1500 at SHOP")
        exp("AC-19c", "Paid MYR2000 at SHOP", "Paid MYR2000 at SHOP")
        exp("AC-19d", "Paid RM12.90", "Paid RM12.90")
        exp("AC-19e", "Paid RM12,345,678.90 at SHOP", "Paid RM12,345,678.90 at SHOP")
        exp("AC-19f", "Balance RM 12.90. Ref 4821", "Balance RM 12.90. Ref ••••")
        exp("AC-19g", "Paid RM12.90 4829", "Paid RM12.90 ••••")
        exp("AC-20a", "Ref (1234) 5678", "Ref (••••) ••••")
        exp("AC-20b", "No 1 2 3 4 end", "No • • • • end")
        exp("AC-20c", "No 1-2-3-4 end", "No •-•-•-• end")
        exp("AC-20d", "No １２３４ end", "No •••• end")
        exp("AC-20e", "No ١٢٣٤ end", "No •••• end")
        exp("AC-20f", "No 12​34 end", "No ••​•• end")
        exp("AC-20g", "Qty 123 only", "Qty 123 only")
        exp("AC-25", "  Hello   WORLD 👍  it's\tok ", "  Hello   WORLD 👍  it's\tok ")
        // all three parts masked
        val e = kept(post("Ref 123456", "Number 654321", "Big 111222"))!!
        check("AC-21", e.title == "Ref ••••••" && e.text == "Code ••••••" && e.bigText == "Big ••••••", "parts masked: ${e.title} | ${e.text} | ${e.bigText}")
        // maybe_otp flag
        val plain = kept(post("Card payment", "RM12.90 paid at ZUS COFFEE using your Main Account."))!!
        check("AC-22a", !plain.maybeOtp, "plain payment shouldn't be flagged")
        val adv = kept(post("Card payment", "RM12.90 paid at ZUS COFFEE #4471. Never share your TAC."))!!
        check("AC-22b", adv.maybeOtp && adv.text == "RM12.90 paid at ZUS COFFEE #••••. Never share your TAC.", "advice+store number: ${adv.text} maybe=${adv.maybeOtp}")
        val adv2 = kept(post("Card payment", "RM12.90 paid at ZUS COFFEE. Never share your TAC."))!!
        println("AC-22 note: OTP word, no digits masked -> maybeOtp=${adv2.maybeOtp}")
        val nodigit = kept(post("Alert", "Use your OTP wisely"))
        println("AC-22 note: otp word only, no digits -> maybeOtp=${nodigit?.maybeOtp}")
        // dedupe key from masked text
        val a = kept(post("Ryt", "Ref 111111 paid RM5.00", key = "k1", whenMs = 5))!!
        val b = kept(post("Ryt", "Ref 222222 paid RM5.00", key = "k1", whenMs = 5))!!
        check("AC-23", a.dedupeKey == b.dedupeKey, "keys differ for texts differing only in masked digits")
        val raw = DedupeKey.of(ryt, "k1", 5, "Ryt", "Ref 111111 paid RM5.00", null)
        check("AC-23b", a.dedupeKey != raw, "key equals hash of unmasked text")
        println("mask checked")
    }

    // ---- E. dedupe ----
    @Test
    fun dedupe() {
        val a = kept(post("T", "RM5.00 at X", key = "k", whenMs = 100))!!
        val b = kept(post("T", "RM5.00 at X", key = "k", whenMs = 100))!!
        check("AC-27", a.dedupeKey == b.dedupeKey, "same notification, different key")
        val c = kept(post("T", "RM5.00 at X", key = "k", whenMs = 160_000))!!
        check("AC-28", a.dedupeKey != c.dedupeKey, "identical payments with different when collide")
        val d = kept(post("T", "RM5.00 at X", key = "k2", whenMs = 100))!!
        check("AC-30a", a.dedupeKey != d.dedupeKey, "different notification key collides")
        val e = kept(post("T", "RM5.00 at Y", key = "k", whenMs = 100))!!
        check("AC-30b", a.dedupeKey != e.dedupeKey, "text differs by a char")
        val f = kept(post("ab", "c", key = "k", whenMs = 100))!!
        val g = kept(post("a", "bc", key = "k", whenMs = 100))!!
        check("AC-31a", f.dedupeKey != g.dedupeKey, "title/text boundary collides")
        val h = kept(post("T", "RM5.00 at X", key = "k", whenMs = 100, pkg = "com.grabtaxi.passenger"))!!
        check("AC-31b", a.dedupeKey != h.dedupeKey, "package not in key")
        // text vs big text boundary
        val i = kept(post("T", "x", big = "y", key = "k", whenMs = 100))!!
        val j = kept(post("T", "xy", big = null, key = "k", whenMs = 100))!!
        val k = kept(post("T", null, big = "xy", key = "k", whenMs = 100))!!
        check("AC-31c", setOf(i.dedupeKey, j.dedupeKey, k.dedupeKey).size == 3, "text/bigText boundary or null-vs-empty collides")
        // masked collisions: texts differing ONLY in a masked 4+ digit number and same key/when => same key (documented design)
        // distinct field with empty vs null
        val l = kept(post("", "x", key = "k", whenMs = 100))!!
        val m = kept(post(null, "x", key = "k", whenMs = 100))!!
        println("null vs empty title same key=${l.dedupeKey == m.dedupeKey} (by design: missing field is empty)")
        // when=0 falls back to postTime: two identical payments, key reused by the app, when unset
        val p1 = gate.decide(Posted(ryt, "k", "c", 1000, 0, "T", "RM5.00 at X", null), chosen) as Decision.Keep
        val p2 = gate.decide(Posted(ryt, "k", "c", 2000, 0, "T", "RM5.00 at X", null), chosen) as Decision.Keep
        check("AC-28b", p1.event.dedupeKey != p2.event.dedupeKey, "when=0: two payments at different postTimes collide")
        // the replay (same postTime, same when): same key
        val p3 = gate.decide(Posted(ryt, "k", "c", 1000, 0, "T", "RM5.00 at X", null), chosen) as Decision.Keep
        check("AC-29", p1.event.dedupeKey == p3.event.dedupeKey, "replay with when=0 should be the same key")
        println("dedupe checked")
    }

    // ---- B. other drops, A. chosen ----
    @Test
    fun drops() {
        check("AC-5", post("T", "x", summary = true) == Decision.Drop(DropReason.GROUP_SUMMARY), "group summary")
        check("AC-5b", post("T", "RM1.00 at X") is Decision.Keep, "child kept")
        check("AC-6", post("T", "Ride in progress", ongoing = true) == Decision.Drop(DropReason.ONGOING), "ongoing")
        check("AC-1", post("T", "RM5.00 at X", pkg = "com.example.other") == Decision.Drop(DropReason.NOT_CHOSEN), "unchosen")
        check("AC-3", gate.decide(Posted(ryt, "k", "c", 1, 1, "T", "RM5.00", null), emptySet()) == Decision.Drop(DropReason.NOT_CHOSEN), "empty list")
        check("AC-7", post("T", "RM5.00 at X", channel = "promo") is Decision.Keep, "no channel dropped by default")
    }

    // ---- evasions: stored OTP digits ----
    @Test
    fun evasions() {
        val tries =
            linkedMapOf(
                "keycap" to ("Your OTP is 4️⃣8️⃣2️⃣9️⃣1️⃣3️⃣"),
                "bidi 202C" to "Your OTP is 4‬8‬2‬9‬1‬3",
                "arabic letter mark 061C" to "Your OTP is 4؜8؜2؜9؜1؜3",
                "invisible times 2062" to "Your OTP is 4⁢8⁢2⁢9⁢1⁢3",
                "CGJ 034F" to "Your OTP is 4͏8͏2͏9͏1͏3",
                "four spaces" to "Your OTP is 4    8    2    9    1    3",
                "superscript" to "Your OTP is ⁴⁸²⁹¹³",
                "circled" to "Your OTP is ④⑧②⑨①③",
                "math bold" to "Your OTP is 𝟒𝟖𝟐𝟗𝟏𝟑",
                "devanagari" to "Your OTP is ४८२९१३",
                "decimal-looking" to "Your OTP is 4829.13",
                "after RM" to "Your OTP is RM 482913",
                "after EUR" to "Pay EUR 482913",
                "newline" to "Your OTP is 4\n8\n2\n9\n1\n3",
                "word joiner mid" to "Your OTP is 48⁠29⁠13",
                "tag chars" to "Your OTP is 4󠀠8󠀠2󠀠9󠀠1󠀠3",
                "split across parts" to "Your OTP is 482",
            )
        for ((name, text) in tries) {
            val d = post("Ryt", text)
            val res =
                when (d) {
                    is Decision.Drop -> "dropped (${d.reason})"
                    is Decision.Keep -> "KEPT text=[${d.event.text}] maybeOtp=${d.event.maybeOtp} leak=${leaks(d.event.text)}"
                }
            println("EVASION $name -> $res")
            if (d is Decision.Keep && leaks(d.event.text)) fails += "AC-20/26 FAIL: evasion '$name' stores digits: [${d.event.text}]"
        }
        // split across title and text
        val s = post("Your OTP 482", "913")
        println("EVASION split across title/text -> ${if (s is Decision.Keep) "KEPT title=[${s.event.title}] text=[${s.event.text}]" else "dropped"}")
        if (s is Decision.Keep) fails += "AC-26 FAIL: split code kept whole across title+text: [${s.event.title}]+[${s.event.text}]"
    }

    // ---- foreign currency amounts altered by the mask ----
    @Test
    fun foreignCurrency() {
        for (t in listOf("Paid THB 2500 at SHOP", "Paid JPY 15000 (RM 450.00)", "Paid EUR 1500 at SHOP", "Paid S\$1500 at SHOP", "Paid IDR 150000", "Paid RM 1234.5 at SHOP", "Paid ¥15000", "Paid £1500", "Paid 1500 RM", "RM1.500", "Paid RM 1 500")) {
            val e = kept(post("Ryt", t))
            println("AMOUNT [$t] -> [${e?.text}]")
        }
    }

    // ---- hostile input ----
    @Test
    fun hostile() {
        val big = "x".repeat(100_000)
        val inputs =
            linkedMapOf(
                "100k x" to big,
                "100k digits" to "1".repeat(100_000),
                "100k '1 '" to "1 ".repeat(50_000),
                "100k 'no. '" to "no. ".repeat(25_000),
                "100k 'never '" to "never ".repeat(16_000),
                "100k '1-'" to "1-".repeat(50_000),
                "100k 'a-1'" to "a-1".repeat(30_000),
                "100k 'otp '" to "otp ".repeat(25_000),
                "100k 'keep '" to "keep ".repeat(20_000) + "pin",
                "100k 'share never '" to "share never ".repeat(8_000),
                "100k '. '" to ". ".repeat(50_000),
                "100k 'code 1234. '" to "code 1234. ".repeat(9_000),
                "100k 'ref '" to "ref ".repeat(25_000) + "1234",
                "100k spaces" to " ".repeat(100_000) + "1234",
                "sql" to "'; DROP TABLE events; -- \" OR 1=1 \u0000 ../../etc/passwd",
                "lone surrogate" to "abc\uD800def 1234",
            )
        for ((name, text) in inputs) {
            val t0 = System.nanoTime()
            val res =
                try {
                    when (val d = post(name.take(8), text)) {
                        is Decision.Drop -> "drop ${d.reason}"
                        is Decision.Keep -> "keep maybe=${d.event.maybeOtp} len=${d.event.text?.length}"
                    }
                } catch (e: Throwable) {
                    "THROWS ${e::class.simpleName}"
                }
            val ms = (System.nanoTime() - t0) / 1_000_000
            println("HOSTILE $name -> $res in ${ms}ms")
            if (ms > 2000) fails += "AC-34 FAIL: '$name' took ${ms}ms"
            if (res.startsWith("THROWS")) fails += "AC-34 FAIL: '$name' $res (the Capture.store catch would log it as unread and drop)"
        }
    }

    @Test
    fun zzReport() {
        // runs in method order of declaration is not guaranteed; the other tests print their own fails via afterAll in a shutdown hook
    }

    init {
        Runtime.getRuntime().addShutdownHook(Thread { })
    }

    @org.junit.jupiter.api.AfterEach
    fun report() {
        if (fails.isNotEmpty()) {
            val msg = fails.joinToString("\n")
            fails.clear()
            fail("\n$msg")
        }
    }
}
