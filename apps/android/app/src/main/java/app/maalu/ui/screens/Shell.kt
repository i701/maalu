package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import app.maalu.data.Api

private data class Tab(val label: String, val icon: ImageVector)

// The web's bottom bar: four destinations and More, which will open the full list.
private val Tabs = listOf(
    Tab("Dashboard", Icons.Outlined.GridView),
    Tab("Transactions", Icons.Outlined.ReceiptLong),
    Tab("Accounts", Icons.Outlined.AccountBalance),
    Tab("Budget", Icons.Outlined.Savings),
    Tab("More", Icons.Outlined.MoreHoriz),
)

private const val DASHBOARD = 0
private const val ACCOUNTS = 2
private const val MORE = 4

/** The signed-in frame. Dashboard and Accounts are real; the other tabs are placeholders until their calls are built. */
@Composable
fun Shell(api: Api, server: String, onSignOut: () -> Unit) {
    var selected by rememberSaveable { mutableIntStateOf(0) }
    Scaffold(
        bottomBar = {
            NavigationBar {
                Tabs.forEachIndexed { i, tab ->
                    NavigationBarItem(
                        selected = selected == i,
                        onClick = { selected = i },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        // one line: "Transactions" wrapped at 360dp wide at the default size
                        label = { Text(tab.label, style = MaterialTheme.typography.labelSmall, maxLines = 1, softWrap = false) },
                    )
                }
            }
        },
    ) { padding ->
        // the bottom bar's padding comes from the Scaffold; the status bar is added here for every tab
        Box(Modifier.fillMaxSize().padding(padding).statusBarsPadding()) {
            when (selected) {
                DASHBOARD -> DashboardScreen(api)
                ACCOUNTS -> AccountsScreen(api)
                MORE -> Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(server, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedButton(onClick = onSignOut) { Text("Sign out") }
                }
                else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("${Tabs[selected].label}\nComing soon", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
