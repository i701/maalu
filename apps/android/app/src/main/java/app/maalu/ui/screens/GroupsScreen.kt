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
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
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
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Group
import app.maalu.data.GroupDetail
import app.maalu.data.GroupRemoved
import app.maalu.data.MAX_GROUP
import app.maalu.data.Transaction
import app.maalu.data.cannotGroupReason
import app.maalu.data.createGroupJson
import app.maalu.data.dayLabel
import app.maalu.data.groupLine
import app.maalu.data.groupNameProblem
import app.maalu.data.groupSizeProblem
import app.maalu.data.groupedMessage
import app.maalu.data.isNegative
import app.maalu.data.memberJson
import app.maalu.data.removedMessage
import app.maalu.data.title
import app.maalu.data.toggled
import app.maalu.data.updateGroupJson
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.MorphTile
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.ChartColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val PAGE = 50

/** Groups: a handful of related transactions under a name (a trip, instalments), with what they add up to. */
@Composable
fun GroupsScreen(api: Api) {
    var items by remember { mutableStateOf<List<Group>?>(null) }
    var total by remember { mutableIntStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var opened by remember { mutableStateOf<String?>(null) }
    var creating by remember { mutableStateOf(false) }
    var loadingMore by remember { mutableStateOf(false) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    fun say(text: String) { scope.launch { snackbar?.showSnackbar(text) } }

    LaunchedEffect(reload) {
        when (val r = api.get<List<Group>>("groups", mapOf("limit" to PAGE))) {
            is ApiResult.Ok -> { items = r.data; total = r.total ?: r.data.size; error = null }
            is ApiResult.Failed -> error = r.message
        }
        refreshing = false
    }

    val list = items
    Box(Modifier.fillMaxSize()) {
        when {
            list == null && error != null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(error ?: "", color = MaterialTheme.colorScheme.error)
                Button(onClick = { reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
            }
            list == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
                if (list.isEmpty()) Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Outlined.Inventory2, null, Modifier.size(48.dp), tint = Accents.getValue("blue"))
                    Text("No groups yet", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Bundle related transactions, like a trip or an instalment plan, and see what they add up to. Nothing else about them changes.",
                        style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                } else LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    itemsIndexed(list, key = { _, g -> g.id }) { i, g ->
                        MorphTile(onClick = { opened = g.id }, first = i == 0, last = i == list.lastIndex, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(g.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(groupLine(g.transactionCount, g.dateFrom, g.dateTo), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    MoneyText(g.net, g.currency, style = MaterialTheme.typography.bodyMedium, color = if (isNegative(g.net)) MaterialTheme.colorScheme.error else ChartColors.IncomeLight)
                                    Text("net", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                    if (list.size < total) item {
                        TextButton(
                            onClick = {
                                loadingMore = true
                                scope.launch {
                                    when (val r = api.get<List<Group>>("groups", mapOf("limit" to PAGE, "offset" to list.size))) {
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
        }
        ExtendedFloatingActionButton(
            onClick = { creating = true },
            icon = { Icon(Icons.Outlined.Add, null) }, text = { Text("New group") },
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
        )
    }

    if (creating) NewGroupDialog(api, onClose = { creating = false }, onCreated = { msg -> creating = false; reload++; say(msg) })
    opened?.let { id -> GroupSheet(api, id, onClose = { opened = null }, onChanged = { reload++ }, onSay = ::say) }
}

/** A name, a note and the transactions to bundle (two to fifty). */
@Composable
private fun NewGroupDialog(api: Api, onClose: () -> Unit, onCreated: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var chosen by remember { mutableStateOf(emptySet<String>()) }
    var picking by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    FormDialog(
        title = "New group", saveLabel = "Make the group", busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            error = groupNameProblem(name) ?: groupSizeProblem(chosen.size)
            if (error == null) {
                busy = true
                scope.launch {
                    when (val r = api.postJson<Group>("groups", createGroupJson(name, note, chosen.toList()).toString())) {
                        is ApiResult.Ok -> onCreated(groupedMessage(chosen.size, name.trim(), created = true))
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }
        },
    ) {
        Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            CompactField(name, { name = it; error = null }, "Name, for example Trip to Male", enabled = !busy, isError = error != null && groupNameProblem(name) != null)
            CompactField(note, { note = it.take(500) }, "Note (optional)", enabled = !busy, singleLine = false, minHeight = 80.dp)
            Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerHigh) {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(if (chosen.isEmpty()) "No transactions chosen" else "${chosen.size} ${if (chosen.size == 1) "transaction" else "transactions"} chosen", style = MaterialTheme.typography.bodyLarge)
                    Text("A group holds 2 to 50. A transaction can be in one group, and a transfer can't be grouped.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedButton(onClick = { picking = true }, enabled = !busy, shapes = ButtonDefaults.shapes()) { Text(if (chosen.isEmpty()) "Choose transactions" else "Change the choice") }
                }
            }
        }
    }
    if (picking) TransactionPicker(api, chosen, maxPick = MAX_GROUP, onClose = { picking = false }, onDone = { chosen = it; picking = false; error = null })
}

/** A group's details: what it adds up to, its transactions (each can be taken out), adding more, editing and deleting it. */
@Composable
private fun GroupSheet(api: Api, id: String, onClose: () -> Unit, onChanged: () -> Unit, onSay: (String) -> Unit) {
    var group by remember { mutableStateOf<GroupDetail?>(null) }
    var failed by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var busy by remember { mutableStateOf(false) }
    var adding by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(reload) {
        when (val r = api.get<GroupDetail>("groups/$id")) {
            is ApiResult.Ok -> { group = r.data; failed = null }
            is ApiResult.Failed -> failed = r.message
        }
    }

    ModalBottomSheet(onDismissRequest = onClose, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        val g = group
        when {
            failed != null -> Text(failed ?: "", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(24.dp))
            g == null -> Box(Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            else -> LazyColumn(Modifier.fillMaxWidth(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(g.name, style = MaterialTheme.typography.titleLarge)
                        Text(groupLine(g.transactionCount, g.dateFrom, g.dateTo), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        g.note?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Tile("Money in", g.moneyIn, g.currency, ChartColors.IncomeLight, Modifier.weight(1f))
                        Tile("Money out", g.moneyOut, g.currency, ChartColors.ExpenseLight, Modifier.weight(1f))
                        Tile("Net", g.net, g.currency, if (isNegative(g.net)) MaterialTheme.colorScheme.error else ChartColors.Line, Modifier.weight(1f))
                    }
                }
                itemsIndexed(g.transactions, key = { _, t -> t.id }) { i, t ->
                    MorphTile(onClick = {}, first = i == 0, last = i == g.transactions.lastIndex, modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.fillMaxWidth().padding(start = 12.dp, top = 4.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            CategoryBadge(t)
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(t.title(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Text(dayLabel(t.date), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            MoneyText(t.amount, t.currency, prefix = signPrefix(t), style = MaterialTheme.typography.bodyMedium, color = amountColor(t))
                            IconButton(
                                enabled = !busy,
                                onClick = {
                                    busy = true
                                    scope.launch {
                                        when (val r = api.postJson<GroupRemoved>("groups/$id/transactions/remove", memberJson(listOf(t.id)).toString())) {
                                            is ApiResult.Ok -> {
                                                onSay(removedMessage(r.data, g.name)); onChanged()
                                                if (r.data.dissolved) onClose() else reload++
                                            }
                                            is ApiResult.Failed -> onSay(r.message.lines().first())
                                        }
                                        busy = false
                                    }
                                },
                            ) { Icon(Icons.Outlined.Close, "Take ${t.title()} out of the group") }
                        }
                    }
                }
                item {
                    Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { adding = true }, enabled = !busy && g.transactionCount < MAX_GROUP, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f)) { Text("Add transactions") }
                        OutlinedButton(onClick = { editing = true }, enabled = !busy, shapes = ButtonDefaults.shapes()) { Text("Edit") }
                    }
                }
                item {
                    TextButton(onClick = { deleting = true }, enabled = !busy) { Text("Delete the group", color = MaterialTheme.colorScheme.error) }
                    Text("Deleting a group only unlinks its transactions; they stay as they are.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        val g2 = group
        if (adding && g2 != null) TransactionPicker(
            api, emptySet(), maxPick = MAX_GROUP - g2.transactionCount, onClose = { adding = false },
            onDone = { ids ->
                adding = false
                if (ids.isNotEmpty()) scope.launch {
                    busy = true
                    when (val r = api.postJson<Group>("groups/$id/transactions", memberJson(ids.toList()).toString())) {
                        is ApiResult.Ok -> { onSay(groupedMessage(ids.size, g2.name, created = false)); onChanged(); reload++ }
                        is ApiResult.Failed -> onSay(r.message.lines().first())
                    }
                    busy = false
                }
            },
        )
        if (editing && g2 != null) EditGroupDialog(
            api, id, g2, onClose = { editing = false },
            onSaved = { editing = false; onChanged(); reload++; onSay("Saved.") },
        )
        if (deleting && g2 != null) AlertDialog(
            onDismissRequest = { deleting = false },
            title = { Text("Delete ${g2.name}?") },
            text = { Text("The transactions in it stay as they are; only the group goes.") },
            confirmButton = {
                TextButton(onClick = {
                    deleting = false
                    scope.launch {
                        when (val r = api.delete("groups/$id")) {
                            is ApiResult.Ok -> { onSay("Group deleted."); onChanged(); onClose() }
                            is ApiResult.Failed -> onSay(r.message.lines().first())
                        }
                    }
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = false }) { Text("Keep it") } },
        )
    }
}

@Composable
private fun Tile(label: String, value: String, currency: String, tint: androidx.compose.ui.graphics.Color, modifier: Modifier) {
    Surface(modifier, shape = MaterialTheme.shapes.large, color = tint.copy(alpha = 0.16f)) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            MoneyText(value, currency, style = MaterialTheme.typography.titleSmall)
        }
    }
}

@Composable
private fun EditGroupDialog(api: Api, id: String, g: GroupDetail, onClose: () -> Unit, onSaved: () -> Unit) {
    var name by remember { mutableStateOf(g.name) }
    var note by remember { mutableStateOf(g.note.orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text("Edit the group") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                CompactField(name, { name = it; error = null }, "Name", enabled = !busy, isError = error != null)
                CompactField(note, { note = it.take(500) }, "Note (optional)", enabled = !busy, singleLine = false, minHeight = 80.dp)
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                error = groupNameProblem(name)
                if (error != null) return@TextButton
                busy = true
                scope.launch {
                    when (val r = api.patchJson<Group>("groups/$id", updateGroupJson(name, note).toString())) {
                        is ApiResult.Ok -> onSaved()
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Saving…" else "Save") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}

/**
 * Choose transactions, with a search box and the newest first. A transaction that can't go in a group (a transfer, a balance
 * adjustment, one already in another group) is shown dimmed with the reason. [onDone] gets the chosen ids.
 */
@Composable
fun TransactionPicker(api: Api, initial: Set<String>, maxPick: Int, onClose: () -> Unit, onDone: (Set<String>) -> Unit) {
    var query by remember { mutableStateOf("") }
    var items by remember { mutableStateOf<List<Transaction>?>(null) }
    var total by remember { mutableIntStateOf(0) }
    var chosen by remember { mutableStateOf(initial) }
    var error by remember { mutableStateOf<String?>(null) }
    var loadingMore by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(query) {
        if (items != null) delay(300)
        val params = buildMap<String, Any> { put("limit", PAGE); if (query.isNotBlank()) put("q", query.trim()) }
        when (val r = api.get<List<Transaction>>("transactions", params)) {
            is ApiResult.Ok -> { items = r.data; total = r.total ?: r.data.size; error = null }
            is ApiResult.Failed -> error = r.message
        }
    }

    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbar) },
            topBar = { TopAppBar(title = { Text("Choose transactions") }, navigationIcon = { IconButton(onClick = onClose) { Icon(Icons.Outlined.Close, "Close") } }) },
        ) { padding ->
            Column(Modifier.padding(padding).fillMaxSize()) {
                Box(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) { CompactField(query, { query = it }, "Search transactions") }
                val list = items
                when {
                    list == null && error != null -> Text(error ?: "", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
                    list == null -> Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                    list.isEmpty() -> Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) { Text("Nothing matches.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    else -> LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        itemsIndexed(list, key = { _, t -> t.id }) { i, t ->
                            val reason = cannotGroupReason(t)
                            MorphTile(onClick = { if (reason == null) chosen = if (t.id !in chosen && chosen.size >= maxPick) chosen else toggled(chosen, t.id) }, first = i == 0, last = i == list.lastIndex, modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.fillMaxWidth().padding(end = 14.dp, top = 4.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Checkbox(checked = t.id in chosen, onCheckedChange = null, enabled = reason == null, modifier = Modifier.padding(start = 12.dp, end = 4.dp))
                                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text(t.title(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text(reason ?: dayLabel(t.date), style = MaterialTheme.typography.labelSmall, color = if (reason != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
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
                                        val params = buildMap<String, Any> { put("limit", PAGE); put("offset", list.size); if (query.isNotBlank()) put("q", query.trim()) }
                                        when (val r = api.get<List<Transaction>>("transactions", params)) {
                                            is ApiResult.Ok -> items = list + r.data.filter { m -> list.none { it.id == m.id } }
                                            is ApiResult.Failed -> snackbar.showSnackbar(r.message.lines().first())
                                        }
                                        loadingMore = false
                                    }
                                },
                                enabled = !loadingMore, modifier = Modifier.fillMaxWidth(),
                            ) { Text(if (loadingMore) "Loading…" else "Show more") }
                        }
                    }
                }
                Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (chosen.size >= maxPick) Text("That is the most a group can hold.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = { onDone(chosen) }, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth()) {
                        Text(if (chosen.isEmpty()) "Done" else "Use ${chosen.size} ${if (chosen.size == 1) "transaction" else "transactions"}")
                    }
                }
            }
        }
    }
}
