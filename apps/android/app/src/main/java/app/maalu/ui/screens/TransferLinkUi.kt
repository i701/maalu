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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.LINKED_MESSAGE
import app.maalu.data.Transaction
import app.maalu.data.TransferSuggestion
import app.maalu.data.dayLabel
import app.maalu.data.daysApartText
import app.maalu.data.linkSentence
import app.maalu.data.pairJson
import app.maalu.data.pairOf
import app.maalu.data.title
import app.maalu.ui.components.MoneyText
import app.maalu.ui.components.MorphTile
import app.maalu.ui.theme.Accents
import kotlinx.coroutines.launch

/**
 * "Looks like one transfer": pairs that look like one move of your own money entered twice (an expense in one account and an income in another,
 * the same amount, within two days). Closed by default, above the list. Nothing is merged until you confirm; "Not a pair" stops a pair being suggested again.
 */
@Composable
fun TransferSuggestionsCard(api: Api, suggestions: List<TransferSuggestion>, onChanged: () -> Unit, onSay: (String) -> Unit) {
    var open by rememberSaveable { mutableStateOf(false) }
    var confirming by remember { mutableStateOf<TransferSuggestion?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val tint = Accents.getValue("blue")
    Surface(Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.extraLarge, color = tint.copy(alpha = 0.14f)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Outlined.SwapHoriz, null, tint = tint)
                Column(Modifier.weight(1f)) {
                    Text("Looks like one transfer", style = MaterialTheme.typography.titleSmall)
                    Text(
                        "${suggestions.size} ${if (suggestions.size == 1) "pair" else "pairs"} entered twice, as an expense and an income.",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = { open = !open }) { Icon(if (open) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, if (open) "Hide the pairs" else "Show the pairs") }
            }
            if (open) suggestions.forEachIndexed { i, s ->
                if (i > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                PairRows(s)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { confirming = s }, enabled = !busy, shapes = ButtonDefaults.shapes()) { Text("Make one transfer") }
                    TextButton(
                        enabled = !busy,
                        onClick = {
                            busy = true
                            scope.launch {
                                when (val r = api.postJsonUnit("transactions/transfer-suggestions/dismiss", pairJson(s.expense.id, s.income.id).toString())) {
                                    is ApiResult.Ok -> { onSay("Okay, that pair will not be suggested again."); onChanged() }
                                    is ApiResult.Failed -> onSay(r.message.lines().first())
                                }
                                busy = false
                            }
                        },
                    ) { Text("Not a pair") }
                }
            }
        }
    }
    confirming?.let { s ->
        MakeTransferDialog(api, s.expense, s.income, onClose = { confirming = null }, onDone = { msg -> confirming = null; onSay(msg); onChanged() })
    }
}

@Composable
private fun PairRows(s: TransferSuggestion) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        SideRow("Out", s.expense)
        SideRow("In", s.income)
        Text(daysApartText(s.daysApart), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun SideRow(label: String, t: Transaction) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(end = 2.dp))
        Column(Modifier.weight(1f)) {
            Text(t.title(), style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${t.account?.name.orEmpty()} · ${dayLabel(t.date)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        MoneyText(t.amount, t.currency, prefix = signPrefix(t), style = MaterialTheme.typography.bodyMedium, color = amountColor(t))
    }
}

/** Says what will happen and asks: the expense becomes the transfer and the income goes to the trash. [onDone] gets the line to show. */
@Composable
fun MakeTransferDialog(api: Api, expense: Transaction, income: Transaction, onClose: () -> Unit, onDone: (String) -> Unit) {
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text("Make one transfer") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(linkSentence(expense, income), style = MaterialTheme.typography.bodyMedium)
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                busy = true; error = null
                scope.launch {
                    when (val r = api.postJson<Transaction>("transactions/link-transfer", pairJson(expense.id, income.id).toString())) {
                        is ApiResult.Ok -> onDone(LINKED_MESSAGE)
                        is ApiResult.Failed -> { error = r.message.lines().first(); busy = false }
                    }
                }
            }) { Text(if (busy) "Working…" else "Make transfer") }
        },
        dismissButton = { TextButton(onClick = onClose, enabled = !busy) { Text("Cancel") } },
    )
}

/**
 * Pair an entry by hand: choose the other half of the same move from [matches] (what the server found: the opposite side, exactly the same
 * amount, in another account), then confirm.
 */
@Composable
fun LinkTransferFlow(api: Api, base: Transaction, matches: List<Transaction>, onClose: () -> Unit, onDone: (String) -> Unit) {
    var chosen by remember { mutableStateOf<Transaction?>(null) }
    val pair = chosen?.let { pairOf(base, it) }
    if (pair != null) MakeTransferDialog(api, pair.first, pair.second, onClose = { chosen = null }, onDone = onDone)
    else CounterpartPicker(base, matches, onClose = onClose, onPick = { chosen = it })
}

@Composable
private fun CounterpartPicker(base: Transaction, matches: List<Transaction>, onClose: () -> Unit, onPick: (Transaction) -> Unit) {
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Scaffold(topBar = { TopAppBar(title = { Text("Pick the matching entry") }, navigationIcon = { IconButton(onClick = onClose) { Icon(Icons.Outlined.Close, "Close") } }) }) { padding ->
            Column(Modifier.padding(padding).fillMaxSize()) {
                Column(Modifier.padding(horizontal = 16.dp, vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SideRow(if (base.type == "expense") "Out" else "In", base)
                    Text(
                        if (base.type == "expense") "Which income is this same money arriving in another account?"
                        else "Which expense is this same money leaving another account?",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    itemsIndexed(matches, key = { _, t -> t.id }) { i, t ->
                        MorphTile(onClick = { onPick(t) }, first = i == 0, last = i == matches.lastIndex, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Column(Modifier.weight(1f)) {
                                    Text(t.title(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text("${t.account?.name.orEmpty()} · ${dayLabel(t.date)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                                MoneyText(t.amount, t.currency, prefix = signPrefix(t), style = MaterialTheme.typography.bodyMedium, color = amountColor(t))
                            }
                        }
                    }
                }
            }
        }
    }
}
