package app.maalu.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material3.AlertDialogDefaults
import androidx.compose.material3.BasicAlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.text.TextStyle
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties

/**
 * A glow of the page's accent across the top edge, fading to nothing below the title: an ellipse centred on the top edge, with radii of 110% of the
 * width and 150dp, from the accent's container colour to transparent (the web's DIALOG_GLOW). The container colour follows the
 * page's accent through AccentTheme.
 */
@Composable
fun Modifier.accentGlow(): Modifier {
    val glow = MaterialTheme.colorScheme.primaryContainer
    return drawBehind {
        // the CSS ellipse's sizes are radii: 110% of the width across and 150dp down. A circle of the wide radius, squashed to 150dp
        // tall and pivoting on the top edge, is that ellipse
        val radius = size.width * 1.1f
        val squash = 150.dp.toPx() / radius
        scale(scaleX = 1f, scaleY = squash, pivot = Offset(size.width / 2, 0f)) {
            drawRect(
                brush = Brush.radialGradient(
                    0f to glow, 0.55f to glow.copy(alpha = glow.alpha * 0.45f), 1f to glow.copy(alpha = 0f),
                    center = Offset(size.width / 2, 0f), radius = radius,
                ),
                size = Size(size.width, radius),
            )
        }
    }
}

/**
 * Material's AlertDialog with the accent glow behind its title. The same parameters as the one it replaces; the layout
 * is the library's (24dp padding, headline, body, buttons at the end).
 */
@Composable
fun AlertDialog(
    onDismissRequest: () -> Unit,
    confirmButton: @Composable () -> Unit,
    dismissButton: (@Composable () -> Unit)? = null,
    title: (@Composable () -> Unit)? = null,
    text: (@Composable () -> Unit)? = null,
    properties: DialogProperties = DialogProperties(),
) {
    BasicAlertDialog(onDismissRequest = onDismissRequest, properties = properties) {
        Surface(
            modifier = Modifier.sizeIn(minWidth = 280.dp, maxWidth = 560.dp),
            shape = AlertDialogDefaults.shape,
            color = AlertDialogDefaults.containerColor,
            tonalElevation = AlertDialogDefaults.TonalElevation,
        ) {
            Box(Modifier.accentGlow()) {
                Column(Modifier.padding(24.dp)) {
                    title?.let { slot ->
                        Box(Modifier.padding(bottom = 16.dp).align(Alignment.Start)) {
                            Styled(MaterialTheme.colorScheme.onSurface, MaterialTheme.typography.headlineSmall, slot)
                        }
                    }
                    text?.let { slot ->
                        Box(Modifier.weight(1f, fill = false).padding(bottom = 24.dp).align(Alignment.Start)) {
                            Styled(MaterialTheme.colorScheme.onSurfaceVariant, MaterialTheme.typography.bodyMedium, slot)
                        }
                    }
                    Row(Modifier.align(Alignment.End), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        dismissButton?.invoke()
                        confirmButton()
                    }
                }
            }
        }
    }
}

/** The date picker's dialog: 360dp wide with the picker above its buttons and the accent glow behind it. Pass [glowDatePickerColors] to the picker inside. */
@Composable
fun DatePickerDialog(
    onDismissRequest: () -> Unit,
    confirmButton: @Composable () -> Unit,
    dismissButton: (@Composable () -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    BasicAlertDialog(onDismissRequest = onDismissRequest, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(
            modifier = Modifier.width(360.dp),
            shape = DatePickerDefaults.shape,
            color = DatePickerDefaults.colors().containerColor,
            tonalElevation = DatePickerDefaults.TonalElevation,
        ) {
            Box(Modifier.accentGlow()) {
                Column {
                    content()
                    Row(Modifier.fillMaxWidth().padding(bottom = 8.dp, end = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End)) {
                        dismissButton?.invoke()
                        confirmButton()
                    }
                }
            }
        }
    }
}

/** The date picker's own fill, off, so the dialog's glow shows through it. */
@Composable
fun glowDatePickerColors() = DatePickerDefaults.colors(containerColor = Color.Transparent)

@Composable
private fun Styled(color: androidx.compose.ui.graphics.Color, style: TextStyle, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalContentColor provides color) { ProvideTextStyle(style, content) }
}

/** For a full-screen scaffold: the page colour with the glow behind the top bar. Pass it as the Scaffold's modifier, with a transparent container. */
@Composable
fun Modifier.glowBackground(): Modifier = background(MaterialTheme.colorScheme.background).accentGlow()

/** A top bar that lets the glow show through. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun glowTopBarColors() = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, scrolledContainerColor = Color.Transparent)

/** For a bottom sheet: its own fill in the sheet's rounded top corners, with the glow over it. Pass it as the sheet's modifier, with a transparent container. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Modifier.glowSheet(fill: Color): Modifier = clip(BottomSheetDefaults.ExpandedShape).background(fill).accentGlow()
