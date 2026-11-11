@file:OptIn(ExperimentalMaterial3Api::class)

package app.maalu.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.DriverHelp
import app.maalu.data.NetPeriod
import app.maalu.data.NetWorthDrivers
import app.maalu.data.changePercent
import app.maalu.data.driverBars
import app.maalu.data.groupLabel
import app.maalu.data.netPeriod
import app.maalu.data.netWorthSentence
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.MorphTile
import app.maalu.ui.theme.Accents
import app.maalu.ui.theme.ChartColors
import java.time.LocalDate

/**
 * Net worth: how it moved over a period and what moved it. Net worth is what the accounts that count toward the stats are worth
 * (what you owe counts below zero). The change is split into income, spending, balance adjustments, transfers across the edge of net
 * worth and exchange rates, and the drivers always add up to the change exactly.
 */
@Composable
fun NetWorthScreen(api: Api) {
    var period by rememberSaveable { mutableStateOf(NetPeriod.Last30.name) }
    var data by remember { mutableStateOf<NetWorthDrivers?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    val chosen = NetPeriod.valueOf(period)

    LaunchedEffect(period, reload) {
        val (from, to) = netPeriod(chosen, LocalDate.now())
        when (val r = api.get<NetWorthDrivers>("stats/net-worth-drivers", mapOf("from" to "$from", "to" to "$to"))) {
            is ApiResult.Ok -> { data = r.data; error = null }
            is ApiResult.Failed -> error = r.message
        }
        refreshing = false
    }

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 4.dp)) {
            ChipRow(NetPeriod.entries, chosen, { it.label }, Accents.getValue("green")) { data = null; period = it.name }
        }
        ReportState(data, error, onRetry = { error = null; reload++ }) { d ->
            val money = { a: String -> app.maalu.data.formatMoney(a, d.currency) }
            val up = d.change.toBigDecimalOrNull()?.signum()?.let { it >= 0 } != false
            PullToRefreshBox(isRefreshing = refreshing, onRefresh = { refreshing = true; reload++ }, modifier = Modifier.fillMaxSize()) {
                LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    item { SentenceCard(netWorthSentence(d, money)) }
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            StatTile("Start", d.start, d.currency, ChartColors.Line, Modifier.weight(1f))
                            StatTile("End", d.end, d.currency, ChartColors.Line, Modifier.weight(1f))
                            StatTile(
                                "Change", d.change, d.currency, if (up) GoodColor else BadColor, Modifier.weight(1f),
                                note = changePercent(d.start, d.change)?.let { "%+.1f%%".format(java.util.Locale.ENGLISH, it) },
                            )
                        }
                    }
                    item { SectionLabel("What moved it") }
                    val bars = driverBars(d.drivers)
                    if (bars.isEmpty()) item { Text("Nothing moved it: no money came in, went out or was corrected in this period.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    itemsIndexed(bars, key = { _, b -> b.key }) { i, b ->
                        val positive = b.value.toBigDecimalOrNull()?.signum()?.let { it > 0 } == true
                        MorphTile(onClick = {}, first = i == 0, last = i == bars.lastIndex, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(b.label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                                    MoneyText(b.value.removePrefix("-"), d.currency, prefix = if (positive) "+" else "−", style = MaterialTheme.typography.bodyMedium, color = if (positive) GoodColor else BadColor)
                                }
                                // the bar is as long as the driver is against the biggest one; the sign is in the figure and the colour
                                Box(Modifier.fillMaxWidth().height(6.dp).background(MaterialTheme.colorScheme.surfaceContainerHighest, RoundedCornerShape(3.dp))) {
                                    Box(Modifier.fillMaxHeight().fillMaxWidth(b.fraction.coerceIn(0.02f, 1f)).background(if (positive) GoodColor else BadColor, RoundedCornerShape(3.dp)))
                                }
                                Text(DriverHelp[b.key].orEmpty(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    item { SectionLabel("Accounts") }
                    if (d.accounts.isEmpty()) item { Text("No account held anything in this period.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    itemsIndexed(d.accounts, key = { _, a -> a.accountId }) { i, a ->
                        val rose = a.change.toBigDecimalOrNull()?.signum()?.let { it >= 0 } != false
                        MorphTile(onClick = {}, first = i == 0, last = i == d.accounts.lastIndex, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(a.name, style = MaterialTheme.typography.bodyMedium)
                                    Text(groupLabel(a.group), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    MoneyText(a.end, d.currency, style = MaterialTheme.typography.bodyMedium)
                                    MoneyText(a.change.removePrefix("-"), d.currency, prefix = if (rose) "+" else "−", style = MaterialTheme.typography.labelSmall, color = if (rose) GoodColor else BadColor)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
