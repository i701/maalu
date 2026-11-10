package app.maalu.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.appearance by preferencesDataStore("maalu_appearance")
private val MODE = stringPreferencesKey("theme_mode")

enum class ThemeMode(val label: String) { System("System"), Light("Light"), Dark("Dark") }

/** Light, dark or whatever the phone is set to; saved on this device only. */
class ThemeStore(private val context: Context) {
    val mode: Flow<ThemeMode> = context.appearance.data.map { p ->
        ThemeMode.entries.firstOrNull { it.name == p[MODE] } ?: ThemeMode.System
    }

    suspend fun save(mode: ThemeMode) {
        context.appearance.edit { it[MODE] = mode.name }
    }
}
