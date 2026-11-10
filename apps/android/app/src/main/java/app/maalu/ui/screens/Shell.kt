@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)

package app.maalu.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.runtime.mutableStateOf
import app.maalu.data.monthLabel
import java.time.LocalDate
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import app.maalu.data.Api
import app.maalu.data.ThemeMode
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow

/** Lets any screen show a message at the bottom (above the bar). */
val LocalSnackbar = androidx.compose.runtime.staticCompositionLocalOf<androidx.compose.material3.SnackbarHostState?> { null }

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
private const val TRANSACTIONS = 1
private const val ACCOUNTS = 2
private const val BUDGET = 3
private const val MORE = 4

/**
 * The signed-in frame: a large top app bar that holds the screen's name and collapses as the content
 * scrolls (the native pattern), and the bottom bar. Dashboard, Transactions, Accounts and Budget are real; the rest are placeholders.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun Shell(api: Api, server: String, themeMode: ThemeMode, onThemeMode: (ThemeMode) -> Unit, onSignOut: () -> Unit) {
    var selected by rememberSaveable { mutableIntStateOf(0) }
    // the dashboard's month lives here so the app bar can move it
    var month by rememberSaveable { mutableStateOf(LocalDate.now().withDayOfMonth(1).toString()) }
    val scroll = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()
    val snackbar = remember { androidx.compose.material3.SnackbarHostState() }

    androidx.compose.runtime.CompositionLocalProvider(LocalSnackbar provides snackbar) { Scaffold(
        snackbarHost = { androidx.compose.material3.SnackbarHost(snackbar) },
        modifier = Modifier.nestedScroll(scroll.nestedScrollConnection),
        topBar = {
            MediumFlexibleTopAppBar(
                title = { Text(Tabs[selected].label.let { if (selected == MORE) "More" else it }) },
                subtitle = if (selected == DASHBOARD || selected == BUDGET) ({ Text(monthLabel(LocalDate.parse(month))) }) else null,
                actions = {
                    if (selected == DASHBOARD || selected == BUDGET) {
                        IconButton(onClick = { month = LocalDate.parse(month).minusMonths(1).toString() }) {
                            Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, "Previous month")
                        }
                        IconButton(onClick = { month = LocalDate.parse(month).plusMonths(1).toString() }) {
                            Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, "Next month")
                        }
                    }
                },
                scrollBehavior = scroll,
            )
        },
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
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (selected) {
                DASHBOARD -> DashboardScreen(api, month)
                TRANSACTIONS -> TransactionsScreen(api)
                ACCOUNTS -> AccountsScreen(api)
                BUDGET -> BudgetScreen(api, month)
                MORE -> Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("Appearance", style = MaterialTheme.typography.titleSmall)
                    SingleChoiceSegmentedButtonRow {
                        ThemeMode.entries.forEachIndexed { i, m ->
                            SegmentedButton(
                                selected = themeMode == m,
                                onClick = { onThemeMode(m) },
                                shape = SegmentedButtonDefaults.itemShape(i, ThemeMode.entries.size),
                            ) { Text(m.label) }
                        }
                    }
                    Text(server, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 16.dp))
                    OutlinedButton(onClick = onSignOut, shapes = ButtonDefaults.shapes()) { Text("Sign out") }
                }
                else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Coming soon", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
    }
}
