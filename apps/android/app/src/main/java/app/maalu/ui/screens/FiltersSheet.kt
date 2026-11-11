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
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.Section
import app.maalu.data.cleanAmount
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
import app.maalu.data.Card
import app.maalu.data.text
import androidx.compose.material.icons.outlined.CreditCard
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

private class Options(val accounts: List<Account>, val categories: List<CategoryItem>, val tags: List<TagItem>, val cards: List<Card> = emptyList())

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
            (api.get<List<Card>>("cards") as? ApiResult.Ok)?.data.orEmpty(),
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
                        PickerField(
                            title = "Account", value = draft.account, placeholder = "Any account",
                            entries = o.accounts.map { Ref(it.id, it.name) },
                            detail = { r -> o.accounts.firstOrNull { it.id == r.id }?.let(::accountDetail) },
                            onPick = { draft = draft.copy(account = it) },
                        )
                    }
                    if (o.cards.isNotEmpty()) Section("Card", Icons.Outlined.CreditCard, Accents.getValue("pink")) {
                        PickerField(
                            title = "Card", value = draft.card, placeholder = "Any card",
                            entries = o.cards.map { Ref(it.id, it.text()) },
                            detail = { r -> o.cards.firstOrNull { it.id == r.id }?.account?.name },
                            onPick = { draft = draft.copy(card = it) },
                        )
                    }
                    Section("Category", Icons.Outlined.Category, Accents.getValue("amber")) {
                        PickerField(
                            title = "Category", value = draft.category, placeholder = "Any category",
                            searchable = true,
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
                        CompactField(draft.min, { draft = draft.copy(min = cleanAmount(it)) }, "Min", Modifier.weight(1f), KeyboardOptions(keyboardType = KeyboardType.Decimal))
                        CompactField(draft.max, { draft = draft.copy(max = cleanAmount(it)) }, "Max", Modifier.weight(1f), KeyboardOptions(keyboardType = KeyboardType.Decimal))
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

/** Sub-categories listed under their parent and shown as "Parent › Child", as on the web. */
private fun categoryEntries(all: List<CategoryItem>): List<Ref> {
    val byId = all.associateBy { it.id }
    val parents = all.filter { it.parentId == null }.sortedBy { it.name.lowercase() }
    return parents.flatMap { p ->
        listOf(Ref(p.id, p.name)) + all.filter { it.parentId == p.id }.sortedBy { it.name.lowercase() }.map { Ref(it.id, "${byId[it.parentId]?.name ?: ""} › ${it.name}") }
    }
}
