package app.maalu.ui.screens

import app.maalu.ui.components.SpringBar
import androidx.compose.material3.ButtonDefaults
import androidx.compose.foundation.background
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.material3.TextButton
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.untilText
import app.maalu.data.runningFixed
import app.maalu.ui.components.ChoiceChip
import app.maalu.ui.components.NetColumns
import app.maalu.data.netRows
import app.maalu.data.monthShort
import app.maalu.data.lastMonths
import app.maalu.data.targetText
import app.maalu.data.percentText
import app.maalu.data.creditUsage
import app.maalu.data.RuleStatus
import app.maalu.data.IncomeRule
import app.maalu.data.CategoryTotal
import app.maalu.data.Account
import app.maalu.data.Budget
import app.maalu.data.Goal
import app.maalu.data.KindShare
import app.maalu.data.MonthlyPoint
import app.maalu.data.Transaction
import app.maalu.data.formatMoney
import app.maalu.data.title
import app.maalu.ui.components.LineChart
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.Pair2
import app.maalu.ui.components.PairedColumns
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.MoneyStyle

/** The card every dashboard section sits on: the large corner, one tonal step above the page. */
@Composable
fun SectionCard(title: String, trailing: String? = null, content: @Composable () -> Unit) {
    Surface(shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                if (trailing != null) Text(trailing, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            content()
        }
    }
}

@Composable
private fun Bar(fraction: Float, color: Color, height: Int = 8) {
    SpringBar(fraction, color, height.dp)
}

@Composable
private fun statusColor(status: String): Color = when (status) {
    "over" -> MaterialTheme.colorScheme.error
    "warning" -> ChartColors.Warning
    else -> ChartColors.IncomeLight
}

@Composable
fun CashFlowCard(allMonths: List<MonthlyPoint>, currency: String) {
    if (allMonths.isEmpty()) return
    var range by remember { mutableStateOf(if (allMonths.size > 6) 6 else allMonths.size) }
    val months = remember(allMonths, range) { lastMonths(allMonths, range) }
    val rows = remember(months) { netRows(months) }
    SectionCard("Income and expenses", "last ${months.size} months") {
        // 6 or 12 months: one switch drives every chart on the card
        if (allMonths.size > 6) Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf(6, 12).forEach { n ->
                ChoiceChip(range == n, { range = n }, { Text("$n months") })
            }
        }
        PairedColumns(
            months.map { Pair2(it.income.toDoubleOrNull() ?: 0.0, (it.expense.toDoubleOrNull() ?: 0.0).coerceAtLeast(0.0)) },
            ChartColors.IncomeLight, ChartColors.ExpenseLight,
        )
        MonthEnds(months)
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Legend("Income", ChartColors.IncomeLight)
            Legend("Expenses", ChartColors.ExpenseLight)
        }
        val m = months.last()
        val small = MaterialTheme.typography.bodySmall
        val dim = MaterialTheme.colorScheme.onSurfaceVariant
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Latest month: ", style = small, color = dim)
            MoneyText(m.income, currency, style = small, color = dim)
            Text(" in, ", style = small, color = dim)
            MoneyText(m.expense, currency, style = small, color = dim)
            Text(" out", style = small, color = dim)
        }

        // what was kept each month: up from a zero line when income beat spending, down when it did not
        Text("Kept each month", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 8.dp))
        NetColumns(rows.map { it.kept.toDouble() }, ChartColors.Line, ChartColors.ExpenseLight, MaterialTheme.colorScheme.outlineVariant)
        MonthEnds(months)
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Legend("Kept", ChartColors.Line)
            Legend("Overspent", ChartColors.ExpenseLight)
        }
        rows.last().let { r ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(if (r.kept.signum() >= 0) "Kept in ${monthShort(r.month)}: " else "Overspent in ${monthShort(r.month)}: ", style = small, color = dim)
                MoneyText(r.kept.abs().toPlainString(), currency, style = small, color = dim)
            }
        }

        // the running total of what was kept, from the first month shown
        if (rows.size > 1) {
            Text("Kept in total", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 8.dp))
            LineChart(rows.map { it.running.toDouble() }, ChartColors.Line)
            MonthEnds(months)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Since ${monthShort(rows.first().month)}: ", style = small, color = dim)
                MoneyText(rows.last().running.toPlainString(), currency, style = small, color = dim)
            }
        }
    }
}

/** The first and last month under a chart, so the axis is named without a label on every column. */
@Composable
private fun MonthEnds(months: List<MonthlyPoint>) {
    if (months.size < 2) return
    Row(Modifier.fillMaxWidth()) {
        Text(monthShort(months.first().month), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(monthShort(months.last().month), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun Legend(label: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(color))
        Text(label, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
fun BudgetGoalsCard(budget: Budget?, goals: List<Goal>) {
    val running = budget?.let(::runningFixed).orEmpty()
    if ((budget == null || budget.lines.isEmpty()) && running.isEmpty() && goals.isEmpty()) return
    SectionCard("Budget and goals") {
        if (budget != null && budget.lines.isNotEmpty()) {
            val t = budget.totals
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row {
                    Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                        Text("Spent ", style = MaterialTheme.typography.bodyMedium)
                        MoneyText(t.activity, budget.currency, style = MaterialTheme.typography.bodyMedium)
                        Text(" of ", style = MaterialTheme.typography.bodyMedium)
                        MoneyText(t.amount, budget.currency, style = MaterialTheme.typography.bodyMedium)
                    }
                    Text("${t.percent}%", style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle), color = statusColor(t.status))
                }
                Bar(t.percent / 100f, statusColor(t.status), 10)
                if (budget.attention > 0) Text("${budget.attention} ${if (budget.attention == 1) "limit needs" else "limits need"} attention", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            budget.lines.take(4).forEach { line ->
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row {
                        Text(line.name, Modifier.weight(1f), style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MoneyText(line.activity, budget.currency, style = MaterialTheme.typography.bodySmall)
                            Text(" / ", style = MaterialTheme.typography.bodySmall)
                            MoneyText(line.amount, budget.currency, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    Bar(line.percent / 100f, statusColor(line.status), 6)
                }
            }
        }
        // limits for set dates that are running now: one total for the whole stretch, shown beside the monthly ones
        if (budget != null) running.forEach { f ->
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row {
                    Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                        Text(f.name, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                        Text("  ${untilText(f)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MoneyText(f.activity, budget.currency, style = MaterialTheme.typography.bodySmall)
                        Text(" / ", style = MaterialTheme.typography.bodySmall)
                        MoneyText(f.amount, budget.currency, style = MaterialTheme.typography.bodySmall)
                    }
                }
                Bar(f.percent / 100f, statusColor(f.status), 6)
            }
        }
        goals.take(3).forEach { goal ->
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row {
                    Text(goal.name + if (goal.reached) " ✓" else "", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MoneyText(goal.saved, goal.currency, style = MaterialTheme.typography.bodySmall)
                        Text(" of ", style = MaterialTheme.typography.bodySmall)
                        MoneyText(goal.targetAmount, goal.currency, style = MaterialTheme.typography.bodySmall)
                    }
                }
                Bar(goal.percent / 100f, MaterialTheme.colorScheme.primary, 6)
            }
        }
    }
}

@Composable
fun NeedsWantsCard(shares: List<KindShare>?, currency: String, rule: IncomeRule? = null) {
    if (shares == null) return
    SectionCard("Needs and wants") {
        // one bar in three parts; names and figures below, so colour is never the only signal
        Row(Modifier.fillMaxWidth().height(12.dp).clip(RoundedCornerShape(50))) {
            shares.filter { it.share > 0 }.forEach { s ->
                Box(Modifier.weight(s.share.toFloat()).height(12.dp).background(kindColor(s)))
            }
        }
        shares.forEach { s ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.size(10.dp).clip(CircleShape).background(kindColor(s)))
                Text(s.kind.label, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MoneyText(s.total.toPlainString(), currency, style = MaterialTheme.typography.bodyMedium)
                    Text("  ${Math.round(s.share * 100)}%", style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle))
                }
            }
        }
        rule?.let { IncomeRuleSection(it, currency) }
    }
}

@Composable
private fun kindColor(s: KindShare): Color = when (s.kind) {
    app.maalu.data.Kind.Need -> ChartColors.Line
    app.maalu.data.Kind.Want -> ChartColors.ExpenseLight
    app.maalu.data.Kind.Unsorted -> MaterialTheme.colorScheme.outlineVariant
}

@Composable
fun TransactionsCard(title: String, trailing: String?, items: List<Transaction>, empty: String) {
    SectionCard(title, trailing) {
        if (items.isEmpty()) Text(empty, color = MaterialTheme.colorScheme.onSurfaceVariant)
        items.forEach { t -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) { QuietRow(t) } }
    }
}

/** The 50/30/20 rule under the needs and wants bar: each share of income with a tick at its target and the status in words (never colour alone). */
@Composable
private fun IncomeRuleSection(rule: IncomeRule, currency: String) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 8.dp)) {
        Text("Against 50/30/20 of your income", style = MaterialTheme.typography.titleSmall)
        rule.rows.forEach { r ->
            val color = if (r.status == RuleStatus.On) ChartColors.IncomeLight else ChartColors.ExpenseLight
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(r.label, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                    MoneyText(r.amount.toPlainString(), currency, style = MaterialTheme.typography.bodyMedium)
                    Text("  ${percentText(r.percent)}", style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle))
                }
                Box(Modifier.fillMaxWidth().height(10.dp)) {
                    // an empty track while there is nothing to show; otherwise the spring fill draws the track too
                    if (r.percent > 0) SpringBar((r.percent / 100.0).toFloat(), color, 10.dp)
                    else Box(Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.surfaceContainerHighest))
                    // a tick at the target
                    Box(Modifier.fillMaxWidth(r.target / 100f).height(10.dp)) {
                        Box(Modifier.align(Alignment.CenterEnd).size(width = 2.dp, height = 14.dp).background(MaterialTheme.colorScheme.onSurface))
                    }
                }
                Row {
                    Text(r.status.text, Modifier.weight(1f), style = MaterialTheme.typography.labelMedium, color = color)
                    Text(targetText(r.key), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        val unsorted = rule.unsortedAmount
        if (unsorted != null) Text(
            "${formatMoney(unsorted.toPlainString(), currency)} (${percentText(rule.unsortedPercent ?: 0.0)}) is in categories with no need or want. It counts against what you kept but is not judged.",
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** Each card or overdraft that has a credit limit: what is owed against it, as a bar. */
@Composable
fun CreditUsageCard(accounts: List<Account>) {
    val rows = accounts.mapNotNull { a -> creditUsage(a.balance, a.creditLimit)?.let { a to it } }
    if (rows.isEmpty()) return
    SectionCard("Credit used") {
        rows.forEach { (a, u) ->
            val high = u.percent >= 80
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(a.name, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        "${formatMoney(u.owed.toPlainString(), a.currency)} of ${formatMoney(u.limit.toPlainString(), a.currency)} · ${u.percent}%",
                        style = MaterialTheme.typography.bodySmall, color = if (high) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Bar(u.percent / 100f, if (high) MaterialTheme.colorScheme.error else ChartColors.Line)
            }
        }
    }
}
