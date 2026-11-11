package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.BulkEdit
import app.maalu.data.CategoryItem
import app.maalu.data.MAX_SELECT_ALL
import app.maalu.data.PaymentMethodLabels
import app.maalu.data.Ref
import app.maalu.data.SelectAll
import app.maalu.data.TagItem
import app.maalu.data.transactionCount
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.TintChip
import app.maalu.ui.components.VendorPickerField
import app.maalu.ui.theme.idTint
import app.maalu.ui.theme.paletteTint
import androidx.compose.foundation.layout.Box as LayoutBox

/** The tick that stands in for a picked row's category badge: the same size, so the row does not change shape. */
@Composable
fun PickedBadge() {
    Box(Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
        Icon(Icons.Outlined.Check, "Selected", Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onPrimary)
    }
}

/**
 * What the bar above the list offers while rows are picked (a long press starts picking; a tap then ticks or unticks): Edit, Delete, and, once
 * every loaded row is ticked and more match, "Select all N" to reach past what is loaded.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TransactionSelectionBar(
    count: Int, selectAll: SelectAll, busy: Boolean,
    onEdit: () -> Unit, onDelete: () -> Unit, onSelectAll: () -> Unit, onClear: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = MaterialTheme.shapes.extraLarge, shadowElevation = 6.dp, modifier = modifier.fillMaxWidth().padding(12.dp)) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (selectAll is SelectAll.Wide) "All ${selectAll.total} matching are selected" else "$count selected",
                    style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f),
                )
                TextButton(onClick = onClear, enabled = !busy) { Text("Clear") }
            }
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(onClick = onEdit, enabled = !busy, shapes = ButtonDefaults.shapes()) { Icon(Icons.Outlined.Edit, null, Modifier.padding(end = 6.dp).size(18.dp)); Text("Edit") }
                Button(
                    onClick = onDelete, enabled = !busy, shapes = ButtonDefaults.shapes(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer),
                ) { Icon(Icons.Outlined.Delete, null, Modifier.padding(end = 6.dp).size(18.dp)); Text("Delete") }
                when (selectAll) {
                    is SelectAll.Offer -> TextButton(onClick = onSelectAll, enabled = !busy) { Text("Select all ${selectAll.total}") }
                    is SelectAll.TooMany -> Text("${selectAll.total} match: narrow it to $MAX_SELECT_ALL or fewer to select them all", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    else -> {}
                }
            }
        }
    }
}

/**
 * Change the same things on every picked transaction: a category, a vendor, the way of paying, tags to add and tags to remove. Leave
 * something alone to leave it as it is; what does not fit a transaction (a category on a transfer) is skipped and reported.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun BulkEditSheet(api: Api, count: Int, onClose: () -> Unit, onApply: (BulkEdit) -> Unit) {
    var categories by remember { mutableStateOf<List<CategoryItem>>(emptyList()) }
    var tags by remember { mutableStateOf<List<TagItem>>(emptyList()) }
    var edit by remember { mutableStateOf(BulkEdit()) }
    var problem by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        categories = (api.get<List<CategoryItem>>("categories") as? ApiResult.Ok)?.data.orEmpty()
        tags = (api.get<List<TagItem>>("tags") as? ApiResult.Ok)?.data.orEmpty()
    }
    ModalBottomSheet(onDismissRequest = onClose) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Edit ${transactionCount(count)}", style = MaterialTheme.typography.titleLarge)
            Text("Only what you set changes. Anything that does not fit a transaction, like a category on a transfer, is skipped.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            PickerField(
                title = "Set category", value = edit.category.takeIf { it.isNotBlank() }?.let { Ref("", it) }, placeholder = "Set category (leave as it is)", anyLabel = "Leave as it is",
                searchable = true, allowCreate = true, entries = categories.map { Ref(it.id, it.name) }, onPick = { edit = edit.copy(category = it?.name ?: ""); problem = null },
            )
            VendorPickerField(api, edit.vendor, onPick = { name, _ -> edit = edit.copy(vendor = name); problem = null })
            Text("Way of paying", style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PaymentMethodLabels.forEach { (value, label) ->
                    TintChip(paletteTint(value.length), edit.method == value, { edit = edit.copy(method = if (edit.method == value) null else value); problem = null }, { Text(label) })
                }
            }
            if (tags.isNotEmpty()) {
                Text("Add tags", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    tags.forEach { t ->
                        val on = t.name in edit.addTags
                        TintChip(idTint(t.id), on, { edit = edit.copy(addTags = if (on) edit.addTags - t.name else edit.addTags + t.name, removeTags = edit.removeTags - t.name); problem = null }, { Text(t.name) })
                    }
                }
                Text("Remove tags", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    tags.forEach { t ->
                        val on = t.name in edit.removeTags
                        TintChip(idTint(t.id), on, { edit = edit.copy(removeTags = if (on) edit.removeTags - t.name else edit.removeTags + t.name, addTags = edit.addTags - t.name); problem = null }, { Text(t.name) })
                    }
                }
            }
            problem?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            Button(
                onClick = { if (edit.isEmpty) problem = "Choose something to change." else onApply(edit) },
                shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth(),
            ) { Text("Apply to ${transactionCount(count)}") }
        }
    }
}
