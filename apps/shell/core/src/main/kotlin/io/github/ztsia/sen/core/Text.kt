package io.github.ztsia.sen.core

import java.text.Normalizer
import java.util.Locale

/** Text as the filters compare it: Unicode NFKC, straight apostrophes, lower case, single spaces. */
internal fun normalise(s: String): String =
    Normalizer.normalize(s, Normalizer.Form.NFKC)
        .replace('’', '\'')
        .replace('‘', '\'')
        .lowercase(Locale.ROOT)
        .replace(Regex("\\s+"), " ")
        .trim()
