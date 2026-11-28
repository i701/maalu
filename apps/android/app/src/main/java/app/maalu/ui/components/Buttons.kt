@file:OptIn(ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.RowScope
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ButtonShapes
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

// Material 3 Expressive's own buttons (pills that morph squarer while pressed) at three levels of importance.

/** The one main action. A taller button passes the [shapes] for its height, so the pressed corner matches. */
@Composable
fun PrimaryButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    shapes: ButtonShapes = ButtonDefaults.shapes(),
    content: @Composable RowScope.() -> Unit,
) {
    Button(onClick = onClick, shapes = shapes, modifier = modifier, enabled = enabled, content = content)
}

/** The other things to do. */
@Composable
fun SecondaryButton(onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, content: @Composable RowScope.() -> Unit) {
    FilledTonalButton(onClick = onClick, shapes = ButtonDefaults.shapes(), modifier = modifier, enabled = enabled, content = content)
}

/** Deleting and turning off: an outline in the error colour, so it is never mistaken for the main action. */
@Composable
fun DangerButton(onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, content: @Composable RowScope.() -> Unit) {
    val error = MaterialTheme.colorScheme.error
    OutlinedButton(
        onClick = onClick, shapes = ButtonDefaults.shapes(), modifier = modifier, enabled = enabled,
        colors = ButtonDefaults.outlinedButtonColors(contentColor = error),
        border = BorderStroke(1.dp, error.copy(alpha = if (enabled) 0.6f else 0.2f)), content = content,
    )
}
