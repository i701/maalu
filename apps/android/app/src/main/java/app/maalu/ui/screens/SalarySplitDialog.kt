@file:OptIn(ExperimentalMaterial3Api::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import app.maalu.data.SalaryRule
import app.maalu.data.SplitLine
import app.maalu.data.SplitPlan
import app.maalu.data.SplitResult
import app.maalu.data.cleanAmount
import app.maalu.data.formatMoney
import app.maalu.data.madeTotal
import app.maalu.data.splitLines
import app.maalu.data.splitRequest
import app.maalu.data.splitTotals
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.MoneyText
import kotlinx.coroutines.launch

/** Whether there is a rule to split a salary by, so the split is only offered when it has something to propose. */
suspend fun Api.hasSalaryRules(): Boolean = (get<List<SalaryRule>>("salary-rules") as? ApiResult.Ok)?.data?.isNotEmpty() == true

/** "Moved to 2 accounts and set aside for 1 goal." from what the server made. */
fun splitMessage(r: SplitResult): String {
    val parts = buildList {
        if (r.transfers > 0) add("moved to ${r.transfers} ${if (r.transfers == 1) "account" else "accounts"}")
        if (r.entries > 0) add("set aside for ${r.entries} ${if (r.entries == 1) "goal" else "goals"}")
    }
    return if (parts.isEmpty()) "Nothing was made." else parts.joinToString(" and ").replaceFirstChar { it.uppercase() } + "."
}

/**
 * Splits a salary between accounts and goals by the rules in Settings. It opens with the proposal: every line filled in and
 * editable, nothing made until you confirm. Lines an automatic rule already made are shown as made. Once the whole salary is split
 * it shows what was made and offers to undo it (the transfers go to the trash, the set-asides are removed). [onDone] runs after
 * anything changed, with a line to show.
 */
@Composable
fun SalarySplitDialog(api: Api, transactionId: String, onClose: () -> Unit, onDone: (String) -> Unit) {
    var plan by remember { mutableStateOf<SplitPlan?>(null) }
    var lines by remember { mutableStateOf<List<SplitLine>>(emptyList()) }
    var failed by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var confirmingUndo by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(transactionId) {
        when (val r = api.get<SplitPlan>("transactions/$transactionId/salary-split")) {
            is ApiResult.Ok -> { plan = r.data; lines = splitLines(r.data) }
            is ApiResult.Failed -> failed = r.message
        }
    }

    val p = plan
    val totals = p?.let { splitTotals(lines, it.amount, madeTotal(it)) }
    val complete = p?.complete == true
    val title = when { complete -> "This salary was split"; p?.applied == true -> "Finish splitting this salary"; else -> "Split this salary" }
    val saveLabel = when {
        p == null -> "Close"
        complete || lines.isEmpty() -> "Done"
        else -> "Make ${totals?.count ?: 0} ${if (totals?.count == 1) "move" else "moves"}"
    }

    FormDialog(
        title = title, saveLabel = saveLabel, busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            when {
                p == null || complete || lines.isEmpty() -> onClose()
                totals == null || totals.count == 0 -> error = "Tick at least one line."
                totals.invalid -> error = "Every ticked line needs an amount above zero, with at most four decimals."
                totals.over -> error = "These add up to more than the salary."
                else -> {
                    busy = true; error = null
                    scope.launch {
                        when (val r = api.postJson<SplitResult>("transactions/$transactionId/salary-split", splitRequest(lines).toString())) {
                            is ApiResult.Ok -> onDone(splitMessage(r.data))
                            is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                        }
                    }
                }
            }
        },
    ) {
        when {
            failed != null -> Text(failed ?: "", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 16.dp))
            p == null -> Box(Modifier.fillMaxWidth().padding(top = 48.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            else -> Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row { MoneyText(p.amount, p.currency, style = MaterialTheme.typography.bodyMedium); Text(" arrived in ${p.accountName}.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                if (p.applied) {
                    if (!complete) Text("Already made", style = MaterialTheme.typography.titleSmall)
                    p.made.forEach { m ->
                        Row {
                            Text("${m.targetName}: ", style = MaterialTheme.typography.bodyMedium)
                            MoneyText(m.amount, p.currency, style = MaterialTheme.typography.bodyMedium)
                            Text(if (m.kind == "transfer") " moved" else " set aside", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
                if (!complete) {
                    if (lines.isEmpty()) Text("You have not set up any rules yet. Choose how your salary is split in Settings.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    lines.forEach { line -> LineRow(line, onChange = { c -> lines = lines.map { if (it.key == line.key) c(it) else it }; error = null }) }
                    if (lines.isNotEmpty() && totals != null) {
                        if (totals.over) Text("These add up to more than the salary.", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                        else Text(
                            "Moving ${formatMoney(totals.total, p.currency)}. ${formatMoney(totals.left, p.currency)} stays in ${p.accountName}.",
                            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                if (p.applied) TextButton(onClick = { confirmingUndo = true }, enabled = !busy) { Text(if (complete) "Undo the split" else "Undo what was made", color = MaterialTheme.colorScheme.error) }
            }
        }
    }

    if (confirmingUndo) AlertDialog(
        onDismissRequest = { confirmingUndo = false },
        title = { Text("Undo the split?") },
        text = { Text("The transfers made from this salary go to the trash and the amounts set aside for goals are removed.") },
        confirmButton = {
            TextButton(onClick = {
                confirmingUndo = false; busy = true
                scope.launch {
                    when (val r = api.delete("transactions/$transactionId/salary-split")) {
                        is ApiResult.Ok -> onDone("The split was undone.")
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text("Undo it", color = MaterialTheme.colorScheme.error) }
        },
        dismissButton = { TextButton(onClick = { confirmingUndo = false }) { Text("Keep it") } },
    )
}

@Composable
private fun LineRow(line: SplitLine, onChange: ((SplitLine) -> SplitLine) -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Checkbox(checked = line.on, onCheckedChange = { on -> onChange { it.copy(on = on) } }, enabled = line.reason == null)
        Column(Modifier.weight(1f)) {
            Text(line.name, style = MaterialTheme.typography.bodyLarge)
            Text(
                (line.reason ?: line.rule) + if (line.auto && !line.done) " · moves automatically" else "",
                style = MaterialTheme.typography.bodySmall,
                color = if (line.reason != null && !line.done) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        CompactField(
            line.amount, { v -> onChange { it.copy(amount = cleanAmount(v)) } }, "Amount",
            modifier = Modifier.width(120.dp), keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = line.on,
        )
    }
}
