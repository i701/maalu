@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class)

package app.maalu.ui.screens

import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Redo
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.runtime.saveable.rememberSaveable
import app.maalu.data.categorySummary
import app.maalu.ui.components.FormSwitchRow
import app.maalu.ui.components.FormRowStyle
import app.maalu.ui.components.FormRow
import app.maalu.ui.components.DisclosureRow
import app.maalu.ui.components.Disclosure
import app.maalu.ui.components.BigAmountField
import androidx.compose.material3.ButtonDefaults
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Category
import app.maalu.ui.components.AlertDialog
import androidx.compose.material3.DatePicker
import app.maalu.ui.components.DatePickerDialog
import app.maalu.ui.components.glowDatePickerColors
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
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
import app.maalu.data.patchJson
import app.maalu.data.problem
import app.maalu.data.shortDate
import app.maalu.data.toJson
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.SegmentedPills
import app.maalu.ui.components.ChoiceChip
import app.maalu.data.takenCategories
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

/**
 * Add or edit a limit: a name, an amount, the categories it covers, and whether unspent money carries over. It can be for set dates (one total for a
 * stretch, or a monthly limit that only runs between two dates). [start] is the form it starts from (an edit, or a finished limit being repeated);
 * [editingId] is set when an existing limit is being changed.
 */
@Composable
fun LineFormScreen(api: Api, currency: String, budget: Budget, start: LineForm?, editingId: String?, onClose: () -> Unit, onSaved: () -> Unit) {
    val before = remember(start, editingId) { if (editingId != null) start else null }
    var form by remember { mutableStateOf(start ?: LineForm()) }
    var categories by remember { mutableStateOf<List<CategoryItem>?>(null) }
    var errorField by remember { mutableStateOf<LineField?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var pickingDate by remember { mutableStateOf<Int?>(null) }   // 1 = first day, 2 = last day
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { categories = (api.get<List<CategoryItem>>("categories") as? ApiResult.Ok)?.data.orEmpty() }
    val taken = takenCategories(budget, form, editingId)
    val title = when { editingId != null -> "Edit limit"; start != null -> "Repeat limit"; else -> "New limit" }

    FormDialog(
        title = title, saveLabel = if (editingId != null) "Save changes" else "Add limit", floating = true,
        busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            val problem = form.problem()
            if (problem != null) {
                errorField = problem.field; error = null
                scope.launch { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(problem.message) }
                return@FormDialog
            }
            val patch = if (editingId != null && before != null) form.patchJson(before) else null
            if (patch != null && patch.isEmpty()) { onClose(); return@FormDialog }
            busy = true; error = null; errorField = null
            scope.launch {
                val r = if (editingId != null && patch != null) api.patchJson<Budget>("budget/lines/$editingId", patch.toString())
                else api.postJson<Budget>("budget/lines", form.toJson().toString())
                when (r) {
                    is ApiResult.Ok -> onSaved()
                    is ApiResult.Failed -> { error = r.message; busy = false; launch { snackbar.showSnackbar(r.message.lines().first()) } }
                }
            }
        },
    ) {
        val oneTotal = form.dated && !form.repeat
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            BigAmountField(form.amount, { errorField = null; form = form.copy(amount = cleanAmount(it)) }, currency, enabled = !busy, isError = errorField == LineField.Amount)
            Caption(if (oneTotal) "One total for these dates" else "Limit for each period")
        }
        CompactField(form.name, { errorField = null; form = form.copy(name = it.take(100)) }, "Name", enabled = !busy, isError = errorField == LineField.Name, placeholder = "For example Food")

        // closed, it names what is chosen; it opens by itself when nothing is
        var choosing by rememberSaveable { mutableStateOf(false) }
        LaunchedEffect(errorField) { if (errorField == LineField.Categories) choosing = true }
        val list = categories
        Column {
            DisclosureRow(
                "Categories", if (list == null) "Loading…" else categorySummary(form.categoryIds, list).ifEmpty { "Choose at least one" }, choosing,
                icon = Icons.Outlined.Category, isError = errorField == LineField.Categories,
            ) { choosing = !choosing }
            Disclosure(choosing) {
                Column(Modifier.padding(top = 4.dp)) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        // the ones free to pick come first; those in another limit wait at the end
                        list.orEmpty().sortedBy { it.id in taken && it.id !in form.categoryIds }.forEach { c ->
                            val on = c.id in form.categoryIds
                            val by = taken[c.id]
                            ChoiceChip(
                                on, { errorField = null; form = form.copy(categoryIds = if (on) form.categoryIds - c.id else form.categoryIds + c.id) },
                                { Text(if (by != null && !on) "${c.name} · in $by" else c.name) }, enabled = by == null || on,
                            )
                        }
                    }
                    Caption(if (oneTotal) "A category can be in one limit for any stretch of dates. A parent covers its sub-categories." else "A category can be in one limit at a time. A parent covers its sub-categories.")
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            // one total for a stretch has nothing to carry into
            FormSwitchRow(FormRowStyle("Certain dates only", Icons.Outlined.CalendarMonth, first = true, last = oneTotal), "A trip or a few months", form.dated, !busy) {
                form = form.copy(dated = it); errorField = null
            }
            if (!oneTotal) FormSwitchRow(FormRowStyle("Carry over", Icons.Outlined.Redo, last = true), "What is left adds to the next period", form.rollover, !busy) { form = form.copy(rollover = it) }
        }
        if (form.dated) Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SegmentedPills(listOf(false to "One total", true to "Every month"), form.repeat, { form = form.copy(repeat = it) }, enabled = !busy)
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                val bad = errorField == LineField.Dates
                FormRow(FormRowStyle("First day", Icons.Outlined.Event, first = true), form.start.takeIf { it.isNotBlank() }?.let(::shortDate), "Choose", onClick = { if (!busy) pickingDate = 1 }, isError = bad)
                FormRow(FormRowStyle("Last day", Icons.Outlined.Event, last = true), form.end.takeIf { it.isNotBlank() }?.let(::shortDate), "Choose", onClick = { if (!busy) pickingDate = 2 }, isError = bad)
            }
            if (form.repeat) Caption("Whole periods count, so the dates snap to them.")
        }
    }

    pickingDate?.let { which ->
        val current = (if (which == 1) form.start else form.end).takeIf { it.isNotBlank() } ?: form.start.takeIf { it.isNotBlank() } ?: "${LocalDate.now()}"
        val state = rememberDatePickerState(initialSelectedDateMillis = LocalDate.parse(current).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { pickingDate = null },
            confirmButton = {
                TextButton(shapes = ButtonDefaults.shapes(), onClick = {
                    state.selectedDateMillis?.let {
                        val d = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString()
                        // choosing a first day after the last one moves the last day with it
                        form = if (which == 1) form.copy(start = d, end = if (form.end.isNotBlank() && form.end < d) d else form.end) else form.copy(end = d)
                        errorField = null
                    }
                    pickingDate = null
                }) { Text("OK") }
            },
            dismissButton = { TextButton(shapes = ButtonDefaults.shapes(), onClick = { pickingDate = null }) { Text("Cancel") } },
        ) { DatePicker(state, colors = glowDatePickerColors()) }
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
        title = if (editing == null) "New goal" else "Edit goal", saveLabel = if (editing == null) "Add goal" else "Save changes", floating = true,
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
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            BigAmountField(form.target, { errorField = null; form = form.copy(target = cleanAmount(it)) }, currency, enabled = !busy, isError = errorField == GoalField.Target)
            Caption("How much to save")
        }
        CompactField(form.name, { errorField = null; form = form.copy(name = it.take(100)) }, "Name", enabled = !busy, isError = errorField == GoalField.Name, placeholder = "For example Trip to Sri Lanka")
        PickerField(
            title = "Account to follow", value = form.account, placeholder = "None: set aside by hand", anyLabel = "None: I set money aside by hand",
            entries = accounts.orEmpty().filter { it.group !in LiabilityGroups }.map { Ref(it.id, it.name) },
            detail = { r -> accounts.orEmpty().firstOrNull { it.id == r.id }?.let { formatMoney(it.balance, it.currency) } },
            onPick = { form = form.copy(account = it) },
            row = FormRowStyle("Follows an account", Icons.Outlined.AccountBalance, first = true, last = true),
        )

        // open from the start when something in it is already set (editing)
        val planSet = form.monthly.isNotBlank() || form.targetDate != null
        var planning by rememberSaveable { mutableStateOf(planSet) }
        LaunchedEffect(planSet, errorField) { if (planSet || errorField == GoalField.Monthly) planning = true }
        Column {
            DisclosureRow(
                "Plan", listOfNotNull(form.monthly.takeIf { it.isNotBlank() }?.let { "$currency $it a month" }, form.targetDate?.let { "by ${shortDate(it)}" })
                    .joinToString(" · ").ifEmpty { "Monthly amount and date, optional" }, planning,
            ) { planning = !planning }
            Disclosure(planning) {
                Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    CompactField(
                        form.monthly, { errorField = null; form = form.copy(monthly = cleanAmount(it)) }, "Put aside each month",
                        keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = errorField == GoalField.Monthly, suffix = currency,
                    )
                    FormRow(
                        FormRowStyle("Target date", Icons.Outlined.Event, first = true, last = true), form.targetDate?.let(::shortDate), "Optional", onClick = { if (!busy) pickingDate = true },
                        trailing = if (form.targetDate == null) null else ({ IconButton(onClick = { form = form.copy(targetDate = null) }, enabled = !busy) { Icon(Icons.Outlined.Close, "Remove the date") } }),
                    )
                }
            }
        }
    }

    if (pickingDate) {
        val state = rememberDatePickerState(initialSelectedDateMillis = (form.targetDate?.let(LocalDate::parse) ?: LocalDate.now().plusMonths(3)).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { pickingDate = false },
            confirmButton = {
                TextButton(shapes = ButtonDefaults.shapes(), onClick = {
                    state.selectedDateMillis?.let { form = form.copy(targetDate = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString()) }
                    pickingDate = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(shapes = ButtonDefaults.shapes(), onClick = { pickingDate = false }) { Text("Cancel") } },
        ) { DatePicker(state, colors = glowDatePickerColors()) }
    }
}

/** A line of quiet help under a field. */
@Composable
private fun Caption(text: String) = Text(
    text, Modifier.padding(top = 4.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
)

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
                SegmentedPills(listOf(false to "Add money", true to "Take out"), take, { take = it }, enabled = !busy)
                CompactField(
                    amount, { amount = cleanAmount(it); error = null }, "Amount",
                    keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy, isError = error != null, suffix = goal.currency,
                )
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                Text("Saved so far ${formatMoney(goal.saved, goal.currency)} of ${formatMoney(goal.targetAmount, goal.currency)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        confirmButton = {
            TextButton(shapes = ButtonDefaults.shapes(), enabled = !busy, onClick = {
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
        dismissButton = { TextButton(shapes = ButtonDefaults.shapes(), onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}
