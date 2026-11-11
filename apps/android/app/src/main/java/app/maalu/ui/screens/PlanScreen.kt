@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.AvailableToSpend
import app.maalu.data.PlanKind
import app.maalu.data.PlanRow
import app.maalu.data.Transaction
import app.maalu.data.firstShortRow
import app.maalu.data.formatMoney
import app.maalu.data.isShort
import app.maalu.data.payTitle
import app.maalu.data.planDayLabel
import app.maalu.data.planDays
import app.maalu.data.shortDate
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.MorphTile
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.MoneyStyle
import kotlinx.coroutines.launch
import java.math.BigDecimal

/**
 * What you can spend until the end of the budget period, and the bills in the way: four tiles, a sentence saying whether the
 * plan holds, and the bills by day (overdue first) with what is left after each, so you can see which one makes the money run
 * out. Pay a bill, or mark income as received, right from its row.
 */
@Composable
fun PlanScreen(api: Api, onOpenAccount: (id: String, name: String) -> Unit) {
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var data by remember { mutableStateOf<AvailableToSpend?>(null) }
    var planned by remember { mutableStateOf<Map<String, Transaction>>(emptyMap()) }
    var error by remember { mutableStateOf<String?>(null) }
    var paying by remember { mutableStateOf<Transaction?>(null) }
    var opened by remember { mutableStateOf<Transaction?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()

    LaunchedEffect(reload) {
        when (val r = api.get<AvailableToSpend>("stats/available-to-spend")) {
            is ApiResult.Ok -> { data = r.data; error = null }
            is ApiResult.Failed -> error = r.message
        }
        // the full planned transactions, since paying one needs its currency, rate and type
        planned = (api.get<List<Transaction>>("transactions", mapOf("planned" to "true", "limit" to "100")) as? ApiResult.Ok)?.data.orEmpty().associateBy { it.id }
        refreshing = false
    }

    val d = data
    when {
        error != null && d == null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(error ?: "", color = MaterialTheme.colorScheme.error)
            Button(onClick = { reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
        }
        d == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        d.accounts.isEmpty() -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
            Text("Add a cash, current or debit account and this shows what you can spend after your bills.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        else -> {
            val days = remember(d) { planDays(d) }
            val culprit = firstShortRow(days)
            PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
                LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 32.dp)) {
                    item { Tiles(d) }
                    item { Verdict(d, culprit) }
                    if (days.isEmpty()) item {
                        Text("No bills are planned until the end of the period.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 16.dp, horizontal = 4.dp))
                    }
                    days.forEach { day ->
                        item(key = "h-${day.key}") {
                            Text(
                                planDayLabel(day, d.today.ifBlank { java.time.LocalDate.now().toString() }),
                                style = MaterialTheme.typography.labelLarge,
                                color = if (day.overdue) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(start = 4.dp, top = 16.dp, bottom = 6.dp),
                            )
                        }
                        items(day.rows.size, key = { "r-${day.key}-${day.rows[it].kind}-${day.rows[it].id}" }) { i ->
                            val row = day.rows[i]
                            val tx = planned[row.id]
                            MorphTile(
                                onClick = { if (row.kind == PlanKind.Card && row.cardId != null) onOpenAccount(row.cardId, row.title.removeSuffix(" card payment")) else tx?.let { opened = it } },
                                first = i == 0, last = i == day.rows.lastIndex, modifier = Modifier.padding(bottom = 2.dp),
                            ) { PlanRowContent(row, d.currency, canPay = tx != null, onPay = { tx?.let { paying = it } }) }
                        }
                    }
                    item { Aside(d) }
                }
            }
        }
    }

    opened?.let { t -> TransactionDetailHost(api, t, scope, onClose = { opened = null }, onChanged = { reload++ }) }
    paying?.let { t ->
        MarkPaidDialog(
            api, t, d?.currency, onClose = { paying = null },
            onPaid = { paying = null; reload++; scope.launch { snackbar?.showSnackbar(markedMessage(t)) } },
        )
    }
}

@Composable
private fun Tile(label: String, value: String, currency: String, tint: Color, modifier: Modifier) {
    Surface(modifier, shape = MaterialTheme.shapes.large, color = tint.copy(alpha = 0.16f)) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            MoneyText(value, currency, style = MaterialTheme.typography.titleMedium)
        }
    }
}

/** You have, Bills to pay, Set aside, and what is available (or how short). */
@Composable
private fun Tiles(d: AvailableToSpend) {
    val short = d.isShort()
    val overdue = d.bills.count { it.overdue } + d.cardPayments.count { it.overdue }
    val toPay = (d.billsTotal.toBigDecimalOrNull() ?: BigDecimal.ZERO) + (d.cardPaymentsTotal.toBigDecimalOrNull() ?: BigDecimal.ZERO)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 4.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Tile("You have", d.balance, d.currency, Accents.getValue("blue"), Modifier.weight(1f))
            Tile("Bills to pay" + if (overdue > 0) " ($overdue overdue)" else "", toPay.toPlainString(), d.currency, Accents.getValue("amber"), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Tile("Set aside", d.reservedTotal, d.currency, Accents.getValue("violet"), Modifier.weight(1f))
            Tile(if (short) "Short by" else "Available to spend", d.available.removePrefix("-"), d.currency, if (short) MaterialTheme.colorScheme.error else ChartColors.IncomeLight, Modifier.weight(1f))
        }
    }
}

/** The sentence that says whether the plan holds: fine, or which bill makes it run short. */
@Composable
private fun Verdict(d: AvailableToSpend, culprit: PlanRow?) {
    val short = d.isShort()
    Surface(Modifier.fillMaxWidth().padding(vertical = 4.dp), shape = MaterialTheme.shapes.large, color = (if (short) MaterialTheme.colorScheme.error else ChartColors.IncomeLight).copy(alpha = 0.14f)) {
        Text(
            if (!short) "Every bill planned until ${shortDate(d.periodEnd)} is covered."
            else if (culprit != null) "The money runs out at ${culprit.title} (${shortDate(culprit.date)})."
            else "The money you set aside covers more than you hold.",
            style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(16.dp),
        )
    }
}

@Composable
private fun PlanRowContent(row: PlanRow, currency: String, canPay: Boolean, onPay: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(row.title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 2, overflow = TextOverflow.Ellipsis)
                val sub = listOfNotNull(
                    when (row.kind) { PlanKind.Card -> "Credit card statement"; else -> row.account }, row.subscription,
                ).joinToString(" · ")
                if (sub.isNotEmpty()) Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                val marks = listOfNotNull(
                    "Expected · not counted".takeIf { row.kind == PlanKind.Income }, "Transfer".takeIf { row.transfer }, "Estimate".takeIf { row.estimate },
                )
                if (marks.isNotEmpty()) Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 2.dp)) { marks.forEach { m ->
                    Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.secondaryContainer) {
                        Text(m, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSecondaryContainer, modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp))
                    }
                } }
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                MoneyText(
                    row.amount, currency, prefix = if (row.estimate) "≈ " else if (row.kind == PlanKind.Income) "+" else "",
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (row.kind == PlanKind.Income) ChartColors.IncomeLight else MaterialTheme.colorScheme.onSurface,
                )
                row.left?.let { left ->
                    Text(
                        "Left ${formatMoney(left.toPlainString(), currency)}", style = MaterialTheme.typography.labelSmall,
                        color = if (row.short) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        if (row.firstShort) Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.errorContainer) {
            Text("Short from here", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp))
        }
        if (row.kind != PlanKind.Card && canPay) TextButton(onClick = onPay, contentPadding = PaddingValues(0.dp)) {
            Text(if (row.kind == PlanKind.Income) "Mark as received" else if (row.transfer) "Mark as done" else if (row.estimate) "Enter the real amount" else "Mark as paid")
        }
    }
}

/** What the number counts: the accounts, the money set aside for goals, and the accounts kept apart. Folded away until opened. */
@Composable
private fun Aside(d: AvailableToSpend) {
    var open by rememberSaveable { mutableStateOf(false) }
    Surface(Modifier.fillMaxWidth().padding(top = 16.dp), shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column {
            Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 8.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("What this counts", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                TextButton(onClick = { open = !open }) { Icon(if (open) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, if (open) "Hide" else "Show") }
            }
            AnimatedVisibility(open) {
                Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    SectionLines("In your everyday accounts", d.accounts.map { it.name to it.balance }, d.currency)
                    if (d.reserved.isNotEmpty()) SectionLines("Set aside for goals", d.reserved.map { it.name to it.amount }, d.currency)
                    if (d.keptApart.isNotEmpty()) SectionLines("Kept apart (savings and goals' accounts)", d.keptApart.map { it.name to it.balance }, d.currency)
                    Text("Planned income is listed on its day but never counted until it arrives.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                }
            }
        }
    }
}

@Composable
private fun SectionLines(title: String, lines: List<Pair<String, String>>, currency: String) {
    Text(title, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 8.dp))
    lines.forEach { (name, amount) ->
        Row(Modifier.fillMaxWidth()) {
            Text(name, Modifier.weight(1f), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            MoneyText(amount, currency, style = MaterialTheme.typography.bodySmall)
        }
    }
}
