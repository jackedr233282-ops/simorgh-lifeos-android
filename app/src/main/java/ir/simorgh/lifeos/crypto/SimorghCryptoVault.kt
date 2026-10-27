package ir.simorgh.lifeos.crypto

import android.util.Base64
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * موتور رمزنگاری سرتاسری دانش‌صفر (Zero-Knowledge AES-256-GCM + PBKDF2-HMAC-SHA256)
 * سازنده و معمار سیستم: سید هادی موسوی (Syed Hadi Mosavi) — شرکت سیمرغ (Simorgh Co.)
 *
 * سازگار ۱۰۰٪ با استاندارد WebCrypto مرورگرها برای ذخیره‌سازی امن در Google Drive شخصی کاربر.
 */
object SimorghCryptoVault {

    private const val MAGIC = "SIMORGH_AES256_GCM_V2"
    private const val ITERATIONS = 120_000
    private const val KEY_BITS = 256
    private const val GCM_TAG_BITS = 128

    fun encrypt(plainJson: String, passphrase: String): String {
        require(passphrase.length >= 4) { "رمز پشتیبان باید حداقل ۴ کاراکتر باشد" }
        val rng = SecureRandom()
        val salt = ByteArray(16).also { rng.nextBytes(it) }
        val iv = ByteArray(12).also { rng.nextBytes(it) }

        val key = deriveAesKey(passphrase, salt, ITERATIONS)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(GCM_TAG_BITS, iv))
        val cipherBytes = cipher.doFinal(plainJson.toByteArray(StandardCharsets.UTF_8))

        return JSONObject().apply {
            put("magic", MAGIC)
            put("creator", "Syed Hadi Mosavi - Simorgh Co.")
            put("kdf", "PBKDF2-HMAC-SHA256")
            put("cipher", "AES-256-GCM")
            put("iterations", ITERATIONS)
            put("created_at", System.currentTimeMillis())
            put("salt_b64", Base64.encodeToString(salt, Base64.NO_WRAP))
            put("iv_b64", Base64.encodeToString(iv, Base64.NO_WRAP))
            put("data_b64", Base64.encodeToString(cipherBytes, Base64.NO_WRAP))
        }.toString(2)
    }

    fun decrypt(envelopeJson: String, passphrase: String): String {
        val obj = JSONObject(envelopeJson)
        if (obj.optString("magic") != MAGIC) {
            throw IllegalArgumentException("فرمت فایل رمزنگاری‌شده سیمرغ معتبر نیست")
        }
        val iterations = obj.optInt("iterations", ITERATIONS)
        val salt = Base64.decode(obj.getString("salt_b64"), Base64.DEFAULT)
        val iv = Base64.decode(obj.getString("iv_b64"), Base64.DEFAULT)
        val cipherBytes = Base64.decode(obj.getString("data_b64"), Base64.DEFAULT)

        val key = deriveAesKey(passphrase, salt, iterations)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_BITS, iv))
        val plainBytes = cipher.doFinal(cipherBytes)
        return String(plainBytes, StandardCharsets.UTF_8)
    }

    private fun deriveAesKey(passphrase: String, salt: ByteArray, iterations: Int): SecretKeySpec {
        val spec = PBEKeySpec(passphrase.toCharArray(), salt, iterations, KEY_BITS)
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val raw = factory.generateSecret(spec).encoded
        return SecretKeySpec(raw, "AES")
    }
}
