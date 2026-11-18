package app.maalu.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer

/** Fades in the first time it is composed (a list that replaces its spinner), on an effects spring so it never overshoots. */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun Modifier.fadeInOnAppear(): Modifier {
    val alpha = remember { Animatable(0f) }
    val spec = MaterialTheme.motionScheme.defaultEffectsSpec<Float>()
    LaunchedEffect(Unit) { alpha.animateTo(1f, spec) }
    return graphicsLayer { this.alpha = alpha.value }
}

/** Dims the rows while a new list is loading, instead of replacing them with a spinner. */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun Modifier.dimWhen(busy: Boolean): Modifier {
    val alpha by animateFloatAsState(if (busy) 0.5f else 1f, MaterialTheme.motionScheme.defaultEffectsSpec(), label = "dim")
    return graphicsLayer { this.alpha = alpha }
}
