package app.maalu.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dashboard by preferencesDataStore("maalu_dashboard")
private val ORDER = stringPreferencesKey("section_order")
private val HIDDEN = stringSetPreferencesKey("hidden_sections")

/** How the Dashboard is arranged: card ids in order (empty is the default one) and the ones switched off. */
data class DashboardLayout(val order: List<String>, val hidden: Set<String>)

/** The Dashboard's layout, saved on this device only, as on the web and iOS. */
class DashboardStore(private val context: Context) {
    val layout: Flow<DashboardLayout> = context.dashboard.data.map {
        DashboardLayout(it[ORDER]?.split(",").orEmpty().filter(String::isNotEmpty), it[HIDDEN].orEmpty())
    }

    suspend fun save(layout: DashboardLayout) {
        context.dashboard.edit {
            it[ORDER] = layout.order.joinToString(",")
            it[HIDDEN] = layout.hidden
        }
    }
}
