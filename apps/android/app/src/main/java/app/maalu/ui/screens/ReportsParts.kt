package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.ChartColors

/** A row of choices that scrolls sideways when it does not fit. */
@Composable
fun <T> ChipRow(options: List<T>, selected: T, label: (T) -> String, tint: Color, onSelect: (T) -> Unit) {
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { o -> TintChip(tint, selected = o == selected, onClick = { onSelect(o) }, label = { Text(label(o)) }) }
    }
}

/** What to show while a report loads, or says why it could not. [content] runs once there is data. */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun <T : Any> ReportState(data: T?, error: String?, onRetry: () -> Unit, content: @Composable (T) -> Unit) {
    when {
        data != null -> content(data)
        error != null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(error, color = MaterialTheme.colorScheme.error)
            Button(onClick = onRetry, shapes = ButtonDefaults.shapes()) { Text("Try again") }
        }
        else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
    }
}

/** A tinted tile with a label and an amount. */
@Composable
fun StatTile(label: String, value: String, currency: String, tint: Color, modifier: Modifier = Modifier, note: String? = null) {
    Surface(modifier, shape = MaterialTheme.shapes.large, color = tint.copy(alpha = 0.16f)) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            MoneyText(value, currency, style = MaterialTheme.typography.titleSmall)
            note?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
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
val GoodColor get() = ChartColors.IncomeLight
val BadColor get() = ChartColors.ExpenseLight
