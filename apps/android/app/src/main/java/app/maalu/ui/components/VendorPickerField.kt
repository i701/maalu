package app.maalu.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Ref
import app.maalu.data.VendorItem
import kotlinx.coroutines.delay

/**
 * Pick a vendor from your own: the sheet asks the server as you type, and a name that matches none can be created.
 * [onPick] gets the name and, when it was an existing vendor, that vendor (so its usual category and tags can be used).
 */
@Composable
fun VendorPickerField(api: Api, value: String, onPick: (name: String, vendor: VendorItem?) -> Unit, modifier: Modifier = Modifier) {
    var known by remember { mutableStateOf<List<VendorItem>>(emptyList()) }
    var query by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(query) {
        val q = query ?: return@LaunchedEffect
        if (q.isNotEmpty()) delay(250) // wait for a pause in typing
        known = (api.get<List<VendorItem>>("vendors", buildMap { if (q.isNotEmpty()) put("q", q); put("limit", "30") }) as? ApiResult.Ok)?.data.orEmpty()
    }
    PickerField(
        title = "Vendor",
        value = value.takeIf { it.isNotBlank() }?.let { Ref("", it) },
        placeholder = "Choose or add a vendor (optional)",
        anyLabel = "No vendor",
        entries = known.map { Ref(it.id, it.name) },
        searchable = true,
        allowCreate = true,
        detail = { r -> known.firstOrNull { it.id == r.id }?.defaultCategory },
        onQuery = { query = it },
        onPick = { r ->
            val picked = known.firstOrNull { it.id == r?.id }
            onPick(picked?.name ?: r?.name ?: "", picked)
        },
        modifier = modifier,
    )
}
