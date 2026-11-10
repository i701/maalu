@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Archive
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Account
import app.maalu.data.AccountSummary
import app.maalu.data.AccountTrend
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.CreditLimitGroups
import app.maalu.data.creditUsage
import app.maalu.data.formatMoney
import app.maalu.data.groupLabel
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.MorphTile
import app.maalu.ui.components.Sparkline
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.MoneyStyle
import app.maalu.ui.theme.idTint
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

private class AccountsData(val accounts: List<Account>, val summary: AccountSummary?, val trends: Map<String, List<Double>>)

private sealed interface Load {
    data object Loading : Load
    data class Loaded(val data: AccountsData) : Load
    data class Failed(val message: String) : Load
}

/**
 * Your accounts grouped by kind: what you own and owe at the top, each account as a tile with its balance, a
 * 30-day trend line and, for a card, how much of its limit is used. Tap one for its details; Add makes a new one.
 */
@Composable
fun AccountsScreen(api: Api) {
    var attempt by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf<Account?>(null) }
    var editing by remember { mutableStateOf<Account?>(null) }
    var adding by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<Account?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    val state by produceState<Load>(Load.Loading, attempt) {
        if (!refreshing) value = Load.Loading
        value = coroutineScope {
            val accounts = async { api.get<List<Account>>("accounts") }
            val summary = async { api.get<AccountSummary>("accounts/summary") }
            val trends = async { api.get<List<AccountTrend>>("accounts/trends", mapOf("days" to "30")) }
            when (val a = accounts.await()) {
                is ApiResult.Failed -> Load.Failed(a.message)
                is ApiResult.Ok -> Load.Loaded(
                    AccountsData(
                        a.data,
                        (summary.await() as? ApiResult.Ok)?.data,
                        // the trend lines are a nicety: without them the page is the same
                        (trends.await() as? ApiResult.Ok)?.data.orEmpty().associate { t -> t.accountId to t.balances.map { it.toDoubleOrNull() ?: 0.0 } },
                    ),
                )
            }
        }
        refreshing = false
    }

    Box(Modifier.fillMaxSize()) {
        when (val s = state) {
            Load.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            is Load.Failed -> Column(
                Modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(s.message, color = MaterialTheme.colorScheme.error)
                Button(onClick = { attempt++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
            }
            is Load.Loaded -> {
                val groups = s.data.accounts.groupBy { it.group }
                PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; attempt++ }, modifier = Modifier.fillMaxSize()) {
                    LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp)) {
                        s.data.summary?.let { item { SummaryRow(it) } }
                        if (s.data.accounts.isEmpty()) item { Text("No accounts yet. Add your first one.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 24.dp)) }
                        groups.forEach { (group, list) ->
                            item(key = "h-$group") {
                                Text(groupLabel(group), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp, top = 20.dp, bottom = 8.dp))
                            }
                            items(list.size, key = { list[it].id }) { i ->
                                val a = list[i]
                                MorphTile(onClick = { selected = a }, first = i == 0, last = i == list.lastIndex, modifier = Modifier.padding(bottom = 2.dp)) {
                                    AccountRow(a, s.data.trends[a.id], s.data.summary?.currency ?: "")
                                }
                            }
                        }
                    }
                }
            }
        }
        val expanded by remember { derivedStateOf { listState.firstVisibleItemIndex == 0 } }
        ExtendedFloatingActionButton(
            onClick = { adding = true }, expanded = expanded,
            icon = { Icon(Icons.Outlined.Add, null) }, text = { Text("Add account") },
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
        )
    }

    val all = (state as? Load.Loaded)?.data?.accounts.orEmpty()
    selected?.let { a ->
        AccountSheet(
            a,
            onEdit = { editing = a; selected = null },
            onArchive = {
                selected = null
                scope.launch {
                    when (val r = api.post("accounts/${a.id}/archive")) {
                        is ApiResult.Ok -> {
                            attempt++
                            if (snackbar?.showSnackbar("${a.name} archived", actionLabel = "Undo", duration = SnackbarDuration.Long) == SnackbarResult.ActionPerformed) {
                                api.post("accounts/${a.id}/unarchive"); attempt++
                            }
                        }
                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                    }
                }
            },
            onDelete = { deleting = a; selected = null },
            onClose = { selected = null },
        )
    }
    if (adding) AccountFormScreen(api, all, null, onClose = { adding = false }, onSaved = { adding = false; attempt++; scope.launch { snackbar?.showSnackbar("Account added") } })
    editing?.let { a -> AccountFormScreen(api, all, a, onClose = { editing = null }, onSaved = { editing = null; attempt++; scope.launch { snackbar?.showSnackbar("Changes saved") } }) }
    deleting?.let { a ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Delete ${a.name}?") },
            text = {
                Text(
                    if (a.transactionCount > 0) "Its ${a.transactionCount} transactions stay in your history but lose this account. Archive it instead to keep them tied to it. This can't be undone."
                    else "This can't be undone.",
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    deleting = null
                    scope.launch {
                        when (val r = api.delete("accounts/${a.id}")) {
                            is ApiResult.Ok -> { attempt++; snackbar?.showSnackbar("${a.name} deleted") }
                            is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                        }
                    }
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancel") } },
        )
    }
}

/** What you own, what you owe and what is left, each in its own tint. */
@Composable
private fun SummaryRow(s: AccountSummary) {
    Row(Modifier.fillMaxWidth().padding(bottom = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        SummaryCard("Assets", s.assets, s.currency, ChartColors.IncomeLight, Modifier.weight(1f))
        SummaryCard("Liabilities", s.liabilities, s.currency, MaterialTheme.colorScheme.error, Modifier.weight(1f))
        SummaryCard("Total", s.total, s.currency, ChartColors.Line, Modifier.weight(1f))
    }
}

@Composable
private fun SummaryCard(label: String, amount: String, currency: String, tint: androidx.compose.ui.graphics.Color, modifier: Modifier) {
    Surface(modifier, shape = MaterialTheme.shapes.large, color = tint.copy(alpha = 0.16f)) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            MoneyText(amount, currency, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
        }
    }
}

@Composable
private fun AccountRow(a: Account, trend: List<Double>?, baseCurrency: String) {
    val tint = idTint(a.id)
    Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(tint.copy(alpha = 0.18f)), contentAlignment = Alignment.Center) {
            Text(a.name.firstOrNull()?.uppercase() ?: "?", style = MaterialTheme.typography.labelLarge, color = tint, fontWeight = FontWeight.SemiBold)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(a.name, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 2, overflow = TextOverflow.Ellipsis)
            val sub = listOfNotNull(a.bank, a.accountNumber).joinToString(" · ")
            if (sub.isNotEmpty()) Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            creditUsage(a.balance, a.creditLimit)?.let { u ->
                val color = when { u.percent >= 90 -> MaterialTheme.colorScheme.error; u.percent >= 60 -> androidx.compose.ui.graphics.Color(0xFFEAB308); else -> ChartColors.IncomeLight }
                Box(Modifier.padding(top = 4.dp).fillMaxWidth().height(5.dp).clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.surfaceContainerHighest)) {
                    Box(Modifier.fillMaxWidth((u.percent / 100f).coerceIn(0.03f, 1f)).height(5.dp).clip(RoundedCornerShape(50)).background(color))
                }
                Text("${u.percent}% of ${formatMoney(u.limit.toPlainString(), a.currency)} used", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                formatMoney(a.balance, a.currency),
                style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle),
                color = if (a.balance.startsWith("-")) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            )
            if (a.exchangeRate.toBigDecimalOrNull()?.compareTo(java.math.BigDecimal.ONE) != 0) {
                Text("≈ ${formatMoney(a.baseBalance, baseCurrency)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            trend?.let { Sparkline(it, ChartColors.IncomeLight, ChartColors.ExpenseLight, MaterialTheme.colorScheme.outline) }
        }
    }
}

@Composable
private fun AccountSheet(a: Account, onEdit: () -> Unit, onArchive: () -> Unit, onDelete: () -> Unit, onClose: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(a.name, style = MaterialTheme.typography.titleMedium)
            Text(
                formatMoney(a.balance, a.currency), style = MaterialTheme.typography.titleLarge.merge(MoneyStyle),
                color = if (a.balance.startsWith("-")) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            )
            Fact("Kind", groupLabel(a.group))
            Fact("Bank", a.bank)
            Fact("Number", a.accountNumber)
            val rate = a.exchangeRate.toBigDecimalOrNull()
            Fact("Currency", a.currency + if (rate != null && rate.compareTo(java.math.BigDecimal.ONE) != 0) " · rate ${app.maalu.data.tidyRate(a.exchangeRate)}" + if (a.autoRate) " (follows the market)" else "" else "")
            Fact("Opening", formatMoney(a.openingAmount, a.currency))
            if (a.group in CreditLimitGroups) Fact("Credit limit", a.creditLimit?.let { formatMoney(it, a.currency) })
            if (a.statementDay != null && a.dueDay != null) Fact("Statement", "closes on the ${a.statementDay}, due on the ${a.dueDay}")
            Fact("Transactions", "${a.transactionCount}")
            Fact("Counting", listOfNotNull("Left out of totals".takeIf { a.excludeFromStats }, when (a.spendable) { true -> "Counts as everyday money"; false -> "Not everyday money"; null -> null }).joinToString(", ").ifBlank { null })
            Fact("Note", a.description)
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onEdit, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) {
                    Icon(Icons.Outlined.Edit, null, Modifier.padding(end = 6.dp)); Text("Edit")
                }
                Button(onClick = onArchive, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) {
                    Icon(Icons.Outlined.Archive, null, Modifier.padding(end = 6.dp)); Text("Archive")
                }
            }
            Button(
                onClick = onDelete, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer),
            ) { Icon(Icons.Outlined.Delete, null, Modifier.padding(end = 6.dp)); Text("Delete") }
        }
    }
}

@Composable
private fun Fact(label: String, value: String?) {
    if (value.isNullOrBlank()) return
    Row(Modifier.fillMaxWidth()) {
        Text(label, Modifier.weight(0.35f), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, Modifier.weight(0.65f), style = MaterialTheme.typography.bodyMedium)
    }
}
