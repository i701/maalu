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
import androidx.compose.material.icons.outlined.ArrowUpward
import androidx.compose.material3.Button
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
import app.maalu.data.formatMoney
import app.maalu.data.formatMoneyShort
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
)

private sealed interface State {
    data object Loading : State
    data class Ready(val data: DashboardData) : State
    data class Failed(val message: String) : State
}

/** Home: available to spend, the month's income, spending and what was kept, and where it went. */
@Composable
fun DashboardScreen(api: Api) {
    var month by rememberSaveable { mutableStateOf(LocalDate.now().withDayOfMonth(1).toString()) }
    var attempt by remember { mutableIntStateOf(0) }
    val on = LocalDate.parse(month)

    val state by produceState<State>(State.Loading, month, attempt) {
        value = State.Loading
        val (start, end) = monthBounds(on)
        val (pStart, pEnd) = monthBounds(on.minusMonths(1))
        value = coroutineScope {
            val totals = async { api.get<Totals>("transactions/summary", mapOf("date_from" to "$start", "date_to" to "$end")) }
            val before = async { api.get<Totals>("transactions/summary", mapOf("date_from" to "$pStart", "date_to" to "$pEnd")) }
            val cats = async { api.get<CategoryTotals>("transactions/categories", mapOf("date_from" to "$start", "date_to" to "$end")) }
            val avail = async { api.get<AvailableToSpend>("stats/available-to-spend") }
            val t = totals.await(); val b = before.await(); val c = cats.await(); val a = avail.await()
            when {
                t is ApiResult.Failed -> State.Failed(t.message)
                b is ApiResult.Failed -> State.Failed(b.message)
                c is ApiResult.Failed -> State.Failed(c.message)
                else -> State.Ready(
                    DashboardData(
                        (t as ApiResult.Ok).data, (b as ApiResult.Ok).data, (c as ApiResult.Ok).data.categories,
                        (a as? ApiResult.Ok)?.data, // the page works without it
                    ),
                )
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        MonthPicker(on, onChange = { month = it.toString() })
        when (val s = state) {
            State.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            is State.Failed -> Column(
                Modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(s.message, color = MaterialTheme.colorScheme.error)
                Button(onClick = { attempt++ }) { Text("Try again") }
            }
            is State.Ready -> LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // available to spend is for the current budget period only, so it is hidden for other months
                val isThisMonth = on == LocalDate.now().withDayOfMonth(1)
                s.data.available?.takeIf { isThisMonth }?.let { item { AvailableCard(it) } }
                item { MonthStrip(s.data.totals, s.data.before) }
                item { SpendingCard(s.data.categories, s.data.totals.currency) }
            }
        }
    }
}

@Composable
private fun MonthPicker(on: LocalDate, onChange: (LocalDate) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = { onChange(on.minusMonths(1)) }) { Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, "Previous month") }
        Text(monthLabel(on), style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
        IconButton(onClick = { onChange(on.plusMonths(1)) }) { Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, "Next month") }
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
            Text("until ${a.periodEnd}", style = MaterialTheme.typography.bodySmall)
            Text(working(a), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
        }
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
        Text(formatMoneyShort(amount, currency), color = white, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, style = MoneyStyle, textAlign = TextAlign.Center)
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
