@file:OptIn(ExperimentalMaterial3Api::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CallSplit
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import app.maalu.data.Account
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Goal
import app.maalu.data.Ref
import app.maalu.data.SalaryRule
import app.maalu.data.cleanAmount
import app.maalu.data.createRuleJson
import app.maalu.data.ruleProblem
import app.maalu.data.ruleText
import app.maalu.data.rulesSummary
import app.maalu.data.updateRuleJson
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.PickerField
import app.maalu.ui.components.SegmentedPills
import kotlinx.coroutines.launch

/**
 * "When my salary arrives": what each account or goal gets when a salary is split. Rules only describe the split; nothing moves
 * by itself unless a rule is switched to move automatically (otherwise the split waits on Pending for approval).
 */
@Composable
fun SalaryRulesCard(api: Api, rules: List<SalaryRule>, accounts: List<Account>, goals: List<Goal>, currency: String, onChanged: () -> Unit) {
    var editing by remember { mutableStateOf<SalaryRule?>(null) }
    var adding by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<SalaryRule?>(null) }
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()

    SettingsGroup("When my salary arrives", Icons.Outlined.CallSplit) {
        Text(
            "Choose where part of each salary goes. A rule can move its share automatically; otherwise the split waits on Pending for you to approve.",
            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        rules.forEach { r ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(r.targetName, style = MaterialTheme.typography.bodyLarge)
                    Text(
                        ruleText(r.mode, r.value, currency) + if (r.auto) " · moves automatically" else "",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = { editing = r }) { Icon(Icons.Outlined.Edit, "Change the rule for ${r.targetName}") }
                IconButton(onClick = { deleting = r }) { Icon(Icons.Outlined.Delete, "Delete the rule for ${r.targetName}") }
            }
        }
        if (rules.isNotEmpty()) Text("Together: ${rulesSummary(rules, currency)}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Button(onClick = { adding = true }, shapes = ButtonDefaults.shapes(), modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.filledTonalButtonColors()) { Text("Add a rule") }
    }

    if (adding || editing != null) RuleDialog(
        api, rule = editing, rules = rules, accounts = accounts, goals = goals,
        onClose = { adding = false; editing = null },
        onSaved = { adding = false; val was = editing; editing = null; onChanged(); scope.launch { snackbar?.showSnackbar(if (was == null) "Rule added." else "Rule saved.") } },
    )
    deleting?.let { r ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Delete the rule for ${r.targetName}?") },
            text = { Text("Salaries stop sending money there. What was already moved stays.") },
            confirmButton = {
                TextButton(onClick = {
                    deleting = null
                    scope.launch {
                        when (val res = api.delete("salary-rules/${r.id}")) {
                            is ApiResult.Ok -> { onChanged(); snackbar?.showSnackbar("Rule deleted.") }
                            is ApiResult.Failed -> snackbar?.showSnackbar(res.message.lines().first())
                        }
                    }
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Keep it") } },
        )
    }
}

/** Add a rule, or change how much one sends (the target of a rule is fixed: delete it to point somewhere else). */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun RuleDialog(api: Api, rule: SalaryRule?, rules: List<SalaryRule>, accounts: List<Account>, goals: List<Goal>, onClose: () -> Unit, onSaved: () -> Unit) {
    var targetType by remember { mutableStateOf("account") }
    var targetId by remember { mutableStateOf<String?>(null) }
    var mode by remember { mutableStateOf(rule?.mode ?: "percent") }
    var value by remember { mutableStateOf(rule?.value?.let { app.maalu.data.tidyNumber(it) } ?: "") }
    var auto by remember { mutableStateOf(rule?.auto ?: false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val taken = rules.map { it.targetId }.toSet()
    val choices = (if (targetType == "account") accounts.map { Ref(it.id, it.name) } else goals.map { Ref(it.id, it.name) }).filter { it.id !in taken }

    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text(if (rule == null) "Add a rule" else "Change the rule for ${rule.targetName}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (rule == null) {
                    SegmentedPills(listOf("account" to "An account", "goal" to "A goal"), targetType, { targetType = it; targetId = null; error = null })
                    PickerField(
                        title = if (targetType == "account") "Account" else "Goal", value = choices.firstOrNull { it.id == targetId },
                        placeholder = if (choices.isEmpty()) "Nothing left to choose" else "Choose one", anyLabel = null, entries = choices,
                        onPick = { targetId = it?.id; error = null },
                    )
                    Text(
                        if (targetType == "account") "The money is moved there from the account the salary arrives in."
                        else "A goal that follows an account moves the money there; one you track by hand gets an amount set aside.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                SegmentedPills(listOf("percent" to "A share of the salary", "fixed" to "A fixed amount"), mode, { mode = it; error = null })
                CompactField(
                    value, { value = cleanAmount(it); error = null }, if (mode == "percent") "Percent of the salary" else "Amount, in the salary's currency",
                    keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal), enabled = !busy,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Move it automatically", style = MaterialTheme.typography.bodyLarge)
                        Text("When a salary arrives, without asking.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    androidx.compose.material3.Switch(checked = auto, onCheckedChange = { auto = it })
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                error = ruleProblem(mode, value, rule != null || targetId != null)
                if (error != null) return@TextButton
                busy = true
                scope.launch {
                    val r = if (rule == null) api.postJson<SalaryRule>("salary-rules", createRuleJson(targetType, targetId!!, mode, value, auto).toString())
                    else api.patchJson<SalaryRule>("salary-rules/${rule.id}", updateRuleJson(mode, value, auto).toString())
                    when (r) {
                        is ApiResult.Ok -> onSaved()
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Saving…" else "Save") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}
