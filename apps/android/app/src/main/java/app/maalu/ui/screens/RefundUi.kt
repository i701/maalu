@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Notes
import androidx.compose.material.icons.outlined.Numbers
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.maalu.data.Account
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Ref
import app.maalu.data.RefundItem
import app.maalu.data.Transaction
import app.maalu.data.UserMe
import app.maalu.data.amountLeft
import app.maalu.data.candidateFacts
import app.maalu.data.cleanAmount
import app.maalu.data.formatMoney
import app.maalu.data.itemsOfRefund
import app.maalu.data.itemsProblem
import app.maalu.data.itemsToPick
import app.maalu.data.itemsTotal
import app.maalu.data.linkRefundJson
import app.maalu.data.refundAmountProblem
import app.maalu.data.refundContext
import app.maalu.data.refundJson
import app.maalu.data.refundOfRef
import app.maalu.data.shortDate
import app.maalu.data.tidyAmount
import app.maalu.data.tidyRate
import app.maalu.data.title
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.Section
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.paletteTint
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

/** The items of a purchase, each with a tick and (once ticked) the amount to give back. [locked] is an existing refund, whose items cannot change. */
@Composable
private fun RefundItemRows(items: List<RefundItem>, currency: String, locked: Boolean, enabled: Boolean, onChange: (List<RefundItem>) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items.forEachIndexed { i, it ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Checkbox(it.on, { on -> onChange(items.toMutableList().also { l -> l[i] = it.copy(on = on) }) }, enabled = enabled && !locked && it.left.toBigDecimalOrNull()?.signum() == 1)
                Column(Modifier.weight(1f)) {
                    Text(it.name, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        if (locked) it.category else "${it.category} · ${formatMoney(it.left, currency)} left",
                        style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (it.on) CompactField(
                    it.amount, { v -> onChange(items.toMutableList().also { l -> l[i] = it.copy(amount = cleanAmount(v)) }) }, "Amount",
                    modifier = Modifier.weight(0.7f), keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = enabled, suffix = currency,
                )
            }
        }
    }
}

/**
 * Giving money back for a purchase: pass the [purchase] for a new refund, or the [refund] to change one. A refund is in the purchase's currency and
 * category (taken off that spending), and can be up to what is left of it; a purchase with items is refunded item by item.
 */
@Composable
fun RefundDialog(api: Api, purchase: Transaction?, refund: Transaction?, onClose: () -> Unit, onDone: (String) -> Unit) {
    val source = refund ?: purchase ?: return
    val currency = source.currency
    val hasItems = source.splits.isNotEmpty()
    val left = purchase?.let { amountLeft(it.amount, it.refundedAmount) }
    var amount by remember { mutableStateOf(tidyAmount(refund?.amount ?: left ?: "")) }
    var items by remember { mutableStateOf(if (refund != null) itemsOfRefund(refund) else if (purchase != null && hasItems) itemsToPick(purchase) else emptyList()) }
    var date by remember { mutableStateOf(refund?.date ?: LocalDate.now().toString()) }
    var time by remember { mutableStateOf(refund?.time?.take(5)) }
    var rate by remember { mutableStateOf(tidyRate(source.exchangeRate)) }
    var note by remember { mutableStateOf(refund?.description.orEmpty()) }
    var accountId by remember { mutableStateOf(source.account?.id) }
    var accounts by remember { mutableStateOf<List<Account>>(emptyList()) }
    var base by remember { mutableStateOf<String?>(null) }
    var pickingDate by remember { mutableStateOf(false) }
    var pickingTime by remember { mutableStateOf(false) }
    var problem by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        (api.get<UserMe>("users/me") as? ApiResult.Ok)?.let { base = it.data.baseCurrency }
        (api.get<List<Account>>("accounts") as? ApiResult.Ok)?.let { accounts = it.data }
    }
    // only the accounts in the refund's currency can take it
    val usable = accounts.filter { it.currency == currency }
    val foreign = base != null && currency != base
    val total = if (hasItems) itemsTotal(items).toPlainString() else null

    FormDialog(
        title = if (refund != null) "Edit refund" else "Refund a purchase", saveLabel = if (refund != null) "Save" else "Refund",
        busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            problem = if (hasItems) itemsProblem(items, locked = refund != null) else refundAmountProblem(amount, left)
            if (problem != null) return@FormDialog
            busy = true; error = null
            val send = total ?: amount
            val body = refundJson(purchase?.id, send, date, time, if (foreign) rate else null, note, accountId, if (hasItems) items else null, editing = refund != null).toString()
            scope.launch {
                val r = if (refund != null) api.patchJson<Transaction>("transactions/${refund.id}", body) else api.postJson<Transaction>("transactions", body)
                when (r) {
                    is ApiResult.Ok -> onDone(if (refund != null) "Refund updated" else "Refund added")
                    is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                }
            }
        },
    ) {
        Text(refundContext(purchase, refund), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Section(if (hasItems) "Items given back" else "Amount ($currency)", Icons.Outlined.Numbers, Accents.getValue("orange")) {
            if (hasItems) {
                RefundItemRows(items, currency, locked = refund != null, enabled = !busy) { items = it; problem = null }
                Text("Refund total: ${formatMoney(total ?: "0", currency)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                CompactField(amount, { amount = cleanAmount(it); problem = null }, "Amount refunded", keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = problem != null, suffix = currency)
                if (left != null) Text("Up to ${formatMoney(left, currency)} is left to refund.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            problem?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        }
        Section("When", Icons.Outlined.CalendarMonth, Accents.getValue("blue")) {
            val today = LocalDate.now()
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TintChip(paletteTint(0), date == "$today", { date = "$today" }, { Text("Today") })
                TintChip(paletteTint(1), date == "${today.minusDays(1)}", { date = "${today.minusDays(1)}" }, { Text("Yesterday") })
                val custom = date != "$today" && date != "${today.minusDays(1)}"
                TintChip(paletteTint(2), custom, { pickingDate = true }, { Text(if (custom) shortDate(date) else "Pick a date") })
                TintChip(paletteTint(3), time != null, { if (time == null) pickingTime = true else time = null }, { Text(time ?: "Add time") })
            }
            if (foreign) {
                CompactField(rate, { rate = cleanAmount(it) }, "Exchange rate", keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy)
                Text("Starts as the purchase's rate. Change it to the rate the refund really came in at.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Section("Account", Icons.Outlined.SwapHoriz, Accents.getValue("green")) {
            PickerField(
                title = "Account", value = usable.firstOrNull { it.id == accountId }?.let { Ref(it.id, it.name) }, placeholder = "No account", anyLabel = "No account",
                entries = usable.map { Ref(it.id, it.name) }, onPick = { accountId = it?.id },
            )
            Text("Where the money went back. Only accounts in $currency are offered.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Section("Note", Icons.Outlined.Notes, Accents.getValue("violet")) {
            CompactField(note, { note = it }, "For example: damaged, returned", enabled = !busy)
        }
    }

    if (pickingDate) {
        val state = rememberDatePickerState(initialSelectedDateMillis = LocalDate.parse(date).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { pickingDate = false },
            confirmButton = { TextButton(onClick = { state.selectedDateMillis?.let { date = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString() }; pickingDate = false }) { Text("OK") } },
            dismissButton = { TextButton(onClick = { pickingDate = false }) { Text("Cancel") } },
        ) { DatePicker(state) }
    }
    if (pickingTime) {
        val state = rememberTimePickerState(is24Hour = true)
        AlertDialog(
            onDismissRequest = { pickingTime = false },
            confirmButton = { TextButton(onClick = { time = "%02d:%02d".format(state.hour, state.minute); pickingTime = false }) { Text("OK") } },
            dismissButton = { TextButton(onClick = { pickingTime = false }) { Text("Cancel") } },
            text = { TimePicker(state) },
        )
    }
}

/**
 * Turns income you already recorded into a refund of a purchase. Lists the purchases it could be for (what the server found: same currency, on or
 * before it, with enough left, the likeliest first); for a purchase with items you tick the ones it gave back, adding up to the money that came back.
 */
@Composable
fun LinkRefundDialog(api: Api, income: Transaction, onClose: () -> Unit, onDone: (String) -> Unit) {
    var query by remember { mutableStateOf("") }
    var found by remember { mutableStateOf<List<Transaction>?>(null) }
    var failed by remember { mutableStateOf<String?>(null) }
    var chosen by remember { mutableStateOf<Transaction?>(null) }
    var items by remember { mutableStateOf<List<RefundItem>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(query) {
        if (query.isNotEmpty()) kotlinx.coroutines.delay(300)
        when (val r = api.get<List<Transaction>>("transactions/${income.id}/refund-candidates", if (query.isBlank()) emptyMap() else mapOf("q" to query))) {
            is ApiResult.Ok -> { found = r.data; failed = null }
            is ApiResult.Failed -> { found = emptyList(); failed = r.message.lines().first() }
        }
    }
    val ticked = items.filter { it.on }
    val itemsSum = itemsTotal(items)
    val itemsAdd = items.isEmpty() || itemsSum.compareTo(income.amount.toBigDecimalOrNull() ?: java.math.BigDecimal.ZERO) == 0
    val ready = chosen != null && itemsAdd && (items.isEmpty() || ticked.isNotEmpty())

    Dialog(onDismissRequest = { if (!busy) onClose() }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Scaffold(topBar = { TopAppBar(title = { Text("Link to a purchase") }, navigationIcon = { IconButton(onClick = onClose, enabled = !busy) { Icon(Icons.Outlined.Close, "Close") } }) }) { padding ->
            Column(Modifier.padding(padding).fillMaxSize()) {
                Column(Modifier.padding(horizontal = 16.dp, vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "${income.title()} · ${shortDate(income.date)} · ${formatMoney(income.amount, income.currency)}. Choose the purchase this money was for. It then counts as spending given back, not as income.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    CompactField(query, { query = it }, "Search purchases", enabled = !busy)
                }
                LazyColumn(Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    val list = found
                    if (list == null) item { Text("Looking…", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    else if (list.isEmpty()) item {
                        Text(
                            failed ?: "No purchase fits: it has to be in ${income.currency}, on or before this date, with at least this much left to refund.",
                            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    itemsIndexed(list.orEmpty(), key = { _, p -> p.id }) { _, p ->
                        Row(
                            Modifier.fillMaxWidth().padding(vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            RadioButton(chosen?.id == p.id, onClick = { chosen = p; items = if (p.splits.isNotEmpty()) itemsToPick(p) else emptyList(); error = null }, enabled = !busy)
                            Column(Modifier.weight(1f)) {
                                Text(p.title(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(candidateFacts(p), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    val c = chosen
                    if (c != null && items.isNotEmpty()) item {
                        Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("This purchase has items: tick the ones this money was for.", style = MaterialTheme.typography.bodyMedium)
                            RefundItemRows(items, c.currency, locked = false, enabled = !busy) { items = it }
                            Text(
                                "The items add up to ${formatMoney(itemsSum.toPlainString(), c.currency)}; the money that came back is ${formatMoney(income.amount, income.currency)}.",
                                style = MaterialTheme.typography.bodySmall, color = if (itemsAdd) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error,
                            )
                        }
                    }
                }
                Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }
                    Button(
                        enabled = ready && !busy, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth(),
                        onClick = {
                            val p = chosen ?: return@Button
                            busy = true; error = null
                            scope.launch {
                                when (val r = api.patchJson<Transaction>("transactions/${income.id}", linkRefundJson(p.id, items.takeIf { it.isNotEmpty() }).toString())) {
                                    is ApiResult.Ok -> onDone("Linked as a refund")
                                    is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                                }
                            }
                        },
                    ) { Text(if (busy) "Linking…" else "Link") }
                }
            }
        }
    }
}
