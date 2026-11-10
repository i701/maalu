package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Balance
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Numbers
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.outlined.ArrowDropDown
import androidx.compose.material.icons.outlined.Check
import androidx.compose.ui.focus.onFocusChanged
import app.maalu.ui.components.MorphTile
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.DropdownMenuPopup
import androidx.compose.material3.ExperimentalMaterial3Api
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.idTint
import app.maalu.ui.theme.kindTint
import app.maalu.ui.theme.methodTint
import app.maalu.ui.theme.paletteTint
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.maalu.data.Account
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.CategoryItem
import app.maalu.data.DatePreset
import app.maalu.data.PaymentMethodLabels
import app.maalu.data.Ref
import app.maalu.data.TagItem
import app.maalu.data.TxFilters
import app.maalu.data.presetRange
import app.maalu.data.rangeLabel
import java.time.Instant
import java.time.ZoneOffset

private class Options(val accounts: List<Account>, val categories: List<CategoryItem>, val tags: List<TagItem>)

private val KINDS = listOf("need" to "Needs", "want" to "Wants", "unsorted" to "Not sorted")

/**
 * Everything beyond type and search: dates, account, category, tags, payment method, need or want and an
 * amount range. Changes are a draft until "Show results", so closing the sheet changes nothing.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun FiltersSheet(api: Api, initial: TxFilters, onApply: (TxFilters) -> Unit, onDismiss: () -> Unit) {
    var draft by remember { mutableStateOf(initial) }
    var options by remember { mutableStateOf<Options?>(null) }
    var pickingDates by remember { mutableStateOf(false) }
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(Unit) {
        val a = api.get<List<Account>>("accounts")
        val c = api.get<List<CategoryItem>>("categories")
        val t = api.get<List<TagItem>>("tags")
        options = Options(
            (a as? ApiResult.Ok)?.data.orEmpty(),
            (c as? ApiResult.Ok)?.data.orEmpty(),
            (t as? ApiResult.Ok)?.data.orEmpty(),
        )
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheet, containerColor = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Box(Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = androidx.compose.ui.Alignment.Center) {
                    Icon(Icons.Outlined.Tune, null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(20.dp))
                }
                Text("Filters", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f).padding(start = 12.dp))
                TextButton(onClick = { draft = draft.clearDetails() }, enabled = draft.detailCount() > 0) { Text("Reset") }
            }
            Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Section("Date", Icons.Outlined.CalendarMonth, Accents.getValue("blue")) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        DatePreset.entries.forEachIndexed { i, p ->
                            val range = presetRange(p)
                            TintChip(paletteTint(i * 3), 
                                selected = draft.dateFrom == range.first && draft.dateTo == range.second,
                                onClick = { draft = if (draft.dateFrom == range.first && draft.dateTo == range.second) draft.copy(dateFrom = null, dateTo = null) else draft.copy(dateFrom = range.first, dateTo = range.second) },
                                label = { Text(p.label) },
                            )
                        }
                        val custom = draft.dateFrom != null && DatePreset.entries.none { presetRange(it) == (draft.dateFrom to draft.dateTo) }
                        TintChip(paletteTint(4), selected = custom, onClick = { pickingDates = true }, label = { Text(if (custom) rangeLabel(draft.dateFrom, draft.dateTo) else "Custom…") })
                    }
                }

                val o = options
                if (o == null) {
                    Text("Loading your accounts, categories and tags…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    Section("Account", Icons.Outlined.AccountBalance, Accents.getValue("violet")) {
                        Picker(
                            title = "Account", value = draft.account, placeholder = "Any account",
                            entries = o.accounts.map { Ref(it.id, it.name) },
                            onPick = { draft = draft.copy(account = it) },
                        )
                    }
                    Section("Category", Icons.Outlined.Category, Accents.getValue("amber")) {
                        Picker(
                            title = "Category", value = draft.category, placeholder = "Any category",
                            entries = categoryEntries(o.categories),
                            onPick = { draft = draft.copy(category = it) },
                        )
                    }
                    if (o.tags.isNotEmpty()) Section("Tags", Icons.Outlined.Sell, Accents.getValue("pink")) {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            o.tags.forEach { tag ->
                                val on = draft.tags.any { it.id == tag.id }
                                TintChip(idTint(tag.id), 
                                    selected = on,
                                    onClick = { draft = draft.copy(tags = if (on) draft.tags.filterNot { it.id == tag.id } else draft.tags + Ref(tag.id, tag.name)) },
                                    label = { Text(tag.name) },
                                )
                            }
                        }
                        if (draft.tags.size > 1) Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                            Text("Must have all of them", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                            Switch(checked = draft.tagMatch == "all", onCheckedChange = { draft = draft.copy(tagMatch = if (it) "all" else "any") })
                        }
                    }
                }

                Section("Paid by", Icons.Outlined.Payments, Accents.getValue("slate")) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PaymentMethodLabels.forEach { (value, label) ->
                            TintChip(methodTint(value), selected = draft.method == value, onClick = { draft = draft.copy(method = if (draft.method == value) null else value) }, label = { Text(label) })
                        }
                    }
                }
                Section("Need or want", Icons.Outlined.Balance, Accents.getValue("lime")) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        KINDS.forEach { (value, label) ->
                            TintChip(kindTint(value), selected = draft.kind == value, onClick = { draft = draft.copy(kind = if (draft.kind == value) null else value) }, label = { Text(label) })
                        }
                    }
                }
                Section("Amount", Icons.Outlined.Numbers, Accents.getValue("orange")) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        AmountField("Min", draft.min, Modifier.weight(1f)) { draft = draft.copy(min = it) }
                        AmountField("Max", draft.max, Modifier.weight(1f)) { draft = draft.copy(max = it) }
                    }
                    Text("In each transaction's own currency.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Button(
                onClick = { onApply(draft) },
                shapes = ButtonDefaults.shapes(),
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 24.dp),
            ) { Text("Show results") }
        }
    }

    if (pickingDates) {
        val state = rememberDateRangePickerState()
        DatePickerDialog(
            onDismissRequest = { pickingDates = false },
            confirmButton = {
                TextButton(
                    enabled = state.selectedStartDateMillis != null,
                    onClick = {
                        fun iso(ms: Long?) = ms?.let { Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString() }
                        val from = iso(state.selectedStartDateMillis)
                        draft = draft.copy(dateFrom = from, dateTo = iso(state.selectedEndDateMillis) ?: from)
                        pickingDates = false
                    },
                ) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickingDates = false }) { Text("Cancel") } },
        ) { DateRangePicker(state, modifier = Modifier.weight(1f, fill = false)) }
    }
}

/** A section of the sheet: an accent-coloured icon tile and title, so each group reads as its own thing. */
@Composable
private fun Section(title: String, icon: ImageVector, tint: Color, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(
                Modifier.size(28.dp).clip(RoundedCornerShape(10.dp)).background(tint.copy(alpha = 0.2f)),
                contentAlignment = androidx.compose.ui.Alignment.Center,
            ) { Icon(icon, null, tint = tint, modifier = Modifier.size(18.dp)) }
            Text(title, style = MaterialTheme.typography.titleSmall)
        }
        content()
    }
}

/** Sub-categories listed under their parent and shown as "Parent › Child", as on the web. */
private fun categoryEntries(all: List<CategoryItem>): List<Ref> {
    val byId = all.associateBy { it.id }
    val parents = all.filter { it.parentId == null }.sortedBy { it.name.lowercase() }
    return parents.flatMap { p ->
        listOf(Ref(p.id, p.name)) + all.filter { it.parentId == p.id }.sortedBy { it.name.lowercase() }.map { Ref(it.id, "${byId[it.parentId]?.name ?: ""} › ${it.name}") }
    }
}

/** A compact tonal field (44dp) that opens a list sheet to pick from: better than a popup menu for long lists. */
@Composable
private fun Picker(title: String, value: Ref?, placeholder: String, entries: List<Ref>, onPick: (Ref?) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Surface(
        onClick = { open = true },
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(Modifier.height(44.dp).padding(start = 14.dp, end = 8.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text(
                value?.name ?: placeholder,
                Modifier.weight(1f),
                style = MaterialTheme.typography.bodyMedium,
                color = if (value == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
            )
            Icon(Icons.Outlined.ArrowDropDown, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
    if (open) PickerSheet(title, placeholder, entries, value?.id, onPick = { onPick(it); open = false }, onDismiss = { open = false })
}

/** The choices as springy tiles, the chosen one tinted; "Any" at the top clears the filter. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PickerSheet(title: String, anyLabel: String, entries: List<Ref>, selectedId: String?, onPick: (Ref?) -> Unit, onDismiss: () -> Unit) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Text(title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp))
        val all = listOf<Ref?>(null) + entries
        androidx.compose.foundation.lazy.LazyColumn(contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 8.dp)) {
            items(all.size) { i ->
                val entry = all[i]
                val chosen = entry?.id == selectedId
                MorphTile(
                    onClick = { onPick(entry) },
                    first = i == 0,
                    last = i == all.lastIndex,
                    modifier = Modifier.padding(bottom = 2.dp),
                    color = if (chosen) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerHigh,
                ) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Text(entry?.name ?: anyLabel, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge, color = if (entry == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
                        if (chosen) Icon(Icons.Outlined.Check, null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                }
            }
        }
        androidx.compose.foundation.layout.Spacer(Modifier.height(24.dp))
    }
}

/** A compact tonal number field (44dp) with the same look as the dropdown. */
@Composable
private fun AmountField(label: String, value: String, modifier: Modifier, onChange: (String) -> Unit) {
    var focused by remember { mutableStateOf(false) }
    Surface(
        modifier,
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        // the focus ring the compact field would otherwise lack
        border = if (focused) BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null,
    ) {
        BasicTextField(
            modifier = Modifier.onFocusChanged { focused = it.isFocused },
            value = value,
            onValueChange = { onChange(it.filter { c -> c.isDigit() || c == '.' }.take(15)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface),
            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
            decorationBox = { inner ->
                Box(Modifier.height(44.dp).padding(horizontal = 14.dp), contentAlignment = androidx.compose.ui.Alignment.CenterStart) {
                    if (value.isEmpty()) Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    inner()
                }
            },
        )
    }
}
