package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.ui.draw.alpha
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.ui.Alignment
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.maalu.data.Account
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.RATE_RANGES
import app.maalu.data.RateHistory
import app.maalu.data.UserMe
import app.maalu.data.changeText
import app.maalu.data.formatRate
import app.maalu.data.shortDate
import app.maalu.data.summarizeRates
import app.maalu.data.tidyRate
import app.maalu.ui.components.LineChart
import app.maalu.ui.components.TintChip
import app.maalu.ui.theme.ChartColors

/** How the market rate of a foreign account's currency moved against the base currency: 30 days, 90 days or a year, with start, end, low, high and movement. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun RateHistorySheet(api: Api, account: Account, onClose: () -> Unit) {
    var days by remember { mutableStateOf(90) }
    var base by remember { mutableStateOf<String?>(null) }
    var history by remember { mutableStateOf<RateHistory?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    // the chart stays on screen while another range loads: only a thin bar shows that something is on its way
    var loading by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) { base = (api.get<UserMe>("users/me") as? ApiResult.Ok)?.data?.baseCurrency }
    LaunchedEffect(base, days) {
        val b = base ?: return@LaunchedEffect
        loading = true; error = null
        when (val r = api.get<RateHistory>("currencies/rate-history", mapOf("base" to account.currency, "quote" to b, "days" to "$days"))) {
            is ApiResult.Ok -> history = r.data
            is ApiResult.Failed -> error = r.message.lines().first()
        }
        loading = false
    }
    ModalBottomSheet(onDismissRequest = onClose) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("${account.currency} rate history", style = MaterialTheme.typography.titleLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                RATE_RANGES.forEach { n -> TintChip(ChartColors.Line, days == n, { days = n }, { Text(if (n == 365) "1 year" else "$n days") }) }
            }
            val h = history
            val summary = h?.let { summarizeRates(it.points) }
            when {
                error != null && h == null -> Text(error ?: "", color = MaterialTheme.colorScheme.error)
                h == null -> Box(Modifier.fillMaxWidth().height(230.dp), contentAlignment = Alignment.Center) { LoadingIndicator() }
                summary == null -> Text("The exchange rate source has nothing for this pair.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                else -> {
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                    // the chart stays (dimmed) while another range loads, with the loading indicator over it, so the sheet never changes size
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        LineChart(h.points.mapNotNull { it.rate.toDoubleOrNull() }, ChartColors.Line, Modifier.alpha(if (loading) 0.35f else 1f))
                        if (loading) LoadingIndicator()
                    }
                    Row(Modifier.fillMaxWidth()) {
                        Text(shortDate(h.points.first().date), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(shortDate(h.points.last().date), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Fact("Start", formatRate(summary.first)); Fact("End", formatRate(summary.last)); Fact("Low", formatRate(summary.low)); Fact("High", formatRate(summary.high)); Fact("Moved", changeText(summary.change))
                    }
                    Text(
                        "1 ${account.currency} in ${h.quote}. This account is valued at ${tidyRate(account.exchangeRate)}${if (account.autoRate) " (kept at the market rate)" else ""}.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun Fact(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium)
    }
}
