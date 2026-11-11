package app.maalu.ui.screens

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
import app.maalu.data.BalancePoint
import app.maalu.ui.components.TintChip
import app.maalu.ui.components.NetColumns
import app.maalu.data.netRows
import app.maalu.data.monthShort
import app.maalu.data.lastMonths
import app.maalu.data.targetText
import app.maalu.data.spreadLabels
import app.maalu.data.percentText
import app.maalu.data.moneyFlow
import app.maalu.data.layoutFlow
import app.maalu.data.creditUsage
import app.maalu.data.RuleStatus
import app.maalu.data.MoneyFlow
import app.maalu.data.IncomeRule
import app.maalu.data.FlowKind
import app.maalu.data.CategoryTotal
import app.maalu.data.Account
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
        MoneyText(points.last().total, currency, style = MaterialTheme.typography.headlineSmall)
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
fun CashFlowCard(allMonths: List<MonthlyPoint>, currency: String) {
    if (allMonths.isEmpty()) return
    var range by remember { mutableStateOf(if (allMonths.size > 6) 6 else allMonths.size) }
    val months = remember(allMonths, range) { lastMonths(allMonths, range) }
    val rows = remember(months) { netRows(months) }
    SectionCard("Income and expenses", "last ${months.size} months") {
        // 6 or 12 months: one switch drives every chart on the card
        if (allMonths.size > 6) Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf(6, 12).forEach { n ->
                TintChip(ChartColors.Line, range == n, { range = n }, { Text("$n months") })
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
                MoneyText(
                    t.amount, t.currency, prefix = sign,
                    style = MaterialTheme.typography.bodyMedium,
                    color = when (t.type) { "income" -> ChartColors.IncomeLight; "expense" -> ChartColors.ExpenseLight; else -> MaterialTheme.colorScheme.onSurface },
                )
            }
        }
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
                    Box(Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.surfaceContainerHighest))
                    if (r.percent > 0) Box(Modifier.fillMaxWidth((r.percent / 100.0).toFloat().coerceIn(0.02f, 1f)).height(10.dp).clip(RoundedCornerShape(50)).background(color))
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

/**
 * Where the month's money came from and where it went: income categories flow into one total and out to spending and what was kept. Labels sit
 * at the sides with their amounts; on a narrow phone the diagram scrolls sideways instead of squeezing them. A table lists every flow.
 */
@Composable
fun MoneyFlowCard(categories: List<CategoryTotal>, currency: String) {
    val flow = remember(categories) { moneyFlow(categories) } ?: return
    var table by remember { mutableStateOf(false) }
    SectionCard("Money flow", formatMoney(flow.nodes.first { it.kind == FlowKind.Total }.value.toString(), currency)) {
        if (table) FlowTable(flow, currency) else FlowDiagram(flow, currency)
        TextButton(onClick = { table = !table }) { Text(if (table) "Show the diagram" else "Show as a table") }
    }
}

private fun flowColor(kind: FlowKind): Color = when (kind) {
    FlowKind.Income -> ChartColors.IncomeLight
    FlowKind.Deficit, FlowKind.Spending -> ChartColors.ExpenseLight
    FlowKind.Total, FlowKind.Saved -> ChartColors.Line
}

@Composable
private fun FlowDiagram(flow: MoneyFlow, currency: String) {
    val labelW = 88.dp
    val height = 230.dp
    androidx.compose.foundation.layout.BoxWithConstraints(Modifier.fillMaxWidth()) {
        val totalW = maxOf(maxWidth, 340.dp)
        val flowW = totalW - labelW * 2
        val layout = remember(flow, flowW) { layoutFlow(flow, flowW.value.toDouble(), height.value.toDouble()) }
        val density = androidx.compose.ui.platform.LocalDensity.current.density
        val scrollMod = if (totalW > maxWidth) Modifier.horizontalScroll(androidx.compose.foundation.rememberScrollState()) else Modifier
        Box(scrollMod) {
            Box(Modifier.width(totalW).height(height)) {
                androidx.compose.foundation.Canvas(Modifier.padding(start = labelW, end = labelW).fillMaxSize()) {
                    layout.links.forEach { l ->
                        val color = flowColor(if (l.link.source == "total") layout.nodes.first { it.node.id == l.link.target }.node.kind else layout.nodes.first { it.node.id == l.link.source }.node.kind)
                        val path = androidx.compose.ui.graphics.Path().apply {
                            val x0 = (l.x0 * density).toFloat(); val x1 = (l.x1 * density).toFloat(); val mid = (x0 + x1) / 2
                            val y0 = (l.y0 * density).toFloat(); val y1 = (l.y1 * density).toFloat()
                            moveTo(x0, y0); cubicTo(mid, y0, mid, y1, x1, y1)
                        }
                        drawPath(path, color.copy(alpha = 0.32f), style = androidx.compose.ui.graphics.drawscope.Stroke(width = (l.thickness * density).toFloat()))
                    }
                    layout.nodes.forEach { n ->
                        drawRoundRect(
                            flowColor(n.node.kind), androidx.compose.ui.geometry.Offset((n.x * density).toFloat(), (n.y * density).toFloat()),
                            androidx.compose.ui.geometry.Size((n.width * density).toFloat(), (n.height * density).toFloat()), androidx.compose.ui.geometry.CornerRadius(3f * density),
                        )
                    }
                }
                // labels at the sides, kept apart; the total node is named in the card's header
                listOf(0, 2).forEach { col ->
                    val side = layout.nodes.filter { it.node.column == col }
                    val ys = spreadLabels(side.map { it.y + it.height / 2 - 15 }, 32.0, height.value - 30.0)
                    side.forEachIndexed { i, n ->
                        Column(
                            Modifier.width(labelW - 8.dp).offset(x = if (col == 0) 0.dp else totalW - labelW + 8.dp, y = ys[i].dp),
                            horizontalAlignment = if (col == 0) Alignment.End else Alignment.Start,
                        ) {
                            Text(n.node.label, style = MaterialTheme.typography.labelMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(formatMoney(n.node.value.toString(), currency), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FlowTable(flow: MoneyFlow, currency: String) {
    val name = flow.nodes.associate { it.id to it.label }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        flow.links.forEach { l ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${name[l.source]} → ${name[l.target]}", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                Text(formatMoney(l.value.toString(), currency), style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle))
            }
        }
    }
}
