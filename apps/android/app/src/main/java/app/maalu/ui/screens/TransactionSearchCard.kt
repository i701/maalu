@file:OptIn(ExperimentalMaterial3Api::class)

package app.maalu.ui.screens

import app.maalu.ui.theme.incomeInk
import app.maalu.ui.components.elevation
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Clear
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.InputChip
import androidx.compose.material3.InputChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import app.maalu.data.PaymentMethodLabels
import app.maalu.data.Totals
import app.maalu.data.TxFilters
import app.maalu.data.isAmount
import app.maalu.data.kept
import app.maalu.data.rangeLabel
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.SummaryBlue
import app.maalu.ui.components.searchCardColor
import app.maalu.ui.theme.ChartColors

/** Income green, expense red, transfer blue; the colour of a type's token and of its chip in the filters. */
@Composable
fun typeTint(type: String?): Color = when (type) {
    "income" -> ChartColors.IncomeLight
    "expense" -> MaterialTheme.colorScheme.error
    "transfer" -> ChartColors.Line
    else -> MaterialTheme.colorScheme.outline
}

/**
 * The top of the transactions list, as on iOS: one raised card with the search field and the Filters button. A type or
 * "Planned" that is on shows as a token in the field, the other filters as chips to drop one at a time, and once the list is
 * narrowed, what the matching rows add up to.
 */
@Composable
fun TransactionSearchCard(
    query: String, onQuery: (String) -> Unit, filters: TxFilters, onFilters: (TxFilters) -> Unit,
    totals: Totals?, onOpenFilters: () -> Unit,
) {
    val focus = LocalFocusManager.current
    val quiet = MaterialTheme.colorScheme.onSurfaceVariant
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = searchCardColor(),
        modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 12.dp).elevation(3, RoundedCornerShape(20.dp)),
    ) {
        Column(Modifier.animateContentSize(MaterialTheme.motionScheme.defaultSpatialSpec())) {
            Row(Modifier.heightIn(min = 56.dp).padding(start = 16.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Outlined.Search, null, Modifier.size(20.dp), tint = quiet)
                filters.type?.let { type -> Token(type.replaceFirstChar { it.uppercase() }) { onFilters(filters.copy(type = null)) } }
                if (filters.planned) Token("Planned") { onFilters(filters.copy(planned = false)) }
                BasicTextField(
                    value = query, onValueChange = onQuery, singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false, imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { focus.clearFocus() }),
                    modifier = Modifier.weight(1f),
                    decorationBox = { field ->
                        Box(contentAlignment = Alignment.CenterStart) {
                            if (query.isEmpty()) Text("Search", style = MaterialTheme.typography.bodyLarge, color = quiet, maxLines = 1)
                            field()
                        }
                    },
                )
                if (query.isNotEmpty()) IconButton(onClick = { onQuery("") }, Modifier.size(32.dp)) { Icon(Icons.Outlined.Clear, "Clear search", Modifier.size(18.dp)) }
                val count = filters.detailCount()
                IconButton(onClick = { focus.clearFocus(); onOpenFilters() }) {
                    Icon(Icons.Outlined.Tune, if (count > 0) "Filters, $count on" else "Filters", tint = if (count > 0) SummaryBlue else quiet)
                }
            }
            ActiveFilters(filters, onChange = onFilters)
            if (totals != null) {
                HorizontalDivider(Modifier.padding(horizontal = 16.dp))
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min).padding(horizontal = 16.dp, vertical = 14.dp)) {
                    val net = kept(totals.income, totals.expense)
                    val good = incomeInk()
                    TotalColumn("TOTAL SPENT", totals.expense, totals.currency, MaterialTheme.colorScheme.onSurface, Modifier.weight(1f))
                    VerticalDivider()
                    TotalColumn("TOTAL INCOME", totals.income, totals.currency, good, Modifier.weight(1f))
                    VerticalDivider()
                    TotalColumn("NET", net, totals.currency, if (net.startsWith("-")) MaterialTheme.colorScheme.error else good, Modifier.weight(1f))
                }
            }
        }
    }
}

/** A quick filter that is on, in the search field with a cross to turn it off. */
@Composable
private fun Token(label: String, onRemove: () -> Unit) {
    InputChip(
        selected = true, onClick = onRemove, label = { Text(label) },
        trailingIcon = { Icon(Icons.Outlined.Clear, "Remove $label filter", Modifier.size(14.dp)) },
        colors = InputChipDefaults.inputChipColors(selectedContainerColor = MaterialTheme.colorScheme.primaryContainer, selectedLabelColor = MaterialTheme.colorScheme.onSurface),
        shape = MaterialTheme.shapes.small, border = null,
    )
}

@Composable
private fun TotalColumn(label: String, amount: String, currency: String, color: Color, modifier: Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        MoneyText(amount, currency, style = MaterialTheme.typography.titleSmallEmphasized, color = color)
    }
}

/** What the sheet applied, as chips you can drop one at a time. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ActiveFilters(f: TxFilters, onChange: (TxFilters) -> Unit) {
    if (f.detailCount() == 0) return
    Row(
        Modifier.horizontalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, bottom = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        @Composable
        fun chip(label: String, clear: () -> Unit) = InputChip(
            selected = true, onClick = clear, label = { Text(label) },
            trailingIcon = { Icon(Icons.Outlined.Clear, "Remove $label", Modifier.size(16.dp)) },
            colors = InputChipDefaults.inputChipColors(selectedContainerColor = MaterialTheme.colorScheme.primaryContainer, selectedLabelColor = MaterialTheme.colorScheme.onSurface),
            shape = MaterialTheme.shapes.small,
            border = null,
        )
        if (f.dateFrom != null || f.dateTo != null) chip(rangeLabel(f.dateFrom, f.dateTo)) { onChange(f.copy(dateFrom = null, dateTo = null)) }
        f.account?.let { chip(it.name) { onChange(f.copy(account = null)) } }
        f.card?.let { chip(it.name) { onChange(f.copy(card = null)) } }
        f.category?.let { chip(it.name) { onChange(f.copy(category = null)) } }
        f.tags.forEach { tag -> chip("#${tag.name}") { onChange(f.copy(tags = f.tags - tag)) } }
        f.method?.let { chip(PaymentMethodLabels[it] ?: it) { onChange(f.copy(method = null)) } }
        f.kind?.let { chip(when (it) { "need" -> "Needs"; "want" -> "Wants"; else -> "Not sorted" }) { onChange(f.copy(kind = null)) } }
        if (isAmount(f.min) || isAmount(f.max)) chip(
            listOfNotNull(f.min.takeIf { isAmount(it) }?.let { "≥ $it" }, f.max.takeIf { isAmount(it) }?.let { "≤ $it" }).joinToString(" "),
        ) { onChange(f.copy(min = "", max = "")) }
    }
}
