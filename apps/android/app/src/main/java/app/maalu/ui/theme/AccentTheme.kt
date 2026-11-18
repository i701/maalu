package app.maalu.ui.theme

import androidx.compose.animation.animateColorAsState
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialExpressiveTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance

/**
 * Gives what is inside the colour of one page: the primary family (primary, its container, inverse primary and the secondary container)
 * is regenerated from [accent], the way the web does, and eases to the next page's colours on an effects spring. A null accent keeps
 * the app's own. Dialogs opened from inside take it too.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AccentTheme(accent: String?, content: @Composable () -> Unit) {
    val base = MaterialTheme.colorScheme
    val roles = accent?.let { accentRoles(it, dark = base.background.luminance() < 0.5f) }
    val spec = MaterialTheme.motionScheme.defaultEffectsSpec<Color>()
    @Composable fun eased(target: Color) = animateColorAsState(target, spec, label = "accent").value
    val scheme = base.copy(
        primary = eased(roles?.primary ?: base.primary),
        onPrimary = eased(roles?.onPrimary ?: base.onPrimary),
        primaryContainer = eased(roles?.primaryContainer ?: base.primaryContainer),
        onPrimaryContainer = eased(roles?.onPrimaryContainer ?: base.onPrimaryContainer),
        inversePrimary = eased(roles?.inversePrimary ?: base.inversePrimary),
        secondaryContainer = eased(roles?.secondaryContainer ?: base.secondaryContainer),
        onSecondaryContainer = eased(roles?.onSecondaryContainer ?: base.onSecondaryContainer),
    )
    MaterialExpressiveTheme(
        colorScheme = scheme, motionScheme = MaterialTheme.motionScheme, shapes = MaterialTheme.shapes, typography = MaterialTheme.typography,
        content = content,
    )
}
