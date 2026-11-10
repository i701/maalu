package app.maalu.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

/**
 * A 2dp line with a soft wash under it. Drawing only: the figures that go with it are text next to it.
 * The scale runs from the lowest to the highest value so a flat month still sits mid-height.
 */
@Composable
fun LineChart(values: List<Double>, color: Color, modifier: Modifier = Modifier) {
    Canvas(modifier.fillMaxWidth().height(96.dp)) {
        if (values.size < 2) return@Canvas
        val lo = values.min(); val hi = values.max()
        val span = (hi - lo).takeIf { it > 0 } ?: 1.0
        val pad = 6.dp.toPx()
        fun x(i: Int) = size.width * i / (values.size - 1)
        fun y(v: Double): Float = if (hi == lo) size.height / 2 else pad + (size.height - 2 * pad) * (1 - ((v - lo) / span).toFloat())
        val line = Path().apply { values.forEachIndexed { i, v -> if (i == 0) moveTo(x(i), y(v)) else lineTo(x(i), y(v)) } }
        val wash = Path().apply { addPath(line); lineTo(size.width, size.height); lineTo(0f, size.height); close() }
        drawPath(wash, Brush.verticalGradient(listOf(color.copy(alpha = 0.22f), Color.Transparent)))
        drawPath(line, color, style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
    }
}

data class Pair2(val a: Double, val b: Double)

/** Two thin columns per month (at most 12dp wide, rounded tips), drawn from one baseline on one scale. */
@Composable
fun PairedColumns(values: List<Pair2>, colorA: Color, colorB: Color, modifier: Modifier = Modifier) {
    Canvas(modifier.fillMaxWidth().height(120.dp)) {
        if (values.isEmpty()) return@Canvas
        val top = values.maxOf { maxOf(it.a, it.b) }.takeIf { it > 0 } ?: 1.0
        val slot = size.width / values.size
        val bar = minOf(12.dp.toPx(), slot / 2.6f)
        val gap = 2.dp.toPx()
        val tip = CornerRadius(4.dp.toPx())
        values.forEachIndexed { i, v ->
            val centre = slot * i + slot / 2
            fun draw(value: Double, left: Float, color: Color) {
                val h = (size.height * (value / top)).toFloat().coerceAtLeast(if (value > 0) 3.dp.toPx() else 0f)
                if (h > 0) drawRoundRect(color, Offset(left, size.height - h), Size(bar, h), tip)
            }
            draw(v.a, centre - bar - gap / 2, colorA)
            draw(v.b, centre + gap / 2, colorB)
        }
    }
}

/**
 * A tiny line under an account's balance: green when it rose over the period, orange when it fell, grey
 * when it did not move. A flat line sits on the bottom edge so every row shares a baseline.
 */
@Composable
fun Sparkline(values: List<Double>, rose: Color, fell: Color, flat: Color, modifier: Modifier = Modifier) {
    Canvas(modifier.androidx_size()) {
        if (values.size < 2) return@Canvas
        val lo = values.min(); val hi = values.max()
        val span = hi - lo
        val color = when { values.last() > values.first() -> rose; values.last() < values.first() -> fell; else -> flat }
        val pad = 2.dp.toPx()
        fun x(i: Int) = size.width * i / (values.size - 1)
        fun y(v: Double): Float = if (span <= 0.0) size.height - pad else pad + (size.height - 2 * pad) * (1 - ((v - lo) / span).toFloat())
        val line = Path().apply { values.forEachIndexed { i, v -> if (i == 0) moveTo(x(i), y(v)) else lineTo(x(i), y(v)) } }
        drawPath(line, color, style = Stroke(width = 1.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
        drawCircle(color, radius = 2.5.dp.toPx(), center = Offset(x(values.lastIndex), y(values.last())))
    }
}

private fun Modifier.androidx_size(): Modifier = this.then(Modifier.width(64.dp).height(22.dp))
