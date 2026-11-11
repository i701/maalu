@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Budget
import app.maalu.data.BudgetLine
import app.maalu.data.FixedLine
import app.maalu.data.movesFor
import app.maalu.data.LineMove
import androidx.compose.material3.OutlinedButton
import app.maalu.data.runsText
import app.maalu.data.repeatFormFrom
import app.maalu.data.lineFormFrom
import app.maalu.data.fixedInPeriod
import app.maalu.data.fixedFormFrom
import app.maalu.data.LineForm
import app.maalu.data.Goal
import app.maalu.data.allowed
import app.maalu.data.budgetByKind
import app.maalu.data.formatMoney
import app.maalu.data.goalNeedText
import app.maalu.data.leftText
import app.maalu.data.shortDate
import app.maalu.data.statusLabel
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.MorphTile
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.ChartColors
import app.maalu.ui.theme.kindTint
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import java.time.LocalDate

/** What the limit form is opened with: nothing (a new limit), an existing limit to edit, or a finished one to repeat. */
private class LimitFormRequest(val start: LineForm?, val editingId: String?)

private class BudgetData(val budget: Budget, val goals: List<Goal>)

private sealed interface BudgetLoad {
    data object Loading : BudgetLoad
    data class Loaded(val data: BudgetData) : BudgetLoad
    data class Failed(val message: String) : BudgetLoad
}

@Composable
private fun statusColor(status: String): Color = when (status) {
    "over" -> MaterialTheme.colorScheme.error
    "warning" -> Color(0xFFEAB308)
    else -> ChartColors.IncomeLight
}

/**
 * The budget for the chosen period: everything spent against every limit, then the monthly limits, the limits for
 * set dates (read-only here) and the savings goals. Limits and goals are added, edited and removed from here.
 */
@Composable
fun BudgetScreen(api: Api, on: String) {
    var attempt by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var line by remember { mutableStateOf<BudgetLine?>(null) }
    var fixed by remember { mutableStateOf<FixedLine?>(null) }
    var goal by remember { mutableStateOf<Goal?>(null) }
    // the limit form: new (nothing to start from), an edit, or a finished limit for set dates being repeated
    var limitForm by remember { mutableStateOf<LimitFormRequest?>(null) }
    var editingGoal by remember { mutableStateOf<Goal?>(null) }
    var addingGoal by remember { mutableStateOf(false) }
    var money by remember { mutableStateOf<Goal?>(null) }
    var deleteLine by remember { mutableStateOf<BudgetLine?>(null) }
    var deleteFixed by remember { mutableStateOf<FixedLine?>(null) }
    var moving by remember { mutableStateOf<BudgetLine?>(null) }
    var history by remember { mutableStateOf<BudgetLine?>(null) }
    var deleteGoal by remember { mutableStateOf<Goal?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()

    val state by produceState<BudgetLoad>(BudgetLoad.Loading, on, attempt) {
        if (!refreshing) value = BudgetLoad.Loading
        value = coroutineScope {
            val b = async { api.get<Budget>("budget", mapOf("on" to on)) }
            val g = async { api.get<List<Goal>>("goals", mapOf("on" to on)) }
            when (val r = b.await()) {
                is ApiResult.Failed -> BudgetLoad.Failed(r.message)
                is ApiResult.Ok -> BudgetLoad.Loaded(BudgetData(r.data, (g.await() as? ApiResult.Ok)?.data.orEmpty()))
            }
        }
        refreshing = false
    }

    when (val s = state) {
        BudgetLoad.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        is BudgetLoad.Failed -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(s.message, color = MaterialTheme.colorScheme.error)
            Button(onClick = { attempt++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
        }
        is BudgetLoad.Loaded -> {
            val b = s.data.budget
            PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; attempt++ }, modifier = Modifier.fillMaxSize()) {
                LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 32.dp)) {
                    if (b.lines.isNotEmpty()) item { SummaryCard(b) }
                    item { SectionHeader("Monthly limits", "Add limit") { limitForm = LimitFormRequest(null, null) } }
                    if (b.lines.isEmpty()) item { Text("No limits yet. A limit is an amount you allow yourself to spend on some categories each month.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp)) }
                    items(b.lines.size, key = { "l-" + b.lines[it].id }) { i ->
                        val l = b.lines[i]
                        MorphTile({ line = l }, first = i == 0, last = i == b.lines.lastIndex, modifier = Modifier.padding(bottom = 2.dp)) { LineRow(l, b.currency, movesFor(b.moves, l.id, b.currency)) }
                    }
                    // limits for set dates whose dates touch this period (a November limit is not listed under December)
                    val running = fixedInPeriod(b)
                    if (running.isNotEmpty()) {
                        item { SectionHeader("For set dates", null) {} }
                        items(running.size, key = { "f-" + running[it].id }) { i ->
                            val f = running[i]
                            MorphTile({ fixed = f }, first = i == 0, last = i == running.lastIndex, modifier = Modifier.padding(bottom = 2.dp)) { FixedRow(f, b.currency) }
                        }
                    }
                    item { SectionHeader("Savings goals", "Add goal") { addingGoal = true } }
                    if (s.data.goals.isEmpty()) item { Text("Save toward something, like a trip, and see what each month needs.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp)) }
                    items(s.data.goals.size, key = { "g-" + s.data.goals[it].id }) { i ->
                        val g = s.data.goals[i]
                        MorphTile({ goal = g }, first = i == 0, last = i == s.data.goals.lastIndex, modifier = Modifier.padding(bottom = 2.dp)) { GoalRow(g) }
                    }
                }
            }
        }
    }

    val b = (state as? BudgetLoad.Loaded)?.data?.budget
    val budgetNow = b
    val currency = b?.currency ?: ""
    line?.let { l ->
        LineSheet(
            l, currency, movesFor(budgetNow?.moves.orEmpty(), l.id, currency),
            onMove = { moving = l; line = null }, onHistory = { history = l; line = null },
            onUndo = { id -> line = null; scope.launch { when (val r = api.post("budget/moves/$id/undo")) { is ApiResult.Ok -> { attempt++; snackbar?.showSnackbar("Move undone") }; is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first()) } } },
            onEdit = { limitForm = LimitFormRequest(lineFormFrom(l), l.id); line = null }, onDelete = { deleteLine = l; line = null }, onClose = { line = null })
    }
    fixed?.let { f ->
        FixedSheet(
            f, currency,
            onEdit = { limitForm = LimitFormRequest(fixedFormFrom(f), f.id); fixed = null },
            onRepeat = { limitForm = LimitFormRequest(repeatFormFrom(f), null); fixed = null },
            onDelete = { deleteFixed = f; fixed = null },
            onClose = { fixed = null },
        )
    }
    goal?.let { g ->
        GoalSheet(g, onMoney = { money = g; goal = null }, onEdit = { editingGoal = g; goal = null }, onDelete = { deleteGoal = g; goal = null }, onClose = { goal = null })
    }
    moving?.let { l ->
        if (budgetNow != null) MoveMoneyDialog(api, budgetNow, l, onClose = { moving = null }) { msg -> moving = null; attempt++; scope.launch { snackbar?.showSnackbar(msg) } }
    }
    history?.let { l -> MoveHistorySheet(api, l, currency, onClose = { history = null }) }
    limitForm?.let { lf ->
        if (budgetNow != null) LineFormScreen(api, currency, budgetNow, lf.start, lf.editingId, onClose = { limitForm = null }) {
            limitForm = null; attempt++
            scope.launch { snackbar?.showSnackbar(if (lf.editingId != null) "Changes saved" else "Limit added") }
        }
    }
    if (addingGoal) GoalFormScreen(api, currency, null, { addingGoal = false }) { addingGoal = false; attempt++; scope.launch { snackbar?.showSnackbar("Goal added") } }
    editingGoal?.let { g -> GoalFormScreen(api, currency, g, { editingGoal = null }) { editingGoal = null; attempt++; scope.launch { snackbar?.showSnackbar("Changes saved") } } }
    money?.let { g -> GoalMoneyDialog(api, g, { money = null }) { money = null; attempt++; scope.launch { snackbar?.showSnackbar("Saved") } } }
    deleteLine?.let { l ->
        ConfirmDelete("Delete the ${l.name} limit?", "Your transactions are not affected.", { deleteLine = null }) {
            deleteLine = null
            scope.launch {
                when (val r = api.delete("budget/lines/${l.id}")) {
                    is ApiResult.Ok -> { attempt++; snackbar?.showSnackbar("Limit deleted") }
                    is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                }
            }
        }
    }
    deleteFixed?.let { f ->
        ConfirmDelete("Delete the ${f.name} limit?", "Your transactions are not affected.", { deleteFixed = null }) {
            deleteFixed = null
            scope.launch {
                when (val r = api.delete("budget/lines/${f.id}")) {
                    is ApiResult.Ok -> { attempt++; snackbar?.showSnackbar("Limit deleted") }
                    is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                }
            }
        }
    }
    deleteGoal?.let { g ->
        ConfirmDelete("Delete the ${g.name} goal?", "Your accounts and transactions are not affected.", { deleteGoal = null }) {
            deleteGoal = null
            scope.launch {
                when (val r = api.delete("goals/${g.id}")) {
                    is ApiResult.Ok -> { attempt++; snackbar?.showSnackbar("Goal deleted") }
                    is ApiResult.Failed -> snackbar?.showSnackbar(r.message.lines().first())
                }
            }
        }
    }
}

@Composable
private fun ConfirmDelete(title: String, text: String, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss, title = { Text(title) }, text = { Text(text) },
        confirmButton = { TextButton(onClick = onConfirm) { Text("Delete", color = MaterialTheme.colorScheme.error) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun SectionHeader(title: String, action: String?, onAction: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f).padding(start = 4.dp))
        if (action != null) TextButton(onClick = onAction) { Icon(Icons.Outlined.Add, null, Modifier.size(18.dp)); Text(action, Modifier.padding(start = 4.dp)) }
    }
}

@Composable
private fun Bar(percent: Int, color: Color, height: Int = 8) {
    Box(Modifier.fillMaxWidth().height(height.dp).clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.surfaceContainerHighest)) {
        Box(Modifier.fillMaxWidth((percent / 100f).coerceIn(0.02f, 1f)).height(height.dp).clip(RoundedCornerShape(50)).background(color))
    }
}

/** Everything spent against every limit, with the needs and wants split when limits have kinds. */
@Composable
private fun SummaryCard(b: Budget) {
    val t = b.totals
    val color = statusColor(t.status)
    val over = t.status == "over"
    Surface(shape = MaterialTheme.shapes.extraLarge, color = color.copy(alpha = 0.14f)) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.Bottom) {
                Column(Modifier.weight(1f)) {
                    Text("Spent this period", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(verticalAlignment = Alignment.Bottom) {
                        MoneyText(t.activity, b.currency, style = MaterialTheme.typography.headlineSmall)
                        Text("  of ", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        MoneyText(t.amount, b.currency, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(if (over) "Over by" else "Left", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    MoneyText(app.maalu.data.unsigned(t.available), b.currency, style = MaterialTheme.typography.titleMedium, color = if (over) color else MaterialTheme.colorScheme.onSurface)
                }
            }
            Bar(t.percent, color, 10)
            Text(
                "${statusLabel(t.status)} · ${t.percent}%" + if (b.attention > 0) " · ${b.attention} ${if (b.attention == 1) "limit needs" else "limits need"} attention" else "",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            val kinds = budgetByKind(b.lines)
            if (kinds.isNotEmpty()) Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(top = 4.dp)) {
                kinds.forEach { k ->
                    Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(Modifier.size(10.dp).clip(CircleShape).background(kindTint(k.kind ?: "other")))
                        Column {
                            Text(when (k.kind) { "need" -> "Needs"; "want" -> "Wants"; else -> "Other" }, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Row { MoneyText(k.spent.toPlainString(), b.currency, style = MaterialTheme.typography.labelMedium); Text(" / ", style = MaterialTheme.typography.labelMedium); MoneyText(k.limit.toPlainString(), b.currency, style = MaterialTheme.typography.labelMedium) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LineRow(l: BudgetLine, currency: String, moves: List<LineMove> = emptyList()) {
    val color = statusColor(l.status)
    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(l.name, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(statusLabel(l.status), style = MaterialTheme.typography.labelSmall, color = color, fontWeight = FontWeight.SemiBold)
        }
        runsText(l)?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        Bar(l.percent, color)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Row(Modifier.weight(1f)) {
                MoneyText(l.activity, currency, style = MaterialTheme.typography.bodySmall)
                Text(" of ", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                MoneyText(l.allowed().toPlainString(), currency, style = MaterialTheme.typography.bodySmall)
            }
            Text(leftText(l.available, currency), style = MaterialTheme.typography.bodySmall, color = if (l.status == "over") color else MaterialTheme.colorScheme.onSurfaceVariant)
        }
        // money moved in or out this period
        moves.forEach { m -> Text(m.text + " this period", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

@Composable
private fun FixedRow(f: FixedLine, currency: String) {
    val color = statusColor(f.status)
    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(f.name, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(fixedWindow(f), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Bar(f.percent, color)
        Row {
            MoneyText(f.activity, currency, style = MaterialTheme.typography.bodySmall)
            Text(" of ", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            MoneyText(f.amount, currency, style = MaterialTheme.typography.bodySmall)
        }
    }
}

/** "1 Nov – 30 Nov · 12 days left", or when it starts or ended. */
private fun fixedWindow(f: FixedLine): String {
    val range = "${shortDate(f.startDate)} – ${shortDate(f.endDate)}"
    return when (f.state) {
        "upcoming" -> "$range · starts soon"
        "ended" -> "$range · ended"
        else -> range + (f.daysLeft?.let { " · $it ${if (it == 1) "day" else "days"} left" } ?: "")
    }
}

@Composable
private fun GoalRow(g: Goal) {
    val tint = Accents.getValue(if (g.reached) "green" else "pink")
    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(g.name + if (g.reached) "  ✓" else "", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${g.percent}%", style = MaterialTheme.typography.labelMedium, color = tint, fontWeight = FontWeight.SemiBold)
        }
        Bar(g.percent, tint)
        Row {
            MoneyText(g.saved, g.currency, style = MaterialTheme.typography.bodySmall)
            Text(" of ", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            MoneyText(g.targetAmount, g.currency, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.weight(1f))
            Text(if (g.reached) "Done" else "${formatMoney(g.remaining, g.currency)} to go", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        goalNeedText(g)?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

@Composable
private fun Fact(label: String, value: String?) {
    if (value.isNullOrBlank()) return
    Row(Modifier.fillMaxWidth()) {
        Text(label, Modifier.weight(0.35f), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, Modifier.weight(0.65f), style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun SheetActions(onEdit: (() -> Unit)?, onDelete: (() -> Unit)?, extra: (@Composable () -> Unit)? = null) {
    Column(Modifier.fillMaxWidth().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        extra?.invoke()
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (onEdit != null) Button(onClick = onEdit, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f), colors = ButtonDefaults.filledTonalButtonColors()) { Icon(Icons.Outlined.Edit, null, Modifier.padding(end = 6.dp)); Text("Edit") }
            if (onDelete != null) Button(
                onClick = onDelete, shapes = ButtonDefaults.shapes(), modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer),
            ) { Icon(Icons.Outlined.Delete, null, Modifier.padding(end = 6.dp)); Text("Delete") }
        }
    }
}

@Composable
private fun LineSheet(l: BudgetLine, currency: String, moves: List<LineMove>, onMove: () -> Unit, onHistory: () -> Unit, onUndo: (String) -> Unit, onEdit: () -> Unit, onDelete: () -> Unit, onClose: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(l.name, style = MaterialTheme.typography.titleMedium)
            LineRow(l, currency)
            Fact("Limit", formatMoney(l.amount, currency))
            if (l.carried != "0" && l.carried.toBigDecimalOrNull()?.signum() != 0) Fact("Carried in", formatMoney(l.carried, currency))
            if (l.movedIn.toBigDecimalOrNull()?.signum() != 0) Fact("Moved in", formatMoney(l.movedIn, currency))
            if (l.movedOut.toBigDecimalOrNull()?.signum() != 0) Fact("Moved out", formatMoney(l.movedOut, currency))
            Fact("Categories", l.categories.joinToString(", ") { it.name })
            Fact("Runs", runsText(l)?.removePrefix("Runs "))
            Fact("Carries over", if (l.rollover) "Yes" else null)
            Fact("Kind", when (l.kind) { "need" -> "Need"; "want" -> "Want"; else -> null })
            if (moves.isNotEmpty()) {
                Text("Moved this period", style = MaterialTheme.typography.titleSmall)
                moves.forEach { m ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(m.text, style = MaterialTheme.typography.bodyMedium)
                            m.note?.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        }
                        TextButton(onClick = { onUndo(m.id) }) { Text("Undo") }
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onMove, modifier = Modifier.weight(1f)) { Text("Move money here") }
                OutlinedButton(onClick = onHistory, modifier = Modifier.weight(1f)) { Text("History") }
            }
            SheetActions(onEdit, onDelete)
        }
    }
}

@Composable
private fun FixedSheet(f: FixedLine, currency: String, onEdit: () -> Unit, onRepeat: () -> Unit, onDelete: () -> Unit, onClose: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(f.name, style = MaterialTheme.typography.titleMedium)
            FixedRow(f, currency)
            Fact("Left", leftText(f.available, currency))
            Fact("Categories", f.categories.joinToString(", ") { it.name })
            Text("A limit for set dates is one total for the whole stretch.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            SheetActions(onEdit, onDelete) {
                // for the stretch that follows: same name, categories and amount, starting the day after and as long
                OutlinedButton(onClick = onRepeat, modifier = Modifier.fillMaxWidth()) { Text("Repeat for the next stretch") }
            }
        }
    }
}

@Composable
private fun GoalSheet(g: Goal, onMoney: () -> Unit, onEdit: () -> Unit, onDelete: () -> Unit, onClose: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(g.name, style = MaterialTheme.typography.titleMedium)
            GoalRow(g)
            Fact("Follows", g.account?.name)
            Fact("Plan", g.monthlyAmount?.let { "${formatMoney(it, g.currency)} a month" })
            Fact("This period", if (g.periodStatus != null && g.periodPlanned != null) "${formatMoney(g.periodContributed ?: "0", g.currency)} of ${formatMoney(g.periodPlanned, g.currency)} · ${if (g.periodStatus == "funded") "funded" else "still to set aside"}" else null)
            Fact("Target date", g.targetDate?.let(::shortDate))
            SheetActions(onEdit, onDelete) {
                if (g.account == null) Button(onClick = onMoney, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth()) { Text("Add or take out money") }
                else Text("This goal follows ${g.account.name}: its balance is what you have saved.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
