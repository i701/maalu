@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.TaskAlt
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.SplitResult
import app.maalu.data.SplitTask
import app.maalu.data.approveLines
import app.maalu.data.dayLabel
import app.maalu.data.formatMoney
import app.maalu.data.madeTotal
import app.maalu.data.pendingLines
import app.maalu.data.ruleText
import app.maalu.data.splitRequest
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.Accents
import kotlinx.coroutines.launch

/**
 * Pending: salaries that arrived and are waiting for their split to be approved. Each card says what arrived, what an automatic
 * rule already moved, what waits, and offers Approve (makes every line that can be made, as proposed), Review and edit (the same
 * dialog as splitting by hand) and Dismiss (the salary can still be split by hand later). [onChanged] tells the badge to count again.
 */
@Composable
fun PendingScreen(api: Api, onChanged: () -> Unit) {
    var tasks by remember { mutableStateOf<List<SplitTask>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var busyId by remember { mutableStateOf<String?>(null) }
    var reviewing by remember { mutableStateOf<String?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    fun say(text: String) { scope.launch { snackbar?.showSnackbar(text) } }

    LaunchedEffect(reload) {
        when (val r = api.get<List<SplitTask>>("salary-split-tasks")) {
            is ApiResult.Ok -> { tasks = r.data; error = null }
            is ApiResult.Failed -> error = r.message
        }
        refreshing = false
    }
    fun changed() { reload++; onChanged() }

    val list = tasks
    when {
        list == null && error != null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(error ?: "", color = MaterialTheme.colorScheme.error)
            Button(onClick = { reload++ }, shapes = ButtonDefaults.shapes()) { Text("Try again") }
        }
        list == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        else -> PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
            if (list.isEmpty()) Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Outlined.TaskAlt, null, Modifier.size(48.dp), tint = Accents.getValue("green"))
                Text("Nothing is waiting", style = MaterialTheme.typography.titleMedium)
                Text(
                    "When a salary arrives and you have split rules, its split waits here for you to approve.",
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            } else LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(list, key = { it.id }) { task ->
                    TaskCard(
                        task, busy = busyId == task.id,
                        onApprove = {
                            busyId = task.id
                            scope.launch {
                                when (val r = api.postJson<SplitResult>("transactions/${task.plan.salaryId}/salary-split", splitRequest(approveLines(task.plan)).toString())) {
                                    is ApiResult.Ok -> { say(splitMessage(r.data)); changed() }
                                    is ApiResult.Failed -> say(r.message.lines().first())
                                }
                                busyId = null
                            }
                        },
                        onReview = { reviewing = task.plan.salaryId },
                        onDismiss = {
                            busyId = task.id
                            scope.launch {
                                when (val r = api.post("salary-split-tasks/${task.id}/dismiss")) {
                                    is ApiResult.Ok -> { say("Dismissed. You can still split it from the salary."); changed() }
                                    is ApiResult.Failed -> say(r.message.lines().first())
                                }
                                busyId = null
                            }
                        },
                    )
                }
            }
        }
    }

    reviewing?.let { id ->
        SalarySplitDialog(api, id, onClose = { reviewing = null; changed() }, onDone = { msg -> reviewing = null; say(msg); changed() })
    }
}

@Composable
private fun TaskCard(task: SplitTask, busy: Boolean, onApprove: () -> Unit, onReview: () -> Unit, onDismiss: () -> Unit) {
    val plan = task.plan
    val ready = pendingLines(plan)
    val blocked = plan.items.filter { !it.ok }
    val sent = madeTotal(plan)
    Surface(shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f)) {
                    Text(plan.title.ifBlank { "Salary" }, style = MaterialTheme.typography.titleMedium)
                    Text((plan.salaryDate?.let { dayLabel(it) + " · " } ?: "") + plan.accountName, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                MoneyText(plan.amount, plan.currency, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold))
            }
            if (plan.made.isNotEmpty()) Section("Already moved") {
                plan.made.forEach { m ->
                    Row { Text("${m.targetName}: ", style = MaterialTheme.typography.bodyMedium); MoneyText(m.amount, plan.currency, style = MaterialTheme.typography.bodyMedium); Text(if (m.kind == "transfer") " moved" else " set aside", style = MaterialTheme.typography.bodyMedium) }
                }
            }
            Section("Waiting for you") {
                if (ready.isEmpty()) Text("Nothing can be made right now.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                ready.forEach { i ->
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                        Column(Modifier.weight(1f)) {
                            Text(i.targetName, style = MaterialTheme.typography.bodyMedium)
                            Text(ruleText(i.mode, i.value, plan.currency), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        MoneyText(i.amount, plan.currency, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                blocked.forEach { i -> Text("${i.targetName}: ${i.reason ?: "can't be made"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
            }
            if (plan.over) TintChip(Accents.getValue("orange"), selected = true, onClick = {}, label = { Text("Adds up to more than the salary") })
            else Text(
                "Moving ${formatMoney(plan.total, plan.currency)}${if (sent != "0.00") " more" else ""}. ${formatMoney(plan.left, plan.currency)} stays in ${plan.accountName}.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Button(onClick = onApprove, enabled = !busy && ready.isNotEmpty() && !plan.over, shapes = ButtonDefaults.shapes()) { Text(if (busy) "Working…" else "Approve") }
                OutlinedButton(onClick = onReview, enabled = !busy, shapes = ButtonDefaults.shapes()) { Text("Review and edit") }
                TextButton(onClick = onDismiss, enabled = !busy) { Text("Dismiss") }
            }
        }
    }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        content()
    }
}
