package app.maalu.ui.components

import androidx.compose.foundation.lazy.LazyItemScope
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.IntOffset

/** A list row that slides to its new place on the spatial spring (so it can overshoot) and fades with an effects spring (it never does). */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun LazyItemScope.springItem(): Modifier {
    val motion = MaterialTheme.motionScheme
    return Modifier.animateItem(
        fadeInSpec = motion.defaultEffectsSpec(),
        placementSpec = motion.defaultSpatialSpec<IntOffset>(),
        fadeOutSpec = motion.fastEffectsSpec(),
    )
}
