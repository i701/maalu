package app.maalu.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dashboard by preferencesDataStore("maalu_dashboard")
private val HIDDEN = stringSetPreferencesKey("hidden_sections")

/** The Dashboard cards switched off, by id; saved on this device only, as on iOS. */
class DashboardStore(private val context: Context) {
    val hidden: Flow<Set<String>> = context.dashboard.data.map { it[HIDDEN].orEmpty() }

    suspend fun save(hidden: Set<String>) {
        context.dashboard.edit { it[HIDDEN] = hidden }
    }
}
