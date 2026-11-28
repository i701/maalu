package app.maalu.ui.components

import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.graphics.luminance
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.ButtonDefaults
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import app.maalu.ui.components.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import app.maalu.ui.theme.Accents

/** A yes/no question; [destructive] paints the confirm action in the error colour. */
@Composable
fun ConfirmDialog(title: String, text: String, confirmLabel: String, onConfirm: () -> Unit, onDismiss: () -> Unit, destructive: Boolean = true) {
    AlertDialog(
        onDismissRequest = onDismiss, title = { Text(title) }, text = { Text(text) },
        confirmButton = { TextButton(shapes = ButtonDefaults.shapes(), onClick = onConfirm) { Text(confirmLabel, color = if (destructive) MaterialTheme.colorScheme.error else Color.Unspecified) } },
        dismissButton = { TextButton(shapes = ButtonDefaults.shapes(), onClick = onDismiss) { Text("Cancel") } },
    )
}

/** The eight accent colours as round swatches; the chosen one carries a check. [selected] null means "automatic". */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ColorSwatches(names: List<String>, selected: String?, onSelect: (String) -> Unit, enabled: Boolean = true) {
    FlowRow(Modifier.selectableGroup(), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        names.forEach { name ->
            val tint = Accents.getValue(name)
            Box(
                Modifier.minimumInteractiveComponentSize().size(40.dp).clip(CircleShape).background(tint.copy(alpha = if (name == selected) 1f else 0.35f))
                    .selectable(selected = name == selected, enabled = enabled, role = Role.RadioButton) { onSelect(name) }
                    .semantics { contentDescription = name },
                contentAlignment = Alignment.Center,
            ) {
                // white vanishes on the pale accents
                if (name == selected) Icon(Icons.Outlined.Check, null, tint = if (tint.luminance() > 0.3f) Color.Black else Color.White, modifier = Modifier.size(22.dp))
            }
        }
    }
}
