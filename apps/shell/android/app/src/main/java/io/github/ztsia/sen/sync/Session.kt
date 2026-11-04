package io.github.ztsia.sen.sync

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.webkit.CookieManager
import io.github.ztsia.sen.BuildConfig
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * The login, owned by the shell (spec §5 *The shell owns the session*). The web app signs in normally in
 * the WebView and Better Auth keeps its session as an HttpOnly cookie; the shell copies that cookie's
 * name and value, encrypted with an AES/GCM key that lives in the Android Keystore (alias `sen-session`),
 * and uses the value as a bearer token for the sync. At launch it puts the cookie back into the WebView
 * if the WebView has lost it, so both share one login.
 *
 * The token is never logged, in any build, and never leaves this process except in the sync's
 * Authorization header.
 */
object Session {
    private const val PREFS = "session"
    private const val ALIAS = "sen-session"
    private const val SECRET = "secret"
    private const val USER = "user_id"
    private const val COOKIE_SUFFIX = "better-auth.session_token"

    /** The session cookie as Better Auth set it: its name (with `__Secure-` on https) and its value. */
    data class Token(val name: String, val value: String)

    @Volatile private var cache: Token? = null
    @Volatile private var cached = false

    /** The stored token, or null when signed out. */
    fun token(context: Context): Token? {
        if (cached) return cache
        synchronized(this) {
            if (!cached) {
                cache = read(context)
                cached = true
            }
            return cache
        }
    }

    fun userId(context: Context): String? = prefs(context).getString(USER, null)

    fun setUserId(context: Context, id: String) {
        prefs(context).edit().putString(USER, id).commit()
    }

    /** Stores a token (encrypted). A different one than before forgets the person's user id. */
    fun set(context: Context, name: String, value: String) {
        val next = Token(name, value)
        if (token(context) == next) return
        synchronized(this) {
            prefs(context).edit().putString(SECRET, encrypt(Token(name, value))).remove(USER).commit()
            cache = next
            cached = true
        }
    }

    /** Signed out: the stored token and user id are gone. */
    fun clear(context: Context) {
        synchronized(this) {
            prefs(context).edit().remove(SECRET).remove(USER).commit()
            cache = null
            cached = true
        }
    }

    /**
     * Reads the WebView's cookie again (Better Auth refreshes it daily): present, it's stored if it changed;
     * absent, the shell is signed out too. Returns whether the shell is signed in.
     */
    fun adopt(context: Context): Boolean {
        val site = BuildConfig.SEN_URL
        if (site.isEmpty()) return token(context) != null
        val cookie =
            try {
                webViewSession(site)
            } catch (_: RuntimeException) {
                // no WebView on this phone: it can't tell, so what is stored stands
                return token(context) != null
            }
        if (cookie == null) clear(context) else set(context, cookie.name, cookie.value)
        return token(context) != null
    }

    /**
     * Before the WebView loads: a stored token and no session cookie in the WebView (its storage was
     * cleared, or the app was reinstalled over a kept login) puts the cookie back, so the page opens
     * signed in. Same attributes as Better Auth's, with the session's own 90 days.
     */
    fun restore(context: Context) {
        val site = BuildConfig.SEN_URL
        val t = token(context) ?: return
        if (site.isEmpty()) return
        try {
            if (webViewSession(site) != null) return
            val cm = CookieManager.getInstance()
            cm.setCookie(site, "${t.name}=${t.value}; Path=/; Max-Age=$NINETY_DAYS; HttpOnly; SameSite=Lax" + if (site.startsWith("https://")) "; Secure" else "")
            cm.flush()
        } catch (_: RuntimeException) {
            // no WebView on this phone: nothing to share the login with
        }
    }

    private const val NINETY_DAYS = 90 * 24 * 3600

    /** The session cookie in the WebView's jar for the site; throws where the phone has no WebView. */
    private fun webViewSession(site: String): Token? =
        CookieManager.getInstance().getCookie(site)
            ?.split(';')
            ?.map { it.trim() }
            ?.mapNotNull { pair ->
                val eq = pair.indexOf('=')
                if (eq <= 0) null else Token(pair.substring(0, eq), pair.substring(eq + 1))
            }
            ?.firstOrNull { it.name.endsWith(COOKIE_SUFFIX) && it.value.isNotEmpty() }

    private fun prefs(context: Context) = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return gen.generateKey()
    }

    /** `iv:ciphertext`, both base64. The plaintext is the name and the value, a newline apart. */
    private fun encrypt(t: Token): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val ct = cipher.doFinal("${t.name}\n${t.value}".toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(ct, Base64.NO_WRAP)
    }

    private fun read(context: Context): Token? {
        val stored = prefs(context).getString(SECRET, null) ?: return null
        return try {
            val (iv, ct) = stored.split(':').map { Base64.decode(it, Base64.NO_WRAP) }
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv)) }
            val text = String(cipher.doFinal(ct), Charsets.UTF_8)
            val nl = text.indexOf('\n')
            Token(text.substring(0, nl), text.substring(nl + 1))
        } catch (e: Exception) {
            // the key was lost (a restore to another phone, a changed lock screen): sign in again
            prefs(context).edit().remove(SECRET).remove(USER).commit()
            null
        }
    }
}
