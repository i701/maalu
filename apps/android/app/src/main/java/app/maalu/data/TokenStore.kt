package app.maalu.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private val Context.secrets by preferencesDataStore("maalu_secrets")
private val TOKEN = stringPreferencesKey("session_token")
private const val ALIAS = "maalu_session_token"

/** The session token, encrypted with a key that never leaves the Android Keystore. */
class TokenStore(private val context: Context) {
    val token: Flow<String?> = context.secrets.data.map { prefs -> prefs[TOKEN]?.let(::decrypt) }

    suspend fun save(token: String) {
        context.secrets.edit { it[TOKEN] = encrypt(token) }
    }

    suspend fun clear() {
        context.secrets.edit { it.remove(TOKEN) }
    }

    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build(),
        )
        return gen.generateKey()
    }

    private fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        return Base64.encodeToString(cipher.iv + cipher.doFinal(plain.toByteArray()), Base64.NO_WRAP)
    }

    /** A token that cannot be read (key lost, data damaged) is treated as signed out. */
    private fun decrypt(stored: String): String? = try {
        val bytes = Base64.decode(stored, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            .apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12))) }
        String(cipher.doFinal(bytes, 12, bytes.size - 12))
    } catch (e: Exception) {
        null
    }
}
