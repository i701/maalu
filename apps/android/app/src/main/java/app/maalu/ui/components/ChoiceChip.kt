package app.maalu.ui.components

import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.material3.LocalMinimumInteractiveComponentSize
import androidx.compose.foundation.layout.padding
import app.maalu.ui.theme.chosenColors
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

/** A filter chip: white with a layered shadow at rest, blue with a check when chosen. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChoiceChip(selected: Boolean, onClick: () -> Unit, label: @Composable () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val (chosen, onChosen) = chosenColors()
    // the shadow has to hug the 32dp chip, so the room around it (to 48dp, as before) is padding, not the chip's own minimum size;
    // a press just outside still counts, since Compose widens small touch targets
    CompositionLocalProvider(LocalMinimumInteractiveComponentSize provides Dp.Unspecified) { FilterChip(
        selected = selected,
        onClick = onClick,
        enabled = enabled,
        label = label,
        modifier = modifier.padding(vertical = 8.dp).elevation(2, CircleShape),
        leadingIcon = if (selected) ({ Icon(Icons.Outlined.Check, null, Modifier.size(FilterChipDefaults.IconSize)) }) else null,
        colors = FilterChipDefaults.filterChipColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            labelColor = MaterialTheme.colorScheme.onSurface,
            selectedContainerColor = chosen,
            selectedLabelColor = onChosen,
            selectedLeadingIconColor = onChosen,
        ),
        // a pill: fully rounded ends
        shape = CircleShape,
        border = null,
    ) }
}
