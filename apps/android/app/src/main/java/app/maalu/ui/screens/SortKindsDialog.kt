package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Category
import app.maalu.data.changedKindCount
import app.maalu.data.kindLabel
import app.maalu.data.kindRequests
import app.maalu.data.sortableCategories
import app.maalu.data.startingKinds
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.SegmentedPills
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement

/**
 * Sort every category into need or want in one place (or only the ones not sorted yet), instead of opening each one. Only what
 * changed is saved, one request per kind. [onSaved] gets the message to show.
 */
@Composable
fun SortKindsDialog(api: Api, categories: List<Category>, onClose: () -> Unit, onSaved: (String) -> Unit) {
    var choices by remember { mutableStateOf(startingKinds(categories)) }
    var onlyUnsorted by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val changed = changedKindCount(categories, choices)
    // "not sorted" is judged on what was opened, so a row does not vanish the moment it is set
    val shown = sortableCategories(categories).filter { !onlyUnsorted || it.effectiveKind == null }

    FormDialog(
        title = "Needs and wants", saveLabel = if (changed > 0) "Save $changed" else "Done",
        busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            val requests = kindRequests(categories, choices)
            if (requests.isEmpty()) { onClose(); return@FormDialog }
            busy = true; error = null
            scope.launch {
                for (body in requests) {
                    val r = api.patchJson<JsonElement>("categories/kind", body.toString())
                    if (r is ApiResult.Failed) { error = r.message.lines().first(); busy = false; return@launch }
                }
                onSaved(if (changed == 1) "1 category sorted" else "$changed categories sorted")
            }
        },
    ) {
        Text(
            "Mark what you can't do without as a need and the rest as a want. A sub-category you leave not set takes its parent's.",
            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Only the ones not sorted yet", Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
            Switch(checked = onlyUnsorted, onCheckedChange = { onlyUnsorted = it }, enabled = !busy)
        }
        if (shown.isEmpty()) Text("Everything is sorted.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        shown.forEach { c ->
            Column(Modifier.padding(start = if (c.parentId != null) 16.dp else 0.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(c.name, style = MaterialTheme.typography.bodyLarge)
                val inherited = if (choices[c.id] == null && c.effectiveKind != null) kindLabel(c.effectiveKind)?.let { "Takes ${c.parent ?: "its parent"}'s: $it" } else null
                inherited?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                SegmentedPills(
                    listOf<Pair<String?, String>>("need" to "Need", "want" to "Want", null to "Not set"), choices[c.id], { choices = choices + (c.id to it) },
                    enabled = !busy,
                )
            }
        }
    }
}
