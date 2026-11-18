package app.maalu.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.IntOffset

/** A bar pinned to the bottom (a selection bar) that rises into place on the spatial spring and fades on an effects spring. */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun BoxScope.BottomReveal(visible: Boolean, content: @Composable AnimatedVisibilityScope.() -> Unit) {
    val motion = MaterialTheme.motionScheme
    AnimatedVisibility(
        visible,
        modifier = androidx.compose.ui.Modifier.align(Alignment.BottomCenter),
        enter = slideInVertically(motion.defaultSpatialSpec<IntOffset>()) { it } + fadeIn(motion.defaultEffectsSpec<Float>()),
        exit = slideOutVertically(motion.defaultSpatialSpec<IntOffset>()) { it } + fadeOut(motion.fastEffectsSpec<Float>()),
        content = content,
    )
}
