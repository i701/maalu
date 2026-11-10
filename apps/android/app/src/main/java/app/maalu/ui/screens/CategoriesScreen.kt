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
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material.icons.outlined.Tune
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
import app.maalu.data.AccentNames
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Category
import app.maalu.data.CategoryForm
import app.maalu.data.OrganiseField
import app.maalu.data.Ref
import app.maalu.data.categoryFormFrom
import app.maalu.data.kindLabel
import app.maalu.data.mergeJson
import app.maalu.data.mergeTargets
import app.maalu.data.parentChoices
import app.maalu.data.patchJson
import app.maalu.data.problem
import app.maalu.data.toJson
import app.maalu.ui.components.ColorSwatches
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.ConfirmDialog
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.MorphTile
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.PickerSheet
import app.maalu.ui.components.SearchPill
import app.maalu.ui.components.SegmentedPills
import app.maalu.ui.components.Section
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.kindTint
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement

private sealed interface CatLoad {
    data object Loading : CatLoad
    data class Loaded(val items: List<Category>) : CatLoad
    data class Failed(val message: String) : CatLoad
}

private fun accent(name: String?) = Accents[name] ?: Accents.getValue("slate")

/**
 * Your categories: sub-categories listed under their parent, each with its colour, whether it is a need or a want, and how
 * many transactions use it. Add one, edit it, merge it into another or delete it (a category in use can only be merged).
 */
@Composable
fun CategoriesScreen(api: Api) {
    var attempt by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<Category?>(null) }
    var editing by remember { mutableStateOf<Category?>(null) }
    var adding by remember { mutableStateOf(false) }
    var merging by remember { mutableStateOf<Category?>(null) }
    var mergePair by remember { mutableStateOf<Pair<Category, Category>?>(null) }
    var deleting by remember { mutableStateOf<Category?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    val state by produceState<CatLoad>(CatLoad.Loading, attempt) {
        if (!refreshing) value = CatLoad.Loading
        value = when (val r = api.get<List<Category>>("categories")) {
            is ApiResult.Ok -> CatLoad.Loaded(r.data)
            is ApiResult.Failed -> CatLoad.Failed(r.message)
        }
        refreshing = false
    }
    val all = (state as? CatLoad.Loaded)?.items.orEmpty()

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            SearchPill(query, { query = it.take(100) }, Modifier.padding(horizontal = 16.dp, vertical = 6.dp), placeholder = "Search categories")
            when (val s = state) {
                CatLoad.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                is CatLoad.Failed -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = { attempt++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
                }
                is CatLoad.Loaded -> {
                    val shown = if (query.isBlank()) s.items else s.items.filter { it.name.contains(query.trim(), ignoreCase = true) }
                    PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; attempt++ }, modifier = Modifier.fillMaxSize()) {
                        if (shown.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(if (query.isBlank()) "No categories yet." else "Nothing matches.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        } else LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp)) {
                            items(shown.size, key = { shown[it].id }) { i ->
                                val c = shown[i]
                                MorphTile({ selected = c }, first = i == 0, last = i == shown.lastIndex, modifier = Modifier.padding(bottom = 2.dp)) { CategoryRow(c, indented = c.parentId != null) }
                            }
                        }
                    }
                }
            }
        }
        val expanded by remember { derivedStateOf { listState.firstVisibleItemIndex == 0 } }
        ExtendedFloatingActionButton(
            onClick = { adding = true }, expanded = expanded, icon = { Icon(Icons.Outlined.Add, null) }, text = { Text("Add category") },
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
        )
    }

    selected?.let { c ->
        CategorySheet(c, onEdit = { editing = c; selected = null }, onMerge = { merging = c; selected = null }, onDelete = { deleting = c; selected = null }, onClose = { selected = null })
    }
    if (adding) CategoryFormScreen(api, all, null, { adding = false }) { adding = false; attempt++; scope.launch { snackbar?.showSnackbar("Category added") } }
    editing?.let { c -> CategoryFormScreen(api, all, c, { editing = null }) { editing = null; attempt++; scope.launch { snackbar?.showSnackbar("Changes saved") } } }
    merging?.let { from ->
        PickerSheet(
            title = "Merge ${from.name} into…", anyLabel = null, entries = mergeTargets(all, from).map { Ref(it.id, it.name) }, selectedId = null,
            searchable = true, allowCreate = false, detail = null, onQuery = null,
            onPick = { r -> merging = null; r?.let { target -> all.firstOrNull { it.id == target.id }?.let { mergePair = from to it } } },
            onDismiss = { merging = null },
        )
    }
    mergePair?.let { (from, into) ->
        ConfirmDialog(
            "Merge ${from.name} into ${into.name}?", "Its ${from.transactionCount} transactions, budget limits and sub-categories move to ${into.name}, and ${from.name} is removed. This can't be undone.",
            "Merge", destructive = true, onDismiss = { mergePair = null },
            onConfirm = {
                mergePair = null
                scope.launch {
                    when (val r = api.postJson<JsonElement>("categories/${from.id}/merge", mergeJson(into.id).toString())) {
                        is ApiResult.Ok -> { attempt++; snackbar?.showSnackbar("Merged into ${into.name}") }
                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                    }
                }
            },
        )
    }
    deleting?.let { c ->
        ConfirmDialog(
            "Delete ${c.name}?", if (c.transactionCount > 0) "${c.name} is used by ${c.transactionCount} transactions, so it can't be deleted: merge it into another category instead." else "This can't be undone.",
            "Delete", onDismiss = { deleting = null },
            onConfirm = {
                deleting = null
                scope.launch {
                    when (val r = api.delete("categories/${c.id}")) {
                        is ApiResult.Ok -> { attempt++; snackbar?.showSnackbar("${c.name} deleted") }
                        is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                    }
                }
            },
        )
    }
}

@Composable
private fun CategoryRow(c: Category, indented: Boolean = false) {
    val tint = accent(c.color)
    // a sub-category is the same width as the rest, with more room inside on the left
    Row(Modifier.fillMaxWidth().padding(start = if (indented) 34.dp else 14.dp, end = 14.dp, top = 12.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(tint.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
            Text(c.name.firstOrNull()?.uppercase() ?: "?", style = MaterialTheme.typography.labelLarge, color = tint, fontWeight = FontWeight.SemiBold)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(c.name, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 1, overflow = TextOverflow.Ellipsis)
            val sub = listOfNotNull(
                "${c.transactionCount} ${if (c.transactionCount == 1) "transaction" else "transactions"}",
                c.childCount.takeIf { it > 0 }?.let { "$it sub-categories" },
                c.parent?.let { "in $it" },
            ).joinToString(" · ")
            Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        // a kind of its own is full colour; one taken from the parent is faded
        kindLabel(c.effectiveKind)?.let { label ->
            val own = c.kind != null
            Surface(shape = RoundedCornerShape(8.dp), color = kindTint(c.effectiveKind!!).copy(alpha = if (own) 0.3f else 0.14f)) {
                Text(label, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
            }
        }
        if (c.isSalary) Surface(shape = RoundedCornerShape(8.dp), color = accent("green").copy(alpha = 0.25f)) {
            Text("Pay", style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
        }
    }
}

@Composable
private fun CategorySheet(c: Category, onEdit: () -> Unit, onMerge: () -> Unit, onDelete: () -> Unit, onClose: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(c.name, style = MaterialTheme.typography.titleMedium)
            CategoryRow(c)
            Fact("Kind", kindLabel(c.kind)?.let { "$it (its own)" } ?: kindLabel(c.effectiveKind)?.let { "$it (from ${c.parent})" } ?: "Not sorted")
            Fact("Inside", c.parent)
            Fact("Sub-categories", c.childCount.takeIf { it > 0 }?.toString())
            Fact("Transactions", c.transactionCount.toString())
            if (c.isSalary) Text("This is the default category for pay: it can't be renamed, merged or deleted.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onEdit, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.Edit, null, Modifier.padding(end = 6.dp)); Text("Edit") }
                if (!c.isSalary) Button(onClick = onMerge, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.CallMerge, null, Modifier.padding(end = 6.dp)); Text("Merge") }
            }
            if (!c.isSalary) Button(
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

@Composable
private fun CategoryFormScreen(api: Api, existing: List<Category>, editing: Category?, onClose: () -> Unit, onSaved: () -> Unit) {
    val before = remember(editing) { editing?.let(::categoryFormFrom) }
    var form by remember { mutableStateOf(before ?: CategoryForm()) }
    var nameError by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val parents = parentChoices(existing, editing)

    FormDialog(
        title = if (editing == null) "New category" else "Edit category", saveLabel = if (editing == null) "Add category" else "Save changes",
        busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            val problem = form.problem(existing, editing?.id)
            if (problem != null) {
                nameError = problem.field == OrganiseField.Name; error = null
                scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(problem.message) }
                return@FormDialog
            }
            val patch = if (editing != null && before != null) form.patchJson(before) else null
            if (patch != null && patch.isEmpty()) { onClose(); return@FormDialog }
            busy = true; error = null; nameError = false
            scope.launch {
                val r = if (editing != null && patch != null) api.patchJson<Category>("categories/${editing.id}", patch.toString())
                else api.postJson<Category>("categories", form.toJson().toString())
                when (r) {
                    is ApiResult.Ok -> onSaved()
                    is ApiResult.Failed -> { error = r.message; busy = false; launch { snackbar.showSnackbar(r.message.lines().first()) } }
                }
            }
        },
    ) {
        Section("Name", Icons.Outlined.Category, accent("blue")) {
            CompactField(form.name, { nameError = false; form = form.copy(name = it.take(100)) }, "For example Groceries", enabled = !busy && editing?.isSalary != true, isError = nameError)
        }
        Section("Colour", Icons.Outlined.Palette, accent("pink")) {
            ColorSwatches(AccentNames, form.color, { form = form.copy(color = it) }, enabled = !busy)
            if (editing == null && form.color == null) Text("Left alone, Maalu picks the colour you use least.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Section("Need or want", Icons.Outlined.Tune, accent("lime")) {
            SegmentedPills(
                listOf<Pair<String?, String>>(null to "Not sorted", "need" to "Need", "want" to "Want"), form.kind, { form = form.copy(kind = it) },
                tint = { kindTint(it ?: "other") }, enabled = !busy,
            )
            Text("Reports and budgets can split spending into needs and wants.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (editing?.isSalary != true) Section("Inside", Icons.Outlined.Category, accent("violet")) {
            if (parents.isEmpty() && form.parentId == null) Text(
                if (editing != null && editing.childCount > 0) "This category has sub-categories, so it can't go inside another." else "There are no other top-level categories yet.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            ) else PickerField(
                title = "Inside which category", value = existing.firstOrNull { it.id == form.parentId }?.let { Ref(it.id, it.name) },
                placeholder = "None: a top-level category", anyLabel = "None: a top-level category", searchable = true,
                entries = parents.map { Ref(it.id, it.name) }, onPick = { form = form.copy(parentId = it?.id) },
            )
        }
    }
}
