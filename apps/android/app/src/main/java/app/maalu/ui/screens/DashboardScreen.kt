@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

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
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.material3.Button
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.AvailableToSpend
import app.maalu.data.CategoryTotal
import app.maalu.data.CategoryTotals
import app.maalu.data.Totals
import app.maalu.data.BalancePoint
import app.maalu.data.BalanceTrend
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
import app.maalu.ui.theme.Gradients
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
    val trend: List<BalancePoint> = emptyList(),
    val monthly: List<MonthlyPoint> = emptyList(),
    val budget: Budget? = null,
    val goals: List<Goal> = emptyList(),
    val latest: List<Transaction> = emptyList(),
    val upcoming: List<Transaction> = emptyList(),
)

private sealed interface State {
    data object Loading : State
    data class Ready(val data: DashboardData) : State
    data class Failed(val message: String) : State
}

/** Home: available to spend, the month's income, spending and what was kept, and where it went. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(api: Api, month: String) {
    var attempt by remember { mutableIntStateOf(0) }
    // a pull keeps what is on screen and shows only the pull indicator; a new month or a retry blanks it
    var refreshing by remember { mutableStateOf(false) }
    val on = LocalDate.parse(month)

    val state by produceState<State>(State.Loading, month, attempt) {
        if (!refreshing) value = State.Loading
        val (start, end) = monthBounds(on)
        val (pStart, pEnd) = monthBounds(on.minusMonths(1))
        value = coroutineScope {
            val totals = async { api.get<Totals>("transactions/summary", mapOf("date_from" to "$start", "date_to" to "$end")) }
            val before = async { api.get<Totals>("transactions/summary", mapOf("date_from" to "$pStart", "date_to" to "$pEnd")) }
            val cats = async { api.get<CategoryTotals>("transactions/categories", mapOf("date_from" to "$start", "date_to" to "$end")) }
            val avail = async { api.get<AvailableToSpend>("stats/available-to-spend") }
            val today = LocalDate.now()
            val trendEnd = if (end > today && start <= today) today else end
            val trendCall = async { api.get<BalanceTrend>("stats/balance-trend", mapOf("from" to "$start", "to" to "$trendEnd")) }
            val monthlyCall = async { api.get<Monthly>("stats/monthly", mapOf("months" to "6", "to" to "$end")) }
            val budgetCall = async { api.get<Budget>("budget", mapOf("on" to "$start")) }
            val goalsCall = async { api.get<List<Goal>>("goals") }
            val latestCall = async { api.get<List<Transaction>>("transactions", mapOf("limit" to "5")) }
            val upcomingCall = async { api.get<List<Transaction>>("transactions", mapOf("planned" to "true", "limit" to "5")) }
            val t = totals.await(); val b = before.await(); val c = cats.await(); val a = avail.await()
            when {
                t is ApiResult.Failed -> State.Failed(t.message)
                b is ApiResult.Failed -> State.Failed(b.message)
                c is ApiResult.Failed -> State.Failed(c.message)
                else -> State.Ready(
                    DashboardData(
                        (t as ApiResult.Ok).data, (b as ApiResult.Ok).data, (c as ApiResult.Ok).data.categories,
                        (a as? ApiResult.Ok)?.data,
                        (trendCall.await() as? ApiResult.Ok)?.data?.points.orEmpty(),
                        (monthlyCall.await() as? ApiResult.Ok)?.data?.months.orEmpty(),
                        (budgetCall.await() as? ApiResult.Ok)?.data,
                        (goalsCall.await() as? ApiResult.Ok)?.data.orEmpty(),
                        (latestCall.await() as? ApiResult.Ok)?.data.orEmpty(),
                        (upcomingCall.await() as? ApiResult.Ok)?.data.orEmpty(),
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
                Button(onClick = { attempt++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
            }
            is State.Ready -> PullToRefreshBox(
                isRefreshing = refreshing,
                onRefresh = { refreshing = true; attempt++ },
                modifier = Modifier.fillMaxSize(),
            ) { LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // available to spend is for the current budget period only, so it is hidden for other months
                val isThisMonth = on == LocalDate.now().withDayOfMonth(1)
                s.data.available?.takeIf { isThisMonth }?.let { item { AvailableCard(it) } }
                item { MonthStrip(s.data.totals, s.data.before) }
                item { SpendingCard(s.data.categories, s.data.totals.currency) }
                item { NetWorthCard(s.data.trend, s.data.totals.currency) }
                item { CashFlowCard(s.data.monthly, s.data.totals.currency) }
                item { BudgetGoalsCard(s.data.budget, s.data.goals) }
                item { NeedsWantsCard(kindShares(s.data.categories), s.data.totals.currency) }
                item { TransactionsCard("Coming up", null, s.data.upcoming, "Nothing planned.", LocalDate.now().toString()) }
                item { TransactionsCard("Latest transactions", null, s.data.latest, "No transactions yet.", LocalDate.now().toString()) }
            } }
        }
    }
}

/** The sum in words, like the web card's "Show the working" line. */
private fun working(a: AvailableToSpend): String {
    val parts = mutableListOf("${formatMoney(a.balance, a.currency)} in ${a.accounts.size} ${if (a.accounts.size == 1) "account" else "accounts"}")
    if (a.bills.isNotEmpty()) parts += "less ${formatMoney(a.billsTotal, a.currency)} for ${a.bills.size} ${if (a.bills.size == 1) "bill" else "bills"}"
    if (a.cardPayments.isNotEmpty()) parts += "${formatMoney(a.cardPaymentsTotal, a.currency)} for card payments"
    if (a.reserved.isNotEmpty()) parts += "${formatMoney(a.reservedTotal, a.currency)} set aside"
    return parts.joinToString(", ")
}

@Composable
private fun AvailableCard(a: AvailableToSpend) {
    val short = a.available.startsWith("-")
    var open by rememberSaveable { mutableStateOf(false) }
    Surface(
        shape = MaterialTheme.shapes.extraLarge,
        color = if (short) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.primaryContainer,
        contentColor = if (short) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onPrimaryContainer,
    ) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(if (short) "Short by" else "Available to spend", style = MaterialTheme.typography.labelLarge)
            Text(
                formatMoney(a.available.removePrefix("-"), a.currency),
                style = MaterialTheme.typography.headlineLarge.merge(MoneyStyle),
            )
            Text("until ${shortDate(a.periodEnd)}", style = MaterialTheme.typography.bodySmall)
            Text(working(a), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
            TextButton(onClick = { open = !open }, contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp)) {
                Text(if (open) "Hide the working" else "Show the working")
            }
            AnimatedVisibility(open) { Working(a) }
        }
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
            Text(formatMoney(amount, a.currency), style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle))
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

/** Income, Spent and Saved on one slim gradient strip, each with its change against last month. */
@Composable
private fun MonthStrip(now: Totals, before: Totals) {
    val saved = kept(now.income, now.expense)
    val savedBefore = kept(before.income, before.expense)
    val stops = Gradients.Emerald[0] to Gradients.Emerald[1]
    val brush = Brush.horizontalGradient(
        0f to stops.first, 0.22f to stops.second, 0.38f to Gradients.Rose[1], 0.5f to Gradients.Rose[0],
        0.62f to Gradients.Rose[1], 0.78f to Gradients.Blue[1], 1f to Gradients.Blue[0],
    )
    Row(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.extraLarge).background(brush).padding(vertical = 12.dp),
    ) {
        StripCell("Income", now.income, now.currency, percentChange(now.income, before.income), goodWhenUp = true, first = true, Modifier.weight(1f))
        StripCell("Spent", now.expense, now.currency, percentChange(now.expense, before.expense), goodWhenUp = false, first = false, Modifier.weight(1f))
        StripCell("Saved", saved, now.currency, percentChange(saved, savedBefore), goodWhenUp = true, first = false, Modifier.weight(1f))
    }
}

@Composable
private fun StripCell(label: String, amount: String, currency: String, percent: Double?, goodWhenUp: Boolean, first: Boolean, modifier: Modifier) {
    val white = Color.White
    Column(
        modifier.padding(horizontal = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = white.copy(alpha = 0.78f))
        // tight place: short from 10,000 up (the exact figure is on the Transactions totals later)
        MoneyText(amount, currency, color = white, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 13.sp, fontWeight = FontWeight.SemiBold), textAlign = TextAlign.Center)
        val rounded = percent?.let { Math.round(it).toInt() }
        when {
            rounded == null -> Unit
            rounded == 0 -> Text("No change", style = MaterialTheme.typography.labelSmall, color = white.copy(alpha = 0.8f))
            else -> {
                val up = rounded > 0
                // pale tints that read on the dark gradient; the arrow carries the meaning too
                val tint = if (up == goodWhenUp) Color(0xFFA7F3D0) else Color(0xFFFECDD3)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(if (up) Icons.Outlined.ArrowUpward else Icons.Outlined.ArrowDownward, null, tint = tint, modifier = Modifier.height(12.dp))
                    Text("${kotlin.math.abs(rounded)}%", style = MaterialTheme.typography.labelSmall, color = tint, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

/** Ranked bars: the six biggest categories and the rest as Other. */
@Composable
private fun SpendingCard(categories: List<CategoryTotal>, currency: String) {
    val rows = spendingRows(categories)
    Surface(shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Spending by category", style = MaterialTheme.typography.titleMedium)
            if (rows.isEmpty()) {
                Text("No spending this month.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            rows.forEach { row ->
                val color = Accents[row.color] ?: MaterialTheme.colorScheme.outline
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row {
                        Text(row.name, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                        Text(formatMoney(row.total.toPlainString(), currency), style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle))
                    }
                    Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.surfaceContainerHighest)) {
                        Box(Modifier.fillMaxWidth(row.share.toFloat().coerceIn(0.02f, 1f)).height(8.dp).clip(RoundedCornerShape(50)).background(color))
                    }
                }
            }
        }
    }
}
