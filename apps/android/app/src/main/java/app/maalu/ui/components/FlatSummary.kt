package app.maalu.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import kotlin.math.asin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt

// The summaries drawn flat on the page, as on iOS: no card, only text and drawing in the summary's own hue.

/** The iOS app's brand blue. */
val SummaryBlue = Color(0xFF437CEF)
private const val Faint = 0.28f

/** [hue] deepened for light mode and lightened for dark, so text in it reads on the page. */
@Composable
fun summaryInk(hue: Color): Color =
    if (MaterialTheme.colorScheme.surface.luminance() < 0.5f) lerp(hue, Color.White, 0.55f) else lerp(hue, Color.Black, 0.4f)

@Composable
fun FlatSummary(hue: Color, content: @Composable ColumnScope.() -> Unit) {
    CompositionLocalProvider(LocalContentColor provides summaryInk(hue)) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp), content = content)
    }
}

/** A small tinted pill in the summary's ink: a link, or a fact like "until 4 Dec". */
@Composable
fun SummaryPill(text: String, onClick: (() -> Unit)? = null) {
    val ink = LocalContentColor.current
    val label: @Composable () -> Unit = { Text(text, Modifier.padding(horizontal = 12.dp, vertical = 6.dp), style = MaterialTheme.typography.labelLarge) }
    if (onClick == null) Surface(shape = CircleShape, color = ink.copy(alpha = 0.1f), contentColor = ink, content = label)
    else Surface(onClick = onClick, shape = CircleShape, color = ink.copy(alpha = 0.1f), contentColor = ink, content = label)
}

/** One part of a donut: its name, its share of the whole (0 to 1) and the amount, already formatted. */
data class DonutPart(val title: String, val share: Float, val amount: String)

data class MiniBar(val label: String, val value: Float, val highlighted: Boolean)

/** Two parts of a whole as a donut with a legend, the first solid and the second faint, and small bars beside them. */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun SummaryDonut(first: DonutPart, second: DonutPart, bars: List<MiniBar>) {
    val ink = LocalContentColor.current
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { shown = true }
    val grown by animateFloatAsState(if (shown) 1f else 0f, MaterialTheme.motionScheme.slowSpatialSpec(), label = "reveal")
    Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        Canvas(Modifier.size(92.dp)) {
            // as on iOS: two sectors with rounded corners and air between them; one alone is a whole ring
            val reveal = grown.coerceIn(0f, 1f)
            val split = 360f * first.share
            if (first.share > 0f) sector(ink, -90f, split * reveal, whole = first.share >= 1f)
            if (first.share < 1f) sector(ink.copy(alpha = Faint), -90f + split * reveal, (360f - split) * reveal, whole = first.share <= 0f)
        }
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf(first to 1f, second to Faint).forEach { (part, alpha) ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.padding(top = 4.dp).size(8.dp).clip(CircleShape).background(ink.copy(alpha = alpha)))
                    Column {
                        Text("${part.title} ${(part.share * 100).roundToInt()}%", style = MaterialTheme.typography.labelLarge)
                        Text(part.amount, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
        val tallest = bars.maxOfOrNull { it.value } ?: 0f
        // decoration beside figures that are already said; it takes what room is left
        Row(Modifier.weight(1f).height(92.dp), horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.End), verticalAlignment = Alignment.Bottom) {
            bars.forEach { bar ->
                Column(Modifier.weight(1f, fill = false).fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                    val share = if (tallest > 0f) (bar.value / tallest).coerceIn(0f, 1f) else 0f
                    Box(Modifier.weight(1f), contentAlignment = Alignment.BottomCenter) {
                        Box(Modifier.width(8.dp).fillMaxHeight(share * grown.coerceIn(0f, 1f)).clip(RoundedCornerShape(3.dp)).background(ink.copy(alpha = if (bar.highlighted) 1f else Faint)))
                    }
                    Text(bar.label, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

/** A piece of a ring from [start] over [sweep] degrees, its four corners rounded; the hole is 68% of the width, as on iOS. */
private fun DrawScope.sector(color: Color, start: Float, sweep: Float, whole: Boolean) {
    if (sweep <= 0f) return
    val outer = size.width / 2
    val inner = outer * 0.68f
    if (whole && sweep >= 360f) {
        drawCircle(color, (outer + inner) / 2, style = Stroke(outer - inner))
        return
    }
    val corner = 4.dp.toPx()
    // the shape is drawn smaller by the corner's radius, and a round-joined outline of that width gives it back
    val out = outer - corner
    val into = inner + corner
    // half the gap and the corner, as an angle at each edge, so the two sides of the gap stay parallel
    fun inset(radius: Float) = Math.toDegrees(asin(((corner + 0.75.dp.toPx()) / radius).toDouble())).toFloat()
    val a = inset(out)
    val b = inset(into)
    val path = Path().apply {
        arcTo(Rect(center, out), start + a, (sweep - 2 * a).coerceAtLeast(0.1f), true)
        arcTo(Rect(center, into), start + maxOf(sweep - b, b + 0.1f), -(sweep - 2 * b).coerceAtLeast(0.1f), false)
        close()
    }
    // drawn solid in a layer of its own, so a faint colour is not doubled where the fill and the outline overlap
    drawContext.canvas.saveLayer(Rect(Offset.Zero, size), Paint().apply { alpha = color.alpha })
    val solid = color.copy(alpha = 1f)
    drawPath(path, solid)
    drawPath(path, solid, style = Stroke(corner * 2, join = StrokeJoin.Round))
    drawContext.canvas.restore()
}
