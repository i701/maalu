@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CallMerge
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Ref
import app.maalu.data.Tag
import app.maalu.data.mergeJson
import app.maalu.data.tagJson
import app.maalu.data.tagProblem
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.ConfirmDialog
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.MorphTile
import app.maalu.ui.components.PickerSheet
import app.maalu.ui.components.SearchPill
import app.maalu.ui.components.Section
import app.maalu.ui.theme.Accents
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement

private sealed interface TagLoad {
    data object Loading : TagLoad
    data class Loaded(val items: List<Tag>) : TagLoad
    data class Failed(val message: String) : TagLoad
}

/** Tags: labels that cut across categories. A tag is only a name (its colour is automatic); merge two to combine them. */
@Composable
fun TagsScreen(api: Api) {
    var attempt by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<Tag?>(null) }
    var editing by remember { mutableStateOf<Tag?>(null) }
    var adding by remember { mutableStateOf(false) }
    var merging by remember { mutableStateOf<Tag?>(null) }
    var mergePair by remember { mutableStateOf<Pair<Tag, Tag>?>(null) }
    var deleting by remember { mutableStateOf<Tag?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    val state by produceState<TagLoad>(TagLoad.Loading, attempt) {
        if (!refreshing) value = TagLoad.Loading
        value = when (val r = api.get<List<Tag>>("tags")) {
            is ApiResult.Ok -> TagLoad.Loaded(r.data)
            is ApiResult.Failed -> TagLoad.Failed(r.message)
        }
        refreshing = false
    }
    val all = (state as? TagLoad.Loaded)?.items.orEmpty()

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            SearchPill(query, { query = it.take(100) }, Modifier.padding(horizontal = 16.dp, vertical = 6.dp), placeholder = "Search tags")
            when (val s = state) {
                TagLoad.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                is TagLoad.Failed -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = { attempt++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
                }
                is TagLoad.Loaded -> {
                    val shown = if (query.isBlank()) s.items else s.items.filter { it.name.contains(query.trim(), ignoreCase = true) }
                    PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; attempt++ }, modifier = Modifier.fillMaxSize()) {
                        if (shown.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(if (query.isBlank()) "No tags yet. A tag is a label you can put on any transaction." else "Nothing matches.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        } else LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp)) {
                            items(shown.size, key = { shown[it].id }) { i ->
                                val t = shown[i]
                                MorphTile({ selected = t }, first = i == 0, last = i == shown.lastIndex, modifier = Modifier.padding(bottom = 2.dp)) { TagRow(t) }
                            }
                        }
                    }
                }
            }
        }
        val expanded by remember { derivedStateOf { listState.firstVisibleItemIndex == 0 } }
        ExtendedFloatingActionButton(
            onClick = { adding = true }, expanded = expanded, icon = { Icon(Icons.Outlined.Add, null) }, text = { Text("Add tag") },
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
        )
    }

    selected?.let { t -> TagSheet(t, onEdit = { editing = t; selected = null }, onMerge = { merging = t; selected = null }, onDelete = { deleting = t; selected = null }, onClose = { selected = null }) }
    if (adding) TagFormScreen(api, all, null, { adding = false }) { adding = false; attempt++; scope.launch { snackbar?.showSnackbar("Tag added") } }
    editing?.let { t -> TagFormScreen(api, all, t, { editing = null }) { editing = null; attempt++; scope.launch { snackbar?.showSnackbar("Tag renamed") } } }
    merging?.let { from ->
        PickerSheet(
            title = "Merge ${from.name} into…", anyLabel = null, entries = all.filter { it.id != from.id }.map { Ref(it.id, it.name) }, selectedId = null,
            searchable = true, allowCreate = false, detail = null, onQuery = null,
            onPick = { r -> merging = null; r?.let { target -> all.firstOrNull { it.id == target.id }?.let { mergePair = from to it } } },
            onDismiss = { merging = null },
        )
    }
    mergePair?.let { (from, into) ->
        ConfirmDialog(
            "Merge ${from.name} into ${into.name}?", "Everything tagged ${from.name} gets ${into.name} instead, and ${from.name} is removed. This can't be undone.", "Merge",
            onDismiss = { mergePair = null },
            onConfirm = {
                mergePair = null
                scope.launch {
                    when (val r = api.postJson<JsonElement>("tags/${from.id}/merge", mergeJson(into.id).toString())) {
                        is ApiResult.Ok -> { attempt++; snackbar?.showSnackbar("Merged into ${into.name}") }
                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                    }
                }
            },
        )
    }
    deleting?.let { t ->
        ConfirmDialog(
            "Delete ${t.name}?", "It is taken off its ${t.transactionCount} transactions; the transactions themselves stay.", "Delete", onDismiss = { deleting = null },
            onConfirm = {
                deleting = null
                scope.launch {
                    when (val r = api.delete("tags/${t.id}")) {
                        is ApiResult.Ok -> { attempt++; snackbar?.showSnackbar("${t.name} deleted") }
                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                    }
                }
            },
        )
    }
}

@Composable
private fun TagRow(t: Tag) {
    val tint = Accents[t.color] ?: Accents.getValue("slate")
    Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(tint.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
            Icon(Icons.Outlined.Sell, null, tint = tint, modifier = Modifier.size(20.dp))
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(t.name, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${t.transactionCount} ${if (t.transactionCount == 1) "transaction" else "transactions"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun TagSheet(t: Tag, onEdit: () -> Unit, onMerge: () -> Unit, onDelete: () -> Unit, onClose: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(t.name, style = MaterialTheme.typography.titleMedium)
            TagRow(t)
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onEdit, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.Edit, null, Modifier.padding(end = 6.dp)); Text("Rename") }
                Button(onClick = onMerge, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.CallMerge, null, Modifier.padding(end = 6.dp)); Text("Merge") }
            }
            Button(
                onClick = onDelete, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer),
            ) { Icon(Icons.Outlined.Delete, null, Modifier.padding(end = 6.dp)); Text("Delete") }
        }
    }
}

@Composable
private fun TagFormScreen(api: Api, existing: List<Tag>, editing: Tag?, onClose: () -> Unit, onSaved: () -> Unit) {
    var name by remember { mutableStateOf(editing?.name.orEmpty()) }
    var nameError by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    FormDialog(
        title = if (editing == null) "New tag" else "Rename tag", saveLabel = if (editing == null) "Add tag" else "Save",
        busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            val problem = tagProblem(name, existing, editing?.id)
            if (problem != null) {
                nameError = true; error = null
                scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(problem.message) }
                return@FormDialog
            }
            if (editing != null && name.trim() == editing.name) { onClose(); return@FormDialog }
            busy = true; error = null; nameError = false
            scope.launch {
                val r = if (editing != null) api.patchJson<Tag>("tags/${editing.id}", tagJson(name).toString()) else api.postJson<Tag>("tags", tagJson(name).toString())
                when (r) {
                    is ApiResult.Ok -> onSaved()
                    is ApiResult.Failed -> { error = r.message; busy = false; launch { snackbar.showSnackbar(r.message.lines().first()) } }
                }
            }
        },
    ) {
        Section("Name", Icons.Outlined.Sell, Accents.getValue("violet")) {
            CompactField(name, { nameError = false; name = it.take(50) }, "For example weekly", enabled = !busy, isError = nameError)
            Text("A tag's colour is picked for you.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
