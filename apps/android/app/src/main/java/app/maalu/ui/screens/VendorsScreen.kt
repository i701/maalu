@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CallMerge
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SnackbarHostState
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
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.CategoryItem
import app.maalu.data.CurrencyList
import app.maalu.data.Ref
import app.maalu.data.Tag
import app.maalu.data.Vendor
import app.maalu.data.VendorForm
import app.maalu.data.localityLabel
import app.maalu.data.mergeJson
import app.maalu.data.patchJson
import app.maalu.data.problem
import app.maalu.data.toJson
import app.maalu.data.vendorFormFrom
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.ConfirmDialog
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.MorphTile
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.PickerSheet
import app.maalu.ui.components.SearchPill
import app.maalu.ui.components.SegmentedPills
import app.maalu.ui.components.Section
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.idTint
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement

private const val VENDOR_PAGE = 40

/**
 * Your vendors, searched by the server as you type and loaded a page at a time. Each carries a usual category and tags
 * that fill the transaction form when you pick it. Add, edit, merge into another vendor, or delete (its transactions stay).
 */
@Composable
fun VendorsScreen(api: Api) {
    var query by remember { mutableStateOf("") }
    var committed by remember { mutableStateOf("") }
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    val items = remember { mutableStateListOf<Vendor>() }
    var total by remember { mutableStateOf<Int?>(null) }
    var loading by remember { mutableStateOf(true) }
    var loadingMore by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var generation by remember { mutableIntStateOf(0) }
    var selected by remember { mutableStateOf<Vendor?>(null) }
    var editing by remember { mutableStateOf<Vendor?>(null) }
    var adding by remember { mutableStateOf(false) }
    var merging by remember { mutableStateOf<Vendor?>(null) }
    var mergePair by remember { mutableStateOf<Pair<Vendor, Vendor>?>(null) }
    var deleting by remember { mutableStateOf<Vendor?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    LaunchedEffect(query) { delay(300); committed = query.trim() }

    fun params(): Map<String, Any> = buildMap { if (committed.isNotEmpty()) put("q", committed) }

    LaunchedEffect(committed, reload) {
        generation++
        if (!refreshing) loading = true
        error = null
        when (val r = api.get<List<Vendor>>("vendors", params() + mapOf("limit" to "$VENDOR_PAGE", "offset" to "0"))) {
            is ApiResult.Ok -> { items.clear(); items.addAll(r.data); total = r.total ?: r.data.size }
            is ApiResult.Failed -> error = r.message
        }
        loading = false; refreshing = false
    }
    LaunchedEffect(listState) {
        snapshotFlow { (listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) to listState.layoutInfo.totalItemsCount }.collect { (last, count) ->
            val all = total ?: return@collect
            if (!loading && !loadingMore && items.size < all && count > 0 && last >= count - 6) {
                loadingMore = true
                val gen = generation
                val r = api.get<List<Vendor>>("vendors", params() + mapOf("limit" to "$VENDOR_PAGE", "offset" to "${items.size}"))
                if (gen == generation && r is ApiResult.Ok) items.addAll(r.data)
                loadingMore = false
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            SearchPill(query, { query = it.take(100) }, Modifier.padding(horizontal = 16.dp, vertical = 6.dp), placeholder = "Search vendors")
            when {
                loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                error != null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(error ?: "", color = MaterialTheme.colorScheme.error)
                    Button(onClick = { reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
                }
                else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
                    if (items.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(if (committed.isEmpty()) "No vendors yet." else "Nothing matches.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp)) {
                        items(items.size, key = { items[it].id }) { i ->
                            val v = items[i]
                            MorphTile({ selected = v }, first = i == 0, last = i == items.lastIndex, modifier = Modifier.padding(bottom = 2.dp)) { VendorRow(v) }
                        }
                        if (loadingMore) item { Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
                    }
                }
            }
        }
        val expanded by remember { derivedStateOf { listState.firstVisibleItemIndex == 0 } }
        ExtendedFloatingActionButton(
            onClick = { adding = true }, expanded = expanded, icon = { Icon(Icons.Outlined.Add, null) }, text = { Text("Add vendor") },
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
        )
    }

    selected?.let { v -> VendorSheet(v, onEdit = { editing = v; selected = null }, onMerge = { merging = v; selected = null }, onDelete = { deleting = v; selected = null }, onClose = { selected = null }) }
    if (adding) VendorFormScreen(api, null, { adding = false }) { adding = false; reload++; scope.launch { snackbar?.showSnackbar("Vendor added") } }
    editing?.let { v -> VendorFormScreen(api, v, { editing = null }) { editing = null; reload++; scope.launch { snackbar?.showSnackbar("Changes saved") } } }
    merging?.let { from -> VendorMergePicker(api, from, onPick = { merging = null; mergePair = from to it }, onDismiss = { merging = null }) }
    mergePair?.let { (from, into) ->
        ConfirmDialog(
            "Merge ${from.name} into ${into.name}?", "Its transactions, subscriptions and templates move to ${into.name}, and ${from.name} is removed. ${into.name} keeps what it has and takes any details it lacks. This can't be undone.",
            "Merge", onDismiss = { mergePair = null },
            onConfirm = {
                mergePair = null
                scope.launch {
                    when (val r = api.postJson<JsonElement>("vendors/${from.id}/merge", mergeJson(into.id).toString())) {
                        is ApiResult.Ok -> { reload++; snackbar?.showSnackbar("Merged into ${into.name}") }
                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                    }
                }
            },
        )
    }
    deleting?.let { v ->
        ConfirmDialog(
            "Delete ${v.name}?", "Its transactions stay, with no vendor. This can't be undone.", "Delete", onDismiss = { deleting = null },
            onConfirm = {
                deleting = null
                scope.launch {
                    when (val r = api.delete("vendors/${v.id}")) {
                        is ApiResult.Ok -> { reload++; snackbar?.showSnackbar("${v.name} deleted") }
                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                    }
                }
            },
        )
    }
}

@Composable
private fun VendorRow(v: Vendor) {
    val tint = idTint(v.id)
    Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(tint.copy(alpha = 0.18f)), contentAlignment = Alignment.Center) {
            Text(v.name.firstOrNull()?.uppercase() ?: "?", style = MaterialTheme.typography.labelLarge, color = tint, fontWeight = FontWeight.SemiBold)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(v.name, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 1, overflow = TextOverflow.Ellipsis)
            val sub = listOfNotNull(v.defaultCategory, v.address ?: v.place).joinToString(" · ")
            if (sub.isNotEmpty()) Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        localityLabel(v.isLocal)?.let { label ->
            Surface(shape = RoundedCornerShape(8.dp), color = Accents.getValue(if (v.isLocal == true) "green" else "orange").copy(alpha = 0.22f)) {
                Text(label, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
            }
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

@Composable
private fun VendorSheet(v: Vendor, onEdit: () -> Unit, onMerge: () -> Unit, onDelete: () -> Unit, onClose: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(v.name, style = MaterialTheme.typography.titleMedium)
            Fact("Usual category", v.defaultCategory)
            Fact("Usual tags", v.defaultTags.joinToString(", ") { it.name })
            Fact("Where", localityLabel(v.isLocal))
            Fact("Address", v.address)
            Fact("Contact", v.contact)
            Fact("Currency", v.currency)
            Fact("Place", v.place)
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onEdit, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.Edit, null, Modifier.padding(end = 6.dp)); Text("Edit") }
                Button(onClick = onMerge, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.CallMerge, null, Modifier.padding(end = 6.dp)); Text("Merge") }
            }
            Button(
                onClick = onDelete, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer),
            ) { Icon(Icons.Outlined.Delete, null, Modifier.padding(end = 6.dp)); Text("Delete") }
        }
    }
}

/** Pick the vendor to merge into: searched on the server like every vendor list, since there may be many. */
@Composable
private fun VendorMergePicker(api: Api, from: Vendor, onPick: (Vendor) -> Unit, onDismiss: () -> Unit) {
    var results by remember { mutableStateOf<List<Vendor>>(emptyList()) }
    var query by remember { mutableStateOf("") }
    LaunchedEffect(query) {
        if (query.isNotEmpty()) delay(250)
        results = (api.get<List<Vendor>>("vendors", buildMap { if (query.isNotEmpty()) put("q", query); put("limit", "30") }) as? ApiResult.Ok)?.data.orEmpty().filter { it.id != from.id }
    }
    PickerSheet(
        title = "Merge ${from.name} into…", anyLabel = null, entries = results.map { Ref(it.id, it.name) }, selectedId = null,
        searchable = true, allowCreate = false, detail = { r -> results.firstOrNull { it.id == r.id }?.defaultCategory }, onQuery = { query = it },
        onPick = { r -> r?.let { target -> results.firstOrNull { it.id == target.id }?.let(onPick) } }, onDismiss = onDismiss,
    )
}

@Composable
private fun VendorFormScreen(api: Api, editing: Vendor?, onClose: () -> Unit, onSaved: () -> Unit) {
    val before = remember(editing) { editing?.let(::vendorFormFrom) }
    var form by remember { mutableStateOf(before ?: VendorForm()) }
    var currencies by remember { mutableStateOf<List<String>>(emptyList()) }
    var categories by remember { mutableStateOf<List<CategoryItem>>(emptyList()) }
    var tags by remember { mutableStateOf<List<Tag>>(emptyList()) }
    var nameError by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) {
        currencies = (api.get<CurrencyList>("currencies") as? ApiResult.Ok)?.data?.currencies.orEmpty()
        categories = (api.get<List<CategoryItem>>("categories") as? ApiResult.Ok)?.data.orEmpty()
        tags = (api.get<List<Tag>>("tags") as? ApiResult.Ok)?.data.orEmpty()
    }

    FormDialog(
        title = if (editing == null) "New vendor" else "Edit vendor", saveLabel = if (editing == null) "Add vendor" else "Save changes",
        busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            val problem = form.problem()
            if (problem != null) {
                nameError = true; error = null
                scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(problem.message) }
                return@FormDialog
            }
            val patch = if (editing != null && before != null) form.patchJson(before) else null
            if (patch != null && patch.isEmpty()) { onClose(); return@FormDialog }
            busy = true; error = null; nameError = false
            scope.launch {
                val r = if (editing != null && patch != null) api.patchJson<Vendor>("vendors/${editing.id}", patch.toString()) else api.postJson<Vendor>("vendors", form.toJson().toString())
                when (r) {
                    is ApiResult.Ok -> onSaved()
                    is ApiResult.Failed -> { error = r.message; busy = false; launch { snackbar.showSnackbar(r.message.lines().first()) } }
                }
            }
        },
    ) {
        Section("Name", Icons.Outlined.Storefront, Accents.getValue("orange")) {
            CompactField(form.name, { nameError = false; form = form.copy(name = it.take(100)) }, "For example Ensis Mart", enabled = !busy, isError = nameError)
        }
        Section("Usually", Icons.Outlined.Category, Accents.getValue("amber")) {
            PickerField(
                title = "Usual category", value = form.defaultCategory.takeIf { it.isNotBlank() }?.let { Ref("", it) }, placeholder = "A usual category (optional)", anyLabel = "None",
                searchable = true, allowCreate = true, entries = categories.map { Ref(it.id, it.name) }, onPick = { form = form.copy(defaultCategory = it?.name ?: "") },
            )
            Text("Picking this vendor on a transaction fills in the category and tags it usually gets.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (tags.isNotEmpty()) Section("Usual tags", Icons.Outlined.Sell, Accents.getValue("pink")) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                tags.forEach { t ->
                    val on = t.name in form.defaultTags
                    TintChip(idTint(t.id), on, { form = form.copy(defaultTags = if (on) form.defaultTags - t.name else form.defaultTags + t.name) }, { Text(t.name) })
                }
            }
        }
        Section("Where", Icons.Outlined.LocationOn, Accents.getValue("green")) {
            SegmentedPills(
                listOf<Pair<Boolean?, String>>(null to "Not set", true to "Local", false to "Foreign"), form.isLocal, { form = form.copy(isLocal = it) },
                tint = { when (it) { true -> Accents.getValue("green"); false -> Accents.getValue("orange"); null -> Accents.getValue("slate") } }, enabled = !busy,
            )
            CompactField(form.address, { form = form.copy(address = it.take(200)) }, "Address (optional)", enabled = !busy)
            CompactField(form.contact, { form = form.copy(contact = it.take(200)) }, "Phone or email (optional)", enabled = !busy)
        }
        Section("Currency", Icons.Outlined.Payments, Accents.getValue("blue")) {
            PickerField(
                title = "Currency", value = form.currency.takeIf { it.isNotBlank() }?.let { Ref(it, it) }, placeholder = "Usual currency (optional)", anyLabel = "None",
                searchable = true, entries = currencies.map { Ref(it, it) }, onPick = { form = form.copy(currency = it?.id ?: "") },
            )
        }
    }
}
