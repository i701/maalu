@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import app.maalu.ui.components.elevation
import app.maalu.data.isSummary
import androidx.compose.foundation.lazy.items
import java.math.BigDecimal
import app.maalu.ui.components.SummaryPill
import app.maalu.ui.components.SummaryDonut
import app.maalu.ui.components.SummaryBlue
import app.maalu.ui.components.MiniBar
import app.maalu.ui.components.FlatSummary
import app.maalu.ui.components.DonutPart
import app.maalu.data.spendingChangeText
import app.maalu.data.shareOf
import app.maalu.data.netRows
import app.maalu.data.monthShort
import app.maalu.data.dashboardSections
import androidx.compose.material3.HorizontalDivider
import androidx.compose.foundation.lazy.itemsIndexed
import app.maalu.data.CategoryMonths
import kotlinx.coroutines.launch
import app.maalu.data.orderSections
import app.maalu.data.mergeOrder
import app.maalu.data.DashboardLayout
import app.maalu.data.DashboardStore
import app.maalu.data.DashboardSection
import androidx.compose.ui.platform.LocalContext
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.collectAsState
import androidx.compose.foundation.lazy.rememberLazyListState
import app.maalu.ui.components.fadingEdges
import app.maalu.ui.components.SpringBar
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.ArrowDownward
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.ArrowUpward
import app.maalu.ui.components.Disclosure
import app.maalu.ui.components.RaisedButton
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import app.maalu.data.shortDate
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.maalu.data.Api
import app.maalu.data.incomeRule
import app.maalu.data.Account
import app.maalu.data.ApiResult
import app.maalu.data.AvailableToSpend
import app.maalu.data.CategoryTotal
import app.maalu.data.CategoryTotals
import app.maalu.data.Totals
import app.maalu.data.Budget
import app.maalu.data.Goal
import app.maalu.data.Monthly
import app.maalu.data.MonthlyPoint
import app.maalu.data.Transaction
import app.maalu.data.kindShares
import app.maalu.data.formatMoney
import app.maalu.ui.components.MoneyText
import app.maalu.data.kept
import app.maalu.data.monthBounds
import app.maalu.data.monthLabel
import app.maalu.data.percentChange
import app.maalu.data.spendingRows
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.MoneyStyle
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.time.LocalDate

private data class DashboardData(
    val totals: Totals,
    val before: Totals,
    val categories: List<CategoryTotal>,
    val available: AvailableToSpend?,
    // the page works without any of these
    val monthly: List<MonthlyPoint> = emptyList(),
    val budget: Budget? = null,
    val goals: List<Goal> = emptyList(),
    // null when the load failed, so the card does not claim there are none
    val latest: List<Transaction>? = null,
    val upcoming: List<Transaction>? = null,
    val accounts: List<Account> = emptyList(),
    val categoryMonths: CategoryMonths? = null,
    /** Something above failed to load, so a card may be missing. */
    val partial: Boolean = false,
)

private sealed interface State {
    data object Loading : State
    data class Ready(val data: DashboardData) : State
    data class Failed(val message: String) : State
}

/** Home: available to spend, the month's income, spending and what was kept, and where it went. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(api: Api, month: String, onOpenPlan: () -> Unit = {}) {
    var attempt by remember { mutableIntStateOf(0) }
    // a pull keeps what is on screen and shows only the pull indicator; a new month or a retry blanks it
    var refreshing by remember { mutableStateOf(false) }
    val on = LocalDate.parse(month)
    val context = LocalContext.current
    val store = remember { DashboardStore(context.applicationContext) }
    // null until read, so a switched-off card never flashes up
    val layout by store.layout.collectAsState(initial = null)
    var arranging by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val state by produceState<State>(State.Loading, month, attempt) {
        if (!refreshing) value = State.Loading
        val (start, end) = monthBounds(on)
        val (pStart, pEnd) = monthBounds(on.minusMonths(1))
        value = coroutineScope {
            val totals = async { api.get<Totals>("transactions/summary", mapOf("date_from" to "$start", "date_to" to "$end")) }
            val before = async { api.get<Totals>("transactions/summary", mapOf("date_from" to "$pStart", "date_to" to "$pEnd")) }
            val cats = async { api.get<CategoryTotals>("transactions/categories", mapOf("date_from" to "$start", "date_to" to "$end")) }
            val avail = async { api.get<AvailableToSpend>("stats/available-to-spend") }
            val monthlyCall = async { api.get<Monthly>("stats/monthly", mapOf("months" to "12", "to" to "$end")) }
            val budgetCall = async { api.get<Budget>("budget", mapOf("on" to "$start")) }
            val categoryMonthsCall = async {
                api.get<CategoryMonths>("transactions/categories/monthly", mapOf("date_from" to "${start.minusMonths(11)}", "date_to" to "$end"))
            }
            val goalsCall = async { api.get<List<Goal>>("goals") }
            val latestCall = async { api.get<List<Transaction>>("transactions", mapOf("limit" to "5")) }
            val accountsCall = async { api.get<List<Account>>("accounts") }
            val upcomingCall = async { api.get<List<Transaction>>("transactions", mapOf("planned" to "true", "limit" to "5")) }
            val t = totals.await(); val b = before.await(); val c = cats.await(); val a = avail.await()
            val extras = listOf(a, monthlyCall.await(), budgetCall.await(), categoryMonthsCall.await(), goalsCall.await(), latestCall.await(), upcomingCall.await(), accountsCall.await())
            when {
                t is ApiResult.Failed -> State.Failed(t.message)
                b is ApiResult.Failed -> State.Failed(b.message)
                c is ApiResult.Failed -> State.Failed(c.message)
                else -> State.Ready(
                    DashboardData(
                        (t as ApiResult.Ok).data, (b as ApiResult.Ok).data, (c as ApiResult.Ok).data.categories,
                        (a as? ApiResult.Ok)?.data,
                        (monthlyCall.await() as? ApiResult.Ok)?.data?.months.orEmpty(),
                        (budgetCall.await() as? ApiResult.Ok)?.data,
                        (goalsCall.await() as? ApiResult.Ok)?.data.orEmpty(),
                        (latestCall.await() as? ApiResult.Ok)?.data,
                        (upcomingCall.await() as? ApiResult.Ok)?.data,
                        (accountsCall.await() as? ApiResult.Ok)?.data.orEmpty(),
                        categoryMonths = (categoryMonthsCall.await() as? ApiResult.Ok)?.data,
                        partial = extras.any { it is ApiResult.Failed },
                    ),
                )
            }
        }
        refreshing = false
    }

    Column(Modifier.fillMaxSize()) {
        when (val s = state) {
            State.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            is State.Failed -> Column(
                Modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(s.message, color = MaterialTheme.colorScheme.error)
                RaisedButton(onClick = { attempt++ }) { Text("Try again") }
            }
            is State.Ready -> PullToRefreshBox(
                isRefreshing = refreshing,
                onRefresh = { refreshing = true; attempt++ },
                modifier = Modifier.fillMaxSize(),
            ) {
                val listState = rememberLazyListState()
                LazyColumn(
                Modifier.fillMaxSize().fadingEdges(listState),
                state = listState,
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // available to spend is for the current budget period only, so it is hidden for other months
                val isThisMonth = on == LocalDate.now().withDayOfMonth(1)
                val available = s.data.available?.takeIf { isThisMonth }
                val (order, off) = layout ?: return@LazyColumn
                val defaults = dashboardSections(hasAvailable = available != null)
                val onShow = orderSections(order, defaults).filter { it.id !in off }
                if (s.data.partial) item(key = "partial") {
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Part of the dashboard couldn't load.", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                        TextButton(onClick = { refreshing = true; attempt++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
                    }
                }
                itemsIndexed(onShow, key = { _, it -> it.id }) { i, section ->
                    // neighbouring summaries share the page, parted by a hairline
                    if (section.isSummary && onShow.getOrNull(i - 1)?.isSummary == true) HorizontalDivider(Modifier.padding(bottom = 12.dp))
                    when (section) {
                        DashboardSection.Available -> available?.let { AvailableSummary(it, onOpenPlan) }
                        DashboardSection.Metrics -> KeptSummary(s.data.totals, s.data.before, s.data.monthly)
                        DashboardSection.Spending -> SpendingCard(s.data.categories, s.data.totals.currency)
                        // net worth is on Accounts, as on iOS; the id stays because a saved order may have it
                        DashboardSection.Balance -> Unit
                        DashboardSection.Monthly -> CashFlowCard(s.data.monthly, s.data.totals.currency)
                        DashboardSection.Budget -> BudgetGoalsCard(s.data.budget, s.data.goals)
                        DashboardSection.SpendingTrend -> s.data.categoryMonths?.let { SpendingTrendCard(it) }
                        DashboardSection.NeedsWants -> NeedsWantsCard(kindShares(s.data.categories), s.data.totals.currency, incomeRule(s.data.categories))
                        DashboardSection.MoneyFlow -> MoneyFlowCard(s.data.categories, s.data.totals.currency)
                        DashboardSection.Credit -> CreditUsageCard(s.data.accounts)
                        DashboardSection.Upcoming -> TransactionsCard("Coming up", null, s.data.upcoming, "Nothing planned.")
                        DashboardSection.Latest -> TransactionsCard("Latest transactions", null, s.data.latest, "No transactions yet.")
                    }
                }
                item(key = "arrange") {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        TextButton(onClick = { arranging = true }, shapes = ButtonDefaults.shapes()) { Text("Arrange the dashboard") }
                    }
                }
            }
                if (arranging) {
                    val available = s.data.available?.takeIf { on == LocalDate.now().withDayOfMonth(1) }
                    val defaults = dashboardSections(hasAvailable = available != null)
                    val saved = layout?.order.orEmpty()
                    val shown = orderSections(saved, defaults)
                    ArrangeDashboard(
                        shown, defaults, layout?.hidden.orEmpty(),
                        onSave = { arranged, off ->
                            val next = when (arranged) {
                                shown -> saved
                                defaults -> emptyList()
                                else -> mergeOrder(saved, arranged)
                            }
                            // outlives the dialog, which closes at once
                            scope.launch { store.save(DashboardLayout(next, off)) }
                        },
                        onClose = { arranging = false },
                    )
                }
            }
        }
    }
}

@Composable
private fun AvailableSummary(a: AvailableToSpend, onOpenPlan: () -> Unit) {
    val short = a.available.startsWith("-")
    var open by rememberSaveable { mutableStateOf(false) }
    FlatSummary(if (short) MaterialTheme.colorScheme.error else SummaryBlue) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(if (short) "Short by" else "Available to spend", Modifier.weight(1f).semantics { heading() }, style = MaterialTheme.typography.titleSmall)
            SummaryPill("until ${shortDate(a.periodEnd)}")
        }
        MoneyText(a.available.removePrefix("-"), a.currency, style = MaterialTheme.typography.displaySmall)
        Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryPill(if (open) "Hide the working" else "Show the working", Modifier.semantics { stateDescription = if (open) "Expanded" else "Collapsed" }) { open = !open }
            SummaryPill("Month plan", onClick = onOpenPlan)
        }
        Disclosure(open) { Working(a) }
    }
}

/** Every figure behind the number: what each account holds, each bill, card payment and goal. */
@Composable
private fun Working(a: AvailableToSpend) {
    @Composable
    fun line(label: String, amount: String, note: String? = null, bad: Boolean = false) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.bodyMedium)
                if (note != null) Text(note, style = MaterialTheme.typography.bodySmall, color = if (bad) MaterialTheme.colorScheme.error else LocalContentColor.current.copy(alpha = 0.75f))
            }
            MoneyText(amount, a.currency, style = MaterialTheme.typography.bodyMedium)
        }
    }
    @Composable
    fun heading(text: String) = Text(text, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 10.dp))

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        heading("In your everyday accounts")
        a.accounts.forEach { line(it.name, it.balance) }
        if (a.bills.isNotEmpty()) {
            heading("Bills still to pay")
            a.bills.forEach { b ->
                line(b.title, b.amount, (if (b.overdue) "Overdue · " else "") + shortDate(b.date) + if (b.estimate) " · estimate" else "", b.overdue)
            }
        }
        if (a.cardPayments.isNotEmpty()) {
            heading("Credit card payments")
            a.cardPayments.forEach { line(it.title, it.amount, (if (it.overdue) "Overdue · " else "") + shortDate(it.date), it.overdue) }
        }
        if (a.reserved.isNotEmpty()) {
            heading("Set aside for goals")
            a.reserved.forEach { line(it.name, it.amount) }
        }
        Text(
            "Planned income is not counted until it arrives.",
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

/** What was kept this month, how spending moved, and the income split into kept and spent with the last six months' bars. */
@Composable
private fun KeptSummary(now: Totals, before: Totals, months: List<MonthlyPoint>) {
    val saved = kept(now.income, now.expense)
    val income = now.income.toBigDecimalOrNull() ?: BigDecimal.ZERO
    val spent = now.expense.toBigDecimalOrNull() ?: BigDecimal.ZERO
    FlatSummary(SummaryBlue) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Kept this month", Modifier.weight(1f).semantics { heading() }, style = MaterialTheme.typography.titleSmall)
            spendingChangeText(now.expense, before.expense)?.let { SummaryPill(it) }
        }
        MoneyText(saved, now.currency, style = MaterialTheme.typography.displaySmall)
        // with no income there is nothing to divide
        shareOf(spent, income)?.let { share ->
            Text("of ${formatMoney(now.income, now.currency)} income", style = MaterialTheme.typography.bodySmall)
            val rows = netRows(months.takeLast(6))
            SummaryDonut(
                DonutPart("Kept", 1f - share, formatMoney((income - spent).max(BigDecimal.ZERO).toPlainString(), now.currency)),
                DonutPart("Spent", share, formatMoney(now.expense, now.currency)),
                rows.mapIndexed { i, r -> MiniBar(monthShort(r.month).take(1), r.kept.toFloat(), i == rows.lastIndex) },
            )
        }
    }
}
/** Ranked bars: the six biggest categories and the rest as Other. */
@Composable
private fun SpendingCard(categories: List<CategoryTotal>, currency: String) {
    val rows = spendingRows(categories)
    Surface(modifier = Modifier.elevation(2, MaterialTheme.shapes.extraLarge), shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Spending by category", Modifier.semantics { heading() }, style = MaterialTheme.typography.titleMedium)
            if (rows.isEmpty()) {
                Text("No spending this month.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            rows.forEach { row ->
                val color = Accents[row.color] ?: MaterialTheme.colorScheme.outline
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row {
                        Text(row.name, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                        MoneyText(row.total.toPlainString(), currency, style = MaterialTheme.typography.bodyMedium)
                    }
                    SpringBar(row.share.toFloat(), color, 8.dp)
                }
            }
        }
    }
}
