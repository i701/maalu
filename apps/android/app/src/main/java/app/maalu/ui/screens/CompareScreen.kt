@file:OptIn(ExperimentalMaterial3Api::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.CategoryTotals
import app.maalu.data.Change
import app.maalu.data.CompareRow
import app.maalu.data.ComparePreset
import app.maalu.data.compareRows
import app.maalu.data.compareTotals
import app.maalu.data.periodsFor
import app.maalu.data.spendingSentence
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.MorphTile
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.ChartColors
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.time.LocalDate

private class Compared(val currency: String, val before: List<app.maalu.data.CategoryTotal>, val now: List<app.maalu.data.CategoryTotal>)

/**
 * Compare: one period against another, with income, spending and what was kept, then every category with what it came to in each
 * and how far it moved. Last month against the month before is the default, since early in a month "this month" is nearly empty.
 */
@Composable
fun CompareScreen(api: Api) {
    var preset by rememberSaveable { mutableStateOf(ComparePreset.LastMonth.name) }
    var data by remember { mutableStateOf<Compared?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    val chosen = ComparePreset.valueOf(preset)
    val periods = periodsFor(chosen, LocalDate.now())

    LaunchedEffect(preset, reload) {
        coroutineScope {
            val now = async { api.get<CategoryTotals>("transactions/categories", mapOf("date_from" to "${periods.now.from}", "date_to" to "${periods.now.to}")) }
            val before = async { api.get<CategoryTotals>("transactions/categories", mapOf("date_from" to "${periods.before.from}", "date_to" to "${periods.before.to}")) }
            val n = now.await(); val b = before.await()
            if (n is ApiResult.Ok && b is ApiResult.Ok) { data = Compared(n.data.currency, b.data.categories, n.data.categories); error = null }
            else error = (n as? ApiResult.Failed)?.message ?: (b as? ApiResult.Failed)?.message
        }
        refreshing = false
    }

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 4.dp)) {
            ChipRow(ComparePreset.entries, chosen, { it.label }, Accents.getValue("violet")) { data = null; preset = it.name }
        }
        ReportState(data, error, onRetry = { error = null; reload++ }) { d ->
            val money = { a: String -> app.maalu.data.formatMoney(a, d.currency) }
            val totals = compareTotals(d.before, d.now)
            val spending = compareRows(d.before, d.now, "expense")
            val income = compareRows(d.before, d.now, "income")
            PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
                LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    item {
                        Text(
                            "${periods.now.label.replaceFirstChar { it.uppercase() }} against ${periods.before.label}" +
                                if (chosen == ComparePreset.ThisMonth) ". This month is not over yet." else "",
                            style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp),
                        )
                    }
                    item { SentenceCard(spendingSentence(totals.expense, spending, periods.before.label, money)) }
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            ChangeTile("Income", totals.income, d.currency, upIsGood = true, modifier = Modifier.weight(1f))
                            ChangeTile("Spending", totals.expense, d.currency, upIsGood = false, modifier = Modifier.weight(1f))
                            ChangeTile("Kept", totals.kept, d.currency, upIsGood = true, modifier = Modifier.weight(1f))
                        }
                    }
                    item { SectionLabel("Spending by category") }
                    if (spending.isEmpty()) item { Text("No spending in either period.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    itemsIndexed(spending, key = { _, r -> "e-" + r.categoryId }) { i, r -> CategoryChangeRow(r, d.currency, upIsGood = false, first = i == 0, last = i == spending.lastIndex) }
                    if (income.isNotEmpty()) {
                        item { SectionLabel("Income by category") }
                        itemsIndexed(income, key = { _, r -> "i-" + r.categoryId }) { i, r -> CategoryChangeRow(r, d.currency, upIsGood = true, first = i == 0, last = i == income.lastIndex) }
                    }
                }
            }
        }
    }
}

/** Colour says good or bad (spending down is good, income up is good) and an arrow says which way, so colour is never alone. */
private fun tone(change: Change, upIsGood: Boolean): Color? {
    val v = change.change.toBigDecimalOrNull()?.signum() ?: 0
    return when { v == 0 -> null; (v > 0) == upIsGood -> GoodColor; else -> BadColor }
}

private fun arrow(change: Change): String = when (change.change.toBigDecimalOrNull()?.signum() ?: 0) { 1 -> "↑"; -1 -> "↓"; else -> "–" }

@Composable
private fun ChangeTile(label: String, c: Change, currency: String, upIsGood: Boolean, modifier: Modifier) {
    val tint = tone(c, upIsGood) ?: ChartColors.Line
    StatTile(
        label, c.now, currency, tint, modifier,
        note = arrow(c) + " " + (c.percent?.let { "%.0f%%".format(java.util.Locale.ENGLISH, Math.abs(it)) } ?: app.maalu.data.formatMoneyFull(c.change.removePrefix("-"), currency)),
    )
}

@Composable
private fun CategoryChangeRow(r: CompareRow, currency: String, upIsGood: Boolean, first: Boolean, last: Boolean) {
    val accent = Accents[r.color] ?: MaterialTheme.colorScheme.outline
    val tint = tone(r.change, upIsGood) ?: MaterialTheme.colorScheme.onSurfaceVariant
    MorphTile(onClick = {}, first = first, last = last, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Swatch(accent)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(r.category, style = MaterialTheme.typography.bodyMedium)
                Text(
                    when (r.state) { "new" -> "New: nothing before"; "gone" -> "Gone: nothing now"; else -> "Before " + app.maalu.data.formatMoney(r.change.before, currency) },
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                MoneyText(r.change.now, currency, style = MaterialTheme.typography.bodyMedium)
                Text(
                    arrow(r.change) + " " + app.maalu.data.formatMoney(r.change.change.removePrefix("-"), currency) + (r.change.percent?.let { " (%.0f%%)".format(java.util.Locale.ENGLISH, Math.abs(it)) } ?: ""),
                    style = MaterialTheme.typography.labelSmall, color = tint,
                )
            }
        }
    }
}
