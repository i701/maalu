package app.maalu.ui.components

import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.height
import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.background
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.Surface
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.semantics.toggleableState
import androidx.compose.material3.Switch
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/** How a choice is drawn as a tile of a grouped list: its label and icon, and whether it opens or closes the group. */
data class FormRowStyle(val label: String, val icon: ImageVector, val first: Boolean = false, val last: Boolean = false)

/**
 * A choice as a tile of a Material 3 Expressive grouped list: a small label over what is chosen, or over [placeholder] in
 * quiet ink while nothing is. Pressing it opens the list. [leading] replaces the icon.
 */
@Composable
fun FormRow(
    style: FormRowStyle, value: String?, placeholder: String, onClick: () -> Unit, detail: String? = null, isError: Boolean = false,
    leading: (@Composable () -> Unit)? = null,
    /** Something at the end of the tile, such as a button that clears what is chosen. */
    trailing: (@Composable () -> Unit)? = null,
) {
    MorphTile(onClick, first = style.first, last = style.last, modifier = Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 64.dp).padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(Modifier.size(36.dp), contentAlignment = Alignment.Center) {
                if (leading != null) leading()
                else Icon(style.icon, null, tint = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(Modifier.weight(1f)) {
                Text(style.label, style = MaterialTheme.typography.labelMedium, color = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    value ?: placeholder, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    color = if (value == null) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.onSurface,
                )
                detail?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis) }
            }
            trailing?.invoke()
        }
    }
}

/** An on/off choice as a tile of the list; the whole tile switches it, and [detail] says in a few words what on means. */
@Composable
fun FormSwitchRow(style: FormRowStyle, detail: String, checked: Boolean, enabled: Boolean, onChange: (Boolean) -> Unit) {
    MorphTile({ if (enabled) onChange(!checked) }, first = style.first, last = style.last, modifier = Modifier.fillMaxWidth().semantics { toggleableState = ToggleableState(checked) }) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 64.dp).padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(Modifier.size(36.dp), contentAlignment = Alignment.Center) { Icon(style.icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) }
            Column(Modifier.weight(1f)) {
                Text(style.label, style = MaterialTheme.typography.bodyLarge)
                Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = checked, onCheckedChange = null, enabled = enabled)
        }
    }
}

/** The row that opens and closes the rest of a form; while closed, [summary] says what is already chosen in there. */
@Composable
fun DisclosureRow(label: String, summary: String, open: Boolean, icon: ImageVector = Icons.Outlined.Tune, isError: Boolean = false, onToggle: () -> Unit) {
    MorphTile(
        onToggle, first = true, last = true,
        modifier = Modifier.fillMaxWidth().semantics { stateDescription = if (open) "Expanded" else "Collapsed" },
    ) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 64.dp).padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(Modifier.size(36.dp), contentAlignment = Alignment.Center) { Icon(icon, null, tint = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant) }
            Column(Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.bodyLarge, color = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface)
                if (!open && summary.isNotEmpty()) Text(summary, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Icon(if (open) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** The amount as the form's big figure, its currency above it in muted text: the thing you came to enter. */
@Composable
fun BigAmountField(value: String, onChange: (String) -> Unit, currency: String, enabled: Boolean = true, isError: Boolean = false) {
    val style = MaterialTheme.typography.displayMedium.copy(fontWeight = FontWeight.SemiBold, fontFeatureSettings = "tnum")
    val ink = if (isError) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
    BasicTextField(
        value = value, onValueChange = onChange, enabled = enabled, singleLine = true,
        textStyle = style.copy(color = ink, textAlign = TextAlign.Center), cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Amount in $currency" },
        decorationBox = { field ->
            // the whole block is the field, so a press on the currency focuses it too
            Column(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(currency, style = MaterialTheme.typography.labelLarge, color = if (isError) ink else MaterialTheme.colorScheme.onSurfaceVariant)
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    if (value.isEmpty()) Text("0.00", style = style, color = if (isError) ink else MaterialTheme.colorScheme.outline)
                    field()
                }
            }
        },
    )
}

/** The height the floating Save button and its margin take over the bottom of a form: the room to leave under its last row. */
val SaveButtonRoom = 104.dp

/**
 * A form's confirm button, floating over its foot with the deepest layered shadow. The form fades into the page behind it,
 * so rows scrolling under it don't fight it, and a refusal shows just above it.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun FloatingSave(label: String, busy: Boolean, error: String?, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val page = MaterialTheme.colorScheme.background
    Column(
        modifier.fillMaxWidth().background(Brush.verticalGradient(listOf(page.copy(alpha = 0f), page)))
            .padding(start = 28.dp, end = 28.dp, top = 24.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        error?.let {
            Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.errorContainer) {
                Text(it, Modifier.fillMaxWidth().padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.bodyMedium)
            }
        }
        Button(onClick = onClick, enabled = !busy, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth().height(56.dp).elevation(6, CircleShape)) {
            Text(if (busy) "Saving…" else label, style = MaterialTheme.typography.titleMedium)
        }
    }
}
