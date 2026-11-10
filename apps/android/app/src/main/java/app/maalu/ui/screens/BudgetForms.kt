@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Numbers
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
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
import app.maalu.data.Account
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Budget
import app.maalu.data.BudgetLine
import app.maalu.data.CategoryItem
import app.maalu.data.Goal
import app.maalu.data.GoalField
import app.maalu.data.GoalForm
import app.maalu.data.LineField
import app.maalu.data.LineForm
import app.maalu.data.LiabilityGroups
import app.maalu.data.Ref
import app.maalu.data.cleanAmount
import app.maalu.data.formatMoney
import app.maalu.data.goalEntryJson
import app.maalu.data.goalFormFrom
import app.maalu.data.isPositive
import app.maalu.data.lineFormFrom
import app.maalu.data.patchJson
import app.maalu.data.problem
import app.maalu.data.shortDate
import app.maalu.data.toJson
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.Section
import app.maalu.ui.components.SegmentedPills
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.idTint
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

/** Add or edit a monthly limit: a name, an amount per period, the categories it covers and whether unspent money carries over. */
@Composable
fun LineFormScreen(api: Api, currency: String, editing: BudgetLine?, onClose: () -> Unit, onSaved: () -> Unit) {
    val before = remember(editing) { editing?.let(::lineFormFrom) }
    var form by remember { mutableStateOf(before ?: LineForm()) }
    var categories by remember { mutableStateOf<List<CategoryItem>?>(null) }
    var errorField by remember { mutableStateOf<LineField?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { categories = (api.get<List<CategoryItem>>("categories") as? ApiResult.Ok)?.data.orEmpty() }

    FormDialog(
        title = if (editing == null) "New limit" else "Edit limit", saveLabel = if (editing == null) "Add limit" else "Save changes",
        busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            val problem = form.problem()
            if (problem != null) {
                errorField = problem.field; error = null
                scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(problem.message) }
                return@FormDialog
            }
            val patch = if (editing != null && before != null) form.patchJson(before) else null
            if (patch != null && patch.isEmpty()) { onClose(); return@FormDialog }
            busy = true; error = null; errorField = null
            scope.launch {
                val r = if (editing != null && patch != null) api.patchJson<Budget>("budget/lines/${editing.id}", patch.toString())
                else api.postJson<Budget>("budget/lines", form.toJson().toString())
                when (r) {
                    is ApiResult.Ok -> onSaved()
                    is ApiResult.Failed -> { error = r.message; busy = false; launch { snackbar.showSnackbar(r.message.lines().first()) } }
                }
            }
        },
    ) {
        Section("Name", Icons.Outlined.Savings, Accents.getValue("blue")) {
            CompactField(form.name, { errorField = null; form = form.copy(name = it.take(100)) }, "For example Food", enabled = !busy, isError = errorField == LineField.Name)
        }
        Section("Amount each period", Icons.Outlined.Numbers, Accents.getValue("orange")) {
            CompactField(
                form.amount, { errorField = null; form = form.copy(amount = cleanAmount(it)) }, "0.00",
                keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = errorField == LineField.Amount, suffix = currency,
            )
        }
        Section("Categories it covers", Icons.Outlined.Category, Accents.getValue("amber")) {
            val list = categories
            if (list == null) Text("Loading…", color = MaterialTheme.colorScheme.onSurfaceVariant)
            else {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    list.forEach { c ->
                        val on = c.id in form.categoryIds
                        TintChip(Accents[c.color] ?: idTint(c.id), on, { errorField = null; form = form.copy(categoryIds = if (on) form.categoryIds - c.id else form.categoryIds + c.id) }, { Text(c.name) })
                    }
                }
                if (errorField == LineField.Categories) Text("Choose at least one.", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                Text("A category can be in one limit at a time; a parent covers its sub-categories.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(32.dp)) {
            Column(Modifier.weight(1f)) {
                Text("Carry over what is left", style = MaterialTheme.typography.bodyMedium)
                Text("Unspent money adds to next period's limit.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = form.rollover, onCheckedChange = { form = form.copy(rollover = it) }, enabled = !busy)
        }
    }
}

/** Add or edit a savings goal: one that follows a savings account's balance, or money you set aside by hand. */
@Composable
fun GoalFormScreen(api: Api, currency: String, editing: Goal?, onClose: () -> Unit, onSaved: () -> Unit) {
    val before = remember(editing) { editing?.let(::goalFormFrom) }
    var form by remember { mutableStateOf(before ?: GoalForm()) }
    var accounts by remember { mutableStateOf<List<Account>?>(null) }
    var errorField by remember { mutableStateOf<GoalField?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var pickingDate by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { accounts = (api.get<List<Account>>("accounts") as? ApiResult.Ok)?.data.orEmpty() }

    FormDialog(
        title = if (editing == null) "New goal" else "Edit goal", saveLabel = if (editing == null) "Add goal" else "Save changes",
        busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            val problem = form.problem()
            if (problem != null) {
                errorField = problem.field; error = null
                scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(problem.message) }
                return@FormDialog
            }
            val patch = if (editing != null && before != null) form.patchJson(before) else null
            if (patch != null && patch.isEmpty()) { onClose(); return@FormDialog }
            busy = true; error = null; errorField = null
            scope.launch {
                val r = if (editing != null && patch != null) api.patchJson<Goal>("goals/${editing.id}", patch.toString())
                else api.postJson<Goal>("goals", form.toJson().toString())
                when (r) {
                    is ApiResult.Ok -> onSaved()
                    is ApiResult.Failed -> { error = r.message; busy = false; launch { snackbar.showSnackbar(r.message.lines().first()) } }
                }
            }
        },
    ) {
        Section("Name", Icons.Outlined.Savings, Accents.getValue("pink")) {
            CompactField(form.name, { errorField = null; form = form.copy(name = it.take(100)) }, "For example Trip to Sri Lanka", enabled = !busy, isError = errorField == GoalField.Name)
        }
        Section("Target", Icons.Outlined.Numbers, Accents.getValue("orange")) {
            CompactField(
                form.target, { errorField = null; form = form.copy(target = cleanAmount(it)) }, "How much to save",
                keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = errorField == GoalField.Target, suffix = currency,
            )
        }
        Section("Follows an account", Icons.Outlined.AccountBalance, Accents.getValue("violet")) {
            PickerField(
                title = "Account to follow", value = form.account, placeholder = "None: I set money aside by hand", anyLabel = "None: I set money aside by hand",
                entries = accounts.orEmpty().filter { it.group !in LiabilityGroups }.map { Ref(it.id, it.name) },
                detail = { r -> accounts.orEmpty().firstOrNull { it.id == r.id }?.let { formatMoney(it.balance, it.currency) } },
                onPick = { form = form.copy(account = it) },
            )
            Text("A goal that follows an account counts that account's balance as saved.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Section("Plan", Icons.Outlined.CalendarMonth, Accents.getValue("blue")) {
            CompactField(
                form.monthly, { errorField = null; form = form.copy(monthly = cleanAmount(it)) }, "Put aside each month (optional)",
                keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = errorField == GoalField.Monthly, suffix = currency,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TintChip(Accents.getValue("blue"), form.targetDate != null, { pickingDate = true }, { Text(form.targetDate?.let { "By ${shortDate(it)}" } ?: "Pick a target date") })
                if (form.targetDate != null) TintChip(Accents.getValue("slate"), false, { form = form.copy(targetDate = null) }, { Text("No date") })
            }
        }
    }

    if (pickingDate) {
        val state = rememberDatePickerState(initialSelectedDateMillis = (form.targetDate?.let(LocalDate::parse) ?: LocalDate.now().plusMonths(3)).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { pickingDate = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { form = form.copy(targetDate = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString()) }
                    pickingDate = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickingDate = false }) { Text("Cancel") } },
        ) { DatePicker(state) }
    }
}

/** Put money aside for a goal you track by hand, or take some back out. */
@Composable
fun GoalMoneyDialog(api: Api, goal: Goal, onClose: () -> Unit, onDone: () -> Unit) {
    var amount by remember { mutableStateOf("") }
    var take by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text(goal.name) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SegmentedPills(listOf(false to "Add money", true to "Take out"), take, { take = it }, tint = { if (it) MaterialTheme.colorScheme.error else Accents.getValue("green") }, enabled = !busy)
                CompactField(
                    amount, { amount = cleanAmount(it); error = null }, "Amount",
                    keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = error != null, suffix = goal.currency,
                )
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                Text("Saved so far ${formatMoney(goal.saved, goal.currency)} of ${formatMoney(goal.targetAmount, goal.currency)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                if (!isPositive(amount)) { error = "Enter an amount above zero."; return@TextButton }
                busy = true
                scope.launch {
                    when (val r = api.postJson<kotlinx.serialization.json.JsonElement>("goals/${goal.id}/entries", goalEntryJson(amount, take).toString())) {
                        is ApiResult.Ok -> onDone()
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Saving…" else if (take) "Take out" else "Add") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}
