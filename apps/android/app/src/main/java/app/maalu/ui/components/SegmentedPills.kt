package app.maalu.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The web's segmented group, natively: no borders, 2dp between segments, round outer ends and small inner
 * corners, and the chosen segment springs to a full pill filled with its colour. A pressed segment relaxes
 * toward squarer, the same morph rule as everywhere else.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun <T> SegmentedPills(
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
    tint: @Composable (T) -> Color? = { null },
    enabled: Boolean = true,
) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        options.forEachIndexed { i, (value, label) ->
            val isSelected = value == selected
            val source = remember { MutableInteractionSource() }
            val pressed by source.collectIsPressedAsState()
            val spring = MaterialTheme.motionScheme.fastSpatialSpec<Dp>()
            val outer = 20.dp
            val inner = 6.dp
            // selected is a full pill; pressed is one step squarer; otherwise round only at the group's ends
            fun corner(roundEnd: Boolean): Dp = when {
                isSelected -> if (pressed) 14.dp else outer
                pressed -> 10.dp
                roundEnd -> outer
                else -> inner
            }
            val first = i == 0
            val last = i == options.lastIndex
            val left by animateDpAsState(corner(first), spring, label = "left")
            val right by animateDpAsState(corner(last), spring, label = "right")
            val accent = tint(value)
            val fill by animateColorAsState(
                when {
                    isSelected -> (accent ?: MaterialTheme.colorScheme.secondary).copy(alpha = 0.34f)
                    else -> MaterialTheme.colorScheme.surfaceContainerHigh
                },
                label = "fill",
            )
            Surface(
                onClick = { onSelect(value) },
                enabled = enabled,
                interactionSource = source,
                shape = RoundedCornerShape(topStart = left, topEnd = right, bottomEnd = right, bottomStart = left),
                color = fill,
                contentColor = if (isSelected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f).height(40.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium)
                }
            }
        }
    }
}
