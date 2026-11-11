package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Notes
import androidx.compose.material.icons.outlined.Numbers
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Budget
import app.maalu.data.BudgetLine
import app.maalu.data.BudgetMove
import app.maalu.data.Ref
import app.maalu.data.cleanAmount
import app.maalu.data.formatMoney
import app.maalu.data.historyByPeriod
import app.maalu.data.madeAt
import app.maalu.data.moveJson
import app.maalu.data.moveProblem
import app.maalu.data.moveSources
import app.maalu.data.moveText
import app.maalu.data.shortDate
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.Section
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.Accents
import kotlinx.coroutines.launch

private const val TOP_UP = ""

/**
 * Move money into a monthly limit from another one for the period shown, or add to it for that period only. A limit gives at most what it has
 * left; next period both are back to normal.
 */
@Composable
fun MoveMoneyDialog(api: Api, budget: Budget, line: BudgetLine, onClose: () -> Unit, onDone: (String) -> Unit) {
    val sources = remember(budget, line.id) { moveSources(budget, line.id) }
    var from by remember { mutableStateOf(sources.firstOrNull { it.usable }?.line?.id ?: TOP_UP) }
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var problem by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val source = sources.firstOrNull { it.line.id == from }
    val money = { v: String -> formatMoney(v, budget.currency) }

    FormDialog(
        title = "Move money to ${line.name}", saveLabel = if (source != null) "Move" else "Add",
        busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            val p = moveProblem(amount, source?.left)
            problem = p
            if (p != null) return@FormDialog
            busy = true; error = null
            scope.launch {
                val on = budget.period?.start ?: java.time.LocalDate.now().toString()
                when (val r = api.postJson<Budget>("budget/moves", moveJson(line.id, source?.line?.id, amount, on, note).toString())) {
                    is ApiResult.Ok -> onDone(if (source != null) "Moved ${money(amount.trim())} from ${source.line.name} to ${line.name}" else "Added ${money(amount.trim())} to ${line.name} for this period")
                    is ApiResult.Failed -> { error = r.message; busy = false; launch { snackbar.showSnackbar(r.message.lines().first()) } }
                }
            }
        },
    ) {
        Section("From", Icons.Outlined.SwapHoriz, Accents.getValue("blue")) {
            PickerField(
                title = "From", value = if (from == TOP_UP) Ref(TOP_UP, "Nowhere: just add to this limit") else source?.let { Ref(it.line.id, it.line.name) },
                placeholder = "Choose where it comes from", anyLabel = null,
                entries = sources.map { Ref(it.line.id, it.line.name) } + Ref(TOP_UP, "Nowhere: just add to this limit"),
                detail = { r -> sources.firstOrNull { it.line.id == r.id }?.let { if (it.usable) "${money(it.left)} left" else "nothing left" } },
                onPick = { r -> val chosen = sources.firstOrNull { it.line.id == r?.id }; if (r?.id == TOP_UP || (chosen != null && chosen.usable)) { from = r?.id ?: TOP_UP; problem = null } },
            )
            Text(
                if (source != null) "For this period only. Next period both limits are back to normal." else "Adds to this limit for this period only, without taking from another.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Section("Amount (${budget.currency})", Icons.Outlined.Numbers, Accents.getValue("orange")) {
            CompactField(
                amount, { amount = cleanAmount(it); problem = null }, "500", keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                enabled = !busy, isError = problem != null,
            )
            if (source != null) Text("Up to ${money(source.left)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            problem?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        }
        Section("Note", Icons.Outlined.Notes, Accents.getValue("lime")) {
            CompactField(note, { note = it.take(200) }, "Guests over for the weekend (optional)", enabled = !busy)
        }
    }
}

/**
 * Every move into or out of a limit, in every period, grouped by period: what moved where, when it was made, the note, and whether it was undone
 * (undone moves stay, marked, so nothing disappears).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoveHistorySheet(api: Api, line: BudgetLine, currency: String, onClose: () -> Unit) {
    var entries by remember { mutableStateOf<List<BudgetMove>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(line.id) {
        when (val r = api.get<List<BudgetMove>>("budget/lines/${line.id}/moves")) {
            is ApiResult.Ok -> entries = r.data
            is ApiResult.Failed -> { entries = emptyList(); error = r.message.lines().first() }
        }
    }
    ModalBottomSheet(onDismissRequest = onClose) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Money moved, ${line.name}", style = MaterialTheme.typography.titleLarge)
            val list = entries
            when {
                list == null -> CircularProgressIndicator(Modifier.padding(24.dp))
                error != null -> Text(error ?: "", color = MaterialTheme.colorScheme.error)
                list.isEmpty() -> Text("No money has been moved into or out of this limit yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                else -> historyByPeriod(list).forEach { p ->
                    Text("${shortDate(p.start)} – ${shortDate(p.end)}", style = MaterialTheme.typography.titleSmall)
                    p.entries.forEach { e ->
                        val undone = e.undoneAt != null
                        Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(
                                        moveText(e, line.id, currency) ?: "", style = MaterialTheme.typography.bodyMedium,
                                        textDecoration = if (undone) TextDecoration.LineThrough else null,
                                        color = if (undone) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                    )
                                    if (undone) TintChip(Accents.getValue("slate"), false, {}, { Text("Undone") })
                                }
                                e.note?.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                                Text(
                                    "Made ${madeAt(e.createdAt)}" + (e.undoneAt?.let { " · undone ${madeAt(it)}" } ?: ""),
                                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
