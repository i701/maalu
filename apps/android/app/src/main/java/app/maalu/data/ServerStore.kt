package app.maalu.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.store by preferencesDataStore("maalu")
private val SERVER = stringPreferencesKey("server_url")

/** The address of this person's own Maalu server. There is no hosted service, so it is asked for. */
class ServerStore(private val context: Context) {
    val url: Flow<String?> = context.store.data.map { it[SERVER] }

    suspend fun save(url: String) {
        context.store.edit { it[SERVER] = url }
    }

    suspend fun clear() {
        context.store.edit { it.remove(SERVER) }
    }
}

/** `maalu.example.com` becomes `https://maalu.example.com`; trailing slashes go. */
fun normalizeServer(input: String): String {
    val trimmed = input.trim().trimEnd('/')
    return if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed else "https://$trimmed"
}
