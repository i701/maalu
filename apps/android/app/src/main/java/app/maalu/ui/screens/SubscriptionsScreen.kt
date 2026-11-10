@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.outlined.Pause
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.ExtendedFloatingActionButton
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
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.IntervalUnits
import app.maalu.data.Subscription
import app.maalu.data.SubscriptionCandidate
import app.maalu.data.SubscriptionSummary
import app.maalu.data.acceptJson
import app.maalu.data.amountPrefix
import app.maalu.data.canPause
import app.maalu.data.canResume
import app.maalu.data.cleanAmount
import app.maalu.data.confidenceText
import app.maalu.data.dismissJson
import app.maalu.data.dueText
import app.maalu.data.everyText
import app.maalu.data.formatMoney
import app.maalu.data.shortDate
import app.maalu.data.subscriptionStatusLabel
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.ConfirmDialog
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.MorphTile
import app.maalu.ui.components.SearchPill
import app.maalu.ui.components.SegmentedPills
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.MoneyStyle
import app.maalu.ui.theme.idTint
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

private val STATUS_FILTERS = listOf<Pair<String?, String>>(null to "All", "active" to "Active", "paused" to "Paused", "completed" to "Completed", "cancelled" to "Cancelled")

@Composable
private fun statusTint(status: String): Color = when (status) {
    "active" -> ChartColors.IncomeLight
    "paused" -> Color(0xFFEAB308)
    "completed" -> ChartColors.Line
    else -> MaterialTheme.colorScheme.outline
}

/**
 * Recurring bills. At the top what is active and what it costs a month, and (folded away) payments found in your history
 * that look like subscriptions; below, your subscriptions with when each is next due. Tap one to edit, pause, resume or delete.
 */
@Composable
fun SubscriptionsScreen(api: Api) {
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var committed by remember { mutableStateOf("") }
    var status by rememberSaveable { mutableStateOf<String?>(null) }
    var items by remember { mutableStateOf<List<Subscription>>(emptyList()) }
    var summary by remember { mutableStateOf<SubscriptionSummary?>(null) }
    var candidates by remember { mutableStateOf<List<SubscriptionCandidate>>(emptyList()) }
    // `loading` is only the first load; a changed filter keeps the list on screen and shows a thin bar (`reloading`)
    var loading by remember { mutableStateOf(true) }
    var reloading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var selected by remember { mutableStateOf<Subscription?>(null) }
    var editing by remember { mutableStateOf<Subscription?>(null) }
    var adding by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<Subscription?>(null) }
    var accepting by remember { mutableStateOf<SubscriptionCandidate?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    LaunchedEffect(query) { delay(300); committed = query.trim() }

    LaunchedEffect(committed, status, reload) {
        if (!refreshing) reloading = true
        error = null
        val params = buildMap<String, Any> { if (committed.isNotEmpty()) put("q", committed); status?.let { put("status_filter", it) } }
        when (val r = api.get<List<Subscription>>("subscriptions", params)) {
            is ApiResult.Ok -> items = r.data
            is ApiResult.Failed -> error = r.message
        }
        summary = (api.get<SubscriptionSummary>("subscriptions/summary") as? ApiResult.Ok)?.data
        candidates = (api.get<List<SubscriptionCandidate>>("subscriptions/candidates") as? ApiResult.Ok)?.data.orEmpty()
        loading = false; reloading = false; refreshing = false
    }

    Box(Modifier.fillMaxSize()) {
    Column(Modifier.fillMaxSize()) {
        // the controls stay put; only the list below reacts to them
        Column(Modifier.padding(horizontal = 16.dp)) {
            SearchPill(query, { query = it.take(100) }, Modifier.padding(vertical = 6.dp), placeholder = "Search subscriptions")
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                STATUS_FILTERS.forEach { (value, label) -> TintChip(if (value == null) MaterialTheme.colorScheme.outline else statusTint(value), status == value, { status = value }, { Text(label) }) }
            }
        }
        if (reloading) androidx.compose.material3.LinearProgressIndicator(Modifier.fillMaxWidth().padding(top = 8.dp))
        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error != null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(error ?: "", color = MaterialTheme.colorScheme.error)
                Button(onClick = { reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
            }
            else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
                LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp)) {
                    summary?.let { sm -> item { SummaryRow(sm) } }
                    if (candidates.isNotEmpty()) item { SuggestionsCard(candidates, onAdd = { accepting = it }, onDismiss = { c ->
                        scope.launch {
                            when (val r = api.postJson<JsonElement>("subscriptions/candidates/dismiss", dismissJson(c).toString())) {
                                is ApiResult.Ok -> { reload++; snackbar?.showSnackbar("We won't suggest ${c.vendorName} again") }
                                is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                            }
                        }
                    }) }
                    if (items.isEmpty()) item {
                        Text(if (committed.isNotEmpty() || status != null) "Nothing matches." else "No subscriptions yet. Add a bill that repeats, like rent or a streaming service.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 24.dp, horizontal = 4.dp))
                    }
                    items(items.size, key = { items[it].id }) { i ->
                        val s = items[i]
                        MorphTile({ selected = s }, first = i == 0, last = i == items.lastIndex, modifier = Modifier.padding(top = if (i == 0) 8.dp else 0.dp, bottom = 2.dp)) { SubscriptionRow(s) }
                    }
                }
            }
        }
    }
        val expanded by remember { derivedStateOf { listState.firstVisibleItemIndex == 0 } }
        ExtendedFloatingActionButton(
            onClick = { adding = true }, expanded = expanded, icon = { Icon(Icons.Outlined.Add, null) }, text = { Text("Add subscription") },
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
        )
    }

    selected?.let { s ->
        SubscriptionSheet(
            s,
            onEdit = { editing = s; selected = null },
            onToggle = {
                selected = null
                val next = if (s.canPause()) "paused" else "active"
                scope.launch {
                    when (val r = api.patchJson<Subscription>("subscriptions/${s.id}", buildJsonObject { put("status", next) }.toString())) {
                        is ApiResult.Ok -> { reload++; snackbar?.showSnackbar(if (next == "paused") "${s.name} paused" else "${s.name} resumed") }
                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                    }
                }
            },
            onDelete = { deleting = s; selected = null },
            onClose = { selected = null },
        )
    }
    if (adding) SubscriptionFormScreen(api, null, { adding = false }) { adding = false; reload++; scope.launch { snackbar?.showSnackbar("Subscription added") } }
    editing?.let { s -> SubscriptionFormScreen(api, s, { editing = null }) { editing = null; reload++; scope.launch { snackbar?.showSnackbar("Changes saved") } } }
    accepting?.let { c -> AcceptDialog(api, c, { accepting = null }) { accepting = null; reload++; scope.launch { snackbar?.showSnackbar("${c.vendorName} added as a subscription") } } }
    deleting?.let { s ->
        ConfirmDialog(
            "Delete ${s.name}?", "Its transactions are kept and just lose the subscription link: a planned payment stays in your planned list until you delete it there.", "Delete", onDismiss = { deleting = null },
            onConfirm = {
                deleting = null
                scope.launch {
                    when (val r = api.delete("subscriptions/${s.id}")) {
                        is ApiResult.Ok -> { reload++; snackbar?.showSnackbar("${s.name} deleted") }
                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                    }
                }
            },
        )
    }
}

@Composable
private fun SummaryRow(s: SubscriptionSummary) {
    Row(Modifier.fillMaxWidth().padding(bottom = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Surface(Modifier.weight(1f), shape = MaterialTheme.shapes.large, color = Accents.getValue("violet").copy(alpha = 0.16f)) {
            Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("Active", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("${s.activeCount}", style = MaterialTheme.typography.titleMedium.merge(MoneyStyle))
            }
        }
        Surface(Modifier.weight(1f), shape = MaterialTheme.shapes.large, color = Accents.getValue("orange").copy(alpha = 0.16f)) {
            Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("Costs a month", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                MoneyText(s.monthlyBaseTotal, s.currency, style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}

/** Payments that look like subscriptions, folded away until opened: Add makes one from it, "Not a subscription" hides it for good. */
@Composable
private fun SuggestionsCard(candidates: List<SubscriptionCandidate>, onAdd: (SubscriptionCandidate) -> Unit, onDismiss: (SubscriptionCandidate) -> Unit) {
    var open by rememberSaveable { mutableStateOf(false) }
    val tint = Accents.getValue("amber")
    Surface(Modifier.fillMaxWidth().padding(vertical = 4.dp), shape = MaterialTheme.shapes.extraLarge, color = tint.copy(alpha = 0.16f)) {
        Column {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Lightbulb, null, tint = tint, modifier = Modifier.padding(end = 12.dp))
                Column(Modifier.weight(1f)) {
                    Text("${candidates.size} suggested ${if (candidates.size == 1) "subscription" else "subscriptions"}", style = MaterialTheme.typography.titleSmall)
                    Text("Repeating payments we found in your history.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                TextButton(onClick = { open = !open }) { Icon(if (open) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, if (open) "Hide suggestions" else "Show suggestions") }
            }
            AnimatedVisibility(open) {
                Column(Modifier.padding(horizontal = 16.dp).padding(bottom = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    candidates.forEach { c ->
                        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow) {
                            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(c.vendorName, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(amountPrefix(c.amountVaries) + formatMoney(c.amount, c.currency), style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle))
                                }
                                Text(
                                    listOfNotNull(everyText(c.intervalUnit, c.intervalCount), "seen ${c.occurrences} times", confidenceText(c), c.nextDue?.let { "next ${shortDate(it)}" }).joinToString(" · "),
                                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(onClick = { onAdd(c) }, shapes = ButtonDefaults.shapes()) { Text("Add") }
                                    TextButton(onClick = { onDismiss(c) }) { Text("Not a subscription") }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SubscriptionRow(s: Subscription) {
    val tint = idTint(s.id)
    Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(tint.copy(alpha = 0.18f)), contentAlignment = Alignment.Center) {
            Text(s.name.firstOrNull()?.uppercase() ?: "?", style = MaterialTheme.typography.labelLarge, color = tint, fontWeight = FontWeight.SemiBold)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(s.name, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(s.dueText(), style = MaterialTheme.typography.bodySmall, color = if (s.isOverdue && s.status == "active") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(amountPrefix(s.amountVaries) + formatMoney(s.amount, s.currency), style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle))
            if (s.status != "active") Surface(shape = RoundedCornerShape(8.dp), color = statusTint(s.status).copy(alpha = 0.25f)) {
                Text(subscriptionStatusLabel(s.status), style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
            }
        }
    }
}

@Composable
private fun Fact(label: String, value: String?) {
    if (value.isNullOrBlank()) return
    Row(Modifier.fillMaxWidth()) {
        Text(label, Modifier.weight(0.35f), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, Modifier.weight(0.65f), style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun SubscriptionSheet(s: Subscription, onEdit: () -> Unit, onToggle: () -> Unit, onDelete: () -> Unit, onClose: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(s.name, style = MaterialTheme.typography.titleMedium)
            Text(amountPrefix(s.amountVaries) + formatMoney(s.amount, s.currency), style = MaterialTheme.typography.titleLarge.merge(MoneyStyle))
            Fact("Repeats", everyText(s.intervalUnit, s.intervalCount))
            Fact("Status", subscriptionStatusLabel(s.status))
            Fact("Next due", s.nextDueDate?.let { shortDate(it) + if (s.isOverdue) " (overdue)" else "" })
            Fact("Last paid", s.lastPaidDate?.let(::shortDate))
            Fact("Pays from", s.account?.name)
            Fact("Vendor", s.vendor?.name)
            Fact("Category", s.category)
            Fact("Costs a month", formatMoney(s.monthlyBaseCost, "").trim().takeIf { s.currency != "" })
            Fact("Payments", app.maalu.data.installmentsText(s.installmentsTotal, s.paymentsMade))
            Fact("Reminder", s.remindDaysBefore?.let { d -> app.maalu.data.RemindOptions.firstOrNull { it.first == d }?.second ?: "$d days before" } ?: "None")
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onEdit, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.Edit, null, Modifier.padding(end = 6.dp)); Text("Edit") }
                if (s.canPause() || s.canResume()) Button(onClick = onToggle, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) {
                    Icon(if (s.canPause()) Icons.Outlined.Pause else Icons.Outlined.PlayArrow, null, Modifier.padding(end = 6.dp)); Text(if (s.canPause()) "Pause" else "Resume")
                }
            }
            Button(
                onClick = onDelete, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer),
            ) { Icon(Icons.Outlined.Delete, null, Modifier.padding(end = 6.dp)); Text("Delete") }
        }
    }
}

/** Turn a suggestion into a subscription, changing its name, amount or how often first if needed. */
@Composable
private fun AcceptDialog(api: Api, c: SubscriptionCandidate, onClose: () -> Unit, onDone: () -> Unit) {
    var name by remember { mutableStateOf(c.vendorName) }
    var amount by remember { mutableStateOf(app.maalu.data.tidyAmount(c.amount)) }
    var count by remember { mutableStateOf(c.intervalCount.toString()) }
    var unit by remember { mutableStateOf(c.intervalUnit) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text("Add ${c.vendorName}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                CompactField(name, { name = it.take(100) }, "Name", enabled = !busy)
                CompactField(amount, { amount = cleanAmount(it); error = null }, "Amount", keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, suffix = c.currency)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Every", style = MaterialTheme.typography.bodyMedium)
                    CompactField(count, { count = it.filter(Char::isDigit).take(2) }, "1", Modifier.weight(0.4f), KeyboardOptions(keyboardType = KeyboardType.Number), enabled = !busy)
                }
                SegmentedPills(IntervalUnits, unit, { unit = it }, tint = { Accents.getValue(listOf("blue", "violet", "pink")[IntervalUnits.indexOfFirst { p -> p.first == it }.coerceAtLeast(0)]) }, enabled = !busy)
                Text("Every payment of this pattern is linked to it, so its history and next payment are right from the start.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                busy = true
                scope.launch {
                    when (val r = api.postJson<Subscription>("subscriptions/candidates/accept", acceptJson(c, name, amount, count, unit).toString())) {
                        is ApiResult.Ok -> onDone()
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Adding…" else "Add") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}
