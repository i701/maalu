package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import app.maalu.data.BalancePoint
import app.maalu.data.Budget
import app.maalu.data.Goal
import app.maalu.data.KindShare
import app.maalu.data.MonthlyPoint
import app.maalu.data.Transaction
import app.maalu.data.formatMoney
import app.maalu.data.shortDate
import app.maalu.data.title
import app.maalu.ui.components.LineChart
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.Pair2
import app.maalu.ui.components.PairedColumns
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.MoneyStyle

/** The card every dashboard section sits on: the large corner, one tonal step above the page. */
@Composable
private fun SectionCard(title: String, trailing: String? = null, content: @Composable () -> Unit) {
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
    Box(Modifier.fillMaxWidth().height(height.dp).clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.surfaceContainerHighest)) {
        Box(Modifier.fillMaxWidth(fraction.coerceIn(0.02f, 1f)).height(height.dp).clip(RoundedCornerShape(50)).background(color))
    }
}

@Composable
private fun statusColor(status: String): Color = when (status) {
    "over" -> MaterialTheme.colorScheme.error
    "warning" -> Color(0xFFEAB308)
    else -> ChartColors.IncomeLight
}

@Composable
fun NetWorthCard(points: List<BalancePoint>, currency: String) {
    if (points.size < 2) return
    val first = points.first().total.toBigDecimalOrNull() ?: return
    val last = points.last().total.toBigDecimalOrNull() ?: return
    val change = last - first
    SectionCard("Net worth") {
        Text(formatMoney(points.last().total, currency), style = MaterialTheme.typography.headlineSmall.merge(MoneyStyle))
        // the arrow and the sign say which way it went, not only the colour
        Text(
            (if (change.signum() >= 0) "↑ " else "↓ ") + formatMoney(change.abs().toPlainString(), currency) + " this month",
            style = MaterialTheme.typography.bodySmall,
            color = if (change.signum() >= 0) ChartColors.IncomeLight else MaterialTheme.colorScheme.error,
        )
        LineChart(points.map { it.total.toDoubleOrNull() ?: 0.0 }, ChartColors.Line)
    }
}

@Composable
fun CashFlowCard(months: List<MonthlyPoint>, currency: String) {
    if (months.isEmpty()) return
    SectionCard("Income and expenses", "last ${months.size} months") {
        PairedColumns(
            months.map { Pair2(it.income.toDoubleOrNull() ?: 0.0, (it.expense.toDoubleOrNull() ?: 0.0).coerceAtLeast(0.0)) },
            ChartColors.IncomeLight, ChartColors.ExpenseLight,
        )
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
    if ((budget == null || budget.lines.isEmpty()) && goals.isEmpty()) return
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
fun NeedsWantsCard(shares: List<KindShare>?, currency: String) {
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
    }
}

@Composable
private fun kindColor(s: KindShare): Color = when (s.kind) {
    app.maalu.data.Kind.Need -> ChartColors.Line
    app.maalu.data.Kind.Want -> ChartColors.ExpenseLight
    app.maalu.data.Kind.Unsorted -> MaterialTheme.colorScheme.outlineVariant
}

@Composable
fun TransactionsCard(title: String, trailing: String?, items: List<Transaction>, empty: String, today: String) {
    SectionCard(title, trailing) {
        if (items.isEmpty()) Text(empty, color = MaterialTheme.colorScheme.onSurfaceVariant)
        items.forEach { t ->
            val overdue = t.planned && t.date < today
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(t.title(), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    val sub = listOfNotNull(t.category.takeIf { t.type != "transfer" }, t.account?.name).joinToString(" · ")
                    Text(
                        (if (overdue) "Overdue · " else "") + shortDate(t.date) + if (sub.isNotEmpty()) " · $sub" else "",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (overdue) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                    )
                }
                val sign = when (t.type) { "expense" -> "-"; "income" -> "+"; else -> "" }
                Text(
                    sign + formatMoney(t.amount, t.currency),
                    style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle),
                    color = when (t.type) { "income" -> ChartColors.IncomeLight; "expense" -> ChartColors.ExpenseLight; else -> MaterialTheme.colorScheme.onSurface },
                )
            }
        }
    }
}
