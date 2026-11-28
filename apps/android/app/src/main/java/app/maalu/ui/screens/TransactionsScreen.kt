package app.maalu.ui.screens

import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.platform.LocalFocusManager
import app.maalu.ui.components.fadingEdges
import androidx.compose.ui.zIndex
import androidx.compose.material3.LinearProgressIndicator
import app.maalu.ui.components.BottomReveal
import androidx.compose.animation.animateContentSize
import app.maalu.ui.components.springItem
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import app.maalu.ui.components.AlertDialog
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
import app.maalu.data.selectAllState
import app.maalu.data.bulkEditJson
import app.maalu.ui.components.PickerSheet
import app.maalu.data.transactionCount
import app.maalu.data.toggled
import app.maalu.data.mergeBulk
import app.maalu.data.keepVisible
import app.maalu.data.idsJson
import app.maalu.data.bulkMessage
import app.maalu.data.batches
import app.maalu.data.TagItem
import app.maalu.data.Ref
import app.maalu.data.CategoryItem
import app.maalu.data.BulkResult
import app.maalu.data.ApiResult
import app.maalu.data.Totals
import app.maalu.data.TxFilters
import app.maalu.data.toJson
import app.maalu.data.txFiltersFromJson
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
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
import app.maalu.ui.theme.MoneyStyle
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

private const val PAGE = 30
/**
 * The list: search and filters in a card at the top, the newest first grouped by day in quiet rows, more loading as you reach the end,
 * and a sheet with every detail of the one you tap. Read-only for now; adding and editing come later.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TransactionsScreen(api: Api, initial: TxFilters? = null, onInitialUsed: () -> Unit = {}) {
    var query by rememberSaveable { mutableStateOf("") }
    var committed by rememberSaveable { mutableStateOf("") }
    var filters by rememberSaveable(stateSaver = FiltersSaver) { mutableStateOf(initial ?: TxFilters()) }
    LaunchedEffect(Unit) { onInitialUsed() }
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
    var editing by remember { mutableStateOf(false) }
    // the selection reaches past what is loaded (every row that matches the filters); it ends when the filters or the search change
    var wide by remember { mutableStateOf(false) }
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
        if (!wide) picked = keepVisible(picked, items.map { it.id })
    }

    LaunchedEffect(committed, filters) { picked = emptySet(); wide = false }

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
            picked = emptySet(); wide = false; bulkBusy = false; reload++
            if (undo != null && merged.updated > 0) {
                val answer = snackbar?.showSnackbar(text, actionLabel = "Undo", duration = androidx.compose.material3.SnackbarDuration.Long)
                if (answer == androidx.compose.material3.SnackbarResult.ActionPerformed) { undo(ids.filter { id -> merged.skipped.none { it.id == id } }); reload++ }
            } else snackbar?.showSnackbar(text)
        }
    }

    androidx.activity.compose.BackHandler(enabled = picked.isNotEmpty()) { picked = emptySet(); wide = false }

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

    // scrolling the list puts the keyboard away, as on iOS
    val focus = LocalFocusManager.current
    LaunchedEffect(listState) { snapshotFlow { listState.isScrollInProgress }.collect { if (it) focus.clearFocus() } }

    Box(Modifier.fillMaxSize()) {
    PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
        if (loading && !refreshing && items.isNotEmpty()) LinearProgressIndicator(Modifier.fillMaxWidth().align(Alignment.TopCenter).zIndex(1f))
        val groups by remember { derivedStateOf { groupByDay(items.toList()) } }
        LazyColumn(Modifier.fillMaxSize().fadingEdges(listState), state = listState, contentPadding = PaddingValues(bottom = 16.dp)) {
            item(key = "search") {
                TransactionSearchCard(query, { query = it.take(100) }, filters, { filters = it }, totals, onOpenFilters = { showFilters = true })
            }
            when {
                loading && items.isEmpty() -> item(key = "loading") { Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
                error != null -> item(key = "error") {
                    Column(Modifier.fillMaxWidth().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(error ?: "", color = MaterialTheme.colorScheme.error)
                        Button(onClick = { reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
                    }
                }
                else -> {
                    if (items.isEmpty()) item(key = "empty") {
                        Text(
                            if (committed.isNotEmpty() || filters.isFiltered()) "Nothing matches." else "No transactions yet.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(32.dp),
                        )
                    }
                    if (suggestions.isNotEmpty() && committed.isEmpty() && !filters.isFiltered()) item(key = "transfer-suggestions") {
                        Box(Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) { TransferSuggestionsCard(api, suggestions, onChanged = { reload++ }, onSay = { msg -> scope.launch { snackbar?.showSnackbar(msg) } }) }
                    }
                    groups.forEach { (day, list) ->
                        item(key = "d-$day") { DayHeader(dayLabel(day)) }
                        items(list.size, key = { list[it].id }) { i -> Box(springItem()) {
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
                                    // while picking, every row shows whether it is ticked
                                    if (picked.isNotEmpty()) {
                                        if (t.id in picked) PickedBadge() else Icon(Icons.Outlined.RadioButtonUnchecked, "Not selected", Modifier.padding(6.dp), tint = MaterialTheme.colorScheme.outline)
                                    }
                                    QuietRow(t)
                                }
                            }
                         }}
                    }
                    if (loadingMore) item { Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
                }
            }
        }
    }
    val expanded by remember { derivedStateOf { listState.firstVisibleItemIndex == 0 } }
    // the bar fades out as itself: while it leaves, `picked` is already empty, so the count is the last one
    var lastCount by remember { mutableIntStateOf(0) }
    LaunchedEffect(picked.size) { if (picked.isNotEmpty()) lastCount = picked.size }
    val shownCount = if (picked.isEmpty()) lastCount else picked.size
    BottomReveal(picked.isNotEmpty()) { TransactionSelectionBar(
        count = shownCount, selectAll = selectAllState(total ?: items.size, items.size, shownCount, wide), busy = bulkBusy,
        onEdit = { editing = true },
        onDelete = {
            bulk(
                done = { "Moved ${transactionCount(it)} to the trash" },
                request = { ids -> api.postJson<BulkResult>("transactions/bulk/trash", idsJson(ids).toString()) },
                undo = { ids -> for (b in batches(ids)) api.postJson<BulkResult>("transactions/bulk/restore", idsJson(b).toString()) },
            )
        },
        onSelectAll = {
            scope.launch {
                bulkBusy = true
                when (val r = api.get<List<String>>("transactions/ids", params())) {
                    is ApiResult.Ok -> { picked = r.data.toSet(); wide = true }
                    is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                }
                bulkBusy = false
            }
        },
        onClear = { picked = emptySet(); wide = false },
    ) }
    if (picked.isEmpty()) ExtendedFloatingActionButton(
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
    if (editing) BulkEditSheet(
        api, picked.size, onClose = { editing = false },
        onApply = { change ->
            editing = false
            bulk(done = { "Updated ${transactionCount(it)}" }, request = { ids -> api.patchJson<BulkResult>("transactions/bulk", bulkEditJson(ids, change).toString()) })
        },
    )
    if (showFilters) FiltersSheet(api, filters, onApply = { filters = it; showFilters = false }, onDismiss = { showFilters = false })
}

private val FiltersSaver = androidx.compose.runtime.saveable.Saver<TxFilters, String>(save = { it.toJson() }, restore = { txFiltersFromJson(it) })

