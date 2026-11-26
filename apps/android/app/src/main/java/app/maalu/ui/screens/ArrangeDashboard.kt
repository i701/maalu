@file:OptIn(ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowDownward
import androidx.compose.material.icons.outlined.ArrowUpward
import androidx.compose.material.icons.outlined.DragIndicator
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import app.maalu.data.DashboardSection
import app.maalu.ui.components.FormDialog
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

/**
 * Put the cards in your own order, by dragging a handle or with the arrows, and switch off the ones you do not want.
 * Saved once, on Done. [onSave] returns the server's message when it refuses.
 */
@Composable
fun ArrangeDashboard(
    sections: List<DashboardSection>, defaults: List<DashboardSection>, hidden: Set<String>,
    onSave: suspend (List<DashboardSection>, Set<String>) -> String?, onClose: () -> Unit,
) {
    var order by remember { mutableStateOf(sections) }
    var off by remember { mutableStateOf(hidden) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var dragging by remember { mutableStateOf<DashboardSection?>(null) }
    var dragged by remember { mutableFloatStateOf(0f) }
    val scope = rememberCoroutineScope()
    // one height for every row (taller with large text), so a drag knows how far a place is
    val rowHeight = 56.dp * LocalDensity.current.fontScale.coerceAtLeast(1f)
    val step = with(LocalDensity.current) { (rowHeight + 2.dp).toPx() }

    fun move(section: DashboardSection, by: Int): Boolean {
        val from = order.indexOf(section)
        val to = from + by
        if (to !in order.indices) return false
        order = order.toMutableList().apply { add(to, removeAt(from)) }
        return true
    }

    FormDialog(
        "Arrange the dashboard", "Done", busy, error, remember { SnackbarHostState() }, onClose,
        onSave = {
            busy = true; error = null
            scope.launch {
                error = onSave(order, off)
                busy = false
                if (error == null) onClose()
            }
        },
    ) {
        Text("Which cards are off is kept on this device. The order is kept with your account.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            order.forEachIndexed { i, section ->
                // keyed, so a row keeps its drag gesture as it changes places
                key(section) {
                    val lifted = dragging == section
                    Surface(
                        shape = MaterialTheme.shapes.large,
                        color = if (lifted) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerHigh,
                        modifier = Modifier.fillMaxWidth().height(rowHeight).zIndex(if (lifted) 1f else 0f).offset { IntOffset(0, if (lifted) dragged.roundToInt() else 0) },
                    ) {
                        Row(Modifier.padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Outlined.DragIndicator, null,
                                Modifier.pointerInput(section, busy) {
                                    if (!busy) detectDragGestures(
                                        onDragStart = { dragging = section; dragged = 0f },
                                        onDragEnd = { dragging = null },
                                        onDragCancel = { dragging = null },
                                    ) { change, amount ->
                                        change.consume()
                                        dragged += amount.y
                                        // past half a place: swap, and carry the rest of the movement on
                                        while (dragged > step / 2 && move(section, 1)) dragged -= step
                                        while (dragged < -step / 2 && move(section, -1)) dragged += step
                                    }
                                }.padding(12.dp),
                            )
                            Text(section.title, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            IconButton(onClick = { move(section, -1) }, enabled = !busy && i > 0, shapes = IconButtonDefaults.shapes()) { Icon(Icons.Outlined.ArrowUpward, "Move ${section.title} up") }
                            IconButton(onClick = { move(section, 1) }, enabled = !busy && i < order.lastIndex, shapes = IconButtonDefaults.shapes()) { Icon(Icons.Outlined.ArrowDownward, "Move ${section.title} down") }
                            Switch(
                                checked = section.id !in off, enabled = !busy,
                                onCheckedChange = { on -> off = if (on) off - section.id else off + section.id },
                                modifier = Modifier.padding(start = 4.dp).semantics { contentDescription = "Show ${section.title}" },
                            )
                        }
                    }
                }
            }
        }
        TextButton(onClick = { order = defaults; off = emptySet() }, enabled = !busy && (order != defaults || off.isNotEmpty()), shapes = ButtonDefaults.shapes()) {
            Text("Reset order and show every card")
        }
    }
}
