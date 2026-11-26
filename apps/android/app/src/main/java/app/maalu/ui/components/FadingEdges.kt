@file:OptIn(ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.gestures.ScrollableState
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp

/**
 * A soft edge on a scroll container: what is scrolled out of sight fades into whatever is behind, instead of being cut off.
 * An edge fades only while there is more beyond it. Not for a list with sticky
 * headers, which would be faded with the top edge.
 */
@Composable
fun Modifier.fadingEdges(state: ScrollableState): Modifier {
    val spec = MaterialTheme.motionScheme.defaultEffectsSpec<Float>()
    val above by animateFloatAsState(if (state.canScrollBackward) 1f else 0f, spec, label = "fade above")
    val below by animateFloatAsState(if (state.canScrollForward) 1f else 0f, spec, label = "fade below")
    // offscreen, so the blend cuts into this content only and not the backdrop
    return graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }.drawWithContent {
        drawContent()
        val edge = 32.dp.toPx()
        val band = Size(size.width, edge)
        if (above > 0f) drawRect(
            Brush.verticalGradient(listOf(Color.Black.copy(alpha = (1f - above).coerceIn(0f, 1f)), Color.Black), startY = 0f, endY = edge),
            size = band, blendMode = BlendMode.DstIn,
        )
        if (below > 0f) drawRect(
            Brush.verticalGradient(listOf(Color.Black, Color.Black.copy(alpha = (1f - below).coerceIn(0f, 1f))), startY = size.height - edge, endY = size.height),
            topLeft = Offset(0f, size.height - edge), size = band, blendMode = BlendMode.DstIn,
        )
    }
}
