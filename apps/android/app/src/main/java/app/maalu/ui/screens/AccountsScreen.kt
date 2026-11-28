@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import app.maalu.ui.components.elevation
import java.math.BigDecimal
import app.maalu.ui.components.SummaryDonut
import app.maalu.ui.components.SummaryBlue
import app.maalu.ui.components.MiniBar
import app.maalu.ui.components.FlatSummary
import app.maalu.ui.components.DonutPart
import app.maalu.data.shareOf
import app.maalu.data.heldByGroup
import app.maalu.ui.components.fadingEdges
import app.maalu.ui.components.SpringBar
import app.maalu.ui.components.fadeInOnAppear
import app.maalu.ui.components.springItem
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
import app.maalu.ui.components.ConfirmDialog
import androidx.compose.material3.IconButton
import androidx.compose.material.icons.outlined.Unarchive
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.Archive
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import app.maalu.ui.components.AlertDialog
import app.maalu.ui.components.RaisedButton
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
import app.maalu.ui.components.BankAvatar
import app.maalu.ui.components.BankChip
import app.maalu.data.bankBrand
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.MorphTile
import app.maalu.ui.components.Sparkline
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.MoneyStyle
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

private class AccountsData(val accounts: List<Account>, val summary: AccountSummary?, val trends: Map<String, List<Double>>, val archived: List<Account> = emptyList())

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
fun AccountsScreen(api: Api, onOpen: (Account) -> Unit) {
    var attempt by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var adding by remember { mutableStateOf(false) }
    var showArchived by androidx.compose.runtime.saveable.rememberSaveable { mutableStateOf(false) }
    var deletingArchived by remember { mutableStateOf<Account?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    val state by produceState<Load>(Load.Loading, attempt) {
        if (!refreshing) value = Load.Loading
        value = coroutineScope {
            val accounts = async { api.get<List<Account>>("accounts") }
            val summary = async { api.get<AccountSummary>("accounts/summary") }
            val trends = async { api.get<List<AccountTrend>>("accounts/trends", mapOf("days" to "30")) }
            val archivedCall = async { api.get<List<Account>>("accounts", mapOf("archived" to "true")) }
            when (val a = accounts.await()) {
                is ApiResult.Failed -> Load.Failed(a.message)
                is ApiResult.Ok -> Load.Loaded(
                    AccountsData(
                        a.data,
                        (summary.await() as? ApiResult.Ok)?.data,
                        // the trend lines are a nicety: without them the page is the same
                        (trends.await() as? ApiResult.Ok)?.data.orEmpty().associate { t -> t.accountId to t.balances.map { it.toDoubleOrNull() ?: 0.0 } },
                        (archivedCall.await() as? ApiResult.Ok)?.data.orEmpty(),
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
                RaisedButton(onClick = { attempt++ }) { Text("Try again") }
            }
            is Load.Loaded -> {
                val groups = s.data.accounts.groupBy { it.group }
                PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; attempt++ }, modifier = Modifier.fillMaxSize()) {
                    LazyColumn(Modifier.fillMaxSize().fadeInOnAppear().fadingEdges(listState), state = listState, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp)) {
                        s.data.summary?.let { item { NetWorthSummary(it, s.data.accounts) } }
                        if (s.data.accounts.isEmpty()) item { Text("No accounts yet. Add your first one.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 24.dp)) }
                        groups.forEach { (group, list) ->
                            item(key = "h-$group") {
                                Text(groupLabel(group), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp, top = 20.dp, bottom = 8.dp))
                            }
                            items(list.size, key = { list[it].id }) { i -> Box(springItem()) {
                                val a = list[i]
                                MorphTile(onClick = { onOpen(a) }, first = i == 0, last = i == list.lastIndex, modifier = Modifier.padding(bottom = 2.dp)) {
                                    AccountRow(a, s.data.trends[a.id], s.data.summary?.currency ?: "")
                                }
                             }}
                        }
                        // closed accounts: out of the totals and the pickers, history kept; collapsed, since they are not what you came for
                        if (s.data.archived.isNotEmpty()) {
                            item(key = "archived-header") {
                                TextButton(shapes = ButtonDefaults.shapes(), onClick = { showArchived = !showArchived }, modifier = Modifier.padding(top = 12.dp)) {
                                    Icon(if (showArchived) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, null, Modifier.padding(end = 6.dp))
                                    Text("Archived (${s.data.archived.size})")
                                }
                            }
                            if (showArchived) {
                                item(key = "archived-note") {
                                    Text("Not counted in your totals or offered on new transactions. Their past transactions are kept.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp, bottom = 8.dp))
                                }
                                items(s.data.archived.size, key = { "archived-" + s.data.archived[it].id }) { i -> Box(springItem()) {
                                    val a = s.data.archived[i]
                                    Surface(Modifier.fillMaxWidth().padding(bottom = 2.dp).elevation(2, MaterialTheme.shapes.large), shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow) {
                                        Row(Modifier.padding(start = 14.dp, top = 6.dp, bottom = 6.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Column(Modifier.weight(1f)) {
                                                Text(a.name, style = MaterialTheme.typography.bodyMediumEmphasized, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                Text(listOfNotNull(groupLabel(a.group), a.bank).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                            }
                                            MoneyText(a.balance, a.currency, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            IconButton(onClick = {
                                                scope.launch {
                                                    when (val r = api.post("accounts/${a.id}/unarchive")) {
                                                        is ApiResult.Ok -> { attempt++; snackbar?.showSnackbar("\"${a.name}\" is back in use") }
                                                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                                                    }
                                                }
                                            }) { Icon(Icons.Outlined.Unarchive, "Unarchive ${a.name}") }
                                            IconButton(onClick = { deletingArchived = a }) { Icon(Icons.Outlined.Delete, "Delete ${a.name}") }
                                        }
                                    }
                                 }}
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

    deletingArchived?.let { a ->
        ConfirmDialog(
            "Delete ${a.name}?",
            if (a.transactionCount > 0) "Its ${a.transactionCount} transactions stay in your history but lose this account. This can't be undone." else "This can't be undone.",
            "Delete", onDismiss = { deletingArchived = null },
            onConfirm = {
                deletingArchived = null
                scope.launch {
                    when (val r = api.delete("accounts/${a.id}")) {
                        is ApiResult.Ok -> { attempt++; snackbar?.showSnackbar("${a.name} deleted") }
                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                    }
                }
            },
        )
    }
    val all = (state as? Load.Loaded)?.data?.accounts.orEmpty()
    if (adding) AccountFormScreen(api, all, null, onClose = { adding = false }, onSaved = { adding = false; attempt++; scope.launch { snackbar?.showSnackbar("Account added") } })
}

/** What you are worth, and a donut of what you own against what you owe, with bars of what each type of account holds. */
@Composable
private fun NetWorthSummary(s: AccountSummary, accounts: List<Account>) {
    val assets = (s.assets.toBigDecimalOrNull() ?: BigDecimal.ZERO).abs()
    val liabilities = (s.liabilities.toBigDecimalOrNull() ?: BigDecimal.ZERO).abs()
    FlatSummary(SummaryBlue) {
        Text("Net worth", style = MaterialTheme.typography.titleSmall)
        MoneyText(s.total, s.currency, style = MaterialTheme.typography.displaySmall)
        shareOf(liabilities, assets + liabilities)?.let { owed ->
            val held = heldByGroup(accounts)
            val biggest = held.maxOfOrNull { it.second }
            SummaryDonut(
                DonutPart("Assets", 1f - owed, formatMoney(assets.toPlainString(), s.currency)),
                DonutPart("Liabilities", owed, formatMoney(liabilities.toPlainString(), s.currency)),
                held.map { (group, total) -> MiniBar(groupLabel(group).take(1).uppercase(), total.toFloat(), total == biggest) },
            )
        }
    }
}

@Composable
private fun AccountRow(a: Account, trend: List<Double>?, baseCurrency: String) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        val brand = a.bank?.let(::bankBrand)
        if (brand != null) BankAvatar(brand)
        else Box(Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceContainerHighest), contentAlignment = Alignment.Center) {
            Text(a.name.firstOrNull()?.uppercase() ?: "?", style = MaterialTheme.typography.labelLargeEmphasized, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            // a bank without a logo is named in a chip beside the name; a long name gives way to it
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(a.name, Modifier.weight(1f, fill = false), style = MaterialTheme.typography.bodyMediumEmphasized, maxLines = 2, overflow = TextOverflow.Ellipsis)
                a.bank?.takeIf { brand == null && it.isNotBlank() }?.let { BankChip(it) }
            }
            a.accountNumber?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis) }
            creditUsage(a.balance, a.creditLimit)?.let { u ->
                val color = when { u.percent >= 90 -> MaterialTheme.colorScheme.error; u.percent >= 60 -> ChartColors.Warning; else -> ChartColors.IncomeLight }
                SpringBar(u.percent / 100f, color, 5.dp, Modifier.padding(top = 4.dp), minVisible = 0.03f)
                Text("${u.percent}% of ${formatMoney(u.limit.toPlainString(), a.currency)} used", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            MoneyText(
                a.balance, a.currency,
                style = MaterialTheme.typography.bodyMedium,
                color = if (a.balance.startsWith("-")) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            )
            if (a.exchangeRate.toBigDecimalOrNull()?.compareTo(java.math.BigDecimal.ONE) != 0) {
                Text("≈ ${formatMoney(a.baseBalance, baseCurrency)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            trend?.let { Sparkline(it, ChartColors.IncomeLight, ChartColors.ExpenseLight, MaterialTheme.colorScheme.outline) }
        }
    }
}
