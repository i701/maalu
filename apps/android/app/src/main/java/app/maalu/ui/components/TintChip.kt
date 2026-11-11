package app.maalu.ui.components

import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

/**
 * A filter chip with a colour of its own: a tinted outline at rest, a tinted fill and a
 * check when chosen. Text stays in the normal ink so it reads on any tint, in light and dark.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TintChip(tint: Color, selected: Boolean, onClick: () -> Unit, label: @Composable () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        enabled = enabled,
        label = label,
        modifier = modifier,
        leadingIcon = if (selected) ({ Icon(Icons.Outlined.Check, null, Modifier.size(FilterChipDefaults.IconSize)) }) else null,
        // no border: a soft tint at rest, a much stronger one when chosen
        colors = FilterChipDefaults.filterChipColors(
            containerColor = tint.copy(alpha = 0.08f),
            labelColor = MaterialTheme.colorScheme.onSurface,
            selectedContainerColor = tint.copy(alpha = 0.55f),
            selectedLabelColor = MaterialTheme.colorScheme.onSurface,
            selectedLeadingIconColor = MaterialTheme.colorScheme.onSurface,
        ),
        // a pill: fully rounded ends
        shape = CircleShape,
        border = null,
    )
}
