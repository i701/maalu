package app.maalu.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowDropDown
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.maalu.data.Ref

/**
 * A compact tonal field that opens a list sheet to pick from: better than a pop-up menu for long lists.
 * [anyLabel] adds a first choice that clears the pick; [allowCreate] lets a typed name be used as new.
 */
@Composable
fun PickerField(
    title: String,
    value: Ref?,
    placeholder: String,
    entries: List<Ref>,
    onPick: (Ref?) -> Unit,
    modifier: Modifier = Modifier,
    anyLabel: String? = placeholder,
    searchable: Boolean = false,
    allowCreate: Boolean = false,
    detail: ((Ref) -> String?)? = null,
    isError: Boolean = false,
    /** When set, [entries] are the server's answer to the typed text: they are not filtered again here. */
    onQuery: ((String) -> Unit)? = null,
) {
    var open by remember { mutableStateOf(false) }
    Surface(
        onClick = { open = true },
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        border = if (isError) androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.error) else null,
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(Modifier.height(44.dp).padding(start = 14.dp, end = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                value?.name ?: placeholder,
                Modifier.weight(1f),
                style = MaterialTheme.typography.bodyMedium,
                color = if (value == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
            )
            Icon(Icons.Outlined.ArrowDropDown, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
    if (open) PickerSheet(title, anyLabel, entries, value?.id, searchable, allowCreate, detail, onQuery, onPick = { onPick(it); open = false }, onDismiss = { open = false })
}

/** The choices as springy tiles, the chosen one tinted. A search box filters long lists. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PickerSheet(
    title: String,
    anyLabel: String?,
    entries: List<Ref>,
    selectedId: String?,
    searchable: Boolean,
    allowCreate: Boolean,
    detail: ((Ref) -> String?)?,
    onQuery: ((String) -> Unit)?,
    onPick: (Ref?) -> Unit,
    onDismiss: () -> Unit,
) {
    var query by remember { mutableStateOf("") }
    androidx.compose.runtime.LaunchedEffect(query) { onQuery?.invoke(query.trim()) }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(Modifier.padding(horizontal = 24.dp, vertical = 8.dp)) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            if (searchable || allowCreate) CompactField(query, { query = it }, "Search or type a name", Modifier.padding(top = 12.dp))
        }
        val q = query.trim()
        val shown = if (q.isEmpty() || onQuery != null) entries else entries.filter { it.name.contains(q, ignoreCase = true) }
        // [null] is "any"; a Ref with an empty id is a name to create
        val rows: List<Ref?> = buildList {
            if (anyLabel != null && q.isEmpty()) add(null)
            if (allowCreate && q.isNotEmpty() && entries.none { it.name.equals(q, ignoreCase = true) }) add(Ref("", q))
            addAll(shown)
        }
        LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)) {
            items(rows.size) { i ->
                val entry = rows[i]
                val chosen = entry != null && entry.id.isNotEmpty() && entry.id == selectedId
                MorphTile(
                    onClick = { onPick(entry) },
                    first = i == 0,
                    last = i == rows.lastIndex,
                    modifier = Modifier.padding(bottom = 2.dp),
                    color = if (chosen) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerHigh,
                ) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                        if (entry != null && entry.id.isEmpty()) {
                            Icon(Icons.Outlined.Add, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(end = 12.dp))
                            Text("Create \"${entry.name}\"", Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.primary)
                        } else {
                            Column(Modifier.weight(1f)) {
                                Text(entry?.name ?: anyLabel.orEmpty(), style = MaterialTheme.typography.bodyLarge, color = if (entry == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
                                entry?.let(detail ?: { null })?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            }
                            if (chosen) Icon(Icons.Outlined.Check, null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}
