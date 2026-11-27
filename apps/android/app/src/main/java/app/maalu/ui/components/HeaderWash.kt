package app.maalu.ui.components

import androidx.compose.ui.graphics.luminance
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import app.maalu.R

/**
 * The iOS app's backdrop (the same two images): a grainy sky blue, or midnight blue in dark mode, at the top of the page and
 * fading into the page's colour. [dark] is the theme in use, which can differ from the phone's.
 */
@Composable
fun HeaderWash(dark: Boolean) {
    Image(
        painterResource(if (dark) R.drawable.header_midnight else R.drawable.header_sky),
        contentDescription = null,
        contentScale = ContentScale.Crop,
        alignment = Alignment.TopCenter,
        modifier = Modifier
            .fillMaxWidth()
            .height(560.dp)
            // mirrored in light mode so the dark side sits on the right, away from the titles; offscreen for the fade's blend
            .graphicsLayer { scaleX = if (dark) 1f else -1f; compositingStrategy = CompositingStrategy.Offscreen }
            .drawWithContent {
                drawContent()
                drawRect(Brush.verticalGradient(0f to Color.Black, 0.4f to Color.Black.copy(alpha = 0.55f), 1f to Color.Transparent), blendMode = BlendMode.DstIn)
            },
    )
}

/** A full-screen page of its own (a form's window) on the same backdrop as the app's pages. Its Scaffold's container is transparent. */
@Composable
fun BackdropPage(content: @Composable BoxScope.() -> Unit) {
    // the theme in use, which can differ from the phone's
    val dark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        HeaderWash(dark)
        content()
    }
}
