package app.maalu.ui.screens

import app.maalu.ui.theme.expenseInk
import app.maalu.ui.theme.incomeInk
import app.maalu.ui.components.elevation
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import app.maalu.ui.components.RaisedButton
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import app.maalu.data.formatMoney
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.ChoiceChip
import app.maalu.ui.theme.ChartColors

/** A row of choices that scrolls sideways when it does not fit. */
@Composable
fun <T> ChipRow(options: List<T>, selected: T, label: (T) -> String, onSelect: (T) -> Unit) {
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { o -> ChoiceChip(selected = o == selected, onClick = { onSelect(o) }, label = { Text(label(o)) }) }
    }
}

/** A load that failed: why, and a way to ask again. */
@Composable
fun LoadFailed(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier.fillMaxSize()) {
    Column(modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(message, color = MaterialTheme.colorScheme.error)
        RaisedButton(onClick = onRetry) { Text("Try again") }
    }
}

/** What to show while a report loads, or says why it could not. [content] runs once there is data. */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun <T : Any> ReportState(data: T?, error: String?, onRetry: () -> Unit, content: @Composable (T) -> Unit) {
    when {
        data != null -> content(data)
        error != null -> LoadFailed(error, onRetry)
        else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
    }
}

/** A tile with a label and an amount. */
@Composable
fun StatTile(label: String, value: String, currency: String, modifier: Modifier = Modifier, note: String? = null, noteColor: Color? = null) {
    Surface(modifier.elevation(2, MaterialTheme.shapes.large), shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainer) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            MoneyText(value, currency, style = MaterialTheme.typography.titleSmall)
            note?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = noteColor ?: MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}

/** A sentence in a soft container: what the numbers below add up to. */
@Composable
fun SentenceCard(text: String) {
    Surface(shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.primaryContainer, contentColor = MaterialTheme.colorScheme.onPrimaryContainer) {
        Text(text, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(16.dp))
    }
}

@Composable
fun SectionLabel(text: String) {
    Text(text, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 4.dp, top = 8.dp))
}

/** A small round swatch in a category's accent. */
@Composable
fun Swatch(color: Color) {
    Box(Modifier.padding(end = 8.dp).background(color, androidx.compose.foundation.shape.CircleShape).padding(5.dp))
}

fun moneyIn(currency: String): (String) -> String = { a -> formatMoney(a, currency) }

/** Colours for good and bad: money coming in or less spending is good. */
val GoodColor: Color @Composable get() = incomeInk()
val BadColor: Color @Composable get() = expenseInk()
