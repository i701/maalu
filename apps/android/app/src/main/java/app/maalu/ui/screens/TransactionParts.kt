@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalFoundationApi::class)

package app.maalu.ui.screens

import androidx.compose.material3.BottomSheetDefaults
import app.maalu.ui.components.glowSheet
import app.maalu.ui.theme.tintIcon
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
import app.maalu.ui.components.AlertDialog
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
import app.maalu.data.canMakeSubscription
import app.maalu.data.text
import app.maalu.data.duplicateForm
import app.maalu.data.isRefund
import app.maalu.data.refundOfRef
import app.maalu.data.shortTime
import app.maalu.data.title
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material.icons.automirrored.outlined.CallSplit
import androidx.compose.material.icons.automirrored.outlined.Undo
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.Repeat
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.ui.graphics.vector.ImageVector
import app.maalu.data.PurchaseItem
import app.maalu.data.isOverdue
import app.maalu.data.longWhen
import app.maalu.data.rowTag
import app.maalu.ui.components.MoneyText
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.MoneyStyle
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

import kotlinx.coroutines.launch

/** A day's heading on its own pill: it stays put while rows scroll under it, and the backdrop shows around it. */
@Composable
fun DayHeader(label: String) {
    Surface(
        shape = CircleShape, color = MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha = 0.92f),
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
    ) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
    }
}

/** The colour a transaction is marked with: its category's, a transfer's own blue. */
@Composable
private fun rowTint(t: Transaction): Color =
    if (t.type == "transfer") ChartColors.Line else Accents[t.categoryColor] ?: MaterialTheme.colorScheme.outline

/** The category in quiet text behind a small dot of its colour, which is where a row's colour comes from. */
@Composable
private fun CategoryLabel(t: Transaction) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(7.dp).clip(CircleShape).background(rowTint(t)))
        Text(t.rowTag(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** A small tinted pill; the text stays in the normal ink so it reads on any tint. */
@Composable
private fun Pill(text: String, tint: Color) {
    Surface(shape = CircleShape, color = tint.tintIcon()) {
        Text(text, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
    }
}

@Composable
private fun StatusPill(t: Transaction) {
    if (t.isOverdue()) Pill("Overdue", ChartColors.Warning) else Pill("Planned", MaterialTheme.colorScheme.outline)
}

/** The quiet row: the title with its category under it, and the amount; a planned one adds a pill under the amount. */
@Composable
fun RowScope.QuietRow(t: Transaction) {
    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(t.title(), style = MaterialTheme.typography.bodyMediumEmphasized, maxLines = 1, overflow = TextOverflow.Ellipsis)
        CategoryLabel(t)
    }
    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        MoneyText(t.amount, t.currency, prefix = signPrefix(t), style = MaterialTheme.typography.bodyMedium, color = amountColor(t))
        if (t.planned) StatusPill(t)
    }
}

/** A small tinted disc with the category's first letter, in its own accent (the web's category dot, as a native avatar). */
@Composable
fun CategoryBadge(t: Transaction) {
    val accent = Accents[t.categoryColor] ?: MaterialTheme.colorScheme.outline
    val letter = (if (t.type == "transfer") "⇄" else t.category.firstOrNull()?.uppercase() ?: "?")
    Box(Modifier.size(36.dp).clip(CircleShape).background(accent.tintIcon()), contentAlignment = Alignment.Center) {
        Text(letter, style = MaterialTheme.typography.labelLargeEmphasized, color = accent)
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

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun DetailSheet(t: Transaction, onEdit: (() -> Unit)?, onDelete: () -> Unit, onClose: () -> Unit, onPay: (() -> Unit)? = null, onSplit: (() -> Unit)? = null, onMakeSubscription: (() -> Unit)? = null, onLinkTransfer: (() -> Unit)? = null, matchCount: Int = 0, onDuplicate: (() -> Unit)? = null, onRefund: (() -> Unit)? = null, onEditRefund: (() -> Unit)? = null, onLinkRefund: (() -> Unit)? = null, receipts: (@Composable () -> Unit)? = null) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = Color.Transparent, modifier = Modifier.glowSheet(BottomSheetDefaults.ContainerColor)) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier.padding(horizontal = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                CategoryLabel(t)
                Text(t.title(), style = MaterialTheme.typography.titleLargeEmphasized)
                MoneyText(t.amount, t.currency, prefix = signPrefix(t), style = MaterialTheme.typography.headlineLarge, color = amountColor(t))
                Text(longWhen(t.date, t.time), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (t.planned || t.isRefund || t.adjustment || app.maalu.data.wasRefunded(t)) FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (t.planned) StatusPill(t)
                    if (t.isRefund) Pill("Refund", Accents.getValue("orange"))
                    if (app.maalu.data.wasRefunded(t)) Pill(if (app.maalu.data.canRefund(t)) "Partly refunded" else "Fully refunded", Accents.getValue("orange"))
                    if (t.adjustment) Pill("Adjustment", MaterialTheme.colorScheme.outline)
                }
                // the main things to do, as pills; the rest waits in the list at the bottom
                FlowRow(Modifier.padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (onPay != null) ActionPill(app.maalu.data.payTitle(t.type), ChartColors.IncomeLight, onPay)
                    if (onEdit != null) ActionPill("Edit", ChartColors.Line, onEdit)
                    if (onDuplicate != null) ActionPill("Duplicate", ChartColors.Line, onDuplicate)
                    ActionPill("Delete", MaterialTheme.colorScheme.error, onDelete)
                }
                if (t.adjustment) Text("A balance adjustment can only be deleted.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (t.splits.isNotEmpty()) SheetSection("Items") { t.splits.forEach { ItemRow(it, t.currency) } }
            SheetSection("Details") {
                if (t.isRefund) t.refundOfRef()?.let { DetailFact("Refund of", app.maalu.data.refundContext(null, t)) }
                if (app.maalu.data.wasRefunded(t)) DetailFact("Refunded", formatMoney(t.refundedAmount, t.currency))
                if (t.type != "transfer") {
                    DetailFact("Vendor", t.vendor?.name)
                    DetailFact("Paid with", PaymentMethodLabels[t.paymentMethod])
                }
                DetailFact(if (t.type == "transfer") "From" else "Account", t.account?.name)
                DetailFact("To", t.toAccount?.name)
                DetailFact("Arrived", t.toAmount?.let { formatMoney(it, t.toAccount?.currency ?: t.currency) })
                val rate = t.exchangeRate.toBigDecimalOrNull()
                if (rate != null && rate.compareTo(java.math.BigDecimal.ONE) != 0) {
                    DetailFact("Exchange rate", rate.stripTrailingZeros().toPlainString())
                    DetailFact("In base currency", t.baseAmount?.let(::formatNumber))
                }
                DetailFact("Card", t.card?.text())
                DetailFact("Subscription", t.subscription?.name)
                DetailFact("Group", t.group?.name)
                DetailFact("Tags", t.tags.joinToString(", ") { it.name })
                if (t.hasPlace()) DetailFact("Place", app.maalu.data.placeLabel(t.place, t.latitude, t.longitude))
            }
            if (!t.description.isNullOrBlank()) SheetSection("Note") { Text(t.description, style = MaterialTheme.typography.bodyMedium) }
            receipts?.invoke()
            if (listOf(onRefund, onEditRefund, onLinkRefund, onSplit, onLinkTransfer, onMakeSubscription).any { it != null }) SheetSection(null) {
                val orange = Accents.getValue("orange")
                if (onRefund != null) ActionRow("Refund", Icons.AutoMirrored.Outlined.Undo, orange, onRefund)
                if (onEditRefund != null) ActionRow("Edit refund", Icons.Outlined.Edit, orange, onEditRefund)
                if (onLinkRefund != null) ActionRow("Link to a purchase", Icons.Outlined.Link, orange, onLinkRefund)
                if (onSplit != null) ActionRow("Split salary", Icons.AutoMirrored.Outlined.CallSplit, ChartColors.IncomeLight, onSplit)
                // the same money entered twice (an expense here and an income in another account): pair them into one transfer
                if (onLinkTransfer != null) ActionRow(app.maalu.data.mergeLabel(matchCount), Icons.Outlined.SwapHoriz, ChartColors.Line, onLinkTransfer)
                if (onMakeSubscription != null) ActionRow("Make a subscription", Icons.Outlined.Repeat, Accents.getValue("violet"), onMakeSubscription)
            }
        }
    }
}

@Composable
private fun ActionPill(label: String, tint: Color, onClick: () -> Unit) {
    Button(
        onClick = onClick, shapes = ButtonDefaults.shapes(),
        colors = ButtonDefaults.buttonColors(containerColor = tint.tintIcon(), contentColor = MaterialTheme.colorScheme.onSurface),
    ) { Text(label) }
}

/** One tonal block of the sheet, with its heading above it. */
@Composable
private fun SheetSection(title: String?, content: @Composable ColumnScope.() -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        if (title != null) Text(title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp))
        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp), content = content)
        }
    }
}

@Composable
private fun ActionRow(label: String, icon: ImageVector, tint: Color, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clip(MaterialTheme.shapes.small).clickable(onClick = onClick).heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(icon, null, tint = tint)
        Text(label, style = MaterialTheme.typography.bodyLarge)
    }
}

/** One item of a split purchase: "Rice × 2" over its category and GST, and the line total. */
@Composable
private fun ItemRow(item: PurchaseItem, currency: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(Modifier.weight(1f)) {
            Text(item.title(), style = MaterialTheme.typography.bodyMedium)
            val tax = item.taxAmount?.takeIf { (it.toBigDecimalOrNull()?.signum() ?: 0) > 0 }
            Text(item.category + (tax?.let { " · GST ${formatMoney(it, currency)}" } ?: ""), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        MoneyText(item.amount, currency, style = MaterialTheme.typography.bodyMedium)
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
        "sheet" -> DetailSheet(t, onEdit = if (t.canEdit()) ({ phase = "edit" }) else null, onEditRefund = if (t.isRefund && !t.adjustment) ({ phase = "refund-edit" }) else null, onRefund = if (app.maalu.data.canRefund(t)) ({ phase = "refund" }) else null, onLinkRefund = if (app.maalu.data.canLinkRefund(t)) ({ phase = "link-refund" }) else null, onDelete = { phase = "delete" }, onClose = onClose, onPay = if (t.planned) ({ phase = "pay" }) else null, onSplit = if (canSplitSalary(t)) ({ phase = "split" }) else null, onMakeSubscription = if (t.canMakeSubscription()) ({ phase = "subscription" }) else null, onLinkTransfer = if (matches.isNotEmpty()) ({ phase = "link" }) else null, matchCount = matches.size, onDuplicate = if (t.canDuplicate()) ({ phase = "duplicate" }) else null, receipts = { ReceiptsSection(api, t, onChanged = onChanged, say = { m -> scope.launch { snackbar?.showSnackbar(m) } }) })
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
        "refund", "refund-edit" -> RefundDialog(api, if (phase == "refund") t else null, if (phase == "refund-edit") t else null, onClose = onClose, onDone = { msg -> onChanged(); onClose(); scope.launch { snackbar?.showSnackbar(msg) } })
        "link-refund" -> LinkRefundDialog(api, t, onClose = onClose, onDone = { msg -> onChanged(); onClose(); scope.launch { snackbar?.showSnackbar(msg) } })
        "subscription" -> MakeSubscriptionDialog(api, t, onClose = onClose, onDone = { msg -> onChanged(); onClose(); scope.launch { snackbar?.showSnackbar(msg) } })
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
                TextButton(shapes = ButtonDefaults.shapes(), onClick = {
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
            dismissButton = { TextButton(shapes = ButtonDefaults.shapes(), onClick = onClose) { Text("Cancel") } },
        )
    }
}
