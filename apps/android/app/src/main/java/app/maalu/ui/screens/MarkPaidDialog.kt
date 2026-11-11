@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.PayAmounts
import app.maalu.data.Transaction
import app.maalu.data.UserMe
import app.maalu.data.baseOf
import app.maalu.data.cleanAmount
import app.maalu.data.formatMoney
import app.maalu.data.isPositive
import app.maalu.data.markPaidJson
import app.maalu.data.payBody
import app.maalu.data.payTitle
import app.maalu.data.payVerb
import app.maalu.data.shortDate
import app.maalu.data.tidyAmount
import app.maalu.data.tidyRate
import app.maalu.data.title
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.paletteTint
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

/**
 * Turns a planned transaction into a real one. A bill is rarely exactly what was planned (and a salary never is), so the day and
 * the amount can be corrected on the way. A bill in another currency can also take the rate it was really paid at, or what it
 * really cost, since a server bill in dollars changes both. A transfer moves what was planned: only the day can differ.
 * [baseCurrency] is looked up when the caller does not know it.
 */
@Composable
fun MarkPaidDialog(api: Api, t: Transaction, baseCurrency: String?, onClose: () -> Unit, onPaid: () -> Unit) {
    val income = t.type == "income"
    val transfer = t.type == "transfer"
    val plannedRate = tidyRate(t.exchangeRate)
    var base by remember { mutableStateOf(baseCurrency) }
    var amount by remember { mutableStateOf(tidyAmount(t.amount)) }
    var rate by remember { mutableStateOf(plannedRate) }
    var charged by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(LocalDate.now().toString()) }
    var time by remember { mutableStateOf<String?>(null) }
    var pickingDate by remember { mutableStateOf(false) }
    var pickingTime by remember { mutableStateOf(false) }
    var amountError by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { if (base == null) base = (api.get<UserMe>("users/me") as? ApiResult.Ok)?.data?.baseCurrency }
    val foreign = base != null && t.currency != base && !transfer

    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text(payTitle(t.type)) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(t.title(), style = MaterialTheme.typography.titleSmall)
                if (!transfer) {
                    CompactField(
                        amount, { amount = cleanAmount(it); amountError = false; error = null }, if (income) "Amount received" else "Amount",
                        keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = amountError, suffix = t.currency,
                    )
                    Text(
                        if (income) "Expected: ${formatMoney(t.amount, t.currency)}. Type what actually arrived."
                        else "Planned: ${formatMoney(t.amount, t.currency)}. Change it if the real amount differs.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (foreign && base != null) {
                    CompactField(
                        rate, { rate = cleanAmount(it) }, "Exchange rate", keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        enabled = !busy && charged.isBlank(),
                    )
                    val preview = baseOf(amount, rate)
                    Text(
                        "Planned at $plannedRate." + if (preview != null && charged.isBlank()) " Comes to ${formatMoney(preview, base!!)}." else "",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    CompactField(
                        charged, { charged = cleanAmount(it) }, "Charged in $base (optional)", keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        enabled = !busy, suffix = base,
                    )
                    Text("The exact amount taken; the rate is worked out from it.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(if (transfer) "Done on" else if (income) "Received on" else "Paid on", style = MaterialTheme.typography.labelLarge)
                val today = LocalDate.now()
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TintChip(paletteTint(0), date == "$today", { date = "$today" }, { Text("Today") })
                    TintChip(paletteTint(1), date == "${today.minusDays(1)}", { date = "${today.minusDays(1)}" }, { Text("Yesterday") })
                    val custom = date != "$today" && date != "${today.minusDays(1)}"
                    TintChip(paletteTint(2), custom, { pickingDate = true }, { Text(if (custom) shortDate(date) else "Pick a date") })
                    TintChip(paletteTint(3), time != null, { if (time == null) pickingTime = true else time = null }, { Text(time ?: "Add time") })
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                if (!transfer && !isPositive(amount)) { amountError = true; error = "Enter an amount above zero."; return@TextButton }
                busy = true; error = null
                val pay: PayAmounts? = if (transfer) null else payBody(amount.trim(), foreign, rate, plannedRate, charged)
                scope.launch {
                    when (val r = api.postJson<JsonElement>("transactions/${t.id}/post", markPaidJson(date, time, pay).toString())) {
                        is ApiResult.Ok -> onPaid()
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Saving…" else payTitle(t.type)) }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )

    if (pickingDate) {
        val state = rememberDatePickerState(initialSelectedDateMillis = LocalDate.parse(date).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { pickingDate = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { date = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString() }
                    pickingDate = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickingDate = false }) { Text("Cancel") } },
        ) { DatePicker(state) }
    }
    if (pickingTime) {
        val state = rememberTimePickerState(is24Hour = true)
        AlertDialog(
            onDismissRequest = { pickingTime = false },
            confirmButton = { TextButton(onClick = { time = "%02d:%02d".format(state.hour, state.minute); pickingTime = false }) { Text("OK") } },
            dismissButton = { TextButton(onClick = { pickingTime = false }) { Text("Cancel") } },
            text = { TimePicker(state) },
        )
    }
}

/** "marked as paid" for the snackbar. */
fun markedMessage(t: Transaction): String = "${t.title()} marked as ${payVerb(t.type)}"
