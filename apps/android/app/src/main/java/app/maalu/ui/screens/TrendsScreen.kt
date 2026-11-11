@file:OptIn(ExperimentalMaterial3Api::class)

package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.CategoryMonthRow
import app.maalu.data.CategoryMonths
import app.maalu.data.TrendRanges
import app.maalu.data.cellText
import app.maalu.data.columnTotals
import app.maalu.data.heat
import app.maalu.data.maxCell
import app.maalu.data.monthColumn
import app.maalu.data.monthlyAverage
import app.maalu.data.trendBounds
import app.maalu.ui.components.SegmentedPills
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.MoneyStyle
import java.time.LocalDate

private val CellWidth = 76.dp
private val NameWidth = 112.dp
private val RowHeight = 38.dp

/**
 * Trends: every category by month, as a table. Each cell is shaded by its share of the biggest figure in the table and always shows its
 * number, so shade is never the only signal. A refund-heavy month can go below zero (shown with a minus, unshaded). The table scrolls sideways
 * with the category names kept in place.
 */
@Composable
fun TrendsScreen(api: Api) {
    var kind by rememberSaveable { mutableStateOf("expense") }
    var months by rememberSaveable { mutableIntStateOf(12) }
    var data by remember { mutableStateOf<CategoryMonths?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }

    LaunchedEffect(months, reload) {
        val (from, to) = trendBounds(months, LocalDate.now())
        when (val r = api.get<CategoryMonths>("transactions/categories/monthly", mapOf("date_from" to "$from", "date_to" to "$to"))) {
            is ApiResult.Ok -> { data = r.data; error = null }
            is ApiResult.Failed -> error = r.message
        }
        refreshing = false
    }

    Column(Modifier.fillMaxSize()) {
        Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SegmentedPills(listOf("expense" to "Spending", "income" to "Income"), kind, { kind = it }, tint = { Accents.getValue(if (it == "expense") "orange" else "green") })
            ChipRow(TrendRanges, months, { "$it months" }, Accents.getValue("lime")) { data = null; months = it }
        }
        ReportState(data, error, onRetry = { error = null; reload++ }) { d ->
            val rows = d.categories.filter { it.type == kind }.sortedByDescending { it.total.toBigDecimalOrNull() ?: java.math.BigDecimal.ZERO }
            val base = if (kind == "expense") BadColor else GoodColor
            PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
                if (rows.isEmpty()) Box(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(32.dp), contentAlignment = Alignment.Center) {
                    Text("No ${if (kind == "expense") "spending" else "income"} in these ${d.months.size} months.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp)) {
                    Text(d.currency + ". Shaded by share of the biggest month.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 6.dp))
                    TrendTable(d, rows, base)
                }
            }
        }
    }
}

@Composable
private fun TrendTable(d: CategoryMonths, rows: List<CategoryMonthRow>, base: Color) {
    val max = maxCell(rows)
    val totals = columnTotals(rows, d.months.size)
    val grand = totals.fold(java.math.BigDecimal.ZERO) { a, v -> a + (v.toBigDecimalOrNull() ?: java.math.BigDecimal.ZERO) }.toPlainString()
    val label = MaterialTheme.typography.labelSmall.merge(MoneyStyle)
    Row(Modifier.fillMaxWidth()) {
        // the names stay in place
        Column(Modifier.width(NameWidth)) {
            Box(Modifier.height(RowHeight), contentAlignment = Alignment.CenterStart) { Text("Category", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            rows.forEach { r ->
                Row(Modifier.height(RowHeight), verticalAlignment = Alignment.CenterVertically) {
                    Swatch(Accents[r.color] ?: MaterialTheme.colorScheme.outline)
                    Text(r.category, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            HorizontalDivider()
            Box(Modifier.height(RowHeight), contentAlignment = Alignment.CenterStart) { Text("All categories", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, maxLines = 1) }
        }
        Column(Modifier.weight(1f).horizontalScroll(rememberScrollState())) {
            Row {
                d.months.forEach { Cell(monthColumn(it), label, null, header = true) }
                Cell("Total", label, null, header = true); Cell("Per month", label, null, header = true)
            }
            rows.forEach { r ->
                Row {
                    r.amounts.forEach { a -> Cell(cellText(a), label, base.copy(alpha = 0.6f * heat(a, max))) }
                    Cell(cellText(r.total), label.copy(fontWeight = FontWeight.SemiBold), null)
                    Cell(cellText(monthlyAverage(r)), label, null)
                }
            }
            HorizontalDivider(Modifier.width(CellWidth * (d.months.size + 2)))
            Row {
                totals.forEach { Cell(cellText(it), label.copy(fontWeight = FontWeight.SemiBold), null) }
                Cell(cellText(grand), label.copy(fontWeight = FontWeight.SemiBold), null)
                Cell(cellText(java.math.BigDecimal(grand).divide(java.math.BigDecimal(maxOf(d.months.size, 1)), 2, java.math.RoundingMode.HALF_EVEN).toPlainString()), label, null)
            }
        }
    }
}

@Composable
private fun Cell(text: String, style: androidx.compose.ui.text.TextStyle, shade: Color?, header: Boolean = false) {
    Box(
        Modifier.width(CellWidth).height(RowHeight).padding(1.dp).background(shade ?: Color.Transparent, androidx.compose.foundation.shape.RoundedCornerShape(6.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, style = style, textAlign = TextAlign.Center, color = if (header) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface, maxLines = 1)
    }
}
