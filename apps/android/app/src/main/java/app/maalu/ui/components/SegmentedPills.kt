package app.maalu.ui.components

import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.Color
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonGroupDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.ToggleButton
import androidx.compose.material3.ToggleButtonDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.material3.Icon
import androidx.compose.foundation.layout.size
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/** How long a segment stays widened after a tap lifts (my design decision: M3 gives no value). */
private const val MIN_WIDEN_MS = 140L

/**
 * The web's segmented group as a Material 3 Expressive connected toggle group: a row of ToggleButtons whose
 * chosen segment springs to a full pill filled with its colour and whose pressed segment springs squarer
 * (both are the component's own shape morph). The pressed segment also widens (to 1.5 shares) on the spatial spring while its
 * neighbours give way, as in Material's button-group motion.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun <T> SegmentedPills(
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    /** Draws a segment as an icon, its label then only read out. */
    icon: ((T) -> ImageVector)? = null,
    /** Gives each segment a colour of its own when chosen, the others white: for a switcher on the backdrop. */
    tint: (@Composable (T) -> Color)? = null,
) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(ButtonGroupDefaults.ConnectedSpaceBetween)) {
        options.forEachIndexed { i, (value, label) ->
            val isSelected = value == selected
            val source = remember { MutableInteractionSource() }
            // a tap is over in ~100ms, too short for the spring to show, so the widened state outlasts the finger a little
            var widened by remember { mutableStateOf(false) }
            // read the raw press events, not the `pressed` state: inside a scrolling parent a quick tap reports its press and
            // release together, and state is only compared once a frame, so the composition would never see it pressed
            LaunchedEffect(source) {
                var held = false
                coroutineScope {
                    source.interactions.collect { event ->
                        when (event) {
                            is PressInteraction.Press -> { held = true; widened = true }
                            is PressInteraction.Release, is PressInteraction.Cancel -> {
                                held = false
                                launch { delay(MIN_WIDEN_MS); if (!held) widened = false }
                            }
                        }
                    }
                }
            }
            // a pressed segment asks for a bigger share of the row, so the others shrink
            val share by animateFloatAsState(if (widened) 1.5f else 1f, MaterialTheme.motionScheme.fastSpatialSpec(), label = "share")
            val shapes = when {
                options.size == 1 -> ToggleButtonDefaults.shapesFor(40.dp)
                i == 0 -> ButtonGroupDefaults.connectedLeadingButtonShapes()
                i == options.lastIndex -> ButtonGroupDefaults.connectedTrailingButtonShapes()
                else -> ButtonGroupDefaults.connectedMiddleButtonShapes()
            // the spec's pressed shape for a 40dp button is 8dp on every corner, round or square, ends included
            }.copy(pressedShape = RoundedCornerShape(8.dp))
            val accent = tint?.invoke(value)
            val surface = MaterialTheme.colorScheme.surfaceContainerLow
            ToggleButton(
                checked = isSelected,
                onCheckedChange = { onSelect(value) },
                modifier = Modifier.weight(share).height(40.dp),
                enabled = enabled,
                shapes = shapes,
                colors = ToggleButtonDefaults.colors(
                    containerColor = if (accent != null) surface else MaterialTheme.colorScheme.surfaceContainerHigh,
                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    checkedContainerColor = accent?.let { lerp(surface, it, 0.3f) } ?: MaterialTheme.colorScheme.primaryContainer,
                    checkedContentColor = MaterialTheme.colorScheme.onSurface,
                ),
                contentPadding = PaddingValues(horizontal = 8.dp),
                interactionSource = source,
            ) {
                if (icon != null) Icon(icon(value), contentDescription = label, modifier = Modifier.size(20.dp))
                else Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}
