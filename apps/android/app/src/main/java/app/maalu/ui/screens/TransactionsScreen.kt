package app.maalu.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import app.maalu.ui.theme.Accents
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Clear
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.PaymentMethodLabels
import app.maalu.data.Totals
import app.maalu.data.Transaction
import app.maalu.data.dayLabel
import app.maalu.data.formatMoney
import app.maalu.data.formatNumber
import app.maalu.data.groupByDay
import app.maalu.data.isRefund
import app.maalu.data.shortTime
import app.maalu.data.title
import app.maalu.ui.components.MoneyText
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.MoneyStyle
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

private const val PAGE = 30
private val TYPES = listOf(null to "All", "income" to "Income", "expense" to "Expense", "transfer" to "Transfer")

/**
 * The list: search, a type filter, the newest first grouped by day, more loading as you reach the end,
 * and a sheet with every detail of the one you tap. Read-only for now; adding and editing come later.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun TransactionsScreen(api: Api) {
    var query by rememberSaveable { mutableStateOf("") }
    var committed by rememberSaveable { mutableStateOf("") }
    var type by rememberSaveable { mutableStateOf<String?>(null) }
    var planned by rememberSaveable { mutableStateOf(false) }
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }

    val items = remember { mutableStateListOf<Transaction>() }
    var total by remember { mutableStateOf<Int?>(null) }
    var totals by remember { mutableStateOf<Totals?>(null) }
    var loading by remember { mutableStateOf(true) }
    var loadingMore by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var selected by remember { mutableStateOf<Transaction?>(null) }
    var generation by remember { mutableIntStateOf(0) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // search waits for a pause in typing, so a request is not made for every letter
    LaunchedEffect(query) { delay(300); committed = query.trim() }

    fun filters(): Map<String, String> = buildMap {
        if (committed.isNotEmpty()) put("q", committed)
        type?.let { put("type", it) }
        if (planned) put("planned", "true")
    }

    LaunchedEffect(committed, type, planned, reload) {
        generation++
        if (!refreshing) loading = true
        error = null
        val f = filters()
        val filtered = committed.isNotEmpty() || type != null
        coroutineScope {
            val page = async { api.get<List<Transaction>>("transactions", f + mapOf("limit" to "$PAGE", "offset" to "0")) }
            val sums = async { if (filtered && !planned) api.get<Totals>("transactions/summary", f - "planned") else null }
            when (val r = page.await()) {
                is ApiResult.Ok -> { items.clear(); items.addAll(r.data); total = r.total ?: r.data.size }
                is ApiResult.Failed -> error = r.message
            }
            totals = (sums.await() as? ApiResult.Ok)?.data
        }
        loading = false
        refreshing = false
    }

    // load the next page when the end is near
    LaunchedEffect(listState) {
        snapshotFlow { (listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) to listState.layoutInfo.totalItemsCount }
            .collect { (last, count) ->
                val all = total ?: return@collect
                if (!loading && !loadingMore && items.size < all && count > 0 && last >= count - 6) {
                    loadingMore = true
                    val gen = generation
                    val r = api.get<List<Transaction>>("transactions", filters() + mapOf("limit" to "$PAGE", "offset" to "${items.size}"))
                    // the filters may have changed while this was on its way
                    if (gen == generation && r is ApiResult.Ok) items.addAll(r.data)
                    loadingMore = false
                }
            }
    }

    Column(Modifier.fillMaxSize()) {
        SearchPill(query, onChange = { query = it.take(100) }, modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
        Row(
            Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            TYPES.forEach { (value, label) ->
                FilterChip(selected = type == value && !planned, onClick = { type = value; planned = false }, label = { Text(label) })
            }
            FilterChip(selected = planned, onClick = { planned = !planned; if (planned) type = null }, label = { Text("Planned") })
        }

        totals?.let { SumsLine(it) }

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error != null -> Column(
                Modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(error ?: "", color = MaterialTheme.colorScheme.error)
                Button(onClick = { reload++ }) { Text("Try again") }
            }
            else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
                val groups by remember { derivedStateOf { groupByDay(items.toList()) } }
                if (items.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            if (committed.isNotEmpty() || type != null || planned) "Nothing matches." else "No transactions yet.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(bottom = 16.dp)) {
                    groups.forEach { (day, list) ->
                        stickyHeader(key = "d-$day") {
                            Surface(color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    dayLabel(day),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                                )
                            }
                        }
                        items(list.size, key = { list[it].id }) { i ->
                            val outer = 20.dp
                            val inner = 4.dp
                            val shape = RoundedCornerShape(
                                topStart = if (i == 0) outer else inner, topEnd = if (i == 0) outer else inner,
                                bottomStart = if (i == list.lastIndex) outer else inner, bottomEnd = if (i == list.lastIndex) outer else inner,
                            )
                            Surface(
                                shape = shape,
                                color = MaterialTheme.colorScheme.surfaceContainerLow,
                                modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 2.dp),
                            ) { TransactionRow(list[i]) { selected = list[i] } }
                        }
                    }
                    if (loadingMore) item { Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
                }
            }
        }
    }

    selected?.let { t -> DetailSheet(t) { selected = null } }
}

@Composable
private fun SumsLine(t: Totals) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        val small = MaterialTheme.typography.bodySmall
        Row { Text("In ", style = small); MoneyText(t.income, t.currency, style = small, color = ChartColors.IncomeLight) }
        Row { Text("Out ", style = small); MoneyText(t.expense, t.currency, style = small, color = ChartColors.ExpenseLight) }
    }
}

@Composable
private fun TransactionRow(t: Transaction, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        CategoryBadge(t)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(t.title(), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 2, overflow = TextOverflow.Ellipsis)
            val sub = listOfNotNull(
                shortTime(t.time),
                t.category.takeIf { t.type != "transfer" },
                t.account?.name,
            ).joinToString(" · ")
            Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            val marks = listOfNotNull(
                "Planned".takeIf { t.planned }, "Refund".takeIf { t.isRefund }, "Adjustment".takeIf { t.adjustment },
                t.subscription?.let { "Subscription" }, t.group?.name,
            )
            if (marks.isNotEmpty()) Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 2.dp)) { marks.forEach { Mark(it) } }
        }
        Text(
            signed(t),
            style = MaterialTheme.typography.bodyMedium.merge(MoneyStyle),
            color = amountColor(t),
        )
    }
}

/** A small tinted disc with the category's first letter, in its own accent (the web's category dot, as a native avatar). */
@Composable
private fun CategoryBadge(t: Transaction) {
    val accent = Accents[t.categoryColor] ?: MaterialTheme.colorScheme.outline
    val letter = (if (t.type == "transfer") "⇄" else t.category.firstOrNull()?.uppercase() ?: "?")
    Box(Modifier.size(36.dp).clip(CircleShape).background(accent.copy(alpha = 0.18f)), contentAlignment = Alignment.Center) {
        Text(letter, style = MaterialTheme.typography.labelLarge, color = accent, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun Mark(text: String) {
    Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.secondaryContainer) {
        Text(text, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSecondaryContainer, modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp))
    }
}

/** A quiet pill, not an outlined field: it should recede next to the list it filters. */
@Composable
private fun SearchPill(value: String, onChange: (String) -> Unit, modifier: Modifier = Modifier) {
    Surface(modifier.fillMaxWidth(), shape = CircleShape, color = MaterialTheme.colorScheme.surfaceContainerHigh) {
        Row(Modifier.padding(horizontal = 14.dp).height(40.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(Icons.Outlined.Search, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
            BasicTextField(
                value = value,
                onValueChange = onChange,
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                modifier = Modifier.weight(1f),
                decorationBox = { inner ->
                    Box(contentAlignment = Alignment.CenterStart) {
                        if (value.isEmpty()) Text("Search transactions", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                        inner()
                    }
                },
            )
            if (value.isNotEmpty()) IconButton(onClick = { onChange("") }, Modifier.size(28.dp)) { Icon(Icons.Outlined.Clear, "Clear search", Modifier.size(18.dp)) }
        }
    }
}

/** An expense is money out, income (and a refund) money in; a transfer has no sign. */
private fun signed(t: Transaction) = when (t.type) {
    "expense" -> "-" + formatMoney(t.amount, t.currency)
    "income" -> "+" + formatMoney(t.amount, t.currency)
    else -> formatMoney(t.amount, t.currency)
}

@Composable
private fun amountColor(t: Transaction) = when (t.type) {
    "income" -> ChartColors.IncomeLight
    "expense" -> ChartColors.ExpenseLight
    else -> MaterialTheme.colorScheme.onSurface
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailSheet(t: Transaction, onClose: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(t.title(), style = MaterialTheme.typography.titleMedium)
            Text(signed(t), style = MaterialTheme.typography.titleLarge.merge(MoneyStyle), color = amountColor(t))
            val rate = t.exchangeRate.toBigDecimalOrNull()
            if (rate != null && rate.compareTo(java.math.BigDecimal.ONE) != 0 && t.baseAmount != null) {
                Text(
                    "Rate ${rate.stripTrailingZeros().toPlainString()} · ${formatNumber(t.baseAmount)} in your base currency",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Fact("When", dayLabel(t.date) + (shortTime(t.time)?.let { ", $it" } ?: "") + if (t.planned) " (planned)" else "")
            Fact("Type", t.type.replaceFirstChar { it.uppercase() } + if (t.isRefund) " · refund" else "")
            if (t.type == "transfer") {
                Fact("From", t.account?.name)
                Fact("To", listOfNotNull(t.toAccount?.name, t.toAmount?.let { formatMoney(it, t.toAccount?.currency ?: t.currency) }).joinToString(" · "))
            } else {
                Fact("Account", t.account?.name)
                Fact("Category", t.category)
                Fact("Vendor", t.vendor?.name)
            }
            Fact("Payment", PaymentMethodLabels[t.paymentMethod])
            Fact("Card", t.card?.let { it.name + (it.lastDigits?.let { d -> " ••$d" } ?: "") })
            Fact("Subscription", t.subscription?.name)
            Fact("Group", t.group?.name)
            if (t.tags.isNotEmpty()) Fact("Tags", t.tags.joinToString(", ") { it.name })
            Fact("Note", t.description)
            if (t.attachmentCount > 0 || t.linkCount > 0) Fact("Attached", "${t.attachmentCount} file(s), ${t.linkCount} link(s)")
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
