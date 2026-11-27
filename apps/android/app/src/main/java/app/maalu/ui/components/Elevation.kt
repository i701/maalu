package app.maalu.ui.components

import androidx.compose.foundation.border
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.dropShadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.shadow.Shadow
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp

private val Offsets = listOf(1, 3, 6, 12, 24, 48)

/**
 * The iOS app's layered shadow (its `Elevation`): a 1dp ring, then one soft shadow per level, each twice as far down and as blurred as the
 * one before and pulled in by half its offset, so it gathers under the card. Dark mode paints the ring in light inside the edge, since a
 * black one cannot show on a near-black page. Put it before the card's own fill.
 */
@Composable
fun Modifier.elevation(level: Int, shape: Shape): Modifier {
    val dark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val drop = Color.Black.copy(alpha = if (dark) 0.18f else 0.04f)
    var m = if (dark) this else dropShadow(shape, Shadow(radius = 0.dp, spread = 1.dp, color = Color.Black.copy(alpha = 0.035f)))
    Offsets.take(level).forEach { y ->
        m = m.dropShadow(shape, Shadow(radius = y.dp, spread = (-y / 2f).dp, color = drop, offset = DpOffset(0.dp, y.dp)))
    }
    return if (dark) m.border(1.dp, Color.White.copy(alpha = 0.06f), shape) else m
}
