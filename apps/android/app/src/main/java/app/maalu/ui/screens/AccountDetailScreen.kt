@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalFoundationApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Archive
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Account
import app.maalu.data.AccountBalancePoint
import app.maalu.data.AddForm
import app.maalu.data.AdjustMode
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.BalanceAfter
import app.maalu.data.BalanceHistory
import app.maalu.data.CardStatement
import app.maalu.data.HistoryRange
import app.maalu.data.Totals
import app.maalu.data.Transaction
import app.maalu.data.accountEffect
import app.maalu.data.adjustJson
import app.maalu.data.adjustmentPreview
import app.maalu.data.cleanSigned
import app.maalu.data.dayLabel
import app.maalu.data.formatMoney
import app.maalu.data.groupByDay
import app.maalu.data.groupLabel
import app.maalu.data.historySummary
import app.maalu.data.isRefund
import app.maalu.data.monthBounds
import app.maalu.data.repayForm
import app.maalu.data.shortTime
import app.maalu.data.statementLine
import app.maalu.data.suggestedMethod
import app.maalu.data.tidyRate
import app.maalu.data.title
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.ConfirmDialog
import app.maalu.ui.components.LineChart
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
import java.time.LocalDate

private const val PAGE = 30
private val TYPES = listOf<Pair<String?, String>>(null to "All", "income" to "Income", "expense" to "Expense", "transfer" to "Transfer")

/**
 * One account's page: its balance and this month's money in and out, actions (add a transaction in it, adjust the balance,
 * edit, archive, delete), a card's statement, the balance over time, and the account's own transactions, each with its effect
 * on this account and the balance right after it. [onBack] is called when the account is archived or deleted.
 */
@Composable
fun AccountDetailScreen(api: Api, accountId: String, onBack: () -> Unit) {
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var account by remember { mutableStateOf<Account?>(null) }
    var allAccounts by remember { mutableStateOf<List<Account>>(emptyList()) }
    var failed by remember { mutableStateOf<String?>(null) }
    var month by remember { mutableStateOf<Totals?>(null) }
    var statement by remember { mutableStateOf<CardStatement?>(null) }
    var balances by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var range by remember { mutableStateOf(HistoryRange.Quarter) }
    var history by remember { mutableStateOf<BalanceHistory?>(null) }

    var query by remember { mutableStateOf("") }
    var committed by remember { mutableStateOf("") }
    var type by remember { mutableStateOf<String?>(null) }
    val items = remember { mutableStateListOf<Transaction>() }
    var total by remember { mutableStateOf<Int?>(null) }
    var loadingList by remember { mutableStateOf(true) }
    var loadingMore by remember { mutableStateOf(false) }
    var generation by remember { mutableIntStateOf(0) }

    var selected by remember { mutableStateOf<Transaction?>(null) }
    var adding by remember { mutableStateOf(false) }
    var adjusting by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    var repaying by remember { mutableStateOf<AddForm?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    LaunchedEffect(query) { delay(300); committed = query.trim() }

    fun params(): Map<String, Any> = buildMap {
        put("account_id", accountId)
        if (committed.isNotEmpty()) put("q", committed)
        type?.let { put("type", it) }
    }

    // the account, what it did this month, its statement and the balance after each transaction
    LaunchedEffect(reload) {
        val a = api.get<Account>("accounts/$accountId")
        if (a is ApiResult.Failed) { failed = a.message; return@LaunchedEffect }
        val acc = (a as ApiResult.Ok).data
        account = acc
        allAccounts = (api.get<List<Account>>("accounts") as? ApiResult.Ok)?.data.orEmpty()
        val (from, to) = monthBounds(LocalDate.now())
        month = (api.get<Totals>("transactions/summary", mapOf("account_id" to accountId, "date_from" to "$from", "date_to" to "$to")) as? ApiResult.Ok)?.data
        statement = if (acc.group == "card" && acc.statementDay != null) (api.get<CardStatement>("accounts/$accountId/statement") as? ApiResult.Ok)?.data else null
        balances = (api.get<List<BalanceAfter>>("accounts/$accountId/balances-after", mapOf("limit" to "500")) as? ApiResult.Ok)?.data.orEmpty().associate { it.transactionId to it.balance }
        refreshing = false
    }
    LaunchedEffect(range, reload) {
        history = (api.get<BalanceHistory>("accounts/$accountId/balance-history", mapOf("days" to "${range.days}")) as? ApiResult.Ok)?.data
    }
    LaunchedEffect(committed, type, reload) {
        generation++
        if (!refreshing) loadingList = true
        when (val r = api.get<List<Transaction>>("transactions", params() + mapOf("limit" to "$PAGE", "offset" to "0"))) {
            is ApiResult.Ok -> { items.clear(); items.addAll(r.data); total = r.total ?: r.data.size }
            is ApiResult.Failed -> {}
        }
        loadingList = false
    }
    LaunchedEffect(listState) {
        snapshotFlow { (listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) to listState.layoutInfo.totalItemsCount }.collect { (last, count) ->
            val all = total ?: return@collect
            if (!loadingList && !loadingMore && items.size < all && count > 0 && last >= count - 6) {
                loadingMore = true
                val gen = generation
                val r = api.get<List<Transaction>>("transactions", params() + mapOf("limit" to "$PAGE", "offset" to "${items.size}"))
                if (gen == generation && r is ApiResult.Ok) items.addAll(r.data)
                loadingMore = false
            }
        }
    }

    val acc = account
    when {
        failed != null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(failed ?: "", color = MaterialTheme.colorScheme.error)
            Button(onClick = { failed = null; reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
        }
        acc == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
            val groups = groupByDay(items.toList())
            LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(bottom = 24.dp)) {
                item { Header(acc, month) }
                item {
                    Actions(
                        acc,
                        onAdd = { adding = true }, onAdjust = { adjusting = true }, onEdit = { editing = true },
                        onArchive = {
                            scope.launch {
                                when (val r = api.post("accounts/${acc.id}/archive")) {
                                    is ApiResult.Ok -> {
                                        onBack()
                                        if (snackbar?.showSnackbar("${acc.name} archived", actionLabel = "Undo", duration = SnackbarDuration.Long) == SnackbarResult.ActionPerformed) api.post("accounts/${acc.id}/unarchive")
                                    }
                                    is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                                }
                            }
                        },
                        onDelete = { deleting = true },
                    )
                }
                statement?.let { st -> item { StatementPanel(st) { repaying = repayForm(acc, st.remaining, null) } } }
                item { BalanceChart(acc, history, range) { range = it } }
                item {
                    Column {
                        SearchPill(query, { query = it.take(100) }, Modifier.padding(horizontal = 16.dp, vertical = 6.dp), placeholder = "Search this account")
                        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            TYPES.forEach { (value, label) ->
                                val tint = when (value) { "income" -> ChartColors.IncomeLight; "expense" -> MaterialTheme.colorScheme.error; "transfer" -> ChartColors.Line; else -> MaterialTheme.colorScheme.outline }
                                TintChip(tint, type == value, { type = value }, { Text(label) })
                            }
                        }
                    }
                }
                if (!loadingList && items.isEmpty()) item {
                    Text(if (committed.isNotEmpty() || type != null) "Nothing matches." else "No transactions in this account yet.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(24.dp))
                }
                groups.forEach { (day, list) ->
                    stickyHeader(key = "d-$day") {
                        Surface(color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                            Text(dayLabel(day), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp))
                        }
                    }
                    items(list.size, key = { list[it].id }) { i ->
                        val t = list[i]
                        MorphTile({ selected = t }, first = i == 0, last = i == list.lastIndex, modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 2.dp)) {
                            AccountTransactionRow(t, acc, balances[t.id])
                        }
                    }
                }
                if (loadingMore) item { Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
            }
        }
    }

    selected?.let { t -> TransactionDetailHost(api, t, scope, onClose = { selected = null }, onChanged = { reload++ }) }
    if (adding && acc != null) AddTransactionScreen(
        api, onClose = { adding = false }, onSaved = { adding = false; reload++; scope.launch { snackbar?.showSnackbar("Transaction added") } },
        initial = AddForm(accountId = acc.id, rate = tidyRate(acc.exchangeRate), method = suggestedMethod(acc.group)),
    )
    repaying?.let { form ->
        AddTransactionScreen(api, onClose = { repaying = null }, onSaved = { repaying = null; reload++; scope.launch { snackbar?.showSnackbar("Repayment added") } }, initial = form)
    }
    if (adjusting && acc != null) AdjustBalanceDialog(api, acc, { adjusting = false }) { adjusting = false; reload++; scope.launch { snackbar?.showSnackbar("Balance adjusted") } }
    if (editing && acc != null) AccountFormScreen(api, allAccounts, acc, { editing = false }) { editing = false; reload++; scope.launch { snackbar?.showSnackbar("Changes saved") } }
    if (deleting && acc != null) {
        ConfirmDialog(
            "Delete ${acc.name}?",
            if (acc.transactionCount > 0) "Its ${acc.transactionCount} transactions stay in your history but lose this account. Archive it instead to keep them tied to it. This can't be undone." else "This can't be undone.",
            "Delete", onDismiss = { deleting = false },
            onConfirm = {
                deleting = false
                scope.launch {
                    when (val r = api.delete("accounts/${acc.id}")) {
                        is ApiResult.Ok -> { onBack(); snackbar?.showSnackbar("${acc.name} deleted") }
                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                    }
                }
            },
        )
    }
}

/** The balance, in its colour, with what came in and went out this month. */
@Composable
private fun Header(a: Account, month: Totals?) {
    val tint = idTint(a.id)
    val negative = a.balance.startsWith("-")
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Surface(shape = MaterialTheme.shapes.extraLarge, color = tint.copy(alpha = 0.14f)) {
            Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(if (a.isLiability) "Owed" else "Balance", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    formatMoney(if (a.isLiability) a.balance.removePrefix("-") else a.balance, a.currency),
                    style = MaterialTheme.typography.headlineMedium.merge(MoneyStyle),
                    color = if (negative && !a.isLiability) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                )
                if (a.currency != month?.currency && month != null && a.exchangeRate.toBigDecimalOrNull()?.compareTo(java.math.BigDecimal.ONE) != 0) {
                    Text("≈ ${formatMoney(a.baseBalance, month.currency)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(listOfNotNull(groupLabel(a.group), a.bank, a.accountNumber).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                creditLine(a)?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
        if (month != null) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MonthCard("In this month", month.income, month.currency, ChartColors.IncomeLight, Modifier.weight(1f))
            MonthCard("Out this month", month.expense, month.currency, MaterialTheme.colorScheme.error, Modifier.weight(1f))
        }
    }
}

private fun creditLine(a: Account): String? =
    app.maalu.data.creditUsage(a.balance, a.creditLimit)?.let { "${it.percent}% of ${formatMoney(it.limit.toPlainString(), a.currency)} used" }

@Composable
private fun MonthCard(label: String, amount: String, currency: String, tint: Color, modifier: Modifier) {
    Surface(modifier, shape = MaterialTheme.shapes.large, color = tint.copy(alpha = 0.16f)) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            MoneyText(amount, currency, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
        }
    }
}

@Composable
private fun Actions(a: Account, onAdd: () -> Unit, onAdjust: () -> Unit, onEdit: () -> Unit, onArchive: () -> Unit, onDelete: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = onAdd, shapes = ButtonDefaults.shapes()) { Icon(Icons.Outlined.Add, null, Modifier.padding(end = 6.dp)); Text("Add transaction") }
            Button(onClick = onAdjust, shapes = ButtonDefaults.shapes(), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.Tune, null, Modifier.padding(end = 6.dp)); Text("Adjust balance") }
            Button(onClick = onEdit, shapes = ButtonDefaults.shapes(), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.Edit, null, Modifier.padding(end = 6.dp)); Text("Edit") }
            Button(onClick = onArchive, shapes = ButtonDefaults.shapes(), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.Archive, null, Modifier.padding(end = 6.dp)); Text("Archive") }
            OutlinedButton(onClick = onDelete, shapes = ButtonDefaults.shapes(), colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Icon(Icons.Outlined.Delete, null, Modifier.padding(end = 6.dp)); Text("Delete") }
        }
    }
}

/** A card's latest statement: what to pay and by when, the four figures, and Repay. */
@Composable
private fun StatementPanel(s: CardStatement, onRepay: () -> Unit) {
    val tint = when (s.state) { "overdue" -> MaterialTheme.colorScheme.error; "paid", "none" -> ChartColors.IncomeLight; else -> Color(0xFFEAB308) }
    Surface(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), shape = MaterialTheme.shapes.extraLarge, color = tint.copy(alpha = 0.14f)) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Statement", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(statementLine(s), style = MaterialTheme.typography.titleSmall)
            StatementFigure("Statement balance", s.statementBalance, s.currency)
            StatementFigure("Paid since", s.paidSince, s.currency)
            StatementFigure("Spent since (next statement)", s.spentSince, s.currency)
            StatementFigure("Owed now", s.owedNow, s.currency)
            if (s.remaining.toBigDecimalOrNull()?.signum()?.let { it > 0 } == true) Button(onClick = onRepay, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth()) { Text("Repay ${formatMoney(s.remaining, s.currency)}") }
        }
    }
}

@Composable
private fun StatementFigure(label: String, amount: String, currency: String) {
    Row(Modifier.fillMaxWidth()) {
        Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        MoneyText(amount, currency, style = MaterialTheme.typography.bodySmall)
    }
}

/** The balance at the end of each day, as a line, with 30 days / 90 days / 1 year and the figures that matter. */
@Composable
private fun BalanceChart(a: Account, history: BalanceHistory?, range: HistoryRange, onRange: (HistoryRange) -> Unit) {
    Surface(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Balance over time", style = MaterialTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                HistoryRange.entries.forEachIndexed { i, r -> TintChip(Accents.getValue(listOf("blue", "violet", "pink")[i]), range == r, { onRange(r) }, { Text(r.label) }) }
            }
            val points: List<AccountBalancePoint> = history?.points.orEmpty()
            if (points.size < 2) Text(if (history == null) "Loading…" else "Not enough history yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            else {
                LineChart(points.map { it.balance.toDoubleOrNull() ?: 0.0 }, ChartColors.Line)
                historySummary(points)?.let { s ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Summary("Start", s.start.toPlainString(), a.currency); Summary("End", s.end.toPlainString(), a.currency)
                        Summary("Low", s.low.toPlainString(), a.currency); Summary("High", s.high.toPlainString(), a.currency)
                    }
                }
            }
        }
    }
}

@Composable
private fun Summary(label: String, amount: String, currency: String) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        MoneyText(amount, currency, style = MaterialTheme.typography.labelMedium)
    }
}

/** A transaction as this account sees it: its effect on the balance and what the balance was right after it. */
@Composable
private fun AccountTransactionRow(t: Transaction, account: Account, balanceAfter: String?) {
    val effect = accountEffect(t, account.id)
    Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        CategoryBadge(t)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(t.title(), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 2, overflow = TextOverflow.Ellipsis)
            val sub = listOfNotNull(shortTime(t.time), t.category.takeIf { t.type != "transfer" }, effect.counterpart).joinToString(" · ")
            Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            val marks = listOfNotNull("Planned".takeIf { t.planned }, "Refund".takeIf { t.isRefund }, "Adjustment".takeIf { t.adjustment })
            if (marks.isNotEmpty()) Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 2.dp)) { marks.forEach { Mark(it) } }
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                (if (effect.positive) "+" else "−") + formatMoney(effect.amount, effect.currency),
                style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle),
                color = if (effect.positive) ChartColors.IncomeLight else MaterialTheme.colorScheme.error,
            )
            // planned transactions are not in the balance yet, so they have none after them
            if (balanceAfter != null && !t.planned) Text("Balance ${formatMoney(balanceAfter, account.currency)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** Set the balance to what the bank shows, or add or take away an amount; a preview shows what it would record. */
@Composable
private fun AdjustBalanceDialog(api: Api, a: Account, onClose: () -> Unit, onDone: () -> Unit) {
    var mode by remember { mutableStateOf(AdjustMode.Balance) }
    var typed by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val preview = adjustmentPreview(a.balance, mode, typed)
    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text("Adjust ${a.name}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SegmentedPills(
                    listOf(AdjustMode.Balance to "Set balance", AdjustMode.Amount to "Add or take away"), mode, { mode = it; error = null },
                    tint = { Accents.getValue(if (it == AdjustMode.Balance) "blue" else "violet") }, enabled = !busy,
                )
                CompactField(
                    typed, { typed = cleanSigned(it); error = null }, if (mode == AdjustMode.Balance) "What the bank shows" else "For example -50 or 200",
                    keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = error != null, suffix = a.currency,
                )
                CompactField(note, { note = it.take(200) }, "Note (optional)", enabled = !busy)
                Text("Now ${formatMoney(a.balance, a.currency)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                preview?.let { p ->
                    Text(
                        if (p.kind == null) "Nothing would change." else "Balance becomes ${formatMoney(p.after.toPlainString(), a.currency)}; records ${if (p.kind == "income") "an income" else "an expense"} of ${formatMoney(p.amount.toPlainString(), a.currency)}.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy && preview != null && preview.kind != null, onClick = {
                busy = true
                scope.launch {
                    when (val r = api.postJson<kotlinx.serialization.json.JsonElement>("accounts/${a.id}/adjust", adjustJson(mode, typed, note).toString())) {
                        is ApiResult.Ok -> onDone()
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Saving…" else "Adjust") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}
