package app.maalu.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.IntSize

/** A section that opens and closes: size on the spatial spring, opacity on the effects spring (which never overshoots). */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun Disclosure(visible: Boolean, content: @Composable AnimatedVisibilityScope.() -> Unit) {
    val motion = MaterialTheme.motionScheme
    AnimatedVisibility(
        visible,
        enter = expandVertically(motion.defaultSpatialSpec<IntSize>()) + fadeIn(motion.defaultEffectsSpec<Float>()),
        exit = shrinkVertically(motion.defaultSpatialSpec<IntSize>()) + fadeOut(motion.defaultEffectsSpec<Float>()),
        content = content,
    )
}
