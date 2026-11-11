package app.maalu.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Slider
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.ui.Modifier
import kotlin.math.roundToInt
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.input.KeyboardType
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.Budget
import app.maalu.data.MAX_START_DAY
import app.maalu.data.settingsJson
import app.maalu.data.startDayProblem
import app.maalu.ui.components.CompactField
import app.maalu.ui.components.FormDialog
import app.maalu.ui.components.Section
import app.maalu.ui.theme.Accents
import kotlinx.coroutines.launch

/** The budget's two settings: the day each budget month starts on, and how full a limit gets before it warns. */
@Composable
fun BudgetSettingsDialog(api: Api, budget: Budget, onClose: () -> Unit, onDone: () -> Unit) {
    var day by remember { mutableStateOf(budget.periodStartDay.toString()) }
    var percent by remember { mutableStateOf(budget.warnPercent.toFloat()) }
    var dayProblem by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    FormDialog(
        title = "Budget settings", saveLabel = "Save", busy = busy, error = error, snackbar = snackbar, onClose = onClose,
        onSave = {
            dayProblem = startDayProblem(day)
            if (dayProblem != null) return@FormDialog
            val body = settingsJson(budget, day, percent.roundToInt().toString())
            if (body.isEmpty()) { onClose(); return@FormDialog }
            busy = true; error = null
            scope.launch {
                when (val r = api.patchJson<Budget>("budget", body.toString())) {
                    is ApiResult.Ok -> onDone()
                    is ApiResult.Failed -> { error = r.message; busy = false; launch { snackbar.showSnackbar(r.message.lines().first()) } }
                }
            }
        },
    ) {
        Section("Month starts on day", Icons.Outlined.CalendarMonth, Accents.getValue("blue")) {
            CompactField(day, { day = it.filter(Char::isDigit).take(2); dayProblem = null }, "1", keyboard = KeyboardOptions(keyboardType = KeyboardType.Number), enabled = !busy, isError = dayProblem != null)
            Text(dayProblem ?: "1 to $MAX_START_DAY. Set it to the day you are paid to budget from payday to payday.", style = MaterialTheme.typography.bodySmall, color = if (dayProblem != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Section("Warn at ${percent.roundToInt()}%", Icons.Outlined.Warning, Accents.getValue("orange")) {
            Slider(value = percent, onValueChange = { percent = it }, valueRange = 1f..100f, enabled = !busy, steps = 0, modifier = Modifier.fillMaxWidth())
            Text("A limit shows a warning once this much is spent. A limit can have its own level.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
