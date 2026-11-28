@file:OptIn(ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import androidx.compose.ui.semantics.CustomAccessibilityAction
import androidx.compose.ui.semantics.customActions
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import app.maalu.data.CategoryMonths
import app.maalu.data.formatMoney
import app.maalu.data.monthShort
import app.maalu.data.spendingStack
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.ChoiceChip

/** The iOS card's colours by rank (Bencho's meter palette, MIT): a clear change of hue at every step, biggest share first. */
private val Ranked = listOf(Color(0xFF3D7BFF), Color(0xFFD77BF2), Color(0xFFFF7A1A), Color(0xFFFFBE1A))

/**
 * Spending month by month, stacked by category: the figure, 6 or 12 months of bars and a chip for each category. Tap or drag
 * along the bars to pick a month; press a chip to follow one category through them.
 */
@Composable
fun SpendingTrendCard(data: CategoryMonths) {
    var count by remember { mutableIntStateOf(6) }
    val stack = remember(data, count) { spendingStack(data, count) } ?: return
    var picked by remember(data, count) { mutableStateOf<Int?>(null) }
    var held by remember(data, count) { mutableStateOf<String?>(null) }
    val other = MaterialTheme.colorScheme.outlineVariant
    fun colorAt(rank: Int) = if (stack.hasOther && rank == stack.names.lastIndex) other else Ranked[rank % Ranked.size]
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { shown = true }
    val grown by animateFloatAsState(if (shown) 1f else 0f, MaterialTheme.motionScheme.slowSpatialSpec(), label = "bars")
    val month = picked?.let { stack.months.getOrNull(it) }
    val span = "Last ${stack.months.size} months"

    SectionCard("Spending by month") {
        MoneyText(stack.amount(month, held).toPlainString(), data.currency, style = MaterialTheme.typography.headlineSmall)
        val monthName = month?.let { "${monthShort(it.month)} ${it.month.take(4)}" }
        Text(listOfNotNull(held, monthName ?: span).joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (data.months.size > 6) Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf(6, 12).forEach { n -> ChoiceChip(count == n, { count = n }, { Text("$n months") }) }
        }
        val baseline = MaterialTheme.colorScheme.outlineVariant
        val spoken = stack.months.joinToString(", ") { "${monthShort(it.month)} ${formatMoney(it.total.toPlainString(), data.currency)}" }
        Canvas(
            Modifier.fillMaxWidth().height(140.dp)
                .semantics {
                    contentDescription = "Spending by month: $spoken"
                    stateDescription = month?.let { "${monthName} picked" } ?: "All months"
                    // the screen reader's way to do what a tap or drag does
                    val last = stack.months.lastIndex
                    customActions = listOf(
                        CustomAccessibilityAction("Previous month") { picked = ((picked ?: stack.months.size) - 1).coerceAtLeast(0); true },
                        CustomAccessibilityAction("Next month") { picked = ((picked ?: -1) + 1).coerceAtMost(last); true },
                        CustomAccessibilityAction("All months") { picked = null; true },
                    )
                }
                // a tap picks a month, or lets go of the one picked; a sideways drag moves along them
                .pointerInput(stack) {
                    detectTapGestures { at -> val i = monthAt(at.x, size.width, stack.months.size); picked = if (picked == i) null else i }
                }
                .pointerInput(stack) {
                    detectHorizontalDragGestures { change, _ -> change.consume(); picked = monthAt(change.position.x, size.width, stack.months.size) }
                },
        ) {
            val tallest = stack.months.maxOf { it.total.toFloat() }
            if (tallest <= 0f) return@Canvas
            val slot = size.width / stack.months.size
            val width = slot * 0.62f
            val gap = 2.dp.toPx()
            stack.months.forEachIndexed { i, m ->
                var bottom = size.height
                m.pieces.forEach { piece ->
                    val height = piece.value.toFloat() / tallest * size.height * grown
                    val lit = (picked == null || picked == i) && (held == null || held == piece.name)
                    // a little short of the next piece, so there is air between them
                    val drawn = height - minOf(gap, height / 3)
                    drawRoundRect(colorAt(piece.rank), Offset(i * slot + (slot - width) / 2, bottom - drawn), Size(width, drawn), CornerRadius(3.dp.toPx()), alpha = if (lit) 1f else 0.25f)
                    bottom -= height
                }
            }
            drawLine(baseline, Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx())
        }
        Row(Modifier.fillMaxWidth()) {
            val small = MaterialTheme.typography.labelSmall
            val quiet = MaterialTheme.colorScheme.onSurfaceVariant
            Text(monthShort(stack.months.first().month), Modifier.weight(1f), style = small, color = quiet)
            Text(monthShort(stack.months.last().month), style = small, color = quiet)
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            stack.names.forEachIndexed { rank, name ->
                ChoiceChip(held == name, { held = if (held == name) null else name }, {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(Modifier.size(8.dp).clip(CircleShape).background(colorAt(rank)))
                        Text("$name · ${formatMoney(stack.total(name).toPlainString(), data.currency)}")
                    }
                })
            }
        }
    }
}

/** The month under a finger at [x]. */
private fun monthAt(x: Float, width: Int, count: Int): Int = (x / width * count).toInt().coerceIn(0, count - 1)
