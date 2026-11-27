package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.text.KeyboardOptions
import app.maalu.ui.components.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.IntervalUnits
import app.maalu.data.Subscription
import app.maalu.data.Transaction
import app.maalu.data.dayLabel
import app.maalu.data.defaultSubscriptionName
import app.maalu.data.formatMoney
import app.maalu.data.fromTransactionJson
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.SegmentedPills
import kotlinx.coroutines.launch

/**
 * Make a payment already in the history the first payment of a new subscription (the web's "Make subscription"): ask for a
 * name and how often, and the server copies the amount, currency, rate, vendor, method and category. [onDone] gets the message to show.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun MakeSubscriptionDialog(api: Api, t: Transaction, onClose: () -> Unit, onDone: (String) -> Unit) {
    var name by remember { mutableStateOf(t.defaultSubscriptionName()) }
    var count by remember { mutableStateOf("1") }
    var unit by remember { mutableStateOf("month") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text("Make this a subscription") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "${formatMoney(t.amount, t.currency)} on ${dayLabel(t.date)} becomes the first payment. Amount, currency, rate, vendor and category are copied.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                CompactField(name, { name = it.take(200) }, "Name", enabled = !busy)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    CompactField(count, { count = it.filter(Char::isDigit).take(3) }, "Every", Modifier.weight(0.4f), KeyboardOptions(keyboardType = KeyboardType.Number), enabled = !busy, placeholder = "1")
                }
                SegmentedPills(
                    IntervalUnits, unit, { unit = it },
                    enabled = !busy,
                )
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(shapes = ButtonDefaults.shapes(), enabled = !busy, onClick = {
                busy = true
                scope.launch {
                    when (val r = api.postJson<Subscription>("subscriptions/from-transaction/${t.id}", fromTransactionJson(t, name, count, unit).toString())) {
                        is ApiResult.Ok -> onDone("Subscription created from transaction")
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Making…" else "Make subscription") }
        },
        dismissButton = { TextButton(shapes = ButtonDefaults.shapes(), onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}
