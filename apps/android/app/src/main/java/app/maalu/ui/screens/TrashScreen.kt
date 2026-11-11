@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.DeleteForever
import androidx.compose.material.icons.outlined.RestoreFromTrash
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.BulkResult
import app.maalu.data.Transaction
import app.maalu.data.batches
import app.maalu.data.bulkMessage
import app.maalu.data.dayLabel
import app.maalu.data.idsJson
import app.maalu.data.keepVisible
import app.maalu.data.mergeBulk
import app.maalu.data.title
import app.maalu.data.toggled
import app.maalu.data.transactionCount
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.MorphTile
import kotlinx.coroutines.launch

private const val PAGE = 50

/**
 * The Trash: transactions that were deleted, until they are restored or deleted for good. Tick rows to restore or delete several
 * at once ("Select all" takes every one, on every page); tap a row for its details and the same two actions.
 */
@Composable
fun TrashScreen(api: Api) {
    var items by remember { mutableStateOf<List<Transaction>?>(null) }
    var total by remember { mutableIntStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var loadingMore by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf(emptySet<String>()) }
    var busy by remember { mutableStateOf(false) }
    var opened by remember { mutableStateOf<Transaction?>(null) }
    // ids waiting for the "delete for good" confirmation
    var deleting by remember { mutableStateOf<List<String>?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    fun say(text: String) { scope.launch { snackbar?.showSnackbar(text) } }

    LaunchedEffect(reload) {
        when (val r = api.get<List<Transaction>>("transactions/trash", mapOf("limit" to PAGE))) {
            is ApiResult.Ok -> { items = r.data; total = r.total ?: r.data.size; error = null; selected = keepVisible(selected, r.data.map { it.id }) }
            is ApiResult.Failed -> error = r.message
        }
        refreshing = false
    }

    /** Runs a bulk action over [ids] (in batches of 500), reports it in one line and reloads. */
    fun bulk(path: String, ids: List<String>, done: (Int) -> String) {
        busy = true
        scope.launch {
            val results = mutableListOf<BulkResult>()
            var failed: String? = null
            for (batch in batches(ids)) {
                when (val r = api.postJson<BulkResult>(path, idsJson(batch).toString())) {
                    is ApiResult.Ok -> results += r.data
                    is ApiResult.Failed -> { failed = r.message.lines().first(); break }
                }
            }
            val merged = mergeBulk(results)
            say(failed?.let { f -> if (merged.updated > 0) bulkMessage(done, merged) + ". $f" else f } ?: bulkMessage(done, merged))
            selected = emptySet(); busy = false; reload++
        }
    }

    val list = items
    when {
        list == null && error != null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(error ?: "", color = MaterialTheme.colorScheme.error)
            Button(onClick = { reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
        }
        list == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        list.isEmpty() -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Outlined.Delete, null, Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("The trash is empty", style = MaterialTheme.typography.titleMedium)
                Text("Deleted transactions wait here until you restore them or delete them for good.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
        }
        else -> Box(Modifier.fillMaxSize()) {
            PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
                LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = if (selected.isEmpty()) 16.dp else 120.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    item { Text("Deleted transactions wait here until you restore them or delete them for good.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)) }
                    itemsIndexed(list, key = { _, t -> t.id }) { i, t ->
                        MorphTile(onClick = { opened = t }, first = i == 0, last = i == list.lastIndex, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.fillMaxWidth().padding(end = 14.dp, top = 4.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Checkbox(checked = t.id in selected, onCheckedChange = { selected = toggled(selected, t.id) }, enabled = !busy)
                                CategoryBadge(t)
                                Column(Modifier.weight(1f).padding(start = 8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(t.title(), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 2, overflow = TextOverflow.Ellipsis)
                                    Text(dayLabel(t.date), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                MoneyText(t.amount, t.currency, prefix = signPrefix(t), style = MaterialTheme.typography.bodyMedium, color = amountColor(t))
                            }
                        }
                    }
                    if (list.size < total) item {
                        TextButton(
                            onClick = {
                                loadingMore = true
                                scope.launch {
                                    when (val r = api.get<List<Transaction>>("transactions/trash", mapOf("limit" to PAGE, "offset" to list.size))) {
                                        is ApiResult.Ok -> items = list + r.data.filter { m -> list.none { it.id == m.id } }
                                        is ApiResult.Failed -> say(r.message.lines().first())
                                    }
                                    loadingMore = false
                                }
                            },
                            enabled = !loadingMore, modifier = Modifier.fillMaxWidth(),
                        ) { Text(if (loadingMore) "Loading…" else "Show more") }
                    }
                }
            }
            if (selected.isNotEmpty()) Box(Modifier.align(Alignment.BottomCenter)) { SelectionBar(
                count = selected.size, total = total, loaded = list.size, busy = busy,
                onRestore = { bulk("transactions/bulk/restore", selected.toList()) { "Restored ${transactionCount(it)}" } },
                onDelete = { deleting = selected.toList() },
                onSelectAll = {
                    scope.launch {
                        when (val r = api.get<List<String>>("transactions/trash/ids")) {
                            is ApiResult.Ok -> selected = r.data.toSet()
                            is ApiResult.Failed -> say(r.message.lines().first())
                        }
                    }
                },
                onClear = { selected = emptySet() },
            ) }
        }
    }

    opened?.let { t ->
        TrashSheet(
            t,
            onClose = { opened = null },
            onRestore = {
                opened = null; busy = true
                scope.launch {
                    when (val r = api.post("transactions/${t.id}/restore")) {
                        is ApiResult.Ok -> say("Restored ${t.title()}.")
                        is ApiResult.Failed -> say(r.message.lines().first())
                    }
                    busy = false; reload++
                }
            },
            onDelete = { opened = null; deleting = listOf(t.id) },
        )
    }
    deleting?.let { ids ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Delete forever?") },
            text = { Text("Delete ${transactionCount(ids.size)} for good? This can't be undone.") },
            confirmButton = {
                TextButton(onClick = { deleting = null; bulk("transactions/bulk/purge", ids) { "Deleted ${transactionCount(it)} for good" } }) { Text("Delete forever", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Keep them") } },
        )
    }
}

@Composable
private fun SelectionBar(count: Int, total: Int, loaded: Int, busy: Boolean, onRestore: () -> Unit, onDelete: () -> Unit, onSelectAll: () -> Unit, onClear: () -> Unit) {
    Surface(color = MaterialTheme.colorScheme.secondaryContainer, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("$count selected", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                TextButton(onClick = onClear, enabled = !busy) { Text("Clear") }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Button(onClick = onRestore, enabled = !busy, shapes = ButtonDefaults.shapes()) { Icon(Icons.Outlined.RestoreFromTrash, null, Modifier.padding(end = 6.dp).size(18.dp)); Text("Restore") }
                OutlinedButton(onClick = onDelete, enabled = !busy, shapes = ButtonDefaults.shapes()) { Icon(Icons.Outlined.DeleteForever, null, Modifier.padding(end = 6.dp).size(18.dp)); Text("Delete forever") }
                if (total > loaded && count < total) TextButton(onClick = onSelectAll, enabled = !busy) { Text("Select all $total") }
            }
        }
    }
}

@Composable
private fun TrashSheet(t: Transaction, onClose: () -> Unit, onRestore: () -> Unit, onDelete: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(t.title(), style = MaterialTheme.typography.titleMedium)
            MoneyText(t.amount, t.currency, prefix = signPrefix(t), style = MaterialTheme.typography.titleLarge, color = amountColor(t))
            DetailFact("When", dayLabel(t.date) + (shortTimeOf(t) ?: ""))
            DetailFact("Type", t.type.replaceFirstChar { it.uppercase() })
            DetailFact("Account", t.account?.name)
            if (t.type != "transfer") DetailFact("Category", t.category)
            DetailFact("Vendor", t.vendor?.name)
            DetailFact("Note", t.description)
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onRestore, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.RestoreFromTrash, null, Modifier.padding(end = 8.dp)); Text("Restore") }
                Button(
                    onClick = onDelete, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer),
                ) { Icon(Icons.Outlined.DeleteForever, null, Modifier.padding(end = 8.dp)); Text("Delete forever") }
            }
        }
    }
}

private fun shortTimeOf(t: Transaction): String? = app.maalu.data.shortTime(t.time)?.let { ", $it" }
