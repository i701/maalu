package app.maalu.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonColors
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LocalMinimumInteractiveComponentSize
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.asComposePath
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.graphics.shapes.CornerRounding
import androidx.graphics.shapes.RoundedPolygon
import androidx.graphics.shapes.rectangle
import androidx.graphics.shapes.toPath
import app.maalu.ui.theme.DeepBlue

private val Lip = 4.dp

/** A rectangle with continuous corners: 12dp, smoothed 60%, so each curve eases out of the straight edge instead of turning like a circle. */
private val Squircle = object : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline {
        val rounding = CornerRounding(with(density) { 12.dp.toPx() }, smoothing = 0.6f)
        val polygon = RoundedPolygon.rectangle(size.width, size.height, rounding, centerX = size.width / 2, centerY = size.height / 2)
        return Outline.Generic(polygon.toPath().asComposePath())
    }
}

/**
 * Material's filled button as a squircle on a Duolingo-style ledge: a solid lip in a darker shade of the fill sits [Lip] under it, and a
 * press pushes the button down onto the lip (that push is the press feedback, in place of the pill's corner morph). The default fill is
 * the deep blue with white text in both themes (a caller's `colors` still win), and labels are bold.
 */
@Composable
fun RaisedButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    colors: ButtonColors = ButtonDefaults.buttonColors(containerColor = DeepBlue, contentColor = Color.White),
    content: @Composable RowScope.() -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val sink by animateDpAsState(if (pressed && enabled) Lip else 0.dp, MaterialTheme.motionScheme.fastEffectsSpec(), label = "sink")
    // judge the fill as it shows on a card, since some are see-through tints; a pale or near-black one (dark mode) gets a lip leaning
    // to its ink, as a darker one would be grey or vanish into the page
    val fill = colors.containerColor.compositeOver(MaterialTheme.colorScheme.surfaceContainerLow)
    val lip = if (fill.luminance() in 0.08f..0.5f) lerp(fill, Color.Black, 0.3f) else lerp(fill, colors.contentColor, 0.2f)
    // the box keeps the 48dp touch size in the layout, so the button inside is only as big as the shape the lip is drawn under
    Box(Modifier.minimumInteractiveComponentSize().then(modifier), propagateMinConstraints = true) {
        CompositionLocalProvider(LocalMinimumInteractiveComponentSize provides Dp.Unspecified) {
            Button(
                onClick = onClick, shape = Squircle, enabled = enabled, colors = colors, interactionSource = source,
                modifier = Modifier.padding(bottom = Lip)
                    .drawBehind {
                        if (enabled) translate(top = Lip.toPx()) { drawOutline(Squircle.createOutline(size, layoutDirection, this), lip) }
                    }
                    .graphicsLayer { translationY = sink.toPx() },
            ) {
                val row = this
                ProvideTextStyle(LocalTextStyle.current.copy(fontWeight = FontWeight.Bold)) { row.content() }
            }
        }
    }
}
