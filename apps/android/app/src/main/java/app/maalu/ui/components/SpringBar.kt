package app.maalu.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * A progress bar (rounded fill, gap, track, stop dot) whose fill springs to its value: from empty the first time it shows (not again when it scrolls back into view), and from the old value when it
 * changes. Width is spatial, so the fill can overshoot a little before it settles (it is held to the track's end).
 * [fraction] is 0..1; [minVisible] keeps a small sliver showing for a value that is not zero.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun SpringBar(fraction: Float, color: Color, height: Dp, modifier: Modifier = Modifier, minVisible: Float = 0.02f) {
    // saveable, not just remembered: a lazy list keeps this per row while it is scrolled away, so a bar that has
    // already filled comes back at its value instead of springing up from empty again
    var target by rememberSaveable { mutableFloatStateOf(0f) }
    LaunchedEffect(fraction) { target = fraction }
    val shown by animateFloatAsState(target, MaterialTheme.motionScheme.defaultSpatialSpec(), label = "fill")
    val track = MaterialTheme.colorScheme.surfaceContainerHighest
    // Material's progress bar: a rounded fill, a 4dp gap, the track, and a stop dot at the track's end
    Canvas(modifier.fillMaxWidth().height(height)) {
        val h = size.height
        val w = size.width
        val gap = 4.dp.toPx()
        val round = CornerRadius(h / 2)
        val fillEnd = (w * shown.coerceIn(minVisible, 1f)).coerceAtLeast(h)
        drawRoundRect(color, size = Size(fillEnd.coerceAtMost(w), h), cornerRadius = round)
        val trackStart = fillEnd + gap
        if (trackStart < w) {
            drawRoundRect(track, topLeft = Offset(trackStart, 0f), size = Size(w - trackStart, h), cornerRadius = round)
            // the dot sits in the track's last cap, so it only shows while the track is longer than the dot's own spot
            if (w - trackStart > h * 1.5f) drawCircle(color, radius = (h * 0.3f).coerceAtMost(2.dp.toPx()), center = Offset(w - h / 2, h / 2))
        }
    }
}
