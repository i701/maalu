@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalFoundationApi::class)

package app.maalu.ui.screens

import androidx.compose.material3.OutlinedButton
import app.maalu.data.canLinkAsTransfer
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.idTint
import app.maalu.ui.theme.kindTint
import app.maalu.ui.theme.methodTint
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.TextButton
import app.maalu.data.canEdit
import androidx.compose.material.icons.outlined.Clear
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.CompositionLocalProvider
import app.maalu.ui.components.MorphTile
import app.maalu.ui.components.SearchPill
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.PaymentMethodLabels
import app.maalu.data.Totals
import app.maalu.data.TxFilters
import app.maalu.data.isAmount
import app.maalu.data.rangeLabel
import app.maalu.data.toJson
import app.maalu.data.txFiltersFromJson
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.InputChip
import androidx.compose.material3.InputChipDefaults
import app.maalu.ui.components.TintChip
import app.maalu.data.Transaction
import app.maalu.data.hasPlace
import app.maalu.data.canSplitSalary
import app.maalu.data.isSalaryToSplit
import app.maalu.data.dayLabel
import app.maalu.data.formatMoney
import app.maalu.data.formatNumber
import app.maalu.data.groupByDay
import app.maalu.data.canDuplicate
import app.maalu.data.duplicateForm
import app.maalu.data.isRefund
import app.maalu.data.shortTime
import app.maalu.data.title
import app.maalu.ui.components.MoneyText
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.MoneyStyle
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

import kotlinx.coroutines.launch

@Composable
fun RowDetails(t: Transaction) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        val sub = listOfNotNull(shortTime(t.time), t.category.takeIf { t.type != "transfer" }, t.account?.name).joinToString(" · ")
        Text(sub, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
        val marks = listOfNotNull(
            "Planned".takeIf { t.planned }, "Refund".takeIf { t.isRefund }, "Adjustment".takeIf { t.adjustment },
            t.subscription?.let { "Subscription" }, t.group?.name,
        )
        if (marks.isNotEmpty()) Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 2.dp)) { marks.forEach { Mark(it) } }
    }
}

/** A small tinted disc with the category's first letter, in its own accent (the web's category dot, as a native avatar). */
@Composable
fun CategoryBadge(t: Transaction) {
    val accent = Accents[t.categoryColor] ?: MaterialTheme.colorScheme.outline
    val letter = (if (t.type == "transfer") "⇄" else t.category.firstOrNull()?.uppercase() ?: "?")
    Box(Modifier.size(36.dp).clip(CircleShape).background(accent.copy(alpha = 0.18f)), contentAlignment = Alignment.Center) {
        Text(letter, style = MaterialTheme.typography.labelLarge, color = accent, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun Mark(text: String) {
    Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.secondaryContainer) {
        Text(text, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSecondaryContainer, modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp))
    }
}


/** The sign in front of a transaction's amount: minus for an expense, plus for income, none for a transfer. */
fun signPrefix(t: Transaction) = when (t.type) { "expense" -> "-"; "income" -> "+"; else -> "" }

/** An expense is money out, income (and a refund) money in; a transfer has no sign. */
fun signed(t: Transaction) = when (t.type) {
    "expense" -> "-" + formatMoney(t.amount, t.currency)
    "income" -> "+" + formatMoney(t.amount, t.currency)
    else -> formatMoney(t.amount, t.currency)
}

@Composable
fun amountColor(t: Transaction) = when (t.type) {
    "income" -> ChartColors.IncomeLight
    "expense" -> MaterialTheme.colorScheme.error
    else -> MaterialTheme.colorScheme.onSurface
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetailSheet(t: Transaction, onEdit: (() -> Unit)?, onDelete: () -> Unit, onClose: () -> Unit, onPay: (() -> Unit)? = null, onSplit: (() -> Unit)? = null, onLinkTransfer: (() -> Unit)? = null, matchCount: Int = 0, onDuplicate: (() -> Unit)? = null, receipts: (@Composable () -> Unit)? = null) {
    ModalBottomSheet(onDismissRequest = onClose) {
        Column(Modifier.fillMaxWidth().verticalScroll(androidx.compose.foundation.rememberScrollState()).padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(t.title(), style = MaterialTheme.typography.titleMedium)
            MoneyText(t.amount, t.currency, prefix = signPrefix(t), style = MaterialTheme.typography.titleLarge, color = amountColor(t))
            val rate = t.exchangeRate.toBigDecimalOrNull()
            if (rate != null && rate.compareTo(java.math.BigDecimal.ONE) != 0 && t.baseAmount != null) {
                Text(
                    "Rate ${rate.stripTrailingZeros().toPlainString()} · ${formatNumber(t.baseAmount)} in your base currency",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            DetailFact("When", dayLabel(t.date) + (shortTime(t.time)?.let { ", $it" } ?: "") + if (t.planned) " (planned)" else "")
            DetailFact("Type", t.type.replaceFirstChar { it.uppercase() } + if (t.isRefund) " · refund" else "")
            if (t.type == "transfer") {
                DetailFact("From", t.account?.name)
                DetailFact("To", listOfNotNull(t.toAccount?.name, t.toAmount?.let { formatMoney(it, t.toAccount?.currency ?: t.currency) }).joinToString(" · "))
            } else {
                DetailFact("Account", t.account?.name)
                DetailFact("Category", t.category)
                DetailFact("Vendor", t.vendor?.name)
            }
            DetailFact("Payment", PaymentMethodLabels[t.paymentMethod])
            DetailFact("Card", t.card?.let { it.name + (it.lastDigits?.let { d -> " ••$d" } ?: "") })
            DetailFact("Subscription", t.subscription?.name)
            DetailFact("Group", t.group?.name)
            if (t.tags.isNotEmpty()) DetailFact("Tags", t.tags.joinToString(", ") { it.name })
            DetailFact("Note", t.description)
            if (t.hasPlace()) DetailFact("Place", app.maalu.data.placeLabel(t.place, t.latitude, t.longitude))
            receipts?.invoke()
            // something planned becomes real here, with the real day, amount and rate
            if (onPay != null) Button(onClick = onPay, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
                Text(app.maalu.data.payTitle(t.type))
            }
            // the same money entered twice (an expense here and an income in another account): pair them into one transfer
            if (onLinkTransfer != null) OutlinedButton(onClick = onLinkTransfer, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) { Text(app.maalu.data.mergeLabel(matchCount)) }
            if (onDuplicate != null) OutlinedButton(onClick = onDuplicate, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) { Text("Duplicate as a new transaction") }
            if (onSplit != null) Button(onClick = onSplit, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth().padding(top = 4.dp), colors = ButtonDefaults.filledTonalButtonColors()) { Text("Split salary") }
            if (onEdit == null) Text(
                if (t.adjustment) "A balance adjustment can only be deleted." else "A refund is changed on the web.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (onEdit != null) Button(
                    onClick = onEdit, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.filledTonalButtonColors(),
                ) { Icon(Icons.Outlined.Edit, null, Modifier.padding(end = 8.dp)); Text("Edit") }
                Button(
                    onClick = onDelete, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer),
                ) { Icon(Icons.Outlined.Delete, null, Modifier.padding(end = 8.dp)); Text("Delete") }
            }
        }
    }
}

@Composable
fun DetailFact(label: String, value: String?) {
    if (value.isNullOrBlank()) return
    Row(Modifier.fillMaxWidth()) {
        Text(label, Modifier.weight(0.35f), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, Modifier.weight(0.65f), style = MaterialTheme.typography.bodyMedium)
    }
}


/**
 * A transaction's detail sheet with Edit and Delete: Edit opens the form on it, Delete asks and moves it to the trash with an
 * Undo. [onChanged] runs after anything that changes data, so the caller reloads; [onClose] after the flow ends. The
 * coroutine [scope] belongs to the caller, so the Undo snackbar outlives this host.
 */
@Composable
fun TransactionDetailHost(api: Api, t: Transaction, scope: kotlinx.coroutines.CoroutineScope, onClose: () -> Unit, onChanged: () -> Unit) {
    var phase by remember { mutableStateOf("sheet") }
    val snackbar = LocalSnackbar.current
    // the server says which entries could be the other half of this one; the merge button is only there when some could
    var matches by remember(t.id) { mutableStateOf<List<Transaction>>(emptyList()) }
    LaunchedEffect(t.id) {
        if (canLinkAsTransfer(t)) (api.get<List<Transaction>>("transactions/${t.id}/transfer-candidates") as? ApiResult.Ok)?.let { matches = it.data }
    }
    when (phase) {
        "sheet" -> DetailSheet(t, onEdit = if (t.canEdit()) ({ phase = "edit" }) else null, onDelete = { phase = "delete" }, onClose = onClose, onPay = if (t.planned) ({ phase = "pay" }) else null, onSplit = if (canSplitSalary(t)) ({ phase = "split" }) else null, onLinkTransfer = if (matches.isNotEmpty()) ({ phase = "link" }) else null, matchCount = matches.size, onDuplicate = if (t.canDuplicate()) ({ phase = "duplicate" }) else null, receipts = { ReceiptsSection(api, t, onChanged = onChanged, say = { m -> scope.launch { snackbar?.showSnackbar(m) } }) })
        "pay" -> MarkPaidDialog(api, t, null, onClose = onClose, onPaid = {
            onChanged()
            // pay that has just arrived: offer to split it, when there are rules to split it by
            scope.launch { snackbar?.showSnackbar(markedMessage(t)) }
            if (isSalaryToSplit(t)) scope.launch { if (api.hasSalaryRules()) phase = "split" else onClose() } else onClose()
        })
        "duplicate" -> AddTransactionScreen(
            api, initial = duplicateForm(t), onClose = onClose, onAdded = onChanged,
            onSaved = { onChanged(); onClose(); scope.launch { snackbar?.showSnackbar("Transaction added") } },
        )
        "link" -> LinkTransferFlow(api, t, matches, onClose = onClose, onDone = { msg -> onChanged(); onClose(); scope.launch { snackbar?.showSnackbar(msg) } })
        "split" -> SalarySplitDialog(api, t.id, onClose = { onChanged(); onClose() }, onDone = { msg -> onChanged(); onClose(); scope.launch { snackbar?.showSnackbar(msg) } })
        "edit" -> AddTransactionScreen(
            api, editing = t, onClose = onClose,
            onSaved = { onChanged(); onClose(); scope.launch { snackbar?.showSnackbar("Changes saved") } },
        )
        else -> AlertDialog(
            onDismissRequest = onClose,
            title = { Text("Move to the trash?") },
            text = { Text("${t.title()} (${signed(t)}) will leave your balances and reports. You can undo this right after.") },
            confirmButton = {
                TextButton(onClick = {
                    onClose()
                    scope.launch {
                        when (val r = api.delete("transactions/${t.id}")) {
                            is ApiResult.Ok -> {
                                onChanged()
                                val answer = snackbar?.showSnackbar("Moved to the trash", actionLabel = "Undo", duration = SnackbarDuration.Long)
                                if (answer == SnackbarResult.ActionPerformed) { api.post("transactions/${t.id}/restore"); onChanged() }
                            }
                            // for example a purchase with refunds: the refunds have to go first
                            is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                        }
                    }
                }) { Text("Move to trash", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = onClose) { Text("Cancel") } },
        )
    }
}
