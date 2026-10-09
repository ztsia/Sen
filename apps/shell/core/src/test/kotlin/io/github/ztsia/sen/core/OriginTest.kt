package io.github.ztsia.sen.core

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class OriginTest {
    private val site = "https://sen.vercel.app"

    @Test
    fun `the site's own pages are the same origin`() {
        assertTrue(Origin.same("https://sen.vercel.app/s/settings/capture?x=1#y", site))
        assertTrue(Origin.same("https://SEN.vercel.app:443/", site))
        assertTrue(Origin.same("http://localhost:4173/more", "http://localhost:4173"))
    }

    @Test
    fun `a look-alike, another scheme, port or host is not`() {
        assertFalse(Origin.same("https://sen.vercel.app.example.com/", site))
        assertFalse(Origin.same("https://sen.vercel.app@example.com/", site))
        assertFalse(Origin.same("http://sen.vercel.app/", site))
        assertFalse(Origin.same("https://sen.vercel.app:8443/", site))
        assertFalse(Origin.same("https://other.vercel.app/", site))
        assertFalse(Origin.same("http://127.0.0.1:4173/", "http://localhost:4173"))
        assertFalse(Origin.same("javascript:alert(1)", site))
        assertFalse(Origin.same("intent://x#Intent;end", site))
        assertFalse(Origin.same("not a url", site))
    }
}
