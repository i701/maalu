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
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.idTint
import app.maalu.ui.theme.kindTint
import app.maalu.ui.theme.methodTint
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.TextButton
import app.maalu.data.canEdit
import androidx.compose.material.icons.outlined.Clear
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.CompositionLocalProvider
import app.maalu.ui.components.MorphTile
import app.maalu.ui.components.SearchPill
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
import app.maalu.ui.components.PickerSheet
import app.maalu.data.transactionCount
import app.maalu.data.toggled
import app.maalu.data.tagBulkJson
import app.maalu.data.mergeBulk
import app.maalu.data.keepVisible
import app.maalu.data.idsJson
import app.maalu.data.categoryBulkJson
import app.maalu.data.bulkMessage
import app.maalu.data.batches
import app.maalu.data.TagItem
import app.maalu.data.Ref
import app.maalu.data.CategoryItem
import app.maalu.data.BulkResult
import app.maalu.data.ApiResult
import app.maalu.data.PaymentMethodLabels
import app.maalu.data.Totals
import app.maalu.data.TxFilters
import app.maalu.data.isAmount
import app.maalu.data.rangeLabel
import app.maalu.data.toJson
import app.maalu.data.txFiltersFromJson
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.InputChip
import androidx.compose.material3.InputChipDefaults
import app.maalu.ui.components.TintChip
import app.maalu.data.Transaction
import app.maalu.data.TransferSuggestion
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
/** Income green, expense red, transfer blue; All is the neutral one. */
@Composable
private fun typeTint(type: String?): Color = when (type) {
    "income" -> ChartColors.IncomeLight
    "expense" -> MaterialTheme.colorScheme.error
    "transfer" -> ChartColors.Line
    else -> MaterialTheme.colorScheme.outline
}

private val TYPES = listOf(null to "All", "income" to "Income", "expense" to "Expense", "transfer" to "Transfer")

/**
 * The list: search, a type filter, the newest first grouped by day, more loading as you reach the end,
 * and a sheet with every detail of the one you tap. Read-only for now; adding and editing come later.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TransactionsScreen(api: Api) {
    var query by rememberSaveable { mutableStateOf("") }
    var committed by rememberSaveable { mutableStateOf("") }
    var filters by rememberSaveable(stateSaver = FiltersSaver) { mutableStateOf(TxFilters()) }
    var showFilters by remember { mutableStateOf(false) }
    var adding by remember { mutableStateOf(false) }
    val snackbar = LocalSnackbar.current
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }

    val items = remember { mutableStateListOf<Transaction>() }
    var total by remember { mutableStateOf<Int?>(null) }
    var totals by remember { mutableStateOf<Totals?>(null) }
    var loading by remember { mutableStateOf(true) }
    var loadingMore by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var selected by remember { mutableStateOf<Transaction?>(null) }
    var suggestions by remember { mutableStateOf<List<TransferSuggestion>>(emptyList()) }
    var generation by remember { mutableIntStateOf(0) }
    // rows picked for a bulk action (a long press starts it); [choosing] is the category or tag being picked for them
    var picked by remember { mutableStateOf(emptySet<String>()) }
    var bulkBusy by remember { mutableStateOf(false) }
    var choosing by remember { mutableStateOf<String?>(null) }
    var choices by remember { mutableStateOf<List<Ref>>(emptyList()) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // search waits for a pause in typing, so a request is not made for every letter
    LaunchedEffect(query) { delay(300); committed = query.trim() }

    fun params(): Map<String, Any> = buildMap {
        if (committed.isNotEmpty()) put("q", committed)
        putAll(filters.query())
    }

    LaunchedEffect(committed, filters, reload) {
        generation++
        if (!refreshing) loading = true
        error = null
        val f = params()
        val filtered = committed.isNotEmpty() || filters.isFiltered()
        coroutineScope {
            val page = async { api.get<List<Transaction>>("transactions", f + mapOf("limit" to "$PAGE", "offset" to "0")) }
            val sums = async { if (filtered && !filters.planned) api.get<Totals>("transactions/summary", f) else null }
            when (val r = page.await()) {
                is ApiResult.Ok -> { items.clear(); items.addAll(r.data); total = r.total ?: r.data.size }
                is ApiResult.Failed -> error = r.message
            }
            totals = (sums.await() as? ApiResult.Ok)?.data
            // pairs that look like one move of your own money entered twice; a failure just means no card
            suggestions = (api.get<List<TransferSuggestion>>("transactions/transfer-suggestions") as? ApiResult.Ok)?.data.orEmpty()
        }
        loading = false
        refreshing = false
        picked = keepVisible(picked, items.map { it.id })
    }

    LaunchedEffect(choosing) {
        choices = when (choosing) {
            "category" -> (api.get<List<CategoryItem>>("categories") as? ApiResult.Ok)?.data.orEmpty().map { Ref(it.id, it.name) }
            "tag" -> (api.get<List<TagItem>>("tags") as? ApiResult.Ok)?.data.orEmpty().map { Ref(it.id, it.name) }
            else -> emptyList()
        }
    }

    /** Runs one bulk request over the picked rows (up to 500), says what happened and reloads. Returns the ids it changed. */
    fun bulk(done: (Int) -> String, request: suspend (List<String>) -> ApiResult<BulkResult>, undo: (suspend (List<String>) -> Unit)? = null) {
        val ids = picked.toList()
        bulkBusy = true
        scope.launch {
            val results = mutableListOf<BulkResult>()
            var failed: String? = null
            for (batch in batches(ids)) {
                when (val r = request(batch)) {
                    is ApiResult.Ok -> results += r.data
                    is ApiResult.Failed -> { failed = r.message.lines().first(); break }
                }
            }
            val merged = mergeBulk(results)
            val text = failed?.let { f -> if (merged.updated > 0) bulkMessage(done, merged) + ". $f" else f } ?: bulkMessage(done, merged)
            picked = emptySet(); bulkBusy = false; reload++
            if (undo != null && merged.updated > 0) {
                val answer = snackbar?.showSnackbar(text, actionLabel = "Undo", duration = androidx.compose.material3.SnackbarDuration.Long)
                if (answer == androidx.compose.material3.SnackbarResult.ActionPerformed) { undo(ids.filter { id -> merged.skipped.none { it.id == id } }); reload++ }
            } else snackbar?.showSnackbar(text)
        }
    }

    androidx.activity.compose.BackHandler(enabled = picked.isNotEmpty()) { picked = emptySet() }

    // load the next page when the end is near
    LaunchedEffect(listState) {
        snapshotFlow { (listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) to listState.layoutInfo.totalItemsCount }
            .collect { (last, count) ->
                val all = total ?: return@collect
                if (!loading && !loadingMore && items.size < all && count > 0 && last >= count - 6) {
                    loadingMore = true
                    val gen = generation
                    val r = api.get<List<Transaction>>("transactions", params() + mapOf("limit" to "$PAGE", "offset" to "${items.size}"))
                    // the filters may have changed while this was on its way
                    if (gen == generation && r is ApiResult.Ok) items.addAll(r.data)
                    loadingMore = false
                }
            }
    }

    Box(Modifier.fillMaxSize()) {
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            SearchPill(query, onChange = { query = it.take(100) }, modifier = Modifier.weight(1f))
            IconButton(onClick = { showFilters = true }, shapes = IconButtonDefaults.shapes()) {
                BadgedBox(badge = { if (filters.detailCount() > 0) Badge { Text("${filters.detailCount()}") } }) {
                    Icon(Icons.Outlined.Tune, "Filters")
                }
            }
        }
        Row(
            Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            TYPES.forEach { (value, label) ->
                TintChip(typeTint(value), selected = filters.type == value && !filters.planned, onClick = { filters = filters.copy(type = value, planned = false) }, label = { Text(label) })
            }
            TintChip(Color(0xFFEAB308), selected = filters.planned, onClick = { filters = filters.copy(planned = !filters.planned, type = null) }, label = { Text("Planned") })
        }

        ActiveFilters(filters, onChange = { filters = it })
        totals?.let { SumsLine(it) }

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error != null -> Column(
                Modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(error ?: "", color = MaterialTheme.colorScheme.error)
                Button(onClick = { reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
            }
            else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
                val groups by remember { derivedStateOf { groupByDay(items.toList()) } }
                if (items.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            if (committed.isNotEmpty() || filters.isFiltered()) "Nothing matches." else "No transactions yet.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(bottom = 16.dp)) {
                    if (suggestions.isNotEmpty() && committed.isEmpty() && !filters.isFiltered()) item(key = "transfer-suggestions") {
                        Box(Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) { TransferSuggestionsCard(api, suggestions, onChanged = { reload++ }, onSay = { msg -> scope.launch { snackbar?.showSnackbar(msg) } }) }
                    }
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
                            val t = list[i]
                            // the native expressive list item: large outer corners, small inner ones, and the
                            // shape springs toward squarer while it is pressed
                            // my own tile: a tonal fill, large outer corners, small inner ones and a 2dp gap, with the
                            // corners springing toward squarer while pressed (the library's list item draws no fill)
                            MorphTile(
                                onClick = { if (picked.isNotEmpty()) picked = toggled(picked, t.id) else selected = t },
                                onLongClick = { picked = toggled(picked, t.id) },
                                color = if (t.id in picked) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLow,
                                first = i == 0,
                                last = i == list.lastIndex,
                                modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 2.dp),
                            ) {
                                Row(
                                    Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    // a picked row swaps its badge for a tick, in the same 36dp, so nothing shifts when picking starts
                                    if (t.id in picked) PickedBadge() else CategoryBadge(t)
                                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text(t.title(), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 2, overflow = TextOverflow.Ellipsis)
                                        CompositionLocalProvider(LocalContentColor provides MaterialTheme.colorScheme.onSurfaceVariant) { RowDetails(t) }
                                    }
                                    MoneyText(t.amount, t.currency, prefix = signPrefix(t), style = MaterialTheme.typography.bodyMedium, color = amountColor(t))
                                }
                            }
                        }
                    }
                    if (loadingMore) item { Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
                }
            }
        }
    }
    val expanded by remember { derivedStateOf { listState.firstVisibleItemIndex == 0 } }
    if (picked.isNotEmpty()) TransactionSelectionBar(
        count = picked.size, busy = bulkBusy, modifier = Modifier.align(Alignment.BottomCenter),
        onDelete = {
            bulk(
                done = { "Moved ${transactionCount(it)} to the trash" },
                request = { ids -> api.postJson<BulkResult>("transactions/bulk/trash", idsJson(ids).toString()) },
                undo = { ids -> for (b in batches(ids)) api.postJson<BulkResult>("transactions/bulk/restore", idsJson(b).toString()) },
            )
        },
        onCategory = { choosing = "category" }, onTag = { choosing = "tag" }, onClear = { picked = emptySet() },
    ) else ExtendedFloatingActionButton(
        onClick = { adding = true },
        expanded = expanded,
        icon = { Icon(Icons.Outlined.Add, null) },
        text = { Text("Add") },
        modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
    )
    }

    selected?.let { t ->
        TransactionDetailHost(api, t, scope, onClose = { selected = null }, onChanged = { reload++ })
    }
    if (adding) AddTransactionScreen(
        api,
        onClose = { adding = false },
        onSaved = { adding = false; reload++; scope.launch { snackbar?.showSnackbar("Transaction added") } },
        onAdded = { reload++ },
    )
    choosing?.let { kind ->
        PickerSheet(
            title = if (kind == "category") "Set the category for ${transactionCount(picked.size)}" else "Add a tag to ${transactionCount(picked.size)}",
            anyLabel = null, entries = choices, selectedId = null, searchable = true, allowCreate = true, detail = null, onQuery = null,
            onPick = { r ->
                choosing = null
                val name = r?.name ?: return@PickerSheet
                if (kind == "category") bulk(done = { "Category set on ${transactionCount(it)}" }, request = { ids -> api.patchJson<BulkResult>("transactions/bulk", categoryBulkJson(ids, name).toString()) })
                else bulk(done = { "Tagged ${transactionCount(it)}" }, request = { ids -> api.patchJson<BulkResult>("transactions/bulk", tagBulkJson(ids, name).toString()) })
            },
            onDismiss = { choosing = null },
        )
    }
    if (showFilters) FiltersSheet(api, filters, onApply = { filters = it; showFilters = false }, onDismiss = { showFilters = false })
}

@Composable
private fun SumsLine(t: Totals) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        val small = MaterialTheme.typography.bodySmall
        Row { Text("In ", style = small); MoneyText(t.income, t.currency, style = small, color = ChartColors.IncomeLight) }
        Row { Text("Out ", style = small); MoneyText(t.expense, t.currency, style = small, color = MaterialTheme.colorScheme.error) }
    }
}

private val FiltersSaver = androidx.compose.runtime.saveable.Saver<TxFilters, String>(save = { it.toJson() }, restore = { txFiltersFromJson(it) })

/** What the sheet applied, as chips you can drop one at a time. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ActiveFilters(f: TxFilters, onChange: (TxFilters) -> Unit) {
    if (f.detailCount() == 0) return
    Row(
        Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        @Composable
        fun chip(label: String, tint: Color, clear: () -> Unit) = InputChip(
            selected = true, onClick = clear, label = { Text(label) },
            trailingIcon = { Icon(Icons.Outlined.Clear, "Remove $label", Modifier.size(16.dp)) },
            colors = InputChipDefaults.inputChipColors(selectedContainerColor = tint.copy(alpha = 0.4f), selectedLabelColor = MaterialTheme.colorScheme.onSurface),
            shape = CircleShape,
            border = null,
        )
        if (f.dateFrom != null || f.dateTo != null) chip(rangeLabel(f.dateFrom, f.dateTo), Accents.getValue("blue")) { onChange(f.copy(dateFrom = null, dateTo = null)) }
        f.account?.let { chip(it.name, Accents.getValue("violet")) { onChange(f.copy(account = null)) } }
        f.category?.let { chip(it.name, Accents.getValue("amber")) { onChange(f.copy(category = null)) } }
        f.tags.forEach { tag -> chip("#${tag.name}", idTint(tag.id)) { onChange(f.copy(tags = f.tags - tag)) } }
        f.method?.let { chip(PaymentMethodLabels[it] ?: it, methodTint(it)) { onChange(f.copy(method = null)) } }
        f.kind?.let { chip(when (it) { "need" -> "Needs"; "want" -> "Wants"; else -> "Not sorted" }, kindTint(it)) { onChange(f.copy(kind = null)) } }
        if (isAmount(f.min) || isAmount(f.max)) chip(
            listOfNotNull(f.min.takeIf { isAmount(it) }?.let { "≥ $it" }, f.max.takeIf { isAmount(it) }?.let { "≤ $it" }).joinToString(" "),
            Accents.getValue("orange"),
        ) { onChange(f.copy(min = "", max = "")) }
    }
}
