package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.maalu.data.Account
import app.maalu.data.Api
import app.maalu.data.ApiResult
import app.maalu.data.formatMoney
import app.maalu.data.groupLabel
import app.maalu.ui.theme.MoneyStyle

private sealed interface Load {
    data object Loading : Load
    data class Loaded(val accounts: List<Account>) : Load
    data class Failed(val message: String) : Load
}

/** Read-only for now: the accounts grouped like the web app, each with its balance. */
@Composable
fun AccountsScreen(api: Api) {
    var attempt by remember { mutableIntStateOf(0) }
    val state by produceState<Load>(Load.Loading, attempt) {
        value = Load.Loading
        value = when (val r = api.get<List<Account>>("accounts")) {
            is ApiResult.Ok -> Load.Loaded(r.data)
            is ApiResult.Failed -> Load.Failed(r.message)
        }
    }

    when (val s = state) {
        Load.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        is Load.Failed -> Column(
            Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(s.message, color = MaterialTheme.colorScheme.error)
            Button(onClick = { attempt++ }) { Text("Try again") }
        }
        is Load.Loaded -> {
            val groups = s.accounts.groupBy { it.group }
            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (s.accounts.isEmpty()) item { Text("No accounts yet. Add one in the web app.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                groups.forEach { (group, list) ->
                    item(key = "h-$group") {
                        Text(groupLabel(group), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 12.dp))
                    }
                    items(list, key = { it.id }) { AccountRow(it) }
                }
            }
        }
    }
}

@Composable
private fun AccountRow(account: Account) {
    // Cards rest at the large corner, like the web's account cards.
    Surface(shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(account.name, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                val sub = listOfNotNull(account.bank, account.accountNumber).joinToString(" · ")
                if (sub.isNotEmpty()) Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    formatMoney(account.balance, account.currency),
                    style = MaterialTheme.typography.titleMedium.merge(MoneyStyle),
                    color = if (account.balance.startsWith("-")) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                )
                if (account.currency != "") Text(account.currency, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Normal)
            }
        }
    }
}
