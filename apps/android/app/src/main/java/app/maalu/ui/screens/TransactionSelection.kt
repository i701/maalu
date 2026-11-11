package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.outlined.Check
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/** The tick that stands in for a picked row's category badge: the same size, so the row does not change shape. */
@Composable
fun PickedBadge() {
    Box(Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
        Icon(Icons.Outlined.Check, "Selected", Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onPrimary)
    }
}

/** What the bar above the list offers while rows are picked (a long press starts picking; a tap then ticks or unticks). */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TransactionSelectionBar(count: Int, busy: Boolean, onDelete: () -> Unit, onCategory: () -> Unit, onTag: () -> Unit, onClear: () -> Unit, modifier: Modifier = Modifier) {
    Surface(color = MaterialTheme.colorScheme.secondaryContainer, shape = MaterialTheme.shapes.extraLarge, shadowElevation = 6.dp, modifier = modifier.fillMaxWidth().padding(12.dp)) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("$count selected", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                TextButton(onClick = onClear, enabled = !busy) { Text("Clear") }
            }
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(onClick = onCategory, enabled = !busy, shapes = ButtonDefaults.shapes()) { Icon(Icons.Outlined.Category, null, Modifier.padding(end = 6.dp).size(18.dp)); Text("Category") }
                OutlinedButton(onClick = onTag, enabled = !busy, shapes = ButtonDefaults.shapes()) { Icon(Icons.Outlined.Sell, null, Modifier.padding(end = 6.dp).size(18.dp)); Text("Add tag") }
                Button(
                    onClick = onDelete, enabled = !busy, shapes = ButtonDefaults.shapes(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer),
                ) { Icon(Icons.Outlined.Delete, null, Modifier.padding(end = 6.dp).size(18.dp)); Text("Delete") }
            }
        }
    }
}
