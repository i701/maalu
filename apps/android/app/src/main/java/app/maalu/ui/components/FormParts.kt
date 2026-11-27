package app.maalu.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

/** A section of a sheet or form: a quiet icon tile and a title, so each group reads as its own thing. */
@Composable
fun Section(title: String, icon: ImageVector, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(28.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceContainerHighest), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
            }
            Text(title, style = MaterialTheme.typography.titleSmall)
        }
        content()
    }
}

/**
 * The app's text input: Material's outlined text field (4dp corners, a hairline outline that turns into a primary ring on focus, and a
 * floating [label] that stays above the text once there is some), the same look as the web's. [placeholder] is a hint that shows while the
 * field is focused and empty, for an example such as "For example Groceries".
 */
@Composable
fun CompactField(
    value: String,
    onChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    keyboard: KeyboardOptions = KeyboardOptions.Default,
    singleLine: Boolean = true,
    enabled: Boolean = true,
    /** The least height: a note field passes more, so it opens with room for several lines. */
    minHeight: Dp = 56.dp,
    isError: Boolean = false,
    /** Something fixed at the end of the field, such as a currency code. */
    suffix: String? = null,
    /** For a password: its characters are dots. */
    hidden: Boolean = false,
    /** What the keyboard's action key does (Search, Done). */
    actions: androidx.compose.foundation.text.KeyboardActions = androidx.compose.foundation.text.KeyboardActions.Default,
    placeholder: String? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = modifier.fillMaxWidth().heightIn(min = minHeight),
        enabled = enabled,
        singleLine = singleLine,
        keyboardOptions = keyboard,
        keyboardActions = actions,
        isError = isError,
        label = { Text(label) },
        placeholder = placeholder?.let { hint -> { Text(hint) } },
        suffix = suffix?.let { unit -> { Text(unit) } },
        visualTransformation = if (hidden) PasswordVisualTransformation() else VisualTransformation.None,
        shape = MaterialTheme.shapes.extraSmall,
    )
}
