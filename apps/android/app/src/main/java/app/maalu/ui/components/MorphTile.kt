package app.maalu.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.ripple
import androidx.compose.ui.draw.clip
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** The corner sizes of a segmented list: big on the outside of the group, small between neighbours. */
object TileCorners {
    val Outer = 20.dp
    val Inner = 4.dp
    /** What a big corner relaxes to while pressed (the web's "one step squarer"). */
    val OuterPressed = 12.dp
    val InnerPressed = 2.dp
}

/**
 * A tappable tile in a segmented list (the Material 3 Expressive look): large outer corners, small inner
 * ones, and corners that spring toward squarer while pressed, on the theme's expressive motion. It stands in
 * for the library's SegmentedListItem, which is still internal in this Material 3 version.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun MorphTile(
    onClick: () -> Unit,
    first: Boolean,
    last: Boolean,
    modifier: Modifier = Modifier,
    color: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.surfaceContainerLow,
    /** A long press (starting a selection); when set the tile is drawn with a combined click instead of the Surface's own. */
    onLongClick: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val spring = MaterialTheme.motionScheme.fastSpatialSpec<Dp>()
    fun corner(big: Boolean): Dp = if (big) (if (pressed) TileCorners.OuterPressed else TileCorners.Outer)
    else (if (pressed) TileCorners.InnerPressed else TileCorners.Inner)
    val top by animateDpAsState(corner(first), spring, label = "top")
    val bottom by animateDpAsState(corner(last), spring, label = "bottom")
    val shape = RoundedCornerShape(topStart = top, topEnd = top, bottomStart = bottom, bottomEnd = bottom)
    if (onLongClick == null) Surface(onClick = onClick, modifier = modifier, shape = shape, color = color, interactionSource = source, content = content)
    else Surface(
        modifier = modifier.clip(shape).combinedClickable(interactionSource = source, indication = ripple(), onClick = onClick, onLongClick = onLongClick),
        shape = shape, color = color, content = content,
    )
}
