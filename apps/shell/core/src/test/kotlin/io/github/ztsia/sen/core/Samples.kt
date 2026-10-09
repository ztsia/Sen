package io.github.ztsia.sen.core

import java.io.File

/**
 * The anonymised samples in docs/notifications.md: every ```text block, as title and text pairs. A
 * blank line separates notifications; the first line is the title, the rest the text.
 */
object Samples {
    data class Sample(val title: String, val text: String)

    val all: List<Sample> by lazy {
        val doc = File("../../../docs/notifications.md").readText()
        Regex("```text\\n(.*?)```", RegexOption.DOT_MATCHES_ALL).findAll(doc)
            .flatMap { it.groupValues[1].split(Regex("\\n\\s*\\n")) }
            .map { it.trim().lines() }
            .filter { it.isNotEmpty() && it.first().isNotBlank() }
            .map { Sample(it.first(), it.drop(1).joinToString("\n")) }
            .toList()
    }
}
